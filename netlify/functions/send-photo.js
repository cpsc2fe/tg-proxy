const axios = require("axios");
const FormData = require("form-data");
const Busboy = require("busboy");

/**
 * POST /api/send-photo
 * Content-Type: multipart/form-data
 *
 * Fields:
 * - botToken (optional, fallback env BOT_TOKEN)
 * - chatId   (optional, fallback env CHAT_ID)
 *
 * File:
 * - photo (required): image file (binary)
 */

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"];

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return reject(new Error("Expected multipart/form-data"));
    }

    const busboy = Busboy({ headers: { "content-type": contentType } });

    const fields = {};
    let fileBuffer = null;
    let filename = "photo.png";
    let mimeType = "image/png";

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("file", (name, file, info) => {
      // Expect the file field name to be "photo"
      if (name !== "photo") {
        // drain stream
        file.resume();
        return;
      }

      filename = info?.filename || filename;
      mimeType = info?.mimeType || mimeType;

      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      resolve({ fields, fileBuffer, filename, mimeType });
    });

    // Netlify passes raw body; if isBase64Encoded then decode it
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body || "", "utf8");

    busboy.end(body);
  });
}

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
    const { fields, fileBuffer, filename, mimeType } = await parseMultipart(
      event
    );

    const botToken = fields.botToken || process.env.BOT_TOKEN;
    const chatId = fields.chatId || process.env.CHAT_ID;

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

    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "photo file is required" }),
      };
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", fileBuffer, { filename, contentType: mimeType });

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
    const desc =
      err.response?.data?.description || err.message || "Internal error";

    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ ok: false, error: desc }),
    };
  }
};
