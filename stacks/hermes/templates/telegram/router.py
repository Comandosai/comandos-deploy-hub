#!/usr/bin/env python3
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import uuid
import html
from pathlib import Path

CONFIG_PATH = Path(os.environ.get("COMANDOS_ROUTER_CONFIG", "/opt/comandos-hermes-router/config.json"))
STATE_PATH = Path(os.environ.get("COMANDOS_ROUTER_STATE", "/opt/comandos-hermes-router/state.json"))
LOCK_PATH = Path(os.environ.get("COMANDOS_ROUTER_LOCK", "/run/comandos-hermes-router/hermes.lock"))
HERMES_AGENT_PATH = "/usr/local/lib/hermes-agent"
if HERMES_AGENT_PATH not in sys.path:
    sys.path.insert(0, HERMES_AGENT_PATH)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("comandos-hermes-router")
_STT_MODEL = None
BUTTON_BLOCK_RE = re.compile(r"\[\[telegram_buttons\]\](.*?)\[\[/telegram_buttons\]\]", re.DOTALL | re.IGNORECASE)
TABLE_SEPARATOR_CELL_RE = re.compile(r"^:?-{3,}:?$")
BUTTON_TRIGGER_WORDS = (
    "/menu",
    "/buttons",
    "кнопк",
    "inline",
    "инлайн",
    "клавиатур",
)

BUTTON_PROTOCOL_PROMPT = """

[Telegram inline buttons protocol]
Если пользователю удобно выбрать один из вариантов, ты можешь вернуть специальный блок.
Router превратит его в настоящие Telegram inline-кнопки.
Формат строго JSON между тегами:
[[telegram_buttons]]
{
  "text": "Уточните, что нужно сделать:",
  "buttons": [
    [{"text": "Письмо клиенту", "value": "write_client_email"}, {"text": "КП", "value": "commercial_offer"}],
    [{"text": "План встречи", "value": "meeting_plan"}]
  ],
  "on_click": "edit"
}
[[/telegram_buttons]]
Правила: не ставь markdown code fences внутри блока; callback/value держи коротким; обычный текст можно писать до блока или в поле text.
""".strip()

PUBLIC_TELEGRAM_GUARD_PROMPT = """

[Публичный Telegram-ответ]
Отвечай как обычный помощник, без внутренней кухни.
Не показывай названия профилей, пути к файлам, конфиги, команды, token/API, Hermes, router, CLI, systemd, .env и технические детали, если пользователь прямо не просит режим настройки.
Если пользователь спрашивает, "какой профиль", отвечай человеческой ролью: основной помощник, помощник руководителя или помощник менеджера, без путей и внутренних названий.
Для выделения используй обычный Markdown: **жирный**, списки через "-".
""".strip()

BUTTONS_DISABLED_PROMPT = """

[Telegram inline buttons disabled]
В этом профиле не используй блок [[telegram_buttons]] и не отправляй inline-кнопки.
Если нужен выбор, напиши варианты обычным коротким списком и попроси ответить текстом.
Исключение: пользователь прямо попросил кнопки, inline-клавиатуру или команду /menu.
""".strip()


