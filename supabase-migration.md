# Migrating to Supabase from Neon Database

## Why Migrate?
We're migrating from Neon Database to Supabase because we've encountered severe rate limiting issues with Neon, which is affecting application stability.

## Steps to Set Up Supabase

1. **Create a Supabase Account and Project**
   - Go to [Supabase](https://supabase.com) and sign up for an account
   - Create a new project in Supabase
   - Choose a region closest to your users
   - Set a strong database password and save it securely

2. **Get the Database Connection String**
   - From your Supabase project dashboard, click the "Settings" icon in the left sidebar
   - Select "Database" from the settings menu
   - Scroll down to "Connection String" section
   - Copy the "URI" connection string under "Connection pooling" (it will look like `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true`)
   - Replace `[YOUR-PASSWORD]` with the password you set during project creation

3. **Set Up Environment Variables**
   - Add the Supabase connection string to your `.env` file as `DATABASE_URL`
   - Make sure to keep this connection string secure

4. **Push Database Schema**
   - Run `npm run db:push` to push the schema to your new Supabase database

## Code Updates
We've already created a new database adapter (`server/supabase-db.ts`) that's compatible with Supabase.

### Files that need to be updated:
- `server/index.ts` - Update import statements to use the new adapter
- `server/database-storage.ts` - Ensure it's using the new adapter
- Any other files that directly import from `server/db.ts`

## Data Migration (Optional)
If you need to migrate existing data from Neon to Supabase:

1. Export data from Neon Database (use pg_dump or similar tool)
2. Import data into Supabase (use the SQL Editor in the Supabase dashboard)

## Testing
- Test all database operations after migration
- Verify that rate limiting issues are resolved
- Check performance metrics in the Supabase dashboard