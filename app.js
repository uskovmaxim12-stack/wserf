window.WREADY=(async()=>{
const B=document.body,R=B.dataset.root||"",P=B.dataset.page,Q=new URLSearchParams(location.search).get("id"),M=document.querySelector("main");
const C=window.WSERF_CFG||{},ok=C.url&&C.key&&!/XXXX|ВСТАВЬТЕ/.test(C.url+C.key);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>d?new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"";
const sb=ok?window.supabase.createClient(C.url,C.key):null;
let user=null,me=null;
if(sb){user=(await sb.auth.getSession()).data.session?.user||null;if(user)me=(await sb.from("profiles").select("*").eq("id",user.id).maybeSingle()).data}
const adm=me?.role==="admin";window.W={sb,esc,fmt,user,me,M,R};
const get=async p=>{const{data,error}=await p;if(error)console.error(error);return data||[]};
const G=["linear-gradient(145deg,#3b4a34,#10110F)","linear-gradient(145deg,#56644a,#1a1d18)","linear-gradient(145deg,#2d3a30,#0d0e0c)"];
const cov=(o,w)=>`<div class="cov ${w?"w":""}" style="--g:${G[(o.id||"a").charCodeAt(0)%3]}">${o.cover?`<img src="${esc(o.cover)}" alt="">`:`<span>${esc((o.title||"w")[0].toLowerCase())}</span>`}</div>`;
const L={post:i=>`${R}post.html?id=${i}`,story:i=>`${R}story.html?id=${i}`,album:i=>`${R}album.html?id=${i}`,track:i=>`${R}track.html?id=${i}`};
const card=(o,k)=>`<a class="card fade" href="${L[k](o.id)}">${cov(o,1)}<div class="b"><div class="meta">${fmt(o.published_at)}${o.category?" · "+esc(o.category):""}</div><h3>${esc(o.title)}</h3><p>${esc(o.excerpt||"")}</p></div></a>`;
const albCard=a=>`<a class="card fade" href="${L.album(a.id)}">${cov(a)}<div class="b"><div class="meta">Альбом · ${a.year||""}</div><h3>${esc(a.title)}</h3></div></a>`;
const list=(a,k,m)=>a.length?`<div class="grid">${a.map(o=>card(o,k)).join("")}</div>`:`<div class="empty">${m}</div>`;
const nf=t=>`<div class="wrap"><div class="empty" style="margin:80px 0">${t}</div></div>`;
const hero=(e,h)=>`<section class="hero fade"><div class="eyebrow">${e}</div><h1>${h}</h1></section>`;
// оболочка
const N=[["","Главная","⌂","home"],["journal.html","Дневник","✎","journal"],["stories.html","Истории","❝","stories"],["music.html","Музыка","♪","music"],["about.html","Автор","●","about"]],cur=P.split("-")[0];
const ml=c=>N.map(n=>`<a href="${R}${n[0]}" class="${n[3]===cur?"on":""}">${c?`<i>${n[2]}</i>`:""}${n[1]}</a>`).join("");
const acc=me?`${adm?`<a href="${R}admin.html">Управление</a>`:""}<a href="${R}profile.html">${esc(me.nick)}</a>`:`<a href="${R}login.html">Войти</a>`;
B.insertAdjacentHTML("afterbegin",`<header class="top"><div class="wrap"><a class="logo" href="${R}">wserf<i>.</i></a><nav class="nav">${ml()}</nav><div class="acc">${acc}</div></div></header>`);
B.insertAdjacentHTML("beforeend",`<footer><div class="wrap">© wserf · <a href="${R}privacy.html">Конфиденциальность</a></div></footer><nav class="tab">${ml(1)}</nav>
<div id="pl" class="glass"><div id="plc" style="width:48px"></div><div class="i"><b id="plt"></b><small id="pls"></small><div class="bar" id="pb"><div></div></div></div><button id="pp">❚❚</button></div><audio id="au" preload="none"></audio>`);
// плеер
const TR={},au=document.getElementById("au"),pp=document.getElementById("pp"),$=s=>document.querySelector(s);
const reg=a=>(a.forEach(t=>TR[t.id]=t),a);
window.play=id=>{const t=TR[id];if(!t)return;$("#plc").innerHTML=cov(t);$("#plt").textContent=t.title;$("#pls").textContent="wserf";
 if(!t.audio){$("#pls").textContent="Аудио для этой песни ещё не загружено";$("#pl").classList.add("on");return}
 au.src=t.audio;$("#pl").classList.add("on");au.play().catch(()=>{});au.onerror=()=>{$("#pls").textContent="Не удалось загрузить аудио"}};
pp.onclick=()=>au.paused?au.play():au.pause();au.onplay=()=>pp.textContent="❚❚";au.onpause=()=>pp.textContent="▶";
au.ontimeupdate=()=>$("#pb div").style.width=(au.currentTime/au.duration*100||0)+"%";
$("#pb").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();au.currentTime=(e.clientX-r.left)/r.width*au.duration||0};
// просмотры
const view=(t,id)=>{const k="v"+id;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,1);sb.from("views").insert({target_type:t,target_id:id}).then(()=>{})};
// лайки
async function likes(id){const el=$("#lk");let mine=user?!!(await sb.from("likes").select("track_id").eq("track_id",id).eq("user_id",user.id).maybeSingle()).data:false;
 const draw=async()=>{const n=(await sb.rpc("track_like_count",{t:id})).data||0;el.innerHTML=`<button class="btn ghost" id="lb">${mine?"♥":"♡"} ${n}</button>`;
  $("#lb").onclick=async()=>{if(!user)return location.href=R+"auth/login.html";if(me.banned)return;
   if(mine)await sb.from("likes").delete().eq("track_id",id).eq("user_id",user.id);else await sb.from("likes").insert({track_id:id});mine=!mine;draw()}};draw()}
