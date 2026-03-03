import { config } from './config.js'
import { createTelegramAdapter } from './adapters/telegram.js'
import { createWhatsAppAdapter } from './adapters/whatsapp.js'
import { routeMessage } from './router.js'

async function main() {
  console.log('=== Moots Message Bridge ===')
  console.log(`Telegram: ${config.telegram.enabled ? 'ENABLED' : 'DISABLED'}`)
  console.log(`WhatsApp: ${config.whatsapp.enabled ? 'ENABLED' : 'DISABLED'}`)
  console.log(`API Base: ${config.api.baseUrl}`)
  console.log('')

  if (!config.databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const adapters: Array<{ stop: () => void }> = []

  // Start Telegram adapter
  if (config.telegram.enabled) {
    try {
      const telegram = createTelegramAdapter(config.telegram.botToken, routeMessage)
      telegram.start()
      adapters.push(telegram)
      console.log('[main] Telegram adapter started')
    } catch (err) {
      console.error('[main] Failed to start Telegram adapter:', err)
    }
  }

  // Start WhatsApp adapter
  if (config.whatsapp.enabled) {
    try {
      const whatsapp = await createWhatsAppAdapter(
        config.whatsapp.credentialsPath,
        routeMessage
      )
      adapters.push(whatsapp)
      console.log('[main] WhatsApp adapter started')
    } catch (err) {
      console.error('[main] Failed to start WhatsApp adapter:', err)
    }
  }

  if (!config.telegram.enabled && !config.whatsapp.enabled) {
    console.warn(
      '[main] No messaging channels enabled. Set TELEGRAM_BOT_TOKEN or WHATSAPP_ENABLED=true'
    )
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[main] Shutting down...')
    for (const adapter of adapters) {
      adapter.stop()
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Keep process alive
  console.log('\n[main] Message bridge is running. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[main] Fatal error:', err)
  process.exit(1)
})
