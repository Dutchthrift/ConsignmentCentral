# Supabase Migration Guide

This document provides instructions for migrating the DutchThrift application from the current database to Supabase.

## Prerequisites

1. A Supabase account with a project created
2. The Supabase connection string (available in your Supabase dashboard)
3. Access to the current application codebase

## Connection Information

Use the connection pooling URL from Supabase for better reliability:

```
postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

This connection string should be set as the `DATABASE_URL` environment variable.

## Migration Process

### Step 1: Configure the Environment

Make sure your `.env` file contains the correct Supabase connection string:

```
DATABASE_URL="postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

### Step 2: Run the Migration Script

We've created a migration script that will:
- Create the necessary tables in Supabase
- Migrate existing data to Supabase
- Set up test data for development

Run the migration script:

```
node migrate-to-supabase.js
```

### Step 3: Switch to Supabase Storage

After a successful migration, update the application to use the Supabase storage:

1. In `server/routes.ts`, change:
   ```javascript
   // From:
   import { storage } from "./memory-storage";
   // To:
   import { storage } from "./storage-supabase";
   ```

2. Update any other files that reference `memory-storage.ts` to use `storage-supabase.ts` instead.

### Step 4: Test the Application

After switching to Supabase storage, thoroughly test the application:

1. Test user authentication (admin and consignor logins)
2. Test item creation and management
3. Test order processing
4. Verify that all data is being correctly stored and retrieved

## Troubleshooting

### Connection Issues

If you experience connection issues with Supabase:

1. Verify the connection string is correct
2. Check that Supabase services are running (status.supabase.com)
3. Ensure your IP is not being blocked by any firewalls
4. Try using the connection pooling URL instead of direct connection

### Data Migration Issues

If data migration fails:

1. Check the error messages for specific table or constraint issues
2. Verify that the schema in `shared/schema.ts` matches the tables being created
3. Run the migration script with added debugging output to identify specific failures
4. If necessary, manually create tables or fix constraint issues in the Supabase dashboard

## Fallback Strategy

If Supabase connection continues to be problematic, the application includes an in-memory storage implementation that can be used for development and testing:

```javascript
import { storage } from "./memory-storage";
```

This allows development to continue while database connectivity issues are resolved.

## Testing Credentials

For testing purposes, the following accounts are available:

### Admin Account
- Email: admin@dutchthrift.com
- Password: admin123

### Consignor Account
- Email: consignor@example.com
- Password: password123