// комментарии
const EM="😀 😂 🥹 😍 😭 🔥 💚 🖤 ✨ 🌙 🎧 🎶 👏 🙏 😮 💔".split(" "),ST="🌙 💚 🔥 😭 🥹 ✨ 🎧 🖤".split(" ");
const cmBox=`<section class="sec"><h2>Комментарии</h2><div id="cmf"></div><div id="cml"></div></section>`;
async function comments(type,id){let parent=null;
 const form=()=>{const f=$("#cmf");if(!user){f.innerHTML=`<div class="empty">Чтобы комментировать, <a href="${R}login.html" style="color:var(--ac)">войдите</a> или <a href="${R}register.html" style="color:var(--ac)">зарегистрируйтесь</a>.</div>`;return}
  if(me.banned){f.innerHTML='<div class="empty">Возможность писать ограничена.</div>';return}
  f.innerHTML=`<div class="cmf glass" style="padding:18px"><div id="rp" class="meta"></div><textarea id="ct" rows="3" maxlength="1000" placeholder="Ваш комментарий (без ссылок)"></textarea><div class="emo">${EM.map(e=>`<button type="button" data-e="${e}">${e}</button>`).join("")}</div>
  <input id="gf" placeholder="GIF: ссылка с giphy.com или tenor.com (необязательно)"><div class="meta">Стикеры — отправляются сразу:</div><div class="emo">${ST.map(e=>`<button type="button" data-s="${e}" style="font-size:34px">${e}</button>`).join("")}</div><button class="btn" id="cs" style="justify-self:start">Отправить</button><div class="er" id="ce"></div></div>`;
  f.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>$("#ct").value+=b.dataset.e);
  const send=async o=>{const{error}=await sb.from("comments").insert({target_type:type,target_id:id,parent_id:parent,...o});if(error)return $("#ce").textContent=error.message.includes("check")?"Ссылки в тексте и посторонние GIF-адреса не допускаются.":error.message;parent=null;form();load()};
  f.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>send({sticker:b.dataset.s}));
  $("#cs").onclick=()=>send({body:$("#ct").value.trim(),gif_url:$("#gf").value.trim()||null})};
 const load=async()=>{const rows=await get(sb.from("comments").select("*,profiles(nick)").eq("target_type",type).eq("target_id",id).order("created_at"));
  const one=(r,s)=>`<div class="cm ${s?"sub":""}"><div class="meta"><b>${esc(r.profiles?.nick)}</b> · ${fmt(r.created_at)}${user&&(r.user_id===user.id||adm)?` · <a href="#" data-d="${r.id}">удалить</a>`:""}${user&&!s&&!me.banned?` · <a href="#" data-r="${r.id}">ответить</a>`:""}</div>${r.sticker?`<div class="stk">${esc(r.sticker)}</div>`:""}${r.body?`<p>${esc(r.body)}</p>`:""}${r.gif_url?`<img class="gif" src="${esc(r.gif_url)}" alt="GIF">`:""}</div>`;
  const el=$("#cml");el.innerHTML=rows.filter(r=>!r.parent_id).map(t=>one(t)+rows.filter(x=>x.parent_id===t.id).map(x=>one(x,1)).join("")).join("")||'<div class="empty">Пока нет комментариев.</div>';
  el.querySelectorAll("[data-d]").forEach(a=>a.onclick=async e=>{e.preventDefault();if(confirm("Удалить комментарий?")){await sb.from("comments").delete().eq("id",a.dataset.d);load()}});
  el.querySelectorAll("[data-r]").forEach(a=>a.onclick=e=>{e.preventDefault();parent=a.dataset.r;$("#rp").textContent="Ответ на комментарий";$("#ct")?.focus()})};
 form();load()}
