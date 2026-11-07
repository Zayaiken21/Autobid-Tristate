/* =====================================================================
   AutoBid Tri-State — Ultra Scout + resale value estimator
   Loaded after the main script in index.html; uses its globals
   (esc, store, money, getJSON, offlineDecode, NYC, nycByVin, analyzeVin).
   ===================================================================== */

/* ---------------- RESALE VALUE MODEL ----------------
   Approximate typical new prices (mid trim, USD) → depreciation by age,
   brand value retention, mileage and title. It's an estimate: always
   check the comp links and type in a real comp price when you have one. */
const MODEL_PRICES = {
  toyota:{'corolla cross':27000,corolla:24000,camry:30000,prius:30000,'rav4':33000,highlander:42000,'4runner':45000,tacoma:38000,tundra:52000,sienna:42000,venza:37000,sequoia:65000,'c-hr':25000,avalon:38000,yaris:18000,'land cruiser':70000},
  honda:{civic:26000,accord:31000,'cr-v':33000,'hr-v':26000,pilot:42000,odyssey:41000,ridgeline:42000,passport:42000,fit:18000,insight:25000},
  nissan:{sentra:22000,altima:28000,maxima:39000,versa:18000,'rogue sport':26000,rogue:31000,kicks:22000,murano:38000,pathfinder:40000,armada:55000,frontier:35000,titan:48000,leaf:30000},
  ford:{'f-150':50000,'f-250':60000,'f-350':65000,escape:30000,explorer:42000,edge:38000,expedition:62000,'bronco sport':32000,bronco:42000,'mustang mach-e':45000,mustang:35000,ranger:35000,focus:21000,fusion:25000,transit:48000,ecosport:22000,taurus:32000,flex:35000,maverick:28000},
  chevrolet:{silverado:50000,malibu:26000,cruze:21000,equinox:30000,traverse:40000,tahoe:62000,suburban:65000,colorado:35000,camaro:33000,blazer:38000,trailblazer:25000,trax:23000,spark:15000,impala:30000,bolt:30000,express:45000},
  gmc:{sierra:52000,yukon:65000,acadia:40000,terrain:32000,canyon:38000,savana:45000},
  ram:{'1500':48000,'2500':58000,'3500':62000,promaster:45000},
  dodge:{charger:36000,challenger:36000,durango:42000,'grand caravan':30000,journey:26000,ram:45000},
  jeep:{'grand cherokee':45000,cherokee:32000,wrangler:40000,compass:29000,renegade:27000,gladiator:42000,'patriot':22000},
  chrysler:{pacifica:42000,'300':36000,'town and country':32000,'200':24000},
  hyundai:{elantra:23000,sonata:28000,tucson:30000,'santa fe':34000,palisade:42000,kona:25000,accent:18000,venue:21000,'ioniq 5':45000},
  kia:{forte:21000,k5:27000,optima:25000,soul:22000,sportage:30000,sorento:34000,telluride:42000,seltos:25000,carnival:38000,rio:18000,niro:28000,sedona:32000},
  subaru:{impreza:24000,legacy:27000,outback:32000,forester:30000,crosstrek:27000,ascent:40000,wrx:33000},
  mazda:{'cx-30':27000,'cx-50':33000,'cx-5':31000,'cx-9':40000,'cx-90':45000,'mx-5':30000,mazda3:25000,mazda6:28000,'3':25000,'6':28000},
  volkswagen:{jetta:23000,passat:27000,tiguan:31000,atlas:40000,'gti':32000,golf:25000,taos:26000},
  'mercedes-benz':{'c-class':47000,'e-class':60000,'s-class':115000,'glc':50000,'gle':65000,'gla':42000,'glb':45000,'gls':90000,'cla':42000,'sprinter':55000},
  audi:{a3:38000,a4:44000,a6:58000,q3:40000,q5:48000,q7:62000,q8:75000},
  lexus:{es:44000,is:43000,rx:52000,nx:44000,gx:62000,ux:37000},
  acura:{tlx:45000,mdx:52000,rdx:46000,ilx:30000,integra:33000},
  infiniti:{q50:44000,qx60:50000,qx50:44000,qx80:75000,qx55:50000},
  tesla:{'model 3':42000,'model y':46000,'model s':80000,'model x':90000},
  cadillac:{escalade:85000,xt5:48000,xt4:40000,xt6:52000,cts:48000,ct5:42000},
  lincoln:{navigator:85000,aviator:55000,nautilus:48000,mkz:38000,corsair:40000},
  volvo:{xc90:60000,xc60:50000,xc40:40000,s60:44000},
  buick:{enclave:45000,'encore gx':28000,encore:26000,envision:35000},
  'land rover':{'range rover sport':85000,'range rover evoque':50000,'range rover velar':62000,'range rover':100000,discovery:60000,defender:65000},
  jaguar:{'f-pace':55000,'e-pace':48000,xf:50000,xe:42000},
  maserati:{ghibli:80000,levante:85000,quattroporte:105000},
  mitsubishi:{'outlander sport':25000,outlander:30000,mirage:17000,'eclipse cross':27000},
  porsche:{cayenne:85000,macan:65000,'911':120000,panamera:100000},
  mini:{cooper:30000,countryman:35000},
  genesis:{g70:42000,g80:55000,gv70:47000,gv80:60000}
};
const BMW_RULES=[[/^(3\d\d|3 series)/i,46000],[/^(4\d\d|4 series)/i,52000],[/^(5\d\d|5 series)/i,58000],[/^(7\d\d|7 series)/i,95000],[/^x1/i,42000],[/^x2/i,42000],[/^x3/i,50000],[/^x4/i,56000],[/^x5/i,66000],[/^x6/i,75000],[/^x7/i,80000],[/^i4/i,55000],[/^m\d/i,75000]];
// value retention vs average (1 = average)
const RETAIN={toyota:1.15,lexus:1.1,honda:1.1,porsche:1.1,subaru:1.05,acura:0.98,mazda:1.0,jeep:1.0,ram:1.0,gmc:1.0,ford:0.97,chevrolet:0.97,dodge:0.95,kia:0.95,hyundai:0.94,genesis:0.85,volkswagen:0.9,buick:0.9,nissan:0.88,mitsubishi:0.88,volvo:0.88,'mercedes-benz':0.85,bmw:0.85,audi:0.85,cadillac:0.85,lincoln:0.85,mini:0.85,chrysler:0.85,infiniti:0.82,tesla:0.8,'land rover':0.8,jaguar:0.75,'alfa romeo':0.7,maserati:0.65};
const LUX=new Set(['mercedes-benz','bmw','audi','lexus','acura','infiniti','cadillac','lincoln','volvo','land rover','jaguar','maserati','porsche','genesis','tesla','alfa romeo']);
const MAKE_ALIAS={'me/be':'mercedes-benz','mercedes':'mercedes-benz','merz':'mercedes-benz','chevy':'chevrolet','chevr':'chevrolet','volks':'volkswagen','vw':'volkswagen','land':'land rover','lndr':'land rover','infin':'infiniti','mitsu':'mitsubishi','hyund':'hyundai','toyot':'toyota','nissa':'nissan','honda':'honda','acura':'acura','lexus':'lexus','mazda':'mazda','dodge':'dodge','chrys':'chrysler','cadil':'cadillac','linco':'lincoln','subar':'subaru','jagua':'jaguar','maser':'maserati','porsc':'porsche','tesla':'tesla','volvo':'volvo','buick':'buick','genes':'genesis','alfa':'alfa romeo'};

