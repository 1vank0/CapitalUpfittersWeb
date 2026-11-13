import type { Access, FieldAccess } from 'payload';
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin';
export const isEditor: Access = ({ req }) => Boolean(req.user && ['admin', 'editor'].includes(req.user.role));
export const adminField: FieldAccess = ({ req }) => req.user?.role === 'admin';
export const editorField: FieldAccess = ({ req }) => Boolean(req.user && ['admin', 'editor'].includes(req.user.role));
export const mediaRead: Access = ({ req }) => isEditor({ req }) || { and: [
  { _status: { equals: 'published' } }, { rightsCleared: { equals: true } }, { provenance: { equals: 'real' } },
] };
