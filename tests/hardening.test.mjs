import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { signingSecret } from '../src/lib/tokens.ts';
import { rateLimit } from '../src/lib/rate-limit.ts';
import { subscribe, createNewsletter, removeSubscriber, deliverPending, retryFailedLetters, confirmSubscriber, sendGuideEmail, guideDownload, GUIDE_PATH } from '../src/lib/newsletter.ts';
import { site } from '../src/data/site.ts';

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

// ─── The free PDF for subscribers ────────────────────────────────────────────
const mailbox=env=>{const mails=[];env.SEND_EMAIL={send:async m=>{mails.push(m);return {messageId:'test'};}};return mails;};
const linkParams=(text,path)=>{const url=new URL(text.split(/\s+/).find(w=>w.includes(path)));return [url.searchParams.get('e'),url.searchParams.get('t')];};

test('an address is confirmed exactly once, so the PDF email cannot be repeated by reopening the link',async()=>{
 const {env}=environment();mailbox(env);
 await subscribe(env,env.SITE_URL,'reader@example.com','*','test');
 const results=await Promise.all([confirmSubscriber(env,'reader@example.com'),confirmSubscriber(env,'Reader@Example.com')]);
 assert.deepEqual(results.sort(),['already-confirmed','confirmed']);
 assert.equal(await confirmSubscriber(env,'reader@example.com'),'already-confirmed');
 assert.equal(await confirmSubscriber(env,'nobody@example.com'),'not-found');
});

test('the PDF email carries a signed link that downloads the file from R2',async()=>{
 const {env}=environment();const mails=mailbox(env);const asked=[];
 env.GUIDE_FILES={get:async key=>{asked.push(key);return {body:'%PDF-test',size:9};}};
 assert.equal((await sendGuideEmail(env,env.SITE_URL,'reader@example.com')).ok,true);
 const [mail]=mails;
 assert.equal(mail.to,'reader@example.com');
 assert.match(mail.subject,/free PDF/i);
 assert.match(mail.headers['List-Unsubscribe'],/\/api\/newsletter\/unsubscribe\?/);
 assert.ok(mail.text.includes(env.SITE_URL+site.freeGuide.article));
 const [e,t]=linkParams(mail.text,GUIDE_PATH);
 const response=await guideDownload(env,e,t);
 assert.ok(response instanceof Response);
 assert.equal(response.headers.get('content-type'),'application/pdf');
 assert.equal(response.headers.get('content-disposition'),`attachment; filename="${site.freeGuide.fileName}"`);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(await response.text(),'%PDF-test');
 assert.deepEqual(asked,[site.freeGuide.fileKey]);
});

test('the PDF link rejects forged and borrowed signatures and reports a missing file',async()=>{
 const {env}=environment();const mails=mailbox(env);let reads=0;
 env.GUIDE_FILES={get:async()=>{reads++;return null;}};
 await subscribe(env,env.SITE_URL,'reader@example.com','*','test');
 await sendGuideEmail(env,env.SITE_URL,'reader@example.com');
 const [confirmE,confirmT]=linkParams(mails[0].text,'/api/newsletter/confirm');
 const [e,t]=linkParams(mails[1].text,GUIDE_PATH);
 // A confirmation link is sent to unconfirmed addresses: it must not unlock the PDF.
 assert.equal(await guideDownload(env,confirmE,confirmT),'invalid');
 assert.equal(await guideDownload(env,e,t.slice(0,-2)+(t.endsWith('AA')?'BB':'AA')),'invalid');
 assert.equal(await guideDownload(env,Buffer.from('other@example.com').toString('base64url'),t),'invalid');
 assert.equal(await guideDownload(env,'',''),'invalid');
 assert.equal(reads,0);
 const original=console.error;console.error=()=>{};
 try{assert.equal(await guideDownload(env,e,t),'missing');}finally{console.error=original;}
 assert.equal(reads,1);
});

test('a confirmed subscriber who signs up again is re-sent the PDF link at most once a day',async()=>{
 const {env,db}=environment();const mails=mailbox(env);
 const first=await subscribe(env,env.SITE_URL,'reader@example.com','*','test');
 assert.equal(first.status,'confirmation-sent');
 assert.match(mails[0].text,/free PDF/);
 db.exec("UPDATE signups SET confirmed_at='now'");
 const again=await subscribe(env,env.SITE_URL,'Reader@example.com','*','test');
 assert.deepEqual(again,{status:'already-confirmed',resent:true});
 assert.equal(mails.length,2);
 assert.ok(mails[1].text.includes(GUIDE_PATH));
 const third=await subscribe(env,env.SITE_URL,'reader@example.com','*','test');
 assert.deepEqual(third,{status:'already-confirmed',resent:false});
 assert.equal(mails.length,2);
});
