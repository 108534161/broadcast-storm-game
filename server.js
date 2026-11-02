'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const PORT=Number(process.env.PORT)||3000;
const ROOT=path.join(__dirname,'public');
const rooms=new Map();
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function roomCode(){let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));return code}
function makeRoom(){const room={code:roomCode(),secret:crypto.randomBytes(18).toString('hex'),players:new Map(),listeners:new Set(),loop:false,stp:true,fault:false,active:0,frames:0,broadcasts:0,orbit:0,created:Date.now(),lastSend:0,events:[]};rooms.set(room.code,room);return room}
function view(room){let status='normal';if(room.loop&&!room.stp&&room.active>=300)status='storm';else if(room.loop&&!room.stp&&room.active>=55)status='warning';return {room:room.code,players:room.players.size,loop:room.loop,stp:room.stp,fault:room.fault,orbit:room.orbit,active:Math.round(room.active),frames:Math.round(room.frames),broadcasts:room.broadcasts,lastSend:room.lastSend,status,events:room.events.slice(-12),uptime:Math.floor((Date.now()-room.created)/1000)}}
function send(res,status,json){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(json))}
function update(room){let data='data: '+JSON.stringify(view(room))+'\n\n';for(let listener of room.listeners){try{listener.write(data)}catch{room.listeners.delete(listener)}}}
function event(room,type,msg){room.events.push({type,msg,time:Date.now()});if(room.events.length>30)room.events.shift()}
function tick(room){
 // 教學用的離散轉送模型：在未防護的完整三角形中，一個廣播事件形成一個持續循環中的影格。
 // 每個 tick 最多沿一條連線轉送一次，沒有憑空指數倍增；不模擬 MAC learning、BPDU 或真實實體速率。
 if(room.loop && !room.stp && !room.fault && room.orbit>0){
   room.frames+=room.orbit;room.active=Math.min(1000,room.active+room.orbit*50);
 }else{
   room.orbit=0;room.active=Math.max(0,room.active-24);
 }
 update(room)
}
setInterval(()=>{for(let r of rooms.values())tick(r)},1000).unref();
setInterval(()=>{let now=Date.now();for(let [code,r] of rooms){if(now-r.created>12*3600*1000){for(let s of r.listeners){try{s.end()}catch{}}rooms.delete(code)}}},60000).unref();
async function body(req){let chunks=[],len=0;for await(let b of req){len+=b.length;if(len>8192)throw Error('請求資料過大');chunks.push(b)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')}
function checkHost(room,req,data){return !!room && (req.headers['x-host-secret']===room.secret || data.secret===room.secret)}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(p==='/api/create'&&req.method==='POST'){let r=makeRoom();event(r,'info','主持人建立教室');return send(res,200,{room:r.code,secret:r.secret})}
 if(p.startsWith('/api/')){
  const code=String(url.searchParams.get('room')||'').toUpperCase();const r=rooms.get(code);
  if(!r)return send(res,404,{error:'找不到教室，請主持人重新建立'});
  if(p==='/api/state'&&req.method==='GET')return send(res,200,view(r));
  if(p==='/api/events'&&req.method==='GET'){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   res.write('retry: 2500\n\n');r.listeners.add(res);res.write('data: '+JSON.stringify(view(r))+'\n\n');req.on('close',()=>r.listeners.delete(res));return;
  }
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  const d=await body(req);
  if(p==='/api/join'){let name=String(d.name||'同學').trim().slice(0,20)||'同學';let id=crypto.randomBytes(12).toString('hex');r.players.set(id,{name,lastSend:0});event(r,'join',name+' 加入了教室');update(r);return send(res,200,{id,name,room:r.code})}
  if(p==='/api/send'){
   const pl=r.players.get(String(d.id||''));if(!pl)return send(res,401,{error:'請先加入教室'});
   if(Date.now()-pl.lastSend<1200)return send(res,429,{error:'發送太快，請稍候再試'});
   pl.lastSend=Date.now();r.lastSend=pl.lastSend;r.broadcasts++;
   // A 接收封包：正常樹狀拓樸示意為有限次轉送；完整且未防護的環形才會持續循環。
   r.frames+=r.loop&&!r.fault?3:2;
   r.active=Math.min(1000,r.active+18);
   if(r.loop&&!r.stp&&!r.fault)r.orbit+=1;event(r,'send',pl.name+' 發送 ARP 廣播');update(r);return send(res,200,{ok:true})
  }
  if(p==='/api/host'){
   if(!checkHost(r,req,d))return send(res,403,{error:'無主持人權限'});
   if(d.action==='loop'){r.loop=!!d.value;if(!r.loop)r.fault=false;r.orbit=0;event(r,'control',r.loop?'主持人接上 B–C 備援連線（形成環路）':'主持人移除迴圈連線')}
   else if(d.action==='stp'){r.stp=!!d.value;if(r.stp)r.orbit=0;event(r,'control',r.stp?'RSTP 已啟用（阻擋迴圈）':'RSTP 已停用（可能形成迴圈）')}
   else if(d.action==='fault'){if(!r.loop)return send(res,400,{error:'請先接上備援連線'});r.fault=!!d.value;r.orbit=0;event(r,'control',r.fault?'A–C 主線故障；'+(r.stp?'RSTP 收斂後改由 B–C 備援轉送':'尚無循環，但仍缺乏 RSTP 防護'):'A–C 主線恢復') }
   else if(d.action==='clear'){r.active=0;r.frames=0;r.broadcasts=0;r.lastSend=0;r.orbit=0;r.events=[];event(r,'control','主持人重置封包計數')}
   else if(d.action==='reset'){r.loop=false;r.stp=true;r.fault=false;r.orbit=0;r.active=0;r.frames=0;r.broadcasts=0;r.events=[];event(r,'control','恢復正常拓樸')}
   else return send(res,400,{error:'未知動作'});
   update(r);return send(res,200,view(r));
  }
  return send(res,404,{error:'找不到 API'});
 }
 let file=p==='/'?'/index.html':p;let target=path.resolve(ROOT,'.'+file);if(!target.startsWith(ROOT+path.sep)&&target!==ROOT)return send(res,403,{error:'Forbidden'});
 fs.readFile(target,(err,bytes)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':contentTypes[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes)});
 }catch(e){send(res,400,{error:e.message||'Request failed'})}});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log('Broadcast Storm Live http://localhost:'+PORT));
module.exports={server,makeRoom,view,rooms};
