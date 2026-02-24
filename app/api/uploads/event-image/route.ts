import { NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'
import { checkUploadRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import {
  validateImageFile,
  generateUniqueFilename,
  validateFileTypeMatchesExtension,
  formatFileSize,
} from '@/lib/file-validation'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { requireAuth } from '@/lib/auth'
import { logAction } from '@/lib/audit-log'

export const runtime = 'nodejs'

/**
 * POST /api/uploads/event-image
 * Uploads an event image to Azure Blob Storage
 * Protected by Basic Auth / dashboard mode checks (handled by middleware or caller)
 */
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const auth = await requireAuth();

    // Apply rate limiting based on IP address
    const identifier = getClientIdentifier(req);
    const rateLimit = checkUploadRateLimit(identifier);

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      logger.warn('Upload rate limit exceeded', { identifier });
      return NextResponse.json(
        {
          error: 'Too many upload requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Check Azure credentials (validated by env.ts)
    const connectionString = env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = env.AZURE_STORAGE_CONTAINER_NAME || 'public';

    if (!connectionString) {
      logger.error('Azure Storage not configured');
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 503 }
      )
    }

    // Parse form data
    const form = await req.formData()
    const file = form.get('file') as File | null
    const eventId = form.get('eventId') as string | null

    if (!file) {
      logger.warn('Upload attempt with no file');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      logger.warn('File validation failed', {
        error: validation.error,
        details: validation.details,
        filename: file.name,
        size: file.size,
        type: file.type,
      });
      return NextResponse.json(
        {
          error: validation.error,
          details: validation.details,
        },
        { status: 400 }
      );
    }

    // Additional validation: check MIME type matches extension
    if (!validateFileTypeMatchesExtension(file)) {
      logger.warn('File type/extension mismatch', {
        filename: file.name,
        type: file.type,
      });
      return NextResponse.json(
        {
          error: 'File type does not match extension',
          details: 'The file extension does not match the file type',
        },
        { status: 400 }
      );
    }

    // Validate connection string format
    if (!connectionString.startsWith("DefaultEndpointsProtocol=")) {
      logger.error('Invalid Azure connection string format');
      throw new Error("Invalid Azure connection string format");
    }

    // Generate secure blob path with unique filename
    const uniqueFilename = generateUniqueFilename(file.name);
    const blobPath = eventId
      ? `events/${eventId}/${uniqueFilename}`
      : `events/${uniqueFilename}`;

    logger.info('Starting file upload', {
      filename: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      blobPath,
    });

    // Upload to Azure with metadata
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload with metadata
    const uploadStartTime = Date.now();
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: file.type || 'image/jpeg',
        blobCacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        size: file.size.toString(),
        eventId: eventId || 'none',
        uploaderIp: identifier,
      },
    });
    const uploadDuration = Date.now() - uploadStartTime;

    // Construct public URL
    const publicUrl = blockBlobClient.url

    logger.info('File upload successful', {
      blobPath,
      size: formatFileSize(file.size),
      uploadDurationMs: uploadDuration,
      totalDurationMs: Date.now() - startTime,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'event.image_uploaded',
      entityType: 'event',
      entityId: eventId || undefined,
      newValue: { url: publicUrl, path: blobPath },
      ipAddress: identifier,
    });

    return NextResponse.json({
      url: publicUrl,
      path: blobPath,
      message: 'Image uploaded successfully',
      size: formatFileSize(file.size),
    })
  } catch (err: any) {
    logger.error('Upload failed', err, {
      durationMs: Date.now() - startTime,
    });

    // Return generic error in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Upload failed',
        ...(isDevelopment && { details: err.message }),
      },
      { status: 500 }
    )
  }
}
