const token = process.env.TELEGRAM_BOT_TOKEN;
const workspaceUrl = process.env.COMANDOS_WORKSPACE_URL || "";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
let offset = 0;

async function request(method, body) {
  const response = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function reply(chatId, text) {
  await request("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function poll() {
  while (true) {
    try {
      const data = await request("getUpdates", {
        timeout: 45,
        offset,
        allowed_updates: ["message"],
      });
      for (const update of data.result || []) {
        offset = update.update_id + 1;
        const message = update.message;
        if (!message?.chat?.id) continue;
        const text = String(message.text || "").trim();
        if (text === "/start" || text === "/help") {
          await reply(
            message.chat.id,
            `COMANDOS Hermes работает. Панель: ${workspaceUrl || "адрес панели ещё не задан"}`,
          );
        } else {
          await reply(message.chat.id, "COMANDOS Hermes принял сообщение. Полная обработка задач будет включена в следующей версии Telegram-обвязки.");
        }
      }
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

poll();

