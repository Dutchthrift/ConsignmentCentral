# Migrating from Neon to Supabase

This document outlines the process for migrating the Dutch Thrift platform from Neon to Supabase PostgreSQL to address persistent rate limiting issues.

## Why Migrate?

Neon database has been experiencing frequent connection issues and rate limiting problems in our development environment, causing interruptions in service. Supabase provides a more reliable PostgreSQL service with better connection stability and higher rate limits.

## Migration Steps

1. **Update Database Connection**
   - Create new Supabase project and get connection string
   - Update DATABASE_URL environment variable
   - Implement more resilient connection handling

2. **Change Database Adapter**
   - Move from @neondatabase/serverless to standard pg package
   - Update connection pool settings for better stability
   - Implement connection error handling and recovery

3. **Session Management Updates**
   - Configure connect-pg-simple to use Supabase
   - Update session table creation and management
   - Implement more resilient session handling

4. **Authentication Integration**
   - Update authentication services to use new database connection
   - Ensure password hashing is compatible
   - Test login flows with new database

5. **Schema Migration**
   - Push existing schema to new database
   - Validate all tables and relationships
   - Create necessary indexes for performance

## Connection Configuration

The optimal connection configuration for Supabase:

```typescript
// Create a connection pool with proper SSL configuration for Supabase
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Less strict SSL validation for compatibility
  },
  // Connection pool configuration optimized for stability
  max: 5, // Fewer connections to avoid overwhelming the server
  idleTimeoutMillis: 60000, // Keep idle clients longer (1 minute) 
  connectionTimeoutMillis: 10000, // Longer timeout (10 seconds)
  allowExitOnIdle: true, // Allow pool to clean up on idle
});
```

## Steps for Users

To complete the migration, users need to:

1. Create a Supabase project at https://supabase.com
2. Get the connection string from the Supabase dashboard
3. Update the DATABASE_URL environment variable
4. Run the schema migration command

## Troubleshooting

Common issues:

1. **Connection Errors**: If you encounter connection errors, verify your DATABASE_URL and ensure it includes the correct password.
2. **SSL Issues**: Supabase requires SSL. Make sure SSL is properly configured in the connection settings.
3. **Rate Limiting**: While less common with Supabase, if you encounter rate limiting, consider implementing connection pooling and query caching.