def parse_env_file(path):
    env = {}
    p = Path(path)
    if not p.exists():
        return env
    for raw in p.read_text(errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            env[key] = value
    return env


def load_env(files):
    env = dict(os.environ)
    for file_name in files:
        env.update(parse_env_file(file_name))
    return env


def load_config():
    cfg = json.loads(CONFIG_PATH.read_text())
    cfg.setdefault("telegram_env_files", ["/root/.hermes/.env"])
    cfg.setdefault("profile_env_files", {"default": ["/root/.hermes/.env"]})
    cfg.setdefault("routes", {})
    cfg.setdefault("default_profile", "default")
    cfg.setdefault("workdir", "/root")
    cfg.setdefault("timeout_seconds", 240)
    cfg.setdefault("show_profile_in_response", True)
    cfg.setdefault("restore_profile", "default")
    cfg.setdefault("stt_enabled", True)
    cfg.setdefault("stt_model", "base")
    cfg.setdefault("stt_language", "ru")
    cfg.setdefault("voice_prompt_prefix", "Голосовое сообщение пользователя. Расшифровка:")
    cfg.setdefault("button_protocol_enabled", True)
    cfg.setdefault("button_protocol_disabled_profiles", [])
    cfg.setdefault("button_protocol_trigger_words", list(BUTTON_TRIGGER_WORDS))
    cfg.setdefault("public_telegram_guard_enabled", True)
    cfg.setdefault("state_ttl_seconds", 86400)
    cfg.setdefault("demo_menu_enabled", False)
    cfg.setdefault("poll_timeout_seconds", 10)
    return cfg


def configured_bots(cfg):
    raw_bots = cfg.get("bots")
    if isinstance(raw_bots, dict):
        bot_items = []
        for name, value in raw_bots.items():
            item = dict(value or {})
            item.setdefault("name", name)
            bot_items.append(item)
    elif isinstance(raw_bots, list):
        bot_items = [dict(item or {}) for item in raw_bots]
    else:
        bot_items = [{
            "name": "main",
            "token_env": "TELEGRAM_BOT_TOKEN",
            "telegram_env_files": cfg.get("telegram_env_files", ["/root/.hermes/.env"]),
            "default_profile": cfg.get("default_profile", "default"),
            "routes": cfg.get("routes", {}),
            "allowed_users": cfg.get("allowed_users", []),
        }]

    bots = []
    for index, bot in enumerate(bot_items, start=1):
        name = str(bot.get("name") or f"bot{index}").strip() or f"bot{index}"
        bot_cfg = dict(cfg)
        bot_cfg["bot_name"] = name
        for key in (
            "telegram_env_files",
            "token_env",
            "default_profile",
            "restore_profile",
            "routes",
            "allowed_users",
            "workdir",
            "timeout_seconds",
            "show_profile_in_response",
            "button_protocol_enabled",
            "button_protocol_disabled_profiles",
            "button_protocol_trigger_words",
            "public_telegram_guard_enabled",
            "stt_enabled",
            "stt_model",
            "stt_language",
            "voice_prompt_prefix",
        ):
            if key in bot:
                bot_cfg[key] = bot[key]
        bot_cfg.setdefault("token_env", "TELEGRAM_BOT_TOKEN")
        bot_cfg["bot_token"] = bot.get("token")
        bots.append(bot_cfg)
    return bots


def telegram_request(token, method, payload=None, timeout=70):
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
    parsed = json.loads(body)
    if not parsed.get("ok"):
        raise RuntimeError(f"Telegram {method} failed: {parsed}")
    return parsed.get("result")


def hold_html(replacements, value):
    key = f"@@TGHTML{len(replacements)}@@"
    replacements.append((key, value))
    return key


def convert_inline_markdown_to_html(text):
    replacements = []

    def code_repl(match):
        return hold_html(replacements, f"<code>{html.escape(match.group(1))}</code>")

    def link_repl(match):
        label = html.escape(match.group(1).strip())
        url = html.escape(match.group(2).strip(), quote=True)
        return hold_html(replacements, f'<a href="{url}">{label}</a>')

    prepared = re.sub(r"`([^`\n]+)`", code_repl, text)
    prepared = re.sub(r"\[([^\]\n]+)\]\((https?://[^)\s]+)\)", link_repl, prepared)
    escaped = html.escape(prepared, quote=False)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"__(.+?)__", r"<b>\1</b>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<i>\1</i>", escaped)
    for key, value in replacements:
        escaped = escaped.replace(key, value)
    return escaped


def split_markdown_table_row(line):
    stripped = line.strip()
    if "|" not in stripped:
        return []
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return [cell.strip().replace(r"\|", "|") for cell in stripped.split("|")]


def is_markdown_table_separator(line):
    cells = split_markdown_table_row(line)
    if len(cells) < 2:
        return False
    return all(TABLE_SEPARATOR_CELL_RE.match(cell.replace(" ", "")) for cell in cells)


def is_markdown_table_row(line):
    return len(split_markdown_table_row(line)) >= 2