function canonMake(m){
  if(!m) return '';
  let s=String(m).toLowerCase().trim();
  if(RETAIN[s]!==undefined||MODEL_PRICES[s]) return s;
  if(MAKE_ALIAS[s]) return MAKE_ALIAS[s];
  const k=Object.keys(MAKE_ALIAS).find(a=>s.startsWith(a)||a.startsWith(s.slice(0,4)));
  if(k) return MAKE_ALIAS[k];
  const b=Object.keys(RETAIN).find(r=>r.startsWith(s.slice(0,4)));
  return b||s;
}
function bodySegmentPrice(body,lux){
  const b=(body||'').toLowerCase();
  let p=28000;
  if(/pickup/.test(b)) p=48000;
  else if(/van/.test(b)&&!/minivan/.test(b)) p=45000;
  else if(/minivan/.test(b)) p=40000;
  else if(/sport utility|suv|mpv|crossover/.test(b)) p=36000;
  else if(/hatchback/.test(b)) p=24000;
  else if(/coupe|convertible/.test(b)) p=36000;
  else if(/sedan/.test(b)) p=29000;
  return lux?p*1.6:p;
}
function lookupPrice(make,model){
  const mk=canonMake(make),md=(model||'').toLowerCase().trim();
  if(!md) return null;
  if(mk==='bmw'){for(const [rx,p] of BMW_RULES) if(rx.test(md)) return p;return null;}
  const table=MODEL_PRICES[mk];if(!table) return null;
  const keys=Object.keys(table).sort((a,b)=>b.length-a.length);
  const hit=keys.find(k=>md===k||md.startsWith(k+' ')||md.startsWith(k+'-')||md.startsWith(k)&&k.length>=4||md.includes(k)&&k.length>=5);
  return hit?table[hit]:null;
}
/* Returns {value, low, high, wholesale, dealer, confidence, basis[]} */
function estimateValue({year,make,model,body,miles,title}){
  const nowY=new Date().getFullYear()+new Date().getMonth()/12;
  year=+year||null;
  const mk=canonMake(make),lux=LUX.has(mk);
  const basis=[];
  let base=lookupPrice(make,model),matched=!!base;
  if(!base){base=bodySegmentPrice(body,lux);basis.push(model?`No price data for "${model}" — used ${body?'body type':'average'}`:'Model unknown — used an average price');}
  if(!year) return {value:null,confidence:'none',basis:['Model year unknown']};
  base*=Math.pow(0.98,Math.max(0,2025-year));                  // older model years cost less new
  const age=Math.max(0,nowY-year);
  const curve=age<=1?1-0.15*age:0.85*Math.pow(0.92,age-1);          // depreciation
  let v=base*Math.max(curve,0.06)*(RETAIN[mk]||0.92);
  const exp=Math.max(6000,12000*age);
  if(miles>0){
    const f=Math.min(1.2,Math.max(0.55,1-((miles-exp)/10000)*0.03));
    v*=f;basis.push(`${Math.round(miles).toLocaleString()} mi vs ~${Math.round(exp/1000)}k typical (${f>=1?'+':''}${Math.round((f-1)*100)}%)`);
  }else basis.push('Mileage unknown — range widened');
  const tf={clean:1,marshal:1,salvage:0.55,rebuilt:0.75,parts:0.25,unknown:0.9}[title||'clean']??1;
  if(tf!==1){v*=tf;basis.push(`Title adjustment ×${tf}`);}
  v=Math.max(500,Math.round(v/50)*50);
  const conf=matched&&miles>0?'high':matched||miles>0?'medium':'low';
  const w={high:0.10,medium:0.15,low:0.25}[conf];
  return {value:v,low:Math.round(v*(1-w)/50)*50,high:Math.round(v*(1+w)/50)*50,
    wholesale:Math.round(v*0.80/50)*50,dealer:Math.round(v*1.12/50)*50,confidence:conf,basis,
    note:`${year} · ${Math.round(age)} yrs old · ${mk?mk.replace(/\b\w/g,c=>c.toUpperCase()):'?'} retention ×${RETAIN[mk]||0.92}`};
}
function compLinks({year,make,model},zip){
  const mk=canonMake(make),md=(model||'').trim();
  const q=encodeURIComponent([year,mk,md].filter(Boolean).join(' '));
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const links=[];
  if(mk&&md&&year){
    links.push(['KBB',`https://www.kbb.com/${slug(mk)}/${slug(md)}/${year}/`]);
    links.push(['Edmunds',`https://www.edmunds.com/${slug(mk)}/${slug(md)}/${year}/appraisal/`]);
  }
  links.push(['FB Marketplace',`https://www.facebook.com/marketplace/nyc/search?query=${q}`]);
  links.push(['Craigslist',`https://newyork.craigslist.org/search/cta?query=${q}`]);
  links.push(['Google',`https://www.google.com/search?q=${q}+for+sale${zip?'+near+'+zip:'+New+York'}`]);
  return links;
}

