# Moots Entry - Security & Code Quality Action Plan

**Generated**: 2026-02-13
**Total Issues**: 26
**Estimated Total Effort**: ~40-60 hours

---

## Executive Summary

This action plan addresses 26 identified issues across security, code quality, performance, and best practices. The plan is organized into 4 phases based on severity and dependencies:

- **Phase 1 (Critical)**: 4 issues - Must fix before production (~8-12 hours)
- **Phase 2 (High)**: 7 issues - Should fix ASAP (~12-16 hours)
- **Phase 3 (Medium)**: 9 issues - Important for long-term health (~16-24 hours)
- **Phase 4 (Low)**: 6 issues - Nice-to-have improvements (~8-12 hours)

---

## Phase 1: Critical Security Fixes (Must Fix Before Production)

### 🔴 Issue #1: TypeScript/ESLint Build Checks Disabled

**Severity**: Critical
**Files**: `next.config.mjs`
**Risk**: Defeats entire type safety system, allows bugs to reach production
**Effort**: 2-4 hours (includes fixing uncovered errors)

#### Current Code (Lines 2-8):
```javascript
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,  // ❌ REMOVE THIS
  },
  eslint: {
    ignoreDuringBuilds: true,  // ❌ REMOVE THIS
  },
};
```

#### Step-by-Step Fix:

1. **Remove the ignore flags**:
   ```javascript
   const nextConfig = {
     reactStrictMode: true,
     swcMinify: true,
     // typescript and eslint configs removed - use defaults
   };
   ```

2. **Run build to discover errors**:
   ```bash
   npm run build
   ```

3. **Fix TypeScript errors systematically**:
   - Add missing type annotations
   - Fix `any` types
   - Add null checks where needed
   - Fix unused variables

4. **Fix ESLint warnings**:
   ```bash
   npm run lint -- --fix
   ```

5. **Enable strict mode in `tsconfig.json`**:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "noImplicitReturns": true
     }
   }
   ```

6. **Verify build passes**:
   ```bash
   npm run build && npm run lint
   ```

#### Testing:
- Build should complete without errors
- All pages should render correctly
- Type safety should be enforced

---

### 🔴 Issue #2: No Rate Limiting on Public Endpoints

**Severity**: Critical
**Files**: All `/api/events/[eventId]/join-requests/*` endpoints
**Risk**: Spam attacks, DoS, resource exhaustion
**Effort**: 2-3 hours

#### Step-by-Step Fix:

1. **Install rate limiting library**:
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

2. **Create rate limit utility** (`lib/ratelimit.ts`):
   ```typescript
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   // Create Redis instance
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   // Rate limiters for different use cases
   export const publicApiRateLimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per minute
     analytics: true,
     prefix: "ratelimit:public",
   });

   export const joinRequestRateLimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(3, "300 s"), // 3 join requests per 5 minutes
     analytics: true,
     prefix: "ratelimit:join",
   });

   export const uploadRateLimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 uploads per minute
     analytics: true,
     prefix: "ratelimit:upload",
   });
   ```

3. **Create rate limit middleware helper** (`lib/withRateLimit.ts`):
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { Ratelimit } from "@upstash/ratelimit";

   export async function withRateLimit(
     request: NextRequest,
     ratelimit: Ratelimit,
     identifier?: string
   ) {
     // Use IP address as identifier by default
     const ip = identifier || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

     const { success, limit, reset, remaining } = await ratelimit.limit(ip);

     if (!success) {
       return NextResponse.json(
         { error: "Too many requests. Please try again later." },
         {
           status: 429,
           headers: {
             "X-RateLimit-Limit": limit.toString(),
             "X-RateLimit-Remaining": remaining.toString(),
             "X-RateLimit-Reset": reset.toString(),
             "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
           }
         }
       );
     }

     return null; // Success - no error response
   }
   ```

4. **Apply to join request endpoint** (`app/api/events/[eventId]/join-requests/route.ts`):
   ```typescript
   import { withRateLimit } from "@/lib/withRateLimit";
   import { joinRequestRateLimit } from "@/lib/ratelimit";

   export async function POST(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     // Apply rate limiting
     const rateLimitError = await withRateLimit(
       request,
       joinRequestRateLimit,
       // Use email as identifier for join requests
       (await request.json()).email
     );
     if (rateLimitError) return rateLimitError;

     // ... rest of endpoint logic
   }
   ```

5. **Apply to other public endpoints**:
   - `/api/events/[eventId]/join-requests/me/route.ts` (GET)
   - `/api/uploads/event-image/route.ts` (POST)
   - `/api/events/[eventId]/route.ts` (GET)

6. **Add environment variables** (`.env.local`):
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

7. **Alternative: In-memory rate limiting** (if not using Upstash):
   ```typescript
   // lib/ratelimit-memory.ts
   import { LRUCache } from "lru-cache";

   interface RateLimitEntry {
     count: number;
     resetAt: number;
   }

   const cache = new LRUCache<string, RateLimitEntry>({
     max: 500,
     ttl: 60000, // 1 minute
   });

   export function checkRateLimit(
     identifier: string,
     maxRequests: number,
     windowMs: number
   ): { success: boolean; remaining: number; reset: number } {
     const now = Date.now();
     const key = identifier;
     const entry = cache.get(key);

     if (!entry || entry.resetAt < now) {
       const resetAt = now + windowMs;
       cache.set(key, { count: 1, resetAt });
       return { success: true, remaining: maxRequests - 1, reset: resetAt };
     }

     if (entry.count >= maxRequests) {
       return { success: false, remaining: 0, reset: entry.resetAt };
     }

     entry.count++;
     cache.set(key, entry);
     return { success: true, remaining: maxRequests - entry.count, reset: entry.resetAt };
   }
   ```

#### Testing:
- Submit multiple join requests rapidly - should get 429 after limit
- Wait for window to reset - should allow requests again
- Verify rate limit headers are present

---

### 🔴 Issue #3: Timing Attack Vulnerability in Authentication

**Severity**: Critical
**Files**: `middleware.ts:26-30`
**Risk**: Timing attacks can reveal valid usernames
**Effort**: 30 minutes

#### Current Code (Lines 26-30):
```typescript
const authHeader = request.headers.get("authorization");
if (!authHeader || !authHeader.startsWith("Basic ")) {
  return unauthorizedResponse;
}

const base64Credentials = authHeader.split(" ")[1];
const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
const [username, password] = credentials.split(":");

if (username !== DASHBOARD_AUTH_USER || password !== DASHBOARD_AUTH_PASS) {
  return unauthorizedResponse;  // ❌ Timing attack vulnerability
}
```

#### Step-by-Step Fix:

1. **Replace string comparison with timing-safe comparison**:
   ```typescript
   import { timingSafeEqual } from "crypto";

   function timingSafeStringCompare(a: string, b: string): boolean {
     // Ensure strings are same length for comparison
     const bufA = Buffer.from(a, "utf-8");
     const bufB = Buffer.from(b, "utf-8");

     // If lengths differ, still compare to prevent timing leak
     if (bufA.length !== bufB.length) {
       // Compare against dummy buffer to maintain constant time
       const dummyBuf = Buffer.alloc(bufA.length);
       timingSafeEqual(bufA, dummyBuf);
       return false;
     }

     return timingSafeEqual(bufA, bufB);
   }
   ```

2. **Update middleware.ts**:
   ```typescript
   // Import at top
   import { timingSafeEqual } from "crypto";

   // Replace the comparison (around line 30):
   const usernameMatch = timingSafeStringCompare(username, DASHBOARD_AUTH_USER || "");
   const passwordMatch = timingSafeStringCompare(password, DASHBOARD_AUTH_PASS || "");

   if (!usernameMatch || !passwordMatch) {
     return unauthorizedResponse;
   }
   ```

3. **Add timing-safe helper to lib** (`lib/timing-safe-compare.ts`):
   ```typescript
   import { timingSafeEqual } from "crypto";

   /**
    * Performs timing-safe string comparison to prevent timing attacks
    * @param a First string to compare
    * @param b Second string to compare
    * @returns true if strings are equal, false otherwise
    */
   export function timingSafeStringCompare(a: string, b: string): boolean {
     try {
       const bufA = Buffer.from(a, "utf-8");
       const bufB = Buffer.from(b, "utf-8");

       // If lengths differ, still perform comparison to prevent timing leak
       if (bufA.length !== bufB.length) {
         // Compare against dummy buffer to maintain constant time
         const dummyBuf = Buffer.alloc(bufA.length);
         timingSafeEqual(bufA, dummyBuf);
         return false;
       }

       return timingSafeEqual(bufA, bufB);
     } catch {
       return false;
     }
   }
   ```

4. **Update middleware to use helper**:
   ```typescript
   import { timingSafeStringCompare } from "@/lib/timing-safe-compare";

   // In middleware function:
   const usernameMatch = timingSafeStringCompare(username, DASHBOARD_AUTH_USER || "");
   const passwordMatch = timingSafeStringCompare(password, DASHBOARD_AUTH_PASS || "");

   if (!usernameMatch || !passwordMatch) {
     return unauthorizedResponse;
   }
   ```

#### Testing:
- Test with correct credentials - should pass
- Test with incorrect credentials - should fail
- Use timing attack tools to verify constant-time comparison

---

### 🔴 Issue #4: Missing Security Headers

**Severity**: Critical
**Files**: `middleware.ts`
**Risk**: XSS, clickjacking, MIME-sniffing attacks
**Effort**: 1 hour

#### Step-by-Step Fix:

1. **Add security headers function** (`lib/security-headers.ts`):
   ```typescript
   import { NextResponse } from "next/server";

   export function addSecurityHeaders(response: NextResponse): NextResponse {
     // Content Security Policy
     const csp = [
       "default-src 'self'",
       "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust based on your needs
       "style-src 'self' 'unsafe-inline'",
       "img-src 'self' data: https:",
       "font-src 'self' data:",
       "connect-src 'self' https://api.neon.tech https://*.supabase.co",
       "frame-ancestors 'none'",
       "base-uri 'self'",
       "form-action 'self'",
     ].join("; ");

     response.headers.set("Content-Security-Policy", csp);

     // Prevent clickjacking
     response.headers.set("X-Frame-Options", "DENY");

     // Prevent MIME-sniffing
     response.headers.set("X-Content-Type-Options", "nosniff");

     // Enable XSS protection
     response.headers.set("X-XSS-Protection", "1; mode=block");

     // Referrer policy
     response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

     // Permissions policy
     response.headers.set(
       "Permissions-Policy",
       "geolocation=(), microphone=(), camera=()"
     );

     // HSTS (HTTP Strict Transport Security)
     if (process.env.NODE_ENV === "production") {
       response.headers.set(
         "Strict-Transport-Security",
         "max-age=31536000; includeSubDomains; preload"
       );
     }

     return response;
   }
   ```

2. **Update middleware.ts to apply headers**:
   ```typescript
   import { addSecurityHeaders } from "@/lib/security-headers";

   export function middleware(request: NextRequest) {
     // ... existing auth logic ...

     // For successful requests, add security headers
     const response = NextResponse.next();
     return addSecurityHeaders(response);
   }

   // Also add headers to unauthorized responses:
   const unauthorizedResponse = new NextResponse("Unauthorized", {
     status: 401,
     headers: {
       "WWW-Authenticate": 'Basic realm="Dashboard"',
     },
   });
   addSecurityHeaders(unauthorizedResponse);
   ```

3. **Add to next.config.mjs** (alternative approach):
   ```javascript
   const nextConfig = {
     reactStrictMode: true,
     swcMinify: true,

     async headers() {
       return [
         {
           source: "/:path*",
           headers: [
             {
               key: "X-Frame-Options",
               value: "DENY",
             },
             {
               key: "X-Content-Type-Options",
               value: "nosniff",
             },
             {
               key: "X-XSS-Protection",
               value: "1; mode=block",
             },
             {
               key: "Referrer-Policy",
               value: "strict-origin-when-cross-origin",
             },
             {
               key: "Permissions-Policy",
               value: "geolocation=(), microphone=(), camera=()",
             },
           ],
         },
       ];
     },
   };
   ```

4. **Create CSP configuration file** (`lib/csp-config.ts`):
   ```typescript
   export const CSP_DIRECTIVES = {
     development: {
       "default-src": ["'self'"],
       "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
       "style-src": ["'self'", "'unsafe-inline'"],
       "img-src": ["'self'", "data:", "https:", "blob:"],
       "font-src": ["'self'", "data:"],
       "connect-src": [
         "'self'",
         "https://api.neon.tech",
         "https://*.supabase.co",
         "ws://localhost:*", // For Next.js dev server
       ],
       "frame-ancestors": ["'none'"],
       "base-uri": ["'self'"],
       "form-action": ["'self'"],
     },
     production: {
       "default-src": ["'self'"],
       "script-src": ["'self'"],
       "style-src": ["'self'"],
       "img-src": ["'self'", "data:", "https:"],
       "font-src": ["'self'"],
       "connect-src": [
         "'self'",
         "https://api.neon.tech",
         "https://*.supabase.co",
       ],
       "frame-ancestors": ["'none'"],
       "base-uri": ["'self'"],
       "form-action": ["'self'"],
       "upgrade-insecure-requests": [],
     },
   };

   export function buildCSP(env: "development" | "production"): string {
     const directives = CSP_DIRECTIVES[env];
     return Object.entries(directives)
       .map(([key, values]) =>
         values.length > 0 ? `${key} ${values.join(" ")}` : key
       )
       .join("; ");
   }
   ```

#### Testing:
- Use https://securityheaders.com/ to verify headers
- Check browser console for CSP violations
- Test that app still works with CSP enabled
- Verify no clickjacking with iframe test

---

## Phase 2: High Severity Issues (Should Fix ASAP)

### 🟠 Issue #5: SQL Injection Risk in Join Requests API

**Severity**: High
**Files**: `app/api/events/[eventId]/join-requests/route.ts:156-159`
**Risk**: SQL injection could allow unauthorized data access
**Effort**: 1-2 hours

#### Current Code (Lines 156-159):
```typescript
const url = new URL(request.url);
const statusFilter = url.searchParams.get("status");

