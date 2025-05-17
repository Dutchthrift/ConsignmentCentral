# Supabase Database Migration Guide

This guide explains how to migrate the DutchThrift application from in-memory storage to Supabase persistent database storage.

## Prerequisites

1. A Supabase account and project
2. The DATABASE_URL environment variable set in your `.env` file

## Migration Steps

### 1. Create Database Schema

The database schema has been created using the `create-supabase-schema.js` script. This script creates all necessary tables:

- admin_users: For admin user accounts
- users: For consignor user accounts
- customers: For consignor details
- items: For consignment items
- analysis: For item analysis data
- pricing: For item pricing information
- shipping: For shipping details
- orders: For customer orders
- order_items: For items in orders
- ml_training_examples: For ML training data
- ml_model_configs: For ML model configurations
- ml_training_sessions: For ML training session records

To run the script:

```bash
node create-supabase-schema.js
```

### 2. Seed Initial Data

To seed the database with initial test data, run:

```bash
node seed-supabase-data.js
```

This creates:
- An admin user (admin@dutchthrift.com / admin123)
- A test consignor (consignor@example.com / password123)
- Sample items and an order

### 3. Switch to Supabase Storage

To switch the application to use Supabase instead of in-memory storage:

```bash
node run-supabase-migration.js
```

This script will:
1. Check if the DATABASE_URL is configured
2. Run the database schema migration if needed
3. Switch the application to use Supabase storage (DatabaseStorage implementation)

### Troubleshooting

If you encounter issues:

1. Check that the DATABASE_URL is correctly set in your `.env` file
2. Ensure your Supabase database is accessible
3. Check the PostgreSQL version compatibility (9.6 or higher required)
4. Examine any error messages for specific table or column issues

### Test Accounts

After migration, you can log in with:

- Admin: admin@dutchthrift.com / admin123
- Consignor: consignor@example.com / password123

### Manual Database Operation

If needed, you can connect to your Supabase database directly using the psql command:

```bash
psql "postgres://username:password@hostname:port/database"
```

Replace the connection details with your Supabase connection string.