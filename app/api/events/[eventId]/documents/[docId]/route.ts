import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'
import { requireAuth, requireRole } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { env } from '@/lib/env'
import { getClientIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string; docId: string }> }

/**
 * DELETE /api/events/[eventId]/documents/[docId]
 * Remove a document and its Azure blob
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')
    const { eventId, docId } = await params
    const eventIdNum = parseInt(eventId)
    const db = getDb()

    // Fetch document to get blob URL
    const docs = await db`
      SELECT id, blob_url, name
      FROM event_documents
      WHERE id = ${docId}
        AND event_id = ${eventIdNum}
      LIMIT 1
    `

    if (docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const doc = docs[0]

    // Delete from Azure
    if (doc.blob_url) {
      try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          env.AZURE_STORAGE_CONNECTION_STRING
        )
        const containerClient = blobServiceClient.getContainerClient(
          env.AZURE_STORAGE_CONTAINER_NAME
        )
        const url = new URL(doc.blob_url)
        const blobName = url.pathname.split('/').slice(2).join('/')
        await containerClient.getBlockBlobClient(blobName).deleteIfExists()
      } catch (blobErr) {
        console.warn('Failed to delete blob:', blobErr)
      }
    }

    // Delete from DB
    await db`DELETE FROM event_documents WHERE id = ${docId}`

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'document.deleted',
      entityType: 'event_document',
      entityId: docId,
      previousValue: { name: doc.name },
      ipAddress: getClientIdentifier(request),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /documents/:id] Error:', err)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
