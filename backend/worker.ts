import { api } from './api';
import type { Env } from './analysis';
type WorkerEnv = Env & {
    ASSETS: {
        fetch(r: Request): Promise<Response>;
    };
};
export default { async fetch(request: Request, env: WorkerEnv): Promise<Response> { const u = new URL(request.url); if (!u.pathname.startsWith('/api/'))
        return env.ASSETS.fetch(request); const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }; if (request.method === 'POST' && request.headers.get('Origin') && request.headers.get('Origin') !== u.origin)
        return new Response(JSON.stringify({ error: 'Cross-origin request rejected.' }), { status: 403, headers }); try {
        let body: unknown;
        if (request.method === 'POST') {
            const reader = request.body?.getReader();
            if (!reader)
                throw Error('Request body missing.');
            const chunks: Uint8Array[] = [];
            let size = 0;
            while (true) {
                const r = await reader.read();
                if (r.done)
                    break;
                size += r.value.byteLength;
                if (size > 14 * 1024 * 1024) {
                    await reader.cancel();
                    throw Error('Upload exceeds request limit.');
                }
                chunks.push(r.value);
            }
            const all = new Uint8Array(size);
            let offset = 0;
            for (const c of chunks) {
                all.set(c, offset);
                offset += c.length;
            }
            body = JSON.parse(new TextDecoder().decode(all));
        }
        return new Response(JSON.stringify(await api(u.pathname, request.method, body, env)), { headers });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers });
    } } };
