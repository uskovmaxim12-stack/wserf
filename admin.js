WREADY.then(()=>{const{sb,esc,fmt,me,M}=W;if(!sb)return;
if(me?.role!=="admin"){M.innerHTML='<div class="wrap"><div class="empty" style="margin:80px 0">Доступ только для автора. <a href="login.html" style="color:var(--ac)">Войти</a></div></div>';return}
const ui=W.ui;const G=p=>p.then(r=>{if(r.error)ui.toast(r.error.message,1);return r.data||[]});
const fpath=u=>{const m=/\/object\/public\/media\/([^?]+)/.exec(u||"");return m?decodeURIComponent(m[1]):null};
const rmFiles=async urls=>{const p=urls.map(fpath).filter(Boolean);if(p.length)await sb.storage.from("media").remove(p)};
const PF=[["title","Заголовок","text"],["category","Категория","text"],["excerpt","Краткое описание","area"],["body","Текст","area"],["cover","Фотография / обложка","file:image/*"],["published_at","Дата публикации","date"],["published","Опубликовать (иначе черновик)","bool"]];
const E={albums:{t:"albums",f:[["title","Название","text"],["year","Год","number"],["description","Описание","area"],["story","История альбома","area"],["cover","Обложка","file:image/*"],["published","Опубликовать","bool"]],s:r=>`${r.title} (${r.year||"—"})`},
 tracks:{t:"tracks",f:[["title","Название","text"],["album_id","Альбом","album"],["position","Номер в альбоме","number"],["audio","MP3-файл (до 50 МБ)","file:audio/*"],["cover","Обложка","file:image/*"],["lyrics","Текст песни","area"],["story","История создания","area"],["published_at","Дата публикации","date"],["published","Опубликовать","bool"]],s:r=>r.title},
 journal:{t:"posts",kind:"journal",f:PF,s:r=>r.title},forumcats:{t:"forum_categories",f:[["title","Название раздела","text"],["description","Описание","area"],["position","Порядок (число, меньше — выше)","number"]],s:r=>r.title,o:"position",asc:true},stories:{t:"posts",kind:"story",f:PF,s:r=>r.title}};
const T=["stats","tracks","albums","journal","stories","forumcats","forumtopics","design","events","texts","settings","users","reports","comments"];
const TN={stats:"Обзор",tracks:"Песни",albums:"Альбомы",journal:"Дневник",stories:"Истории",forumcats:"Форум: разделы",forumtopics:"Форум: темы",design:"Оформление",events:"События",texts:"Тексты",settings:"Настройки",users:"Пользователи",reports:"Жалобы",comments:"Комментарии"};
let tab="stats";const root=document.createElement("div");root.className="wrap";M.innerHTML="";M.appendChild(root);
const ad=()=>document.getElementById("ad");
function shell(){root.innerHTML=`<section class="hero" style="padding:40px 0 0"><div class="eyebrow">управление · версия 2026.11.23-1</div><h1 style="font-size:44px">Панель сайта</h1></section><div class="tabs">${T.map(k=>`<button data-t="${k}" class="${k===tab?"on":""}">${TN[k]}</button>`).join("")}</div><div id="ad"></div>`;
 root.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;shell();show()});
 sb.from("reports").select("id",{count:"exact",head:true}).then(r=>{const n=r.count||0,b=root.querySelector("[data-t=reports]");if(n&&b)b.textContent="Жалобы ("+n+")"})}
