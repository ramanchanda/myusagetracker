#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs all pending migrations in the migrations directory
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('../services/databaseService');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured. Cannot run migrations.');
    process.exit(1);
  }

  console.log('🚀 Starting database migrations...\n');

  try {
    // Get all .sql files in migrations directory
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run migrations in alphabetical order

    if (files.length === 0) {
      console.log('✓ No migration files found.');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`📄 Running migration: ${file}`);

      const sql = fs.readFileSync(filePath, 'utf8');

      const client = await db.getClient();
      try {
        await client.query(sql);
        console.log(`✓ Completed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Failed: ${file}`);
        console.error(`Error: ${error.message}\n`);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('================================================');
    console.log('✅ All migrations completed successfully!');
    console.log('================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n================================================');
    console.error('❌ Migration failed!');
    console.error('================================================');
    console.error(error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
