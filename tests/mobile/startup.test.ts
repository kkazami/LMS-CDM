import assert from 'node:assert/strict';
import {test, afterEach, mock} from 'node:test';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import {resolveApiUrl, normalizeApiUrl, LIVE_API_URL} from '../../apps/mobile/src/lib/api-url';
import {resolveDesktopWebUrl} from '../../apps/desktop/electron/web-url';
import {createApiClient, ApiClientError} from '../../packages/api-client/src/index';

afterEach(() => mock.restoreAll());

test('fresh mobile clones and release builds use the live backend; local discovery is opt-in', () => {
  const base = {development:true,platform:'android',hostUri:'192.168.1.20:8081'};
  assert.equal(resolveApiUrl(base),LIVE_API_URL);
  assert.equal(resolveApiUrl({...base,override:'auto'}),'http://192.168.1.20:3000');
  assert.equal(resolveApiUrl({...base,override:'auto',development:false}),LIVE_API_URL);
  assert.equal(resolveApiUrl({...base,override:'auto',hostUri:'metro.exp.direct:443'}),LIVE_API_URL);
  assert.equal(resolveApiUrl({...base,override:'auto',hostUri:undefined}),LIVE_API_URL);
  assert.equal(resolveApiUrl({...base,override:'auto',hostUri:'localhost:8081'}),'http://10.0.2.2:3000');
  assert.equal(resolveApiUrl({...base,override:'auto',platform:'ios',hostUri:'localhost:8081'}),'http://localhost:3000');
  assert.equal(resolveApiUrl({...base,override:'https://backend.example.invalid/api/'}),'https://backend.example.invalid');
  for(const bad of ['javascript:alert(1)','https://user:password@example.invalid','https://example.invalid/login','https://example.invalid?token=x']) assert.equal(normalizeApiUrl(bad),null);
});

test('desktop honors the configured server in development and defaults to live in production', () => {
  assert.equal(resolveDesktopWebUrl(undefined,true),'http://localhost:3000');
  assert.equal(resolveDesktopWebUrl(undefined,false),LIVE_API_URL);
  assert.equal(resolveDesktopWebUrl('https://backend.example.invalid/',true),'https://backend.example.invalid');
  for(const bad of ['file:///tmp/test','https://user:password@example.invalid','http://192.168.1.20:3000']) assert.throws(()=>resolveDesktopWebUrl(bad,true));
});

test('API requests time out, cancel their fetch and report a retryable connection error', async () => {
  let aborted = false;
  mock.method(globalThis,'fetch',(_url:unknown,options:RequestInit)=>new Promise((_resolve,reject)=>{
    options.signal!.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));});
  }));
  await assert.rejects(createApiClient({baseUrl:'https://synthetic.invalid',timeoutMs:10}).auth.me(),(e:unknown)=>e instanceof ApiClientError && e.status===0 && e.message.includes('too long'));
  assert.equal(aborted,true);
});

test('API network errors are understandable and HTTP authentication failures keep their status', async () => {
  mock.method(globalThis,'fetch',async()=>{throw new TypeError('synthetic offline');});
  const api=createApiClient({baseUrl:'https://synthetic.invalid'});
  await assert.rejects(api.auth.me(),(e:unknown)=>e instanceof ApiClientError && e.status===0 && e.message.includes('Cannot reach'));
  mock.restoreAll();mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({message:'Unauthorized'}),{status:401}));
  await assert.rejects(api.auth.me(),(e:unknown)=>e instanceof ApiClientError && e.status===401);
});

const require = createRequire(path.resolve('package.json'));
const {build} = require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
let bundledStore:string;
async function authStore(fetcher:typeof fetch, saved = true) {
  if(!bundledStore) bundledStore=(await build({entryPoints:['apps/mobile/src/stores/auth-store.ts'],bundle:true,write:false,format:'cjs',platform:'node',
    define:{'process.env.NODE_ENV':'"production"','__DEV__':'true'},
    alias:{'react-native':path.resolve('tmp/mobile-stability/react-native.cjs'),'expo-secure-store':path.resolve('tmp/mobile-stability/secure-store.cjs'),
      'expo-constants':path.resolve('tmp/mobile-stability/expo-constants.cjs')},
    plugins:[{name:'notification-boundary',setup(b:any){b.onResolve({filter:/^\.\.\/lib\/notifications$/},()=>({path:path.resolve('tmp/mobile-stability/notifications.cjs')}));}}],
  })).outputFiles[0].text;
  const user={id:'synthetic',name:'Test Student',role:'STUDENT',institute:{code:'ics',name:'ICS'}};
  const items = new Map(saved?[['lumina_auth_token','synthetic-token'],['lumina_user',JSON.stringify(user)]]:[]);
  const module={exports:{} as any};
  const context={module,exports:module.exports,require,URL,AbortController,TypeError,Error,console,setTimeout,clearTimeout,fetch:fetcher,process:{env:{}},
    window:{localStorage:{getItem:(k:string)=>items.get(k)||null,setItem:(k:string,v:string)=>items.set(k,v),removeItem:(k:string)=>items.delete(k)}}};
  vm.runInNewContext(bundledStore,context);
  return {store:module.exports.useAuthStore,items,user};
}