def render_markdown_table(lines):
    if len(lines) < 3 or not is_markdown_table_separator(lines[1]):
        return None
    headers = split_markdown_table_row(lines[0])
    rows = [split_markdown_table_row(line) for line in lines[2:] if is_markdown_table_row(line)]
    if not headers or not rows:
        return None

    rendered = []
    if len(headers) == 2:
        for row in rows:
            left = row[0] if row else ""
            right = row[1] if len(row) > 1 else ""
            if left and right:
                rendered.append(f"• <b>{convert_inline_markdown_to_html(left)}</b> — {convert_inline_markdown_to_html(right)}")
            elif left:
                rendered.append(f"• {convert_inline_markdown_to_html(left)}")
            elif right:
                rendered.append(f"• {convert_inline_markdown_to_html(right)}")
        return "\n".join(rendered)

    for row in rows:
        pairs = []
        for index, header in enumerate(headers):
            value = row[index].strip() if index < len(row) else ""
            if not value:
                continue
            pairs.append(f"<b>{convert_inline_markdown_to_html(header)}:</b> {convert_inline_markdown_to_html(value)}")
        if pairs:
            rendered.append("• " + "; ".join(pairs))
    return "\n".join(rendered) if rendered else None


def markdown_to_telegram_html(text):
    if not text:
        return text
    parts = []
    pos = 0
    for match in re.finditer(r"```(?:[A-Za-z0-9_-]+)?\s*\n?([\s\S]*?)```", text):
        if match.start() > pos:
            parts.append(("text", text[pos:match.start()]))
        parts.append(("pre", match.group(1).strip("\n")))
        pos = match.end()
    if pos < len(text):
        parts.append(("text", text[pos:]))

    rendered = []
    for kind, value in parts:
        if kind == "pre":
            rendered.append(f"<pre>{html.escape(value)}</pre>")
            continue
        lines = []
        source_lines = value.splitlines()
        index = 0
        while index < len(source_lines):
            line = source_lines[index]
            if (
                index + 1 < len(source_lines)
                and is_markdown_table_row(line)
                and is_markdown_table_separator(source_lines[index + 1])
            ):
                table_lines = [line, source_lines[index + 1]]
                index += 2
                while index < len(source_lines) and is_markdown_table_row(source_lines[index]):
                    table_lines.append(source_lines[index])
                    index += 1
                rendered_table = render_markdown_table(table_lines)
                if rendered_table:
                    lines.append(rendered_table)
                    continue
                lines.extend(convert_inline_markdown_to_html(table_line) for table_line in table_lines)
                continue
            heading = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*$", line)
            if heading:
                lines.append(f"<b>{convert_inline_markdown_to_html(heading.group(1))}</b>")
            else:
                lines.append(convert_inline_markdown_to_html(line))
            index += 1
        rendered.append("\n".join(lines))
    return "".join(rendered)


def telegram_text_payload(text):
    return {
        "text": markdown_to_telegram_html(text),
        "parse_mode": "HTML",
    }


def send_message(token, chat_id, text, reply_markup=None):
    if not text:
        text = "Пустой ответ от Hermes."
    chunks = []
    while text:
        chunks.append(text[:3900])
        text = text[3900:]
    last_result = None
    for index, chunk in enumerate(chunks):
        payload = {
            "chat_id": chat_id,
            "disable_web_page_preview": True,
            **telegram_text_payload(chunk),
        }
        if reply_markup and index == len(chunks) - 1:
            payload["reply_markup"] = reply_markup
        try:
            last_result = telegram_request(token, "sendMessage", payload, timeout=30)
        except Exception:
            log.exception("sendMessage with HTML parse_mode failed, falling back to plain text")
            payload.pop("parse_mode", None)
            payload["text"] = chunk
            last_result = telegram_request(token, "sendMessage", payload, timeout=30)
    return last_result


def edit_message_text(token, chat_id, message_id, text, reply_markup=None):
    if not text:
        text = "Пустой ответ от Hermes."
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "disable_web_page_preview": True,
        **telegram_text_payload(text[:3900]),
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        return telegram_request(token, "editMessageText", payload, timeout=30)
    except Exception:
        log.exception("editMessageText with HTML parse_mode failed, falling back to plain text")
        payload.pop("parse_mode", None)
        payload["text"] = text[:3900]
        return telegram_request(token, "editMessageText", payload, timeout=30)


