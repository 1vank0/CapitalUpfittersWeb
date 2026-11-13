import { APIError, type CollectionConfig } from 'payload';
import { isAdmin, adminField } from '../lib/access';
export const Users: CollectionConfig = {
  slug: 'users', admin: { useAsTitle: 'email', group: 'Administration' },
  auth: { tokenExpiration: 3600, maxLoginAttempts: 5, lockTime: 15 * 60 * 1000, cookies: { sameSite: 'Lax', secure: process.env.CMS_DEPLOYMENT_SCOPE !== 'local' } },
  access: {
    admin: ({ req }) => ['admin', 'editor'].includes(req.user?.role || ''),
    create: isAdmin, delete: () => false,
    read: ({ req }) => req.user?.role === 'admin' || (req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => req.user?.role === 'admin' || (req.user ? { id: { equals: req.user.id } } : false),
  },
  hooks: { beforeOperation: [({operation}) => { if (operation === 'forgotPassword') throw new APIError('Account recovery email is not configured. Contact the administrator.', 503); }], beforeChange: [async ({ data, operation, req }) => {
    if (operation === 'create' && req.user?.role !== 'admin') {
      if (!req.context.trustedBootstrap) throw new APIError('Ask the developer to provision the initial administrator securely. Public registration is disabled.', 403);
      const count = await req.payload.count({ collection: 'users', overrideAccess: true, req });
      if (count.totalDocs > 0) throw new APIError('Initial administrator already exists.', 409);
      data.role = 'admin';
    }
    return data;
  }] },
  fields: [{ name: 'role', type: 'select', options: ['admin', 'editor'], required: true, defaultValue: 'editor', access: { create: adminField, update: adminField } }],
};