/* ---------------- SCOUT STATE ---------------- */
const SCOUT_DEFAULTS={feePct:10,feeFlat:150,tow:250,dmv:200,tax:8.875,profit:1500,winPct:65,recon:300,budget:0,minProfit:0,rule:true,source:'',sort:'score'};
let SCOUT=Object.assign({},SCOUT_DEFAULTS,store.get('ab_scout_settings',{}));
const saveScout=()=>store.set('ab_scout_settings',SCOUT);
const getStatus=vin=>store.get('ab_scout_status',{})[vin]||{};
function setStatus(vin,patch){const all=store.get('ab_scout_status',{});all[vin]=Object.assign({},all[vin]||{},patch);store.set('ab_scout_status',all);}
const manualLots=()=>store.get('ab_scout_manual',[]);

function allCandidates(){
  const out=[];
  if(typeof NYC!=='undefined'&&NYC&&NYC.auctions) NYC.auctions.forEach(a=>a.lots.forEach(l=>{
    const d=l.decoded||{};
    out.push({vin:l.vin,source:'NYC Marshal',sourceKey:'nyc',date:a.date,where:[a.borough,a.location].filter(Boolean).join(' · '),
      year:+(d.modelYear||l.year)||null,make:d.make||l.make,model:d.model||'',trim:d.trim||'',body:d.body||'',engine:d.engine||'',
      lienholder:l.lienholder||'',recalls:l.recalls,defaults:{keys:'unknown',run:'unknown',title:'marshal',damage:'unknown'},pdf:a.pdf});
  }));
  manualLots().forEach(m=>out.push({...m,sourceKey:'mine',defaults:{keys:m.keys,run:m.run,title:m.title,damage:m.damage,miles:m.miles}}));
  return out;
}

