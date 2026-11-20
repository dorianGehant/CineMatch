import express from 'express';
import type { Request, Response } from 'express';
import db from './base.ts';

const app = express();
app.use(express.json());

app.get('/api/test', async (req: Request, res: Response) => {
    try {
        const result = await db.execute('SELECT * FROM test');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default app;
if (!process.env.VERCEL){
    app.listen(3000, () => console.log('http://localhost:3000'))
};