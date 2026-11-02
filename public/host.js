const room=query('room').toUpperCase(),secret=query('key');if(!room||!secret)location.replace('/');text('code',room);
const joinUrl=location.origin+'/play.html?room='+encodeURIComponent(room);text('url',joinUrl);
const qr=document.getElementById('qr');qr.src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=16&data='+encodeURIComponent(joinUrl);qr.onerror=()=>{qr.hidden=true;document.getElementById('qrfallback').hidden=false};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(joinUrl).then(()=>alert('已複製加入連結')).catch(()=>prompt('請手動複製：',joinUrl));
let state=null;
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(s){state=s;
 text('players',s.players);text('broadcasts',fmt(s.broadcasts));text('frames',fmt(s.frames));text('active',fmt(s.active));
 text('status',statusLabel(s.status));document.getElementById('status').className='statuspill '+statusClass(s.status);
 let p=Math.min(100,Math.round(s.active/1000*100));text('pct',p+'%');document.getElementById('bar').style.width=p+'%';document.getElementById('bar').className=statusClass(s.status);
 const risky=s.loop&&!s.stp&&!s.fault;
 text('topologyStatus',!s.loop?'拓樸：A–B、A–C（無環路）':s.fault?(s.stp?'A–C 故障：RSTP 讓 B–C 備援轉送':'A–C 故障：經 B–C 轉送'):s.stp?'拓樸：RSTP 阻擋 B–C 埠':'拓樸：沒有迴圈防護');
 text('loop',s.loop?'移除 Loop':'接上 Loop');text('stp',s.stp?'停用 RSTP':'啟用 RSTP');text('fault',s.fault?'修復 A–C':'模擬斷線');
 document.getElementById('fault').disabled=!s.loop;
 document.getElementById('backup').classList.toggle('connected',s.loop);document.getElementById('backup').classList.toggle('blocked',s.loop&&s.stp&&!s.fault);
 document.getElementById('blocked').style.display=s.loop&&s.stp&&!s.fault?'':'none';
 document.getElementById('failedge').style.display=s.fault?'':'none';document.getElementById('faultX').style.display=s.fault?'':'none';
 document.getElementById('tree').style.opacity=s.fault?'0.25':'1';
 text('packetExplain',risky?(s.orbit?'同一批廣播事件仍在環路中重複轉送（模擬循環：'+s.orbit+' 個）。':'未防護的環路已形成；請學生只按一次廣播。'):s.fault&&s.stp?'主線 A–C 斷線，RSTP 讓 B–C 備援轉送；仍維持無環路拓樸。':s.stp&&s.loop?'RSTP 阻擋冗餘 B–C 連接埠，廣播轉送後會結束。':'沒有 Layer 2 迴圈，廣播正常轉送後停止。');
 document.getElementById('events').innerHTML=s.events.slice().reverse().map(e=>'<div class="event"><span>'+new Date(e.time).toLocaleTimeString('zh-TW',{hour12:false})+'</span><p>'+escapeHtml(e.msg)+'</p></div>').join('')||'<p class="fine">等待同學加入……</p>';
 drawParticles(s)
}
function drawParticles(s){
 const g=document.getElementById('particles');g.replaceChildren();
 let n=s.orbit>0?Math.min(12,s.orbit):Math.min(5,Math.ceil(s.active/30));if(n<1)return;
 const routes=s.loop&&!s.stp&&!s.fault?[[280,55],[130,235],[430,235],[280,55]]:s.fault?[[280,55],[130,235],[430,235]]:[[130,235],[280,55],[430,235]];
 const route=routes.map(v=>v.join(' ')).join(' L');
 for(let i=0;i<n;i++){let circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('r','5');circle.setAttribute('fill',s.orbit?'#a15137':'#bc8c55');const an=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');an.setAttribute('dur',s.orbit?'2.5s':'2s');an.setAttribute('repeatCount',s.orbit?'indefinite':'1');an.setAttribute('begin',(i*.23)+'s');an.setAttribute('path','M'+route);circle.appendChild(an);g.appendChild(circle)}
}
async function action(action,value){try{await api('/api/host?room='+encodeURIComponent(room),{secret,action,value})}catch(e){alert(e.message)}}
document.getElementById('loop').onclick=()=>action('loop',!state?.loop);
document.getElementById('stp').onclick=()=>action('stp',!state?.stp);
document.getElementById('fault').onclick=()=>action('fault',!state?.fault);
document.getElementById('reset').onclick=()=>action('reset');
document.getElementById('clear').onclick=()=>action('clear');
watch(room,render);