let query = `
  SELECT * FROM event_join_requests
  WHERE event_id = $1
  ${statusFilter ? `AND status = '${statusFilter}'` : ""}  // ❌ SQL Injection
  ORDER BY created_at DESC
`;
```

#### Step-by-Step Fix:

1. **Use parameterized query**:
   ```typescript
   const url = new URL(request.url);
   const statusFilter = url.searchParams.get("status");

   // Build query with parameters
   const params: any[] = [eventId];
   let paramIndex = 2;

   let query = `
     SELECT * FROM event_join_requests
     WHERE event_id = $1
   `;

   if (statusFilter) {
     query += ` AND status = $${paramIndex}`;
     params.push(statusFilter);
     paramIndex++;
   }

   query += ` ORDER BY created_at DESC`;

   const result = await db.query(query, params);
   ```

2. **Add status validation** (create `lib/validators.ts`):
   ```typescript
   export const VALID_JOIN_REQUEST_STATUSES = [
     "PENDING",
     "APPROVED",
     "REJECTED",
     "CANCELLED",
   ] as const;

   export type JoinRequestStatus = typeof VALID_JOIN_REQUEST_STATUSES[number];

   export function isValidStatus(status: string): status is JoinRequestStatus {
     return VALID_JOIN_REQUEST_STATUSES.includes(status as any);
   }

   export function validateStatus(status: string | null): JoinRequestStatus | null {
     if (!status) return null;
     if (!isValidStatus(status)) {
       throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_JOIN_REQUEST_STATUSES.join(", ")}`);
     }
     return status;
   }
   ```

3. **Update route to use validation**:
   ```typescript
   import { validateStatus } from "@/lib/validators";

   export async function GET(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     try {
       const url = new URL(request.url);
       const statusFilter = url.searchParams.get("status");

       // Validate status before using in query
       const validatedStatus = validateStatus(statusFilter);

       const queryParams: any[] = [eventId];
       let paramIndex = 2;

       let query = `
         SELECT * FROM event_join_requests
         WHERE event_id = $1
       `;

       if (validatedStatus) {
         query += ` AND status = $${paramIndex}`;
         queryParams.push(validatedStatus);
         paramIndex++;
       }

       query += ` ORDER BY created_at DESC`;

       const result = await db.query(query, queryParams);

       return NextResponse.json(result.rows);
     } catch (error) {
       if (error instanceof Error && error.message.includes("Invalid status")) {
         return NextResponse.json(
           { error: error.message },
           { status: 400 }
         );
       }
       throw error;
     }
   }
   ```

4. **Apply same fix to other dynamic queries**:
   - Check all other SQL queries in the codebase
   - Ensure all user inputs are parameterized
   - Add validation for all enum-like values

#### Testing:
- Test with valid status values - should work
- Test with SQL injection attempts: `?status=PENDING' OR '1'='1`
- Verify validation catches invalid statuses
- Run automated SQL injection tests

---

### 🟠 Issue #6: No Input Validation on Public Endpoints

**Severity**: High
**Files**: All `/api/events/[eventId]/join-requests/*` endpoints
**Risk**: Invalid data can cause crashes, XSS, or data corruption
**Effort**: 3-4 hours

#### Step-by-Step Fix:

1. **Install validation library**:
   ```bash
   npm install zod
   ```

2. **Create validation schemas** (`lib/schemas/join-request.ts`):
   ```typescript
   import { z } from "zod";

   export const joinRequestSchema = z.object({
     first_name: z.string()
       .min(1, "First name is required")
       .max(100, "First name too long")
       .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters"),

     last_name: z.string()
       .min(1, "Last name is required")
       .max(100, "Last name too long")
       .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters"),

     email: z.string()
       .email("Invalid email address")
       .max(255, "Email too long")
       .toLowerCase()
       .trim(),

     phone: z.string()
       .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number")
       .min(10, "Phone number too short")
       .max(20, "Phone number too long")
       .optional()
       .nullable(),

     company: z.string()
       .max(200, "Company name too long")
       .optional()
       .nullable(),

     title: z.string()
       .max(200, "Title too long")
       .optional()
       .nullable(),

     plus_ones: z.number()
       .int("Plus ones must be an integer")
       .min(0, "Plus ones cannot be negative")
       .max(10, "Too many plus ones")
       .optional()
       .default(0),

     comments: z.string()
       .max(1000, "Comments too long")
       .optional()
       .nullable(),

     wants_visibility: z.boolean().optional().default(true),
     wants_notifications: z.boolean().optional().default(true),
   });

   export type JoinRequestInput = z.infer<typeof joinRequestSchema>;

   export const joinRequestUpdateSchema = z.object({
     status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]),
     plus_ones: z.number().int().min(0).max(10).optional(),
     comments: z.string().max(1000).optional().nullable(),
   });

   export type JoinRequestUpdate = z.infer<typeof joinRequestUpdateSchema>;
   ```

3. **Create event validation schemas** (`lib/schemas/event.ts`):
   ```typescript
   import { z } from "zod";

   export const eventSchema = z.object({
     title: z.string()
       .min(1, "Title is required")
       .max(200, "Title too long"),

     description: z.string()
       .max(5000, "Description too long")
       .optional()
       .nullable(),

     location: z.object({
       venue_name: z.string().max(200).optional(),
       address: z.string().max(500).optional(),
       city: z.string().max(100).optional(),
       state: z.string().max(100).optional(),
       country: z.string().max(100).optional(),
       coordinates: z.object({
         lat: z.number().min(-90).max(90),
         lng: z.number().min(-180).max(180),
       }).optional(),
     }).optional().nullable(),

     start_time: z.string()
       .datetime({ message: "Invalid start time format" }),

     end_time: z.string()
       .datetime({ message: "Invalid end time format" })
       .optional()
       .nullable(),

     timezone: z.string()
       .max(100, "Timezone too long")
       .regex(/^[A-Za-z_\/]+$/, "Invalid timezone format"),

     max_attendees: z.number()
       .int()
       .min(1, "Must allow at least 1 attendee")
       .max(10000, "Max attendees too high")
       .optional()
       .nullable(),

     approval_mode: z.enum(["AUTOMATIC", "MANUAL"])
       .optional()
       .default("MANUAL"),

     status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"])
       .optional()
       .default("PUBLISHED"),

     image_url: z.string()
       .url("Invalid image URL")
       .max(1000, "Image URL too long")
       .optional()
       .nullable(),
   });

   export type EventInput = z.infer<typeof eventSchema>;
   ```

4. **Create validation middleware helper** (`lib/validate-request.ts`):
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { z } from "zod";

   export async function validateRequest<T>(
     request: NextRequest,
     schema: z.ZodSchema<T>
   ): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
     try {
       const body = await request.json();
       const data = schema.parse(body);
       return { data, error: null };
     } catch (error) {
       if (error instanceof z.ZodError) {
         return {
           data: null,
           error: NextResponse.json(
             {
               error: "Validation failed",
               details: error.errors.map(err => ({
                 field: err.path.join("."),
                 message: err.message,
               })),
             },
             { status: 400 }
           ),
         };
       }

       return {
         data: null,
         error: NextResponse.json(
           { error: "Invalid request body" },
           { status: 400 }
         ),
       };
     }
   }
   ```

5. **Update join request route** (`app/api/events/[eventId]/join-requests/route.ts`):
   ```typescript
   import { validateRequest } from "@/lib/validate-request";
   import { joinRequestSchema } from "@/lib/schemas/join-request";

   export async function POST(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     // Validate request body
     const { data, error } = await validateRequest(request, joinRequestSchema);
     if (error) return error;

     // Now 'data' is fully validated and typed
     const {
       first_name,
       last_name,
       email,
       phone,
       company,
       title,
       plus_ones,
       comments,
       wants_visibility,
       wants_notifications,
     } = data;

     // ... rest of the logic
   }
   ```

6. **Add sanitization helper** (`lib/sanitize.ts`):
   ```typescript
   /**
    * Sanitize string to prevent XSS
    * Note: This is a basic sanitizer. For production, consider using a library like DOMPurify
    */
   export function sanitizeString(input: string | null | undefined): string | null {
     if (!input) return null;

     return input
       .trim()
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#x27;")
       .replace(/\//g, "&#x2F;");
   }

   /**
    * Sanitize HTML to allow only safe tags
    */
   export function sanitizeHTML(input: string | null | undefined): string | null {
     if (!input) return null;

     // For production, use a proper library like isomorphic-dompurify
     // This is a very basic implementation
     const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];

     // Strip all tags except allowed ones
     return input.replace(/<[^>]*>/g, (match) => {
       const tag = match.match(/<\/?(\w+)/)?.[1]?.toLowerCase();
       return allowedTags.includes(tag || '') ? match : '';
     });
   }
   ```

#### Testing:
- Test with valid data - should succeed
- Test with invalid data - should get 400 with details
- Test with XSS payloads - should be sanitized
- Test with SQL injection attempts - should be rejected
- Test with very long strings - should be rejected

---

### 🟠 Issue #7: Environment Variables Not Validated

**Severity**: High
**Files**: `lib/db.ts`, `lib/supabaseAdmin.ts`
**Risk**: Runtime crashes instead of startup failures
**Effort**: 1 hour

#### Step-by-Step Fix:

1. **Create environment validation** (`lib/env.ts`):
   ```typescript
   import { z } from "zod";

   // Define all environment variables
   const envSchema = z.object({
     // App configuration
     NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
     NEXT_PUBLIC_APP_MODE: z.enum(["dashboard", "entry"]).default("entry"),

     // Database (conditionally required based on mode)
     DATABASE_URL: z.string().url().optional(),

     // Supabase (conditionally required based on mode)
     NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
     NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
     SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

     // Azure Storage
     AZURE_STORAGE_ACCOUNT_NAME: z.string().min(1),
     AZURE_STORAGE_ACCOUNT_KEY: z.string().min(1),
     AZURE_STORAGE_CONTAINER_NAME: z.string().min(1),

     // Dashboard auth
     DASHBOARD_AUTH_USER: z.string().min(1).optional(),
     DASHBOARD_AUTH_PASS: z.string().min(8, "Password must be at least 8 characters").optional(),

     // Rate limiting (optional, falls back to memory-based)
     UPSTASH_REDIS_REST_URL: z.string().url().optional(),
     UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
   });

   // Conditional validation based on app mode
   function validateEnv() {
     const rawEnv = {
       NODE_ENV: process.env.NODE_ENV,
       NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
       DATABASE_URL: process.env.DATABASE_URL,
       NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
       NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
       SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
       AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME,
       AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
       AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
       DASHBOARD_AUTH_USER: process.env.DASHBOARD_AUTH_USER,
       DASHBOARD_AUTH_PASS: process.env.DASHBOARD_AUTH_PASS,
       UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
       UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
     };

     // Parse base schema
     const parsed = envSchema.safeParse(rawEnv);

     if (!parsed.success) {
       console.error("❌ Environment validation failed:");
       console.error(parsed.error.format());
       throw new Error("Invalid environment variables");
     }

     const env = parsed.data;

     // Additional validation based on app mode
     if (env.NEXT_PUBLIC_APP_MODE === "dashboard") {
       if (!env.DATABASE_URL) {
         throw new Error("DATABASE_URL is required in dashboard mode");
       }
       if (!env.DASHBOARD_AUTH_USER || !env.DASHBOARD_AUTH_PASS) {
         throw new Error("Dashboard auth credentials are required in dashboard mode");
       }
     } else {
       // Entry mode
       if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
         throw new Error("Supabase credentials are required in entry mode");
       }
     }

     return env;
   }

   // Validate and export
   export const env = validateEnv();

   // Type-safe access to environment variables
   export type Env = z.infer<typeof envSchema>;
   ```

2. **Update lib/db.ts**:
   ```typescript
   import { neon } from "@neondatabase/serverless";
   import { env } from "./env";

   let db: ReturnType<typeof neon> | null = null;

   export function getDb() {
     if (env.NEXT_PUBLIC_APP_MODE !== "dashboard") {
       throw new Error("Database is only available in dashboard mode");
     }

     if (!env.DATABASE_URL) {
       throw new Error("DATABASE_URL is not configured");
     }

     if (!db) {
       db = neon(env.DATABASE_URL);
     }

     return db;
   }
   ```

3. **Update lib/supabaseAdmin.ts**:
   ```typescript
   import { createClient, SupabaseClient } from "@supabase/supabase-js";
   import { env } from "./env";

   let supabaseAdmin: SupabaseClient | null = null;

   export function getSupabaseAdmin() {
     if (env.NEXT_PUBLIC_APP_MODE !== "entry") {
       throw new Error("Supabase is only available in entry mode");
     }

     if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Supabase credentials are not configured");
     }

     if (!supabaseAdmin) {
       supabaseAdmin = createClient(
         env.NEXT_PUBLIC_SUPABASE_URL,
         env.SUPABASE_SERVICE_ROLE_KEY,
         {
           auth: {
             autoRefreshToken: false,
             persistSession: false,
           },
         }
       );
     }

     return supabaseAdmin;
   }
   ```

4. **Create startup validation script** (`scripts/validate-env.ts`):
   ```typescript
   #!/usr/bin/env node
   import { env } from "../lib/env";

   console.log("✅ Environment validation passed");
   console.log("📋 Configuration:");
   console.log(`  - Mode: ${env.NEXT_PUBLIC_APP_MODE}`);
   console.log(`  - Node Env: ${env.NODE_ENV}`);

   if (env.NEXT_PUBLIC_APP_MODE === "dashboard") {
     console.log("  - Database: Neon (connected)");
     console.log("  - Auth: HTTP Basic Auth (enabled)");
   } else {
     console.log("  - Database: Supabase (connected)");
     console.log("  - Auth: None (public mode)");
   }

   process.exit(0);
   ```

5. **Update package.json**:
   ```json
   {
     "scripts": {
       "dev": "npm run validate:env && next dev",
       "build": "npm run validate:env && next build",
       "start": "next start",
       "lint": "next lint",
       "validate:env": "tsx scripts/validate-env.ts"
     }
   }
   ```

6. **Add tsx for running TypeScript scripts**:
   ```bash
   npm install -D tsx
   ```

#### Testing:
- Run with valid env vars - should start normally
- Remove required env var - should fail at startup with clear message
- Test both dashboard and entry modes
- Verify error messages are helpful

---

### 🟠 Issue #8: Azure SAS Tokens Exposed in Responses

**Severity**: High
**Files**: `app/api/uploads/event-image/route.ts:42`
**Risk**: SAS tokens can be reused for unauthorized uploads
**Effort**: 2 hours

#### Current Issue:
SAS tokens are exposed in the response and can be reused within their validity period.

#### Step-by-Step Fix:

1. **Use short-lived SAS tokens**:
   ```typescript
   // In app/api/uploads/event-image/route.ts

   import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";

   function generateShortLivedSAS(
     blobName: string,
     expiryMinutes: number = 5
   ): string {
     const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
     const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
     const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

     const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

     const sasOptions = {
       containerName,
       blobName,
       permissions: BlobSASPermissions.parse("w"), // Write only
       startsOn: new Date(),
       expiresOn: new Date(new Date().valueOf() + expiryMinutes * 60 * 1000),
     };

     const sasToken = generateBlobSASQueryParameters(
       sasOptions,
       sharedKeyCredential
     ).toString();

     return sasToken;
   }
   ```

2. **Alternative: Use signed URLs with metadata validation**:
   ```typescript
   // lib/azure-storage.ts
   import { BlobServiceClient } from "@azure/storage-blob";
   import crypto from "crypto";

   const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
   const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
   const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

   const blobServiceClient = BlobServiceClient.fromConnectionString(
     `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
   );

   export interface UploadMetadata {
     userId?: string;
     eventId?: string;
     uploadedAt: string;
     ipAddress?: string;
   }

   export async function uploadBlob(
     file: File,
     metadata: UploadMetadata
   ): Promise<string> {
     const containerClient = blobServiceClient.getContainerClient(containerName);

     // Generate unique blob name
     const timestamp = Date.now();
     const randomString = crypto.randomBytes(8).toString("hex");
     const extension = file.name.split(".").pop();
     const blobName = `events/${timestamp}-${randomString}.${extension}`;

     const blockBlobClient = containerClient.getBlockBlobClient(blobName);

     // Upload with metadata
     const buffer = await file.arrayBuffer();
     await blockBlobClient.upload(buffer, buffer.byteLength, {
       metadata: {
         ...metadata,
         originalName: file.name,
         contentType: file.type,
       },
     });

     // Return public URL (without SAS token)
     return blockBlobClient.url;
   }

   export async function generateDownloadUrl(
     blobName: string,
     expiryMinutes: number = 60
   ): Promise<string> {
     const containerClient = blobServiceClient.getContainerClient(containerName);
     const blockBlobClient = containerClient.getBlockBlobClient(blobName);

     const sasUrl = await blockBlobClient.generateSasUrl({
       permissions: BlobSASPermissions.parse("r"), // Read only
       startsOn: new Date(),
       expiresOn: new Date(new Date().valueOf() + expiryMinutes * 60 * 1000),
     });

     return sasUrl;
   }
   ```

3. **Update upload route to handle upload server-side**:
   ```typescript
   // app/api/uploads/event-image/route.ts
   import { NextRequest, NextResponse } from "next/server";
   import { uploadBlob } from "@/lib/azure-storage";
   import { withRateLimit } from "@/lib/withRateLimit";
   import { uploadRateLimit } from "@/lib/ratelimit";

   export async function POST(request: NextRequest) {
     try {
       // Apply rate limiting
       const rateLimitError = await withRateLimit(request, uploadRateLimit);
       if (rateLimitError) return rateLimitError;

       // Get form data
       const formData = await request.formData();
       const file = formData.get("file") as File;

       if (!file) {
         return NextResponse.json(
           { error: "No file provided" },
           { status: 400 }
         );
       }

       // Validate file type
       const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
       if (!allowedTypes.includes(file.type)) {
         return NextResponse.json(
           { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
           { status: 400 }
         );
       }

       // Validate file size (max 5MB)
       const maxSize = 5 * 1024 * 1024;
       if (file.size > maxSize) {
         return NextResponse.json(
           { error: "File too large. Maximum size is 5MB." },
           { status: 400 }
         );
       }

       // Upload to Azure
       const metadata = {
         uploadedAt: new Date().toISOString(),
         ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
       };

       const url = await uploadBlob(file, metadata);

       return NextResponse.json({ url });
     } catch (error) {
       console.error("Upload error:", error);
       return NextResponse.json(
         { error: "Failed to upload file" },
         { status: 500 }
       );
     }
   }
   ```

4. **Add file type validation helper** (`lib/file-validation.ts`):
   ```typescript
   export const ALLOWED_IMAGE_TYPES = [
     "image/jpeg",
     "image/png",
     "image/webp",
     "image/gif",
   ] as const;

   export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

   export interface FileValidationResult {
     valid: boolean;
     error?: string;
   }

   export function validateImageFile(file: File): FileValidationResult {
     // Check if file exists
     if (!file || !(file instanceof File)) {
       return { valid: false, error: "No file provided" };
     }

     // Check file type
     if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
       return {
         valid: false,
         error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
       };
     }

     // Check file size
     if (file.size > MAX_IMAGE_SIZE) {
       return {
         valid: false,
         error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
       };
     }

     // Check file name
     if (file.name.length > 255) {
       return { valid: false, error: "File name too long" };
     }

     return { valid: true };
   }
   ```

#### Testing:
- Upload valid image - should succeed
- Try to upload invalid file type - should fail
- Try to upload too large file - should fail
- Verify SAS token is not exposed in response
- Test that uploaded files are accessible

---

### 🟠 Issue #9: Error Messages Expose Implementation Details

**Severity**: High
**Files**: Multiple API routes
**Risk**: Information leakage can aid attackers
**Effort**: 2 hours

#### Step-by-Step Fix:

1. **Create error handling utility** (`lib/errors.ts`):
   ```typescript
   export class AppError extends Error {
     constructor(
       public statusCode: number,
       public message: string,
       public code?: string,
       public details?: any
     ) {
       super(message);
       this.name = "AppError";
     }
   }

   export class ValidationError extends AppError {
     constructor(message: string, details?: any) {
       super(400, message, "VALIDATION_ERROR", details);
       this.name = "ValidationError";
     }
   }

   export class UnauthorizedError extends AppError {
     constructor(message: string = "Unauthorized") {
       super(401, message, "UNAUTHORIZED");
       this.name = "UnauthorizedError";
     }
   }

   export class ForbiddenError extends AppError {
     constructor(message: string = "Forbidden") {
       super(403, message, "FORBIDDEN");
       this.name = "ForbiddenError";
     }
   }

   export class NotFoundError extends AppError {
     constructor(resource: string = "Resource") {
       super(404, `${resource} not found`, "NOT_FOUND");
       this.name = "NotFoundError";
     }
   }

   export class ConflictError extends AppError {
     constructor(message: string) {
       super(409, message, "CONFLICT");
       this.name = "ConflictError";
     }
   }

   export class RateLimitError extends AppError {
     constructor(retryAfter?: number) {
       super(429, "Too many requests", "RATE_LIMIT_EXCEEDED", { retryAfter });
       this.name = "RateLimitError";
     }
   }

   export class InternalServerError extends AppError {
     constructor(message: string = "Internal server error") {
       super(500, message, "INTERNAL_ERROR");
       this.name = "InternalServerError";
     }
   }

   // Error logger
   export function logError(error: Error, context?: Record<string, any>) {
     const isDevelopment = process.env.NODE_ENV === "development";

     if (isDevelopment) {
       console.error("Error occurred:", {
         name: error.name,
         message: error.message,
         stack: error.stack,
         context,
       });
     } else {
       // In production, log to external service (e.g., Sentry, DataDog)
       console.error("Error:", error.message, context);

       // TODO: Send to error tracking service
       // Sentry.captureException(error, { extra: context });
     }
   }

   // Generic error response builder
   export function buildErrorResponse(error: unknown) {
     const isDevelopment = process.env.NODE_ENV === "development";

     if (error instanceof AppError) {
       const response: any = {
         error: error.message,
         code: error.code,
       };

       // Include details only in development or for validation errors
       if (isDevelopment || error instanceof ValidationError) {
         response.details = error.details;
       }

       return Response.json(response, { status: error.statusCode });
     }

     // Unknown error - don't expose details
     logError(error as Error);

     return Response.json(
       {
         error: "An unexpected error occurred",
         code: "INTERNAL_ERROR",
         ...(isDevelopment && { details: (error as Error).message }),
       },
       { status: 500 }
     );
   }
   ```

2. **Create error handling wrapper** (`lib/with-error-handling.ts`):
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { buildErrorResponse, logError } from "./errors";

   type RouteHandler = (
     request: NextRequest,
     context: any
   ) => Promise<NextResponse> | NextResponse;

   export function withErrorHandling(handler: RouteHandler): RouteHandler {
     return async (request: NextRequest, context: any) => {
       try {
         return await handler(request, context);
       } catch (error) {
         logError(error as Error, {
           method: request.method,
           url: request.url,
           params: context?.params,
         });

         return buildErrorResponse(error);
       }
     };
   }
   ```

3. **Update API routes to use error handling**:
   ```typescript
   // app/api/events/[eventId]/join-requests/route.ts
   import { withErrorHandling } from "@/lib/with-error-handling";
   import { ValidationError, NotFoundError } from "@/lib/errors";

   async function postHandler(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     const { eventId } = params;

     // Validate request
     const { data, error } = await validateRequest(request, joinRequestSchema);
     if (error) {
       throw new ValidationError("Invalid request data", error);
     }

     // Check if event exists
     const event = await getEventById(eventId);
     if (!event) {
       throw new NotFoundError("Event");
     }

     // ... rest of logic

     return NextResponse.json(result, { status: 201 });
   }

   export const POST = withErrorHandling(postHandler);
   ```

4. **Update database error handling**:
   ```typescript
   // lib/db-error-handler.ts
   import { InternalServerError, ConflictError } from "./errors";

   export function handleDatabaseError(error: any): never {
     // PostgreSQL error codes
     if (error.code === "23505") {
       // Unique violation
       throw new ConflictError("Record already exists");
     }

     if (error.code === "23503") {
       // Foreign key violation
       throw new ConflictError("Referenced record not found");
     }

     if (error.code === "23502") {
       // Not null violation
       throw new ValidationError("Required field missing");
     }

     // Generic database error
     throw new InternalServerError("Database operation failed");
   }
   ```

5. **Add structured logging** (`lib/logger.ts`):
   ```typescript
   enum LogLevel {
     DEBUG = "debug",
     INFO = "info",
     WARN = "warn",
     ERROR = "error",
   }

   interface LogContext {
     [key: string]: any;
   }

   class Logger {
     private isDevelopment = process.env.NODE_ENV === "development";

     private log(level: LogLevel, message: string, context?: LogContext) {
       const timestamp = new Date().toISOString();
       const logEntry = {
         timestamp,
         level,
         message,
         ...context,
       };

       if (this.isDevelopment) {
         // Pretty print in development
         console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, context || "");
       } else {
         // JSON logs for production (easier to parse)
         console.log(JSON.stringify(logEntry));
       }
     }

     debug(message: string, context?: LogContext) {
       if (this.isDevelopment) {
         this.log(LogLevel.DEBUG, message, context);
       }
     }

     info(message: string, context?: LogContext) {
       this.log(LogLevel.INFO, message, context);
     }

     warn(message: string, context?: LogContext) {
       this.log(LogLevel.WARN, message, context);
     }

     error(message: string, error?: Error, context?: LogContext) {
       this.log(LogLevel.ERROR, message, {
         ...context,
         error: {
           name: error?.name,
           message: error?.message,
           stack: this.isDevelopment ? error?.stack : undefined,
         },
       });
     }
   }

   export const logger = new Logger();
   ```

#### Testing:
- Trigger various errors - verify generic messages to users
- Check logs - verify detailed information is logged
- Test in development vs production - verify different behavior
- Verify no stack traces or DB details exposed to users

---

### 🟠 Issue #10: No CORS Configuration

**Severity**: High
**Files**: All API routes
**Risk**: Mobile app requests may fail due to CORS
**Effort**: 1 hour

#### Step-by-Step Fix:

1. **Create CORS utility** (`lib/cors.ts`):
   ```typescript
   import { NextRequest, NextResponse } from "next/server";

   const ALLOWED_ORIGINS = [
     process.env.NEXT_PUBLIC_APP_URL,
     "http://localhost:3000",
     "http://localhost:3001",
     // Add production origins
     "https://moots.app",
     "https://www.moots.app",
   ].filter(Boolean) as string[];

   const ALLOWED_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];
   const ALLOWED_HEADERS = [
     "Content-Type",
     "Authorization",
     "X-Requested-With",
     "Accept",
   ];
   const MAX_AGE = 86400; // 24 hours

   export function isOriginAllowed(origin: string | null): boolean {
     if (!origin) return true; // Same-origin requests

     // Check exact matches
     if (ALLOWED_ORIGINS.includes(origin)) return true;

     // In development, allow localhost with any port
     if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost:")) {
       return true;
     }

     return false;
   }

   export function addCorsHeaders(
     response: NextResponse,
     origin: string | null
   ): NextResponse {
     if (isOriginAllowed(origin)) {
       response.headers.set("Access-Control-Allow-Origin", origin || "*");
       response.headers.set("Access-Control-Allow-Credentials", "true");
     }

     response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS.join(", "));
     response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
     response.headers.set("Access-Control-Max-Age", MAX_AGE.toString());

     return response;
   }

   export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
     const origin = request.headers.get("origin");

     if (!isOriginAllowed(origin)) {
       return new NextResponse(null, { status: 403 });
     }

     const response = new NextResponse(null, { status: 204 });
     return addCorsHeaders(response, origin);
   }

   export function withCors(handler: Function) {
     return async (request: NextRequest, context: any) => {
       const origin = request.headers.get("origin");

       // Handle preflight requests
       if (request.method === "OPTIONS") {
         return handleCorsPreflightRequest(request);
       }

       // Execute handler
       const response = await handler(request, context);

       // Add CORS headers to response
       return addCorsHeaders(response, origin);
     };
   }
   ```

2. **Apply CORS to public API routes**:
   ```typescript
   // app/api/events/[eventId]/route.ts
   import { withCors } from "@/lib/cors";

   async function getHandler(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     // ... handler logic
   }

   export const GET = withCors(getHandler);
   export const OPTIONS = (request: NextRequest) =>
     handleCorsPreflightRequest(request);
   ```

3. **Update middleware for CORS** (`middleware.ts`):
   ```typescript
   import { isOriginAllowed, addCorsHeaders } from "@/lib/cors";

   export function middleware(request: NextRequest) {
     const origin = request.headers.get("origin");

     // Handle CORS preflight
     if (request.method === "OPTIONS") {
       if (isOriginAllowed(origin)) {
         const response = new NextResponse(null, { status: 204 });
         return addCorsHeaders(response, origin);
       }
       return new NextResponse(null, { status: 403 });
     }

     // ... existing auth logic ...

     // Add CORS headers to all responses
     const response = NextResponse.next();
     return addCorsHeaders(response, origin);
   }
   ```

4. **Add CORS configuration to .env**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://moots.app
   ALLOWED_ORIGINS=https://moots.app,https://www.moots.app,https://app.moots.com
   ```

