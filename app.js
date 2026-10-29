const C='Charts',R='Reading',K='Classes',PR='Class prep',F='Reflection and prayer',M='Meals and breaks';
// [start, end, label, group]; hours past 24 run into the next night
const P={
mon:[['06:30','08:00','Charts',C],['09:30','10:00','Prepare for class',PR],['11:00','13:00','First class',K],['13:00','14:00','Break: read the word of God',F],['14:00','16:00','Second class',K],['16:00','18:00','Third class (free for now): read',R],['18:30','19:00','Personal reflection',F],['19:00','20:00','Prepare dinner',M],['21:30','25:00','Read',R],['25:00','26:00','Charts for the morning',C]],
tue:[['06:30','07:00','Prepare for class',PR],['07:00','08:00','Charts: trade opportunities',C],['09:00','11:00','Free class slot: read',R],['11:00','12:00','Second class',K],['12:00','14:00','Break: reading and the word of God',F],['14:00','16:00','Last class',K],['16:30','17:00','Reflection on the word',F],['17:30','18:30','Eat and prepare dinner',M],['21:30','24:00','Read',R],['24:00','25:00','Charts',C]],
wed:[['06:30','09:30','Charts, phone, breakfast',C],['09:30','13:30','Reading',R],['13:30','14:30','Bible study and prayer',F],['15:00','18:00','Continue reading',R],['18:00','21:00','Dinner and break',M],['21:00','24:00','Reading',R],['24:00','25:00','Study (if no charts)',R]],
thu:[['06:30','07:00','Prepare for class',PR],['07:00','08:00','Charts',C],['09:00','13:00','Class',K],['13:30','15:30','Get home, prepare food, eat',M],['15:30','17:30','Read',R],['17:30','18:30','Evening reflection',F],['18:00','19:00','Prepare dinner',M],['20:00','25:00','Reading',R],['25:00','26:00','Study the charts',C]],
fri:[['06:30','08:30','Charts, breakfast',C],['08:30','11:30','Reading',R],['11:30','14:30','Bible study and prayer',F],['14:30','18:30','Continue reading',R],['18:30','20:00','Dinner and break',M],['21:00','24:00','Reading',R]],
sat:[['07:00','12:00','Reading, prepare breakfast',R],['12:00','13:30','Break',M],['13:30','14:30','Bible study and prayer',F],['15:00','18:00','Reading',R],['18:00','18:30','Dinner, break, personal reflection',F],['19:30','23:30','Reading',R]],
sun:[['06:30','09:00','Prepare for church',PR],['09:00','12:00','Church, or study of the word',F],['13:00','17:00','Reading',R],['17:00','20:00','Dinner, break, study the charts',C],['22:00','24:00','Reading',R]]
};

const APP_VERSION='4.0',SCHEMA=3;
const DAYS=[['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday'],['sun','Sunday']];
const GROUPS=[C,R,K,PR,F,M,'Wake and quiet time'];
const GC={'Charts':'#2B69DC','Reading':'#6C5CE7','Classes':'#E69D28','Class prep':'#C9A227','Reflection and prayer':'#239B69','Meals and breaks':'#0FA3B1','Wake and quiet time':'#7C8DA6'};
const m=s=>{const[a,b]=s.split(':');return +a*60+ +b};
const hhmm=x=>{x=((x%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')};
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const dur=x=>{x=Math.max(0,Math.round(x));const h=Math.floor(x/60),mi=x%60;return h?h+'h'+(mi?' '+mi+'m':''):mi+'m'};
const $=s=>document.querySelector(s);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const dk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

// ---- storage helpers ----
const WQ={};let wTm=null,wFail=false;
const flushW=()=>{clearTimeout(wTm);wTm=null;for(const k in WQ){try{localStorage.setItem(k,JSON.stringify(WQ[k]))}catch(e){if(!wFail){wFail=true;try{toast('Storage is full or blocked. Export a backup now.')}catch(x){}}}delete WQ[k]}};
const lsGet=(k,d)=>{flushW();try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{WQ[k]=v;clearTimeout(wTm);wTm=setTimeout(flushW,300);return true};

// ---- settings (versioned, with defaults) ----
const defSet=()=>({h24:true,goal:120,cues:true,pbreak:5,journalBackup:null,rem:{on:false,lead:{'Classes':10,'Reading':0,'Charts':-1,'Class prep':-1,'Reflection and prayer':-1,'Meals and breaks':-1,'Wake and quiet time':-1},revAt:'20:00',revOn:true,quiet:true,qs:'22:00',qe:'07:00'}});
let settings=lsGet('wt-settings',null);
{const d=defSet();settings=Object.assign(d,settings||{});settings.chk=Object.assign({on:true,delay:5,end:true},settings.chk||{});settings.rem=Object.assign(d.rem,(settings&&settings.rem)||{});settings.rem.lead=Object.assign(d.rem.lead,settings.rem.lead||{})}
const saveSettings=()=>lsSet('wt-settings',settings);
const applyDens=()=>{document.documentElement.dataset.dens=settings.dens||'cozy'};applyDens();
const fmt=x=>{x=((x%1440)+1440)%1440;if(settings.h24)return hhmm(x);const h=Math.floor(x/60),mi=x%60;return((h%12)||12)+(mi?':'+String(mi).padStart(2,'0'):'')+(h<12?'am':'pm')};

// ---- plan (editable, saved in this browser) ----
const defPlan=()=>{const o={};DAYS.forEach(d=>{o[d[0]]=[['05:30','06:00','Wake up','Wake and quiet time'],['06:00','06:30','Quiet time','Wake and quiet time'],...P[d[0]]].map((b,i)=>({id:d[0]+'-'+i,s:m(b[0]),e:m(b[1]),l:b[2],g:b[3]}))});return o};
let plan=null;try{plan=JSON.parse(localStorage.getItem(settings.prof==='exam'?'week-tracker-plan-exam':'week-tracker-plan'))}catch(e){}
if(!plan||!plan.mon)plan=defPlan();
DAYS.forEach(d=>{if(!Array.isArray(plan[d[0]]))plan[d[0]]=[];plan[d[0]].forEach((b,i)=>{if(!b.id)b.id=d[0]+'-m'+i+uid('')})});
const savePlan=()=>lsSet(settings.prof==='exam'?'week-tracker-plan-exam':'week-tracker-plan',plan);

// ---- week data ----
const now0=new Date();
const monOf=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));
const wkKey=md=>'week-tracker:'+md.getFullYear()+'-'+(md.getMonth()+1)+'-'+md.getDate();
const mon=monOf(now0),KEY=wkKey(mon);
const dateOf=i=>new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i);
const todayIdx=(now0.getDay()+6)%7;
let st={t:{},s:{},n:{}};
try{const r=JSON.parse(localStorage.getItem(KEY));if(r&&r.t)st=r}catch(e){}
['c','mn','z','r','ov','wr'].forEach(k=>{st[k]=st[k]||{}});st.s=st.s||{};st.n=st.n||{};
const total=()=>Object.values(plan).reduce((a,b)=>a+b.length,0);
const save=()=>{st.tot=total();st.plan=plan;lsSet(KEY,st)};
const TH=['auto','light','dark'];let th='auto';try{th=localStorage.getItem('wt-theme')||'auto'}catch(e){}
const applyTh=()=>{if(th==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=th};applyTh();

// block view for the current week: weekly plan + this week's one-off moves; "once" blocks only show in their own week
const ovApply=b=>{const o=st.ov[b.id];return o?Object.assign({},b,{s:o.s,e:o.e,mv:true}):b};
const blocks=k=>plan[k].filter(b=>!b.once||b.once===KEY).map(ovApply).sort((a,b)=>a.s-b.s);
const isMissed=(b,i)=>!st.t[b.id]&&!st.c[b.id]&&dateOf(i).getTime()+b.e*60000<Date.now();

// ---- courses, topics, exams ----
const SEED=[['ELE 401','Electric Power Principles'],['ELE 403','Servomechanism and Control Theory'],['ELE 405','Communication Principles'],['ELE 407','Measurements and Instrumentation'],['ELE 409','Power Electronics'],['ABE 443','Statistics for Engineers'],['ELE 491','Instrumentation & Control Laboratory'],['ELE 493','Communications Laboratory'],['ABE 413','Engineering Communication']];
const LECT={'ELE 405':'Dr Erinosho'};
let courses=lsGet('wt-courses',null);if(!courses)courses=SEED.map((c,i)=>({id:'c'+i,code:c[0],name:c[1],exam:'',topics:[]}));

const TOP={"ELE 401": ["Power system components and primary energy sources", "Steam (thermal) power stations: boiler, turbine, cooling", "Coal-fired and oil-fired stations", "Hydro power stations and pumped storage", "Gas turbine and nuclear power stations", "Excitation system", "Siting of power stations", "Unconventional energy sources (solar and wind)", "Load curves", "Load forecasting", "Polyphase systems (6 and 12 phase)", "Power supply systems: DC and AC", "DC distributors (calculations)", "AC supply systems (single-phase and three-phase wiring)", "Distribution networks: radial, ring and feeder design", "Substations: schemes and equipment", "Economics of supply: two-part tariff, load factor, diversity factor", "Power factor and its improvement", "Synchronous motor for power factor improvement", "HVAC versus HVDC and corona (in past questions)"], "ELE 405": ["Communication process and system models", "Communication modes, resources, networks and channels", "Concept of information volume", "Signal models and classification", "Amplitude modulation (AM) and modulation index", "AM generation, modulators and demodulators", "AM variants: DSB-SC, SSB and VSB", "Angle modulation: FM and PM", "FM generation and detection (PLL, ratio, slope)", "Digitization and sampling", "Pulse modulation and PCM", "Quantization and companding", "DPCM and delta modulation", "Binary arithmetic", "Signed numbers and number representation", "Binary coding schemes (EBCDIC, ASCII, Unicode)", "Multiplexing: FDM, TDM and WDM", "Multiple access: FDMA, TDMA and CDMA", "PDH and SDH/SONET", "Transmission media", "Antennas, microwave and satellite links", "Wireless propagation and free-space loss", "Fourier series and transforms (in past questions)", "Linear systems and filters (in past questions)"], "ELE 407": ["Measuring instruments: classification and errors", "Ammeters and voltmeters (PMMC, MI, dynamometer)", "Wattmeters", "Energy meters", "Frequency meters", "Instrument transformers (CT and PT)", "Galvanometers", "DC potentiometers", "AC potentiometers", "DC and AC bridges", "Transducers: strain gauge, thermistor, thermocouple, LVDT", "Other transducers: capacitive, piezo-electric, optical, Hall effect", "Torque meters and tachometers", "Cathode ray oscilloscope (CRO)", "Digital multimeter and electronic voltmeters", "Digital frequency meter"], "ELE 409": ["Thyristor family and SCR characteristics", "SCR turn-on methods and triggering circuits", "SCR turn-off and commutation", "AC-AC converters", "DC-AC converters: single-phase inverters", "DC-AC converters: three-phase inverters and voltage control", "DC-DC converters (choppers)", "Rectifiers: half-wave and full-wave", "Three-phase rectifiers", "Controlled rectifiers", "Single-phase full-bridge rectifier"], "ABE 443": ["Role of statistics and data collection", "Probability and addition rules", "Conditional probability and multiplication rule", "Hypothesis testing: basics and level of significance", "Hypothesis tests on the mean", "Hypothesis tests on variance and standard deviation", "Difference in means and variances", "Summary of inferences from statistical tests", "Simple linear regression", "Multiple linear regression", "Single-factor experiments and ANOVA (CRD)", "Randomized complete block design (RCBD)", "Experiments with several factors", "Regression, correlation and coefficient of determination"], "ABE 413": ["Technical report writing: introduction", "Components and structure of a technical report", "Components and structure (continued)", "What needs are necessary for a technical report", "Who needs a technical report", "How a technical report is written", "How a technical report is written (continued)", "Presentation and miscellaneous descriptions", "Concluding parts"]};

const ST=['Not started','Learning','Revised','Confident'],SL={done:'Done',partial:'Partial',skipped:'Skipped',cancelled:'Cancelled'};
const PRI=['High','Medium','Low'];
// ---- faith & growth (private) ----
const defFaith=()=>({habits:[{id:'h1',n:'Prayer',days:[0,1,2,3,4,5,6]},{id:'h2',n:'Bible reading',days:[0,1,2,3,4,5,6]},{id:'h3',n:'Gratitude',days:[0,1,2,3,4,5,6]}],log:{},notes:{},reading:'',readLog:{},ana:true});
let faith=Object.assign(defFaith(),lsGet('wt-faith',null)||{});
const saveFaith=()=>lsSet('wt-faith',faith);
let sessions=lsGet('wt-sessions',[]),fs=lsGet('wt-focus',null),fm=25,fb=5,open=null,ocn=-1,fdone=null;

// ---- migration & normalisation (safe to run on every start) ----
const WK=/^week-tracker:\d{4}-\d+-\d+$/;
function normalise(){
  let ch=false;
  courses.forEach(c=>{
    if(!c.id){c.id=uid('c');ch=true}
    if(!c.topics){c.topics=[];ch=true}
    if(!(c.topics.length)&&TOP[c.code]){c.topics=TOP[c.code].map(n=>({n,s:0}));ch=true}
    if(c.lecturer===undefined){c.lecturer=LECT[c.code]||'';ch=true}
    if(c.semester===undefined){c.semester='First semester, 400L';ch=true}
    if(!Array.isArray(c.exams)){c.exams=c.exam?[{id:uid('x'),title:'Exam',date:c.exam,pri:'High',list:[]}]:[];ch=true}
    c.topics.forEach(t=>{if(!(t.s>=0&&t.s<=3)){t.s=0;ch=true}});
  });
  if(ch)lsSet('wt-courses',courses);
  sessions.forEach(s=>{if(!s.id){s.id=uid('s');ch=true}});
}
function makeBackup(withJournal){
  const f=JSON.parse(JSON.stringify(faith));if(withJournal===false){f.notes={};f.readLog=f.readLog}
  const w=allWeeks();if(withJournal===false)Object.values(w).forEach(x=>{if(x&&x.r){x=Object.assign(x,{r:{}})}});
  return{app:'week-tracker',version:SCHEMA,appVersion:APP_VERSION,created:new Date().toISOString(),weeks:w,plan:(settings.prof==='exam'?lsGet('week-tracker-plan',plan):plan),planExam:lsGet('week-tracker-plan-exam',null),courses,sessions,faith:f,settings,theme:th,journalIncluded:withJournal!==false};
}
const allWeeks=()=>{flushW();const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(WK.test(k))o[k]=JSON.parse(localStorage.getItem(k))}}catch(e){}o[KEY]=JSON.parse(JSON.stringify(st));return o};
const saveRecovery=()=>lsSet('wt-recovery',makeBackup(true));
if(!localStorage.getItem('wt-migrated-v3')){lsSet('wt-premigration-v3',makeBackup(true));try{localStorage.setItem('wt-migrated-v3','1')}catch(e){}}
normalise();

