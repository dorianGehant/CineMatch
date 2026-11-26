import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.VERCEL_TURSO_TURSO_DATABASE_URL!,
    authToken: process.env.VERCEL_TURSO_TURSO_AUTH_TOKEN!
});

await db.execute(`
    CREATE TABLE IF NOT EXISTS soiree (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        date TEXT NOT NULL,
        code_invitation TEXT
    )
`);

await db.execute(`
    CREATE TABLE IF NOT EXISTS personne (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE
    )
`);

await db.execute(`
    CREATE TABLE IF NOT EXISTS membre_soiree (
        personne_id INTEGER NOT NULL,
        soiree_id INTEGER NOT NULL,

        PRIMARY KEY (personne_id, soiree_id),

        FOREIGN KEY (personne_id) REFERENCES personne(id),
        FOREIGN KEY (soiree_id) REFERENCES soiree(id)
    )
`);

export default db