#### Testing:
- Test from different origins
- Verify preflight requests work
- Check CORS headers in responses
- Test with mobile app

---

### 🟠 Issue #11: Weak Password Requirements (HTTP Basic Auth)

**Severity**: High
**Files**: Documentation, middleware validation
**Risk**: Weak passwords easier to brute force
**Effort**: 30 minutes

#### Step-by-Step Fix:

1. **Create password validation** (`lib/password-validation.ts`):
   ```typescript
   export interface PasswordRequirements {
     minLength: number;
     requireUppercase: boolean;
     requireLowercase: boolean;
     requireNumbers: boolean;
     requireSpecialChars: boolean;
   }

   export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
     minLength: 12,
     requireUppercase: true,
     requireLowercase: true,
     requireNumbers: true,
     requireSpecialChars: true,
   };

   export interface PasswordValidationResult {
     valid: boolean;
     errors: string[];
   }

   export function validatePassword(
     password: string,
     requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
   ): PasswordValidationResult {
     const errors: string[] = [];

     if (password.length < requirements.minLength) {
       errors.push(`Password must be at least ${requirements.minLength} characters`);
     }

     if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
       errors.push("Password must contain at least one uppercase letter");
     }

     if (requirements.requireLowercase && !/[a-z]/.test(password)) {
       errors.push("Password must contain at least one lowercase letter");
     }

     if (requirements.requireNumbers && !/\d/.test(password)) {
       errors.push("Password must contain at least one number");
     }

     if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
       errors.push("Password must contain at least one special character");
     }

     return {
       valid: errors.length === 0,
       errors,
     };
   }
   ```

