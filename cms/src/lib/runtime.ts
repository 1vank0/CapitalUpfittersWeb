export function runtimeConfig(env: Record<string,string | undefined>) {
  const scope = env.CMS_DEPLOYMENT_SCOPE;
  if (!['local', 'preview'].includes(scope || '') || env.VERCEL_ENV === 'production') throw new Error('CMS is staging-only. Set CMS_DEPLOYMENT_SCOPE=local or preview; production deployment is deliberately blocked.');
  if (!env.PAYLOAD_SECRET || env.PAYLOAD_SECRET.length < 32) throw new Error('Supply a private PAYLOAD_SECRET of at least 32 characters.');
  const serverURL = env.CMS_SERVER_URL || 'http://localhost:3100';
  const origin = new URL(serverURL);
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('CMS_SERVER_URL must be an origin.');
  const local = scope === 'local';
  if (local && (!['localhost','127.0.0.1','[::1]'].includes(origin.hostname) || env.VERCEL)) throw new Error('Local mode is only allowed on loopback, never a hosted deployment.');
  if (!local && (origin.protocol !== 'https:' || !env.CMS_DATABASE_URL?.startsWith('postgres') || !env.CMS_BLOB_READ_WRITE_TOKEN || !env.CMS_ASSET_ORIGIN)) throw new Error('Preview needs HTTPS, a dedicated PostgreSQL database and an approved Blob store. No lead database or ephemeral filesystem fallback is allowed.');
  if (env.CMS_DATABASE_URL && !env.CMS_DATABASE_URL.startsWith('postgres')) throw new Error('CMS_DATABASE_URL must be a dedicated PostgreSQL connection, never an existing lead connection.');
  if (Boolean(env.CMS_BLOB_READ_WRITE_TOKEN) !== Boolean(env.CMS_ASSET_ORIGIN)) throw new Error('Configure the Blob token and its public origin together.');
  return { local, serverURL, secret: env.PAYLOAD_SECRET, databaseURL: env.CMS_DATABASE_URL, blobToken: env.CMS_BLOB_READ_WRITE_TOKEN };
}
