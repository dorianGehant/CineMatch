import express from 'express';
import type { Request, Response } from 'express';
import db from './base.ts';

const app = express();
app.use(express.json());


export default app;
if (!process.env.VERCEL){
    app.listen(3000, () => console.log('http://localhost:3000'))
};