async function show(){const x=ad();x.innerHTML="Загрузка…";if(panels[tab])return paint();if(E[tab])return crud(E[tab]);if(tab==="forumtopics")return ftopics();if(tab==="users")return users();if(tab==="reports")return reps();if(tab==="comments")return comm();return stats()}
// ---------- контент ----------
async function crud(e){let q=sb.from(e.t).select("*").order(e.o||"created_at",{ascending:!!e.asc});if(e.kind)q=q.eq("kind",e.kind);const rows=await G(q);
 const isT=e.t==="tracks",albs=isT?await G(sb.from("albums").select("id,title")):[],an=id=>albs.find(a=>a.id===id)?.title||"без альбома";
 if(isT)rows.sort((a,b)=>(an(a.album_id)).localeCompare(an(b.album_id))||(a.position||0)-(b.position||0)||String(a.created_at).localeCompare(b.created_at));
 ad().innerHTML=`<button class="btn" id="new" style="margin:0 0 20px">+ Добавить</button><div id="fm"></div>${rows.map(r=>`<div class="row"><span>${esc(e.s(r))} ${r.published===false?'<small style="color:var(--t2)">· черновик</small>':""}${isT?`<br><small style="color:var(--t2)">${esc(an(r.album_id))} · №${r.position||0}</small>`:""}</span>${isT?`<button class="btn ghost sm" data-mv="${r.id}" data-d="-1" aria-label="Выше">↑</button><button class="btn ghost sm" data-mv="${r.id}" data-d="1" aria-label="Ниже">↓</button>`:""}<button class="btn ghost sm" data-e="${r.id}">Изменить</button><button class="btn ghost sm" data-x="${r.id}" style="color:#f0a89f">Удалить</button></div>`).join("")||'<div class="empty">Пока пусто. Нажмите «+ Добавить».</div>'}`;
 document.getElementById("new").onclick=()=>form(e,{});
 ad().querySelectorAll("[data-mv]").forEach(b=>b.onclick=async()=>{const cur=rows.find(r=>r.id===b.dataset.mv),g=rows.filter(r=>r.album_id===cur.album_id),i=g.indexOf(cur),j=i+(+b.dataset.d);if(j<0||j>=g.length)return;[g[i],g[j]]=[g[j],g[i]];await Promise.all(g.map((r,k)=>sb.from("tracks").update({position:k+1}).eq("id",r.id)));crud(e)});
 ad().querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>form(e,rows.find(r=>r.id===b.dataset.e)));
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(!await ui.confirm("Запись и загруженные к ней файлы будут удалены без возможности восстановления.",{danger:1,ok:"Удалить"}))return;const r=rows.find(x=>x.id===b.dataset.x);await rmFiles(e.f.filter(f=>f[2].startsWith("file")).map(f=>r[f[0]]));if(e.t==="tracks"||e.t==="posts"){await sb.from("reactions").delete().eq("target_id",r.id);await sb.from("comments").delete().eq("target_id",r.id);await sb.from("views").delete().eq("target_id",r.id)}await G(sb.from(e.t).delete().eq("id",r.id));crud(e)})}
async function form(e,row){const albs=e.f.some(f=>f[2]==="album")?await G(sb.from("albums").select("id,title")):[];const fm=document.getElementById("fm");
 fm.innerHTML=`<form class="frm glass">${e.f.map(([k,l,ty])=>{const v=row[k];
  if(ty==="text")return `<label>${l}<input name="${k}" value="${esc(v)}"></label>`;if(ty==="number")return `<label>${l}<input type="number" name="${k}" value="${esc(v)}"></label>`;
  if(ty==="area")return `<label>${l}<textarea name="${k}" rows="${k==="body"||k==="lyrics"?10:4}">${esc(v)}</textarea></label>`;
  if(ty==="date")return `<label>${l}<input type="date" name="${k}" value="${esc((v||"").slice(0,10))}"></label>`;
  if(ty==="bool")return `<label class="ck">${l}<input type="checkbox" name="${k}" ${v?"checked":""}></label>`;
  if(ty==="album")return `<label>${l}<select name="${k}"><option value="">— без альбома —</option>${albs.map(a=>`<option value="${a.id}" ${a.id===v?"selected":""}>${esc(a.title)}</option>`).join("")}</select></label>`;
  return `<label>${l}<input type="file" name="${k}" accept="${ty.split(":")[1]}">${v?`<small>Сейчас загружено: <a href="${esc(v)}" target="_blank" style="color:var(--ac)">открыть</a>. Выберите файл, чтобы заменить.</small>`:""}</label>`}).join("")}
  <div class="acts"><button class="btn" style="margin:0">Сохранить</button><button type="button" class="btn ghost" id="cn" style="margin:0">Отмена</button></div><div class="er" id="ae"></div></form>`;
 ui.enhance(fm);document.getElementById("cn").onclick=()=>fm.innerHTML="";fm.scrollIntoView({behavior:"smooth"});
 fm.firstChild.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(ev.target),o={},old=[],er=document.getElementById("ae"),btn=ev.target.querySelector(".btn");btn.disabled=true;er.style.color="";er.textContent="Сохраняю…";
  for(const[k,l,ty]of e.f){if(ty.startsWith("file")){const f=fd.get(k);if(f&&f.size){const p=e.t+"/"+Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]/g,"_");const{error}=await sb.storage.from("media").upload(p,f);if(error){er.textContent="Ошибка загрузки: "+error.message;btn.disabled=false;return}o[k]=sb.storage.from("media").getPublicUrl(p).data.publicUrl;if(row[k])old.push(row[k])}}
   else if(ty==="bool")o[k]=!!fd.get(k);else if(ty==="number")o[k]=fd.get(k)===""?null:+fd.get(k);else if(ty==="date"){if(fd.get(k))o[k]=fd.get(k)}else if(ty==="album")o[k]=fd.get(k)||null;else o[k]=fd.get(k)}
  if(e.kind)o.kind=e.kind;const{error}=row.id?await sb.from(e.t).update(o).eq("id",row.id):await sb.from(e.t).insert(o);
  if(error){er.textContent=error.message;btn.disabled=false}else{await rmFiles(old);crud(e)}}}
