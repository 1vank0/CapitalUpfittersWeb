import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { s3Storage } from '@payloadcms/storage-s3';
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
  plugins: [s3Storage({ enabled: runtime.s3, alwaysInsertFields: true,
    bucket: process.env.CMS_S3_BUCKET || 'cms-media',
    collections: { media: { prefix: 'capital-content' } },
    clientUploads: false, signedDownloads: false,
    config: { endpoint: process.env.CMS_S3_ENDPOINT, region: process.env.CMS_S3_REGION || 'us-east-1', forcePathStyle: true,
      credentials: { accessKeyId: process.env.CMS_S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.CMS_S3_SECRET_ACCESS_KEY || '' } },
  })],
  upload: { limits: { fileSize: 3_000_000 }, abortOnLimit: true },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  email: () => ({ name: 'disabled-staging-email', defaultFromAddress: 'disabled@example.invalid', defaultFromName: 'Staging', sendEmail: async () => { throw new Error('Email is not configured. Contact the administrator for account recovery.'); } }),
  graphQL: { disable: true },
});
