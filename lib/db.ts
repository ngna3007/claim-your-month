import { createClient, type Client } from "@libsql/client";

// One shared client (cached on globalThis so dev hot-reload doesn't leak clients).
// Local dev falls back to a file DB; production uses Turso env vars.
const g = globalThis as unknown as { _libsql?: Client; _libsqlInit?: Promise<void> };

function client(): Client {
  if (g._libsql) return g._libsql;
  const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  g._libsql = createClient({ url, authToken });
  return g._libsql;
}

function init(): Promise<void> {
  if (!g._libsqlInit) {
    g._libsqlInit = client()
      .execute(
        `CREATE TABLE IF NOT EXISTS events (
           id   INTEGER PRIMARY KEY AUTOINCREMENT,
           type TEXT NOT NULL CHECK (type IN ('scan','phished')),
           ts   INTEGER NOT NULL
         );`,
      )
      .then(() => undefined);
  }
  return g._libsqlInit;
}

async function count(type: "scan" | "phished"): Promise<number> {
  const r = await client().execute({
    sql: "SELECT COUNT(*) AS c FROM events WHERE type = ?",
    args: [type],
  });
  return Number(r.rows[0].c);
}

export async function recordScan(): Promise<void> {
  await init();
  await client().execute({
    sql: "INSERT INTO events (type, ts) VALUES ('scan', ?)",
    args: [Date.now()],
  });
}

export async function recordPhished(): Promise<{ rank: number; scans: number; phished: number }> {
  await init();
  await client().execute({
    sql: "INSERT INTO events (type, ts) VALUES ('phished', ?)",
    args: [Date.now()],
  });
  const [phished, scans] = await Promise.all([count("phished"), count("scan")]);
  return { rank: phished, scans, phished };
}

const BUCKET_MS = 15 * 60 * 1000; // 15-minute windows

export async function getStats(): Promise<{
  scans: number;
  phished: number;
  phishRate: number;
  series: { t: number; count: number }[];
}> {
  await init();
  const [phished, scans] = await Promise.all([count("phished"), count("scan")]);
  // BUCKET_MS is our own trusted constant (never user input), so it's safe to interpolate
  // directly into the SQL as an integer literal. This matters: @libsql/client's remote
  // (hrana) transport always encodes a bound JS `number` as a wire "float", so binding
  // BUCKET_MS via `?` would make SQLite perform floating-point division here — turning
  // `(ts / 900000.0) * 900000.0` into ~one bucket per event on remote Turso, even though
  // whole-number args happen to bind as integers on the local `file:` path (which is why
  // that path looked fine). Interpolating keeps this integer division regardless of
  // transport.
  const rows = await client().execute(
    `SELECT (ts / ${BUCKET_MS}) * ${BUCKET_MS} AS bucket, COUNT(*) AS c
          FROM events WHERE type = 'phished'
          GROUP BY bucket ORDER BY bucket`,
  );
  const series = rows.rows.map((r) => ({ t: Number(r.bucket), count: Number(r.c) }));
  return { scans, phished, phishRate: scans > 0 ? phished / scans : 0, series };
}