function checkBackup(d){
  let w;
  if(d&&d.app==='week-tracker'&&d.weeks&&typeof d.weeks==='object')w=d.weeks;
  else if(d&&d.week&&d.week.t)w={[KEY]:d.week};
  else throw new Error('format');
  if(!d.plan||typeof d.plan!=='object'||!DAYS.every(x=>Array.isArray(d.plan[x[0]])))throw new Error('plan');
  for(const k in w)if(!WK.test(k)||!w[k]||typeof w[k].t!=='object')throw new Error('week');
  if(d.courses&&!Array.isArray(d.courses))throw new Error('courses');
  if(d.sessions&&!Array.isArray(d.sessions))throw new Error('sessions');
  if(d.faith&&(typeof d.faith!=='object'||!Array.isArray(d.faith.habits)))throw new Error('faith');
  return w;
}
function applyBackup(d){
  const w=checkBackup(d);Object.keys(w).forEach(k=>lsSet(k,w[k]));
  lsSet('week-tracker-plan',d.plan);if(d.planExam)lsSet('week-tracker-plan-exam',d.planExam);if(d.courses)lsSet('wt-courses',d.courses);if(d.sessions)lsSet('wt-sessions',d.sessions);
  if(d.faith){const cur=lsGet('wt-faith',{});const f=Object.assign({},d.faith);if(d.journalIncluded===false){f.notes=cur.notes||{}}lsSet('wt-faith',f)}
  if(d.settings)lsSet('wt-settings',d.settings);
  if(d.theme)try{localStorage.setItem('wt-theme',d.theme)}catch(e){}
  (flushW(),location.reload());
}

// ---- schedule maths: overnight spans and overlaps use real minutes on a shared timeline ----
const prevKey=k=>DAYS[(DAYS.findIndex(d=>d[0]===k)+6)%7][0];
function spansFor(k,list){ // blocks of day k plus the part of yesterday's overnight blocks that spills into k
  const out=(list||blocks(k)).map(b=>({b,s:b.s,e:b.e,k}));
  plan[prevKey(k)].filter(b=>(!b.once||b.once===KEY)&&b.e>1440).forEach(b=>out.push({b,s:b.s-1440,e:b.e-1440,k:prevKey(k),spill:true}));
  return out;
}
function conflicts(k){ // id -> [names of blocks it overlaps]; touching blocks (end == start) are fine
  const sp=spansFor(k),o={};
  for(let i=0;i<sp.length;i++)for(let j=i+1;j<sp.length;j++){
    const a=sp[i],b=sp[j];if(a.spill&&b.spill)continue;
      if(a.s<b.e&&b.s<a.e){(o[a.b.id]=o[a.b.id]||[]).push(b.b.l);(o[b.b.id]=o[b.b.id]||[]).push(a.b.l)}
  }
  return o;
}
function conflictFor(k,cand,rid){ // would a candidate [s,e] on day k clash with something? (explained before saving)
  const out=[];
  spansFor(k,plan[k].filter(b=>(!b.once||b.once===KEY)&&(b.rid||b.id)!==rid)).forEach(x=>{if(cand.s<x.e&&x.s<cand.e)out.push(x.b.l+' ('+fmt(x.s)+'–'+fmt(x.e)+')')});
  return out;
}