def send_chat_action(token, chat_id, action="typing"):
    try:
        telegram_request(token, "sendChatAction", {"chat_id": chat_id, "action": action}, timeout=15)
    except Exception:
        log.debug("sendChatAction failed", exc_info=True)


def answer_callback(token, callback_id, text="Принято"):
    try:
        telegram_request(token, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text}, timeout=15)
    except Exception:
        log.debug("answerCallbackQuery failed", exc_info=True)


def load_state(cfg=None):
    if not STATE_PATH.exists():
        return {"callbacks": {}}
    try:
        state = json.loads(STATE_PATH.read_text(errors="replace"))
    except Exception:
        log.exception("failed to read state, resetting")
        return {"callbacks": {}}
    state.setdefault("callbacks", {})
    if cfg:
        ttl = int(cfg.get("state_ttl_seconds", 86400))
        now = time.time()
        state["callbacks"] = {
            k: v for k, v in state["callbacks"].items()
            if now - float(v.get("created_at", now)) <= ttl
        }
    return state


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(STATE_PATH)


def strip_json_fences(raw):
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def normalize_button_rows(buttons):
    rows = []
    if not isinstance(buttons, list):
        return rows
    if buttons and all(isinstance(item, (str, dict)) for item in buttons):
        buttons = [buttons]
    for row in buttons:
        row_items = row if isinstance(row, list) else [row]
        out_row = []
        for item in row_items:
            if isinstance(item, str):
                label = item.strip()
                value = label
            elif isinstance(item, dict):
                label = str(item.get("text") or item.get("label") or item.get("title") or "").strip()
                value = str(item.get("value") or item.get("callback") or item.get("id") or label).strip()
            else:
                continue
            if not label:
                continue
            out_row.append({"text": label[:64], "value": value[:512]})
        if out_row:
            rows.append(out_row)
    return rows


def parse_button_block(answer):
    match = BUTTON_BLOCK_RE.search(answer or "")
    if not match:
        return answer, None
    raw = strip_json_fences(match.group(1))
    visible = BUTTON_BLOCK_RE.sub("", answer).strip()
    try:
        payload = json.loads(raw)
    except Exception:
        log.exception("button block JSON parse failed raw=%r", raw[:500])
        return visible or answer, None
    text = str(payload.get("text") or visible or "Выберите вариант:").strip()
    rows = normalize_button_rows(payload.get("buttons") or payload.get("keyboard") or payload.get("options"))
    if not rows:
        return text, None
    return text, {
        "text": text,
        "rows": rows,
        "on_click": str(payload.get("on_click") or "edit"),
        "raw": payload,
    }


def as_string_set(value):
    if value is None:
        return set()
    if isinstance(value, str):
        return {value}
    if isinstance(value, (list, tuple, set)):
        return {str(item) for item in value}
    return {str(value)}


def prompt_requests_buttons(cfg, prompt):
    lowered = (prompt or "").lower()
    trigger_words = cfg.get("button_protocol_trigger_words") or BUTTON_TRIGGER_WORDS
    return any(str(word).lower() in lowered for word in trigger_words)


def buttons_allowed_for_prompt(cfg, profile, prompt):
    if not cfg.get("button_protocol_enabled", True):
        return False
    profile_name = str(profile or "")
    if profile_name in as_string_set(cfg.get("button_protocol_disabled_profiles")):
        return prompt_requests_buttons(cfg, prompt)
    enabled_profiles = as_string_set(cfg.get("button_protocol_enabled_profiles"))
    if enabled_profiles and profile_name not in enabled_profiles:
        return prompt_requests_buttons(cfg, prompt)
    return True


