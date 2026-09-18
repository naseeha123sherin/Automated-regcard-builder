import { provider, validateUpload, type Env } from './analysis';
import { ReferenceTemplateService } from '../shared/templates';
import { projectSchema } from '../shared/model';
import { generateFiles } from '../shared/generation';
export async function api(path: string, method: string, body: unknown, env: Env) { if (path === '/api/status' && method === 'GET')
    return { provider: env.ANALYSIS_PROVIDER || 'none', configured: env.ANALYSIS_PROVIDER === 'openai' && !!env.OPENAI_API_KEY }; if (path === '/api/templates' && method === 'GET')
    return new ReferenceTemplateService().load(); if (path === '/api/analyze' && method === 'POST')
    return provider(env).analyzeRegistrationCard(validateUpload(body, Math.min(Number(env.MAX_UPLOAD_MB) || 10, 10))); if (path === '/api/generate' && method === 'POST')
    return generateFiles(projectSchema.parse(body), new ReferenceTemplateService().load()); throw Error('API route not found.'); }