2. **Create setup script** (`scripts/setup-dashboard-auth.ts`):
   ```typescript
   #!/usr/bin/env node
   import { validatePassword } from "../lib/password-validation";
   import * as readline from "readline";

   const rl = readline.createInterface({
     input: process.stdin,
     output: process.stdout,
   });

   function question(prompt: string): Promise<string> {
     return new Promise((resolve) => {
       rl.question(prompt, resolve);
     });
   }

   async function setup() {
     console.log("🔐 Dashboard Authentication Setup\n");

     const username = await question("Enter dashboard username: ");

     if (!username || username.length < 3) {
       console.error("❌ Username must be at least 3 characters");
       process.exit(1);
     }

     const password = await question("Enter dashboard password: ");

     const validation = validatePassword(password);
     if (!validation.valid) {
       console.error("\n❌ Password does not meet requirements:\n");
       validation.errors.forEach(error => console.error(`  - ${error}`));
       process.exit(1);
     }

     console.log("\n✅ Credentials validated successfully!\n");
     console.log("Add these to your .env.local file:\n");
     console.log(`DASHBOARD_AUTH_USER=${username}`);
     console.log(`DASHBOARD_AUTH_PASS=${password}`);
     console.log("\n⚠️  Keep these credentials secure and never commit them to git!");

     rl.close();
   }

   setup();
   ```

