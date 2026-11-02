const room=query('room').toUpperCase(),secret=query('key');if(!room||!secret)location.replace('/');text('code',room);
const joinUrl=location.origin+'/play.html?room='+encodeURIComponent(room);text('url',joinUrl);
const qr=document.getElementById('qr');qr.src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=16&data='+encodeURIComponent(joinUrl);qr.onerror=()=>{qr.hidden=true;document.getElementById('qrfallback').hidden=false};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(joinUrl).then(()=>alert('已複製加入連結')).catch(()=>prompt('請手動複製：',joinUrl));
let state=null;
// 封包動畫使用 requestAnimationFrame，不依賴瀏覽器對 SVG animateMotion 的支援。
let animationKey = '';
let particleStart = 0;
let particleCircles = [];
let particleLoop = false;
let particlePaths = [];
let animationFrame = null;
const SVGNS = 'http://www.w3.org/2000/svg';

function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(s){state=s;
 text('players',s.players);text('broadcasts',fmt(s.broadcasts));text('frames',fmt(s.frames));text('active',fmt(s.active));
 text('status',statusLabel(s.status));document.getElementById('status').className='statuspill '+statusClass(s.status);
 let p=Math.min(100,Math.round(s.active/1000*100));text('pct',p+'%');document.getElementById('bar').style.width=p+'%';document.getElementById('bar').className=statusClass(s.status);
 const risky=s.loop&&!s.stp&&!s.fault;
 text('topologyStatus',!s.loop?'拓樸：A–B、A–C（無環路）':s.fault?(s.stp?'A–C 故障：RSTP 讓 B–C 備援轉送':'A–C 故障：經 B–C 轉送'):s.stp?'拓樸：RSTP 阻擋 B–C 埠':'拓樸：沒有迴圈防護');
 text('loop',s.loop?'移除 B–C 備援線':'接上 B–C 備援線');text('stp',s.stp?'停用 RSTP':'啟用 RSTP');text('fault',s.fault?'修復 A–C':'模擬斷線');
 document.getElementById('fault').disabled=!s.loop||!s.stp;
 text('liveState','目前：'+(s.loop?'B–C 備援線已接上':'沒有 B–C 備援線')+' ／ RSTP '+(s.stp?'已啟用':'已停用')+' ／ A–C '+(s.fault?'已故障':'正常')+' ／ '+(s.orbit?'有廣播事件正在循環':'無持續循環'));
 document.getElementById('backup').classList.toggle('connected',s.loop);document.getElementById('backup').classList.toggle('blocked',s.loop&&s.stp&&!s.fault);
 document.getElementById('blocked').style.display=s.loop&&s.stp&&!s.fault?'':'none';
 document.getElementById('failedge').style.display=s.fault?'':'none';document.getElementById('faultX').style.display=s.fault?'':'none';
 document.getElementById('edgeAC').style.opacity=s.fault?'0.2':'1';
 text('packetExplain',risky?(s.orbit?'同一批廣播事件仍在環路中重複轉送（模擬循環：'+s.orbit+' 個）。':'未防護的環路已形成；請學生只按一次廣播。'):s.fault&&s.stp?'主線 A–C 斷線，RSTP 讓 B–C 備援轉送；仍維持無環路拓樸。':s.stp&&s.loop?'RSTP 阻擋冗餘 B–C 連接埠，廣播轉送後會結束。':'沒有 Layer 2 迴圈，廣播正常轉送後停止。');
 document.getElementById('events').innerHTML=s.events.slice().reverse().map(e=>'<div class="event"><span>'+new Date(e.time).toLocaleTimeString('zh-TW',{hour12:false})+'</span><p>'+escapeHtml(e.msg)+'</p></div>').join('')||'<p class="fine">等待同學加入……</p>';
 drawParticles(s)
}
// 模擬動畫：有限次轉送在 2.3 秒內完成；只有沒有 RSTP 防護的完整環路會持續運動。
// 每次 SSE 狀態更新不會清空正在執行的動畫。
function interpolate(path, t) {
 const lengths=[];let total=0;
 for(let i=1;i<path.length;i++){
  let seg=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);
  lengths.push(seg);total+=seg;
 }
 let d=Math.max(0,Math.min(1,t))*total;
 for(let i=0;i<lengths.length;i++){
  if(d<=lengths[i]||i===lengths.length-1){
   const r=lengths[i]?d/lengths[i]:0;
   return [path[i][0]+(path[i+1][0]-path[i][0])*r,path[i][1]+(path[i+1][1]-path[i][1])*r];
  }
  d-=lengths[i];
 }
 return path[path.length-1];
}
function stopParticles(){
 if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null;}
 document.getElementById('particles').replaceChildren();
 particleCircles=[];
}
function animateParticles(now){
 if(!particleCircles.length){animationFrame=null;return;}
 const elapsed=now-particleStart;
 const duration=particleLoop?2400:2300;
 if(!particleLoop&&elapsed>=duration+180){
  stopParticles();animationFrame=null;return;
 }
 particleCircles.forEach((circle,i)=>{
  const fraction=particleLoop?((elapsed+i*240)%duration)/duration:Math.min(1,Math.max(0,(elapsed-i*180)/duration));
  const [x,y]=interpolate(particlePaths[i],fraction);
  circle.setAttribute('cx',x.toFixed(2));circle.setAttribute('cy',y.toFixed(2));
 });
 animationFrame=requestAnimationFrame(animateParticles);
}
function drawParticles(s){
 const cycling=Boolean(s.loop&&!s.stp&&!s.fault&&s.orbit>0);
 const recentlySent=s.lastSend>0&&Date.now()-s.lastSend<3200;
 // 不以伺服器定期推播重置動畫；只有新廣播或拓樸改變才更新。
 const key=[s.lastSend,s.loop,s.stp,s.fault,cycling].join(':');
 if(animationKey===key)return;
 animationKey=key;
 stopParticles();
 if(!cycling&&!recentlySent)return;
 particleLoop=cycling;
 particlePaths=cycling?[
  [[280,55],[130,235],[430,235],[280,55]],
  [[280,55],[430,235],[130,235],[280,55]]
 ]:s.fault?[
  [[280,55],[130,235],[430,235]]
 ]:[
  [[280,55],[130,235]],
  [[280,55],[430,235]]
 ];
 const layer=document.getElementById('particles');
 particleCircles=particlePaths.map((_,i)=>{
  const circle=document.createElementNS(SVGNS,'circle');
  circle.setAttribute('r',cycling?'8':'7');
  circle.setAttribute('fill',cycling?'#ae4833':'#c38b35');
  circle.setAttribute('stroke','#fffdf8');
  circle.setAttribute('stroke-width','2');
  layer.appendChild(circle);
  return circle;
 });
 particleStart=performance.now();
 animationFrame=requestAnimationFrame(animateParticles);
}

async function action(action,value){try{await api('/api/host?room='+encodeURIComponent(room),{secret,action,value})}catch(e){alert(e.message)}}
document.getElementById('loop').onclick=()=>action('loop',!state?.loop);
document.getElementById('stp').onclick=()=>action('stp',!state?.stp);
document.getElementById('fault').onclick=()=>action('fault',!state?.fault);
document.getElementById('reset').onclick=()=>action('reset');
document.getElementById('clear').onclick=()=>action('clear');
watch(room,render);
