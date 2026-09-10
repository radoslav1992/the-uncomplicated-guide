// Run before a production build; public legal details are baked into static pages.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const local = existsSync('.env') ? parseEnv(readFileSync('.env','utf8')) : {};
const values = {...local,...process.env};
const missing = ['SELLER_REGISTERED_ADDRESS','SELLER_REGISTRATION_NUMBER'].filter(key=>!values[key]?.trim());
if(missing.length){ console.error(`Missing verified seller disclosures: ${missing.join(', ')}. See docs/LAUNCH.md.`);process.exit(1);}
console.log('Seller disclosure fields present. Complete the production checks in docs/LAUNCH.md before deploying.');