3. **Add to package.json**:
   ```json
   {
     "scripts": {
       "setup:auth": "tsx scripts/setup-dashboard-auth.ts"
     }
   }
   ```

4. **Create documentation** (`SECURITY.md`):
   ```markdown
   # Security Guidelines

   ## Dashboard Authentication

   ### Password Requirements

   Dashboard passwords must meet the following requirements:
   - Minimum 12 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (!@#$%^&*()_+-=[]{}; ':"\\|,.<>/?)

   ### Setup

   Run the setup script to create credentials:

   \`\`\`bash
   npm run setup:auth
   \`\`\`

   ### Best Practices

   1. **Use a password manager** to generate and store strong passwords
   2. **Rotate credentials** every 90 days
   3. **Never commit** credentials to version control
   4. **Use different passwords** for different environments
   5. **Enable 2FA** when available (future enhancement)

   ### Environment Variables

   Required environment variables:
   - `DASHBOARD_AUTH_USER`: Dashboard username (minimum 3 characters)
   - `DASHBOARD_AUTH_PASS`: Dashboard password (must meet requirements above)

   Example:
   \`\`\`bash
   DASHBOARD_AUTH_USER=admin
   DASHBOARD_AUTH_PASS=MySecureP@ssw0rd123!
   \`\`\`
   ```

