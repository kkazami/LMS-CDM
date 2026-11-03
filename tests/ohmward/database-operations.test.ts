import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseIdentity,poolOptions,configuration } from '../../scripts/ohmward/check-database.mjs';
import fs from 'node:fs';

test('database operations keep owner credentials separate from the runtime and redact target identity',()=>{
  const runtime='postgresql://runtime:synthetic@ep-example-pooler.region.neon.tech/database?sslmode=require';
  const values=configuration(process.cwd(),{DATABASE_URL:runtime,OHMWARD_MIGRATION_DATABASE_URL:'postgresql://owner:synthetic@other/database',OHMWARD_ENABLED:'true'});
  assert.equal(values.runtime,runtime);assert.equal(values.cli,runtime);assert.equal(values.enabled,true);
  assert.equal(databaseIdentity(runtime),databaseIdentity('postgresql://owner:different@ep-example.region.neon.tech/database?sslmode=verify-full'));
  assert.notEqual(databaseIdentity(runtime),databaseIdentity('postgresql://runtime:synthetic@ep-example.region.neon.tech/another'));
});
test('database operation connections enforce certificate and hostname verification remotely',()=>{
  const config=poolOptions('postgresql://synthetic:unused@example.invalid/database?sslmode=disable&uselibpqcompat=true');
  assert.equal(new URL(config.connectionString).searchParams.get('sslmode'),'verify-full');
  assert.equal(new URL(config.connectionString).searchParams.has('uselibpqcompat'),false);
  assert.deepEqual(config.ssl,{rejectUnauthorized:true});assert.equal(config.max,1);
  assert.equal(poolOptions('postgresql://synthetic:unused@127.0.0.1/database').ssl,undefined);
  assert.throws(()=>databaseIdentity('https://example.invalid/database'));
});
test('production chatbot configuration never traces private environment files into server artifacts',()=>{
  const source=fs.readFileSync('apps/web/src/app/api/chatbot/message/route.ts','utf8');
  assert.doesNotMatch(source,/readFileSync|existsSync|from ["'](?:node:)?fs["']/);
  assert.match(source,/process\.env\.GROQ_API_KEY/);assert.match(source,/process\.env\.GEMINI_API_KEY/);
  const guidance=fs.readFileSync('apps/web/src/lib/ite/guidance/ai-client.ts','utf8');
  assert.doesNotMatch(guidance,/readFileSync|existsSync|from ["'](?:node:)?fs["']/);
});
