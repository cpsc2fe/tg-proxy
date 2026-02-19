const axios = require("axios");
const FormData = require("form-data");

/**
 * Netlify Serverless Function for sending Telegram photos
 *
 * POST /api/send-photo
 *
 * Body (recommended: photoUrl):
 * {
 *   "botToken": "your-bot-token",
 *   "chatId": "chat-id-or-username",
 *   "photoUrl": "https://example.com/image.png",
 *   "caption": "optional caption",
 *   "parseMode": "HTML", // optional: HTML, Markdown, MarkdownV2
 *   "threadId": 123 // optional: message thread ID for topics in groups
 * }
 *
 * Body (optional: base64):
 * {
 *   "botToken": "your-bot-token",
 *   "chatId": "chat-id-or-username",
 *   "photoBase64": "iVBORw0KGgoAAAANSUhEUgAA...", // raw base64, no data: prefix
 *   "fileName": "chart.png", // optional
 *   "mimeType": "image/png", // optional
 *   "caption": "optional caption",
 *   "parseMode": "HTML",
 *   "threadId": 123
 * }
 *
 * Notes:
 * - If both photoUrl and photoBase64 exist, photoUrl will be used.
 * - For URL sending, we use Telegram sendPhoto JSON body (simplest).
 * - For base64, we upload via multipart/form-data using FormData.
 */

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed. Use POST.",
      }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");

    // Use environment variables as defaults, but allow API request to override
    const botToken = body.botToken || process.env.BOT_TOKEN;
    const chatId = body.chatId || process.env.CHAT_ID;

    const photoUrl = body.photoUrl || body.photo; // allow photo as alias
    const photoBase64 = body.photoBase64; // optional
    const fileName = body.fileName || "photo.png";
    const mimeType = body.mimeType || "image/png";

    const caption = body.caption;
    const parseMode = body.parseMode;
    const threadId = body.threadId;

    // Validate required fields
    if (!botToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Bot token is required (either in request body or BOT_TOKEN environment variable)",
          example: {
            botToken: "your-bot-token",
            chatId: "chat-id-or-username",
            photoUrl: "https://example.com/image.png",
            caption: "Optional caption",
            threadId: 123, // optional
          },
        }),
      };
    }

    if (!chatId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Chat ID is required (either in request body or CHAT_ID environment variable)",
          example: {
            botToken: "your-bot-token",
            chatId: "chat-id-or-username",
            photoUrl: "https://example.com/image.png",
            caption: "Optional caption",
            threadId: 123, // optional
          },
        }),
      };
    }

    if (!photoUrl && !photoBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Either photoUrl (recommended) or photoBase64 is required",
          example: {
            botToken: "your-bot-token",
            chatId: "chat-id-or-username",
            photoUrl: "https://example.com/image.png",
            caption: "Optional caption",
            parseMode: "HTML",
            threadId: 123, // optional
          },
        }),
      };
    }

    // Prepare Telegram API request
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    // ---------
    // Path 1: Send by URL (simplest + most reliable)
    // ---------
    if (photoUrl) {
      const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        message_thread_id: threadId,
      };

      // Remove undefined fields to avoid Telegram 400 in some cases
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      if (parseMode) {
        payload.parse_mode = parseMode;
      }

      const response = await axios.post(telegramApiUrl, payload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Photo sent successfully (by URL)",
          messageId: response.data.result.message_id,
          chatId: response.data.result.chat.id,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // ---------
    // Path 2: Send by base64 upload (multipart/form-data)
    // ---------
    // Convert base64 to buffer
    let buffer;
    try {
      buffer = Buffer.from(photoBase64, "base64");
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Invalid photoBase64. Must be a valid base64 string.",
          timestamp: new Date().toISOString(),
        }),
      };
    }

    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", buffer, { filename: fileName, contentType: mimeType });

    if (caption) form.append("caption", caption);
    if (parseMode) form.append("parse_mode", parseMode);
    if (threadId !== undefined && threadId !== null) {
      form.append("message_thread_id", String(threadId));
    }

    const response = await axios.post(telegramApiUrl, form, {
      timeout: 20000, // uploading might take longer
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Photo sent successfully (by base64 upload)",
        messageId: response.data.result.message_id,
        chatId: response.data.result.chat.id,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error sending Telegram photo:", error.message);

    // Handle different types of errors
    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (error.response) {
      // Telegram API error
      statusCode = error.response.status;
      errorMessage = error.response.data.description || "Telegram API error";

      if (error.response.status === 400) {
        errorMessage = `Bad Request: ${error.response.data.description}`;
      } else if (error.response.status === 401) {
        errorMessage = "Unauthorized: Invalid bot token";
      } else if (error.response.status === 403) {
        errorMessage = "Forbidden: Bot was blocked by user or kicked from chat";
      } else if (error.response.status === 404) {
        errorMessage = "Not Found: Chat not found";
      }
    } else if (error.request) {
      errorMessage = "Network error: Unable to reach Telegram API";
    } else if (error.name === "SyntaxError") {
      statusCode = 400;
      errorMessage = "Invalid JSON in request body";
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
