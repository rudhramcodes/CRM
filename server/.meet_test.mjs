import mongoose from 'mongoose';
const connect = (await import('./src/config/db.js')).default;
await connect();
for (const p of ['clients/client','leads/lead','auth/auth','tasks/task','projects/project','meetings/meeting'])
  await import(`./src/modules/${p}.model.js`);
const ms = await import('./src/modules/meetings/meeting.service.js');
const userB = new mongoose.Types.ObjectId(), userC = new mongoose.Types.ObjectId();
const dateStr = new Date().toISOString().split('T')[0];
const m4 = await ms.createMeeting({ title:'Review', date:dateStr, startTime:'11:00', endTime:'11:30' }, {_id:userC,name:'Admin'});
console.log('m4', !!m4._id);
const added = await ms.addActionItem(m4._id, { text:'Send invoice draft', assignee:userB.toString() });
console.log('ADDED', added.actionItems.length);
await mongoose.connection.collection('meetings').deleteOne({ _id:m4._id });
await mongoose.disconnect();