// страницы
const post=async(kind,t)=>{const o=(await get(sb.from("posts").select("*").eq("id",Q).eq("kind",kind).eq("published",true)))[0];if(!o)return nf("Не найдено.");
 setTimeout(()=>{view("post",o.id);comments("post",o.id)});
 return `<div class="wrap"><article class="art fade"><div class="meta">${fmt(o.published_at)}${o.category?" · "+esc(o.category):""}</div><h1>${esc(o.title)}</h1>${o.cover?cov(o,1):""}<div class="body">${esc(o.body)}</div>${cmBox}</article></div>`};
const trRows=ts=>ts.map((t,i)=>`<div class="tr" onclick="play('${t.id}')"><b>${i+1}</b><span>${esc(t.title)}</span><a href="${L.track(t.id)}" onclick="event.stopPropagation()">Страница</a></div>`).join("")||'<div class="empty">Песен пока нет.</div>';
const pubQ=(t,o)=>sb.from(t).select("*").eq("published",true).order(o,{ascending:false});
const V={
home:async()=>{const[t]=reg(await get(pubQ("tracks","published_at").limit(1)));const ps=await get(pubQ("posts","published_at").eq("kind","journal").limit(3)),ss=await get(pubQ("posts","published_at").eq("kind","story").limit(3));
 return `<div class="wrap">${hero("личное пространство","Мысли, музыка и <em>истории</em>")}<p style="color:var(--t2);font-size:19px;max-width:34em;margin-top:-28px">Меня зовут wserf. Здесь я пишу дневник, рассказываю, как рождаются песни, и делюсь музыкой.</p>
 ${t?`<section class="sec"><div class="glass feat fade">${cov(t)}<div><div class="eyebrow">Свежий релиз</div><h2>${esc(t.title)}</h2><p style="color:var(--t2)">${esc(t.story||"")}</p><button class="btn" onclick="play('${t.id}')">▶ Слушать</button> <a class="btn ghost" href="${L.track(t.id)}">Страница песни</a></div></div></section>`:""}
 <section class="sec"><h2>Дневник <a href="${R}journal.html">Все записи →</a></h2>${list(ps,"post","Первые записи появятся совсем скоро.")}</section><section class="sec"><h2>Истории <a href="${R}stories.html">Все истории →</a></h2>${list(ss,"story","Истории появятся здесь.")}</section></div>`},
journal:async()=>`<div class="wrap">${hero("дневник","Заметки и <em>мысли</em>")}${list(await get(pubQ("posts","published_at").eq("kind","journal")),"post","Записей пока нет.")}</div>`,
stories:async()=>`<div class="wrap">${hero("истории","Как это <em>создавалось</em>")}${list(await get(pubQ("posts","published_at").eq("kind","story")),"story","Историй пока нет.")}</div>`,
"journal-post":()=>post("journal"),"stories-story":()=>post("story"),
music:async()=>{const a=await get(pubQ("albums","year")),t=reg(await get(pubQ("tracks","published_at")));return `<div class="wrap">${hero("музыка","Альбомы и <em>песни</em>")}<div class="grid">${a.map(albCard).join("")||'<div class="empty">Альбомов пока нет.</div>'}</div><section class="sec"><h2>Все песни</h2>${trRows(t)}</section></div>`},
"music-album":async()=>{const a=(await get(pubQ("albums","year").eq("id",Q)))[0];if(!a)return nf("Альбом не найден.");const ts=reg(await get(sb.from("tracks").select("*").eq("album_id",a.id).eq("published",true).order("position")));
 return `<div class="wrap"><div class="alb fade">${cov(a)}<div><div class="eyebrow">Альбом · ${a.year||""}</div><h1>${esc(a.title)}</h1><p style="color:var(--t2)">${esc(a.description||"")}</p>${a.story?`<p style="margin-top:16px;white-space:pre-wrap">${esc(a.story)}</p>`:""}<div style="margin-top:28px">${trRows(ts)}</div></div></div></div>`},
"music-track":async()=>{const t=reg(await get(pubQ("tracks","published_at").eq("id",Q)))[0];if(!t)return nf("Песня не найдена.");const a=t.album_id?(await get(sb.from("albums").select("id,title").eq("id",t.album_id)))[0]:null;
 setTimeout(()=>{view("track",t.id);likes(t.id);comments("track",t.id)});
 return `<div class="wrap"><div class="alb fade">${cov(t)}<div><div class="eyebrow">${a?`<a href="${L.album(a.id)}">${esc(a.title)}</a> · `:""}${fmt(t.published_at)}</div><h1>${esc(t.title)}</h1><button class="btn" onclick="play('${t.id}')">▶ Слушать</button> <span id="lk"></span>
 ${t.story?`<h3 style="margin:36px 0 12px">История</h3><p style="color:var(--t2);white-space:pre-wrap">${esc(t.story)}</p>`:""}<h3 style="margin:36px 0 12px">Текст</h3>${t.lyrics?`<div class="lyr">${esc(t.lyrics)}</div>`:'<div class="empty">Текст пока не добавлен.</div>'}${cmBox}</div></div></div>`},
about:()=>`<div class="wrap"><div class="art fade"><div class="eyebrow">об авторе</div><h1>wserf</h1><div class="body">Это моё личное пространство: дневник, истории и музыка. Я не зарабатываю на этом, я просто делюсь тем, что у меня внутри.\n\nПервая песня, «Опять и опять», родилась ночью. Текст мой, музыку я собирал в Suno.</div></div></div>`,
"about-privacy":()=>`<div class="wrap"><div class="art"><h1>Конфиденциальность</h1><div class="body">Что хранится: почта, никнейм, хэш пароля (сам пароль мы не видим), ваши лайки и комментарии, дата регистрации. Почта видна только вам и системе входа, остальным виден лишь никнейм.\n\nСтатистика: считается только количество просмотров страниц, без привязки к человеку, IP-адресам и отпечаткам.\n\nУдаление: в профиле есть кнопка «Удалить аккаунт», она стирает аккаунт, лайки и комментарии.\n\nКомментарии без ссылок; автор может удалять сообщения и ограничивать доступ нарушителям.</div></div></div>`,
login:()=>`<div class="wrap"><form class="auth glass fade" id="af"><h1>Вход</h1><input name="email" type="email" placeholder="Почта" required><input name="password" type="password" placeholder="Пароль" required><button class="btn">Войти</button><div class="er" id="er"></div><div class="meta">Нет аккаунта? <a href="${R}register.html" style="color:var(--ac)">Регистрация</a></div></form></div>`,
register:()=>`<div class="wrap"><form class="auth glass fade" id="af"><h1>Регистрация</h1><input name="nick" placeholder="Никнейм (2–24 символа)" minlength="2" maxlength="24" required><input name="email" type="email" placeholder="Почта" required><input name="password" type="password" placeholder="Пароль (от 8 символов)" minlength="8" required><button class="btn">Создать аккаунт</button><div class="er" id="er"></div><div class="meta">Регистрируясь, вы принимаете <a href="${R}privacy.html" style="color:var(--ac)">политику конфиденциальности</a>.</div></form></div>`,
profile:async()=>{if(!me)return nf(`<a href="${R}login.html" style="color:var(--ac)">Войдите</a>, чтобы открыть профиль.`);
 const lk=await get(sb.from("likes").select("tracks(id,title)").eq("user_id",me.id)),cm=await get(sb.from("comments").select("body,sticker,created_at").eq("user_id",me.id).order("created_at",{ascending:false}).limit(20));
 return `<div class="wrap"><div class="art"><div class="eyebrow">профиль</div><h1>${esc(me.nick)}</h1><div class="meta">${esc(user.email)} · с ${fmt(me.created_at)}</div>
 <form id="nf" class="frm glass" style="margin-top:24px"><label>Никнейм<input name="nick" value="${esc(me.nick)}" minlength="2" maxlength="24"></label><button class="btn" style="justify-self:start;margin:0">Сохранить</button><div class="er" id="er"></div></form>
 <h3>Понравившиеся песни</h3>${lk.map(l=>l.tracks?`<div class="tr"><span><a href="${L.track(l.tracks.id)}">♥ ${esc(l.tracks.title)}</a></span></div>`:"").join("")||'<div class="empty">Пока нет.</div>'}
 <h3 style="margin-top:32px">Мои комментарии</h3>${cm.map(c=>`<div class="cm"><div class="meta">${fmt(c.created_at)}</div>${esc(c.sticker||c.body||"GIF")}</div>`).join("")||'<div class="empty">Пока нет.</div>'}
 <div style="margin-top:36px;display:flex;gap:12px;flex-wrap:wrap"><button class="btn ghost" id="lo">Выйти</button>${adm?"":'<button class="btn ghost" id="dm" style="color:#e7a39a">Удалить аккаунт</button>'}</div></div></div>`},
admin:()=>""
};
const A={
 login:()=>$("#af").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),{error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});error?$("#er").textContent="Неверная почта или пароль.":location.href=R},
 register:()=>$("#af").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),{data,error}=await sb.auth.signUp({email:f.get("email"),password:f.get("password"),options:{data:{nick:f.get("nick")}}});
  if(error)return $("#er").textContent=error.message;data.session?location.href=R:$("#af").innerHTML='<h1>Почти готово</h1><p>Мы отправили письмо. Подтвердите почту и войдите.</p>'},
 profile:()=>{if(!me)return;$("#nf").onsubmit=async e=>{e.preventDefault();const{error}=await sb.from("profiles").update({nick:new FormData(e.target).get("nick")}).eq("id",me.id);error?$("#er").textContent="Ник должен быть от 2 до 24 символов.":location.reload()};
  $("#lo").onclick=async()=>{await sb.auth.signOut();location.href=R};
  const d=$("#dm");if(d)d.onclick=async()=>{if(confirm("Удалить аккаунт, лайки и комментарии навсегда?")){await sb.rpc("delete_me");await sb.auth.signOut();location.href=R}}}
};
if(!sb&&!["about","about-privacy"].includes(P)){M.innerHTML=nf('Сайт ещё не подключён к базе данных. Откройте <b>assets/js/config.js</b> и вставьте данные Supabase (инструкция в README.md).');}
else{M.innerHTML=await V[P]();A[P]?.()}
document.title=P==="home"?"wserf — мысли, музыка и истории":"wserf · "+document.title;
})();
