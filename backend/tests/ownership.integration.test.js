const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
let users = [], server, base, headers, foreign;
before(async () => {
 const app = express(); app.use(express.json());
 for (const name of ['resources','habits','supplements','workout','finance','roadmap','checklist','schedule','data','search']) app.use('/'+name, require('../src/routes/'+name+'.routes'));
 app.use(require('../src/middleware/errorHandler'));
 server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r)); base='http://127.0.0.1:'+server.address().port;
 for(let i=0;i<2;i++) users.push(await prisma.user.create({data:{name:'Disposable ownership fixture', googleId:`ownership-${Date.now()}-${i}`}}));
 headers={'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({userId:users[0].id},process.env.JWT_SECRET)};
 foreign=await prisma.habit.create({data:{userId:users[1].id,name:'foreign secret',order:1}});
});
after(async()=>{for(const u of users)await prisma.user.delete({where:{id:u.id}});if(server)await new Promise(r=>server.close(r));await prisma.$disconnect();});
const call=(path,method='GET',body)=>fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
test('foreign mutation, log, streak and reorder are rejected without changes',async()=>{
 for(const [path,method,body] of [[`/habits/${foreign.id}`,'PUT',{name:'stolen'}],[`/habits/${foreign.id}/log`,'POST',{done:true}],[`/habits/streak/${foreign.id}`,'GET'],['/habits/reorder','PATCH',{habitIds:[foreign.id]}]]) assert.equal((await call(path,method,body)).status,404);
 assert.equal((await prisma.habit.findUnique({where:{id:foreign.id}})).name,'foreign secret');
});
test('export works and importing foreign IDs creates independent owned copies',async()=>{
 const response=await call('/data/export');assert.equal(response.status,200);
 const data=(await response.json()).data;assert.deepEqual(data.habits,[]);
 assert.equal((await call('/data/import','POST',{data:{habits:[foreign]}})).status,200);
 const copy=await prisma.habit.findFirst({where:{userId:users[0].id}});assert.notEqual(copy.id,foreign.id);
 assert.equal((await prisma.habit.findUnique({where:{id:foreign.id}})).userId,users[1].id);
});
test('every record domain rejects foreign writes and preserves all records', async()=>{
 const owner=users[1].id;
 const fixtures=[
  ['resources','resource',{topic:'secret',name:'secret',order:1}],
  ['schedule','scheduleBlock',{dayType:'workday',startTime:'08:00',endTime:'09:00',activity:'secret',category:'test',order:1}],
  ['checklist','checklistItem',{text:'secret',order:1}],
  ['finance','financeEntry',{month:'2099-01'}],
  ['finance/debts','debt',{title:'secret',totalAmount:10,monthlyPay:1}],
  ['supplements/timeslots','timeSlot',{label:'secret',time:'08:00',order:1}],
  ['roadmap/phases','phase',{title:'secret',duration:'month',goal:'secret',order:1}],
  ['workout/sessions','workoutSession',{day:'Monday',startTime:'08:00',endTime:'09:00',type:'secret',duration:'60'}],
 ];
 for(const [route,model,data] of fixtures){
  const row=await prisma[model].create({data:{userId:owner,...data}});
  for(const method of ['PUT',...(model==='financeEntry'?[]:['DELETE'])]) assert.equal((await call('/'+route+'/'+row.id,method,method==='PUT'?data:undefined)).status,404,route+' '+method);
  assert.ok(await prisma[model].findFirst({where:{id:row.id,userId:owner}}));
 }
});
test('nested parents, mismatched child IDs and whole reorder payloads are validated before writes',async()=>{
 const makePhase=async userId=>prisma.phase.create({data:{userId,title:'phase',duration:'month',goal:'goal',order:1,tasks:{create:{month:1,topic:'secret',order:1}}},include:{tasks:true}});
 const own=await makePhase(users[0].id),other=await makePhase(users[1].id);
 assert.equal((await call(`/roadmap/phases/${other.id}/tasks`)).status,404);
 assert.equal((await call(`/roadmap/phases/${other.id}/tasks`,'POST',{month:1,topic:'intruder'})).status,404);
 for(const method of ['PUT','DELETE','PATCH']) assert.equal((await call(`/roadmap/phases/${own.id}/tasks/${other.tasks[0].id}${method==='PATCH'?'/toggle':''}`,method,{done:true})).status,404);
 assert.equal((await call('/roadmap/phases/reorder','PATCH',{orderedIds:[own.id,other.id]})).status,404);
 assert.equal((await prisma.phase.findUnique({where:{id:own.id}})).order,1);
 const session=await prisma.workoutSession.create({data:{userId:users[0].id,day:'Monday',startTime:'08:00',endTime:'09:00',type:'test',duration:'60',exercises:{create:{name:'own',order:1}}},include:{exercises:true}});
 const foreignSession=await prisma.workoutSession.findFirst({where:{userId:users[1].id}});
 const exercise=await prisma.exercise.create({data:{sessionId:foreignSession.id,name:'foreign',order:1}});
 assert.equal((await call(`/workout/sessions/${session.id}`,'PUT',{exercises:[{id:exercise.id,name:'stolen'}]})).status,404);
 assert.equal(await prisma.exercise.count({where:{sessionId:session.id}}),1);
 for(const [path,body] of [[`/workout/sessions/${foreignSession.id}/exercises`,{name:'bad'}],['/workout/log',{sessionId:foreignSession.id}],['/supplements',{timeSlotId:(await prisma.timeSlot.findFirst({where:{userId:users[1].id}})).id,name:'bad'}]]) assert.equal((await call(path,'POST',body)).status,404);
});
test('supplement lists and stats exclude foreign data, and roundtrip remaps nested logs',async()=>{
 const foreignSlot=await prisma.timeSlot.findFirst({where:{userId:users[1].id}});
 const foreignSupp=await prisma.supplement.create({data:{timeSlotId:foreignSlot.id,name:'private supplement',order:1}});
 await prisma.supplementLog.create({data:{supplementId:foreignSupp.id,taken:true}});
 assert.deepEqual(await (await call('/supplements')).json(),[]);
 assert.equal((await (await call('/supplements/stats')).json()).taken,0);
 assert.equal((await call('/supplements/log','POST',{supplementId:foreignSupp.id,taken:true})).status,404);
 assert.deepEqual((await (await call('/search?q=private')).json()).results,[]);
 const exported=(await (await call('/data/export')).json()).data;
 const originalHabit=exported.habits[0];
 exported.habitLogs=[{id:1,habitId:originalHabit.id,date:new Date().toISOString(),done:true}];
 assert.equal((await call('/data/import','POST',{data:exported})).status,200);
 const ownLogs=await prisma.habitLog.findMany({where:{habit:{userId:users[0].id}}});assert.equal(ownLogs.length,1);assert.notEqual(ownLogs[0].habitId,originalHabit.id);
 const before=await prisma.habit.count({where:{userId:users[0].id}});
 assert.equal((await call('/data/import','POST',{data:{habits:[{name:'rollback',order:1}],habitLogs:[{habitId:foreign.id,date:new Date().toISOString(),done:true}]}})).status,400);
 assert.equal(await prisma.habit.count({where:{userId:users[0].id}}),before);
});
test('foreign child identifiers cannot be changed or deleted directly', async()=>{
 const slot=await prisma.timeSlot.findFirst({where:{userId:users[1].id}});
 const supplement=await prisma.supplement.findFirst({where:{timeSlotId:slot.id}});
 const session=await prisma.workoutSession.findFirst({where:{userId:users[1].id}});
 const exercise=await prisma.exercise.findFirst({where:{sessionId:session.id}});
 const log=await prisma.workoutLog.create({data:{userId:users[1].id,sessionId:session.id}});
 for(const [path,body] of [[`/supplements/${supplement.id}`,{name:'changed'}],[`/workout/exercises/${exercise.id}`,{name:'changed'}]]) {
  assert.equal((await call(path,'PUT',body)).status,404);
  assert.equal((await call(path,'DELETE')).status,404);
 }
 assert.equal((await call(`/workout/log/${log.id}`,'DELETE')).status,404);
 const habit=await prisma.habit.findFirst({where:{userId:users[0].id}});
 assert.equal((await call(`/habits/${habit.id}`,'PUT',{name:'own changed'})).status,200);
 assert.equal((await call(`/habits/${habit.id}/log`,'POST',{date:'2099-01-01',done:true})).status,201);
});
test('malformed numeric paths cannot bypass ownership and static endpoints remain usable',async()=>{
 const item=await prisma.checklistItem.findFirst({where:{userId:users[1].id}});
 const supplement=await prisma.supplement.findFirst({where:{timeSlot:{userId:users[1].id}}});
 for(const suffix of ['abc','%61bc','%20','e0']) {
  assert.equal((await call(`/checklist/${item.id}${suffix}`,'PUT',{text:'stolen'})).status,404);
  assert.equal((await call(`/supplements/${supplement.id}${suffix}`,'DELETE')).status,404);
 }
 for(const id of ['0x'+item.id.toString(16),'0','-1','1.0','9007199254740992']) assert.equal((await call('/checklist/'+id,'PUT',{text:'stolen'})).status,404);
 for(const path of ['/supplements/stats','/supplements/log','/supplements/timeslots','/habits/log']) assert.equal((await call(path)).status,200);
});
test('creating workout sessions ignores provided exercise IDs as before',async()=>{
 const response=await call('/workout/sessions','POST',{day:'Monday',startTime:'08:00',endTime:'09:00',type:'test',duration:'60',exercises:[{id:987654,name:'fresh exercise',order:1}]});
 assert.equal(response.status,201);
 const session=await response.json();assert.notEqual(session.exercises[0].id,987654);
});
