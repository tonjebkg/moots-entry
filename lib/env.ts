import { z } from "zod";

/**
 * Environment variable validation using Zod
 *
 * This validates all required environment variables at startup,
 * providing clear error messages if any are missing or invalid.
 */

// Base schema for all environments
const baseEnvSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // App mode
  NEXT_PUBLIC_APP_MODE: z
    .enum(["dashboard", "entry"])
    .default("entry"),

  // Azure Storage (required for both modes)
  AZURE_STORAGE_CONNECTION_STRING: z
    .string()
    .min(1, "Azure Storage connection string is required")
    .startsWith(
      "DefaultEndpointsProtocol=",
      "Invalid Azure connection string format"
    ),

  AZURE_STORAGE_CONTAINER_NAME: z
    .string()
    .min(1, "Azure Storage container name is required")
    .default("public"),
});

// Dashboard mode specific variables
const dashboardEnvSchema = baseEnvSchema.extend({
  // Neon Database (required in dashboard mode)
  // Accept postgres://, postgresql://, or postgres:// URLs
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL URL (postgres:// or postgresql://)"
    ),

  // Session configuration (optional — defaults applied in lib/auth.ts)
  SESSION_SECRET: z.string().optional(),
  SESSION_EXPIRY_HOURS: z.coerce.number().int().min(1).default(72).optional(),

  // Legacy Basic Auth (deprecated — kept optional for migration period)
  DASHBOARD_AUTH_USER: z.string().optional(),
  DASHBOARD_AUTH_PASS: z.string().optional(),

  // Resend email service (required in dashboard mode for invitations)
  RESEND_API_KEY: z
    .string()
    .min(1, "Resend API key is required")
    .startsWith("re_", "Resend API key must start with re_"),

  RESEND_FROM_EMAIL: z
    .string()
    .email("Resend from email must be a valid email address"),

  // Supabase (optional in dashboard mode)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// Entry mode specific variables
const entryEnvSchema = baseEnvSchema.extend({
  // Supabase (required in entry mode)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("Supabase URL must be a valid URL"),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anon key is required"),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Supabase service role key is required"),

  // Database (optional in entry mode)
  DATABASE_URL: z.string().url().optional(),
  DASHBOARD_AUTH_USER: z.string().optional(),
  DASHBOARD_AUTH_PASS: z.string().optional(),
});

// Optional environment variables (for both modes)
const optionalEnvSchema = z.object({
  // Rate limiting (optional, falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // App URL for CORS
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * Get raw environment variables
 */
function getRawEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AZURE_STORAGE_CONNECTION_STRING:
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SESSION_EXPIRY_HOURS: process.env.SESSION_EXPIRY_HOURS,
    DASHBOARD_AUTH_USER: process.env.DASHBOARD_AUTH_USER,
    DASHBOARD_AUTH_PASS: process.env.DASHBOARD_AUTH_PASS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Validate environment variables based on app mode
 */
function validateEnv() {
  const rawEnv = getRawEnv();
  const appMode = rawEnv.NEXT_PUBLIC_APP_MODE || "entry";

  try {
    // Choose schema based on app mode
    const schema =
      appMode === "dashboard"
        ? dashboardEnvSchema.merge(optionalEnvSchema)
        : entryEnvSchema.merge(optionalEnvSchema);

    // Validate
    const validated = schema.parse(rawEnv);

    // Log successful validation
    console.log("✅ Environment variables validated successfully");
    console.log(`📋 Configuration:`);
    console.log(`  - Mode: ${validated.NEXT_PUBLIC_APP_MODE}`);
    console.log(`  - Node Env: ${validated.NODE_ENV}`);

    if (validated.NEXT_PUBLIC_APP_MODE === "dashboard") {
      console.log(`  - Database: Neon (${validated.DATABASE_URL?.split("@")[1]?.split("/")[0] || "connected"})`);
      console.log(`  - Auth: Session-based (cookie)`);
    } else {
      const supabaseUrl = validated.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseDomain = supabaseUrl.split("//")[1]?.split(".")[0] || "connected";
      console.log(`  - Database: Supabase (${supabaseDomain})`);
      console.log(`  - Auth: None (public mode)`);
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      console.error("");

      // Group errors by missing vs invalid
      const missingVars: string[] = [];
      const invalidVars: string[] = [];

      error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        const message = issue.message;

        if (
          issue.code === "invalid_type" &&
          (issue as any).received === "undefined"
        ) {
          missingVars.push(`  ✗ ${field}: ${message}`);
        } else {
          invalidVars.push(`  ✗ ${field}: ${message}`);
        }
      });

      if (missingVars.length > 0) {
        console.error("Missing required variables:");
        missingVars.forEach((msg) => console.error(msg));
        console.error("");
      }

      if (invalidVars.length > 0) {
        console.error("Invalid values:");
        invalidVars.forEach((msg) => console.error(msg));
        console.error("");
      }

      console.error(`App mode: ${appMode}`);
      console.error("");
      console.error("Please check your .env.local file and ensure all required");
      console.error("environment variables are set correctly.");
      console.error("");

      // Exit with error in production, continue in development
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      } else {
        console.warn("⚠️  Continuing in development mode with validation errors");
        console.warn("⚠️  Application may not function correctly");
        console.warn("");
      }
    }

    throw error;
  }
}

/**
 * Validated environment variables
 * This will throw an error if validation fails
 */
export const env = validateEnv();

/**
 * Type-safe access to environment variables
 */
export type Env = z.infer<typeof dashboardEnvSchema> &
  z.infer<typeof optionalEnvSchema>;

/**
 * Check if running in dashboard mode
 */
export function isDashboardMode(): boolean {
  return env.NEXT_PUBLIC_APP_MODE === "dashboard";
}

/**
 * Check if running in entry mode
 */
export function isEntryMode(): boolean {
  return env.NEXT_PUBLIC_APP_MODE === "entry";
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}