#### Testing:
- Run setup script with weak password - should fail
- Run setup script with strong password - should succeed
- Document requirements in README

---

## Phase 3: Medium Severity Issues (Important for Long-Term Health)

### 🟡 Issue #12: Database Singleton Pattern Issues

**Severity**: Medium
**Files**: `lib/db.ts`
**Risk**: Connection leaks in serverless environment
**Effort**: 2 hours

#### Step-by-Step Fix:

1. **Update lib/db.ts with proper connection management**:
   ```typescript
   import { neon, NeonQueryFunction } from "@neondatabase/serverless";
   import { env } from "./env";

   // Connection configuration
   const CONNECTION_CONFIG = {
     fetchOptions: {
       cache: "no-store",
     },
     // Neon handles connection pooling automatically
     // No need for explicit pool management
   };

   let dbInstance: NeonQueryFunction<false, false> | null = null;

   /**
    * Get database connection
    * Note: Neon Serverless automatically handles connection pooling
    */
   export function getDb(): NeonQueryFunction<false, false> {
     if (env.NEXT_PUBLIC_APP_MODE !== "dashboard") {
       throw new Error("Database is only available in dashboard mode");
     }

     if (!env.DATABASE_URL) {
       throw new Error("DATABASE_URL is not configured");
     }

     // Create new instance if not exists
     if (!dbInstance) {
       dbInstance = neon(env.DATABASE_URL, CONNECTION_CONFIG);
     }

     return dbInstance;
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
       console.error("Database connection test failed:", error);
       return false;
     }
   }

   /**
    * Execute query with automatic error handling
    */
   export async function executeQuery<T = any>(
     queryFn: (db: NeonQueryFunction<false, false>) => Promise<T>
   ): Promise<T> {
     const db = getDb();

     try {
       return await queryFn(db);
     } catch (error) {
       // Log error with context
       console.error("Database query failed:", {
         error: error instanceof Error ? error.message : "Unknown error",
         timestamp: new Date().toISOString(),
       });
       throw error;
     }
   }
   ```

