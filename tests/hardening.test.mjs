import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { signingSecret } from '../src/lib/tokens.ts';
import { rateLimit } from '../src/lib/rate-limit.ts';
import { subscribe, createNewsletter, removeSubscriber, deliverPending, retryFailedLetters } from '../src/lib/newsletter.ts';

function environment() {
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const prepare=sql=>{let values=[];const run=()=>{const stmt=db.prepare(sql);stmt.setAllowBareNamedParameters(true);const params=Object.fromEntries(values.map((v,i)=>[String(i+1),v]));return {stmt,params};};return {bind(...v){values=v;return this;},async run(){const {stmt,params}=run();const r=stmt.run(params);return {meta:{changes:Number(r.changes)}};},async first(){const {stmt,params}=run();return stmt.get(params)??null;},async all(){const {stmt,params}=run();return {results:stmt.all(params)};}};};
 const env={DB:{prepare,batch:async queries=>{db.exec('BEGIN');try{const r=await Promise.all(queries.map(q=>q.run()));db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},AUTH_SECRET:'a'.repeat(48),SITE_URL:'https://site.example',EMAIL_FROM:'hello@example.com'};
 return {env,db};
}

test('all migrations apply; auth fails closed without a strong secret',()=>{environment();assert.throws(()=>signingSecret({}),/AUTH_SECRET/);assert.throws(()=>signingSecret({AUTH_SECRET:'short'}));});
test('fixed-window rate limiter accepts quota and rejects excess',async()=>{const {env}=environment();const results=await Promise.all(Array.from({length:4},()=>rateLimit(env,'test','person',3,600000)));assert.equal(results.filter(Boolean).length,3);});
test('newsletter unsubscribe cancels already queued recipients',async()=>{const {env,db}=environment();let sent=0;env.SEND_EMAIL={send:async()=>{sent++;return {messageId:'test'};}};await subscribe(env,env.SITE_URL,'reader@example.com','*','test');db.exec("UPDATE signups SET confirmed_at='now'");await createNewsletter(env,'A letter','Body');await removeSubscriber(env,'reader@example.com');await deliverPending(env,env.SITE_URL);assert.equal(sent,1);assert.equal(db.prepare('SELECT error FROM newsletter_recipients').get().error,'unsubscribed');});
test('newsletter leases prevent duplicate sends and retries respect unsubscribes',async()=>{const {env,db}=environment();let sent=0;env.SEND_EMAIL={send:async()=>{sent++;return {messageId:'test'};}};await subscribe(env,env.SITE_URL,'reader@example.com','*','test');db.exec("UPDATE signups SET confirmed_at='now'");await createNewsletter(env,'A letter','Body');await Promise.all([deliverPending(env,env.SITE_URL),deliverPending(env,env.SITE_URL)]);assert.equal(sent,2);assert.equal(db.prepare('SELECT sent FROM newsletters').get().sent,1);await removeSubscriber(env,'reader@example.com');await retryFailedLetters(env);assert.equal(db.prepare('SELECT sent FROM newsletters').get().sent,1);});
