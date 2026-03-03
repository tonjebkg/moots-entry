import 'dotenv/config'

export const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
  },
  whatsapp: {
    credentialsPath: process.env.WHATSAPP_CREDENTIALS_PATH || '~/.moots/credentials/whatsapp',
    enabled: process.env.WHATSAPP_ENABLED === 'true',
  },
  api: {
    baseUrl: process.env.MOOTS_API_BASE || 'http://localhost:3000',
    apiKey: process.env.MOOTS_API_KEY || '',
  },
}
