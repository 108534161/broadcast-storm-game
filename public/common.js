async function api(path,data){let res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let json=await res.json();if(!res.ok)throw Error(json.error||'連線失敗');return json}
function query(key){return new URLSearchParams(location.search).get(key)||''}
function watch(room,callback){let es=new EventSource('/api/events?room='+encodeURIComponent(room));es.onmessage=e=>{try{callback(JSON.parse(e.data))}catch{}};es.onerror=()=>{};return es}
function text(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function statusLabel(s){return {normal:'NORMAL · 正常',warning:'WARNING · 流量升高',storm:'BROADCAST STORM · 風暴'}[s]||s}
function statusClass(s){return s==='normal'?'ok':s==='warning'?'warn':'danger'}
function fmt(n){return Number(n).toLocaleString('zh-TW')}