def build_inline_keyboard(cfg, chat_id, user_id, profile, button_spec, source_prompt=None):
    state = load_state(cfg)
    keyboard_rows = []
    now = time.time()
    for row in button_spec["rows"]:
        keyboard_row = []
        for item in row:
            callback_id = uuid.uuid4().hex[:16]
            state["callbacks"][callback_id] = {
                "created_at": now,
                "chat_id": chat_id,
                "user_id": user_id,
                "profile": profile,
                "bot_name": cfg.get("bot_name", "main"),
                "label": item["text"],
                "value": item["value"],
                "source_prompt": source_prompt or "",
                "button_text": button_spec.get("text") or "",
                "on_click": button_spec.get("on_click") or "edit",
            }
            keyboard_row.append({"text": item["text"], "callback_data": f"cb:{callback_id}"})
        keyboard_rows.append(keyboard_row)
    save_state(state)
    return {"inline_keyboard": keyboard_rows}


def deliver_response(cfg, token, chat_id, user_id, profile, answer, *, source_prompt=None, edit_message_id=None):
    text, button_spec = parse_button_block(answer)
    reply_markup = None
    if button_spec and not buttons_allowed_for_prompt(cfg, profile, source_prompt or ""):
        log.info("inline buttons stripped bot=%s telegram_id=%s profile=%s", cfg.get("bot_name", "main"), user_id, profile)
        button_spec = None
    if button_spec:
        reply_markup = build_inline_keyboard(cfg, chat_id, user_id, profile, button_spec, source_prompt=source_prompt)
    if cfg.get("show_profile_in_response", True) and not button_spec:
        text = f"Профиль: {profile}\n\n{text}"
    if edit_message_id:
        try:
            edit_message_text(token, chat_id, edit_message_id, text, reply_markup=reply_markup)
            return
        except Exception:
            log.exception("editMessageText failed, falling back to sendMessage")
    send_message(token, chat_id, text, reply_markup=reply_markup)


def download_telegram_file(token, file_id, suffix=".ogg"):
    info = telegram_request(token, "getFile", {"file_id": file_id}, timeout=30)
    file_path = info.get("file_path")
    if not file_path:
        raise RuntimeError("Telegram did not return file_path")
    ext = Path(file_path).suffix or suffix
    safe_dir = Path(tempfile.gettempdir()) / "comandos-hermes-router"
    safe_dir.mkdir(parents=True, exist_ok=True)
    local_path = safe_dir / f"tg-{file_id}{ext}"
    url = f"https://api.telegram.org/file/bot{token}/{urllib.parse.quote(file_path)}"
    with urllib.request.urlopen(url, timeout=90) as resp:
        local_path.write_bytes(resp.read())
    return local_path


def transcribe_local_audio(cfg, audio_path):
    global _STT_MODEL
    if not cfg.get("stt_enabled", True):
        raise RuntimeError("STT is disabled in router config")
    model_name = str(cfg.get("stt_model", "base") or "base")
    language = str(cfg.get("stt_language", "ru") or "").strip() or None
    from faster_whisper import WhisperModel
    if _STT_MODEL is None:
        log.info("loading faster-whisper model=%s", model_name)
        _STT_MODEL = WhisperModel(model_name, device="cpu", compute_type="int8")
    kwargs = {"beam_size": 5}
    if language:
        kwargs["language"] = language
    segments, info = _STT_MODEL.transcribe(str(audio_path), **kwargs)
    text = " ".join((segment.text or "").strip() for segment in segments).strip()
    if not text:
        raise RuntimeError("empty transcription")
    log.info(
        "voice transcribed provider=local model=%s language=%s duration=%.1fs chars=%s",
        model_name,
        getattr(info, "language", language or "auto"),
        float(getattr(info, "duration", 0) or 0),
        len(text),
    )
    return text


def allowed_users_from_env(env):
    raw = env.get("TELEGRAM_ALLOWED_USERS", "") or env.get("TELEGRAM_ALLOWED_CHATS", "")
    users = set()
    for item in raw.replace(";", ",").split(","):
        item = item.strip()
        if item:
            users.add(item)
    return users


def is_allowed(cfg, telegram_env, user_id, chat_id):
    allowed = set(map(str, cfg.get("allowed_users", []))) | allowed_users_from_env(telegram_env) | set(map(str, cfg.get("routes", {}).keys()))
    return not allowed or str(user_id) in allowed or str(chat_id) in allowed


