#!/usr/bin/env python3
import importlib.util
import pathlib
import unittest


ROUTER_PATH = pathlib.Path(__file__).resolve().parents[1] / "templates" / "telegram" / "router.py"

spec = importlib.util.spec_from_file_location("comandos_hermes_router", ROUTER_PATH)
router = importlib.util.module_from_spec(spec)
spec.loader.exec_module(router)


class RouterUnitTest(unittest.TestCase):
    def test_markdown_bold_is_converted_to_telegram_html(self):
        rendered = router.markdown_to_telegram_html("**Жирный заголовок**\n- пункт")
        self.assertIn("<b>Жирный заголовок</b>", rendered)
        self.assertNotIn("**", rendered)
        self.assertIn("- пункт", rendered)

    def test_two_column_markdown_table_is_compacted_for_telegram(self):
        rendered = router.markdown_to_telegram_html(
            "| Что присылаете | Что делаю |\n"
            "|---|---|\n"
            "| 🎙 Голосовое | Расшифровываю и выделяю суть |\n"
            "| 📄 PDF | Извлекаю ключевые данные |"
        )
        self.assertIn("• <b>🎙 Голосовое</b> — Расшифровываю и выделяю суть", rendered)
        self.assertIn("• <b>📄 PDF</b> — Извлекаю ключевые данные", rendered)
        self.assertNotIn("|---|", rendered)

    def test_wide_markdown_table_is_rendered_as_short_rows(self):
        rendered = router.markdown_to_telegram_html(
            "| Файл | Действие | Срок |\n"
            "|---|---|---|\n"
            "| КП | Проверить цифры | сегодня |"
        )
        self.assertIn("<b>Файл:</b> КП", rendered)
        self.assertIn("<b>Действие:</b> Проверить цифры", rendered)
        self.assertIn("<b>Срок:</b> сегодня", rendered)

    def test_button_block_is_parsed(self):
        answer = """Текст до кнопок.
[[telegram_buttons]]
{"text":"Выберите действие","buttons":[[{"text":"Письмо","value":"letter"}]],"on_click":"edit"}
[[/telegram_buttons]]"""
        text, spec = router.parse_button_block(answer)
        self.assertEqual(text, "Выберите действие")
        self.assertEqual(spec["rows"][0][0]["text"], "Письмо")
        self.assertEqual(spec["rows"][0][0]["value"], "letter")
        self.assertEqual(spec["on_click"], "edit")

    def test_buttons_can_be_disabled_for_boss_profile(self):
        cfg = {"button_protocol_disabled_profiles": ["boss"]}
        self.assertFalse(router.buttons_allowed_for_prompt(cfg, "boss", "Что мне сделать дальше?"))
        self.assertTrue(router.buttons_allowed_for_prompt(cfg, "boss", "Сделай кнопки для выбора"))
        prompt = router.maybe_add_button_protocol(cfg, "boss", "Что мне сделать дальше?")
        self.assertIn("Telegram inline buttons disabled", prompt)
        self.assertNotIn("[Telegram inline buttons protocol]", prompt)

    def test_multi_bot_config_is_supported(self):
        cfg = {
            "bots": [
                {"name": "main", "token_env": "TELEGRAM_BOT_TOKEN", "routes": {"1": "default"}},
                {"name": "boss", "token_env": "TELEGRAM_BOT_TOKEN_BOSS", "routes": {"2": "boss"}},
            ],
            "default_profile": "default",
        }
        bots = router.configured_bots(cfg)
        self.assertEqual([b["bot_name"] for b in bots], ["main", "boss"])
        self.assertEqual(bots[1]["routes"], {"2": "boss"})

    def test_profile_route_falls_back_to_default(self):
        cfg = {"routes": {"42": "boss"}, "default_profile": "default"}
        self.assertEqual(router.resolve_profile(cfg, 42), "boss")
        self.assertEqual(router.resolve_profile(cfg, 99), "default")


if __name__ == "__main__":
    unittest.main()
