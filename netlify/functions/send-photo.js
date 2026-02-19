const axios = require("axios");
const FormData = require("form-data");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: "Only POST allowed" }),
    };
  }

  try {
    const qs = event.queryStringParameters || {};
    const botToken = qs.botToken || process.env.BOT_TOKEN;
    const chatId = qs.chatId || process.env.CHAT_ID;

    if (!botToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "botToken is required" }) };
    }
    if (!chatId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "chatId is required" }) };
    }

    // n8n Binary File 送來的 raw body，在 Netlify 會以 base64 形式提供
    const fileBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    if (!fileBuffer || fileBuffer.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Empty file body" }) };
    }

    // 將圖檔轉送給 Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", fileBuffer, {
      filename: "chart.png",
      contentType: "image/png",
    });

    const resp = await axios.post(telegramApiUrl, form, {
      timeout: 20000,
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, messageId: resp.data?.result?.message_id }),
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const desc = err.response?.data?.description || err.message || "Internal error";
    return { statusCode: status, headers, body: JSON.stringify({ ok: false, error: desc }) };
  }
};
