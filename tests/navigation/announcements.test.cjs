const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const {build} = require(require.resolve('esbuild', {paths: [path.dirname(require.resolve('tsx'))]}));

async function load(user, classes = [{id:'assigned', title:'Programming', code:'CS101'}]) {
  const reads = [];
  globalThis.__announcementTest = {user, db: {
    course: {findMany: async query => {reads.push(['courses',query]); return classes;}},
    enrollment: {findMany: async query => {reads.push(['enrollments',query]); return classes.map(course => ({course}));}},
    announcement: {findMany: async query => {reads.push(['announcements',query]); return []; }},
  }};
  const bundle = await build({
    stdin: {contents: "export {default} from './apps/web/src/app/(dashboard)/[institute]/announcements/page';", resolveDir:process.cwd()},
    bundle:true, write:false, platform:'node', format:'cjs', jsx:'automatic', tsconfig:'apps/web/tsconfig.json',
    nodePaths:[path.resolve('apps/web/node_modules')],
    plugins:[{name:'service-boundaries', setup(b) {
      b.onResolve({filter:/^next\/navigation$|^@\/lib\/(db|super-user-v1\/legacy-entry-guard)$|^\.\/client$/}, ({path}) => ({path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'}, ({path}) => ({contents:
        path==='next/navigation' ? 'export function redirect(url){throw new Error("REDIRECT:"+url)}' :
        path.endsWith('/db') ? 'export const db=globalThis.__announcementTest.db;' :
        path.endsWith('legacy-entry-guard') ? 'export async function requireLegacyActor(){return globalThis.__announcementTest.user}' :
        'export default function Client(){return null}'
      }));
    }}],
  });
  const compiled = new Module(path.resolve('tmp/announcements-built.cjs'), module);
  compiled.filename = path.resolve('tmp/announcements-built.cjs'); compiled.paths = module.paths;
  compiled._compile(bundle.outputFiles[0].text, compiled.filename);
  return {render: () => compiled.exports.default({params:Promise.resolve({institute:'ics'})}), reads};
}
const actor = role => ({id:'instructor', role, institute:{id:'ics-id', code:'ics'}});

test('faculty and program heads open Alerts with only their active assigned classes', async () => {
  for (const role of ['PROFESSOR','TEACHER','INSTRUCTOR']) {
    const {render,reads} = await load({...actor(role), programHeadProgramIds:['bsit']});
    const page = await render();
    assert.equal(page.props.isInstructor,true);
    assert.deepEqual(reads[0][1].where,{instructorId:'instructor',instituteId:'ics-id',isArchived:false});
    assert.deepEqual(reads[1][1].where,{courseId:{in:['assigned']}});
    assert.ok(!reads.some(([name])=>name==='enrollments'));
  }
});
test('student Alerts retain approved enrollments and institute scope', async () => {
  const {render,reads} = await load(actor('STUDENT'));
  const page = await render();
  assert.equal(page.props.isInstructor,false);
  assert.deepEqual(reads[0][1].where,{studentId:'instructor',status:'APPROVED',course:{instituteId:'ics-id',isArchived:false}});
  assert.deepEqual(reads[1][1].where,{courseId:{in:['assigned']}});
});
test('faculty without assigned classes get an empty feed without a broad announcement query', async () => {
  const {render,reads} = await load(actor('PROFESSOR'),[]);
  const page = await render();
  assert.deepEqual(page.props.announcements,[]);
  assert.deepEqual(page.props.enrolledCourses,[]);
  assert.equal(reads.length,1);
});
test('wrong institute and unrelated roles cannot read class announcements', async () => {
  for(const user of [{...actor('PROFESSOR'),institute:{id:'foreign',code:'ite'}},actor('ADMIN')]) {
    const {render,reads} = await load(user);
    await assert.rejects(render(),/REDIRECT:/);
    assert.equal(reads.length,0);
  }
});
