import Database from 'better-sqlite3';
import path from 'path';

/**
 * Resolves the SQLite database path from the Prisma DATABASE_URL environment variable.
 * Falls back to the default location if DATABASE_URL is not set.
 */
function resolveDatabasePath(): string {
  const databaseUrl = process.env.DATABASE_URL || '';
  const filePrefix = 'file:';

  if (databaseUrl.startsWith(filePrefix)) {
    const relativePath = databaseUrl.slice(filePrefix.length);
    return path.resolve(process.cwd(), relativePath);
  }

  // Fallback: default location relative to api root
  return path.join(__dirname, '..', '..', 'prisma', 'data', 'centrotex.db');
}

function getDB(): Database.Database {
  const dbPath = resolveDatabasePath();
  return new Database(dbPath);
}

/**
 * Applies performance and integrity pragmas to the SQLite database.
 * - foreign_keys: Enforces referential integrity
 * - journal_mode WAL: Enables concurrent reads during writes
 * - synchronous NORMAL: Balances durability with performance
 */
export async function applyPragmas(): Promise<void> {
  const db = getDB();
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  } catch (error) {
    console.error('Failed to apply pragmas:', error);
    throw new Error('Failed to apply database pragmas');
  } finally {
    db.close();
  }
}

export async function getPragmaSettings(): Promise<Record<string, string>> {
  const db = getDB();
  try {
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    const journalMode = db.pragma('journal_mode', { simple: true });
    const synchronous = db.pragma('synchronous', { simple: true });

    const syncMap: Record<number, string> = {
      0: 'OFF',
      1: 'NORMAL',
      2: 'FULL',
      3: 'EXTRA',
    };

    return {
      foreign_keys: foreignKeys === 1 ? 'ON' : 'OFF',
      journal_mode: String(journalMode).toLowerCase(),
      synchronous: syncMap[synchronous as number] || String(synchronous),
    };
  } catch (error) {
    console.error('Failed to get pragma settings:', error);
    throw new Error('Failed to retrieve pragma settings');
  } finally {
    db.close();
  }
}

export async function main(): Promise<void> {
  try {
    await applyPragmas();
    console.log('=== Pragmas Applied Successfully ===');

    const settings = await getPragmaSettings();
    console.log('Current pragma settings:');
    console.log(`  foreign_keys: ${settings.foreign_keys}`);
    console.log(`  journal_mode: ${settings.journal_mode}`);
    console.log(`  synchronous: ${settings.synchronous}`);
  } catch (error) {
    console.error('Failed to apply pragmas:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
