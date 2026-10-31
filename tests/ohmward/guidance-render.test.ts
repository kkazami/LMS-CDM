import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
const require=createRequire(import.meta.url),webRequire=createRequire(path.resolve('apps/web/package.json'));
const {build}=require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
const React=webRequire('react'),{renderToStaticMarkup}=webRequire('react-dom/server');

test('walkthrough launches without sample answers, synthetic controls or automatic page actions',async()=>{
  const built=await build({stdin:{contents:"export {Tutorial} from './apps/web/src/features/interactive-activities/ohmward/components/Tutorial';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',tsconfig:'apps/web/tsconfig.json'});
  const compiled=new Module(path.resolve('apps/web/__ohmward_guide_render.cjs'));compiled.filename=path.resolve('apps/web/__ohmward_guide_render.cjs');compiled.paths=[path.resolve('apps/web/node_modules'),...(require.resolve.paths('react')??[])];compiled._compile(built.outputFiles[0].text,compiled.filename);
  const {Tutorial}=compiled.exports;
  const guide={title:'Matching walkthrough',steps:[{title:'Answer a question',body:'Choose your own answer using the lesson.',target:'[data-ohm-tour="answer"]',event:'change'}]};
  const markup=renderToStaticMarkup(React.createElement(Tutorial,{guide}));
  assert.match(markup,/aria-expanded="false"/);assert.match(markup,/Guide me/);
  assert.match(markup,/use the real controls/);
  assert.doesNotMatch(markup,/<select|<option|Battery|Terminal A|Next tip|Check example match|type="submit"/);
});
