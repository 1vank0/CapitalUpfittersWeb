import path from 'node:path';
import { withPayload } from '@payloadcms/next/withPayload';
const remotePatterns = [];
if (process.env.CMS_ASSET_ORIGIN) {
  const origin = new URL(process.env.CMS_ASSET_ORIGIN);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/') throw new Error('CMS_ASSET_ORIGIN must be an HTTPS origin.');
  remotePatterns.push({ protocol: 'https', hostname: origin.hostname, port: origin.port, pathname: '/**' });
}
export default withPayload({
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: { remotePatterns, formats: ['image/avif', 'image/webp'] },
  async headers() { return [{ source: '/:path*', headers: [
    {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
    {key: 'Cache-Control', value: 'no-store'},
  ] }]; },
});