def resolve_profile(cfg, telegram_user_id):
    routes = {str(k): v for k, v in cfg.get("routes", {}).items()}
    return routes.get(str(telegram_user_id), cfg.get("default_profile", "default"))


def extract_message_text(cfg, token, message, chat_id):
    text = message.get("text") or message.get("caption") or ""
    if text.strip():
        return text
    media = None
    suffix = ".ogg"
    if message.get("voice"):
        media = message["voice"]
        suffix = ".ogg"
    elif message.get("audio"):
        media = message["audio"]
        suffix = Path(message["audio"].get("file_name") or "audio.mp3").suffix or ".mp3"
    elif message.get("video_note"):
        media = message["video_note"]
        suffix = ".mp4"
    if not media:
        return ""
    file_id = media.get("file_id")
    if not file_id:
        raise RuntimeError("media file_id is missing")
    send_chat_action(token, chat_id, "typing")
    local_path = download_telegram_file(token, file_id, suffix=suffix)
    try:
        transcript = transcribe_local_audio(cfg, local_path)
    finally:
        try:
            local_path.unlink(missing_ok=True)
        except Exception:
            pass
    prefix = cfg.get("voice_prompt_prefix", "Голосовое сообщение пользователя. Расшифровка:")
    return f"{prefix}\n{transcript}"


def maybe_add_button_protocol(cfg, profile, prompt):
    parts = [prompt]
    if cfg.get("public_telegram_guard_enabled", True):
        parts.append(PUBLIC_TELEGRAM_GUARD_PROMPT)
    if buttons_allowed_for_prompt(cfg, profile, prompt):
        parts.append(BUTTON_PROTOCOL_PROMPT)
    elif cfg.get("button_protocol_enabled", True):
        parts.append(BUTTONS_DISABLED_PROMPT)
    return "\n\n".join(parts)


def run_hermes(cfg, profile, prompt):
    profile_env_files = cfg.get("profile_env_files", {})
    env_files = profile_env_files.get(profile) or profile_env_files.get("default") or ["/root/.hermes/.env"]
    env = load_env(env_files)
    workdir = cfg.get("workdir", "/root")
    timeout = int(cfg.get("timeout_seconds", 240))
    restore_profile = cfg.get("restore_profile", "default")
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    hermes_prompt = maybe_add_button_protocol(cfg, profile, prompt)

    script = """
set -e
flock "$COMANDOS_ROUTER_LOCK" bash -lc '\
  hermes profile use "$HERMES_TARGET_PROFILE" >/dev/null; \
  hermes -z "$HERMES_PROMPT"; \
  hermes profile use "$HERMES_RESTORE_PROFILE" >/dev/null \
'
"""
    run_env = dict(env)
    run_env["HERMES_TARGET_PROFILE"] = profile
    run_env["HERMES_RESTORE_PROFILE"] = restore_profile
    run_env["HERMES_PROMPT"] = hermes_prompt
    run_env["HERMES_ACCEPT_HOOKS"] = "1"
    run_env["COMANDOS_ROUTER_LOCK"] = str(LOCK_PATH)
    result = subprocess.run(
        ["bash", "-lc", script],
        cwd=workdir,
        env=run_env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "unknown error").strip()
        raise RuntimeError(err[-1600:])
    return result.stdout.strip()


def dispatch_to_hermes(cfg, token, chat_id, user_id, profile, text, *, edit_message_id=None):
    log.info("message bot=%s telegram_id=%s chat_id=%s profile=%s chars=%s edit=%s", cfg.get("bot_name", "main"), user_id, chat_id, profile, len(text), bool(edit_message_id))
    try:
        send_chat_action(token, chat_id, "typing")
        answer = run_hermes(cfg, profile, text)
        deliver_response(cfg, token, chat_id, user_id, profile, answer, source_prompt=text, edit_message_id=edit_message_id)
        log.info("done bot=%s telegram_id=%s profile=%s", cfg.get("bot_name", "main"), user_id, profile)
    except subprocess.TimeoutExpired:
        log.exception("timeout bot=%s telegram_id=%s profile=%s", cfg.get("bot_name", "main"), user_id, profile)
        send_message(token, chat_id, "Hermes не успел ответить за отведённое время. Задачу лучше разбить на более короткую.")
    except Exception:
        log.exception("failed bot=%s telegram_id=%s profile=%s", cfg.get("bot_name", "main"), user_id, profile)
        send_message(token, chat_id, "Ошибка при обращении к Hermes. Я записал её в логи сервера.")


