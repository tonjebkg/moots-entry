import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { env, isDashboardMode } from './env';

// Lazy-initialized singleton
let _db: NeonQueryFunction<false, false> | null = null;

/**
 * Get Neon database client.
 * Only available in dashboard mode with DATABASE_URL configured.
 * Throws clear error if accessed in entry mode.
 *
 * Environment variables are validated at startup via lib/env.ts
 */
export function getDb(): NeonQueryFunction<false, false> {
  // Block access in entry mode
  if (!isDashboardMode()) {
    throw new Error('Database access not available in entry mode (NEXT_PUBLIC_APP_MODE !== "dashboard")');
  }

  // Check for DATABASE_URL (validated by env.ts)
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for dashboard mode');
  }

  // Lazy initialize on first call
  if (!_db) {
    _db = neon(env.DATABASE_URL);
  }

  return _db;
}

/**
 * Test database connection
 */
export async function testDbConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