// ---------- настройки сайта ----------
let cfg=JSON.parse(JSON.stringify(W.raw)),TL=[];
G(sb.from("tracks").select("id,title").eq("published",true)).then(r=>TL=r);
const getp=(o,p)=>p.split(".").reduce((a,k)=>a?.[k],o),setp=(o,p,v)=>{const k=p.split("."),l=k.pop();k.reduce((a,x)=>a[x]??={},o)[l]=v};
const inp=(l,p,t="text")=>`<label>${l}<input type="${t}" data-p="${p}" value="${esc(getp(cfg,p)??"")}"></label>`;
const area=(l,p,r=4)=>`<label>${l}<textarea rows="${r}" data-p="${p}">${esc(getp(cfg,p)??"")}</textarea></label>`;
const sw=(l,p)=>`<label class="ck">${l}<input type="checkbox" data-p="${p}" ${getp(cfg,p)?"checked":""}></label>`;
const sel=(l,p,o)=>`<label>${l}<select data-p="${p}">${o.map(([v,n])=>`<option value="${v}" ${getp(cfg,p)===v?"selected":""}>${n}</option>`).join("")}</select></label>`;
const img=(l,p)=>`<label>${l}<input type="file" accept="image/*" data-f="${p}">${getp(cfg,p)?`<small>Загружено · <a href="${esc(getp(cfg,p))}" target="_blank" style="color:var(--ac)">открыть</a> · <a href="#" data-rm="${p}" style="color:var(--ac)">убрать</a></small>`:""}</label>`;
const note=t=>`<div class="note" style="margin:0">${t}</div>`;
const FX=[["none","Нет"],["snow","Снег"],["halloween","Тыквы и летучие мыши"],["newyear","Новогодние огоньки"],["hearts","Сердечки"],["leaves","Осенние листья"],["sparkles","Искры"]];
const PS=Object.entries(W.PRE).map(([k,v])=>[k,v.n]);
const SB='<div class="acts" style="margin:6px 0 18px"><button class="btn sv" style="margin:0">Сохранить на сайте</button><span class="er sm" style="min-height:0"></span></div>';
const Y=new Date().getFullYear();
const TPL=[{name:"Хэллоуин",preset:"halloween",effect:"halloween",start:Y+"-10-25",end:Y+"-11-01",banner:"🎃 Счастливого Хэллоуина!",heroTitle:"Ночь, музыка и тайны",heroAccent:"тайны",heroText:"Самое время для тёмной музыки и страшных историй."},
 {name:"Новый год",preset:"newyear",effect:"newyear",start:Y+"-12-20",end:(Y+1)+"-01-10",banner:"🎄 С Новым годом!",heroTitle:"С Новым годом",heroAccent:"Новым годом",heroText:"Пусть наступающий год будет добрым, а песен станет больше."},
 {name:"14 февраля",preset:"valentine",effect:"hearts",start:Y+"-02-10",end:Y+"-02-14",banner:"💗 С Днём всех влюблённых",heroTitle:"Про любовь и тишину",heroAccent:"любовь",heroText:"Песни и мысли о тех, кто рядом."},
 {name:"Осень",preset:"autumn",effect:"leaves",start:Y+"-10-01",end:Y+"-11-20",banner:"",heroTitle:"Осень, дождь и музыка",heroAccent:"музыка",heroText:"Время тёплых свитеров и грустных песен."}];
