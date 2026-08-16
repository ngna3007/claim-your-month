import Database from "better-sqlite3";
import path from "node:path";

// Lazily-opened, single shared connection. Opening lazily (rather than at module
// import) avoids multiple build-time worker processes racing to open the same WAL
// file, which throws SQLITE_BUSY during `next build`.
const globalForDb = globalThis as unknown as { _db?: Database.Database };

function getDb(): Database.Database {
  if (globalForDb._db) return globalForDb._db;

  const db = new Database(path.join(process.cwd(), "stats.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('scan', 'phished')),
      ts   INTEGER NOT NULL
    );
  `);

  globalForDb._db = db;
  return db;
}

export function recordEvent(type: "scan" | "phished"): void {
  getDb().prepare("INSERT INTO events (type, ts) VALUES (?, ?)").run(type, Date.now());
}

export function getStats(): { scans: number; phished: number; phishRate: number } {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  const scans = count("SELECT COUNT(*) AS c FROM events WHERE type = 'scan'");
  const phished = count("SELECT COUNT(*) AS c FROM events WHERE type = 'phished'");
  return { scans, phished, phishRate: scans > 0 ? phished / scans : 0 };
}
