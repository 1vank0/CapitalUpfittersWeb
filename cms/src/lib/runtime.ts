export function runtimeConfig(env: Record<string,string | undefined>) {
  const scope = env.CMS_DEPLOYMENT_SCOPE;
  if (!['local', 'preview'].includes(scope || '') || env.VERCEL_ENV === 'production') throw new Error('CMS is staging-only. Set CMS_DEPLOYMENT_SCOPE=local or preview; production deployment is deliberately blocked.');
  if (!env.PAYLOAD_SECRET || env.PAYLOAD_SECRET.length < 32) throw new Error('Supply a private PAYLOAD_SECRET of at least 32 characters.');
  const serverURL = env.CMS_SERVER_URL || 'http://localhost:3100';
  const origin = new URL(serverURL);
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('CMS_SERVER_URL must be an origin.');
  const local = scope === 'local';
  if (local && (!['localhost','127.0.0.1','[::1]'].includes(origin.hostname) || env.VERCEL)) throw new Error('Local mode is only allowed on loopback, never a hosted deployment.');
  const s3 = env.CMS_STORAGE_PROVIDER === 'neon' && env.CMS_S3_BUCKET && env.CMS_S3_ENDPOINT && env.CMS_S3_REGION && env.CMS_S3_ACCESS_KEY_ID && env.CMS_S3_SECRET_ACCESS_KEY;
  if (s3) {
    const endpoint = new URL(env.CMS_S3_ENDPOINT!);
    if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.aws.neon.tech') || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) throw new Error('Neon storage requires its HTTPS branch endpoint.');
  }
  if (!local && (origin.protocol !== 'https:' || !env.CMS_DATABASE_URL?.startsWith('postgres') || !s3)) throw new Error('Preview needs HTTPS, a dedicated PostgreSQL database and private Neon object storage. No lead database or ephemeral filesystem fallback is allowed.');
  if (env.CMS_DATABASE_URL && !env.CMS_DATABASE_URL.startsWith('postgres')) throw new Error('CMS_DATABASE_URL must be a dedicated PostgreSQL connection, never an existing lead connection.');
  return { local, serverURL, secret: env.PAYLOAD_SECRET, databaseURL: env.CMS_DATABASE_URL, s3: Boolean(s3) };
}
