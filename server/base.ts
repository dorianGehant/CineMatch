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

await db.execute(`
    CREATE TABLE IF NOT EXISTS proposition_film (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nb_votes_invite NOT NULL DEFAULT 0,
        soiree_id INTEGER NOT NULL,
        personne_id INTEGER NOT NULL,
        film_TMDBid INTEGER NOT NULL,
        film_title TEXT NOT NULL,
        film_year TEXT,
        film_poster TEXT,

        UNIQUE (soiree_id, film_TMDBid),

        FOREIGN KEY (personne_id) REFERENCES personne(id),
        FOREIGN KEY (soiree_id) REFERENCES soiree(id)
    )
`);

await db.execute(`
    CREATE TABLE IF NOT EXISTS vote_proposition_film (
        proposition_id INTEGER NOT NULL,
        personne_id INTEGER NOT NULL,

        PRIMARY KEY (proposition_id, personne_id),

        FOREIGN KEY (personne_id) REFERENCES personne(id),
        FOREIGN KEY (proposition_id) REFERENCES proposition_film(id)
    )
`);


export default db