2. **Add connection health check endpoint** (`app/api/health/route.ts`):
   ```typescript
   import { NextResponse } from "next/server";
   import { testDbConnection } from "@/lib/db";
   import { env } from "@/lib/env";

   export async function GET() {
     const health = {
       status: "ok",
       timestamp: new Date().toISOString(),
       mode: env.NEXT_PUBLIC_APP_MODE,
       checks: {} as Record<string, string>,
     };

     // Test database connection
     if (env.NEXT_PUBLIC_APP_MODE === "dashboard") {
       try {
         const dbHealthy = await testDbConnection();
         health.checks.database = dbHealthy ? "ok" : "error";
         if (!dbHealthy) {
           health.status = "degraded";
         }
       } catch (error) {
         health.checks.database = "error";
         health.status = "degraded";
       }
     }

     const statusCode = health.status === "ok" ? 200 : 503;
     return NextResponse.json(health, { status: statusCode });
   }
   ```

3. **Add query timeout helper** (`lib/db-helpers.ts`):
   ```typescript
   import { getDb } from "./db";

   const DEFAULT_TIMEOUT = 10000; // 10 seconds

   /**
    * Execute query with timeout
    */
   export async function queryWithTimeout<T>(
     queryFn: (db: ReturnType<typeof getDb>) => Promise<T>,
     timeoutMs: number = DEFAULT_TIMEOUT
   ): Promise<T> {
     const db = getDb();

     return Promise.race([
       queryFn(db),
       new Promise<never>((_, reject) =>
         setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
       ),
     ]);
   }

   /**
    * Execute transaction with automatic rollback on error
    */
   export async function transaction<T>(
     callback: (db: ReturnType<typeof getDb>) => Promise<T>
   ): Promise<T> {
     const db = getDb();

     try {
       await db`BEGIN`;
       const result = await callback(db);
       await db`COMMIT`;
       return result;
     } catch (error) {
       await db`ROLLBACK`;
       throw error;
     }
   }
   ```

#### Testing:
- Run health check endpoint - should show DB status
- Test with multiple concurrent requests
- Monitor for connection leaks
- Test query timeout functionality

---

### 🟡 Issue #13: Missing Database Indexes

**Severity**: Medium
**Files**: Database schema
**Risk**: Slow queries as data grows
**Effort**: 1 hour

#### Step-by-Step Fix:

1. **Create migration for indexes** (`migrations/add_performance_indexes.sql`):
   ```sql
   -- Add indexes for frequently queried columns

   -- Event join requests indexes
   CREATE INDEX IF NOT EXISTS idx_join_requests_event_id
     ON event_join_requests(event_id);

   CREATE INDEX IF NOT EXISTS idx_join_requests_status
     ON event_join_requests(status);

   CREATE INDEX IF NOT EXISTS idx_join_requests_email
     ON event_join_requests(email);

   CREATE INDEX IF NOT EXISTS idx_join_requests_event_status
     ON event_join_requests(event_id, status);

   CREATE INDEX IF NOT EXISTS idx_join_requests_created_at
     ON event_join_requests(created_at DESC);

   -- Event attendees indexes
   CREATE INDEX IF NOT EXISTS idx_attendees_event_id
     ON event_attendees(event_id);

   CREATE INDEX IF NOT EXISTS idx_attendees_user_id
     ON event_attendees(user_id);

   CREATE INDEX IF NOT EXISTS idx_attendees_checked_in
     ON event_attendees(checked_in_at)
     WHERE checked_in_at IS NOT NULL;

   -- Events indexes
   CREATE INDEX IF NOT EXISTS idx_events_status
     ON events(status);

   CREATE INDEX IF NOT EXISTS idx_events_start_time
     ON events(start_time);

   CREATE INDEX IF NOT EXISTS idx_events_created_at
     ON events(created_at DESC);

   -- User profiles indexes
   CREATE INDEX IF NOT EXISTS idx_user_profiles_owner_id
     ON user_profiles(owner_id);

   -- Composite indexes for common queries
   CREATE INDEX IF NOT EXISTS idx_join_requests_event_email
     ON event_join_requests(event_id, email);

   CREATE INDEX IF NOT EXISTS idx_events_status_start_time
     ON events(status, start_time)
     WHERE status = 'PUBLISHED';

   -- Add index comments for documentation
   COMMENT ON INDEX idx_join_requests_event_id IS
     'Speed up queries filtering by event_id';
   COMMENT ON INDEX idx_join_requests_status IS
     'Speed up queries filtering by status';
   COMMENT ON INDEX idx_join_requests_event_status IS
     'Speed up queries filtering by event_id and status together';
   ```

2. **Create index analysis script** (`scripts/analyze-indexes.sql`):
   ```sql
   -- Show table sizes and index usage
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
     pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

   -- Show index usage statistics
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch,
     pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
   FROM pg_stat_user_indexes
   JOIN pg_index USING (indexrelid)
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;

   -- Find missing indexes (queries with sequential scans)
   SELECT
     schemaname,
     tablename,
     seq_scan,
     seq_tup_read,
     idx_scan,
     seq_tup_read / seq_scan AS avg_seq_tup_read
   FROM pg_stat_user_tables
   WHERE seq_scan > 0
     AND schemaname = 'public'
   ORDER BY seq_tup_read DESC;
   ```

3. **Update migration runner** (`scripts/run-migration-add-indexes.ts`):
   ```typescript
   import { readFileSync } from "fs";
   import { getDb } from "../lib/db";

   async function runMigration() {
     const db = getDb();

     console.log("🔄 Running index migration...");

     try {
       const migration = readFileSync(
         "./migrations/add_performance_indexes.sql",
         "utf-8"
       );

       // Execute migration
       await db(migration);

       console.log("✅ Indexes created successfully");

       // Analyze tables to update statistics
       console.log("🔄 Analyzing tables...");
       await db`ANALYZE event_join_requests`;
       await db`ANALYZE events`;
       await db`ANALYZE event_attendees`;
       await db`ANALYZE user_profiles`;

       console.log("✅ Analysis complete");
     } catch (error) {
       console.error("❌ Migration failed:", error);
       process.exit(1);
     }
   }

   runMigration();
   ```

4. **Add to package.json**:
   ```json
   {
     "scripts": {
       "db:indexes": "tsx scripts/run-migration-add-indexes.ts",
       "db:analyze": "psql $DATABASE_URL -f scripts/analyze-indexes.sql"
     }
   }
   ```

#### Testing:
- Run EXPLAIN ANALYZE on common queries before/after
- Monitor query performance in production
- Check index usage statistics

---

### 🟡 Issue #14: No Request Timeout Configuration

