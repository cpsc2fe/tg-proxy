const axios = require("axios");
const FormData = require("form-data");

/**
 * POST /api/send-photo?botToken=...&chatId=...&threadId=...&caption=...
 * Body: raw binary (from n8n "n8n Binary File")
 *
 * Env fallback:
 * - BOT_TOKEN
 * - CHAT_ID
 */

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

    // threadId optional
    const threadIdRaw = qs.threadId;
    const threadId =
      threadIdRaw !== undefined && threadIdRaw !== null && String(threadIdRaw).trim() !== ""
        ? Number(threadIdRaw)
        : undefined;

    // caption optional
    const captionRaw = qs.caption;
    const caption =
      captionRaw !== undefined && captionRaw !== null && String(captionRaw).trim() !== ""
        ? String(captionRaw)
        : undefined;

    if (!botToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "botToken is required" }),
      };
    }

    if (!chatId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "chatId is required" }),
      };
    }

    if (threadIdRaw && Number.isNaN(threadId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "threadId must be a number" }),
      };
    }

    // n8n Binary File -> raw body
    const fileBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "Empty file body" }),
      };
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", fileBuffer, {
      filename: "chart.png",
      contentType: "image/png",
    });

    if (threadId !== undefined) {
      form.append("message_thread_id", String(threadId));
    }

    if (caption !== undefined) {
      form.append("caption", caption);
      // 如果你未來需要 HTML/Markdown，再加 parse_mode
    }

    const resp = await axios.post(telegramApiUrl, form, {
      timeout: 20000,
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        messageId: resp.data?.result?.message_id,
      }),
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const desc = err.response?.data?.description || err.message || "Internal error";
    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ ok: false, error: desc }),
    };
  }
};
