import { getPublishedContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (process.env.CMS_PUBLIC_READS_ENABLED !== 'true') return Response.json({error:'Public content export is disabled in staging.'},{status:404,headers});
  try { return Response.json(await getPublishedContent({absoluteAssetURLs:true}),{headers}); }
  catch { return Response.json({error:'Content temporarily unavailable.'},{status:503,headers}); }
}