function evForm(v,i){const on=W.effective(cfg).event===v,p="events."+i+".";
 return `<div class="frm glass"><div class="row" style="padding:0;border:0"><span><b>${esc(v.name||"Событие")}</b>${on?'<small class="chip">идёт сейчас</small>':""}</span><button class="btn ghost sm" data-del="${i}" style="color:#f0a89f">Удалить</button></div>
 ${sw("Включено",p+"enabled")}${sw("Повторять каждый год",p+"yearly")}${inp("Название",p+"name")}${note("Если включено «каждый год», важны только месяц и день.")}${inp("Начало",p+"start","date")}${inp("Конец",p+"end","date")}
 ${sel("Цветовая тема",p+"preset",PS)}${sel("Анимация",p+"effect",FX)}${inp("Баннер сверху (пусто — без баннера)",p+"banner")}${inp("Заголовок главной",p+"heroTitle")}${inp("Выделенное слово",p+"heroAccent")}${area("Текст главной",p+"heroText",3)}</div>`}
const linkRows=()=>cfg.links.map((l,i)=>`<div class="frm glass" style="padding:14px">${inp("Название (например, Telegram)","links."+i+".name")}${inp("Ссылка (https://…)","links."+i+".url")}<button type="button" class="btn ghost sm" data-dell="${i}" style="justify-self:start;color:#f0a89f">Убрать</button></div>`).join("");
const panels={
 design:()=>{const t=cfg.theme,ev=W.effective(cfg).event;ad().innerHTML=`${SB}${ev?`<div class="note" style="margin-bottom:12px">Сейчас идёт событие «${esc(ev.name)}»: оно перекрывает тему и анимацию ниже. Чтобы увидеть основную тему, отключите событие во вкладке «События».</div>`:""}
 <h3>Цветовая тема</h3><div class="sw">${Object.entries(W.PRE).map(([k,v])=>`<button class="pre ${t.preset===k?"on":""}" data-pre="${k}"><i style="background:${v.bg}"><b style="background:${v.ac}"></b></i>${v.n}</button>`).join("")}<button class="pre ${t.preset==="custom"?"on":""}" data-pre="custom"><i><b></b></i>Свои цвета</button></div>
 ${t.preset==="custom"?`<div class="frm glass">${inp("Цвет фона","theme.bg","color")}${inp("Цвет акцента","theme.ac","color")}${note("Лучше выбирать тёмный фон, остальные оттенки подстроятся сами.")}</div>`:""}
 <h3>Анимация на фоне</h3><div class="frm glass">${sel("Постоянный эффект","fx",FX)}</div>
 <h3>Главная страница</h3><div class="frm glass">${inp("Надпись над заголовком","hero.eyebrow")}${inp("Заголовок","hero.title")}${inp("Выделенное слово (часть заголовка)","hero.accent")}${area("Текст под заголовком","hero.text",3)}${img("Большое фото на главной","hero.image")}
 ${sel("Какая песня показана на главной","featured",[["","Самая свежая (автоматически)"],...TL.map(x=>[x.id,esc(x.title)])])}</div>
 <h3>Название, иконка, подвал</h3><div class="frm glass">${inp("Название сайта","name")}${inp("Иконка во вкладке браузера (один эмодзи)","favicon")}${inp("Текст в подвале","footer")}</div>
 <h3>Свой CSS (для продвинутых)</h3><div class="frm glass">${area("Любые стили, применяются ко всему сайту","css",6)}${note("Если что-то сломалось, откройте админку по адресу admin.html?safe=1: в этом режиме свой CSS и события отключены, и вы сможете всё исправить.")}</div>${SB}`},
 events:()=>{ad().innerHTML=`${SB}${note("События включаются сами в нужные даты и выключаются после них. Пока событие идёт, оно меняет тему, анимацию, баннер и текст главной. Не забудьте нажать «Сохранить на сайте».")}
 <h3>Добавить из готовых</h3><div class="acts">${TPL.map((t,i)=>`<button class="btn ghost sm" data-add="${i}">${t.name}</button>`).join("")}<button class="btn ghost sm" data-add="-1">Пустое событие</button></div>
 <h3>Мои события</h3>${cfg.events.map(evForm).join("")||'<div class="empty">Пока нет событий.</div>'}${SB}`},
 texts:()=>{ad().innerHTML=`${SB}<h3>Названия разделов в меню</h3><div class="frm glass">${["home","journal","stories","music","forum","about"].map((k,i)=>inp(["Главная","Дневник","Истории","Музыка","Форум","Об авторе"][i],"labels."+k)).join("")}</div>
 ${["journal","stories","music","forum"].map((k,i)=>`<h3>Страница «${["Дневник","Истории","Музыка","Форум"][i]}»</h3><div class="frm glass">${inp("Надпись над заголовком","pages."+k+".eyebrow")}${inp("Заголовок","pages."+k+".title")}${inp("Выделенное слово","pages."+k+".accent")}</div>`).join("")}
 <h3>Страница «Об авторе»</h3><div class="frm glass">${inp("Заголовок","about.title")}${area("Текст","about.text",12)}${img("Фотография","about.photo")}</div>
 <h3>Конфиденциальность и правила</h3><div class="frm glass">${area("Текст страницы","privacy",12)}</div>
 <h3>Ссылки в подвале</h3>${linkRows()}<button class="btn ghost sm" data-addl="1">+ Добавить ссылку</button>
 <h3>Комментарии</h3><div class="frm glass">${inp("Эмодзи для вставки (через пробел)","emoji")}${inp("Стикеры (через пробел, крупные эмодзи)","stickers")}${inp("Реакции на записи, темы и сообщения (через пробел)","reactions")}</div>${SB}`},
 settings:()=>{ad().innerHTML=`${SB}<h3>Разделы сайта</h3><div class="frm glass">${sw("Дневник","nav.journal")}${sw("Истории","nav.stories")}${sw("Музыка","nav.music")}${sw("Форум","nav.forum")}${sw("Об авторе","nav.about")}</div>
 <h3>Что разрешено посетителям</h3><div class="frm glass">${sw("Регистрация новых пользователей","features.register")}${sw("Комментарии","features.comments")}${sw("Лайки и реакции","features.likes")}${sw("Создание тем на форуме","features.forum")}${sw("Скачивание песен (для вошедших)","features.downloads")}</div>
 <h3>Запрещённые слова в комментариях</h3><div class="frm glass">${inp("Слова через запятую","moderation.badwords")}${note("Комментарий с любым из этих слов не отправится. Проверка работает на стороне базы.")}</div>
 <h3>Баннер на всех страницах</h3><div class="frm glass">${sw("Показывать баннер","banner.on")}${inp("Текст","banner.text")}${inp("Ссылка (необязательно)","banner.link")}</div>
 <h3>Режим обслуживания</h3><div class="frm glass">${sw("Закрыть сайт для посетителей","maintenance.on")}${inp("Заголовок","maintenance.title")}${inp("Эмодзи","maintenance.emoji")}${area("Текст для посетителей","maintenance.text",3)}${note("Вы, как автор, сайт видите всегда.")}</div>
 <h3>Резервная копия</h3><div class="frm glass">${note("Скачайте файл со всеми песнями, альбомами, записями и настройками. Хорошо делать перед большими изменениями.")}<button type="button" class="btn ghost" id="bk" style="justify-self:start;margin:0">Скачать копию</button></div>${SB}`}
};
let dirty=false;
const dbar=()=>{const b=document.getElementById("dbar");if(dirty&&!b){document.body.insertAdjacentHTML("beforeend",'<div id="dbar"><span>Есть несохранённые изменения</span><button class="btn sm">Сохранить</button></div>');document.querySelector("#dbar button").onclick=()=>saveCfg()}else if(!dirty&&b)b.remove()};
async function saveCfg(){const{error}=await sb.from("settings").upsert({key:"site",value:cfg});if(error)ui.toast("Ошибка: "+error.message,1);else{try{localStorage.setItem("wserf_site",JSON.stringify(cfg))}catch(e){}dirty=false;dbar();ui.toast("Сохранено. Сайт обновлён.")}return error}
function paint(){panels[tab]();const x=ad();ui.enhance(x);
 x.querySelectorAll("[data-p]").forEach(i=>i.oninput=i.onchange=()=>{dirty=true;dbar();setp(cfg,i.dataset.p,i.type==="checkbox"?i.checked:i.value);W.applySite(cfg)});
 x.querySelectorAll("[data-f]").forEach(i=>i.onchange=async()=>{const f=i.files[0];if(!f)return;const p="site/"+Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]/g,"_"),{error}=await sb.storage.from("media").upload(p,f);if(error)return ui.toast("Ошибка загрузки: "+error.message,1);setp(cfg,i.dataset.f,sb.storage.from("media").getPublicUrl(p).data.publicUrl);W.applySite(cfg);paint()});
 x.querySelectorAll("[data-rm]").forEach(a=>a.onclick=e=>{e.preventDefault();setp(cfg,a.dataset.rm,"");paint()});
 x.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{cfg.theme.preset=b.dataset.pre;W.applySite(cfg);paint()});
 x.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const t=TPL[+b.dataset.add]||{name:"Новое событие",preset:"forest",effect:"none",start:"",end:"",banner:"",heroTitle:"",heroAccent:"",heroText:""};cfg.events.push({id:Date.now(),enabled:true,yearly:true,...t});paint()});
 x.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(await ui.confirm("Удалить это событие?",{danger:1,ok:"Удалить"})){cfg.events.splice(+b.dataset.del,1);W.applySite(cfg);paint()}});
 x.querySelectorAll("[data-addl]").forEach(b=>b.onclick=()=>{cfg.links.push({name:"",url:""});paint()});
 x.querySelectorAll("[data-dell]").forEach(b=>b.onclick=()=>{cfg.links.splice(+b.dataset.dell,1);paint()});
 x.querySelectorAll("#bk").forEach(b=>b.onclick=async()=>{const[a,t,p,s]=await Promise.all([G(sb.from("albums").select("*")),G(sb.from("tracks").select("*")),G(sb.from("posts").select("*")),G(sb.from("settings").select("*"))]);
  const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([JSON.stringify({date:new Date().toISOString(),albums:a,tracks:t,posts:p,settings:s},null,2)],{type:"application/json"}));l.download="site-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(l);l.click();l.remove()});
 x.querySelectorAll(".sv").forEach(b=>b.onclick=async()=>{const error=await saveCfg();x.querySelectorAll(".sm").forEach(m=>{m.style.color=error?"":"var(--ac)";m.textContent=error?"Ошибка: "+error.message:"Сохранено. Сайт обновлён."})})}
