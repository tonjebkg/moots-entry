import { NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'

export const runtime = 'nodejs'

/**
 * POST /api/uploads/event-image
 * Uploads an event image to Azure Blob Storage
 * Protected by Basic Auth / dashboard mode checks (handled by middleware or caller)
 */
export async function POST(req: Request) {
  try {
    // Check Azure credentials
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'public'

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Azure Storage not configured (missing AZURE_STORAGE_CONNECTION_STRING)' },
        { status: 503 }
      )
    }

    // Parse form data
    const form = await req.formData()
    const file = form.get('file') as File | null
    const eventId = form.get('eventId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!conn) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing");
}

if (!conn.startsWith("DefaultEndpointsProtocol=")) {
  throw new Error("Invalid Azure connection string format");
}

    // Generate blob path: events/{eventId}/{timestamp}-{filename}
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blobPath = eventId
      ? `events/${eventId}/${timestamp}-${sanitizedFilename}`
      : `events/${timestamp}-${sanitizedFilename}`

    // Upload to Azure
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: file.type || 'image/jpeg',
      },
    })

    // Construct public URL
    const publicUrl = blockBlobClient.url

    return NextResponse.json({
      url: publicUrl,
      path: blobPath,
      message: 'Image uploaded successfully',
    })
  } catch (err: any) {
    console.error('[POST /api/uploads/event-image] Error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Upload failed' },
      { status: 500 }
    )
  }
}
