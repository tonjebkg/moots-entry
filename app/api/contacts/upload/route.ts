import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { csvContactRowSchema } from '@/lib/schemas/contact';
import { importCsvRows } from '@/lib/contacts/import';

/**
 * POST /api/contacts/upload — Bulk CSV import of contacts
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file || !file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
  }

  const fileContent = await file.text();
  const parseResult = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return NextResponse.json(
      { error: 'Failed to parse CSV', details: parseResult.errors.slice(0, 10) },
      { status: 400 }
    );
  }

  const rows = parseResult.data;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
  }
  if (rows.length > 10000) {
    return NextResponse.json({ error: 'CSV must have at most 10,000 rows' }, { status: 400 });
  }

  // Validate each row
  const validRows: any[] = [];
  const validationErrors: { row: number; error: string }[] = [];

  rows.forEach((row, index) => {
    try {
      const validated = csvContactRowSchema.parse(row);
      validRows.push(validated);
    } catch (err: any) {
      validationErrors.push({ row: index + 2, error: err.message || 'Invalid row' });
    }
  });

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows to import', errors: validationErrors.slice(0, 50) },
      { status: 400 }
    );
  }

  const result = await importCsvRows(auth.workspace.id, validRows);

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.bulk_imported',
    entityType: 'contact',
    entityId: null,
    metadata: {
      source: 'csv',
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.length,
    },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({
    imported: result.imported,
    skipped: result.skipped,
    errors: [...validationErrors, ...result.errors].slice(0, 100),
    message: `Successfully imported ${result.imported} contacts`,
  });
});