**Severity**: Medium
**Files**: API routes, database queries
**Risk**: Long-running requests can hang indefinitely
**Effort**: 1-2 hours

#### Step-by-Step Fix:

1. **Add timeout configuration** (`lib/timeouts.ts`):
   ```typescript
   export const TIMEOUTS = {
     // API request timeouts
     api: {
       default: 30000, // 30 seconds
       upload: 60000, // 1 minute for uploads
       query: 10000, // 10 seconds for database queries
       external: 15000, // 15 seconds for external API calls
     },

     // Database timeouts
     database: {
       query: 10000, // 10 seconds
       transaction: 30000, // 30 seconds
       connection: 5000, // 5 seconds
     },
   } as const;

   /**
    * Execute function with timeout
    */
   export async function withTimeout<T>(
     promise: Promise<T>,
     timeoutMs: number,
     timeoutError: string = "Operation timed out"
   ): Promise<T> {
     const timeoutPromise = new Promise<never>((_, reject) => {
       setTimeout(() => reject(new Error(timeoutError)), timeoutMs);
     });

     return Promise.race([promise, timeoutPromise]);
   }

   /**
    * Create timeout AbortController
    */
   export function createTimeoutSignal(timeoutMs: number): AbortSignal {
     const controller = new AbortController();
     setTimeout(() => controller.abort(), timeoutMs);
     return controller.signal;
   }
   ```

2. **Update database query helper** (`lib/db-helpers.ts`):
   ```typescript
   import { withTimeout, TIMEOUTS } from "./timeouts";
   import { getDb } from "./db";

   export async function queryWithTimeout<T>(
     queryFn: (db: ReturnType<typeof getDb>) => Promise<T>,
     timeoutMs: number = TIMEOUTS.database.query
   ): Promise<T> {
     const db = getDb();

     return withTimeout(
       queryFn(db),
       timeoutMs,
       `Database query exceeded ${timeoutMs}ms timeout`
     );
   }
   ```

3. **Update API route example** (`app/api/events/[eventId]/route.ts`):
   ```typescript
   import { withTimeout, TIMEOUTS } from "@/lib/timeouts";
   import { queryWithTimeout } from "@/lib/db-helpers";

   export async function GET(
     request: NextRequest,
     { params }: { params: { eventId: string } }
   ) {
     try {
       const event = await queryWithTimeout(
         async (db) => {
           const result = await db`
             SELECT * FROM events WHERE id = ${params.eventId}
           `;
           return result[0];
         },
         TIMEOUTS.database.query
       );

       if (!event) {
         return NextResponse.json(
           { error: "Event not found" },
           { status: 404 }
         );
       }

       return NextResponse.json(event);
     } catch (error) {
       if (error instanceof Error && error.message.includes("timeout")) {
         return NextResponse.json(
           { error: "Request timeout" },
           { status: 504 }
         );
       }
       throw error;
     }
   }
   ```

4. **Add Next.js API timeout configuration** (`next.config.mjs`):
   ```javascript
   const nextConfig = {
     reactStrictMode: true,
     swcMinify: true,

     // API route timeout (in seconds)
     experimental: {
       // Set API timeout to 30 seconds
       api: {
         bodyParser: {
           sizeLimit: '10mb',
         },
         responseLimit: '10mb',
       },
     },
   };

   export default nextConfig;
   ```

5. **Add external API timeout helper** (`lib/fetch-with-timeout.ts`):
   ```typescript
   import { createTimeoutSignal, TIMEOUTS } from "./timeouts";

   export async function fetchWithTimeout(
     url: string,
     options: RequestInit = {},
     timeoutMs: number = TIMEOUTS.api.external
   ): Promise<Response> {
     const signal = createTimeoutSignal(timeoutMs);

     return fetch(url, {
       ...options,
       signal: options.signal || signal,
     });
   }
   ```

#### Testing:
- Test with slow queries - should timeout
- Test with normal queries - should succeed
- Verify timeout errors are handled gracefully
- Check logs for timeout events

---

### 🟡 Issue #15-20: Additional Medium Priority Fixes

Due to length constraints, I'll provide abbreviated fixes for the remaining medium priority issues:

#### Issue #15: Hardcoded Port in Scripts
**Fix**: Use `${PORT:-3000}` in test scripts and read from environment

#### Issue #16: No Error Boundaries in React Components
**Fix**: Add ErrorBoundary components at app layout level

#### Issue #17: Console.log Statements in Production Code
**Fix**: Replace with proper logger, add ESLint rule to prevent

#### Issue #18: Missing TypeScript Strict Mode
**Fix**: Enable in tsconfig.json, fix resulting errors

#### Issue #19: Duplicate Datetime Logic
**Fix**: Consider using `date-fns` or document rationale for custom implementation

#### Issue #20: No Health Check Endpoint
**Fix**: Already created in Issue #12 (app/api/health/route.ts)

---

## Phase 4: Low Priority / Improvements

### Issues #21-26: Code Quality Improvements

1. **Standardize error handling patterns**
2. **Extract magic numbers/strings to constants**
3. **Add API versioning (/api/v1)**
4. **Create TypeScript types for all API contracts**
5. **Add automated testing (Jest, Playwright)**
6. **Improve API documentation (OpenAPI/Swagger)**

These are documented for future sprints but not critical for production readiness.

---

## Implementation Roadmap

### Week 1: Critical Fixes (Phase 1)
- Day 1-2: Issues #1-2 (Build config, Rate limiting)
- Day 3: Issue #3 (Timing attack fix)
- Day 4: Issue #4 (Security headers)

### Week 2: High Priority (Phase 2)
- Day 1-2: Issues #5-6 (SQL injection, Input validation)
- Day 3: Issues #7-8 (Env validation, Azure SAS)
- Day 4-5: Issues #9-11 (Error handling, CORS, Password requirements)

### Week 3: Medium Priority (Phase 3)
- Day 1-2: Issues #12-14 (DB connection, Indexes, Timeouts)
- Day 3-5: Issues #15-20 (Other medium priority fixes)

### Week 4: Low Priority (Phase 4)
- Day 1-5: Issues #21-26 (Code quality improvements)

---

## Testing Strategy

### After Each Phase:
1. **Run full test suite**: `npm run test`
2. **Build verification**: `npm run build`
3. **Manual smoke tests**: Test critical user flows
4. **Security scan**: Run security audit tools
5. **Performance test**: Load test critical endpoints

### Final QA Checklist:
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings fixed
- [ ] Security headers verified with online tools
- [ ] Rate limiting tested and working
- [ ] CORS tested with mobile app
- [ ] Authentication timing attack verified fixed
- [ ] SQL injection attempts blocked
- [ ] Input validation comprehensive
- [ ] Error messages don't leak info
- [ ] Database indexes created
- [ ] Health check endpoint working
- [ ] Logs are structured and useful
- [ ] Environment validation at startup

---

## Monitoring & Maintenance

### Post-Deployment:
1. Monitor error rates in logs
2. Check rate limit effectiveness
3. Review security headers regularly
4. Monitor database query performance
5. Rotate auth credentials every 90 days
6. Update dependencies monthly
7. Review access logs for suspicious activity

---

## Dependencies Between Fixes

```
Issue #1 (Build config) ─┬─> All other issues
                         └─> Must be fixed first

Issue #6 (Validation) ───> Issue #5 (SQL injection)
Issue #7 (Env validation) ─> Issue #12 (DB connection)
Issue #9 (Error handling) ─> All API routes
```

---

## Estimated Effort Summary

| Phase | Issues | Hours | Priority |
|-------|--------|-------|----------|
| Phase 1 | 4 | 8-12 | Critical |
| Phase 2 | 7 | 12-16 | High |
| Phase 3 | 9 | 16-24 | Medium |
| Phase 4 | 6 | 8-12 | Low |
| **Total** | **26** | **44-64** | - |

---

## Contact & Questions

For questions about this action plan, refer to:
- Security issues: See SECURITY.md
- Implementation help: Check code comments in created files
- Testing procedures: See test scripts in /scripts

---

**Last Updated**: 2026-02-13
**Next Review**: After Phase 1 completion
