/* core/onboarding.js: ОНБОРДИНГ и FUTURE API. Часть бывшего большого app.js (разрезан в 0.28.0 без смены поведения; порядок подключения в index.html важен). */
/* ===== ОНБОРДИНГ ===== */
const ONBOARD_ONCE=true; /* true — показывать только при первом запуске (флаг «показан» ставится сразу при показе), false — при каждом запуске */
const OB_ART=[
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><circle class="dr" pathLength="1" style="--d:100" cx="160" cy="160" r="134" stroke-opacity=".14"/><circle class="dr" pathLength="1" style="--d:220" cx="160" cy="160" r="100" stroke-opacity=".24"/><circle class="dr" pathLength="1" style="--d:340" cx="160" cy="160" r="66" stroke-opacity=".4"/>
<g class="sp1"><g class="e" style="--d:600"><circle class="fc" cx="294" cy="160" r="6" fill-opacity=".85"/><circle class="fc" cx="60" cy="160" r="3.5" fill-opacity=".5"/></g></g>
<g class="sp2"><g class="e" style="--d:720"><circle class="fc" cx="160" cy="60" r="5" fill-opacity=".7"/><circle class="fa" cx="160" cy="260" r="4"/></g></g>
<g class="e" style="--d:420"><circle class="fa br" cx="160" cy="160" r="46" fill-opacity=".1"/><circle class="fa" cx="160" cy="160" r="22"/></g>
<g class="e" style="--d:640" stroke-opacity=".55" stroke-width="1.5" stroke-linecap="round"><path d="M160 104v-14M160 216v14M104 160h-14M216 160h14M120 120l-10-10M200 200l10 10M200 120l10-10M120 200l-10 10"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><g class="e" style="--d:0"><g class="fl" style="--p:0s"><rect x="58" y="62" width="188" height="128" rx="26" stroke-opacity=".18"/></g></g>
<g class="e" style="--d:140"><g class="fl" style="--p:-2s"><rect class="fb" x="74" y="92" width="188" height="128" rx="26" stroke-opacity=".34"/></g></g>
<g class="e" style="--d:280"><g class="fl" style="--p:-4s"><rect class="fs" x="90" y="122" width="188" height="128" rx="26" stroke-opacity=".75"/><path d="M116 156h92M116 180h128M116 204h70" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><circle class="fa" cx="252" cy="150" r="8"/></g></g>
<g class="e" style="--d:560"><path d="M226 54a32 32 0 0 1 32 32" stroke-opacity=".5" stroke-linecap="round"/><circle class="fa" cx="268" cy="50" r="4"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><path class="fw" d="M160 52L160 160M253.5 106L160 160M253.5 214L160 160M160 268L160 160M66.5 214L160 160M66.5 106L160 160" stroke-opacity=".38" stroke-linecap="round"/>
<g class="e" style="--d:120"><circle class="fs" cx="160" cy="52" r="12" stroke-opacity=".7"/><circle class="fa" cx="160" cy="52" r="4"/></g><g class="e" style="--d:200"><circle class="fs" cx="253.5" cy="106" r="12" stroke-opacity=".55"/><circle class="fc" cx="253.5" cy="106" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:280"><circle class="fs" cx="253.5" cy="214" r="12" stroke-opacity=".55"/><circle class="fc" cx="253.5" cy="214" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:360"><circle class="fs" cx="160" cy="268" r="12" stroke-opacity=".55"/><circle class="fc" cx="160" cy="268" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:440"><circle class="fs" cx="66.5" cy="214" r="12" stroke-opacity=".55"/><circle class="fc" cx="66.5" cy="214" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:520"><circle class="fs" cx="66.5" cy="106" r="12" stroke-opacity=".55"/><circle class="fc" cx="66.5" cy="106" r="3.5" fill-opacity=".8"/></g>
<g class="e" style="--d:600"><rect class="fs" x="124" y="124" width="72" height="72" rx="22" stroke-opacity=".85"/><circle class="fa br" cx="160" cy="160" r="9"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><g style="transform:rotate(-8deg);transform-origin:160px 160px"><rect class="dr" pathLength="1" style="--d:0" x="46" y="46" width="228" height="228" rx="56" stroke-opacity=".16"/><rect class="dr" pathLength="1" style="--d:160" x="78" y="78" width="164" height="164" rx="42" stroke-opacity=".3"/><rect class="dr" pathLength="1" style="--d:320" x="110" y="110" width="100" height="100" rx="28" stroke-opacity=".62"/></g>
<g class="e" style="--d:640"><path class="sa" d="M160 138v44" stroke-width="3" stroke-linecap="round"/></g><g class="sp1"><g class="e" style="--d:760"><circle class="fa" cx="160" cy="44" r="5"/></g></g>
<g class="e" style="--d:700" stroke-opacity=".5" stroke-linecap="round"><path d="M34 66V34h32M254 34h32v32M286 254v32h-32M66 286H34v-32"/></g></svg>`];
const OB_SLIDES=[
{h:{ru:['Твои идеи.','Твой ИИ.'],en:['Your ideas.','Your AI.']},p:{ru:'Открой новые возможности с Kairema AI. Пространство, где технологии помогают воплощать твои идеи.',en:'Unlock new possibilities with Kairema AI. A space where technology helps bring your ideas to life.'},g1:['0px','-38vh'],g2:['30vw','30vh']},
{h:{ru:['Больше, чем ответы'],en:['More than answers']},p:{ru:'Изучай новое, решай задачи, создавай идеи и находи решения в одном приложении.',en:'Learn new things, solve tasks, create ideas and find solutions in one app.'},g1:['35vw','-10vh'],g2:['-30vw','34vh']},
{h:{ru:['Всё в одном месте'],en:['Everything in one place']},p:{ru:'Общайся, работай с идеями и возвращайся к своим задачам в удобном для тебя ритме.',en:'Chat, work with ideas and return to your tasks at a pace that suits you.'},g1:['-32vw','22vh'],g2:['28vw','-28vh']},
{h:{ru:['Твоё пространство.','Твои правила.'],en:['Your space.','Your rules.']},p:{ru:'Начни с простого вопроса. Исследуй, экспериментируй и создавай собственный путь.',en:'Start with a simple question. Explore, experiment and create your own path.'},g1:['0px','0px'],g2:['0px','36vh']}];
function onboarding(){let i=0,busy=0;const N=OB_SLIDES.length,lg=()=>LANG==='en'?'en':'ru';
 const o=el(`<div class="full ob out" data-screen="onboarding"><div class="bg"><i class="gl g1"><b></b></i><i class="gl g2"><b></b></i><i class="gd"></i></div>
  <header class="obt"><div class="obp">${'<i><b></b></i>'.repeat(N)}</div><button class="skip" id="ob-skip" data-action="onboarding:skip" data-ob="skip">Пропустить</button></header>
  <main class="stage"><div class="slide"><div class="art"></div><div class="txt"></div></div></main>
  <footer class="obf"><button class="btn ghost back hid" id="ob-back" data-action="onboarding:back" data-ob="back">Назад</button><button class="btn next" id="ob-next" data-action="onboarding:next" data-ob="next"><span>Далее</span>${ic('chevR')}</button></footer></div>`);
 app.append(o);
 const sl=$('.slide',o),art=$('.art',o),txt=$('.txt',o),segs=$$('.obp i',o),nx=$('.next span',o),bk=$('.back',o),sk=$('.skip',o);
 const paint=(dir,first)=>{const s=OB_SLIDES[i],L=lg(),h=s.h[L];let k=0;
  sl.style.setProperty('--ex',(first?0:dir*64)+'px');sl.style.setProperty('--ey',first?'14px':'0px');sl.style.setProperty('--es',first?'.96':'.97');
  art.innerHTML=OB_ART[i];
  txt.innerHTML=`<div class="no">0${i+1} / 0${N}</div><h1>${h.map(l=>`<span class="ln">${l.split(' ').map(w=>`<span class="w"><span style="--k:${k++}">${w}</span></span>`).join(' ')}</span>`).join('')}</h1><p>${s.p[L]}</p>`;
  segs.forEach((e,j)=>{e.classList.toggle('on',j===i);e.classList.toggle('done',j<i)});
  o.style.setProperty('--gp',-i*40+'px');[['g1',s.g1],['g2',s.g2]].forEach(([c,v])=>{const g=$('.'+c,o);g.style.setProperty('--x',v[0]);g.style.setProperty('--y',v[1])});
  const last=i===N-1;nx.textContent=last?'Начать':'Далее';nx.classList.remove('nt');void nx.offsetWidth;nx.classList.add('nt');bk.classList.toggle('hid',i===0);sk.classList.toggle('hid',last)};
 const finish=()=>{if(ONBOARD_ONCE)st.set('ko','1');o.classList.add('out');setTimeout(()=>o.remove(),500);setTimeout(askName,600)};
 const go=n=>{if(busy||n<0)return;if(n>=N){finish();return}const dir=n>i?1:-1;busy=1;sl.style.setProperty('--dx',dir*56+'px');sl.classList.add('lv');setTimeout(()=>{i=n;sl.classList.remove('lv');paint(dir);busy=0},300)};
 $('[data-ob=next]',o).onclick=()=>go(i+1);bk.onclick=()=>go(i-1);sk.onclick=finish;
 let x0=null;const stg=$('.stage',o);stg.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});stg.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(i+(dx<0?1:-1))});
 const kd=e=>{if(!o.isConnected)return document.removeEventListener('keydown',kd);if(e.key==='ArrowRight')go(i+1);if(e.key==='ArrowLeft')go(i-1)};document.addEventListener('keydown',kd);
 raf(()=>{o.classList.remove('out');paint(1,1)})}
let ended=0;function endSplash(){if(ended)return;ended=1;$('#splash').classList.add('out');setTimeout(()=>$('#splash').remove(),600);if(!ONBOARD_ONCE||!st.get('ko')){if(ONBOARD_ONCE)st.set('ko','1');onboarding()}else askName()}
/* ===== FUTURE API: единая точка подключения backend ===== */
/* Сейчас данные шаблонов лежат в localStorage. Для перехода на сервер замените тела методов Api.templates.*
   на fetch(`${Api.base}/templates`, {headers:{Authorization:'Bearer '+Api.token}}) — UI-код менять не нужно.
   TODO(auth): вход и токен; TODO(api): /messages (чат с провайдером), /sessions, /providers, /memory, /profile — аналогично. */
const Api={base:'',token:null,
 templates:{KEY:'kairema.templates.v1',_mem:[],persistent:true,
  _read(){try{const a=JSON.parse(localStorage.getItem(this.KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.prompt==='string'):[]}catch(e){return this._mem.slice()}},
  _write(a){this._mem=a.slice();try{localStorage.setItem(this.KEY,JSON.stringify(a));this.persistent=true}catch(e){this.persistent=false}},
  async list(){return this._read()},
  async create(d){const a=this._read(),t={id:'t_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...d,createdAt:Date.now(),updatedAt:Date.now()};a.unshift(t);this._write(a);return t},
  async update(id,d){const a=this._read(),i=a.findIndex(x=>x.id===id);if(i<0)throw new Error('not found');a[i]={...a[i],...d,updatedAt:Date.now()};this._write(a);return a[i]},
  async remove(id){this._write(this._read().filter(x=>x.id!==id))}}};
