const {test,after}=require('node:test');const assert=require('node:assert/strict');const {server}=require('../server');
let base;test('start test server',async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port});
async function post(url,body){let r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return [r.status,await r.json()]}
test('host creates classroom, player joins, broadcasts, host controls',async()=>{
 let [s,a]=await post('/api/create',{});assert.equal(s,200);assert.match(a.room,/^[0-9A-F]{6}$/);
 let [,p]=await post('/api/join?room='+a.room,{name:'同學 A'});assert.ok(p.id);
 let [,b]=await post('/api/send?room='+a.room,{id:p.id});assert.equal(b.ok,true);
 let denied=await post('/api/host?room='+a.room,{action:'stp',value:false});assert.equal(denied[0],403);
 let [,c]=await post('/api/host?room='+a.room,{secret:a.secret,action:'loop',value:true});assert.equal(c.loop,true);
 let [,d]=await post('/api/host?room='+a.room,{secret:a.secret,action:'stp',value:false});assert.equal(d.stp,false);
 let state=await fetch(base+'/api/state?room='+a.room).then(r=>r.json());assert.equal(state.players,1);assert.equal(state.broadcasts,1);
});
after(()=>server.close());