// ---- focus helpers ----
const fLeft=()=>fs?(fs.endAt?fs.endAt-Date.now():fs.left):0;
const fClock=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function beep(){try{if(!settings.cues)return;if(navigator.vibrate)navigator.vibrate([200,100,200]);const A=new(window.AudioContext||window.webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();o.connect(g);g.connect(A.destination);o.frequency.value=880;g.gain.value=.15;o.start();o.stop(A.currentTime+.35)}catch(e){}}
function logSession(done,unconfirmed){
  if(!fs)return;
  if(fs.mode==='break'){fs=null;lsSet('wt-focus',null);return}
  const el=Math.round((fs.dur-Math.max(0,fLeft()))/60000);
  if(el>0){const s={id:uid('s'),d:new Date().toISOString(),min:el,topic:fs.topic,link:fs.link||null,done:!!done,unc:!!unconfirmed,note:''};sessions.push(s);sessions=sessions.slice(-500);lsSet('wt-sessions',sessions);fdone=done?s.id:null;fbk=fs.brk}
  fs=null;lsSet('wt-focus',null);
}
let fbk=5;
const focusToday=()=>sessions.filter(s=>dk(new Date(s.d))===dk(new Date())).reduce((a,s)=>a+s.min,0);
const focusWeekMin=()=>sessions.filter(s=>new Date(s.d)>=mon).reduce((a,s)=>a+s.min,0);

// ---- history / streaks ----
const cache={};
const loadWk=md=>{const k=wkKey(md);if(k===KEY)return st;if(!cache[k]){let r=null;try{r=JSON.parse(localStorage.getItem(k))}catch(e){}cache[k]=r&&r.t?r:{t:{}}}return cache[k]};
function dayStats(d){const i=(d.getDay()+6)%7,k=DAYS[i][0],w=loadWk(monOf(d)),bl=(w.plan||plan)[k]||[];return{done:bl.filter(b=>w.t[b.id]).length,tot:bl.length,wake:!!w.t[k+'-0']}}
function streak(ok){let n=0;for(let i=0;i<400;i++){const d=new Date(now0.getFullYear(),now0.getMonth(),now0.getDate()-i);if(ok(dayStats(d)))n++;else if(i>0)break}return n}

// ---- per-day numbers shared by Today, Planner and Insights ----
// Completion = done / eligible planned blocks (cancelled blocks are not eligible). Starting on time never counts as done.
function dayNums(i){
  const k=DAYS[i][0],bl=blocks(k),el=bl.filter(b=>st.c[b.id]!=='cancelled'),done=el.filter(b=>st.c[b.id]==='done').length;
  const rem=el.filter(b=>!st.c[b.id]);
  return{bl,el,done,pct:el.length?Math.round(done/el.length*100):0,rem,remMin:rem.reduce((a,b)=>a+b.e-b.s,0),ont:bl.filter(b=>st.t[b.id]).length};
}

// ================= UI state =================
let view='today',sel=todayIdx,form=null,rsch=null,pview='day',acEx=null,fscr=false;
const SUB={acad:'Academics',faith:'Faith & Growth',ins:'Insights',rem:'Reminders',set:'Settings',hist:'History',trade:'Trade journal'};
const IC={focus:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',sleep:'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',ref:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>'};
let toastT;function toast(t){let e=$('.toast');if(!e){e=document.createElement('div');e.className='toast';e.setAttribute('role','status');document.body.appendChild(e)}e.textContent=t;clearTimeout(toastT);toastT=setTimeout(()=>e.remove(),2600)}
const bar=(p,c)=>`<div class="bar ${c||''}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
const nowMin=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
const lstDay=(k)=>DAYS.findIndex(d=>d[0]===k);

// ================= TODAY =================
function nextCard(bl){
  const nm=nowMin();
  const spill=plan[prevKey(DAYS[todayIdx][0])].filter(b=>(!b.once||b.once===KEY)&&b.e>1440).map(b=>Object.assign({},b,{s:b.s-1440,e:b.e-1440}));
  const all=spill.concat(bl).filter(b=>st.c[b.id]!=='cancelled');
  const cur=all.find(b=>nm>=b.s&&nm<b.e),nxt=all.filter(b=>b.s>nm).sort((a,b)=>a.s-b.s)[0];
  let h='<section class="card next" aria-live="polite">';
  if(cur)h+=`<p class="lab">Now</p><p class="big">${esc(cur.l)}</p><p class="sm mut">${dur(cur.e-nm)} left, until ${fmt(cur.e)}</p>`;
  if(nxt)h+=`<div class="${cur?'gap':''}"><p class="lab">Up next • ${fmt(nxt.s)}</p><p class="${cur?'':'big'}" style="${cur?'font-weight:700':''}">${esc(nxt.l)}</p><p class="sm mut">in ${dur(nxt.s-nm)}</p></div>`;
  if(!cur&&!nxt)h+='<p class="lab">Up next</p><p class="big">Done for today</p><p class="sm mut">Rest well. Tomorrow starts fresh.</p>';
  return h+'</section>';
}
function blockRow(b,i,o){
  o=o||{};const k=DAYS[i][0],cf=o.cf||{},today=i===todayIdx,nm=nowMin(),future=i>todayIdx;
  const d=!!st.t[b.id],c=st.c[b.id],mn=st.mn[b.id],act=today&&nm>=b.s&&nm<b.e,ms=isMissed(b,i),s=!!st.s[b.id];
  let h=`<li class="blk${c==='done'?' done':''}${c==='cancelled'?' cx':''}${act?' now':''}${ms?' miss':''}" style="--g:${GC[b.g]||'#64748B'}"><button class="chk" data-a="ontime" data-v="${b.id}" aria-pressed="${d}" aria-label="Started on time: ${esc(b.l)}"${future?' disabled':''}>${d?'✓':''}</button><button class="info" data-a="open" data-v="${b.id}" aria-expanded="${open===b.id}"><span class="time">${fmt(b.s)} – ${fmt(b.e)}${b.e>1440?' (+1 day)':''}</span><span class="lbl">${esc(b.l)}${act?'<span class="tag">Now</span>':''}</span>`;
  const chips=[];if(d)chips.push('<span class="chip ok">On time</span>');if(c)chips.push(`<span class="chip ${c==='done'?'ok':c==='partial'?'w':'b'}">${SL[c]}${mn?' · '+mn+' min':''}</span>`);if(ms)chips.push('<span class="chip b">Missed</span>');if(b.mv)chips.push('<span class="chip w">Moved this week</span>');if(cf[b.id])chips.push('<span class="chip b">Overlaps: '+esc(cf[b.id][0])+'</span>');
  h+=chips.join('')+`</button><button class="star" data-a="top3" data-v="${b.id}" aria-pressed="${s}" aria-label="Top 3: ${esc(b.l)}">${s?'★':'☆'}</button></li>`;
  if(open===b.id)h+=detail(b,i,ms);
  return h;
}
function detail(b,i,ms){
  const c=st.c[b.id],mn=st.mn[b.id];
  let h=`<li class="det"><p class="xs mut" style="font-weight:700">OUTCOME (separate from starting on time)</p><div class="chips">${['done','partial','skipped','cancelled'].map(x=>`<button data-a="outc" data-v="${b.id}|${x}" aria-pressed="${c===x}">${SL[x]}</button>`).join('')}</div><label class="inl">Minutes actually spent <input type="number" inputmode="numeric" min="0" max="900" data-f="mn" data-id="${b.id}" value="${mn||''}" style="width:90px"></label>`;
  if(ms||(!c&&i===todayIdx&&b.e<=nowMin()))h+=`<p class="xs mut" style="font-weight:700">MISSED. WHAT NOW?</p><div class="chips"><button data-a="nfree" data-v="${b.id}">Next free slot</button><button data-a="rsch" data-v="${b.id}">Reschedule</button><button data-a="shorten" data-v="${b.id}">Shorten</button><button data-a="outc" data-v="${b.id}|skipped">Skip</button><button data-a="outc" data-v="${b.id}|done">Mark complete</button></div>`;
  if(rsch&&rsch.id===b.id)h+=`<div class="chips"><label class="inl" style="margin:0">New start <input type="time" id="rsT" value="${hhmm(Math.min(1380,Math.max(nowMin()+5,b.s)))}" style="width:130px"></label><button data-a="rsok" data-v="${b.id}" class="pill">Save</button>${b.mv?`<button data-a="rsundo" data-v="${b.id}" class="pill">Undo move</button>`:''}</div><p class="xs mut">Only this week changes. Your weekly plan stays as it is.</p>`;
  return h+'</li>';
}
const QI={
 plan:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
 book:'<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
 faith:'<svg viewBox="0 0 24 24"><path d="M12 3v18M6 9h12"/></svg>',
 bell:'<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/></svg>',
 set:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
};
function nextAct(bl){
  const nm=nowMin(),spill=plan[prevKey(DAYS[todayIdx][0])].filter(b=>(!b.once||b.once===KEY)&&b.e>1440).map(b=>Object.assign({},b,{s:b.s-1440,e:b.e-1440}));
  const all=spill.concat(bl).filter(b=>!st.c[b.id]);
  return{nm,cur:all.find(b=>nm>=b.s&&nm<b.e),nxt:all.filter(b=>b.s>nm).sort((a,b)=>a.s-b.s)[0]};
}
const examBanner=()=>settings.prof==='exam'?`<section class="card a" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><p class="sm" style="margin:0"><b>Exam week plan is on</b></p><button class="btn sm" data-a="prof" data-v="standard">Back to standard</button></section>`:'';
function heroCard(N){
  const A=nextAct(N.bl),b=A.cur||A.nxt;
  if(!b)return `<section class="hero"><p class="s">Next activity</p><p class="t">All done for today</p><p class="s">Rest well. Tomorrow starts fresh.</p></section>`;
  const pct=A.cur?Math.round((A.nm-b.s)/(b.e-b.s)*100):0;
  return `<section class="hero" aria-live="polite"><p class="s">${A.cur?'Happening now':'Next activity'}</p><p class="t">${esc(b.l)}</p><p class="s">${fmt(b.s)} – ${fmt(b.e)} · ${A.cur?dur(b.e-A.nm)+' left':'starts in '+dur(b.s-A.nm)}</p>${A.cur?`<div class="hb"><i style="width:${pct}%"></i></div>`:''}<div class="row2"><button class="btn p" data-a="go" data-v="focus">Start focus</button><button class="btn" data-a="outc" data-v="${b.id}|done">Mark done</button></div></section>`;
}
function contCard(){
  const ls=sessions.slice().reverse().find(s=>s.link&&s.link.indexOf('topic|')===0);let ci=-1,txt='',sub='';
  if(ls){const p=ls.link.split('|');ci=courses.findIndex(c=>c.id===p[1]);const t=ci>=0&&courses[ci].topics[+p[2]];if(t){txt='Continue '+courses[ci].code;sub=t.n+' · last studied '+new Date(ls.d).toLocaleDateString(undefined,{day:'numeric',month:'short'})}else ci=-1}
  if(ci<0){const w=courses.flatMap((c,i)=>c.topics.filter(t=>t.s===1).map(t=>({i,c,t})))[0];if(w){ci=w.i;txt='Revise '+w.c.code;sub=w.t.n+' · marked Learning'}}
  const ne=nextExam(),ex=ne&&ne.dl<=21?`<p class="xs mut" style="margin:8px 0 0">Next exam: <b>${esc(ne.c.code)}</b> ${esc(ne.x.title)} in ${ne.dl} day${ne.dl===1?'':'s'}</p>`:'';
  if(ci<0&&!ex)return '';
  return `<section class="card"><p class="lab">Course shortcut</p>${ci>=0?`<button class="btn" style="width:100%;text-align:left" data-a="cont" data-v="${ci}"><b>${esc(txt)}</b><br><span class="mut xs">${esc(sub)}</span></button>`:''}${ex}</section>`;
}
function miniInsight(){
  const W=weekStats(),m2=Object.entries(W.miss).sort((a,b)=>b[1]-a[1])[0],zv=Object.values(st.z||{}).filter(x=>x!==''&&+x>=0).map(Number);
  if(m2&&m2[1]>=3)return m2[0]+' was missed or skipped '+m2[1]+' times this week. Consider moving or shortening it.';
  if(zv.length>=3)return 'You logged '+zv.length+' nights of sleep this week, averaging '+(zv.reduce((a,b)=>a+b,0)/zv.length).toFixed(1)+' hours.';
  if(W.el>=5)return W.cd+' of '+W.el+' blocks whose time has passed are marked Done this week.';
  return '';
}
function restCard(N){
  const el=N.bl.filter(b=>st.c[b.id]!=='cancelled');if(!el.length)return '';
  const last=Math.max(...el.map(b=>b.e)),nb=blocks(DAYS[(sel+1)%7][0])[0],slp=1440+(nb?nb.s:330)-last,brk=el.filter(b=>b.g==='Meals and breaks').length,lg=(st.z||{})[DAYS[sel][0]];
  return `<section class="card g"><p class="lab">Rest and balance</p><p class="sm">Your plan leaves about <b>${dur(Math.max(0,slp))}</b> for sleep tonight.${slp<360?' That is short. Consider ending the last block earlier.':''}</p><p class="xs mut" style="margin-top:4px">${brk} meal or break block${brk===1?'':'s'} planned today.${lg?' You logged '+esc(lg)+' h of sleep last night.':''} A planning note, not medical advice.</p></section>`;
}
function todayView(){
  const k=DAYS[sel][0],N=dayNums(sel),cf=conflicts(k),isT=sel===todayIdx,now=new Date(),hr=now.getHours();
  const gr=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening',nm=settings.name==null?'Pelumi':settings.name.trim();
  let h=`<div class="gr"><div><h2>${isT?gr+(nm?', '+esc(nm):''):DAYS[sel][1]}</h2></div><div class="chips"><button class="ib" data-a="go" data-v="rem" aria-label="Reminders">${QI.bell}</button><button class="ib" data-a="go" data-v="set" aria-label="Settings">${QI.set}</button></div></div>`;
  h+=`<div class="days" role="group" aria-label="Choose a day">${DAYS.map((d,i)=>`<button data-a="day" data-v="${i}" aria-pressed="${i===sel}" class="${i===todayIdx?'td':''}">${d[1].slice(0,3)}<small>${dateOf(i).getDate()}</small></button>`).join('')}</div>`;
  h+=examBanner();if(isT)h+=heroCard(N);
  const gp=Math.min(100,Math.round(focusToday()/Math.max(1,settings.goal)*100));
  h+=`<section class="card" aria-live="polite"><div class="rgc"><div class="rg" style="--p:${N.pct}" role="img" aria-label="${N.pct} percent complete"><b>${N.pct}%</b></div><div><p class="lab" style="margin:0">Daily progress</p><p class="big">${N.done} of ${N.el.length} activities</p><p class="xs mut" style="margin-top:4px">${N.rem.length} left, about ${dur(N.remMin)} planned. ${N.ont} started on time.</p></div></div>${isT?`<p class="xs mut" style="margin:12px 0 0">Focus today: <b>${dur(focusToday())}</b> of your ${dur(settings.goal)} goal</p>${bar(gp,'g')}`:''}<details class="xs mut" style="margin-top:8px"><summary>How is this calculated?</summary><p style="margin:6px 0 0">Blocks marked Done divided by planned blocks. Cancelled blocks are not counted. Starting on time does not count as done.</p></details></section>`;
  const picks=N.bl.filter(b=>st.s[b.id]),sug=courses.flatMap(c=>c.topics.filter(t=>t.s===1).map(t=>c.code+' · '+t.n)).slice(0,3);
  h+=`<section class="card g"><p class="lab">Top 3 priorities</p>${picks.length?'<ol class="t3">'+picks.map(b=>`<li style="${st.c[b.id]==='done'?'text-decoration:line-through;color:var(--mut)':''}">${esc(b.l)} <button class="star" data-a="top3" data-v="${b.id}" aria-label="Remove ${esc(b.l)} from top 3" style="padding:0 4px;font-size:15px">✕</button></li>`).join('')+'</ol>':'<p class="sm mut">Nothing picked yet.</p>'}${picks.length<3?`<select data-f="t3" aria-label="Add a top priority" style="margin-top:8px"><option value="">+ Choose a priority…</option>${N.bl.filter(b=>!st.s[b.id]).map(b=>`<option value="${b.id}">${fmt(b.s)} · ${esc(b.l)}</option>`).join('')}</select>`:''}${!picks.length&&sug.length?`<p class="xs mut" style="margin-top:8px">Suggested, from topics you marked Learning: ${sug.map(esc).join('; ')}</p>`:''}</section>`;
  h+=`<div class="qg"><button class="btn" data-a="go" data-v="focus">${IC.focus}Focus timer</button><button class="btn" data-a="go" data-v="plan">${QI.plan}Planner</button><button class="btn" data-a="go" data-v="acad">${QI.book}Topics</button><button class="btn" data-a="go" data-v="faith">${QI.faith}Faith</button><button class="btn" data-a="scr" data-v="sl">${IC.sleep}Sleep log</button><button class="btn" data-a="scr" data-v="note">${IC.ref}Reflection</button></div>`;
  if(isT){h+=contCard();const mi=miniInsight();if(mi)h+=`<section class="card a"><p class="lab">This week</p><p class="sm">${esc(mi)}</p></section>`}
  h+=restCard(N);
  const miss=N.bl.filter(b=>isMissed(b,sel));
  if(miss.length)h+=`<section class="card r"><p class="lab" style="color:var(--bad)">Needs attention</p><p class="sm mut">${miss.length} block${miss.length===1?'':'s'} passed with no outcome. Open one below to complete, skip, move or shorten it.</p></section>`;
  if(isT){const nm2=nowMin(),nx=N.bl.filter(b=>b.s>nm2&&!st.c[b.id]).sort((a,b)=>a.s-b.s)[0],sk=Object.values(st.why||{});
  h+=`<section class="card g"><p class="lab">Today at a glance</p><div class="row2" style="margin-top:0"><div><p class="big">${N.done}/${N.el.length}</p><p class="xs mut">blocks done</p></div><div><p class="big">${N.ont}</p><p class="xs mut">started on time</p></div></div>${nx?`<p class="sm" style="margin-top:8px"><b>Up next:</b> ${esc(nx.l)} at ${fmt(nx.s)} · in ${dur(nx.s-nm2)}</p>`:'<p class="sm" style="margin-top:8px">Nothing else planned today.</p>'}${sk.length?`<p class="xs mut">Skip reasons logged this week: ${sk.length}</p>`:''}<button class="btn sm" style="margin-top:8px" data-a="shiftlater">Running late? Push remaining blocks 30 min</button></section>`}
  h+='<h2>Today’s plan</h2><ul>'+N.bl.map(b=>blockRow(b,sel,{cf})).join('')+'</ul>';
  h+=`<section class="card n" id="sec-sl"><label class="inl" style="margin-top:0">Hours slept last night<input id="sl" type="number" inputmode="decimal" min="0" max="14" step="0.5" value="${esc((st.z||{})[k]||'')}"></label></section><section class="card n" id="sec-note"><p class="lab">Reflection</p><label class="xs mut" for="refl">How did today go?</label><textarea id="refl" data-f="refl" placeholder="A line or two is enough.">${esc(st.r[k]||'')}</textarea><label class="xs mut" for="note" style="display:block;margin-top:8px">What pulled me off track?</label><textarea id="note" data-f="note" placeholder="Leave it blank on a good day.">${esc(st.n[k]||'')}</textarea></section>`;
  $('#app').innerHTML=h;
}

// ================= PLANNER =================
 function repeatLabel(b){const n=DAYS.filter(d=>plan[d[0]].some(x=>(x.rid||x.id)===(b.rid||b.id))).length;return b.once?'This week only':n===7?'Every day':n>1?'Weekly · '+n+' days':'Weekly'}
function planView(){
  const k=DAYS[sel][0];
  let h=examBanner()+`<div class="chips" style="margin-bottom:10px"><button data-a="pv" data-v="day" aria-pressed="${pview==='day'}">Day</button><button data-a="pv" data-v="week" aria-pressed="${pview==='week'}">Week overview</button></div>`;
  h+=`<div class="days" role="group" aria-label="Choose a day">${DAYS.map((d,i)=>`<button data-a="day" data-v="${i}" aria-pressed="${i===sel}" class="${i===todayIdx?'td':''}">${d[1].slice(0,3)}<small>${dateOf(i).getDate()}</small></button>`).join('')}</div>`;
  if(form){return $('#app').innerHTML=h+formView()}
  if(pview==='week'){
    h+='<h2>Week overview</h2>';
    DAYS.forEach((d,i)=>{const bl=blocks(d[0]),c=Object.keys(conflicts(d[0])).length,mins=bl.filter(b=>b.g!=='Wake and quiet time').reduce((a,b)=>a+b.e-b.s,0);
      h+=`<button class="mn" style="--c:${c?'var(--bad)':'var(--ac)'}" data-a="day2" data-v="${i}"><span><b>${d[1]}</b><small>${bl.length} blocks · ${dur(mins)} planned${c?' · '+c+' in conflict':''}</small></span><span class="ar">›</span></button>`});
    return $('#app').innerHTML=h;
  }
  const bl=blocks(k),cf=conflicts(k),spill=spansFor(k).filter(x=>x.spill);
  const ovn=Object.keys(cf).length;
  h+=`<p class="note">${ovn?'<b>'+ovn+' block'+(ovn===1?'':'s')+' overlap.</b> Nothing was removed. Open a block to fix the time.':'No overlaps on '+DAYS[sel][1]+'. Blocks that end exactly when the next begins are fine.'}</p>`;
  if(spill.length)h+=`<p class="xs mut" style="margin-bottom:8px">Carried over from ${DAYS[(sel+6)%7][1]} night: ${spill.map(x=>esc(x.b.l)+' until '+fmt(x.e)).join(', ')}.</p>`;
  bl.forEach(b=>{
    h+=`<div class="tl"><span class="t">${fmt(b.s)}</span><div><div class="blk" style="--g:${GC[b.g]||'#64748B'}"><button class="info" data-a="popen" data-v="${b.id}" aria-expanded="${open===b.id}"><span class="lbl">${esc(b.l)}</span><span class="time" style="color:var(--mut)">${fmt(b.s)} – ${fmt(b.e)} · ${dur(b.e-b.s)}${b.e>1440?' · overnight':''}</span><span class="chip">${esc(b.g)}</span><span class="chip">${repeatLabel(b)}</span>${cf[b.id]?'<span class="chip b">⚠ Overlaps '+esc(cf[b.id][0])+'</span>':''}${b.mv?'<span class="chip w">Moved this week</span>':''}</button></div>`;
    if(open===b.id)h+=`<div class="row2"><button class="btn sm" data-a="edit" data-v="${b.id}">Edit</button><button class="btn sm" data-a="dup" data-v="${b.id}">Duplicate</button><button class="btn sm d" data-a="del" data-v="${b.id}">Delete</button></div>`;
    h+='</div></div>';
  });
  h+=`<button class="btn p" style="width:100%;margin-top:6px" data-a="add">+ Add a block</button><p class="xs mut" style="margin-top:10px">Changes here update your weekly plan. Past weeks keep their own copy, so editing today never rewrites history.</p>`;
  $('#app').innerHTML=h;
}
function formView(){
  const f=form,sd=hhmm(f.s),ed=hhmm(f.e);
  const sp=m(ed)<=m(sd)?(m(ed)===m(sd)?1440:m(ed)+1440-m(sd)):m(ed)-m(sd);
  return `<section class="card"><p class="lab b">${f.id?'Edit block':'New block'}</p>
  <label class="f"><span>Name</span><input data-f="fl" value="${esc(f.l)}" maxlength="80"></label>
  <label class="f"><span>Type</span><select data-f="fg">${GROUPS.map(g=>`<option${g===f.g?' selected':''}>${g}</option>`).join('')}</select></label>
  <div class="row2"><label class="f"><span>Start</span><input type="time" data-f="fs" value="${sd}"></label><label class="f"><span>End</span><input type="time" data-f="fe" value="${ed}"></label></div>
  <p class="xs mut" style="margin-top:6px">${m(ed)<=m(sd)?'Ends the next day (overnight). ':''}Length: <b>${dur(sp)}</b>. Example: 23:00–01:00 is a 2-hour overnight block.</p>
  <label class="f"><span>Repeat on</span></label><div class="chips">${DAYS.map((d,i)=>`<button data-a="fday" data-v="${i}" aria-pressed="${f.days.includes(i)}">${d[1].slice(0,3)}</button>`).join('')}<button data-a="fall" class="pill">Daily</button></div>
  <label class="f"><span>How often</span><select data-f="fo"><option value="w"${!f.once?' selected':''}>Every week</option><option value="o"${f.once?' selected':''}>This week only</option></select></label>
  <label class="f"><span>Reminder for this block</span><select data-f="frm"><option value="d"${f.rm==null?' selected':''}>Use default for this type</option>${[['-1','Off'],['0','At start'],['5','5 min before'],['10','10 min before'],['15','15 min before'],['30','30 min before']].map(x=>`<option value="${x[0]}"${f.rm!=null&&String(f.rm)===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select></label>
  <div class="row2"><button class="btn" data-a="fcancel">Cancel</button><button class="btn p" data-a="fsave">Save block</button></div></section>`;
}
function saveForm(){
  const f=form;if(!f.l.trim()||!f.days.length){toast('Add a name and at least one day');return}
  let s=f.s,e=f.e;if(s<240)s+=1440;if(e<=s)e+=1440;
  const rid=f.rid||uid('r'),prob=[];
  f.days.forEach(i=>{const c=conflictFor(DAYS[i][0],{s,e},f.rid||f.id||'__new');if(c.length)prob.push(DAYS[i][1]+': overlaps '+c.slice(0,2).join(', '))});
  if(prob.length&&!confirm('This block overlaps with other blocks:\n\n'+prob.join('\n')+'\n\nNothing will be deleted. Save it anyway?'))return;
  DAYS.forEach((d,i)=>{
    const on=f.days.includes(i),ex=plan[d[0]].find(b=>(b.rid||b.id)===f.rid&&f.rid);
    const ex2=f.id&&!f.rid?plan[d[0]].find(b=>b.id===f.id):null,cur=ex||ex2;
    if(on){const nb=Object.assign(cur||{id:d[0]+'-n'+uid('')},{s,e,l:f.l.trim(),g:f.g,rid});if(f.once)nb.once=KEY;else delete nb.once;if(f.rm==null)delete nb.rm;else nb.rm=f.rm;if(!cur)plan[d[0]].push(nb)}
    else if(cur){plan[d[0]]=plan[d[0]].filter(b=>b!==cur)}
  });
  DAYS.forEach(d=>plan[d[0]].sort((a,b)=>a.s-b.s));
  savePlan();save();form=null;toast('Block saved');render();
}
function openForm(b){
  if(b){const rid=b.rid||b.id;const days=DAYS.map((d,i)=>plan[d[0]].some(x=>(x.rid||x.id)===rid)?i:-1).filter(i=>i>=0);const raw=plan[DAYS[sel][0]].find(x=>x.id===b.id)||b;
    form={id:b.id,rid:raw.rid||null,l:raw.l,g:raw.g,s:raw.s,e:raw.e,days,once:!!raw.once,rm:raw.rm==null?null:raw.rm}}
  else form={id:null,rid:null,l:'',g:R,s:m('09:00'),e:m('10:00'),days:[sel],once:false,rm:null};
  render();
}

// ================= FOCUS =================
function linkOptions(t){
  if(t==='course')return courses.flatMap(c=>[`<option value="course|${c.id}">${esc(c.code)} (whole course)</option>`].concat(c.topics.map((x,ti)=>`<option value="topic|${c.id}|${ti}">${esc(c.code)} · ${esc(x.n.slice(0,50))}</option>`))).join('');
  if(t==='block')return blocks(DAYS[todayIdx][0]).map(b=>`<option value="block|${b.id}">${fmt(b.s)} · ${esc(b.l)}</option>`).join('');
  if(t==='habit')return faith.habits.map(h=>`<option value="habit|${h.id}">${esc(h.n)}</option>`).join('');
  return '';
}
let flt='none';
function focusView(){
  let h='';const gp=Math.min(100,Math.round(focusToday()/Math.max(1,settings.goal)*100));
  if(!fs){
    h+=`<section class="card"><p class="lab b">Focus session</p><p class="sm mut">Choose a length, link it to something, and start. A session only counts as complete if the timer runs out.</p>
    <div class="chips" style="margin-top:10px" role="group" aria-label="Presets">${[[25,5],[50,10]].map(p=>`<button data-a="preset" data-v="${p[0]}|${p[1]}" aria-pressed="${fm===p[0]&&fb===p[1]}">${p[0]}/${p[1]}</button>`).join('')}</div>
    <div class="row2"><label class="f"><span>Focus (min)</span><input id="cus" type="number" inputmode="numeric" min="1" max="240" value="${fm}" data-f="fcus"></label><label class="f"><span>Break (min)</span><input id="cbk" type="number" inputmode="numeric" min="0" max="60" value="${fb}" data-f="fbk"></label></div>
    <label class="f"><span>Link to</span><select data-f="flt"><option value="none"${flt==='none'?' selected':''}>Nothing (general)</option><option value="course"${flt==='course'?' selected':''}>Course or topic</option><option value="block"${flt==='block'?' selected':''}>Today’s timetable block</option><option value="habit"${flt==='habit'?' selected':''}>Personal habit</option></select></label>
    ${flt!=='none'?`<label class="f"><span>Which one</span><select id="flk">${linkOptions(flt)||'<option value="">Nothing available</option>'}</select></label>`:''}
    <button class="btn p" style="width:100%;margin-top:12px" data-a="fgo">START FOCUS</button><p class="xs mut" style="text-align:center;margin-top:8px">Next: ${fb}-minute break</p></section>`;
  }else{
    const brk=fs.mode==='break';
    h+=`<section class="card ${brk?'g':''}"><p class="lab b" style="text-align:center">${brk?'Break':esc(fs.topic)}${fs.endAt?'':' (paused)'}</p><p class="clock" id="clock" role="timer">${fClock(fLeft())}</p><div class="row2"><button class="btn" data-a="fpa">${fs.endAt?'Pause':'Resume'}</button><button class="btn d" data-a="fend">${brk?'Skip break':'End session'}</button></div><p class="xs mut" style="text-align:center;margin-top:8px">${brk?'Rest. Step away from the screen.':'Next: '+fs.brk+'-minute break'}</p></section>`;
  }
  if(!fs&&fdone){const s=sessions.find(x=>x.id===fdone);if(s)h+=`<section class="card g"><p class="lab" style="color:var(--ok)">Session complete</p><p class="sm"><b>${s.min} min</b> · ${esc(s.topic)}</p><label class="f"><span>Session notes (optional)</span><textarea data-f="snote" data-id="${s.id}" placeholder="What did you cover?">${esc(s.note||'')}</textarea></label>${fbk>0?`<button class="btn p" style="width:100%;margin-top:8px" data-a="brk">Start ${fbk}-minute break</button>`:''}</section>`}
  h+=`<section class="card g"><p class="lab">Daily focus goal</p><p class="sm"><b>${dur(focusToday())}</b> of ${dur(settings.goal)}</p>${bar(gp,'g')}<p class="xs mut" style="margin-top:6px">This week: ${dur(focusWeekMin())}</p></section><h2>Recent sessions</h2>`;
  const rc=sessions.slice(-8).reverse();
  h+=rc.length?rc.map(s=>`<div class="card ${s.done?'g':'n'}" style="padding:10px 12px 10px 16px"><p><b>${s.min} min</b> · ${esc(s.topic)}</p><p class="xs mut">${new Date(s.d).toLocaleDateString(undefined,{day:'numeric',month:'short'})} · ${s.done?'Completed':s.unc?'Ended early, timer was not open':'Ended early'}${s.note?' · '+esc(s.note):''}</p></div>`).join(''):'<p class="sm mut">No sessions yet. An interrupted session is logged as ended early, never as complete.</p>';
  $('#app').innerHTML=h;
}

// ================= ACADEMICS =================
const daysLeft=d=>Math.ceil((new Date(d+'T00:00')-new Date(new Date().toDateString()))/864e5);
function nextExam(){let best=null;courses.forEach(c=>c.exams.forEach(x=>{if(!x.date)return;const dl=daysLeft(x.date);if(dl>=0&&(!best||dl<best.dl))best={c,x,dl}}));return best}
function acadView(){
  const all=courses.flatMap(c=>c.topics),rv=all.filter(t=>t.s>=2).length,left=all.length-rv,ne=nextExam();
  let h=`<section class="card"><p class="lab">Courses</p><p class="sm"><b>${courses.length}</b> this semester</p></section>
  <section class="card g"><p class="lab">Topics</p><p class="sm"><b>${rv}/${all.length}</b> revised or confident</p>${bar(all.length?Math.round(rv/all.length*100):0,'g')}</section>
  <section class="card a"><p class="lab">Revision plan</p><p class="sm"><b>${left}</b> topics left to revise across all courses</p></section>
  <section class="card r"><p class="lab" style="color:var(--bad)">Exam</p><p class="sm">${ne?'<b>'+esc(ne.c.code)+'</b> '+esc(ne.x.title)+' • <b>'+ne.dl+' day'+(ne.dl===1?'':'s')+'</b>':'No exam dates set yet.'}</p></section>
  <p class="note">Progress here is a planning aid for revision. It does not replace your actual grades.</p>${examTT()}${weakCard()}<h2>Courses</h2>`;
  courses.forEach((c,ci)=>{
    const rv2=c.topics.filter(t=>t.s>=2).length,ex=c.exams.filter(x=>x.date).map(x=>daysLeft(x.date)).filter(d=>d>=0).sort((a,b)=>a-b)[0];
    h+=`<section class="card ${ocn===ci?'':'n'}" style="padding:0"><button class="info mn" style="margin:0;box-shadow:none;border:0;--c:transparent" data-a="oc" data-v="${ci}" aria-expanded="${ocn===ci}"><span style="flex:1"><b style="text-transform:none;letter-spacing:0;font-size:.95rem">${esc(c.code)} · ${esc(c.name)}</b><small>${c.topics.length?rv2+' of '+c.topics.length+' topics revised':'No topics yet'}${ex!=null?' · exam in '+ex+' day'+(ex===1?'':'s'):''}</small></span><span class="ar">${ocn===ci?'⌃':'⌄'}</span></button>`;
    if(ocn===ci)h+=courseBody(c,ci);
    h+='</section>';
  });
  h+=`<button class="btn p" style="width:100%" data-a="addc">+ Add a course</button>`;
  $('#app').innerHTML=h;
}
function courseBody(c,ci){
  let h=`<div style="padding:0 14px 14px 18px">${bar(c.topics.length?Math.round(c.topics.filter(t=>t.s>=2).length/c.topics.length*100):0,'g')}
  <div class="row2"><label class="f"><span>Course code</span><input data-f="cc" data-ci="${ci}" value="${esc(c.code)}"></label><label class="f"><span>Semester</span><input data-f="cs" data-ci="${ci}" value="${esc(c.semester)}"></label></div>
  <label class="f"><span>Course title</span><input data-f="cn" data-ci="${ci}" value="${esc(c.name)}"></label>
  <label class="f"><span>Lecturer (optional)</span><input data-f="cl" data-ci="${ci}" value="${esc(c.lecturer)}"></label><h2>Topics</h2>`;
  h+=c.topics.map((t,ti)=>`<div class="tp"><span>${esc(t.n)}</span><select data-f="ts" data-ci="${ci}" data-ti="${ti}" aria-label="Status of ${esc(t.n)}">${ST.map((s,si)=>`<option value="${si}"${t.s===si?' selected':''}>${s}</option>`).join('')}</select><button class="star" data-a="deltp" data-v="${ci}|${ti}" aria-label="Delete topic">✕</button></div>`).join('')||'<p class="sm mut">No topics yet.</p>';
  h+=`<div class="row2"><input id="nt" placeholder="New topic" aria-label="New topic"><button class="btn" style="flex:none" data-a="addtp" data-v="${ci}">Add</button></div><h2>Exams and revision checklist</h2>`;
  h+=c.exams.map((x,xi)=>{const dl=x.date?daysLeft(x.date):null,done=x.list.filter(l=>l.d).length;
    return `<div class="card ${x.pri==='High'?'r':x.pri==='Medium'?'a':'n'}" style="margin-top:8px;box-shadow:none"><div class="row2" style="margin-top:0"><label class="f" style="margin:0"><span>Exam title</span><input data-f="xt" data-ci="${ci}" data-xi="${xi}" value="${esc(x.title)}"></label><label class="f" style="margin:0"><span>Date</span><input type="date" data-f="xd" data-ci="${ci}" data-xi="${xi}" value="${esc(x.date)}"></label></div><div class="row2"><label class="f" style="margin:0"><span>Priority</span><select data-f="xp" data-ci="${ci}" data-xi="${xi}">${PRI.map(p=>`<option${p===x.pri?' selected':''}>${p}</option>`).join('')}</select></label><p class="sm" style="align-self:end">${dl==null?'No date':dl>=0?'<b>'+dl+'</b> day'+(dl===1?'':'s')+' left':'Date passed'}</p></div>
    <div class="row2"><label class="f" style="margin:0"><span>Start time</span><input type="time" data-f="xtm" data-ci="${ci}" data-xi="${xi}" value="${esc(x.time||'')}"></label><label class="f" style="margin:0"><span>Venue</span><input data-f="xv" data-ci="${ci}" data-xi="${xi}" value="${esc(x.venue||'')}" placeholder="Hall or room"></label></div>
    ${x.list.map((l,li)=>`<label class="inl" style="justify-content:flex-start"><input type="checkbox" data-f="xl" data-ci="${ci}" data-xi="${xi}" data-li="${li}"${l.d?' checked':''}> <span style="${l.d?'text-decoration:line-through;color:var(--mut)':''}">${esc(l.t)}</span><button class="star" style="margin-left:auto" data-a="delxl" data-v="${ci}|${xi}|${li}" aria-label="Delete item">✕</button></label>`).join('')}
    <div class="row2"><input id="xi-${xi}" placeholder="Checklist item, e.g. Revise module 3" aria-label="Checklist item"><button class="btn" style="flex:none" data-a="addxl" data-v="${ci}|${xi}">Add</button></div><p class="xs mut" style="margin-top:4px">${x.list.length?done+' of '+x.list.length+' checklist items done':''}</p><button class="btn sm d" style="margin-top:6px" data-a="delx" data-v="${ci}|${xi}">Delete exam</button></div>`}).join('');
  h+=`<button class="btn" style="width:100%;margin-top:8px" data-a="addx" data-v="${ci}">+ Add an exam</button>${pqBlock(c,ci)}<h2>Schedule revision into the timetable</h2>
  <label class="f"><span>Topic</span><select id="rvt">${c.topics.map((t,ti)=>t.s<2?`<option value="${ti}">${esc(t.n.slice(0,60))}</option>`:'').join('')||'<option value="">All topics revised</option>'}</select></label>
  <div class="row2"><label class="f"><span>Day (this week)</span><select id="rvd">${DAYS.map((d,i)=>`<option value="${i}"${i===todayIdx?' selected':''}>${d[1]}</option>`).join('')}</select></label><label class="f"><span>Start</span><input type="time" id="rvs" value="16:00"></label><label class="f"><span>Minutes</span><input type="number" id="rvm" min="15" max="240" value="60"></label></div>
  <button class="btn p" style="width:100%;margin-top:8px" data-a="schrev" data-v="${ci}">Add revision block</button>
  <button class="btn sm d" style="margin-top:14px" data-a="delc" data-v="${ci}">Delete this course</button></div>`;
  return h;
}

// ================= FAITH & GROWTH =================
const last7=()=>Array.from({length:7},(_,i)=>dk(new Date(now0.getFullYear(),now0.getMonth(),now0.getDate()-6+i)));
const faithDayOn=d=>Object.keys(faith.log[d]||{}).some(h=>faith.log[d][h]);
function faithView(){
  const today=dk(new Date()),ti=todayIdx,hs=faith.habits.filter(x=>(x.days||[0,1,2,3,4,5,6]).includes(ti)),lg=faith.log[today]||{};
  const n7=last7().filter(faithDayOn).length;
  let h=`<section class="card g"><p class="lab">Today’s practice</p><div class="chips">${hs.map(x=>`<button data-a="hab" data-v="${x.id}" aria-pressed="${!!lg[x.id]}">${lg[x.id]?'✓ ':''}${esc(x.n)}</button>`).join('')||'<span class="sm mut">No habits scheduled today. Rest is part of the rhythm.</span>'}</div></section>
  <section class="card"><p class="lab">Reading plan</p><input data-f="fread" value="${esc(faith.reading)}" placeholder="e.g. John 3 • 1 chapter" aria-label="Reading plan"><button class="btn sm" style="margin-top:8px" data-a="readdone">${(faith.readLog||{})[today]?'✓ Read today':'Mark today’s reading done'}</button></section>
  <section class="card a"><p class="lab">Reflection</p><label class="xs mut" for="frf">What stood out today?</label><textarea id="frf" data-f="fnote" placeholder="A sentence is enough. Only you see this.">${esc(faith.notes[today]||'')}</textarea></section>
  <section class="card g"><p class="lab">Consistency</p><p class="sm"><b>${n7} of the last 7 days</b> with a check-in</p><div class="dots">${last7().map(d=>`<i class="${faithDayOn(d)?'on':''}" title="${d}"></i>`).join('')}</div><p class="xs mut" style="margin-top:8px">${n7>=5?'Steady rhythm. Keep going gently.':n7>=2?'Good momentum. Every day you show up counts.':'A fresh start is always available. Begin with one small step today.'}</p></section>
  <h2>Your habits</h2>`;
  h+=faith.habits.map(x=>`<div class="card n"><div class="row2" style="margin:0"><input data-f="hn" data-id="${x.id}" value="${esc(x.n)}" aria-label="Habit name"><button class="btn sm d" style="flex:none" data-a="delh" data-v="${x.id}">Remove</button></div><div class="chips" style="margin-top:8px">${DAYS.map((d,i)=>`<button data-a="hday" data-v="${x.id}|${i}" aria-pressed="${(x.days||[0,1,2,3,4,5,6]).includes(i)}">${d[1].slice(0,3)}</button>`).join('')}</div></div>`).join('');
     h+=`<div class="row2"><input id="nh" placeholder="New habit, e.g. Journaling" aria-label="New habit"><button class="btn" style="flex:none" data-a="addh">Add</button></div>
  <section class="card n" style="margin-top:12px"><label class="inl" style="margin-top:0">Include faith check-ins in Insights<span class="sw"><input type="checkbox" data-f="fana"${faith.ana?' checked':''}><i></i></span></label><p class="xs mut" style="margin-top:6px">Private by default. Reflection text is never shown in Insights or the weekly summary, and is left out of backups unless you choose to include it.</p></section>`;
  $('#app').innerHTML=h;
}

// ================= INSIGHTS =================
function weekStats(){
  const rows=[],miss={};let el=0,cd=0,ot=0,rec=0,pl=0,lg=0;
  DAYS.forEach((d,i)=>{
    const N=dayNums(i);let sum=0;
    N.bl.forEach(b=>{
      const past=dateOf(i).getTime()+b.e*60000<Date.now();
      if(st.c[b.id]!=='cancelled'&&past){el++;if(st.c[b.id]==='done')cd++}
      if(st.t[b.id]||st.c[b.id]){rec++;if(st.t[b.id])ot++}
      if(past&&(b.g==='Reading'||b.g==='Charts')&&st.c[b.id]!=='cancelled')pl+=b.e-b.s;
      if(st.mn[b.id])lg+=st.mn[b.id];
      if(isMissed(b,i)||st.c[b.id]==='skipped')miss[b.l]=(miss[b.l]||0)+1;
    });
    rows.push({d:d[1],pct:N.pct,n:N.done,t:N.el.length});
  });
  return{rows,el,cd,ot,rec,pl,lg,miss};
}
// ---- v3.1 additions: exam timetable, weak topics, past questions, heatmap, time by category and course ----
let xf=false;
function examTT(){
  const all=courses.flatMap((c,ci)=>c.exams.map((x,xi)=>({c,ci,x,xi,dl:x.date?daysLeft(x.date):null}))).filter(e=>e.dl==null||e.dl>=0).sort((a,b)=>(a.x.date?a.x.date+(a.x.time||''):'9').localeCompare(b.x.date?b.x.date+(b.x.time||''):'9'));
  let h=`<section class="card r"><p class="lab" style="color:var(--bad)">Exam timetable</p>`;
  h+=all.length?all.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:8px 0"><p class="sm" style="margin:0"><b>${esc(e.c.code)}</b> ${esc(e.x.title)}<br><span class="mut">${e.x.date?new Date(e.x.date+'T00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}):'No date yet'}${e.x.time?' · '+esc(e.x.time):''}${e.x.venue?' · '+esc(e.x.venue):''}${e.dl!=null?' · '+(e.dl===0?'today':e.dl+' day'+(e.dl===1?'':'s')):''}</span></p><button class="btn sm" data-a="cont" data-v="${e.ci}">Edit</button></div>`).join(''):'<p class="sm mut">No exams yet. Tap Add exam when your timetable is released.</p>';
  if(xf)h+=`<div style="margin-top:10px"><label class="f"><span>Course</span><select id="nx-c">${courses.map((c,i)=>`<option value="${i}">${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></label><label class="f"><span>Exam title</span><input id="nx-t" value="Exam"></label><div class="row2"><label class="f"><span>Date</span><input type="date" id="nx-d"></label><label class="f"><span>Start time</span><input type="time" id="nx-m"></label></div><label class="f"><span>Venue</span><input id="nx-v" placeholder="Hall or room"></label><div class="row2"><button class="btn p" data-a="xsave">Save exam</button><button class="btn" data-a="xnew">Cancel</button></div></div>`;
  else h+=`<button class="btn p" style="width:100%;margin-top:10px" data-a="xnew">+ Add exam to timetable</button>`;
  return h+'</section>';
}
function weakCard(){
  const w=courses.flatMap(c=>c.topics.filter(t=>t.s===1).map(t=>c.code+' · '+t.n));
  return `<section class="card a"><p class="lab">Weak topics</p>${w.length?w.slice(0,8).map(x=>`<p class="sm" style="margin:3px 0">${esc(x)}</p>`).join('')+(w.length>8?`<p class="xs mut">and ${w.length-8} more</p>`:''):'<p class="sm mut">Nothing marked Learning. Mark a topic as Learning when you find it hard and it will be listed here until you mark it Revised.</p>'}</section>`;
}
function pqBlock(c,ci){
  const q=c.pq||[],sc=q.filter(x=>x.sc!=null).map(x=>+x.sc),avg=sc.length?Math.round(sc.reduce((a,b)=>a+b,0)/sc.length):null;
  return `<h2>Past questions</h2>${q.map((x,qi)=>`<div class="row2" style="margin-top:6px"><input data-f="pqt" data-ci="${ci}" data-qi="${qi}" value="${esc(x.t)}" aria-label="Past paper"><input type="number" min="0" max="100" data-f="pqs" data-ci="${ci}" data-qi="${qi}" value="${x.sc==null?'':x.sc}" placeholder="Score %" aria-label="Score percent" style="width:90px;flex:none"><button class="star" data-a="delpq" data-v="${ci}|${qi}" aria-label="Delete past paper">✕</button></div>`).join('')||'<p class="sm mut">No past papers logged yet.</p>'}<div class="row2"><input id="npq" placeholder="e.g. 2023 paper" aria-label="New past paper"><button class="btn" style="flex:none" data-a="addpq" data-v="${ci}">Add</button></div>${avg!=null?`<p class="xs mut" style="margin-top:4px">Average of ${sc.length} scored paper${sc.length===1?'':'s'}: ${avg}%. These are your own practice scores, not official grades.</p>`:''}`;
}
function dayPct(d){
  const mo=monOf(d),w=loadWk(mo),k=DAYS[(d.getDay()+6)%7][0],wk=wkKey(mo),c=w.c||{},t=w.t||{};
  const bl=((w.plan||plan)[k]||[]).filter(b=>(!b.once||b.once===wk)&&c[b.id]!=='cancelled');
  if(!bl.length||!bl.some(b=>c[b.id]||t[b.id]))return null;
  return Math.round(bl.filter(b=>c[b.id]==='done').length/bl.length*100);
}
function heatCard(){
  const W=12,cell=15,gap=3,td=new Date(now0.getFullYear(),now0.getMonth(),now0.getDate()),s0=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()-7*(W-1));
  let r='',n=0;
  for(let c=0;c<W;c++)for(let i=0;i<7;i++){
    const d=new Date(s0.getFullYear(),s0.getMonth(),s0.getDate()+c*7+i);if(d>td)continue;
    const p=dayPct(d);if(p!=null)n++;
    r+=`<rect x="${c*(cell+gap)}" y="${i*(cell+gap)}" width="${cell}" height="${cell}" rx="3" fill="${p==null?'var(--ln)':'var(--ok)'}" fill-opacity="${p==null?1:(0.25+0.75*p/100).toFixed(2)}"><title>${dk(d)}: ${p==null?'nothing recorded':p+'% completed'}</title></rect>`;
  }
  const w=W*(cell+gap)-gap,h=7*(cell+gap)-gap;
  return `<section class="card"><p class="lab">Consistency, last ${W} weeks</p><div style="overflow-x:auto"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Heatmap of daily completion over the last ${W} weeks. ${n} days have recorded data.">${r}</svg></div><p class="xs mut" style="margin-top:6px">Each column is a week, Monday at the top. Darker green means more of that day's blocks were marked Done. Grey means nothing was recorded, which is not the same as zero. Past weeks use the plan you had at the time.</p></section>`;
}
function catCard(){
  const cat={};
  DAYS.forEach((d,i)=>blocks(d[0]).forEach(b=>{const c=st.c[b.id];if(c==='done'||c==='partial'){const mn=st.mn[b.id]!=null?st.mn[b.id]:(c==='done'?b.e-b.s:0);if(mn)cat[b.g]=(cat[b.g]||0)+mn}}));
  const rows=Object.entries(cat).sort((a,b)=>b[1]-a[1]),mx=rows.length?rows[0][1]:1;
  return `<section class="card"><p class="lab">Where your time went</p>${rows.length?rows.map(r=>`<div style="margin:6px 0"><div style="display:flex;justify-content:space-between"><span>${esc(r[0])}</span><span class="mut">${dur(r[1])}</span></div>${bar(Math.round(r[1]/mx*100))}</div>`).join(''):'<p class="sm mut">Nothing completed yet this week.</p>'}<p class="xs mut" style="margin-top:6px">Counts blocks marked Done (planned length, or the minutes you logged) plus logged minutes on Partial blocks.</p></section>`;
}
function courseTimeCard(){
  const cm={};sessions.forEach(s=>{if(!s.link||new Date(s.d)<mon)return;const p=s.link.split('|');if(p[0]==='course'||p[0]==='topic')cm[p[1]]=(cm[p[1]]||0)+s.min});
  const rows=courses.filter(c=>cm[c.id]).sort((a,b)=>cm[b.id]-cm[a.id]),none=courses.filter(c=>!cm[c.id]),mx=rows.length?cm[rows[0].id]:1;
  return `<section class="card a"><p class="lab">Focus time by course</p>${rows.map(c=>`<div style="margin:6px 0"><div style="display:flex;justify-content:space-between"><span><b>${esc(c.code)}</b></span><span class="mut">${dur(cm[c.id])}</span></div>${bar(Math.round(cm[c.id]/mx*100))}</div>`).join('')||'<p class="sm mut">No focus sessions linked to a course this week.</p>'}${none.length&&rows.length?`<p class="xs mut" style="margin-top:6px">No linked focus time this week: ${none.map(c=>esc(c.code)).join(', ')}.</p>`:''}<p class="xs mut" style="margin-top:6px">Only focus sessions you linked to a course or topic are counted.</p></section>`;
}
function insightsView(){
  const W=weekStats(),fd=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short'}),rng=fd(dateOf(0))+' to '+fd(dateOf(6));
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'n/a';
  let h=`<section class="card"><p class="lab">Task completion</p><p class="xs mut">${rng}</p>${W.rows.map((r,i)=>`<div class="hr w2${i===todayIdx?' today':''}"><span>${r.d.slice(0,3)}</span>${bar(r.pct)}<span>${r.pct}%</span></div>`).join('')}<p class="xs mut" style="margin-top:6px"><b>Definition:</b> blocks marked Done ÷ planned blocks, cancelled blocks excluded. Starting on time does not count. <b>Limit:</b> future days show 0% until they happen.</p></section>
  <div class="row2" style="margin-top:0"><section class="card g" style="margin:0 0 10px"><p class="lab">Completed</p><p class="big">${pct(W.cd,W.el)}</p><p class="xs mut">${W.cd} of ${W.el} blocks whose time has passed</p></section><section class="card" style="margin:0 0 10px"><p class="lab">Punctuality</p><p class="big">${pct(W.ot,W.rec)}</p><p class="xs mut">${W.ot} of ${W.rec} blocks with a recorded start outcome</p></section></div>`;
  const z=Object.entries(st.z||{}).filter(e=>e[1]!==''&&+e[1]>=0),zv=z.map(e=>+e[1]),avg=zv.length?zv.reduce((a,b)=>a+b,0)/zv.length:null;
  h+=`<section class="card g"><p class="lab">Sleep average</p><p class="big">${avg==null?'No nights logged':avg.toFixed(1)+' h'}</p><p class="xs mut">${zv.length} logged night${zv.length===1?'':'s'} this week (${rng}). Nights you did not log are ignored, not counted as zero.</p>${z.map(e=>`<div class="hr w2"><span>${DAYS.find(d=>d[0]===e[0])[1].slice(0,3)}</span>${bar(Math.min(100,Math.round(+e[1]/10*100)),'g')}<span>${e[1]}h</span></div>`).join('')}</section>
  <section class="card a"><p class="lab">Focus time</p><p class="big">${dur(focusWeekMin())} this week</p><p class="xs mut">Planned study blocks that have passed: ${dur(W.pl)}. Minutes you logged on blocks: ${dur(W.lg)}. Focus sessions: ${dur(focusWeekMin())}. Planned vs actual only shows where you logged minutes; missing minutes are not treated as zero effort.</p></section>`;
  if(faith.ana){const n7=last7().filter(faithDayOn).length;h+=`<section class="card g"><p class="lab">Faith & growth consistency</p><p class="sm"><b>${n7} of the last 7 days</b> with a check-in. Counts only, no reflection text.</p></section>`}
  h+=heatCard()+catCard()+courseTimeCard();
  const m2=Object.entries(W.miss).sort((a,b)=>b[1]-a[1]);
  h+=`<h2>Plan adjustments</h2>`+(m2.length?m2.slice(0,5).map(e=>`<div class="card ${e[1]>=3?'r':'a'}"><p><b>${esc(e[0])}</b>: missed or skipped ${e[1]} time${e[1]===1?'':'s'}</p><p class="xs mut">${e[1]>=3?'Repeatedly missed. Try moving it to a better time or shortening it.':'Watch this one next week.'}</p></div>`).join(''):'<p class="sm mut">Nothing missed or skipped so far this week.</p>');
  h+=`<h2>Weekly review</h2><section class="card n">${['What went well this week?','What got in the way most?','One change I will make next week'].map((q,i)=>`<label class="f" style="margin-top:${i?10:0}px"><span>${q}</span><textarea data-f="wr" data-i="${i}">${esc((st.wr||{})[i]||'')}</textarea></label>`).join('')}<button class="btn" style="width:100%;margin-top:10px" data-a="summary">Export weekly summary (text)</button><p class="xs mut" style="margin-top:6px">The summary has numbers and your review answers. It never includes faith reflections or sleep notes.</p></section>`;
  $('#app').innerHTML=h;
}
function summaryText(){
  const W=weekStats(),fd=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'n/a';
  return ['WEEK TRACKER SUMMARY','Week: '+fd(dateOf(0))+' to '+fd(dateOf(6)),'',
  'Completed (Done ÷ planned blocks already past, cancelled excluded): '+pct(W.cd,W.el)+' ('+W.cd+'/'+W.el+')',
  'Punctuality (started on time ÷ blocks with a recorded start outcome): '+pct(W.ot,W.rec)+' ('+W.ot+'/'+W.rec+')',
  'Focus sessions this week: '+dur(focusWeekMin()),'','Daily completion:',...W.rows.map(r=>'  '+r.d+': '+r.pct+'% ('+r.n+'/'+r.t+')'),'',
  'Missed or skipped:',...(Object.entries(W.miss).length?Object.entries(W.miss).map(e=>'  '+e[0]+': '+e[1]):['  none']),'',
  'Weekly review:',...['What went well','What got in the way','Change for next week'].map((q,i)=>'  '+q+': '+((st.wr||{})[i]||'-'))].join('\n');
}

// ================= REMINDERS =================
const quietNow=(min)=>{const r=settings.rem;if(!r.quiet)return false;const a=m(r.qs),b=m(r.qe);return a>b?(min>=a||min<b):(min>=a&&min<b)};
function upcoming(){
  const r=settings.rem,out=[],base=new Date();
  for(let off=0;off<2;off++){const i=(todayIdx+off)%7,d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+off);
    plan[DAYS[i][0]].filter(b=>!b.once||b.once===KEY).forEach(b=>{
      const lead=b.rm!=null?b.rm:r.lead[b.g];if(lead==null||lead<0)return;
      const t=new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,b.s-lead).getTime();
      if(t>Date.now()-120000)out.push({t,b,lead,off})});
  }
  if(r.revOn){for(let off=0;off<2;off++){const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+off),[hh,mm]=r.revAt.split(':').map(Number),t=new Date(d.getFullYear(),d.getMonth(),d.getDate(),hh,mm).getTime();if(t>Date.now()-120000)out.push({t,b:{id:'rev'+dk(d),l:'Revision check-in',g:'Reading'},lead:0,off,rev:true})}}
  return out.sort((a,b)=>a.t-b.t);
}
function remView(){
  const r=settings.rem,perm=('Notification' in window)?Notification.permission:'unsupported';
  let h=`<section class="card"><label class="inl" style="margin-top:0"><b>Reminders</b><span class="sw"><input type="checkbox" data-f="remon"${r.on?' checked':''} aria-label="Turn reminders on"><i></i></span></label>
  <p class="xs mut" style="margin-top:6px">${perm==='denied'?'Notifications are blocked for this browser. In-app reminders below still work.':perm==='unsupported'?'This browser does not support notifications. The in-app list below still works.':perm==='granted'?'Notifications are allowed.':'Permission is only asked after you turn reminders on.'}</p></section>
  <h2>Per activity type</h2>`;
  [['Classes','UPCOMING CLASS','b'],['Reading','REVISION SESSION','g'],['Charts','CHARTS',''],['Class prep','CLASS PREP',''],['Reflection and prayer','REFLECTION AND PRAYER','a'],['Meals and breaks','MEALS AND BREAKS','']].forEach(x=>{
    const v=r.lead[x[0]];h+=`<section class="card ${x[2]==='b'?'':x[2]}"><label class="inl" style="margin-top:0"><b class="xs" style="letter-spacing:.08em">${x[1]}</b><select data-f="lead" data-g="${esc(x[0])}">${[['-1','Off'],['0','At start time'],['5','5 minutes before'],['10','10 minutes before'],['15','15 minutes before'],['30','30 minutes before']].map(o=>`<option value="${o[0]}"${String(v)===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label></section>`});
  h+=`<section class="card a"><label class="inl" style="margin-top:0"><b class="xs" style="letter-spacing:.08em">REVISION CHECK-IN</b><span class="sw"><input type="checkbox" data-f="revon"${r.revOn?' checked':''}><i></i></span></label><label class="inl">At selected time<input type="time" data-f="revat" value="${r.revAt}"></label></section>
  <section class="card n"><label class="inl" style="margin-top:0"><b class="xs" style="letter-spacing:.08em">QUIET HOURS</b><span class="sw"><input type="checkbox" data-f="quiet"${r.quiet?' checked':''}><i></i></span></label><div class="row2"><input type="time" data-f="qs" value="${r.qs}" aria-label="Quiet hours start"><input type="time" data-f="qe" value="${r.qe}" aria-label="Quiet hours end"></div><p class="xs mut" style="margin-top:6px">No notifications between these times. You can also set a different reminder on any single block in the Planner.</p></section>
  <h2>Upcoming reminders</h2>`;
  const up=upcoming().slice(0,8);
  h+=up.length?up.map(u=>`<div class="card ${u.rev?'a':''}" style="padding:10px 12px 10px 16px"><p><b>${esc(u.b.l)}</b></p><p class="xs mut">${new Date(u.t).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})} · ${u.lead>0?u.lead+' min before':'at start'}${quietNow((new Date(u.t).getHours())*60+new Date(u.t).getMinutes())?' · quiet hours, will stay silent':''}</p></div>`).join(''):'<p class="sm mut">No reminders coming up.</p>';
  h+=`<p class="note">Reminders fire while the app is open or running in the background. Phones can stop background apps, so delivery is not guaranteed. This list is always available as a fallback.</p>`;
  $('#app').innerHTML=h;
}
if(settings.fs)document.documentElement.style.fontSize=settings.fs+'px';
const fired=new Set(lsGet('wt-fired',[]));
function notify(title,body,extra){
  toast(title+': '+body);
  try{if('Notification' in window&&Notification.permission==='granted'){
    const o=Object.assign({body,icon:'icons/icon-192.png'},extra||{});
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(rg=>{if(rg)rg.showNotification(title,o);else new Notification(title,{body})}).catch(()=>{});
    else new Notification(title,{body})}}catch(e){}
}
// ---- accountability check-ins: asks whether you are really doing the block ----
const asked=new Set(lsGet('wt-asked',[]));const snooze={};let ckQ=[],ckOpen=null;
const ckKey=(b,t)=>dk(new Date())+'|'+b.id+'|'+t;
function ckScan(){
  const c=settings.chk;if(!c||!c.on||new Date().toDateString()!==now0.toDateString())return;
  const nm=nowMin();
  blocks(DAYS[todayIdx][0]).forEach(b=>{
        if(b.g==='Meals and breaks'||st.c[b.id])return;
    const sk=ckKey(b,'s'),ek=ckKey(b,'e');
    if(!asked.has(sk)&&!st.t[b.id]&&nm>=b.s+c.delay&&nm<b.e&&(!snooze[b.id]||Date.now()>=snooze[b.id])&&!ckQ.some(q=>q.id===b.id&&q.t==='s')&&!(ckOpen&&ckOpen.id===b.id&&ckOpen.t==='s'))ckQ.push({id:b.id,t:'s'});
    if(c.end&&!asked.has(ek)&&nm>=b.e&&nm<b.e+120&&!ckQ.some(q=>q.id===b.id&&q.t==='e')&&!(ckOpen&&ckOpen.id===b.id&&ckOpen.t==='e'))ckQ.push({id:b.id,t:'e'});
  });
  ckNext();
}
function ckNext(){
  if(ckOpen||!ckQ.length)return;
  const q=ckQ.shift(),b=blocks(DAYS[todayIdx][0]).find(x=>x.id===q.id);
  if(!b||st.c[b.id]){return ckNext()}
  if(q.t==='s'&&st.t[b.id]){return ckNext()}
  ckOpen=q;
  const start=q.t==='s';
  const ex=Object.assign({tag:'ck-'+q.id+q.t,requireInteraction:true,data:{id:q.id,t:q.t},actions:start?[{action:'yes',title:'Yes, doing it'},{action:'no',title:'Not yet'}]:[{action:'done',title:'Done'},{action:'skipped',title:'Skipped'}]});
  if(document.hidden)notify(start?'Are you doing this now?':'Did you finish?',b.l+' · '+fmt(b.s)+'–'+fmt(b.e),ex);else beep();
  const el=document.createElement('div');el.className='ckb';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.innerHTML='<div class="ckc"><p class="lab">Check-in</p><h3>'+(start?'Are you doing this now?':'Did you finish?')+'</h3><p class="ckt"><b>'+esc(b.l)+'</b> · '+fmt(b.s)+'–'+fmt(b.e)+'</p><div class="cka">'+(start
    ?'<button class="y" data-ck="yes">Yes, I’m on it</button><button data-ck="no">Not yet, ask again in 10 min</button><button data-ck="skipped">Skip this block</button>'
    :'<button class="y" data-ck="done">Done</button><button data-ck="partial">Partly done</button><button data-ck="skipped">Skipped</button>')+'</div></div>';
  el.addEventListener('click',ev=>{const a=ev.target.closest('[data-ck]');if(a)ckAnswer(q.id,q.t,a.dataset.ck)});
  document.body.appendChild(el);
}
function ckAnswer(id,t,a){
  const b=blocks(DAYS[todayIdx][0]).find(x=>x.id===id);
  const el=$('.ckb');if(el)el.remove();ckOpen=null;
  if(b){
    if(a==='no'){snooze[id]=Date.now()+600000;toast('Okay, I will ask again in 10 minutes')}
    else{asked.add(ckKey(b,t));lsSet('wt-asked',[...asked].slice(-300));
      if(a==='yes'){st.t[id]=true;toast('Great, keep going')}
      else if(a==='done'||a==='partial'||a==='skipped'){st.c[id]=a;if(a==='skipped'){const r=prompt('Why? 1 tired · 2 distracted · 3 emergency · 4 other','2');st.why=st.why||{};st.why[id]=({1:'tired',2:'distracted',3:'emergency'})[(r||'').trim()]||'other'}toast(a==='done'?'Marked done':a==='partial'?'Marked partly done':'Marked skipped')}
      save();render()}
  }
  setTimeout(ckNext,300);
}
// answers from a notification button (app open or just opened by the tap)
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.wtck)ckFromNote(d.id,d.t,d.a)});
function ckFromNote(id,t,a){if(!a)return;ckQ=ckQ.filter(q=>q.id!==id);if(ckOpen&&ckOpen.id===id){const el=$('.ckb');if(el)el.remove();ckOpen=null}ckAnswer(id,t,a==='yes'||a==='no'||a==='done'||a==='skipped'?a:'no')}
function checkReminders(){
  try{ckScan()}catch(e){}
  if(!settings.rem.on)return;
  const nm=Date.now();
  upcoming().forEach(u=>{
    const key=dk(new Date(u.t))+u.b.id+u.lead;
    if(fired.has(key)||nm<u.t||nm>u.t+120000)return;
    fired.add(key);lsSet('wt-fired',[...fired].slice(-200));
    const mins=new Date(u.t).getHours()*60+new Date(u.t).getMinutes();
    if(quietNow(mins))return;
    notify(u.rev?'Revision check-in':u.b.l,u.rev?'Time for your revision check-in.':(u.lead>0?'Starts in '+u.lead+' minutes':'Starting now'));
  });
}
async function enableRem(on){
  settings.rem.on=on;
  if(on&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch(e){}}
  if(on&&'Notification' in window&&Notification.permission==='denied')toast('Notifications blocked. In-app reminders still work.');
  saveSettings();render();
}

// ================= MORE / SETTINGS / HISTORY =================
function moreView(){
  const items=[['acad','Academics','Courses • topics • exams • revision','var(--ac)'],['faith','Faith & Growth','Habits • reflection • consistency','var(--ok)'],['ins','Insights','Statistics • weekly review','var(--warn)'],['rem','Reminders','Notifications • quiet hours','var(--ac)'],['hist','History','Streaks • past weeks','var(--ok)'],['trade','Trade journal','Entries • win rate','var(--warn)'],['set','Settings','Theme • backup • restore','var(--mut)']];
  $('#app').innerHTML=items.map(x=>`<button class="mn" style="--c:${x[3]}" data-a="go" data-v="${x[0]}"><span><b>${x[1]}</b><small>${x[2]}</small></span><span class="ar">›</span></button>`).join('');
}
function setView(){
  const rec=lsGet('wt-recovery',null);
  const cnt=Object.keys(allWeeks()).length;
  $('#app').innerHTML=`<h2 style="margin-top:0">Appearance</h2><section class="card n"><div class="chips" role="group" aria-label="Theme">${TH.map(t=>`<button data-a="theme" data-v="${t}" aria-pressed="${th===t}">${t==='auto'?'Match phone':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><label class="inl" style="margin-top:0">Your name<input data-f="uname" value="${esc(settings.name==null?'Pelumi':settings.name)}" style="width:150px" autocomplete="off"></label><p class="xs mut" style="font-weight:700">SCHEDULE PROFILE</p><div class="chips" role="group" aria-label="Schedule profile">${[['standard','Standard'],['exam','Exam week']].map(x=>`<button data-a="prof" data-v="${x[0]}" aria-pressed="${(settings.prof||'standard')===x[0]}">${x[1]}</button>`).join('')}</div><p class="xs mut">${settings.prof==='exam'?'Exam week is ON. Anything you change in Planner now only changes your Exam week plan.':'Exam week keeps its own copy of your timetable. Your standard plan is never changed by it.'}</p><div class="row2" style="margin-top:6px"><button class="btn p" data-a="editexam">Edit Exam week plan</button><button class="btn" data-a="xcopy">Reset it from standard</button></div><p class="xs mut" style="font-weight:700">DENSITY</p><div class="chips" role="group" aria-label="Density">${['cozy','compact'].map(x=>`<button data-a="dens" data-v="${x}" aria-pressed="${(settings.dens||'cozy')===x}">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><label class="inl">24-hour clock<span class="sw"><input type="checkbox" data-f="h24"${settings.h24?' checked':''}><i></i></span></label><label class="inl">Daily focus goal (minutes)<input type="number" min="10" max="900" data-f="goal" value="${settings.goal}" style="width:90px"></label><label class="inl">Timer sound and vibration<span class="sw"><input type="checkbox" data-f="cues"${settings.cues?' checked':''}><i></i></span></label></section>
  <h2>Text size</h2><section class="card n"><div class="chips">${[['13','Small'],['14','Normal'],['16','Large']].map(x=>`<button data-a="tsz" data-v="${x[0]}" aria-pressed="${(settings.fs||'14')===x[0]}">${x[1]}</button>`).join('')}</div></section><h2>Check-ins</h2><section class="card a"><label class="inl" style="margin-top:0"><b>Ask if I am really doing it</b><span class="sw"><input type="checkbox" data-f="chkon"${settings.chk.on?' checked':''}><i></i></span></label><label class="inl">Ask this long after a block starts<select data-f="chkd">${[3,5,10,15].map(n=>`<option value="${n}"${settings.chk.delay===n?' selected':''}>${n} minutes</option>`).join('')}</select></label><label class="inl">Also ask when a block ends<span class="sw"><input type="checkbox" data-f="chke"${settings.chk.end?' checked':''}><i></i></span></label><p class="xs mut" style="margin-top:6px">A prompt appears while the app is open. With notifications on, it also arrives as a notification with answer buttons.</p></section>
  <h2>Backup and restore</h2><section class="card"><p class="sm">Last backup: <b>${settings.lastBk?new Date(settings.lastBk).toLocaleDateString():'never'}</b>.</p><p class="sm">${cnt} week${cnt===1?'':'s'}, ${courses.length} courses, ${sessions.length} focus sessions and your faith check-ins are stored on this device.</p><div class="row2"><button class="btn p" data-a="exp">Export full backup</button><button class="btn" data-a="imp">Import backup</button></div>${rec?'<div class="row2"><button class="btn" data-a="rec">Restore recovery copy</button></div>':''}<p class="xs mut" style="margin-top:8px">Backups are versioned and include every week, plan, courses, exams, sessions, habits and settings. You choose whether private journal text is included. Before anything is replaced or reset, a recovery copy is saved. Data lives only in this browser: clearing browser data or changing phone loses it unless you export a backup.</p></section>
  <h2>Reset</h2><section class="card r"><div class="row2" style="margin-top:0"><button class="btn d" data-a="rpl">Restore original plan</button><button class="btn d" data-a="rst">Reset this week</button></div><p class="xs mut" style="margin-top:6px">Both ask first and save a recovery copy.</p></section>
  <h2>About</h2><section class="card n"><p class="sm">Week Tracker ${APP_VERSION} · data format v${SCHEMA}</p><button class="btn sm" style="margin-top:8px" data-a="persist">Ask browser to keep my data</button><p class="xs mut" style="margin-top:6px">To install: open the app link in Chrome, tap the menu, then “Install app” or “Add to Home screen”.</p></section><input type="file" id="impf" accept="application/json,.json" hidden>`;
}
let trades=lsGet('wt-trades',[]);
function tradeView(){
  const cl=trades.filter(t=>t.r!=null),w=cl.filter(t=>t.r>0).length,tot=cl.reduce((a,t)=>a+t.r,0);
  $('#app').innerHTML=`<section class="card g"><p class="lab">Overview</p><div class="row2" style="margin-top:0"><div><p class="big">${cl.length?Math.round(w/cl.length*100)+'%':'–'}</p><p class="xs mut">win rate (${cl.length} trades)</p></div><div><p class="big">${tot>0?'+':''}${tot.toFixed(1)}</p><p class="xs mut">net result</p></div></div></section>
  <h2>New entry</h2><section class="card"><input id="tp" placeholder="Pair e.g. EURUSD" aria-label="Pair"><input id="tr" type="number" step="any" placeholder="Result (pips or $, negative for loss)" aria-label="Result" style="margin-top:6px"><input id="tn" placeholder="Reason / lesson" aria-label="Reason" style="margin-top:6px"><button class="btn p" style="width:100%;margin-top:8px" data-a="addtr">Save trade</button></section>
  <h2>Recent</h2>`+(trades.length?trades.slice().reverse().slice(0,20).map(t=>`<div class="card ${t.r>0?'g':t.r<0?'r':''}" style="padding:10px 12px"><p><b>${esc(t.p||'Trade')}</b> · ${t.r==null?'open':(t.r>0?'+':'')+t.r}</p><p class="xs mut">${new Date(t.d).toLocaleDateString()} ${esc(t.n||'')}</p></div>`).join(''):'<p class="xs mut">No trades yet.</p>');
}
function histView(){
  const wk=streak(s=>s.wake),gd=streak(s=>s.tot&&s.done/s.tot>=.7),pl=n=>n+(n===1?' day':' days');
  let h=`<div class="row2" style="margin-top:0"><section class="card g" style="margin:0 0 10px"><p class="big">${pl(wk)}</p><p class="sm mut">in a row waking up on time</p></section><section class="card" style="margin:0 0 10px"><p class="big">${pl(gd)}</p><p class="sm mut">in a row with 70%+ started on time</p></section></div><h2>Past weeks</h2>`;
  const ks=Object.keys(allWeeks()),dt=k=>{const p=k.split(':')[1].split('-');return new Date(+p[0],+p[1]-1,+p[2])},ws=allWeeks();
  ks.sort((a,b)=>dt(b)-dt(a)).slice(0,12).forEach(k=>{
    const r=ws[k],t=r.t||{},c=r.c||{},n=Object.values(t).filter(Boolean).length,dn=Object.values(c).filter(x=>x==='done').length,tt=r.tot||total(),p=Math.min(100,Math.round(n/tt*100)),p2=Math.min(100,Math.round(dn/tt*100));
    h+=`<div class="hr${k===KEY?' today':''}" style="grid-template-columns:70px 1fr 48px"><span>${dt(k).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</span>${bar(p)}<span>${p}%</span></div><div class="hr" style="grid-template-columns:70px 1fr 48px;margin-top:-2px"><span class="xs mut">done</span>${bar(p2,'g')}<span>${p2}%</span></div>`});
  $('#app').innerHTML=h+'<p class="xs mut" style="margin-top:8px">Blue: share of that week’s blocks started on time. Green: share marked done. They are different measures. Each week keeps the plan it had at the time.</p>';
}

// ================= RENDER =================
function render(){
  const fd=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short'});
  const sub=!!SUB[view];
  const T={today:sel===todayIdx?'Today':DAYS[sel][1],plan:'Planner • '+DAYS[sel][1],focus:'Focus',more:'More'};Object.assign(T,SUB);
  const S={today:dateOf(sel).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}),plan:fd(dateOf(0))+' to '+fd(dateOf(6)),focus:'Timed work sessions',more:'Tools and settings',acad:'Courses, topics, exams, revision',faith:'Private, gentle and flexible',ins:fd(dateOf(0))+' to '+fd(dateOf(6)),rem:'Notifications and quiet hours',set:'Theme, backup and restore',hist:'Streaks and past weeks'};
  $('#title').textContent=T[view];$('#date').textContent=S[view]+((settings.prof==='exam'&&(view==='today'||view==='plan'))?' · Exam week':'');$('#hBack').hidden=!sub;{const q=$('.fab');if(q)q.hidden=!((view==='today'||view==='plan')&&!form)}
  const nav=sub?'more':view;
  document.querySelectorAll('nav.tabs button').forEach(b=>{if(b.dataset.v===nav)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  ({today:todayView,plan:planView,focus:focusView,more:moreView,acad:acadView,faith:faithView,ins:insightsView,rem:remView,set:setView,hist:histView,trade:tradeView})[view]();
}
const R_=()=>render();
const goView=v=>{view=v;form=null;open=null;rsch=null;render();window.scrollTo(0,0)};

// ================= ACTIONS =================
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]');if(!t)return;
  const a=t.dataset.a,v=t.dataset.v,k=DAYS[sel][0];
  const A={
    go:()=>goView(v),back:()=>goView('more'),
    cont:()=>{goView('acad');ocn=+v;render()},
    xnew:()=>{xf=!xf;render()},
    xsave:()=>{const c=courses[+$('#nx-c').value];if(!c)return;c.exams.push({id:uid('x'),title:($('#nx-t').value.trim()||'Exam'),date:$('#nx-d').value,pri:'High',list:[],time:$('#nx-m').value,venue:$('#nx-v').value.trim()});lsSet('wt-courses',courses);xf=false;toast('Exam added to '+c.code);render()},
    qadd:()=>{view='plan';open=null;openForm(null)},
    dens:()=>{settings.dens=v;saveSettings();applyDens();render()},
    prof:()=>{const cur=settings.prof==='exam'?'exam':'standard';if(v===cur)return;if(v==='exam'&&!lsGet('week-tracker-plan-exam',null))lsSet('week-tracker-plan-exam',JSON.parse(JSON.stringify(plan)));savePlan();plan=lsGet(v==='exam'?'week-tracker-plan-exam':'week-tracker-plan',plan);settings.prof=v;saveSettings();save();toast(v==='exam'?'Exam week plan is on. Edit it in Planner.':'Standard plan is on');render()},
    editexam:()=>{if(settings.prof!=='exam'){if(!lsGet('week-tracker-plan-exam',null))lsSet('week-tracker-plan-exam',JSON.parse(JSON.stringify(plan)));savePlan();plan=lsGet('week-tracker-plan-exam',plan);settings.prof='exam';saveSettings();save()}view='plan';pview='day';form=null;toast('Editing your Exam week plan');render()},
    xcopy:()=>{if(confirm('Replace your Exam week plan with a fresh copy of your standard plan?')){const std=lsGet('week-tracker-plan',plan);lsSet('week-tracker-plan-exam',JSON.parse(JSON.stringify(std)));if(settings.prof==='exam')plan=lsGet('week-tracker-plan-exam',plan);save();toast('Exam week plan reset');render()}},
    nfree:()=>{const b=blocks(DAYS[sel][0]).find(x=>x.id===v);if(!b)return;const d=b.e-b.s;
      for(let i=sel;i<7;i++){if(i<todayIdx)continue;const k2=DAYS[i][0],from=i===todayIdx?Math.ceil((nowMin()+5)/15)*15:360;
        for(let s=from;s+d<=1380;s+=15){if(!conflictFor(k2,{s,e:s+d},b.rid||b.id).length){
          if(i===sel){st.ov[v]={s,e:s+d};delete st.c[v]}else{plan[k2].push({id:uid('b'),rid:null,l:b.l,g:b.g,s,e:s+d,once:KEY});st.c[v]='skipped';savePlan()}
          save();toast('Moved to '+DAYS[i][1].slice(0,3)+' '+fmt(s));render();return}}}
      toast('No free slot left this week. Try Reschedule or Shorten.')},
    shiftlater:()=>{const nm3=nowMin();let n=0;blocks(DAYS[todayIdx][0]).forEach(b=>{if(b.s>=nm3&&!st.c[b.id]&&b.e+30<=1440){st.ov[b.id]={s:b.s+30,e:b.e+30};n++}});save();toast(n?n+' blocks moved 30 min later':'Nothing to move');render()},
    tsz:()=>{settings.fs=v;document.documentElement.style.fontSize=v+'px';saveSettings();render()},
    addtr:()=>{const r=$('#tr').value;trades.push({d:Date.now(),p:$('#tp').value.trim().toUpperCase(),r:r===''?null:+r,n:$('#tn').value.trim()});lsSet('wt-trades',trades);toast('Trade saved');render()},
    addpq:()=>{const i=$('#npq'),t=i.value.trim();if(t){const c=courses[+v];c.pq=c.pq||[];c.pq.push({t,sc:null});lsSet('wt-courses',courses);render()}},
    delpq:()=>{const p=v.split('|').map(Number);courses[p[0]].pq.splice(p[1],1);lsSet('wt-courses',courses);render()},
    day:()=>{sel=+v;form=null;open=null;rsch=null;render()},day2:()=>{sel=+v;pview='day';render()},pv:()=>{pview=v;form=null;render()},
    ontime:()=>{st.t[v]=!st.t[v];if(st.t[v]&&navigator.vibrate)navigator.vibrate(15);save();render()},
    outc:()=>{const p=v.split('|');if(st.c[p[0]]===p[1])delete st.c[p[0]];else st.c[p[0]]=p[1];save();render()},
    open:()=>{open=open===v?null:v;rsch=null;render()},
    top3:()=>{const c=blocks(k).filter(b=>st.s[b.id]).length;if(st.s[v])delete st.s[v];else if(c<3)st.s[v]=true;else toast('Top 3 is full. Remove one first.');save();render()},
    rsch:()=>{rsch={id:v};render()},
    rsok:()=>{const b=blocks(DAYS[sel][0]).find(x=>x.id===v);if(!b)return;const ns=m($('#rsT').value||'00:00');st.ov[v]={s:ns,e:ns+(b.e-b.s)};delete st.c[v];save();rsch=null;toast('Moved for this week');render()},
    rsundo:()=>{delete st.ov[v];save();rsch=null;render()},
    shorten:()=>{const b=blocks(k).find(x=>x.id===v);const r=prompt('Shorten to how many minutes? (now '+(b.e-b.s)+')',Math.max(15,Math.round((b.e-b.s)/2)));if(r==null)return;const n=Math.round(+r);if(!(n>0&&n<(b.e-b.s)))return toast('Enter fewer minutes than planned');st.ov[v]={s:b.s,e:b.s+n};save();render()},
        scr:()=>{const s=$('#sec-'+v);if(s){s.scrollIntoView({behavior:'smooth',block:'center'});const i=s.querySelector('input,textarea');if(i)setTimeout(()=>i.focus({preventScroll:true}),250)}},
    // planner
    popen:()=>{open=open===v?null:v;render()},
    add:()=>openForm(null),
    edit:()=>{const b=plan[k].find(x=>x.id===v);openForm(b)},
    dup:()=>{const b=plan[k].find(x=>x.id===v);if(!b)return;const c=Object.assign({},b,{id:k+'-n'+uid(''),l:b.l+' (copy)'});delete c.rid;plan[k].push(c);plan[k].sort((x,y)=>x.s-y.s);savePlan();save();toast('Duplicated. Edit the copy to change its time.');render()},
    del:()=>{const b=plan[k].find(x=>x.id===v);if(b&&confirm('Delete “'+b.l+'” from '+DAYS[sel][1]+'? Past weeks keep their own copy of the plan.')){plan[k]=plan[k].filter(x=>x.id!==v);[st.t,st.s,st.c,st.mn,st.ov].forEach(o=>delete o[v]);savePlan();save();open=null;render()}},
    fday:()=>{const i=+v;form.days=form.days.includes(i)?form.days.filter(x=>x!==i):form.days.concat(i).sort();render()},
    fall:()=>{form.days=[0,1,2,3,4,5,6];render()},fcancel:()=>{form=null;render()},fsave:()=>saveForm(),
    // focus
    preset:()=>{const p=v.split('|').map(Number);fm=p[0];fb=p[1];render()},
    fgo:()=>{
      const mins=Math.max(1,Math.min(240,+$('#cus').value||fm)),brk=Math.max(0,Math.min(60,+$('#cbk').value||0));fm=mins;fb=brk;
      let topic='General',link=null;const sl=$('#flk');
      if(flt!=='none'&&sl&&sl.value){const p=sl.value.split('|');link={type:p[0],id:p[1],ti:p[2]};
        if(p[0]==='course'){const c=courses.find(x=>x.id===p[1]);if(c)topic=c.code+' '+c.name}
        else if(p[0]==='topic'){const c=courses.find(x=>x.id===p[1]);if(c)topic=c.code+' · '+c.topics[+p[2]].n}
        else if(p[0]==='block'){const b=plan[DAYS[todayIdx][0]].find(x=>x.id===p[1]);if(b)topic=b.l}
        else if(p[0]==='habit'){const hb=faith.habits.find(x=>x.id===p[1]);if(hb)topic=hb.n}}
      fdone=null;fs={dur:mins*60000,left:mins*60000,endAt:Date.now()+mins*60000,topic,link,brk,mode:'focus'};lsSet('wt-focus',fs);render();
    },
    fpa:()=>{if(fs.endAt){fs.left=fLeft();fs.endAt=null}else fs.endAt=Date.now()+fs.left;lsSet('wt-focus',fs);render()},
    fend:()=>{if(fs.mode==='break'){logSession(false);render();return}if(confirm('End this session early? It will be logged as ended early, not completed.')){logSession(false);render()}},
    brk:()=>{fdone=null;const mn=fbk;fs={dur:mn*60000,left:mn*60000,endAt:Date.now()+mn*60000,topic:'Break',mode:'break',brk:0};lsSet('wt-focus',fs);render()},
    // academics
    oc:()=>{ocn=ocn===+v?-1:+v;render()},
    addc:()=>{const code=prompt('Course code (for example ELE 411)');if(!code||!code.trim())return;courses.push({id:uid('c'),code:code.trim(),name:prompt('Course title (optional)')||'',exam:'',topics:[],lecturer:'',semester:'First semester, 400L',exams:[]});lsSet('wt-courses',courses);ocn=courses.length-1;render()},
    delc:()=>{const c=courses[+v];if(confirm('Delete '+c.code+' with all its topics and exams? A recovery copy is saved first.')){saveRecovery();courses.splice(+v,1);lsSet('wt-courses',courses);ocn=-1;render()}},
    deltp:()=>{const p=v.split('|').map(Number);if(confirm('Delete this topic?')){courses[p[0]].topics.splice(p[1],1);lsSet('wt-courses',courses);render()}},
    addtp:()=>{const x=$('#nt').value.trim();if(x){courses[+v].topics.push({n:x,s:0});lsSet('wt-courses',courses);render()}},
    addx:()=>{courses[+v].exams.push({id:uid('x'),title:'Exam',date:'',pri:'High',list:[]});lsSet('wt-courses',courses);render()},
    delx:()=>{const p=v.split('|').map(Number);if(confirm('Delete this exam and its checklist?')){courses[p[0]].exams.splice(p[1],1);lsSet('wt-courses',courses);render()}},
    addxl:()=>{const p=v.split('|').map(Number),i=$('#xi-'+p[1]),x=i.value.trim();if(x){courses[p[0]].exams[p[1]].list.push({t:x,d:false});lsSet('wt-courses',courses);render()}},
    delxl:()=>{const p=v.split('|').map(Number);courses[p[0]].exams[p[1]].list.splice(p[2],1);lsSet('wt-courses',courses);render()},
    schrev:()=>{
      const c=courses[+v],ti=$('#rvt').value;if(ti==='')return toast('All topics are revised');
      const d=+$('#rvd').value,s=m($('#rvs').value||'16:00'),mins=Math.max(15,+$('#rvm').value||60),dayk=DAYS[d][0];
      const b={id:dayk+'-n'+uid(''),s,e:s+mins,l:'Revise: '+c.code+' · '+c.topics[+ti].n.slice(0,50),g:R,once:KEY};
      const cl=conflictFor(dayk,{s:b.s,e:b.e},'__new');
      if(cl.length&&!confirm('That time overlaps '+cl.slice(0,2).join(', ')+' on '+DAYS[d][1]+'. Add it anyway?'))return;
      plan[dayk].push(b);plan[dayk].sort((x,y)=>x.s-y.s);savePlan();save();toast('Added to '+DAYS[d][1]+' (this week)');
    },
    // faith
    hab:()=>{const d=dk(new Date());faith.log[d]=faith.log[d]||{};faith.log[d][v]=!faith.log[d][v];saveFaith();render()},
    readdone:()=>{const d=dk(new Date());faith.readLog=faith.readLog||{};faith.readLog[d]=!faith.readLog[d];saveFaith();render()},
    addh:()=>{const x=$('#nh').value.trim();if(x){faith.habits.push({id:uid('h'),n:x,days:[0,1,2,3,4,5,6]});saveFaith();render()}},
    delh:()=>{if(confirm('Remove this habit? Past check-ins stay in your data.')){faith.habits=faith.habits.filter(x=>x.id!==v);saveFaith();render()}},
    hday:()=>{const p=v.split('|'),h=faith.habits.find(x=>x.id===p[0]),i=+p[1];h.days=h.days||[0,1,2,3,4,5,6];h.days=h.days.includes(i)?h.days.filter(x=>x!==i):h.days.concat(i).sort();saveFaith();render()},
    // insights / settings
    summary:()=>download('week-tracker-summary-'+KEY.split(':')[1]+'.txt',summaryText(),'text/plain'),
    theme:()=>{th=v;try{localStorage.setItem('wt-theme',th)}catch(x){}applyTh();render()},
    exp:()=>{settings.lastBk=Date.now();saveSettings();const j=confirm('Include your private journal and reflection text in this backup?\n\nOK = include (full backup)\nCancel = leave it out');download('week-tracker-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(makeBackup(j),null,2),'application/json')},
    imp:()=>$('#impf').click(),
    rec:()=>{const d=lsGet('wt-recovery',null);if(d&&confirm('Restore your recovery copy? Your current data will be replaced.')){try{applyBackup(d)}catch(x){alert('The recovery copy could not be read. Nothing was changed.')}}},
    rpl:()=>{if(confirm('Replace your edited plan with the original plan? A recovery copy is saved first.')){saveRecovery();plan=defPlan();savePlan();save();render()}},
    rst:()=>{if(confirm('Reset this week’s ticks, outcomes and notes? A recovery copy is saved first.')){saveRecovery();st={t:{},s:{},n:{},c:{},mn:{},z:{},r:{},ov:{},wr:{}};save();render()}},
    persist:()=>{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().then(ok=>toast(ok?'Your browser will try to keep your data':'The browser did not agree. Keep exporting backups.'));else toast('Not supported here. Keep exporting backups.')}
  };
  if(A[a])A[a]();
});
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

// ================= INPUTS =================
const cs=(x)=>courses[+x.dataset.ci];
document.addEventListener('input',e=>{
  const x=e.target,f=x.dataset.f,k=DAYS[sel][0];
  if(x.id==='sl'){if(x.value==='')delete st.z[k];else st.z[k]=x.value;save();return}
  if(!f)return;
  if(f==='note'){st.n[k]=x.value;save()}
  else if(f==='refl'){st.r[k]=x.value;save()}
  else if(f==='mn'){if(x.value==='')delete st.mn[x.dataset.id];else st.mn[x.dataset.id]=Math.max(0,Math.round(+x.value));save()}
  else if(f==='fl'){form.l=x.value}
  else if(f==='fcus'){fm=Math.max(1,Math.min(240,+x.value||fm))}
  else if(f==='fbk'){fb=Math.max(0,Math.min(60,+x.value||0))}
  else if(f==='snote'){const s=sessions.find(y=>y.id===x.dataset.id);if(s){s.note=x.value;lsSet('wt-sessions',sessions)}}
  else if(f==='cc'){cs(x).code=x.value;lsSet('wt-courses',courses)}else if(f==='cs'){cs(x).semester=x.value;lsSet('wt-courses',courses)}
  else if(f==='cn'){cs(x).name=x.value;lsSet('wt-courses',courses)}else if(f==='cl'){cs(x).lecturer=x.value;lsSet('wt-courses',courses)}
  else if(f==='uname'){settings.name=x.value;saveSettings()}
  else if(f==='xtm'){cs(x).exams[+x.dataset.xi].time=x.value;lsSet('wt-courses',courses)}
  else if(f==='xv'){cs(x).exams[+x.dataset.xi].venue=x.value;lsSet('wt-courses',courses)}
  else if(f==='pqt'){cs(x).pq[+x.dataset.qi].t=x.value;lsSet('wt-courses',courses)}
  else if(f==='pqs'){cs(x).pq[+x.dataset.qi].sc=x.value===''?null:Math.max(0,Math.min(100,+x.value));lsSet('wt-courses',courses)}
  else if(f==='xt'){cs(x).exams[+x.dataset.xi].title=x.value;lsSet('wt-courses',courses)}
  else if(f==='fread'){faith.reading=x.value;saveFaith()}
  else if(f==='fnote'){faith.notes[dk(new Date())]=x.value;saveFaith()}
  else if(f==='hn'){const h=faith.habits.find(y=>y.id===x.dataset.id);if(h){h.n=x.value;saveFaith()}}
  else if(f==='wr'){st.wr=st.wr||{};st.wr[x.dataset.i]=x.value;save()}
  else if(f==='goal'){settings.goal=Math.max(10,Math.min(900,+x.value||120));saveSettings()}
});
document.addEventListener('change',e=>{
  const x=e.target,f=x.dataset.f,k=DAYS[sel][0];
  if(x.id==='impf'){const fl=x.files[0];if(!fl)return;const r=new FileReader();
    r.onload=()=>{try{
      const d=JSON.parse(r.result),w=checkBackup(d),n=Object.keys(w).length;
      const msg='This backup'+(d.created?' from '+new Date(d.created).toLocaleDateString():'')+' will REPLACE your current data.\n\nIt contains:\n• '+n+' week'+(n===1?'':'s')+' of tracking\n• '+(d.courses?d.courses.length:0)+' courses\n• '+(d.sessions?d.sessions.length:0)+' focus sessions\n• '+(d.faith?d.faith.habits.length:0)+' habits'+(d.journalIncluded===false?'\n• no journal text (your current journal stays)':'')+'\n\nYou now have '+Object.keys(allWeeks()).length+' weeks, '+courses.length+' courses and '+sessions.length+' sessions.\nA recovery copy of your current data is saved first. Continue?';
      if(confirm(msg)){saveRecovery();applyBackup(d)}
    }catch(err){alert('That file is not a valid backup. Nothing was changed.')}x.value=''};r.readAsText(fl);return}
  if(f==='t3'){if(x.value&&blocks(k).filter(b=>st.s[b.id]).length<3){st.s[x.value]=true;save()}render();return}
  if(f==='flt'){flt=x.value;render();return}
  if(['fg','fs','fe','fo','frm'].includes(f)){
    if(f==='fg')form.g=x.value;else if(f==='fs')form.s=m(x.value||'00:00');else if(f==='fe')form.e=m(x.value||'00:00');else if(f==='fo')form.once=x.value==='o';else form.rm=x.value==='d'?null:+x.value;
    if(f==='fs'||f==='fe')render();return}
  if(f==='ts'){cs(x).topics[+x.dataset.ti].s=+x.value;lsSet('wt-courses',courses);render();return}
  if(f==='xd'){cs(x).exams[+x.dataset.xi].date=x.value;lsSet('wt-courses',courses);render();return}
  if(f==='xp'){cs(x).exams[+x.dataset.xi].pri=x.value;lsSet('wt-courses',courses);render();return}
  if(f==='xl'){cs(x).exams[+x.dataset.xi].list[+x.dataset.li].d=x.checked;lsSet('wt-courses',courses);render();return}
  if(f==='fana'){faith.ana=x.checked;saveFaith();return}
  if(f==='remon'){enableRem(x.checked);return}
  if(f==='lead'){settings.rem.lead[x.dataset.g]=+x.value;saveSettings();render();return}
  if(f==='revon'){settings.rem.revOn=x.checked;saveSettings();render();return}
  if(f==='revat'){settings.rem.revAt=x.value||'20:00';saveSettings();render();return}
  if(f==='quiet'){settings.rem.quiet=x.checked;saveSettings();render();return}
  if(f==='qs'){settings.rem.qs=x.value||'22:00';saveSettings();render();return}
  if(f==='qe'){settings.rem.qe=x.value||'07:00';saveSettings();render();return}
  if(f==='chkon'){settings.chk.on=x.checked;saveSettings();return}
  if(f==='chkd'){settings.chk.delay=+x.value;saveSettings();return}
  if(f==='chke'){settings.chk.end=x.checked;saveSettings();return}
  if(f==='h24'){settings.h24=x.checked;saveSettings();render();return}
  if(f==='cues'){settings.cues=x.checked;saveSettings();return}
  if(f==='goal'){render()}
});

// ================= TIMERS & BOOT =================
addEventListener('pagehide',flushW);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushW()});
setInterval(()=>{
  if(fs&&fs.endAt&&fLeft()<=0){const brk=fs.mode==='break';logSession(true);beep();if(view==='focus')render();else toast(brk?'Break finished':'Focus session complete');return}
  if(view==='focus'&&fs){const c=$('#clock');if(c)c.textContent=fClock(fLeft())}
},1000);
setInterval(()=>{checkReminders();const a=document.activeElement;if(form||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))return;if(view==='today'||view==='plan')render()},30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(new Date().toDateString()!==now0.toDateString())(flushW(),location.reload());else{checkReminders();const a=document.activeElement;if(!form&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))render()}});
// A timer that ran out while the app was closed cannot be confirmed, so it is logged as ended early, never as completed.
if(fs&&fs.endAt&&fLeft()<=0)logSession(false,true);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(()=>{})}
render();checkReminders();
{const p=new URLSearchParams(location.search);if(p.get('ck')){history.replaceState(null,'',location.pathname);setTimeout(()=>ckFromNote(p.get('ck'),p.get('t'),p.get('a')),400)}}

setTimeout(()=>{const lb=settings.lastBk;if((!lb||Date.now()-lb>7*864e5)&&settings.bkAsk!==dk(new Date())){settings.bkAsk=dk(new Date());saveSettings();toast('Time to export a backup. Open More, then Settings, then Export full backup.')}},1500);
        
