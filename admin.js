WREADY.then(()=>{const{sb,esc,fmt,me,M}=W;if(!sb)return;
if(me?.role!=="admin"){M.innerHTML='<div class="wrap"><div class="empty" style="margin:80px 0">Доступ только для автора. <a href="login.html" style="color:var(--ac)">Войти</a></div></div>';return}
const PF=[["title","Заголовок","text"],["category","Категория","text"],["excerpt","Краткое описание","area"],["body","Текст","area"],["cover","Фотография / обложка","file:image/*"],["published_at","Дата публикации","date"],["published","Опубликовать (иначе черновик)","bool"]];
const E={albums:{t:"albums",n:"Альбомы",f:[["title","Название","text"],["year","Год","number"],["description","Описание","area"],["story","История альбома","area"],["cover","Обложка","file:image/*"],["published","Опубликовать","bool"]],s:r=>`${r.title} (${r.year||"—"})`},
 tracks:{t:"tracks",n:"Песни",f:[["title","Название","text"],["album_id","Альбом","album"],["position","Номер в альбоме","number"],["audio","MP3-файл (до 50 МБ)","file:audio/*"],["cover","Обложка","file:image/*"],["lyrics","Текст песни","area"],["story","История создания","area"],["published_at","Дата публикации","date"],["published","Опубликовать","bool"]],s:r=>r.title},
 journal:{t:"posts",kind:"journal",n:"Дневник",f:PF,s:r=>r.title},stories:{t:"posts",kind:"story",n:"Истории",f:PF,s:r=>r.title}};
const T=[...Object.keys(E),"users","comments","stats"],TN={...Object.fromEntries(Object.entries(E).map(([k,v])=>[k,v.n])),users:"Пользователи",comments:"Комментарии",stats:"Статистика"};
const G=p=>p.then(r=>{if(r.error)alert(r.error.message);return r.data||[]});
let tab="albums";const root=document.createElement("div");root.className="wrap";M.innerHTML="";M.appendChild(root);
function shell(){root.innerHTML=`<section class="hero" style="padding:48px 0 0"><div class="eyebrow">управление</div><h1 style="font-size:48px">Панель wserf</h1></section><div class="tabs">${T.map(k=>`<button data-t="${k}" class="${k===tab?"on":""}">${TN[k]}</button>`).join("")}</div><div id="ad"></div>`;
 root.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;shell();show()})}
const ad=()=>document.getElementById("ad");
async function show(){const x=ad();x.innerHTML="Загрузка…";if(E[tab])return crud(E[tab]);if(tab==="users")return users();if(tab==="comments")return comm();return stats()}
async function crud(e,row){let q=sb.from(e.t).select("*").order("created_at",{ascending:false});if(e.kind)q=q.eq("kind",e.kind);const rows=await G(q);
 ad().innerHTML=`<button class="btn" id="new" style="margin:0 0 20px">+ Добавить</button><div id="fm"></div>${rows.map(r=>`<div class="row"><span>${esc(e.s(r))} ${r.published?"":'<small style="color:var(--t2)">· черновик</small>'}</span><button class="btn ghost sm" data-e="${r.id}">Изменить</button><button class="btn ghost sm" data-x="${r.id}" style="color:#e7a39a">Удалить</button></div>`).join("")||'<div class="empty">Пока пусто.</div>'}`;
 document.getElementById("new").onclick=()=>form(e,{});
 ad().querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>form(e,rows.find(r=>r.id===b.dataset.e)));
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(confirm("Удалить безвозвратно?")){await G(sb.from(e.t).delete().eq("id",b.dataset.x));crud(e)}})}
async function form(e,row){const albs=e.f.some(f=>f[2]==="album")?await G(sb.from("albums").select("id,title")):[];
 const fm=document.getElementById("fm");fm.innerHTML=`<form class="frm glass">${e.f.map(([k,l,ty])=>{const v=row[k];
  if(ty==="text")return `<label>${l}<input name="${k}" value="${esc(v)}"></label>`;if(ty==="number")return `<label>${l}<input type="number" name="${k}" value="${esc(v)}"></label>`;
  if(ty==="area")return `<label>${l}<textarea name="${k}" rows="${k==="body"||k==="lyrics"?10:4}">${esc(v)}</textarea></label>`;
  if(ty==="date")return `<label>${l}<input type="date" name="${k}" value="${esc((v||"").slice(0,10))}"></label>`;
  if(ty==="bool")return `<label class="ck"><input type="checkbox" name="${k}" ${v?"checked":""}>${l}</label>`;
  if(ty==="album")return `<label>${l}<select name="${k}"><option value="">— без альбома —</option>${albs.map(a=>`<option value="${a.id}" ${a.id===v?"selected":""}>${esc(a.title)}</option>`).join("")}</select></label>`;
  return `<label>${l}<input type="file" name="${k}" accept="${ty.split(":")[1]}">${v?`<small>Сейчас загружено: <a href="${esc(v)}" target="_blank" style="color:var(--ac)">открыть</a>. Выберите файл, чтобы заменить.</small>`:""}</label>`}).join("")}
  <div><button class="btn" style="margin:0">Сохранить</button> <button type="button" class="btn ghost" id="cn">Отмена</button></div><div class="er" id="ae"></div></form>`;
 document.getElementById("cn").onclick=()=>fm.innerHTML="";fm.scrollIntoView({behavior:"smooth"});
 fm.firstChild.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(ev.target),o={},er=document.getElementById("ae"),btn=ev.target.querySelector(".btn");btn.disabled=true;er.textContent="Сохраняю…";
  for(const[k,l,ty]of e.f){if(ty.startsWith("file")){const f=fd.get(k);if(f&&f.size){const p=e.t+"/"+Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]/g,"_");const{error}=await sb.storage.from("media").upload(p,f);if(error){er.textContent="Ошибка загрузки: "+error.message;btn.disabled=false;return}o[k]=sb.storage.from("media").getPublicUrl(p).data.publicUrl}}
   else if(ty==="bool")o[k]=!!fd.get(k);else if(ty==="number")o[k]=fd.get(k)===""?null:+fd.get(k);else if(ty==="date"){if(fd.get(k))o[k]=fd.get(k)}else if(ty==="album")o[k]=fd.get(k)||null;else o[k]=fd.get(k)}
  if(e.kind)o.kind=e.kind;const{error}=row.id?await sb.from(e.t).update(o).eq("id",row.id):await sb.from(e.t).insert(o);
  if(error){er.textContent=error.message;btn.disabled=false}else crud(e)}}
