import { handleVercel } from '../backend/vercel';
export default { fetch(request: Request) { return handleVercel('/api/templates', request); } };
