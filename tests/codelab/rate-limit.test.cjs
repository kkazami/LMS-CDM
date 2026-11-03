const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require(require.resolve('esbuild', { paths:[path.dirname(require.resolve('tsx'))] }));

async function limiter(query) {
  const result = await build({ entryPoints:['apps/web/src/lib/codelab-rate-limit.ts'], bundle:true, write:false,
    platform:'node', format:'cjs', tsconfig:'apps/web/tsconfig.json', plugins:[{name:'db-boundary',setup(b){
      b.onResolve({filter:/^@\/lib\/(db|super-user-v1\/actor)$/}, args=>({path:args.path,namespace:'test'}));
      b.onLoad({filter:/.*/,namespace:'test'}, args=>({contents:args.path.endsWith('/db')
        ? 'export const db = { $queryRaw: globalThis.__limitQuery };'
        : 'export class AccessError extends Error {constructor(status,message){super(message);this.status=status}}'}));
    }}] });
  globalThis.__limitQuery = query;
  const module = {exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  delete globalThis.__limitQuery;
  return module.exports.limitCodeLabRuns;
}

test('database buckets enforce 30 requests per user and are shared across limiter instances', async () => {
  const buckets = new Map();
  const query = async (sql,key,window) => {
    assert.match(sql.join('?'), /ON CONFLICT/);
    assert.equal(window,300000);
    const count = (buckets.get(key)||0)+1; buckets.set(key,count);
    return [{count}];
  };
  const a = await limiter(query), b = await limiter(query);
  for(let i=0;i<30;i++) assert.equal(await (i%2?a:b)('student'),null);
  const response = await a('student');
  assert.equal(response.status,429); assert.equal(response.headers.get('Retry-After'),'300');
  assert.equal(await b('other-student'),null);
});

test('database failure fails closed instead of allowing an unmetered execution', async () => {
  const limit = await limiter(async()=>{throw Error('database unavailable')});
  await assert.rejects(limit('student'),/database unavailable/);
});
