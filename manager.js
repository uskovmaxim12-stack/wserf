(() => {
"use strict";
const C=window.WSERF_CFG;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sb=window.supabase.createClient(C.url,C.key);
let data=null,tab="overview",busy=false;
const root=$("#app");
const call=async(payload)=>{
 const {data,error}=await sb.functions.invoke("wserf-manager",{body:payload});
 if(error) throw new Error(error.message||"Ошибка запроса");
 if(data?.error) throw new Error(data.error);
 return data;
};
const notice=(m,bad=false)=>{const n=$("#notice");n.textContent=m;n.className=bad?"bad":"ok";n.hidden=false;setTimeout(()=>n.hidden=true,4500)};
const date=v=>v?new Date(v).toLocaleString("ru-RU"):"—";
async function load(){if(busy)return;busy=true;try{data=await call({action:"overview"});render()}catch(e){notice(e.message,true)}finally{busy=false}}
function shell(){
 root.innerHTML=`<header><div><div class="eyebrow">WSERF / CONTROL ROOM</div><h1>Центр управления</h1><p id="who">Проверка доступа…</p></div><button id="refresh">Обновить</button></header>
 <div id="notice" hidden></div><nav id="tabs"></nav><main id="panel"><div class="loading">Загрузка данных…</div></main><footer>Административный интерфейс · действия записываются в журнал</footer>`;
 $("#refresh").onclick=load;
}
function nav(){const names={overview:"Обзор",reports:"Жалобы",comments:"Комментарии",topics:"Форум",posts:"Публикации",audit:"Журнал",users:"Пользователи",theme:"Оформление"};$("#tabs").innerHTML=Object.entries(names).map(([k,v])=>`<button data-tab="${k}" class="${tab===k?"active":""}">${v}${k==="reports"&&data.reports.length?" · "+data.reports.length:""}</button>`).join("");$("#tabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()})}
function card(title,value,sub=""){return `<article class="stat"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`}
function row(title,meta,body,actions=""){return `<article class="item"><div class="itemtop"><b>${esc(title)}</b><small>${esc(meta)}</small></div><p>${esc(body)}</p><div class="actions">${actions}</div></article>`}
function render(){
 if(!data)return;nav();const p=$("#panel"),s=data.stats||{};
 if(tab==="overview")p.innerHTML=`<section class="stats">${card("Пользователи",s.users??"—","Всего аккаунтов")}${card("Комментарии",s.comments??"—","Всего комментариев")}${card("Жалобы",data.reports.length,"Ожидают рассмотрения")}${card("Темы форума",data.topics.length,"Последние 100")}</section><section class="intro"><h2>Оперативная сводка</h2><p>Панель подключена к рабочей базе wserf. Используй вкладки для модерации и публикаций. Опасные действия требуют подтверждения.</p></section><h2>Последние действия</h2>${(data.audit||[]).slice(0,8).map(x=>row(x.summary,date(x.created_at),x.target_type+" · "+x.action)).join("")||'<p class="empty">Записей пока нет.</p>'}`;
 if(tab==="reports")p.innerHTML=`<h2>Жалобы</h2>${data.reports.map(x=>row("Жалоба на комментарий",date(x.created_at),"Комментарий: "+x.comment_id+" · Автор жалобы: "+x.user_id,`<button data-viewcomment="${x.comment_id}">Открыть комментарий</button><button class="danger" data-report="${x.id}">Рассмотрено</button>`)).join("")||'<p class="empty">Новых жалоб нет.</p>'}`;
 if(tab==="comments")p.innerHTML=`<h2>Последние комментарии</h2>${data.comments.map(x=>row(x.body||"[вложение]",date(x.created_at),x.target_type+" · автор "+x.user_id,`<button class="danger" data-comment="${x.id}">Удалить</button>`)).join("")||'<p class="empty">Комментариев нет.</p>'}`;
 if(tab==="topics")p.innerHTML=`<h2>Темы форума</h2>${data.topics.map(x=>row(x.title,date(x.last_activity),x.body,`<button data-topic="${x.id}" data-pin="${!x.pinned}">${x.pinned?"Открепить":"Закрепить"}</button><button data-topic="${x.id}" data-lock="${!x.locked}">${x.locked?"Открыть":"Закрыть"}</button>`)).join("")||'<p class="empty">Тем нет.</p>'}`;
 if(tab==="posts")p.innerHTML=`<h2>Публикации</h2><form id="postform" class="composer"><h3>Новая публикация от имени wserf</h3><select name="kind"><option value="journal">Дневник</option><option value="story">История</option></select><input name="title" placeholder="Заголовок" required minlength="3"><textarea name="body" placeholder="Текст публикации" required rows="7"></textarea><input name="excerpt" placeholder="Краткое описание (необязательно)"><label><input type="checkbox" name="published"> Опубликовать сразу</label><button>Создать публикацию</button></form>${data.posts.map(x=>row(x.title,date(x.created_at),(x.kind==="journal"?"Дневник":"История")+" · "+(x.published?"Опубликовано":"Черновик"))).join("")}`;
 if(tab==="users")p.innerHTML=`<h2>Пользователи</h2>${(data.users||[]).map(u=>row(u.nick+" · "+u.role,date(u.created_at),"Email: "+u.email+" · комментариев: "+u.comments+" · тем: "+u.topics+(u.banned?" · ЗАБЛОКИРОВАН":""),`<button data-ban="${u.id}" data-state="${!u.banned}" class="${u.banned?"":"danger"}">${u.banned?"Снять бан":"Заблокировать"}</button><button data-restrict="${u.id}" data-field="comments" data-state="${!u.restrict_comments}">${u.restrict_comments?"Разрешить комментарии":"Ограничить комментарии"}</button><button data-restrict="${u.id}" data-field="forum" data-state="${!u.restrict_forum}">${u.restrict_forum?"Разрешить форум":"Ограничить форум"}</button>`)).join("")||'<p class="empty">Пользователей нет.</p>'}`;
 if(tab==="theme"){const t=data.settings?.theme||{preset:"forest",bg:"#10110F",ac:"#B9C5AA"};p.innerHTML=`<h2>Оформление сайта</h2><section class="intro"><p>Изменение сохранится в общих настройках сайта и станет видно посетителям после обновления страницы.</p></section><form id="themeform" class="composer"><label>Цветовая тема<select name="preset"><option value="forest">Лес</option><option value="midnight">Полночь</option><option value="plum">Слива</option><option value="graphite">Графит</option><option value="ember">Закат</option><option value="halloween">Хэллоуин</option><option value="newyear">Новый год</option><option value="valentine">14 февраля</option><option value="autumn">Осень</option><option value="custom">Свои цвета</option></select></label><div id="customcolors"><label>Фон <input name="bg" value="${esc(t.bg||"#10110F")}" placeholder="#10110F"></label><label>Акцент <input name="ac" value="${esc(t.ac||"#B9C5AA")}" placeholder="#B9C5AA"></label></div><button>Сохранить оформление</button></form>`;const form=$("#themeform");form.preset.value=t.preset||"forest";$("#customcolors").hidden=form.preset.value!=="custom";form.preset.onchange=()=>$("#customcolors").hidden=form.preset.value!=="custom";}
 if(tab==="audit")p.innerHTML=`<h2>Журнал действий</h2>${(data.audit||[]).map(x=>row(x.summary,date(x.created_at),x.action+" · "+x.target_type+" · "+(x.target_id||""))).join("")||'<p class="empty">Журнал пока пуст.</p>'}`;
 bind();
}
function bind(){
 $("#themeform")?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await call({action:"update_theme",preset:f.get("preset"),bg:f.get("bg"),ac:f.get("ac")});notice("Оформление сайта сохранено");await load();tab="theme";render()}catch(x){notice(x.message,true)}});
 $("#postform")?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await call({action:"create_post",kind:f.get("kind"),title:f.get("title"),body:f.get("body"),excerpt:f.get("excerpt"),published:f.get("published")==="on"});notice("Публикация создана");await load()}catch(x){notice(x.message,true)}});
 document.querySelectorAll("[data-comment]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить этот комментарий?"))return;try{await call({action:"delete_comment",id:b.dataset.comment});notice("Комментарий удалён");await load()}catch(e){notice(e.message,true)}});
 document.querySelectorAll("[data-report]").forEach(b=>b.onclick=async()=>{if(!confirm("Отметить жалобу рассмотренной?"))return;try{await call({action:"resolve_report",id:b.dataset.report,outcome:"reviewed"});notice("Жалоба закрыта");await load()}catch(e){notice(e.message,true)}});
 document.querySelectorAll("[data-ban]").forEach(b=>b.onclick=async()=>{if(!confirm(b.dataset.state==="true"?"Заблокировать пользователя?":"Снять блокировку?"))return;try{await call({action:"set_ban",id:b.dataset.ban,banned:b.dataset.state==="true",reason:"Решение модерации"});notice("Статус пользователя изменён");await load()}catch(e){notice(e.message,true)}});
 document.querySelectorAll("[data-restrict]").forEach(b=>b.onclick=async()=>{try{await call({action:"set_restrict",id:b.dataset.restrict,field:b.dataset.field,enabled:b.dataset.state==="true",reason:"Решение модерации"});notice("Ограничение обновлено");await load()}catch(e){notice(e.message,true)}});
 document.querySelectorAll("[data-topic]").forEach(b=>b.onclick=async()=>{try{const x={action:"set_topic",id:b.dataset.topic};if(b.dataset.pin!==undefined)x.pinned=b.dataset.pin==="true";if(b.dataset.lock!==undefined)x.locked=b.dataset.lock==="true";await call(x);notice("Тема обновлена");await load()}catch(e){notice(e.message,true)}});
 document.querySelectorAll("[data-viewcomment]").forEach(b=>b.onclick=()=>{tab="comments";render();});
}
async function start(){
 shell();
 try{
  if(!window.supabase?.createClient||!C?.url||!C?.key) throw new Error("Не загрузилась конфигурация Supabase. Обновите страницу.");
  const {data:{session}}=await sb.auth.getSession();
  if(!session){
   $("#who").textContent="Вход в административную панель";
   $("#panel").innerHTML=`<form id="loginform" class="composer" style="max-width:440px;margin:24px auto"><h2>Вход администратора</h2><p>Используй тот же аккаунт, что и на сайте wserf.</p><input name="email" type="email" autocomplete="username" placeholder="Электронная почта" required><input name="password" type="password" autocomplete="current-password" placeholder="Пароль" required><button id="loginbutton">Войти в центр управления</button><p id="loginerror" role="alert"></p><a href="index.html">Вернуться на сайт</a></form>`;
   $("#loginform").onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const b=$("#loginbutton");b.disabled=true;b.textContent="Входим…";
    try{const {error}=await sb.auth.signInWithPassword({email:String(f.get("email")).trim(),password:String(f.get("password"))});if(error)throw error;const {data:user}=await sb.auth.getUser();$("#who").textContent="Сеанс: "+(user.user?.email||"администратор");await load();}
    catch(x){$("#loginerror").textContent=x.message||"Не удалось войти.";}
    finally{b.disabled=false;b.textContent="Войти в центр управления";}
   };
   return;
  }
  const {data:user}=await sb.auth.getUser();
  $("#who").textContent="Сеанс: "+(user.user?.email||"администратор");
  await load();
 }catch(e){notice(e.message,true)}
}
document.addEventListener("DOMContentLoaded",start);
})();