def demo_dynamic_button_answer():
    return """[[telegram_buttons]]
{
  "text": "Выберите, что сделать дальше:",
  "buttons": [
    [{"text": "Письмо клиенту", "value": "write_client_email"}, {"text": "КП", "value": "commercial_offer"}],
    [{"text": "План встречи", "value": "meeting_plan"}, {"text": "Вопросы подрядчику", "value": "contractor_questions"}]
  ],
  "on_click": "edit"
}
[[/telegram_buttons]]"""


def handle_message(cfg, token, message):
    chat = message.get("chat", {})
    sender = message.get("from", {})
    chat_id = chat.get("id")
    user_id = sender.get("id")
    if not chat_id or not user_id:
        return
    telegram_env = load_env(cfg.get("telegram_env_files", ["/root/.hermes/.env"]))
    if not is_allowed(cfg, telegram_env, user_id, chat_id):
        log.warning("denied bot=%s telegram_id=%s chat_id=%s", cfg.get("bot_name", "main"), user_id, chat_id)
        send_message(token, chat_id, "Нет доступа. Ваш Telegram ID не добавлен в список пользователей.")
        return

    try:
        text = extract_message_text(cfg, token, message, chat_id)
    except Exception:
        log.exception("failed to prepare inbound media bot=%s telegram_id=%s chat_id=%s", cfg.get("bot_name", "main"), user_id, chat_id)
        send_message(token, chat_id, "Не смог обработать голосовое или файл. Ошибка записана в логи сервера.")
        return

    profile = resolve_profile(cfg, user_id)
    normalized = text.strip().lower()
    if not text.strip():
        send_message(token, chat_id, "Пока я обрабатываю текст и голосовые. Остальные файлы подключим следующим шагом.")
        return
    if normalized.startswith("/start"):
        send_message(token, chat_id, f"Готов. Ваш Telegram ID: {user_id}.")
        return
    if normalized.startswith("/whoami"):
        send_message(token, chat_id, f"Telegram ID: {user_id}")
        return
    if cfg.get("demo_menu_enabled", False) and (normalized.startswith("/menu") or normalized.startswith("/buttons")):
        deliver_response(cfg, token, chat_id, user_id, profile, demo_dynamic_button_answer(), source_prompt=text)
        return
    if normalized.startswith("/menu") or normalized.startswith("/buttons"):
        send_message(token, chat_id, "Такой команды нет. Напишите задачу обычным текстом.")
        return

    dispatch_to_hermes(cfg, token, chat_id, user_id, profile, text)


