import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LEVELS,getLevel,missingPrerequisites,challengeUnlocked} from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';
import {levelGuide,SURFACE_GUIDES,SANDBOX_UNLOCKS} from '../../apps/web/src/features/interactive-activities/ohmward/domain/guidance';
import {sandboxCapabilities} from '../../apps/web/src/features/interactive-activities/ohmward/domain/workspace';
import { stageLocks } from '../../apps/web/src/features/interactive-activities/ohmward/domain/stages';

test('all thirty activities have actionable tutorials for every learning phase',()=>{
  for(const level of LEVELS)for(let phase=0;phase<5;phase++){
    const guide=levelGuide(level,phase);assert.ok(guide.title.length>5,level.id);assert.ok(guide.steps.length>=1,`${level.id}/${phase}`);
    for(const step of guide.steps){assert.ok(step.title&&step.body.length>40&&step.target.length>5,`${level.id}/${phase}`);assert.ok(['click','change'].includes(step.event));assert.equal('answer' in step,false);}
  }
  assert.equal(levelGuide(getLevel('CIR-02')!,1).steps[0].target,'[data-ohm-tour="explore-resistor"]');
  assert.equal(levelGuide(getLevel('CIR-02')!,2).steps[0].allAnswers,true);
  assert.equal(levelGuide(getLevel('CIR-02')!,2,false,true).steps[0].target,'[data-ohm-tour="build-next"]','a complete saved answer is never changed just to finish a tour');
  assert.equal(levelGuide(getLevel('CIR-02')!,1,true).steps.at(-1)?.target,'[data-ohm-tour="prerequisite"]');
});
test('locked CIR-02 links to the actual missing introduction and CIR-01 without changing progression',()=>{
  const level=getLevel('CIR-02')!;
  assert.deepEqual(missingPrerequisites(level,false,[]).map(x=>x.href),['/ics/activities/ohmward/primer','/ics/activities/ohmward/levels/CIR-01']);
  assert.deepEqual(missingPrerequisites(level,true,[]).map(x=>x.href),['/ics/activities/ohmward/levels/CIR-01']);
  assert.deepEqual(missingPrerequisites(level,true,['CIR-01']),[]);assert.equal(challengeUnlocked('CIR-02',true,['CIR-01']),true);
});
test('Integration guidance identifies the next missing foundation in each module and previous challenge',()=>{
  const level=getLevel('INT-04')!,all=LEVELS.map(l=>l.id);
  assert.deepEqual(missingPrerequisites(level,true,all),[]);
  assert.deepEqual(missingPrerequisites(level,true,all.filter(id=>!['CIR-02','SEN-06','MCU-01','INT-03'].includes(id))).map(x=>x.href),['CIR-02','SEN-06','MCU-01','INT-03'].map(id=>'/ics/activities/ohmward/levels/'+id));
  for(const candidate of LEVELS){assert.deepEqual(missingPrerequisites(candidate,true,all),[]);for(const item of missingPrerequisites(candidate,false,[])){assert.ok(item.href==='/ics/activities/ohmward/primer'||getLevel(item.href.split('/').at(-1)!));}}
});
test('sandbox unlock descriptions match earned server tools and never grant parts by viewing help',()=>{
  assert.deepEqual(sandboxCapabilities([]).parts,[]);
  const full=sandboxCapabilities(LEVELS.map(l=>l.id));assert.deepEqual(new Set(SANDBOX_UNLOCKS.flatMap(group=>group.parts)),new Set(full.parts));
  for(const group of SANDBOX_UNLOCKS){assert.ok(getLevel(group.level));const actual=sandboxCapabilities([group.level]).parts;for(const part of group.parts)assert.ok(actual.includes(part),`${group.level}/${part}`);}
  assert.equal(SURFACE_GUIDES.sandbox.steps[1].target,'[data-ohm-tour="fit"]');
  assert.deepEqual(sandboxCapabilities([]).parts,[]);
});

test('stages require the preceding action, preserve resumable work and never bypass level prerequisites',()=>{
  const initial={unlocked:true,preview:false,furthest:0,hasAttempt:false,submitted:false};
  assert.deepEqual(stageLocks(initial),[null,'Finish Learn first','Finish Try first','Finish Build first','Submit in Prove first']);
  assert.equal(stageLocks({...initial,furthest:1})[1],null);
  assert.equal(stageLocks({...initial,furthest:2,hasAttempt:true})[2],null);
  assert.equal(stageLocks({...initial,hasAttempt:true})[2],null,'an existing draft can resume Build');
  assert.equal(stageLocks({...initial,furthest:3,hasAttempt:true})[3],null);
  assert.equal(stageLocks({...initial,submitted:true,hasAttempt:true})[4],null);
  assert.equal(stageLocks({...initial,unlocked:false,furthest:3,hasAttempt:true})[2],'Pass the prerequisite first');
  assert.equal(stageLocks({...initial,unlocked:false,furthest:3,hasAttempt:true})[3],'Pass the prerequisite first');
  assert.equal(stageLocks({...initial,unlocked:false,preview:true,furthest:2})[2],null,'staff preview has no student mutation');
});
