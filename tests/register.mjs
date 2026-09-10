// Run production TypeScript with Node's built-in test runner; mock only platform imports and image metadata.
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'cloudflare:workers') return {url:'test:env',shortCircuit:true};
    if (/\.(jpg|webp|png)$/.test(specifier)) return {url:'test:image:'+specifier,shortCircuit:true};
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier,context.parentURL);
      if (existsSync(new URL(url.href+'.ts'))) return {url:url.href+'.ts',shortCircuit:true};
    }
    return next(specifier,context);
  },
  load(url,context,next) {
    if(url==='test:env')return {format:'module',source:'export const env = globalThis.__testEnv;',shortCircuit:true};
    if(url.startsWith('test:image:'))return {format:'module',source:'export default {src:"/cover.jpg",width:600,height:850}',shortCircuit:true};
    if(url.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(new URL(url),'utf8').replaceAll('import.meta.env','({})')),shortCircuit:true};
    return next(url,context);
  },
});
