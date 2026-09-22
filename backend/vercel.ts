import { api } from './api';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function handleVercel(path: string, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'POST' && request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) {
    return Response.json({ error: 'Cross-origin request rejected.' }, { status: 403, headers });
  }
  try {
    const body = request.method === 'POST' ? await request.json() : undefined;
    const result = await api(path, request.method, body, {
      ANALYSIS_PROVIDER: process.env.ANALYSIS_PROVIDER,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      // Vercel Functions limit request bodies to 4.5 MB; base64 inflates uploads.
      MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB || '3',
    });
    return Response.json(result, { headers });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400, headers });
  }
}
