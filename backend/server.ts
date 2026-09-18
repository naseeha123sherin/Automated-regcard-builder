import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { api } from './api';
import path from 'node:path';
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'worker-src': ["'self'", 'blob:'], 'img-src': ["'self'", 'data:', 'blob:'], 'style-src': ["'self'", "'unsafe-inline'"], 'font-src': ["'self'", 'data:'] } } }));
app.use('/api', rateLimit({ windowMs: 60000, limit: 20 }), express.json({ limit: '14mb' }));
app.use('/api', async (req, res) => { try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await api(req.originalUrl.split('?')[0], req.method, req.body, process.env));
}
catch (e) {
    res.status(400).json({ error: (e as Error).message });
} });
app.use(express.static(path.resolve('dist/client')));
app.get('/', (_req, res) => res.sendFile(path.resolve('dist/client/index.html')));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(400).json({ error: err.message }));
app.listen(Number(process.env.PORT) || 3001, '127.0.0.1', () => console.log('Backend ready at http://127.0.0.1:3001'));
