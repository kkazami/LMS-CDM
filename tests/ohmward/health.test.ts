import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{compile}=require('../web-quality/compile.cjs');
test('enabled-feature health fails closed for missing tables, grants or unqualified principals',async()=>{
  const previous=process.env.OHMWARD_ENABLED;process.env.OHMWARD_ENABLED='true';
  try{
    for(const [ready,qualified,status]of [[true,true,200],[false,true,503],[true,false,503]]){
      const api=await compile("export {GET} from './apps/web/src/app/api/health/route';",{db:{$queryRaw:async()=>[{ready,qualified}]}});
      const response=await api.GET();assert.equal(response.status,status);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{status:status===200?'ok':'unavailable'});
    }
  }finally{if(previous===undefined)delete process.env.OHMWARD_ENABLED;else process.env.OHMWARD_ENABLED=previous;}
});
