import { NextResponse } from 'next/server';
import { testDbConnection } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint for uptime monitoring.
 */
export async function GET() {
  const dbOk = await testDbConnection();

  const status = dbOk ? 'ok' : 'degraded';
  const statusCode = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'connected' : 'unreachable',
      },
    },
    { status: statusCode }
  );
}