function scoutRisk(c,st){
  let s=100;const f=[];
  const title=st.title||c.defaults.title,dmg=st.damage||c.defaults.damage,miles=+(st.miles||c.defaults.miles)||0;
  s-={clean:0,salvage:15,rebuilt:10,parts:45,marshal:10,unknown:15}[title]??10;
  if(title==='marshal')f.push('Marshal sale — no warranty; confirm the title transfers clean');
  if(title==='salvage')f.push('Salvage title — needs repair + state salvage inspection before it can be sold as a road car');
  s-={none:0,front:10,rear:7,side:9,mech:12,flood:35,fire:35,roll:30,vandal:10,unknown:8}[dmg]??8;
  if(dmg==='flood')f.push('Flood damage — electrical problems often show up later');
  if(dmg==='unknown')f.push('Condition not inspected yet');
  if(c.lienholder){s-=8;f.push(`Lienholder listed (${c.lienholder}) — may still owe a loan; confirm you get a clear title`);}
  if(c.recalls>0){s-=Math.min(c.recalls*2,8);f.push(`${c.recalls} recall(s) on this model — confirm repairs were done`);}
  if(miles>150000){s-=8;f.push('High mileage (150k+)');}
  if(c.year&&new Date().getFullYear()-c.year>15){s-=5;f.push('Over 15 years old — parts and resale get harder');}
  if(!c.model) {s-=5;f.push('Model not decoded — value estimate is rough');}
  const keys=st.keys||c.defaults.keys,run=st.run||c.defaults.run;
  if(keys==='no')f.push('No keys');if(run==='no'||run==='start')f.push(run==='no'?'Does not start':'Starts but doesn’t drive');
  s=Math.max(0,s);
  return {score:s,grade:s>=85?'A':s>=70?'B':s>=55?'C':s>=40?'D':'F',flags:f};
}

function analyzeCandidate(c){
  const st=getStatus(c.vin);
  const keys=st.keys||c.defaults.keys||'unknown',run=st.run||c.defaults.run||'unknown';
  const miles=+(st.miles||c.defaults.miles)||0,title=st.title||c.defaults.title||'clean';
  const est=estimateValue({year:c.year,make:c.make,model:c.model,body:c.body,miles,title});
  let value=est.value,wholesale=est.wholesale,valSource='estimate';
  if(+st.comp>0){value=+st.comp;wholesale=Math.round(value*0.8/50)*50;valSource='your comps';}
  const r=scoutRisk(c,st);
  const pct=SCOUT.feePct/100,tax=SCOUT.tax/100;
  const repair=(+st.repair>=0&&st.repair!==''&&st.repair!=null)?+st.repair:SCOUT.recon;
  const costsNoBid=repair+SCOUT.tow+SCOUT.dmv+SCOUT.feeFlat;
  const res={c,st,keys,run,miles,title,est,value,wholesale,valSource,risk:r,repair};
  if(!value){res.score=0;res.label='Not enough data';return res;}
  res.maxBid=Math.max(0,Math.floor((value-SCOUT.profit-costsNoBid)/(1+pct+tax)/25)*25);
  let expBid=Math.round(wholesale*SCOUT.winPct/100/25)*25;
  if(+c.currentBid>expBid) expBid=+c.currentBid;
  res.expBid=expBid;
  res.expAllIn=Math.round(expBid*(1+pct+tax)+costsNoBid);
  res.expProfit=value-res.expAllIn;
  res.roi=res.expAllIn>0?res.expProfit/res.expAllIn:0;
  res.eligible=keys==='yes'&&run==='rd';
  res.failsRule=keys==='no'||run==='no'||run==='start';
  const conf={high:10,medium:5,low:0}[valSource==='your comps'?'high':est.confidence]||0;
  let sc=Math.max(0,Math.min(60,res.roi*150))+r.score*0.3+conf;
  if(res.expProfit<0) sc=Math.min(sc,30);
  if(res.maxBid<expBid) sc-=10;
  res.score=Math.round(Math.max(0,Math.min(100,sc)));
  res.label=res.score>=80?'🔥 Strong buy':res.score>=65?'Good deal':res.score>=50?'Fair':'Pass';
  return res;
}

/* ---------------- UI ---------------- */
const fmtD=d=>{if(!d)return'Date TBD';const [y,m,dd]=d.split('-');return new Date(+y,m-1,+dd).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});};
const yn=(v,yes='✓',no='✗')=>v==='yes'||v==='rd'?`<span style="color:var(--accent2)">${yes}</span>`:v==='no'||v==='start'?`<span style="color:var(--bad)">${no}</span>`:'<span style="color:var(--warn)">?</span>';
const carName=c=>[c.year,c.make,c.model,c.trim].filter(Boolean).join(' ');
const scoreColor=s=>s>=80?'var(--accent2)':s>=65?'#84cc16':s>=50?'var(--warn)':'var(--bad)';

