const room=query('room').toUpperCase(),secret=query('key');if(!room||!secret)location.replace('/');text('code',room);
const joinUrl=location.origin+'/play.html?room='+encodeURIComponent(room);text('url',joinUrl);
const qr=document.getElementById('qr');qr.src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=16&data='+encodeURIComponent(joinUrl);qr.onerror=()=>{qr.hidden=true;document.getElementById('qrfallback').hidden=false};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(joinUrl).then(()=>alert('已複製加入連結')).catch(()=>prompt('請手動複製：',joinUrl));
let state=null;
function render(s){state=s;text('players',s.players);text('broadcasts',fmt(s.broadcasts));text('frames',fmt(s.frames));text('active',fmt(s.active));text('status',statusLabel(s.status));document.getElementById('status').className='statuspill '+statusClass(s.status);let p=Math.min(100,Math.round(s.active/2000*100));text('pct',p+'%');document.getElementById('bar').style.width=p+'%';document.getElementById('bar').className=statusClass(s.status);
 text('topologyStatus',s.loop?(s.stp?'拓樸：STP 阻擋迴圈':'拓樸：未受保護的 Loop'):'拓樸：無迴圈');text('loop',s.loop?'移除 Loop':'接上 Loop');text('stp',s.stp?'停用 STP':'啟用 STP');document.getElementById('backup').classList.toggle('connected',s.loop);document.getElementById('backup').classList.toggle('blocked',s.loop&&s.stp);document.getElementById('blocked').style.display=s.loop&&s.stp?'':'none';
 document.getElementById('events').innerHTML=s.events.slice().reverse().map(e=>'<div class="event"><span>'+new Date(e.time).toLocaleTimeString('zh-TW',{hour12:false})+'</span><p>'+escapeHtml(e.msg)+'</p></div>').join('')||'<p class="fine">等待同學加入……</p>';
 drawParticles(s)}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawParticles(s){let n=Math.min(35,Math.round(s.active/12));let group=document.getElementById('particles');group.replaceChildren();let points=[[280,55],[130,235],[430,235]];for(let i=0;i<n;i++){let a=points[i%3],b=points[(i+1)%3],circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('r',i%4===0?'5':'3');circle.setAttribute('fill',s.status==='storm'?'#a15137':'#bc8c55');let animate=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');animate.setAttribute('dur',(1.2+(i%5)*0.25)+'s');animate.setAttribute('repeatCount','indefinite');animate.setAttribute('path',`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`);circle.appendChild(animate);group.appendChild(circle)}}
async function action(action,value){try{await api('/api/host?room='+encodeURIComponent(room),{secret,action,value})}catch(e){alert(e.message)}}
document.getElementById('loop').onclick=()=>action('loop',!state?.loop);
document.getElementById('stp').onclick=()=>action('stp',!state?.stp);
document.getElementById('reset').onclick=()=>action('reset');
document.getElementById('clear').onclick=()=>action('clear');
watch(room,render);
