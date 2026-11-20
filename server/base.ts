import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.VERCEL_TURSO_TURSO_DATABASE_URL!,
    authToken: process.env.VERCEL_TURSO_TURSO_AUTH_TOKEN!
});

await db.execute(`
    CREATE TABLE IF NOT EXISTS test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test TEXT NOT NULL,
    )
`);

export default db