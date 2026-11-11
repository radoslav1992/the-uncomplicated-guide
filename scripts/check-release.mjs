// Run before a production build; the publisher details on the imprint are baked into static pages.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const local = existsSync('.env') ? parseEnv(readFileSync('.env','utf8')) : {};
const values = {...local,...process.env};
const missing = ['SELLER_REGISTERED_ADDRESS','SELLER_REGISTRATION_NUMBER'].filter(key=>!values[key]?.trim());
if(missing.length){ console.error(`Missing publisher details for the imprint: ${missing.join(', ')}. Set them in .env or the build environment.`);process.exit(1);}
console.log('Publisher details present. See docs/LAUNCH.md for the shop clean-up steps.');
