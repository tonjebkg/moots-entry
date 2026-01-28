import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Guard: Only allow Neon access in dashboard mode
const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

// Lazy-initialized singleton
let _db: NeonQueryFunction<false, false> | null = null;

/**
 * Get Neon database client.
 * Only available in dashboard mode with DATABASE_URL configured.
 * Throws clear error if accessed in entry mode.
 */
export function getDb(): NeonQueryFunction<false, false> {
  // Block access in entry mode
  if (!isDashboardMode) {
    throw new Error('Database access not available in entry mode (NEXT_PUBLIC_APP_MODE !== "dashboard")');
  }

  // Check for DATABASE_URL
  if (!hasDatabaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for dashboard mode');
  }

  // Lazy initialize on first call
  if (!_db) {
    _db = neon(process.env.DATABASE_URL!);
  }

  return _db;
}
