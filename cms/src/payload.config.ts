import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import sharp from 'sharp';
import { Users } from './collections/Users';
import { Offers } from './collections/Offers';
import { Jobs } from './collections/Jobs';
import { Reviews } from './collections/Reviews';
import { FAQ } from './collections/FAQ';
import { Media } from './collections/Media';
import { Business } from './globals/Business';
import { runtimeConfig } from './lib/runtime';
const dirname = path.dirname(fileURLToPath(import.meta.url));
const runtime = runtimeConfig(process.env);
if (runtime.local) mkdirSync(path.resolve('.data'), { recursive: true });
export default buildConfig({
  serverURL: runtime.serverURL, secret: runtime.secret, sharp,
  admin: { user: 'users', importMap: { baseDir: dirname }, meta: { titleSuffix: ' | Capital Upfitters Content · Staging' } },
  csrf: [runtime.serverURL], cors: [runtime.serverURL],
  collections: [Users, Offers, Jobs, Media, Reviews, FAQ], globals: [Business],
  db: runtime.databaseURL
    ? postgresAdapter({ pool: { connectionString: runtime.databaseURL }, push: false, migrationDir: path.resolve(dirname, 'migrations') })
    : sqliteAdapter({ client: { url: process.env.CMS_LOCAL_DATABASE || 'file:.data/content.db' }, push: true }),
  plugins: [vercelBlobStorage({ enabled: Boolean(runtime.blobToken), alwaysInsertFields: true, collections: { media: { prefix: 'capital-content' } }, token: runtime.blobToken, clientUploads: false })],
  upload: { limits: { fileSize: 3_000_000 }, abortOnLimit: true },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  email: () => ({ name: 'disabled-staging-email', defaultFromAddress: 'disabled@example.invalid', defaultFromName: 'Staging', sendEmail: async () => { throw new Error('Email is not configured. Contact the administrator for account recovery.'); } }),
  graphQL: { disable: true },
});