// Tiny native boundaries only. The real Zustand store, storage and API client run below.
import fs from 'node:fs';
import {checkLocalSetup} from '../../scripts/check-local-setup.mjs';
fs.mkdirSync('tmp/mobile-stability',{recursive:true});
fs.writeFileSync('tmp/mobile-stability/react-native.cjs',"exports.Platform={OS:'web'};exports.NativeModules={};");
fs.writeFileSync('tmp/mobile-stability/secure-store.cjs',"exports.getItemAsync=exports.setItemAsync=exports.deleteItemAsync=()=>{throw Error('Native storage called on web');};");
fs.writeFileSync('tmp/mobile-stability/expo-constants.cjs',"exports.default={expoConfig:{}};");
fs.writeFileSync('tmp/mobile-stability/notifications.cjs',"exports.registerForPushNotificationsAsync=async()=>{};");

test('setup checks explain missing configuration without connecting to a database or printing credentials', () => {
  const root=fs.mkdtempSync(path.resolve('tmp/mobile-stability/setup-'));
  const missing=checkLocalSetup('web',root,{},'24.3.0');
  assert.equal(missing.ok,false);
  const configured=checkLocalSetup('web',root,{DATABASE_URL:'postgresql://synthetic:private-sentinel@127.0.0.1:1/offline'},'24.3.0');
  assert.equal(configured.ok,true);
  assert.ok(!configured.messages.join(' ').includes('private-sentinel'));
  assert.equal(checkLocalSetup('web',root,{},'22.0.0').ok,false);
  assert.equal(checkLocalSetup('web',root,{},'24.0.0').ok,false);
});

test('Metro excludes local artifacts without blocking the mobile app or shared packages', () => {
  const config=require(path.resolve('apps/mobile/metro.config.js'));
  const blocked=(f:string)=>config.resolver.blockList.some((rule:RegExp)=>rule.test(path.resolve(f)));
  for(const f of ['tmp/clone/node_modules/example/index.js','.orchestra/product-development/db/file','.agents/skills/example/README.md','apps/web/.next/cache/example.js'])assert.equal(blocked(f),true,f);
  for(const f of ['apps/mobile/app/index.tsx','packages/api-client/src/index.ts'])assert.equal(blocked(f),false,f);
});

test('Worklets Babel dependencies resolve from the plugin under an isolated pnpm installation', () => {
  const mobileRequire=createRequire(path.resolve('apps/mobile/package.json'));
  const pluginRequire=createRequire(mobileRequire.resolve('react-native-worklets/plugin'));
  for(const name of ['@babel/core','@babel/types','@babel/generator','@babel/traverse']) assert.ok(pluginRequire.resolve(name));
});

test('saved sessions survive network/server outages but are removed on a server authentication rejection', async () => {
  for(const status of [0,503,401,403]) {
    const {store,items}=await authStore((async()=>{if(status===0)throw new TypeError('offline');return new Response('{}',{status});}) as typeof fetch);
    await store.getState().initialize();
    assert.equal(store.getState().isLoading,false);
    assert.equal(store.getState().isAuthenticated,status===0||status===503);
    assert.equal(items.has('lumina_auth_token'),status===0||status===503);
  }
});

test('web registration uses browser storage rather than unavailable native SecureStore', async () => {
  const {store,items,user}=await authStore((async()=>new Response(JSON.stringify({token:'synthetic-new-token',user:{id:'synthetic',institute:{code:'ics',name:'ICS'}}}))) as typeof fetch,false);
  await store.getState().register({name:user.name,email:'synthetic@example.invalid',studentNumber:'SYNTHETIC',password:'synthetic-only',confirmPassword:'synthetic-only',instituteCode:'ics',acceptedPolicies:true});
  assert.equal(store.getState().isAuthenticated,true);
  assert.equal(items.get('lumina_auth_token'),'synthetic-new-token');
});
