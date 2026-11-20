import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.VERCEL_TURSO_TURSO_DATABASE_URL!,
    authToken: process.env.VERCEL_TURSO_TURSO_AUTH_TOKEN!
});

export default db