# Security Guidelines

This document outlines security requirements and best practices for the Moots application.

---

## Dashboard Authentication

### Password Requirements

Dashboard passwords must meet the following minimum requirements:

- **Minimum Length**: 12 characters
- **Uppercase Letters**: At least one (A-Z)
- **Lowercase Letters**: At least one (a-z)
- **Numbers**: At least one (0-9)
- **Special Characters**: At least one (!@#$%^&*()_+-=[]{}; ':"\\|,.<>/?)

### Examples

✅ **Strong passwords**:
- `MyS3cure!Pass2024`
- `Tr0pic@lStorm#42`
- `C0ffee&Code!Today`

❌ **Weak passwords** (DO NOT USE):
- `password123` (too common)
- `admin` (too short, no special chars)
- `Welcome1!` (common pattern)

### Setup Instructions

#### Option 1: Manual Setup

1. Generate a strong password using a password manager
2. Add credentials to `.env.local`:

```bash
DASHBOARD_AUTH_USER=your-username-here
DASHBOARD_AUTH_PASS=your-strong-password-here
```

3. Verify password meets requirements:
```bash
npm run validate:password
```

#### Option 2: Generate Secure Credentials

Use the provided script to generate secure credentials:

```bash
npm run setup:auth
```

This will:
- Prompt for username (min 3 characters)
- Prompt for password and validate strength
- Provide the credentials to add to `.env.local`

---

## File Upload Security

### Allowed File Types

Image uploads are restricted to the following types:

- **JPEG**: `.jpg`, `.jpeg` (image/jpeg)
- **PNG**: `.png` (image/png)
- **WebP**: `.webp` (image/webp)
- **GIF**: `.gif` (image/gif)

### File Size Limits

- **Maximum file size**: 5 MB
- **Minimum file size**: 100 bytes (to prevent empty files)

### File Validation

All uploads are validated for:
- File type matches extension (prevents MIME type spoofing)
- File size within limits
- Safe filename (sanitized automatically)
- Content type headers

---

## API Security

### Rate Limiting

Rate limits protect against abuse and DoS attacks:

- **Public API**: 30 requests per minute
- **Join Requests**: 3 requests per 5 minutes
- **File Uploads**: 5 requests per minute

When rate limit is exceeded:
- HTTP 429 status returned
- `Retry-After` header indicates when to retry
- Rate limit headers show remaining quota

### CORS Configuration

CORS is configured for approved origins only:

**Production**:
- `https://moots.app`
- `https://www.moots.app`
- `https://app.moots.com`

**Development**:
- `http://localhost:*` (any port)
- `http://127.0.0.1:*` (any port)

### Input Validation

All API inputs are validated using Zod schemas:

- Email addresses must be valid format
- URLs must be properly formatted
- String lengths are enforced
- Numeric values have min/max constraints
- Enum values are validated against allowed values

---

## Environment Variables

### Required Variables

#### Dashboard Mode
```bash
# App Configuration
NEXT_PUBLIC_APP_MODE=dashboard
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host/db

# Authentication
DASHBOARD_AUTH_USER=your-username
DASHBOARD_AUTH_PASS=your-secure-password

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=public
```

#### Entry Mode
```bash
# App Configuration
NEXT_PUBLIC_APP_MODE=entry
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=public
```

### Validation

Environment variables are validated at application startup. If any required variables are missing or invalid, the application will fail to start with a clear error message.

To validate your environment configuration:
```bash
npm run validate:env
```

---

## Best Practices

### 1. Credential Management

- ✅ Use a password manager to generate and store passwords
- ✅ Rotate credentials every 90 days
- ✅ Never commit credentials to version control
- ✅ Use different passwords for different environments
- ✅ Document who has access to production credentials
- ❌ Never share credentials via email or chat
- ❌ Never use default or example passwords
- ❌ Never reuse passwords across systems

### 2. API Keys

- Store all sensitive keys in `.env.local`
- Never commit `.env.local` to git (already in `.gitignore`)
- Use different keys for development and production
- Rotate API keys periodically
- Monitor API key usage for suspicious activity

### 3. Database Security

- Use strong, unique passwords for database users
- Enable SSL/TLS for database connections
- Restrict database access by IP address when possible
- Regularly backup database (automated)
- Monitor for unusual query patterns

### 4. File Uploads

- Never trust user-provided filenames
- Always validate file types and sizes
- Use unique filenames to prevent overwriting
- Store uploads in isolated storage (Azure Blob)
- Scan uploaded files for malware (recommended)

### 5. Error Handling

- Never expose stack traces to users
- Log all errors with context
- Use generic error messages in production
- Monitor error rates for anomalies
- Set up alerts for critical errors

---

## Security Headers

The application automatically applies the following security headers:

- **Content-Security-Policy**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME-sniffing
- **X-XSS-Protection**: Legacy XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Strict-Transport-Security**: Enforces HTTPS (production only)

---

## Monitoring & Alerts

### What to Monitor

1. **Failed Login Attempts**
   - More than 5 failed attempts in 5 minutes
   - Failed attempts from unusual locations

2. **Rate Limit Violations**
   - Repeated 429 responses from same IP
   - Unusual traffic patterns

3. **Upload Activity**
   - Large file uploads
   - Unusual file types
   - High upload volume

4. **Database Performance**
   - Slow queries (>1 second)
   - Connection pool exhaustion
   - Failed queries

5. **Error Rates**
   - Sudden spike in 500 errors
   - Repeated errors from same user
   - New error patterns

### Logging

All security-relevant events are logged with:
- Timestamp
- User identifier (IP address, user ID)
- Action performed
- Result (success/failure)
- Additional context

Logs are structured JSON in production for easy parsing by log aggregators.

---

## Incident Response

### If You Suspect a Security Issue

1. **Do Not Panic**
   - Document what you observed
   - Note the time and any affected users

2. **Immediate Actions**
   - Check application logs for suspicious activity
   - Review recent authentication attempts
   - Check for unusual API usage patterns

3. **If Credentials Compromised**
   - Immediately rotate affected credentials
   - Review access logs for unauthorized access
   - Notify team members
   - Document the incident

4. **If Data Breach Suspected**
   - Immediately contact security team
   - Preserve logs for analysis
   - Do not delete or modify evidence
   - Follow incident response procedures

### Security Contacts

- **Primary**: [Your security contact]
- **Backup**: [Backup contact]
- **Emergency**: [24/7 contact]

---

## Compliance

### Data Protection

The application handles personal data and must comply with:

- **GDPR** (General Data Protection Regulation) - EU users
- **CCPA** (California Consumer Privacy Act) - California users

### Data Retention

- User profiles: Retained while account active
- Join requests: Retained for event duration + 30 days
- Logs: Retained for 90 days
- Backups: Retained for 30 days

### User Rights

Users have the right to:
- Access their data
- Request data deletion
- Export their data
- Opt out of notifications

---

## Security Checklist

Before deploying to production:

- [ ] All environment variables validated
- [ ] Strong passwords set for dashboard auth
- [ ] Database connection secured with SSL
- [ ] CORS configured for production origins only
- [ ] Rate limiting enabled
- [ ] Security headers verified (use https://securityheaders.com/)
- [ ] Error logging configured
- [ ] Monitoring and alerts set up
- [ ] Backup procedures in place
- [ ] Incident response plan documented
- [ ] Team trained on security best practices

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Azure Blob Storage Security](https://docs.microsoft.com/en-us/azure/storage/common/storage-security-guide)

---

**Last Updated**: 2026-02-13
**Version**: 1.0
**Maintained By**: Development Team
