// Deliberate, one-time provisioning; never run by build/deploy/start. Input via stdin, not arguments.
import { getPayload } from 'payload';
import config from '../src/payload.config';
if (process.env.CMS_ALLOW_BOOTSTRAP !== 'true') throw new Error('Explicit provisioning approval required: CMS_ALLOW_BOOTSTRAP=true.');
let input='';for await (const chunk of process.stdin) input+=chunk;
const {email,password}=JSON.parse(input);
if (typeof email!=='string' || typeof password!=='string' || password.length<16) throw new Error('Supply an approved admin email and a unique 16+ character password via JSON on stdin.');
const payload=await getPayload({config});
await payload.create({collection:'users',data:{email,password,role:'admin'},overrideAccess:true,context:{trustedBootstrap:true}});
console.log('Initial administrator created. Disable CMS_ALLOW_BOOTSTRAP now.');
process.exit(0);
