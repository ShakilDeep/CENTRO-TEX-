import Database from 'better-sqlite3';
import path from 'path';
import { prisma } from '../lib/prisma';

/**
 * SQLite Triggers for Comprehensive Audit Logging
 * 
 * This module creates database-level triggers to automatically audit all
 * INSERT, UPDATE, and DELETE operations on core business tables.
 * 
 * Architecture:
 * - Protection triggers: Prevent modifications to audit_logs table (append-only)
 * - Audit triggers: Automatically log changes to users, locations, samples, inventory, approvals
 * - User context: Application sets current user in current_user table before operations
 * 
 * Trigger Naming Convention: trg_{table}_{action}_{purpose}
 * Examples: trg_users_audit_insert, trg_audit_logs_protection_update
 */

const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.cwd(), process.env.DATABASE_URL.replace('file:.', './prisma'))
  : path.join(__dirname, '../../prisma/apps/api/data/centrotex.db');
console.log(dbPath);
/**
 * Helper function to execute SQL statements using better-sqlite3
 */
function executeSQL(sql: string): void {
  const db = new Database(dbPath);
  try {
    db.exec(sql);
  } catch (error) {
    console.error(`Error executing SQL: ${sql}`, error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Drop all existing triggers (for idempotency)
 */
function dropExistingTriggers(): void {
  const triggers = [
    'trg_audit_logs_protection_update',
    'trg_audit_logs_protection_delete',
    'trg_users_audit_insert',
    'trg_users_audit_update',
    'trg_users_audit_delete',
    'trg_locations_audit_insert',
    'trg_locations_audit_update',
    'trg_locations_audit_delete',
    'trg_samples_audit_insert',
    'trg_samples_audit_update',
    'trg_samples_audit_delete',
    'trg_inventory_audit_insert',
    'trg_inventory_audit_update',
    'trg_inventory_audit_delete',
    'trg_approvals_audit_insert',
    'trg_approvals_audit_update',
    'trg_approvals_audit_delete',
  ];

  for (const trigger of triggers) {
    try {
      executeSQL(`DROP TRIGGER IF EXISTS ${trigger}`);
    } catch (error) {
      console.warn(`Failed to drop trigger ${trigger}:`, error);
    }
  }
}

/**
 * Protection Triggers for audit_logs table
 * These triggers enforce append-only behavior by ABORTing UPDATE/DELETE operations
 */
function createProtectionTriggers(): void {
  console.log('Creating protection triggers for audit_logs table...');

  executeSQL(`
    CREATE TRIGGER trg_audit_logs_protection_update
    BEFORE UPDATE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'Cannot update audit_logs: append-only table');
    END;
  `);

  executeSQL(`
    CREATE TRIGGER trg_audit_logs_protection_delete
    BEFORE DELETE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'Cannot delete from audit_logs: append-only table');
    END;
  `);

  console.log('Protection triggers created successfully');
}

/**
 * Helper function to create audit triggers for a table
 * @param tableName The name of the table to audit
 * @param columns List of columns to include in the audit log
 */
function createAuditTriggers(
  tableName: string,
  columns: string[]
): void {
  const columnsList = columns.join(', ');
  const newValuesJSON = `'INSERT', json_object(${columns.map(c => `'${c}', NEW.${c}`).join(', ')})`;
  const oldValuesJSON = `'UPDATE', json_object(${columns.map(c => `'${c}', OLD.${c}`).join(', ')})`;
  const newValuesUpdateJSON = `'UPDATE', json_object(${columns.map(c => `'${c}', NEW.${c}`).join(', ')})`;
  const oldValuesDeleteJSON = `'DELETE', json_object(${columns.map(c => `'${c}', OLD.${c}`).join(', ')})`;

  console.log(`Creating audit triggers for ${tableName} table...`);

  executeSQL(`
    CREATE TRIGGER trg_${tableName}_audit_insert
    AFTER INSERT ON ${tableName}
    BEGIN
      INSERT INTO audit_logs (
        id,
        table_name,
        record_id,
        sample_id,
        user_id,
        action,
        old_values,
        new_values,
        timestamp,
        ip_address,
        user_agent
      )
      SELECT
        lower(hex(randomblob(16))) || '-' || lower(hex(randomblob(8))) || '-' || '4' || substr(lower(hex(randomblob(8))), 2) || '-' || 'a' || substr(lower(hex(randomblob(8))), 2) || '-' || lower(hex(randomblob(24))),
        '${tableName}',
        NEW.id,
        CASE WHEN '${tableName}' = 'samples' THEN NEW.id ELSE NULL END,
        COALESCE((SELECT user_id FROM current_user LIMIT 1), 'SYSTEM'),
        'INSERT',
        NULL,
        json_object(${columns.map(c => `'${c}', NEW.${c}`).join(', ')}),
        datetime('now'),
        (SELECT ip_address FROM current_user LIMIT 1),
        (SELECT user_agent FROM current_user LIMIT 1);
    END;
  `);

  executeSQL(`
    CREATE TRIGGER trg_${tableName}_audit_update
    AFTER UPDATE ON ${tableName}
    BEGIN
      INSERT INTO audit_logs (
        id,
        table_name,
        record_id,
        sample_id,
        user_id,
        action,
        old_values,
        new_values,
        timestamp,
        ip_address,
        user_agent
      )
      SELECT
        lower(hex(randomblob(16))) || '-' || lower(hex(randomblob(8))) || '-' || '4' || substr(lower(hex(randomblob(8))), 2) || '-' || 'a' || substr(lower(hex(randomblob(8))), 2) || '-' || lower(hex(randomblob(24))),
        '${tableName}',
        NEW.id,
        CASE WHEN '${tableName}' = 'samples' THEN NEW.id ELSE NULL END,
        COALESCE((SELECT user_id FROM current_user LIMIT 1), 'SYSTEM'),
        'UPDATE',
        json_object(${columns.map(c => `'${c}', OLD.${c}`).join(', ')}),
        json_object(${columns.map(c => `'${c}', NEW.${c}`).join(', ')}),
        datetime('now'),
        (SELECT ip_address FROM current_user LIMIT 1),
        (SELECT user_agent FROM current_user LIMIT 1);
    END;
  `);

  executeSQL(`
    CREATE TRIGGER trg_${tableName}_audit_delete
    BEFORE DELETE ON ${tableName}
    BEGIN
      INSERT INTO audit_logs (
        id,
        table_name,
        record_id,
        sample_id,
        user_id,
        action,
        old_values,
        new_values,
        timestamp,
        ip_address,
        user_agent
      )
      SELECT
        lower(hex(randomblob(16))) || '-' || lower(hex(randomblob(8))) || '-' || '4' || substr(lower(hex(randomblob(8))), 2) || '-' || 'a' || substr(lower(hex(randomblob(8))), 2) || '-' || lower(hex(randomblob(24))),
        '${tableName}',
        OLD.id,
        CASE WHEN '${tableName}' = 'samples' THEN OLD.id ELSE NULL END,
        COALESCE((SELECT user_id FROM current_user LIMIT 1), 'SYSTEM'),
        'DELETE',
        json_object(${columns.map(c => `'${c}', OLD.${c}`).join(', ')}),
        NULL,
        datetime('now'),
        (SELECT ip_address FROM current_user LIMIT 1),
        (SELECT user_agent FROM current_user LIMIT 1);
    END;
  `);

  console.log(`Audit triggers for ${tableName} created successfully`);
}

/**
 * Create all audit triggers for business tables
 */
function createAllAuditTriggers(): void {
  const tableSchemas = {
    users: ['id', 'email', 'name', 'office', 'department', 'role', 'is_active', 'created_at', 'updated_at'],
    locations: ['id', 'name', 'type', 'description', 'is_active', 'created_at', 'updated_at'],
    samples: ['id', 'sample_id', 'sample_type', 'description', 'reference', 'location_id', 'checked_out_by', 'checked_out_at', 'due_date', 'created_at', 'updated_at'],
    inventory: ['id', 'sample_id', 'quantity', 'unit', 'status', 'notes', 'created_at', 'updated_at'],
    approvals: ['id', 'sample_id', 'requested_by', 'approved_by', 'status', 'request_reason', 'approval_notes', 'outcome', 'created_at', 'updated_at'],
  };

  for (const [tableName, columns] of Object.entries(tableSchemas)) {
    createAuditTriggers(tableName, columns);
  }
}

/**
 * Main function to set up all database triggers
 * This function is idempotent - it can be called multiple times safely
 */
export function setupTriggers(): void {
  console.log('=== Setting Up SQLite Triggers for Audit Logging ===\n');

  try {
    dropExistingTriggers();
    console.log('Dropped existing triggers\n');

    createProtectionTriggers();
    console.log('');

    createAllAuditTriggers();
    console.log('');

    console.log('=== All triggers created successfully ===\n');
    console.log('Summary:');
    console.log('- Protection triggers: 2 (audit_logs no update/delete)');
    console.log('- Audit triggers: 15 (5 tables × 3 operations each)');
    console.log('- Total triggers: 17');
  } catch (error) {
    console.error('Failed to set up triggers:', error);
    throw error;
  }
}

/**
 * Run trigger setup if this file is executed directly
 */
setupTriggers();
console.log('\nTrigger setup completed successfully');