def handle_callback_query(cfg, token, callback):
    callback_id = callback.get("id")
    sender = callback.get("from", {})
    message = callback.get("message", {})
    chat = message.get("chat", {}) if isinstance(message, dict) else {}
    user_id = sender.get("id")
    chat_id = chat.get("id")
    message_id = message.get("message_id") if isinstance(message, dict) else None
    data = callback.get("data") or ""
    if not callback_id or not user_id or not chat_id:
        return
    telegram_env = load_env(cfg.get("telegram_env_files", ["/root/.hermes/.env"]))
    if not is_allowed(cfg, telegram_env, user_id, chat_id):
        answer_callback(token, callback_id, "Нет доступа")
        log.warning("denied callback bot=%s telegram_id=%s chat_id=%s data=%s", cfg.get("bot_name", "main"), user_id, chat_id, data)
        return
    if not data.startswith("cb:"):
        answer_callback(token, callback_id, "Кнопка устарела")
        send_message(token, chat_id, f"Кнопка получена: {data}")
        return
    state_id = data.split(":", 1)[1]
    state = load_state(cfg)
    item = state.get("callbacks", {}).get(state_id)
    if not item:
        answer_callback(token, callback_id, "Кнопка устарела")
        if message_id:
            edit_message_text(token, chat_id, message_id, "Этот выбор уже устарел. Попросите варианты ещё раз.")
        else:
            send_message(token, chat_id, "Этот выбор уже устарел. Попросите варианты ещё раз.")
        return
    profile = resolve_profile(cfg, user_id)
    label = item.get("label") or item.get("value") or "выбор"
    value = item.get("value") or label
    answer_callback(token, callback_id, "Выбрано")
    log.info("callback bot=%s telegram_id=%s chat_id=%s profile=%s state_id=%s label=%s value=%s", cfg.get("bot_name", "main"), user_id, chat_id, profile, state_id, label, value)
    if message_id:
        try:
            edit_message_text(token, chat_id, message_id, f"Вы выбрали: {label}\n\nОбрабатываю...")
        except Exception:
            log.exception("failed to edit callback pending message")
    prompt = (
        "Пользователь нажал inline-кнопку в Telegram.\n"
        f"Текст кнопки: {label}\n"
        f"Значение кнопки: {value}\n"
        f"Предыдущий вопрос бота: {item.get('button_text') or ''}\n"
        "Продолжи сценарий. Если нужен следующий выбор, верни новый блок [[telegram_buttons]] в указанном формате."
    )
    dispatch_to_hermes(cfg, token, chat_id, user_id, profile, prompt, edit_message_id=message_id)


def build_bot_runtime(bot_cfg):
    telegram_env = load_env(bot_cfg.get("telegram_env_files", ["/root/.hermes/.env"]))
    token = bot_cfg.get("bot_token") or telegram_env.get(bot_cfg.get("token_env", "TELEGRAM_BOT_TOKEN"))
    if not token:
        raise RuntimeError(f"Telegram token not found for bot={bot_cfg.get('bot_name', 'main')}")
    me = telegram_request(token, "getMe", timeout=30)
    bot_cfg["bot_id"] = me.get("id")
    bot_cfg["bot_username"] = me.get("username")
    return {
        "cfg": bot_cfg,
        "token": token,
        "offset": 0,
        "bot_id": me.get("id"),
        "bot_username": me.get("username"),
    }


def poll_bot_once(runtime, poll_timeout):
    token = runtime["token"]
    cfg = runtime["cfg"]
    updates = telegram_request(token, "getUpdates", {
        "offset": runtime["offset"],
        "timeout": poll_timeout,
        "allowed_updates": ["message", "callback_query"],
    }, timeout=poll_timeout + 20) or []
    for upd in updates:
        runtime["offset"] = max(runtime["offset"], int(upd.get("update_id", 0)) + 1)
        if upd.get("message"):
            handle_message(cfg, token, upd["message"])
        elif upd.get("callback_query"):
            handle_callback_query(cfg, token, upd["callback_query"])


def main():
    cfg = load_config()
    runtimes = []
    for bot_cfg in configured_bots(cfg):
        try:
            runtime = build_bot_runtime(bot_cfg)
        except Exception:
            log.exception("failed to initialize bot=%s", bot_cfg.get("bot_name", "main"))
            continue
        runtimes.append(runtime)
        log.info(
            "router bot ready name=%s bot_id=%s bot_username=%s default_profile=%s routes=%s",
            bot_cfg.get("bot_name", "main"),
            runtime.get("bot_id"),
            runtime.get("bot_username"),
            bot_cfg.get("default_profile", "default"),
            sorted(map(str, bot_cfg.get("routes", {}).keys())),
        )
    if not runtimes:
        raise SystemExit("No Telegram bots initialized")
    log.info("router started bots=%s", ",".join(rt["cfg"].get("bot_name", "main") for rt in runtimes))
    poll_timeout = int(cfg.get("poll_timeout_seconds", 10))
    while True:
        for runtime in runtimes:
            try:
                poll_bot_once(runtime, poll_timeout)
            except KeyboardInterrupt:
                raise
            except Exception:
                log.exception("polling loop failed bot=%s", runtime["cfg"].get("bot_name", "main"))
                time.sleep(5)


if __name__ == "__main__":
    main()
