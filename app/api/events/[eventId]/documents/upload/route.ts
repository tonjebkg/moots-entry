import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'
import { requireAuth, requireRole } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { env } from '@/lib/env'
import { getClientIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'txt']

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * POST /api/events/[eventId]/documents/upload
 * Upload a document to Azure Blob Storage for AI analysis
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50MB.` },
        { status: 400 }
      )
    }

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type .${ext} not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Upload to Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      env.AZURE_STORAGE_CONNECTION_STRING
    )
    const containerClient = blobServiceClient.getContainerClient(
      env.AZURE_STORAGE_CONTAINER_NAME
    )

    const blobName = `events/${eventId}/documents/${crypto.randomUUID()}-${file.name}`
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: file.type },
    })

    const blobUrl = blockBlobClient.url

    // Save metadata to DB
    const db = getDb()
    const result = await db`
      INSERT INTO event_documents (
        event_id, workspace_id, name, size_bytes, file_type, blob_url, status
      ) VALUES (
        ${eventIdNum},
        ${auth.workspace.id},
        ${file.name},
        ${file.size},
        ${ext},
        ${blobUrl},
        'queued'
      )
      RETURNING id, name, size_bytes, file_type, blob_url, status, created_at
    `

    const doc = result[0]

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'document.uploaded',
      entityType: 'event_document',
      entityId: doc.id,
      newValue: { name: file.name, size: file.size, type: ext },
      ipAddress: getClientIdentifier(request),
    })

    const sizeFormatted =
      file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(0)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

    return NextResponse.json({
      id: doc.id,
      eventId,
      name: doc.name,
      size: doc.size_bytes,
      sizeFormatted,
      type: doc.file_type,
      blobUrl: doc.blob_url,
      status: doc.status,
      createdAt: doc.created_at,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /documents/upload] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
