import { Bot } from 'grammy'
import { createPairingCode } from '../auth.js'
import type { MessageHandler } from '../types.js'

/**
 * Create a Telegram bot adapter that listens for messages and routes them
 * through the Moots message bridge.
 */
export function createTelegramAdapter(botToken: string, onMessage: MessageHandler) {
  const bot = new Bot(botToken)

  // /start command — welcome message
  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Welcome to Moots Intelligence! I can help you manage your events, guests, and team.\n\n' +
        'To get started, link your account:\n' +
        '1. Send /pair to get a pairing code\n' +
        '2. Enter the code in Moots Dashboard \u2192 Settings \u2192 Messaging\n\n' +
        'Once paired, you can ask me anything about your events!'
    )
  })

  // /pair command — generate pairing code
  bot.command('pair', async (ctx) => {
    if (!ctx.from) {
      await ctx.reply('Unable to identify your account.')
      return
    }

    const displayName = [ctx.from.first_name, ctx.from.last_name]
      .filter(Boolean)
      .join(' ')
    const code = await createPairingCode('telegram', String(ctx.from.id), displayName)

    await ctx.reply(
      `Your pairing code is: <b>${code}</b>\n\n` +
        `Enter this code in your Moots Dashboard:\n` +
        `Settings \u2192 Messaging \u2192 Telegram \u2192 Enter pairing code\n\n` +
        `This code expires in 10 minutes.`,
      { parse_mode: 'HTML' }
    )
  })

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '<b>Moots Intelligence \u2014 Commands</b>\n\n' +
        '/pair \u2014 Link your Telegram to Moots\n' +
        '/help \u2014 Show this help message\n\n' +
        '<b>Once paired, just send a message:</b>\n' +
        '\u2022 "Is Eleanor Blackwood confirmed for Thursday?"\n' +
        '\u2022 "What\'s my next event?"\n' +
        '\u2022 "Who hasn\'t responded to the Founding Table campaign?"\n' +
        '\u2022 "Quick brief on Charles Montgomery"\n' +
        '\u2022 "Which event needs the most attention?"',
      { parse_mode: 'HTML' }
    )
  })

  // Regular message handler — route text messages to Moots AI
  bot.on('message:text', async (ctx) => {
    if (!ctx.from || !ctx.message.text) return

    // Show "typing" indicator while processing
    await ctx.replyWithChatAction('typing')

    const response = await onMessage({
      channelType: 'telegram',
      channelUserId: String(ctx.from.id),
      displayName: [ctx.from.first_name, ctx.from.last_name]
        .filter(Boolean)
        .join(' '),
      text: ctx.message.text,
      timestamp: new Date(ctx.message.date * 1000),
    })

    // Split long responses (Telegram has 4096 char limit)
    const maxLen = 4000
    if (response.text.length <= maxLen) {
      await ctx.reply(response.text, { parse_mode: 'HTML' })
    } else {
      const chunks = splitMessage(response.text, maxLen)
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'HTML' })
      }
    }
  })

  // Error handler
  bot.catch((err) => {
    console.error('[telegram] Bot error:', err)
  })

  return {
    start: () => {
      console.log('[telegram] Starting bot...')
      bot.start({
        onStart: (info) =>
          console.log(`[telegram] Bot started as @${info.username}`),
      })
    },
    stop: () => bot.stop(),
  }
}

/**
 * Split a long message into chunks that fit within Telegram's character limit.
 * Tries to split at newline boundaries for cleaner output.
 */
function splitMessage(text: string, maxLen: number): string[] {
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }
    // Try to split at a newline within the first maxLen chars
    let splitAt = remaining.lastIndexOf('\n', maxLen)
    if (splitAt < maxLen / 2) splitAt = maxLen
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  return chunks
}
