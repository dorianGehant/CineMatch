import express, { Request, Response } from 'express';
import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});
const app = express();
app.use(express.json());


app.listen(3000, () => console.log('CinéMatch : http://localhost:3000'));
