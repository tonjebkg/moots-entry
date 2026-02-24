import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withErrorHandling } from '@/lib/with-error-handling';
import { csvInvitationRowSchema } from '@/lib/schemas/invitation';
import { logger } from '@/lib/logger';
import Papa from 'papaparse';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ campaignId: string }>;
};

interface CsvRow {
  full_name: string;
  email: string;
  tier?: string;
  priority?: string;
  expected_plus_ones?: string | number;
  internal_notes?: string;
}

interface UploadError {
  row: number;
  error: string;
  data?: any;
}

/**
 * POST /api/campaigns/[campaignId]/invitations/upload
 * Bulk upload invitations via CSV
 *
 * CSV Format:
 * - Required columns: full_name, email
 * - Optional columns: tier, priority, expected_plus_ones, internal_notes
 * - Max 10,000 rows
 * - Duplicate emails will be skipped
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { campaignId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      );
    }

    // Get database client
    const db = getDb();

    // Check if campaign exists
    const campaign = await db`
      SELECT id, event_id, name
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const eventId = campaign[0].event_id;

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<CsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      logger.error('CSV parsing errors', undefined, {
        errors: parseResult.errors,
      });
      return NextResponse.json(
        {
          error: 'Failed to parse CSV',
          details: parseResult.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const rows = parseResult.data;

    // Validate row count
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    if (rows.length > 10000) {
      return NextResponse.json(
        { error: 'CSV file exceeds maximum of 10,000 rows' },
        { status: 400 }
      );
    }

    // Get existing emails in this campaign (to skip duplicates)
    const existingEmails = await db`
      SELECT LOWER(email) as email
      FROM campaign_invitations
      WHERE campaign_id = ${campaignId}
    `;

    const existingEmailSet = new Set(
      existingEmails.map((row) => row.email.toLowerCase())
    );

    // Validate and prepare rows for insertion
    const errors: UploadError[] = [];
    const validRows: any[] = [];
    const emailsInUpload = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header row and 0-indexing

      try {
        // Validate row
        const validated = csvInvitationRowSchema.parse(row);

        // Normalize email
        const email = validated.email.toLowerCase();

        // Check for duplicates in existing data
        if (existingEmailSet.has(email)) {
          errors.push({
            row: rowNumber,
            error: 'Email already exists in campaign',
            data: { email },
          });
          return;
        }

        // Check for duplicates in upload
        if (emailsInUpload.has(email)) {
          errors.push({
            row: rowNumber,
            error: 'Duplicate email in upload',
            data: { email },
          });
          return;
        }

        emailsInUpload.add(email);

        // Add to valid rows
        validRows.push({
          campaign_id: campaignId,
          event_id: eventId,
          full_name: validated.full_name,
          email: email,
          tier: validated.tier || 'TIER_2',
          priority: validated.priority || 'NORMAL',
          expected_plus_ones: validated.expected_plus_ones || 0,
          internal_notes: validated.internal_notes || null,
          status: 'CONSIDERING',
        });
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          error: error.message || 'Validation failed',
          data: row,
        });
      }
    });

    // If no valid rows, return errors
    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows to import',
          imported: 0,
          skipped: rows.length,
          errors,
        },
        { status: 400 }
      );
    }

    // Check capacity
    const capacityCheck = await db`
      SELECT
        e.total_capacity,
        (
          SELECT COUNT(*)
          FROM campaign_invitations ci
          WHERE ci.event_id = e.id
            AND ci.status = 'ACCEPTED'
        ) as seats_filled
      FROM events e
      WHERE e.id = ${eventId}
      LIMIT 1
    `;

    const totalCapacity = capacityCheck[0]?.total_capacity || 0;
    const seatsFilled = Number(capacityCheck[0]?.seats_filled || 0);
    const overCapacity =
      totalCapacity > 0 && seatsFilled + validRows.length > totalCapacity;

    // Bulk insert valid rows
    try {
      // Build bulk insert query - insert rows one by one
      const insertPromises = validRows.map((row) =>
        db`
          INSERT INTO campaign_invitations (
            campaign_id,
            event_id,
            full_name,
            email,
            tier,
            priority,
            expected_plus_ones,
            internal_notes,
            status
          ) VALUES (
            ${row.campaign_id},
            ${row.event_id},
            ${row.full_name},
            ${row.email},
            ${row.tier},
            ${row.priority},
            ${row.expected_plus_ones},
            ${row.internal_notes},
            ${row.status}
          )
          RETURNING id
        `
      );

      const insertResults = await Promise.all(insertPromises);
      const insertResult = insertResults.flat();

      logger.info('Bulk invitations uploaded', {
        campaignId,
        imported: insertResult.length,
        skipped: errors.length,
      });

      logAction({
        workspaceId: auth.workspace.id,
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: 'invitation.bulk_imported',
        entityType: 'invitation',
        entityId: campaignId,
        metadata: {
          campaignId,
          eventId,
          imported: insertResult.length,
          skipped: errors.length,
        },
        ipAddress: getClientIdentifier(req),
      });

      return NextResponse.json({
        imported: insertResult.length,
        skipped: errors.length,
        errors: errors.slice(0, 100), // Limit errors to first 100
        message: `Successfully imported ${insertResult.length} invitations`,
        warning: overCapacity
          ? 'Upload will exceed event capacity when accepted'
          : undefined,
      });
    } catch (error: any) {
      logger.error('Failed to bulk insert invitations', undefined, {
        error: error.message,
        campaignId,
      });
      return NextResponse.json(
        {
          error: 'Failed to insert invitations',
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
);
