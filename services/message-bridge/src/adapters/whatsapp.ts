import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createPairingCode } from '../auth.js'
import type { MessageHandler } from '../types.js'
import * as os from 'os'

/**
 * Create a WhatsApp adapter using Baileys (multi-device).
 * Connects via QR code pairing and routes incoming messages to the Moots bridge.
 */
export async function createWhatsAppAdapter(
  credentialsPath: string,
  onMessage: MessageHandler
) {
  // Resolve ~ in path
  const resolvedPath = credentialsPath.replace(/^~/, os.homedir())
  const { state, saveCreds } = await useMultiFileAuthState(resolvedPath)

  let sock: WASocket

  function connectSocket() {
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['Moots Intelligence', 'Chrome', '120.0.0'],
    })

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds)

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log(
          '[whatsapp] QR code displayed in terminal. Scan with WhatsApp to pair.'
        )
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = reason !== DisconnectReason.loggedOut

        console.log(
          `[whatsapp] Connection closed. Reason: ${reason}. Reconnecting: ${shouldReconnect}`
        )

        if (shouldReconnect) {
          setTimeout(() => connectSocket(), 3000)
        } else {
          console.log(
            '[whatsapp] Logged out. Delete credentials and re-pair.'
          )
        }
      }

      if (connection === 'open') {
        console.log('[whatsapp] Connected successfully!')
      }
    })

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        // Skip own messages and non-text messages
        if (msg.key.fromMe) continue
        if (!msg.message) continue

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          null

        if (!text) continue

        const remoteJid = msg.key.remoteJid
        if (!remoteJid) continue

        // Extract phone number (remove @s.whatsapp.net)
        const phoneNumber = remoteJid
          .replace('@s.whatsapp.net', '')
          .replace('@g.us', '')

        // Skip group messages for now
        if (remoteJid.endsWith('@g.us')) continue

        console.log(
          `[whatsapp] Message from ${phoneNumber}: ${text.slice(0, 50)}...`
        )

        // Handle /pair command
        if (
          text.toLowerCase().startsWith('/pair') ||
          text.toLowerCase().startsWith('pair')
        ) {
          const displayName = msg.pushName || 'Unknown'
          const code = await createPairingCode(
            'whatsapp',
            phoneNumber,
            displayName
          )
          await sock.sendMessage(remoteJid, {
            text:
              `Your pairing code is: *${code}*\n\n` +
              `Enter this code in your Moots Dashboard:\n` +
              `Settings \u2192 Messaging \u2192 WhatsApp \u2192 Enter pairing code\n\n` +
              `This code expires in 10 minutes.`,
          })
          continue
        }

        // Route to message handler
        const response = await onMessage({
          channelType: 'whatsapp',
          channelUserId: phoneNumber,
          displayName: msg.pushName || 'Unknown',
          text,
          timestamp: new Date((msg.messageTimestamp as number) * 1000),
        })

        await sock.sendMessage(remoteJid, { text: response.text })
      }
    })
  }

  connectSocket()

  return {
    stop: () => {
      sock?.end(undefined)
    },
  }
}
