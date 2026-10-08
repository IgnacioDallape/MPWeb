import { llmsFull } from '../lib/llms.js';
export const GET = () => new Response(llmsFull(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
