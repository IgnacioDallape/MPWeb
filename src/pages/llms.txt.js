import { llmsIndex } from '../lib/llms.js';
export const GET = () => new Response(llmsIndex(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