async function users(){const[u,c,l]=await Promise.all([G(sb.from("profiles").select("*").order("created_at",{ascending:false})),G(sb.from("comments").select("user_id")),G(sb.from("likes").select("user_id"))]);
 const n=(a,id)=>a.filter(x=>x.user_id===id).length;
 ad().innerHTML=u.map(r=>`<div class="row"><span><b>${esc(r.nick)}</b> ${r.role==="admin"?"· автор":""}${r.banned?" · <em>ограничен</em>":""}<br><small style="color:var(--t2)">с ${fmt(r.created_at)} · лайков: ${n(l,r.id)} · комментариев: ${n(c,r.id)}</small></span>${r.role==="admin"?"":`<button class="btn ghost sm" data-b="${r.id}" data-v="${!r.banned}">${r.banned?"Снять ограничение":"Ограничить"}</button><button class="btn ghost sm" data-x="${r.id}" style="color:#e7a39a">Удалить</button>`}</div>`).join("");
 ad().querySelectorAll("[data-b]").forEach(b=>b.onclick=async()=>{await G(sb.rpc("admin_set_ban",{uid:b.dataset.b,b:b.dataset.v==="true"}));users()});
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(confirm("Удалить пользователя и все его данные?")){await G(sb.rpc("admin_delete_user",{uid:b.dataset.x}));users()}})}
async function comm(){const c=await G(sb.from("comments").select("*,profiles(nick)").order("created_at",{ascending:false}).limit(100));
 ad().innerHTML=c.map(r=>`<div class="row"><span><b>${esc(r.profiles?.nick)}</b> · ${fmt(r.created_at)}<br>${esc(r.sticker||r.body||"")}${r.gif_url?` <a href="${esc(r.gif_url)}" target="_blank" style="color:var(--ac)">GIF</a>`:""}</span><button class="btn ghost sm" data-x="${r.id}" style="color:#e7a39a">Удалить</button></div>`).join("")||'<div class="empty">Нет комментариев.</div>';
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{await G(sb.from("comments").delete().eq("id",b.dataset.x));comm()})}
async function stats(){const{data:s,error}=await sb.rpc("admin_stats");if(error){ad().innerHTML=esc(error.message);return}const lk=await G(sb.from("likes").select("profiles(nick),tracks(title)"));
 const by={};lk.forEach(l=>{const t=l.tracks?.title||"?";(by[t]=by[t]||[]).push(l.profiles?.nick)});const mx=Math.max(1,...s.by_day.map(d=>d.n));
 ad().innerHTML=`<div class="stat">${[["users","Пользователей"],["views","Просмотров"],["likes","Лайков"],["comments","Комментариев"]].map(([k,l])=>`<div class="glass"><b>${s[k]}</b>${l}</div>`).join("")}</div>
 <h3>Просмотры за 14 дней</h3><div class="bars glass" style="margin:12px 0 28px">${s.by_day.map(d=>`<i title="${d.day}: ${d.n}" style="height:${d.n/mx*100}%"></i>`).join("")}</div>
 <h3>Популярные песни</h3>${s.top_tracks.map(t=>`<div class="row"><span>${esc(t.title)}</span><small>♥ ${t.likes} · просмотров ${t.views}</small></div>`).join("")||'<div class="empty">Нет данных.</div>'}
 <h3 style="margin-top:28px">Популярные записи</h3>${s.top_posts.map(t=>`<div class="row"><span>${esc(t.title)}</span><small>просмотров ${t.views} · комментариев ${t.comments}</small></div>`).join("")||'<div class="empty">Нет данных.</div>'}
 <h3 style="margin-top:28px">Кто лайкнул</h3>${Object.entries(by).map(([t,u])=>`<div class="row"><span>${esc(t)}</span><small>${u.map(esc).join(", ")}</small></div>`).join("")||'<div class="empty">Лайков пока нет.</div>'}`}
shell();show()});