// ---------- люди ----------
async function ftopics(){const[r,cats]=await Promise.all([G(sb.rpc("forum_list",{cat:null,q:null,lim:200})),G(sb.from("forum_categories").select("id,title"))]);
 ad().innerHTML=r.map(t=>`<div class="row"><span>${t.pinned?"📌 ":""}${t.locked?"🔒 ":""}<b>${esc(t.title)}</b><br><small style="color:var(--t2)">${esc(t.nick)} · ${esc(cats.find(c=>c.id===t.category_id)?.title||"без раздела")} · ответов: ${t.replies}</small></span><a class="btn ghost sm" href="topic.html?id=${t.id}">Открыть</a><button class="btn ghost sm" data-pin="${t.id}">${t.pinned?"Открепить":"Закрепить"}</button><button class="btn ghost sm" data-lk="${t.id}">${t.locked?"Открыть":"Закрыть"}</button><button class="btn ghost sm" data-x="${t.id}" style="color:#f0a89f">Удалить</button></div>`).join("")||'<div class="empty">Тем пока нет.</div>';
 const by=id=>r.find(t=>t.id===id);
 ad().querySelectorAll("[data-pin]").forEach(b=>b.onclick=async()=>{const t=by(b.dataset.pin);await G(sb.rpc("admin_topic_set",{tid:t.id,p:!t.pinned,l:t.locked}));ftopics()});
 ad().querySelectorAll("[data-lk]").forEach(b=>b.onclick=async()=>{const t=by(b.dataset.lk);await G(sb.rpc("admin_topic_set",{tid:t.id,p:t.pinned,l:!t.locked}));ftopics()});
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(await ui.confirm("Тема и все ответы в ней будут удалены навсегда.",{danger:1,ok:"Удалить"})){await G(sb.rpc("delete_topic",{tid:b.dataset.x}));ftopics()}})}
async function users(){const[u,c,l]=await Promise.all([G(sb.from("profiles").select("*").order("created_at",{ascending:false})),G(sb.from("comments").select("user_id")),G(sb.from("likes").select("user_id"))]);
 const n=(a,id)=>a.filter(x=>x.user_id===id).length;
 ad().innerHTML=u.map(r=>`<div class="row"><span>${r.avatar?`<img class="av" src="${esc(r.avatar)}" alt="" style="display:inline-block;vertical-align:middle;margin-right:10px">`:""}<b>${esc(r.nick)}</b> ${r.role==="admin"?"· автор":""}${r.banned?" · <em>ограничен</em>":""}<br><small style="color:var(--t2)">с ${fmt(r.created_at)} · лайков: ${n(l,r.id)} · комментариев: ${n(c,r.id)}</small></span>${r.role==="admin"?"":`<button class="btn ghost sm" data-b="${r.id}" data-v="${!r.banned}">${r.banned?"Снять ограничение":"Ограничить"}</button><button class="btn ghost sm" data-c="${r.id}">Сбросить фото и описание</button><button class="btn ghost sm" data-x="${r.id}" style="color:#f0a89f">Удалить</button>`}</div>`).join("");
 ad().querySelectorAll("[data-b]").forEach(b=>b.onclick=async()=>{await G(sb.rpc("admin_set_ban",{uid:b.dataset.b,b:b.dataset.v==="true"}));users()});
 ad().querySelectorAll("[data-c]").forEach(b=>b.onclick=async()=>{if(await ui.confirm("Фото и описание пользователя будут удалены.",{danger:1,ok:"Убрать"})){await sb.storage.from("avatars").remove([b.dataset.c+"/avatar.jpg"]);await G(sb.rpc("admin_clear_profile",{uid:b.dataset.c}));users()}});
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(await ui.confirm("Пользователь, его лайки и комментарии будут удалены навсегда.",{danger:1,ok:"Удалить"})){await sb.storage.from("avatars").remove([b.dataset.x+"/avatar.jpg"]);await G(sb.rpc("admin_delete_user",{uid:b.dataset.x}));users()}})}
async function reps(){const r=await G(sb.from("reports").select("id,created_at,comment_id,profiles(nick),comments(body,sticker,gif_url,profiles(nick))").order("created_at",{ascending:false}));
 ad().innerHTML=r.map(x=>`<div class="row"><span><b>${esc(x.comments?.profiles?.nick)}</b>: ${esc(x.comments?.sticker||x.comments?.body||"GIF")}<br><small style="color:var(--t2)">жалоба от ${esc(x.profiles?.nick)} · ${fmt(x.created_at)}</small></span><button class="btn ghost sm" data-k="${x.id}">Отклонить</button><button class="btn ghost sm" data-x="${x.comment_id}" style="color:#f0a89f">Удалить комментарий</button></div>`).join("")||'<div class="empty">Жалоб нет.</div>';
 ad().querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{await G(sb.from("reports").delete().eq("id",b.dataset.k));reps()});
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(await ui.confirm("Удалить этот комментарий?",{danger:1,ok:"Удалить"})){await G(sb.from("comments").delete().eq("id",b.dataset.x));reps()}})}
async function comm(){const c=await G(sb.from("comments").select("*,profiles(nick)").order("created_at",{ascending:false}).limit(100));
 ad().innerHTML=c.map(r=>`<div class="row"><span><b>${esc(r.profiles?.nick)}</b> · ${fmt(r.created_at)}<br>${esc(r.sticker||r.body||"")}${r.gif_url?` <a href="${esc(r.gif_url)}" target="_blank" style="color:var(--ac)">GIF</a>`:""}</span><button class="btn ghost sm" data-x="${r.id}" style="color:#f0a89f">Удалить</button></div>`).join("")||'<div class="empty">Нет комментариев.</div>';
 ad().querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{await G(sb.from("comments").delete().eq("id",b.dataset.x));comm()})}
