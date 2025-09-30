# Telegram Bot Proxy - Netlify Serverless Function

這是一個基於 Netlify serverless function 的 API 服務，可以讓你通過 HTTP 請求來控制特定的 Telegram bot 發送訊息。

## 功能特點

- 🚀 使用 Netlify serverless functions，無需維護伺服器
- 📱 支援發送訊息給個人、群組或頻道
- 🔒 支援多種 bot token，每次請求都可以指定不同的 bot
- 🎨 支援 HTML、Markdown 等訊息格式
- ⚡ 快速部署，零配置
- 🌍 自動 CORS 處理，支援跨域請求

## 快速開始

### 1. 部署到 Netlify

1. Fork 這個專案到你的 GitHub
2. 在 [Netlify](https://netlify.com) 中連接你的 GitHub 儲存庫
3. 部署會自動完成

或者使用 Netlify CLI：

```bash
# 安裝依賴
npm install

# 本地開發
npm run dev

# 部署
netlify deploy --prod
```

### 2. 取得 Telegram Bot Token

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 發送 `/newbot` 建立新的 bot
3. 按照指示操作，取得 bot token
4. 記下你的 bot token（格式：`1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`）

### 3. 取得 Chat ID

**對於個人聊天：**

1. 向你的 bot 發送一條訊息
2. 訪問：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. 在回應中找到 `chat.id`

**對於群組或頻道：**

1. 將 bot 加入群組或頻道
2. 在群組中發送一條訊息（提及 bot）
3. 訪問：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在回應中找到 `chat.id`（通常是負數）

## 環境變數設定 (選用)

你可以設定環境變數作為預設值，這樣 API 請求就更簡潔：

1. 複製 `.env.example` 為 `.env`：

   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env` 檔案，填入你的預設值：
   ```bash
   BOT_TOKEN=你的bot-token
   CHAT_ID=你的預設chat-id
   ```

## API 使用方式

### 發送訊息

**端點：** `POST /api/send-message`

**三種使用模式：**

#### 模式 1: 使用環境變數預設值

如果已設定環境變數，只需要傳送訊息：

```json
{
  "message": "要發送的訊息內容",
  "parseMode": "HTML"
}
```

#### 模式 2: 完整參數 (推薦)

```json
{
  "botToken": "your-bot-token",
  "chatId": "chat-id-or-username",
  "message": "要發送的訊息內容",
  "parseMode": "HTML"
}
```

#### 模式 3: 部分覆蓋環境變數

```json
{
  "chatId": "other-chat-id",
  "message": "發送到不同聊天的訊息"
}
```

**參數說明：**

- `botToken` (必填): Telegram bot 的 token
- `chatId` (必填): 目標聊天的 ID 或 username
  - 個人聊天：正數 ID，例如：`123456789`
  - 群組/頻道：負數 ID，例如：`-1001234567890`
  - 公開頻道：username，例如：`@mychannel`
- `message` (必填): 要發送的訊息內容
- `parseMode` (選填): 訊息格式，支援：
  - `HTML`: HTML 格式
  - `Markdown`: Markdown 格式
  - `MarkdownV2`: Markdown V2 格式

### 範例請求

#### 使用 curl

```bash
curl -X POST https://your-netlify-site.netlify.app/api/send-message \\
  -H "Content-Type: application/json" \\
  -d '{
    "botToken": "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh",
    "chatId": "123456789",
    "message": "Hello from API! 🚀"
  }'
```

#### 使用 JavaScript (fetch)

```javascript
const response = await fetch(
  "https://your-netlify-site.netlify.app/api/send-message",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      botToken: "your-bot-token",
      chatId: "your-chat-id",
      message: "Hello from JavaScript! 👋",
      parseMode: "HTML",
    }),
  }
);

const result = await response.json();
console.log(result);
```

#### 使用 Python (requests)

```python
import requests

url = 'https://your-netlify-site.netlify.app/api/send-message'
data = {
    'botToken': 'your-bot-token',
    'chatId': 'your-chat-id',
    'message': 'Hello from Python! 🐍'
}

response = requests.post(url, json=data)
print(response.json())
```

### 成功回應

```json
{
  "success": true,
  "message": "Message sent successfully",
  "messageId": 123,
  "chatId": 456789,
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": "Invalid bot token",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## 常見錯誤處理

| 錯誤碼 | 說明         | 解決方法                     |
| ------ | ------------ | ---------------------------- |
| 400    | Bad Request  | 檢查請求參數是否正確         |
| 401    | Unauthorized | 檢查 bot token 是否正確      |
| 403    | Forbidden    | Bot 被用戶封鎖或從群組中移除 |
| 404    | Not Found    | 聊天不存在或 bot 無法訪問    |

## HTML 訊息格式範例

當使用 `"parseMode": "HTML"` 時，你可以使用以下標籤：

```json
{
  "botToken": "your-bot-token",
  "chatId": "your-chat-id",
  "message": "<b>粗體文字</b>\\n<i>斜體文字</i>\\n<u>底線文字</u>\\n<a href='https://example.com'>連結</a>",
  "parseMode": "HTML"
}
```

## 安全注意事項

1. **不要在客戶端暴露 bot token**：請在伺服器端或環境變數中管理
2. **使用 HTTPS**：確保所有請求都通過 HTTPS 傳輸
3. **限制存取**：考慮添加身份驗證或 API 金鑰驗證
4. **速率限制**：注意 Telegram API 的速率限制（每分鐘最多 30 條訊息）

## 本地開發

1. 複製專案：

   ```bash
   git clone https://github.com/your-username/tg-proxy.git
   cd tg-proxy
   ```

2. 安裝依賴：

   ```bash
   npm install
   ```

3. 啟動本地開發伺服器：

   ```bash
   npm run dev
   ```

4. API 將在 `http://localhost:8888/api/send-message` 可用

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License

## 聯絡資訊

如有問題，請在 GitHub 上提交 Issue。

2025/09/30
