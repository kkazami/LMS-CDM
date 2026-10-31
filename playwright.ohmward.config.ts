import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const stateFile=process.env.OHMWARD_BROWSER_STATE;
if(!stateFile || !path.resolve(stateFile).startsWith(path.resolve('tmp/ohmward')+path.sep)) throw Error('Run node tests/ohmward/browser.mjs to provision the owned fixture first.');
const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
if(state.owned!==true || new URL(state.origin).hostname!=='127.0.0.1')throw Error('Owned loopback fixture required.');
export default defineConfig({testDir:'./tests/ohmward/browser',fullyParallel:false,workers:1,retries:0,timeout:120000,outputDir:path.join(state.output,'results'),reporter:[['list']],use:{baseURL:state.origin,channel:'chrome',screenshot:'only-on-failure',trace:'off',viewport:{width:1366,height:768}}});