function scoutCard(r,rank){
  const c=r.c;
  return `<div class="yard">
    <div class="top"><div>${rank?`<span class="muted">#${rank}</span> `:''}<b>${esc(carName(c))}</b><br>
      <span class="tag">${esc(c.source)}</span>${c.date?`<span class="tag">${esc(fmtD(c.date))}</span>`:''}
      <span class="tag">Keys ${yn(r.keys)}</span><span class="tag">Runs & drives ${yn(r.run)}</span></div>
      <div style="text-align:right"><div style="font-size:26px;font-weight:900;color:${scoreColor(r.score)}">${r.score}</div><div class="muted" style="font-size:11px">${esc(r.label)}</div></div></div>
    <div class="kpi" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
      <div>Could sell for<b style="font-size:16px">${r.value?money(r.valSource==='your comps'?r.value:r.est.low)+(r.valSource==='your comps'?'':'–'+money(r.est.high)):'—'}</b></div>
      <div>Max bid<b style="font-size:16px">${r.maxBid!=null?money(r.maxBid):'—'}</b></div>
      <div>Est. profit<b style="font-size:16px;color:${r.expProfit>0?'var(--accent2)':'var(--bad)'}">${r.expProfit!=null?money(r.expProfit):'—'}</b></div>
      <div>Risk<b style="font-size:16px" class="g${r.risk.grade}">${r.risk.grade}</b></div>
    </div>
    <div class="row" style="margin-top:8px"><button class="btn" data-full="${esc(c.vin)}">Full analysis</button>
      ${!r.eligible&&!r.failsRule?`<button class="btn ghost" data-verify="${esc(c.vin)}">Verified: keys + drives ✓</button>`:''}</div>
  </div>`;
}

function renderScout(){
  const box=document.getElementById('scoutList');if(!box)return;
  const cands=allCandidates();
  let rows=cands.map(analyzeCandidate);
  if(SCOUT.source) rows=rows.filter(r=>r.c.sourceKey===SCOUT.source);
  if(SCOUT.budget>0) rows=rows.filter(r=>r.expBid==null||r.expBid<=SCOUT.budget);
  if(SCOUT.minProfit>0) rows=rows.filter(r=>(r.expProfit||0)>=SCOUT.minProfit);
  const sorters={score:(a,b)=>b.score-a.score,profit:(a,b)=>(b.expProfit||-1e9)-(a.expProfit||-1e9),roi:(a,b)=>(b.roi||-9)-(a.roi||-9),date:(a,b)=>(a.c.date||'9999').localeCompare(b.c.date||'9999')};
  rows.sort(sorters[SCOUT.sort]||sorters.score);
  const elig=rows.filter(r=>r.eligible),failed=rows.filter(r=>r.failsRule),unver=rows.filter(r=>!r.eligible&&!r.failsRule);
  document.getElementById('scoutStats').innerHTML=`<div>Scanned<b>${cands.length}</b></div><div>Keys + drives ✓<b style="color:var(--accent2)">${elig.length}</b></div><div>Need checking<b style="color:var(--warn)">${unver.length}</b></div><div>Ruled out<b style="color:var(--bad)">${failed.length}</b></div>`;
  let html='';
  if(!cands.length) html='<div class="card muted">No cars loaded yet. Import an NYC auction PDF in the NYC Marshal Lots tab, or add a Copart/IAA lot above.</div>';
  else if(SCOUT.rule){
    html+=`<h3 style="margin:6px 0 10px">✅ Keys + runs & drives — ranked (${elig.length})</h3>`;
    html+=elig.length?elig.map((r,i)=>scoutCard(r,i+1)).join(''):'<div class="card muted">No verified cars yet. NYC Marshal lists don’t say whether a car has keys or drives — check at the preview (or ask the auctioneer), then tap “Verified” on the cars below.</div>';
    if(unver.length) html+=`<details class="card" ${elig.length?'':'open'}><summary style="cursor:pointer;font-weight:700">⚠️ Need checking at preview (${unver.length}) — best-looking first</summary><div style="margin-top:10px">${unver.map(r=>scoutCard(r)).join('')}</div></details>`;
    if(failed.length) html+=`<p class="muted">${failed.length} car(s) hidden: no keys or doesn’t drive.</p>`;
  }else html=rows.map((r,i)=>scoutCard(r,i+1)).join('');
  box.innerHTML=html;
  box.querySelectorAll('[data-full]').forEach(b=>b.addEventListener('click',()=>openFull(b.dataset.full)));
  box.querySelectorAll('[data-verify]').forEach(b=>b.addEventListener('click',()=>{setStatus(b.dataset.verify,{keys:'yes',run:'rd'});renderScout();}));
}

function sel(id,opts,val){return `<select id="${id}">${opts.map(([v,t])=>`<option value="${v}"${v===val?' selected':''}>${t}</option>`).join('')}</select>`;}

function openFull(vin){
  const c=allCandidates().find(x=>x.vin===vin);if(!c)return;
  const r=analyzeCandidate(c),e=r.est;
  const zip=(document.getElementById('zip')||{}).value||'';
  const pct=SCOUT.feePct/100,tax=SCOUT.tax/100;
  const line=(k,v)=>`<tr><td>${k}</td><td style="text-align:right">${money(v)}</td></tr>`;
  const costTable=bid=>`<table>${line('Winning bid',bid)}${line(`Buyer fee (${SCOUT.feePct}%) + flat`,bid*pct+SCOUT.feeFlat)}${line(`Sales tax (${SCOUT.tax}%)`,bid*tax)}${line('Repairs / reconditioning',r.repair)}${line('Tow / transport',SCOUT.tow)}${line('Title, DMV, inspection',SCOUT.dmv)}<tr><th>All-in</th><th style="text-align:right">${money(bid*(1+pct+tax)+SCOUT.feeFlat+r.repair+SCOUT.tow+SCOUT.dmv)}</th></tr></table>`;
  const m=document.getElementById('scoutModal');
  m.innerHTML=`<div class="sheet">
    <div class="top" style="display:flex;justify-content:space-between;gap:8px;align-items:start">
      <div><div class="muted">⚡ Ultra Scout · Full analysis</div><h2 style="margin:2px 0">${esc(carName(c))}</h2>
        <div class="muted" style="font-family:monospace">${esc(c.vin)}</div>
        <div class="muted">${esc(c.source)}${c.date?' · '+esc(fmtD(c.date)):''}${c.where?' · '+esc(c.where):''}</div></div>
      <button class="btn ghost" id="scClose">✕</button></div>

    <div class="kpi"><div>Deal score<b style="color:${scoreColor(r.score)};font-size:28px">${r.score}</b><span class="muted">${esc(r.label)}</span></div>
      <div>Your rule<b style="font-size:15px">${r.eligible?'<span style="color:var(--accent2)">✓ Keys + drives</span>':r.failsRule?'<span style="color:var(--bad)">✗ Fails</span>':'<span style="color:var(--warn)">? Not verified</span>'}</b></div>
      <div>Risk grade<b class="g${r.risk.grade}" style="font-size:28px">${r.risk.grade}</b><span class="muted">${r.risk.score}/100</span></div></div>

    <div class="card" style="margin-top:12px"><h3>💵 What it could sell for</h3>
      ${r.value?`<div class="kpi"><div>Private sale${r.valSource==='your comps'?' (your comps)':''}<b>${r.valSource==='your comps'?money(r.value):money(e.low)+' – '+money(e.high)}</b></div>
        <div>Dealer retail<b>${money(r.valSource==='your comps'?r.value*1.12:e.dealer)}</b></div><div>Wholesale / trade-in<b>${money(r.wholesale)}</b></div></div>
        <p class="muted">Confidence: <b>${r.valSource==='your comps'?'high (your comps)':e.confidence}</b>${r.valSource!=='your comps'&&e.note?' · '+esc(e.note):''}</p>
        ${r.valSource!=='your comps'&&e.basis&&e.basis.length?`<ul class="flags muted">${e.basis.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}`
      :'<p class="muted">Not enough info to estimate (model year unknown).</p>'}
      <p class="muted" style="margin-top:8px">Check real listings, then type the price similar cars sell for:</p>
      <div class="row">${compLinks(c,zip).map(([t,u])=>`<a class="btn ghost" style="text-decoration:none;padding:7px 10px" target="_blank" rel="noopener" href="${esc(u)}">${t}</a>`).join('')}</div>
      <div class="row" style="margin-top:8px"><div style="flex:1;min-width:150px"><label>My comp price ($)</label><input id="scComp" type="number" value="${esc(r.st.comp||'')}" placeholder="e.g. 15500"></div></div>
    </div>

    <div class="card"><h3>🔍 Inspection checklist</h3>
      <div class="grid">
        <div><label>Keys</label>${sel('scKeys',[['unknown','Not checked'],['yes','Yes'],['no','No']],r.keys)}</div>
        <div><label>Runs & drives</label>${sel('scRun',[['unknown','Not checked'],['rd','Runs & drives'],['start','Starts only'],['no','Does not start']],r.run)}</div>
        <div><label>Mileage</label><input id="scMiles" type="number" value="${esc(r.st.miles||c.defaults.miles||'')}" placeholder="from dash"></div>
        <div><label>Title</label>${sel('scTitle',[['marshal','Marshal sale'],['clean','Clean'],['salvage','Salvage'],['rebuilt','Rebuilt'],['parts','Parts only'],['unknown','Unknown']],r.title)}</div>
        <div><label>Damage</label>${sel('scDamage',[['unknown','Not checked'],['none','None / minor'],['front','Front'],['rear','Rear'],['side','Side'],['mech','Mechanical'],['flood','Flood'],['fire','Fire'],['roll','Rollover'],['vandal','Vandalism']],r.st.damage||c.defaults.damage||'unknown')}</div>
        <div><label>Repair estimate ($)</label><input id="scRepair" type="number" value="${esc(r.st.repair??'')}" placeholder="${SCOUT.recon} default"></div>
      </div>
      <ul class="flags muted" style="margin-top:8px"><li>Check engine light off? Smooth shifting in all gears?</li><li>Flood signs: damp carpet, musty smell, rust under seats, silt in trunk</li><li>Frame / airbag light / mismatched paint gaps</li><li>VIN on dash, door jamb and paperwork all match</li></ul>
      <label>Notes</label><textarea id="scNotes" placeholder="What you saw at the preview…">${esc(r.st.notes||'')}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn green" id="scSave">Save &amp; re-score</button></div>
    </div>

    ${r.value?`<div class="card"><h3>🧮 Numbers</h3>
      <div class="kpi"><div>Max bid (keeps ${money(SCOUT.profit)} profit)<b>${money(r.maxBid)}</b></div><div>Likely winning bid<b>${money(r.expBid)}</b><span class="muted">${c.currentBid?'current bid':'~'+SCOUT.winPct+'% of wholesale'}</span></div>
        <div>Profit at likely bid<b style="color:${r.expProfit>0?'var(--accent2)':'var(--bad)'}">${money(r.expProfit)}</b><span class="muted">ROI ${Math.round(r.roi*100)}%</span></div></div>
      <h3 style="margin-top:12px">Cost at likely winning bid</h3>${costTable(r.expBid)}
      <h3 style="margin-top:12px">Cost at your max bid</h3>${costTable(r.maxBid)}</div>`:''}

    <div class="card"><h3>⚠️ Risk factors</h3>${r.risk.flags.length?`<ul class="flags muted">${r.risk.flags.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:'<p class="muted">Nothing flagged.</p>'}
      ${c.engine||c.body?`<p class="muted">${esc([c.body,c.engine].filter(Boolean).join(' · '))}</p>`:''}</div>

    <div class="row"><button class="btn" id="scCalc">Open in calculator</button><button class="btn ghost" id="scWatch">Save to watchlist</button>
      ${c.pdf?`<a class="btn ghost" style="text-decoration:none" target="_blank" rel="noopener" href="${esc(c.pdf)}">Official list</a>`:''}
      ${c.sourceKey==='mine'?`<button class="btn ghost" id="scDel" style="color:var(--bad)">Remove lot</button>`:''}</div>
  </div>`;
  m.style.display='block';document.body.style.overflow='hidden';m.scrollTop=0;
  const close=()=>{m.style.display='none';document.body.style.overflow='';};
  document.getElementById('scClose').onclick=close;
  m.onclick=ev=>{if(ev.target===m)close();};
  document.getElementById('scSave').onclick=()=>{
    setStatus(vin,{keys:scKeys.value,run:scRun.value,miles:scMiles.value,title:scTitle.value,damage:scDamage.value,repair:scRepair.value===''?null:scRepair.value,comp:scComp.value,notes:scNotes.value});
    renderScout();openFull(vin);
  };
  document.getElementById('scCalc').onclick=()=>{close();
    applyToCalculator(vin,r);
    document.querySelector('#tabs button[data-tab="analyze"]').click();window.scrollTo({top:0});
    document.getElementById('vinBtn').click();};
  document.getElementById('scWatch').onclick=()=>{
    const w=store.get('ab_watch',[]);
    w.unshift({id:Date.now(),vin,car:carName(c),lot:`${c.source}${c.date?' '+c.date:''}`,grade:r.risk.grade,maxBid:r.maxBid||0,value:r.value||0,saved:new Date().toLocaleDateString()});
    store.set('ab_watch',w);alert('Saved to watchlist');};
  const del=document.getElementById('scDel');
  if(del) del.onclick=()=>{if(confirm('Remove this lot?')){store.set('ab_scout_manual',manualLots().filter(x=>x.vin!==vin));close();renderScout();}};
}

function applyToCalculator(vin,r){
  const st=getStatus(vin);const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;};
  set('vin',vin);
  if(r){set('cTitle',r.title);set('cKeys',r.keys==='yes'?'yes':r.keys==='no'?'no':null);set('cRun',r.run!=='unknown'?r.run:null);
    set('cMiles',r.miles||null);set('nValue',r.value);set('nRepair',r.repair);}
  else{set('cKeys',st.keys==='yes'||st.keys==='no'?st.keys:null);set('cRun',st.run&&st.run!=='unknown'?st.run:null);set('cMiles',st.miles);}
  set('nFeePct',SCOUT.feePct);set('nFeeFlat',SCOUT.feeFlat);set('nTow',SCOUT.tow);set('nDmv',SCOUT.dmv);set('nProfit',SCOUT.profit);
}

/* ---------------- Analyze-tab sale price ---------------- */
window.onVehicleDecoded=function(veh){
  const box=document.getElementById('valOut');if(!box||!veh)return;
  const miles=+document.getElementById('cMiles').value||0,title=document.getElementById('cTitle').value;
  const e=estimateValue({year:veh.year,make:veh.make,model:veh.model,body:veh.body,miles,title});
  if(!e.value){box.innerHTML='<p class="muted">Not enough info to estimate a sale price.</p>';return;}
  const nv=document.getElementById('nValue');
  if(!nv.value||nv.dataset.auto==='1'){nv.value=e.value;nv.dataset.auto='1';}
  const zip=(document.getElementById('zip')||{}).value||'';
  box.innerHTML=`<div class="kpi"><div>Could sell for (private)<b>${money(e.low)} – ${money(e.high)}</b><span class="muted">confidence: ${e.confidence}</span></div>
    <div>Dealer retail<b>${money(e.dealer)}</b></div><div>Wholesale / trade-in<b>${money(e.wholesale)}</b></div></div>
    <ul class="flags muted">${e.basis.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>
    <div class="row" style="margin-top:6px">${compLinks(veh,zip).map(([t,u])=>`<a class="btn ghost" style="text-decoration:none;padding:6px 10px" target="_blank" rel="noopener" href="${esc(u)}">${t}</a>`).join('')}</div>
    <p class="muted">Resale value below was filled with the estimate — replace it with a real comp price for the best numbers.</p>`;
};
['cMiles','cTitle'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{if(typeof lastVehicle!=='undefined'&&lastVehicle)window.onVehicleDecoded(lastVehicle);}));
document.getElementById('nValue').addEventListener('input',e=>{e.target.dataset.auto='0';});

/* ---------------- Settings + manual lots ---------------- */
function bindScoutControls(){
  const map={scRule:'rule',scSource:'source',scSort:'sort',scBudget:'budget',scMinProfit:'minProfit',scFeePct:'feePct',scFeeFlat:'feeFlat',scTow:'tow',scDmv:'dmv',scTax:'tax',scProfit:'profit',scWin:'winPct',scRecon:'recon'};
  Object.entries(map).forEach(([id,key])=>{
    const el=document.getElementById(id);if(!el)return;
    if(el.type==='checkbox') el.checked=!!SCOUT[key]; else el.value=SCOUT[key];
    if(el.dataset.bound)return;el.dataset.bound='1';
    el.addEventListener('input',()=>{SCOUT[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:(+el.value||0);saveScout();renderScout();});
  });
  document.getElementById('scReset').addEventListener('click',()=>{const keep={rule:SCOUT.rule,source:SCOUT.source,sort:SCOUT.sort};SCOUT=Object.assign({},SCOUT_DEFAULTS,keep);saveScout();bindScoutControls();renderScout();});
  const addBtn=document.getElementById('mlAdd');
  if(addBtn&&!addBtn.dataset.bound){addBtn.dataset.bound='1';addBtn.addEventListener('click',addManualLot);}
}
async function addManualLot(){
  const g=id=>document.getElementById(id).value.trim();
  const vin=g('mlVin').toUpperCase(),st=document.getElementById('mlStatus');
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)){st.textContent='Enter a valid 17-character VIN.';return;}
  st.textContent='Decoding VIN…';
  let d={};
  try{const j=await getJSON(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);d=(j.Results||[])[0]||{};}catch(e){}
  const off=offlineDecode(vin);
  const lot={vin,source:g('mlSource')||'My lot',date:g('mlDate')||null,where:g('mlWhere'),
    year:+(d.ModelYear||off.year)||null,make:d.Make?d.Make[0]+d.Make.slice(1).toLowerCase():off.make,model:d.Model||'',trim:d.Trim||'',body:d.BodyClass||'',
    engine:[d.DisplacementL?(+d.DisplacementL).toFixed(1)+'L':'',d.EngineCylinders?d.EngineCylinders+'-cyl':''].filter(Boolean).join(' '),
    keys:g('mlKeys'),run:g('mlRun'),title:g('mlTitle'),damage:g('mlDamage'),miles:+g('mlMiles')||0,currentBid:+g('mlBid')||0,lienholder:'',recalls:null};
  const all=manualLots().filter(x=>x.vin!==vin);all.unshift(lot);store.set('ab_scout_manual',all);
  st.textContent=`Added ${carName(lot)||vin}${d.Make?'':' (NHTSA unreachable — basic decode)'}.`;
  ['mlVin','mlMiles','mlBid','mlWhere'].forEach(id=>document.getElementById(id).value='');
  renderScout();
}

/* hooks */
const _prevNYC=window.onNYCUpdate;
window.onNYCUpdate=function(){if(_prevNYC)_prevNYC();renderScout();};
window.scoutApply=vin=>applyToCalculator(vin,null);
document.querySelector('#tabs button[data-tab="scout"]').addEventListener('click',renderScout);
bindScoutControls();renderScout();