async function stats(){const{data:s,error}=await sb.rpc("admin_stats");if(error){ad().innerHTML='<div class="empty">Не удалось загрузить статистику: '+esc(error.message)+'</div>';return}const lk=await G(sb.from("likes").select("profiles(nick),tracks(title)"));
 const by={};lk.forEach(l=>{const t=l.tracks?.title||"?";(by[t]=by[t]||[]).push(l.profiles?.nick)});const mx=Math.max(1,...s.by_day.map(d=>d.n));
 ad().innerHTML=`<div class="stat">${[["users","Пользователей"],["views","Просмотров"],["likes","Лайков"],["comments","Комментариев"]].map(([k,l])=>`<div class="glass"><b>${s[k]}</b>${l}</div>`).join("")}</div>
 <h3>Просмотры за 14 дней</h3><div class="bars glass" style="margin:12px 0 28px">${s.by_day.map(d=>`<i title="${d.day}: ${d.n}" style="height:${d.n/mx*100}%"></i>`).join("")}</div>
 <h3>Популярные песни</h3>${s.top_tracks.map(t=>`<div class="row"><span>${esc(t.title)}</span><small>♥ ${t.likes} · просмотров ${t.views}</small></div>`).join("")||'<div class="empty">Нет данных.</div>'}
 <h3 style="margin-top:28px">Популярные записи</h3>${s.top_posts.map(t=>`<div class="row"><span>${esc(t.title)}</span><small>просмотров ${t.views} · комментариев ${t.comments}</small></div>`).join("")||'<div class="empty">Нет данных.</div>'}
 <h3 style="margin-top:28px">Кто лайкнул</h3>${Object.entries(by).map(([t,u])=>`<div class="row"><span>${esc(t)}</span><small>${u.map(esc).join(", ")}</small></div>`).join("")||'<div class="empty">Лайков пока нет.</div>'}`}
shell();show()});
