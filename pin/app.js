/* RoF Pins 2: Text im RoF-Design auf Stimmungsbilder für Pinterest. Alles läuft lokal im Browser, nichts wird hochgeladen. */
(function(){
"use strict";

/* ---------- Grundwerte ---------- */
const PETROL='#3E6B6A', PAPER='#F2F0EB', INK='#1a1a1a', GREY='#8a8a8a', MINT='#D3E6E4';
const F_T='"Playfair Display", Georgia, "Times New Roman", serif';
const F_S='Jost, "Helvetica Neue", Arial, sans-serif';
const F_L='"Cormorant Garamond", Garamond, Georgia, serif';
const AW=60, AH=90;                        /* Raster der Bildanalyse (2:3) */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};

const SURF={
  paper:{bg:PAPER,dark:false,name:'Papier'},
  white:{bg:'#FAFAF7',dark:false,name:'Weiß'},
  petrol:{bg:PETROL,dark:true,name:'Petrol'},
  dark:{bg:'#1B1F1E',dark:true,name:'Dunkel'}
};

/* Vorlagen: Gruppe, Name, welche Einstellungen es gibt, Standardwerte */
const TPLS=[
  {key:'pass',   group:'Papier',      name:'Passepartout', ctl:['surf','scale'],               def:{surf:'paper'}},
  {key:'band',   group:'Papier',      name:'Band',         ctl:['surf','scale','reset'],       def:{surf:'paper'}, drag:true},
  {key:'polaroid',group:'Papier',     name:'Polaroid',     ctl:['surf','scale'],               def:{surf:'white'}},
  {key:'label',  group:'Papier',      name:'Etikett',      ctl:['surf','scale','reset'],       def:{surf:'paper'}, drag:true},
  {key:'free',   group:'Auf dem Foto',name:'Freistehend',  ctl:['color','align','scale','reset'],def:{align:'left'}, drag:true},
  {key:'side',   group:'Auf dem Foto',name:'Seitlich',     ctl:['color','scale','reset'],      def:{}, drag:true},
  {key:'center', group:'Auf dem Foto',name:'Zentriert',    ctl:['color','scale','reset'],      def:{}, drag:true},
  {key:'glass',  group:'Auf dem Foto',name:'Milchglas',    ctl:['color','scale','reset'],      def:{}, drag:true},
  {key:'cover',  group:'Editorial',   name:'Magazin',      ctl:['color','scale','reset'],      def:{}, drag:true},
  {key:'arch',   group:'Editorial',   name:'Bogenfenster', ctl:['surf','scale'],               def:{surf:'paper'}},
  {key:'split',  group:'Editorial',   name:'Geteilt',      ctl:['surf','scale','reset'],       def:{surf:'petrol'}, drag:true},
  {key:'frame',  group:'Editorial',   name:'Rahmenlinie',  ctl:['color','scale','reset'],      def:{}, drag:true}
];
const TPL={}; TPLS.forEach(t=>{TPL[t.key]=t;});

const S={
  full:null, prev:null, isSample:true, imgId:0,
  crop:{x:0.5,y:0.5,z:1},
  text:{brand:'House of Thêom', name:'Heaven’s Reserve', notes:'Pflaume, Rum und Zimt', extra:'', extraPos:'top'},
  url:true, tpl:'free', size:2000, tab:'tpl',
  opt:{}
};
function resetOpt(){TPLS.forEach(t=>{S.opt[t.key]=Object.assign({color:'auto',align:'left',surf:'paper',scale:1,pos:null},t.def);});}
resetOpt();

/* ---------- Speichern der Einstellungen (nur in diesem Browser) ---------- */
const STORE='rofpins.v2';
function loadState(){
  try{
    const d=JSON.parse(localStorage.getItem(STORE)||'null'); if(!d)return;
    if(d.text)Object.keys(S.text).forEach(k=>{if(typeof d.text[k]==='string')S.text[k]=d.text[k];});
    if(typeof d.url==='boolean')S.url=d.url;
    if(d.tpl&&TPL[d.tpl])S.tpl=d.tpl;
    if(d.size===1000||d.size===2000)S.size=d.size;
    if(d.opt)Object.keys(d.opt).forEach(k=>{if(S.opt[k]){const o=d.opt[k];['color','align','surf'].forEach(p=>{if(typeof o[p]==='string')S.opt[k][p]=o[p];}); if(typeof o.scale==='number')S.opt[k].scale=clamp(o.scale,0.8,1.3);}});
  }catch(_){}
}
let saveT=0;
function saveState(){
  clearTimeout(saveT);
  saveT=setTimeout(()=>{
    try{
      const opt={}; Object.keys(S.opt).forEach(k=>{const o=S.opt[k]; opt[k]={color:o.color,align:o.align,surf:o.surf,scale:o.scale};});
      localStorage.setItem(STORE,JSON.stringify({text:S.text,url:S.url,tpl:S.tpl,size:S.size,opt}));
    }catch(_){}
  },400);
}

/* ---------- Text-Hilfen ---------- */
function spacedW(ctx,t,sp){const ch=Array.from(t);let w=0;for(const c of ch)w+=ctx.measureText(c).width;return w+sp*Math.max(0,ch.length-1);}
function drawSpaced(ctx,t,x,y,sp,align){
  const w=spacedW(ctx,t,sp); let cx=align==='center'?x-w/2:x; ctx.textAlign='left';
  for(const c of Array.from(t)){ctx.fillText(c,cx,y);cx+=ctx.measureText(c).width+sp;}
}
function wrapLines(ctx,text,maxW){
  const words=text.trim().split(/\s+/).filter(Boolean); if(!words.length)return [];
  const lines=[]; let cur=words[0];
  for(let i=1;i<words.length;i++){const t=cur+' '+words[i]; if(ctx.measureText(t).width<=maxW)cur=t; else{lines.push(cur);cur=words[i];}}
  lines.push(cur);
  if(lines.length===2){ /* zwei Zeilen möglichst gleich lang */
    let best=null;
    for(let k=1;k<words.length;k++){
      const a=words.slice(0,k).join(' '), b=words.slice(k).join(' ');
      const m=Math.max(ctx.measureText(a).width,ctx.measureText(b).width);
      if(m<=maxW&&(!best||m<best.m))best={m,l:[a,b]};
    }
    if(best)return best.l;
  }
  return lines;
}
function fitLines(ctx,text,fontFn,maxSize,minSize,maxW,maxLines){
  let size=maxSize, lines=[];
  const step=Math.max(1,maxSize/60);
  for(;;){
    ctx.font=fontFn(size); lines=wrapLines(ctx,text,maxW);
    const ok=lines.length<=maxLines&&lines.every(l=>ctx.measureText(l).width<=maxW);
    if(ok||size<=minSize)break; size=Math.max(minSize,size-step);
  }
  if(lines.length>maxLines)lines=lines.slice(0,maxLines-1).concat([lines.slice(maxLines-1).join(' ')]);
  while(size>6&&lines.some(l=>ctx.measureText(l).width>maxW)){size-=step*0.5;ctx.font=fontFn(size);}
  return {size,lines};
}
function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

/* Textblock: Zusatzzeile oben (als Rubrik), Marke, Duftname, Linie, Kernnoten, Zusatzzeile unten (als Hinweis) */
function buildBlock(ctx,s,maxW,o){
  const T=S.text, k=o.scale||1, items=[]; let w=0;
  const extra=T.extra.trim(), brand=T.brand.trim(), name=T.name.trim(), notes=T.notes.trim();
  maxW=Math.max(maxW,40*s);
  if(extra&&T.extraPos==='top'){
    const txt=extra.toUpperCase(); let sz=15*s*Math.min(k,1.15);
    for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,txt,sz*0.22)+30*s<=maxW||sz<=8*s)break; sz-=0.5*s;}
    const tw=spacedW(ctx,txt,sz*0.22), pw=tw+30*s;
    w=Math.max(w,pw);
    items.push({k:'pill',text:txt,font:`500 ${sz}px ${F_S}`,sp:sz*0.22,w:pw,h:sz+20*s,lw:1.5*s,role:'pill'});
    items.push({k:'gap',h:22*s});
  }
  if(brand){
    const txt=brand.toUpperCase(); let sz=22*s*Math.min(k,1.15);
    for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,txt,sz*0.2)<=maxW||sz<=9*s)break; sz-=0.5*s;}
    w=Math.max(w,spacedW(ctx,txt,sz*0.2));
    items.push({k:'sp',text:txt,font:`500 ${sz}px ${F_S}`,sp:sz*0.2,h:sz*1.3,role:'eyebrow'});
    items.push({k:'gap',h:18*s});
  }
  if(name){
    const f=z=>`500 ${z}px ${F_T}`;
    const r=fitLines(ctx,name,f,o.titleMax*s*k,(o.titleMin||38)*s*Math.min(k,1),maxW,o.titleLines||2);
    ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.12,h:r.size*1.12*r.lines.length,role:'title'});
  }
  if(notes){
    if(name){items.push({k:'gap',h:24*s});items.push({k:'rule',h:2*s,w:56*s,role:'rule'});items.push({k:'gap',h:22*s});}
    const f=z=>`400 ${z}px ${F_S}`;
    const r=fitLines(ctx,notes,f,(o.notesMax||30)*s*k,17*s,maxW,o.notesLines||2);
    ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.35,h:r.size*1.35*r.lines.length,role:'notes'});
  }
  if(extra&&T.extraPos==='bottom'){
    items.push({k:'gap',h:20*s});
    const f=z=>`400 ${z}px ${F_S}`;
    const r=fitLines(ctx,extra,f,21*s*k,14*s,maxW,2);
    ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.4,h:r.size*1.4*r.lines.length,role:'hint'});
  }
  while(items.length&&items[0].k==='gap')items.shift();
  while(items.length&&items[items.length-1].k==='gap')items.pop();
  return {items,h:items.reduce((a,i)=>a+i.h,0),w};
}
function drawBlock(ctx,b,x,y,align,col){
  let cy=y; ctx.textBaseline='middle';
  for(const it of b.items){
    if(it.k==='gap'){cy+=it.h;continue;}
    if(it.k==='rule'){ctx.fillStyle=col.rule;ctx.fillRect(align==='center'?x-it.w/2:x,cy,it.w,it.h);cy+=it.h;continue;}
    if(it.k==='pill'){
      const px=align==='center'?x-it.w/2:x;
      ctx.strokeStyle=col.pill; ctx.lineWidth=it.lw; rr(ctx,px+it.lw/2,cy+it.lw/2,it.w-it.lw,it.h-it.lw,it.h/2); ctx.stroke();
      ctx.fillStyle=col.pill; ctx.font=it.font; drawSpaced(ctx,it.text,px+it.w/2+it.sp/2,cy+it.h/2,it.sp,'center'); cy+=it.h; continue;
    }
    ctx.fillStyle=col[it.role]; ctx.font=it.font;
    if(it.k==='sp'){drawSpaced(ctx,it.text,x,cy+it.h/2,it.sp,align);cy+=it.h;continue;}
    ctx.textAlign=align==='center'?'center':'left';
    for(const l of it.lines){ctx.fillText(l,x,cy+it.lh/2);cy+=it.lh;}
  }
}
function brandH(s,k){k=k||1;return 24*s*k*1.2+(S.url?12*s*k+17*s*k*1.2:0);}
function brandW(ctx,s,k){k=k||1;const L=24*s*k;ctx.font=`600 ${L}px ${F_L}`;return spacedW(ctx,'REALM OF FRAGRANCE',L*0.3);}
function drawBrand(ctx,s,cx,top,col,k){
  k=k||1; ctx.textBaseline='middle'; const L=24*s*k;
  ctx.font=`600 ${L}px ${F_L}`; ctx.fillStyle=col.logo;
  drawSpaced(ctx,'REALM OF FRAGRANCE',cx+L*0.15,top+L*0.6,L*0.3,'center');
  if(S.url){const u=17*s*k; ctx.font=`400 ${u}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,'realmoffragrance.com',cx,top+L*1.2+12*s*k+u*0.6,u*0.06,'center');}
}

/* Farben */
function colsMode(mode,onPetrol){
  if(mode==='light')return {eyebrow:onPetrol?MINT:'#D3E6E4',title:'#FAFAF7',rule:onPetrol?MINT:'#D3E6E4',notes:'rgba(250,250,247,0.93)',hint:'rgba(250,250,247,0.8)',pill:'#FAFAF7',logo:'#FAFAF7',url:'rgba(250,250,247,0.82)',line:'rgba(250,250,247,0.9)'};
  return {eyebrow:PETROL,title:INK,rule:PETROL,notes:'#2E2E2C',hint:'#4a4a4a',pill:PETROL,logo:PETROL,url:'#4a4a4a',line:'rgba(26,26,26,0.75)'};
}
function colsSurf(key){
  const sf=SURF[key]||SURF.paper;
  if(sf.dark)return colsMode('light',key==='petrol');
  return Object.assign(colsMode('dark'),{url:GREY});
}

/* ---------- Foto und Ausschnitt ---------- */
function dims(src){return {w:src.naturalWidth||src.width, h:src.naturalHeight||src.height};}
function getCrop(sw,sh,a,c,z){
  const cw=Math.min(sw,sh*a)/z, ch=cw/a;
  return {sx:clamp(c.x*sw-cw/2,0,sw-cw),sy:clamp(c.y*sh-ch/2,0,sh-ch),cw,ch};
}
function drawPhoto(ctx,src,r){
  const d=dims(src), c=getCrop(d.w,d.h,r.w/r.h,S.crop,S.crop.z);
  ctx.drawImage(src,c.sx,c.sy,c.cw,c.ch,r.x,r.y,r.w,r.h); return c;
}
function normCrop(a){ /* Mitte so setzen, dass der Ausschnitt im Bild bleibt */
  if(!S.prev)return; const d=dims(S.prev), c=getCrop(d.w,d.h,a,S.crop,S.crop.z);
  S.crop.x=(c.sx+c.cw/2)/d.w; S.crop.y=(c.sy+c.ch/2)/d.h;
}
function cropKey(){return S.imgId+':'+S.crop.x.toFixed(4)+':'+S.crop.y.toFixed(4)+':'+S.crop.z.toFixed(4);}

/* Weichgezeichnetes Foto (für Milchglas und Polaroid), mehrstufig verkleinert und vergrößert */
const BLUR={key:'',cv:null};
function blurred(src,W,H){
  const key=cropKey()+'|'+Math.round(W)+'|'+(src===S.full?'f':'p');
  if(BLUR.key===key)return BLUR.cv;
  const a=mk(Math.max(30,W/8),Math.max(45,H/8)); const ax=a.getContext('2d'); ax.imageSmoothingQuality='high';
  drawPhoto(ax,src,{x:0,y:0,w:a.width,h:a.height});
  const b=mk(Math.max(10,W/40),Math.max(15,H/40)); const bx=b.getContext('2d'); bx.imageSmoothingQuality='high'; bx.drawImage(a,0,0,b.width,b.height);
  const c=mk(a.width,a.height); const cx=c.getContext('2d'); cx.imageSmoothingQuality='high'; cx.drawImage(b,0,0,c.width,c.height);
  const d=mk(Math.max(10,W/28),Math.max(15,H/28)); d.getContext('2d').drawImage(c,0,0,d.width,d.height);
  const e=mk(Math.max(40,W/4),Math.max(60,H/4)); const ex=e.getContext('2d'); ex.imageSmoothingQuality='high'; ex.drawImage(d,0,0,e.width,e.height);
  BLUR.key=key; BLUR.cv=e; return e;
}

/* ---------- Bildanalyse: Helligkeit und Unruhe im Raster ---------- */
let AN=null, anKey='';
function analyze(){
  if(!S.prev)return; const key=cropKey(); if(AN&&key===anKey)return;
  const c=mk(AW,AH), x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high';
  drawPhoto(x,S.prev,{x:0,y:0,w:AW,h:AH});
  const d=x.getImageData(0,0,AW,AH).data, vp=new Float32Array(AW*AH), g=new Float32Array(AW*AH);
  for(let i=0;i<AW*AH;i++)vp[i]=(0.2126*d[4*i]+0.7152*d[4*i+1]+0.0722*d[4*i+2])/255;
  let gs=0;
  for(let yy=0;yy<AH;yy++)for(let xx=0;xx<AW;xx++){
    const i=yy*AW+xx, r=xx<AW-1?Math.abs(vp[i]-vp[i+1]):0, b=yy<AH-1?Math.abs(vp[i]-vp[i+AW]):0;
    g[i]=r+b; gs+=g[i];
  }
  AN={vp,g,gMean:Math.max(gs/(AW*AH),0.01)}; anKey=key;
}
/* Werte einer Fläche, mit anteiliger Gewichtung der Randzellen: ändert sich stufenlos beim Verschieben */
function stats(r,W,H){
  if(!AN)return {v:0.3,sd:0.1,busy:1};
  const x0=clamp(r.x/W*AW,0,AW), x1=clamp((r.x+r.w)/W*AW,0,AW), y0=clamp(r.y/H*AH,0,AH), y1=clamp((r.y+r.h)/H*AH,0,AH);
  if(x1-x0<1e-3||y1-y0<1e-3)return {v:0.3,sd:0.1,busy:1};
  let s=0,sq=0,gs=0,n=0;
  for(let iy=Math.floor(y0);iy<Math.ceil(y1);iy++){
    const wy=Math.min(iy+1,y1)-Math.max(iy,y0); if(wy<=0)continue;
    for(let ix=Math.floor(x0);ix<Math.ceil(x1);ix++){
      const wx=Math.min(ix+1,x1)-Math.max(ix,x0); if(wx<=0)continue;
      const w=wx*wy, i=iy*AW+ix; s+=AN.vp[i]*w; sq+=AN.vp[i]*AN.vp[i]*w; gs+=AN.g[i]*w; n+=w;
    }
  }
  const m=s/n; return {v:m,sd:Math.sqrt(Math.max(0,sq/n-m*m)),busy:(gs/n)/AN.gMean};
}
function busyScore(r,W,H){const st=stats(r,W,H);return st.busy+st.sd*3;}

/* Kontrast nach WCAG */
function toLin(v){return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
function contrastV(a,b){const A=toLin(a),B=toLin(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);}
const TV={light:0.97,dark:0.11}, SV={light:0.04,dark:0.955};
/* Nötige Deckkraft des Schattens, stufenlos per Halbierungssuche */
function need(st,mode,minA){
  const worst=mode==='light'?Math.min(1,st.v+1.1*st.sd):Math.max(0,st.v-1.1*st.sd);
  const cAt=a=>contrastV(TV[mode],worst*(1-a)+SV[mode]*a);
  let a=0;
  if(cAt(0)<4.6){let lo=0,hi=0.9;for(let i=0;i<18;i++){const m=(lo+hi)/2;if(cAt(m)>=4.6)hi=m;else lo=m;}a=hi;}
  a=Math.min(0.9,Math.max(a+clamp((st.busy-1.2)*0.05,0,0.1),minA||0));
  return {a,c:cAt(a)};
}
/* Helle oder dunkle Schrift; mit Trägheit, damit sie beim Verschieben nicht hin und her springt */
const MODE={};
function decideMode(key,st,pref,env){
  if(pref==='light'||pref==='dark')return pref;
  const L=need(st,'light',0).a, D=need(st,'dark',0).a;
  let best=L<=D+0.03?'light':'dark';
  if(env.kind==='thumb')return best;
  if(env.kind==='export')return MODE[key]||best;
  const prev=MODE[key];
  if(prev&&DRAG)return prev;
  if(prev&&prev!==best){const pa=prev==='light'?L:D; if(pa-Math.min(L,D)<0.14&&pa<0.85)best=prev;}
  MODE[key]=best; return best;
}

/* ---------- Weiche Schatten hinter dem Text ---------- */
let needMore=false;
const SCR={};
const RGB={light:'8,10,10',dark:'246,245,240'};
function bandA(p,b,al){
  if(p>=b.from&&p<=b.to)return al;
  const d=p<b.from?b.from-p:p-b.to; if(d>=b.fade)return 0;
  return al*sstep(1-d/b.fade);
}
function paintLinear(ctx,W,H,spec,mode,al){
  const L=spec.axis==='x'?W:H, N=72;
  const g=spec.axis==='x'?ctx.createLinearGradient(0,0,W,0):ctx.createLinearGradient(0,0,0,H);
  for(let i=0;i<=N;i++){
    const p=i/N*L; let a=0; spec.bands.forEach((b,j)=>{a=Math.max(a,bandA(p,b,al[j]));});
    g.addColorStop(i/N,`rgba(${RGB[mode]},${a.toFixed(4)})`);
  }
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
function paintRadial(ctx,W,H,spec,mode,al){
  const a=al[0]; if(a<=0.001)return;
  ctx.save(); ctx.translate(spec.cx,spec.cy); ctx.scale(1,spec.ry/spec.rx);
  const g=ctx.createRadialGradient(0,0,0,0,0,spec.rx), core=0.5;
  g.addColorStop(0,`rgba(${RGB[mode]},${a.toFixed(4)})`); g.addColorStop(core,`rgba(${RGB[mode]},${a.toFixed(4)})`);
  for(let i=1;i<=24;i++){const t=i/24; g.addColorStop(core+(1-core)*t,`rgba(${RGB[mode]},${(a*sstep(1-t)).toFixed(4)})`);}
  ctx.fillStyle=g; const k=spec.rx/spec.ry; ctx.fillRect(-W*2,-H*2*k,W*4,H*4*k); ctx.restore();
}
/* In der Vorschau gleitet die Deckkraft weich zum Zielwert; ein Wechsel hell/dunkel wird überblendet */
function scrim(ctx,W,H,spec,env){
  const paint=(m,al)=>spec.type==='radial'?paintRadial(ctx,W,H,spec,m,al):paintLinear(ctx,W,H,spec,m,al);
  const tgt=spec.bands.map(b=>b.a);
  if(env.kind!=='main'){paint(spec.mode,tgt);return;}
  let st=SCR[spec.key];
  if(!st||st.n!==tgt.length){st=SCR[spec.key]={mode:spec.mode,al:tgt.slice(),old:null,n:tgt.length};}
  if(st.mode!==spec.mode){st.old={mode:st.mode,al:st.al.slice()};st.mode=spec.mode;st.al=tgt.map(()=>0);}
  st.al=st.al.map((a,i)=>{const t=tgt[i],n=lerp(a,t,0.3);if(Math.abs(n-t)<0.003)return t;needMore=true;return n;});
  if(st.old){st.old.al=st.old.al.map(a=>a*0.7);if(Math.max.apply(null,st.old.al)<0.004)st.old=null;else{needMore=true;paint(st.old.mode,st.old.al);}}
  paint(st.mode,st.al);
}
const SMV={};
function smoothVal(key,t,env){
  if(env.kind!=='main')return t;
  const v=SMV[key]; if(v==null){SMV[key]=t;return t;}
  const n=lerp(v,t,0.3); if(Math.abs(n-t)<0.003){SMV[key]=t;return t;} needMore=true; SMV[key]=n; return n;
}

/* Gemeinsame Teile */
function anchorOf(o){return o.pos||null;}
function snapX(env,x,target,tol,W){if(env.drag&&Math.abs(x-target)<tol){env.guides.push({v:target/W});return target;}return x;}
function photoBrand(ctx,W,H,s,mode,env,key,minA){
  const bh=brandH(s), top=H-56*s-bh, st=stats({x:W/2-250*s,y:top,w:500*s,h:bh},W,H);
  return {top,band:{from:top-16*s,to:H,fade:220*s,a:need(st,mode,minA==null?0.05:minA).a,c:need(st,mode,minA==null?0.05:minA).c}};
}

/* ---------- Die 12 Vorlagen ---------- */
const R={
  /* Papier */
  pass(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.pass, sf=SURF[o.surf]||SURF.paper, col=colsSurf(o.surf);
    ctx.fillStyle=sf.bg; ctx.fillRect(0,0,W,H);
    const m=56*s, b=buildBlock(ctx,s,W-2*m-80*s,{titleMax:80,titleLines:2,notesLines:2,scale:o.scale});
    const brandTop=H-m-brandH(s);
    let ph=brandTop-48*s-b.h-58*s-m; ph=clamp(ph,H*0.45,H*0.72);
    const pr={x:m,y:m,w:W-2*m,h:ph}; drawPhoto(ctx,src,pr);
    const areaTop=m+ph, ty=areaTop+Math.max(24*s,(brandTop-areaTop-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',col); drawBrand(ctx,s,W/2,brandTop,col);
    return {photo:pr,text:null,c:21};
  },
  band(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.band, sf=SURF[o.surf]||SURF.paper, col=colsSurf(o.surf);
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const padX=88*s, pad=60*s, bh=brandH(s);
    const b=buildBlock(ctx,s,W-2*padX,{titleMax:84,titleLines:2,notesLines:2,scale:o.scale});
    const gapB=b.h?40*s:0, hB=pad+b.h+gapB+bh+pad*0.85;
    let y;
    const a=anchorOf(o);
    if(a)y=a.y*H; else y=busyScore({x:0,y:0,w:W,h:hB},W,H)<=busyScore({x:0,y:H-hB,w:W,h:hB},W,H)?0:H-hB;
    y=clamp(y,0,H-hB);
    const snap=0.03*H;
    if(y<snap)y=0; if(H-hB-y<snap)y=H-hB;
    if(y>0&&y<H-hB){ctx.save();ctx.shadowColor='rgba(0,0,0,0.22)';ctx.shadowBlur=26*s;ctx.shadowOffsetY=6*s;ctx.fillStyle=sf.bg;ctx.fillRect(0,y,W,hB);ctx.restore();}
    ctx.fillStyle=sf.bg; ctx.fillRect(0,y,W,hB);
    drawBlock(ctx,b,W/2,y+pad,'center',col);
    drawBrand(ctx,s,W/2,y+pad+b.h+gapB,col);
    return {photo:pr,text:{rect:{x:0,y,w:W,h:hB},anchor:{x:0,y:y/H},axis:'y'},c:21};
  },
  polaroid(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.polaroid, sf=SURF[o.surf]||SURF.white, col=colsSurf(o.surf);
    ctx.drawImage(blurred(src,W,H),0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.30)'; ctx.fillRect(0,0,W,H);
    const cw=W*0.8, pm=36*s, pw=cw-2*pm, bh=brandH(s);
    const b=buildBlock(ctx,s,pw-30*s,{titleMax:66,titleLines:2,notesLines:2,notesMax:26,scale:o.scale});
    const textH=(b.h?34*s+b.h:0)+50*s;
    let ph=Math.min(pw*1.04,H-2*44*s-pm-textH-50*s-bh);
    ph=Math.max(ph,H*0.3);
    const cardH=pm+ph+textH, total=cardH+50*s+bh;
    const top=Math.max(36*s,(H-total)/2), left=(W-cw)/2;
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.38)'; ctx.shadowBlur=46*s; ctx.shadowOffsetY=14*s;
    ctx.fillStyle=sf.bg; ctx.fillRect(left,top,cw,cardH); ctx.restore();
    ctx.fillStyle=sf.bg; ctx.fillRect(left,top,cw,cardH);
    const pr={x:left+pm,y:top+pm,w:pw,h:ph}; drawPhoto(ctx,src,pr);
    drawBlock(ctx,b,W/2,top+pm+ph+34*s,'center',col);
    const btop=top+cardH+50*s;
    const st=stats({x:W/2-250*s,y:btop,w:500*s,h:bh},W,H); const dim={v:st.v*0.7,sd:0,busy:1};
    const n=need(dim,'light',0.05);
    scrim(ctx,W,H,{key:'polB',axis:'y',mode:'light',bands:[{from:btop-10*s,to:H,fade:160*s,a:n.a}]},env);
    drawBrand(ctx,s,W/2,btop,colsMode('light'));
    return {photo:pr,text:null,c:n.c};
  },
  label(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.label, sf=SURF[o.surf]||SURF.paper, col=colsSurf(o.surf);
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const pad=46*s, bk=0.8, bh=brandH(s,bk), lw=brandW(ctx,s,bk);
    const b=buildBlock(ctx,s,W*0.64,{titleMax:70,titleLines:2,notesLines:2,notesMax:26,scale:o.scale});
    const cw=Math.max(b.w,lw,300*s)+2*pad, gap=b.h?32*s:0, ch=pad+b.h+gap+bh+pad*0.85, m=44*s;
    let x,y; const a=anchorOf(o);
    if(a){x=a.x*W;y=a.y*H;}
    else{
      const cands=[[(W-cw)/2,H-m-ch-20*s],[(W-cw)/2,m+20*s],[m+16*s,H-m-ch-20*s],[W-m-16*s-cw,H-m-ch-20*s],[m+16*s,m+20*s]];
      let best=null; cands.forEach(c=>{const sc=busyScore({x:c[0],y:c[1],w:cw,h:ch},W,H); if(!best||sc<best.sc-0.02)best={sc,c};});
      x=best.c[0]; y=best.c[1];
    }
    x=clamp(x,m*0.5,W-m*0.5-cw); y=clamp(y,m*0.5,H-m*0.5-ch);
    x=snapX(env,x+cw/2,W/2,14*s,W)-cw/2;
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.25)'; ctx.shadowBlur=30*s; ctx.shadowOffsetY=8*s;
    ctx.fillStyle=sf.bg; rr(ctx,x,y,cw,ch,6*s); ctx.fill(); ctx.restore();
    ctx.fillStyle=sf.bg; rr(ctx,x,y,cw,ch,6*s); ctx.fill();
    drawBlock(ctx,b,x+cw/2,y+pad,'center',col);
    drawBrand(ctx,s,x+cw/2,y+pad+b.h+gap,col,bk);
    return {photo:pr,text:{rect:{x,y,w:cw,h:ch},anchor:{x:x/W,y:y/H},axis:'xy'},c:21};
  },

  /* Auf dem Foto */
  free(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.free, center=o.align==='center';
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const m=72*s, bh=brandH(s), brandTop=H-56*s-bh;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:100,titleLines:2,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1);
    const minY=m*0.7, maxY=Math.max(minY,brandTop-56*s-bhh);
    const a=anchorOf(o); let x,y;
    if(a&&a.y!=null)y=a.y*H;
    else{const ww=Math.max(bw,W*0.4); y=busyScore({x:center?(W-ww)/2:m,y:m+10*s,w:ww,h:bhh},W,H)<=busyScore({x:center?(W-ww)/2:m,y:maxY,w:ww,h:bhh},W,H)?m+10*s:maxY;}
    x=(a&&a.x!=null)?a.x*W:(center?(W-bw)/2:m);
    x=clamp(x,m*0.5,Math.max(m*0.5,W-m*0.5-bw)); y=clamp(y,minY,maxY);
    if(center)x=snapX(env,x+bw/2,W/2,14*s,W)-bw/2; else x=snapX(env,x,m,14*s,W);
    const rect={x,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('free',st,o.color,env), t=need(st,mode,0.1), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'free',axis:'y',mode,bands:[{from:y-24*s,to:y+bhh+24*s,fade:290*s,a:t.a},br.band]},env);
    const col=colsMode(mode);
    drawBlock(ctx,b,center?x+bw/2:x,y,center?'center':'left',col);
    drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'xy'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  side(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.side;
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const m=64*s, bh=brandH(s), brandTop=H-56*s-bh, maxBot=brandTop-48*s, L=maxBot-m;
    const b=buildBlock(ctx,s,L,{titleMax:124,titleMin:44,titleLines:1,notesLines:1,scale:o.scale});
    const len=Math.max(b.w,1), th=Math.max(b.h,1);
    const a=anchorOf(o); let x,bot;
    if(a){x=a.x*W;bot=a.y*H;}
    else{bot=maxBot; x=busyScore({x:m,y:bot-len,w:th,h:len},W,H)<=busyScore({x:W-m-th,y:bot-len,w:th,h:len},W,H)?m:W-m-th;}
    x=clamp(x,m*0.5,W-m*0.5-th); bot=clamp(bot,Math.min(maxBot,m*0.7+len),maxBot);
    const rect={x,y:bot-len,w:th,h:len}, st=stats(rect,W,H);
    const mode=decideMode('side',st,o.color,env), t=need(st,mode,0.1), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'sideT',axis:'x',mode,bands:[{from:x-24*s,to:x+th+24*s,fade:260*s,a:t.a}]},env);
    scrim(ctx,W,H,{key:'sideB',axis:'y',mode,bands:[br.band]},env);
    const col=colsMode(mode);
    ctx.save(); ctx.translate(x,bot); ctx.rotate(-Math.PI/2); drawBlock(ctx,b,0,0,'left',col); ctx.restore();
    drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:bot/H},axis:'xy'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  center(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.center;
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const m=90*s, bh=brandH(s), brandTop=H-56*s-bh;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:134,titleMin:48,titleLines:3,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=m*0.6, maxY=Math.max(minY,brandTop-80*s-bhh);
    const a=anchorOf(o); let y;
    if(a)y=a.y*H;
    else{let best=null;[minY+30*s,H*0.42-bhh/2,maxY].forEach(c=>{const yy=clamp(c,minY,maxY),sc=busyScore({x,y:yy,w:bw,h:bhh},W,H);if(!best||sc<best.sc-0.03)best={sc,yy};});y=best.yy;}
    y=clamp(y,minY,maxY);
    if(env.drag&&Math.abs(y+bhh/2-H/2)<14*s){y=H/2-bhh/2;env.guides.push({h:0.5});}
    const rect={x,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('center',st,o.color,env), t=need(st,mode,0.12), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'centerR',type:'radial',cx:W/2,cy:y+bhh/2,rx:Math.max(bw*1.05,W*0.62),ry:bhh*1.05+220*s,mode,bands:[{a:t.a}]},env);
    scrim(ctx,W,H,{key:'centerB',axis:'y',mode,bands:[br.band]},env);
    const col=colsMode(mode);
    drawBlock(ctx,b,W/2,y,'center',col); drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  glass(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.glass;
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const m=48*s, pad=50*s, bh=brandH(s), brandTop=H-56*s-bh;
    const b=buildBlock(ctx,s,W-2*m-2*pad,{titleMax:88,titleLines:2,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,380*s)+2*pad, bhh=Math.max(b.h,1)+2*pad;
    const minY=m*0.6, maxY=Math.max(minY,brandTop-40*s-bhh);
    const a=anchorOf(o); let x,y;
    if(a){x=a.x*W;y=a.y*H;}
    else{x=(W-bw)/2; y=busyScore({x,y:m+10*s,w:bw,h:bhh},W,H)<=busyScore({x,y:maxY,w:bw,h:bhh},W,H)?m+10*s:maxY;}
    x=clamp(x,m*0.5,W-m*0.5-bw); y=clamp(y,minY,maxY);
    x=snapX(env,x+bw/2,W/2,14*s,W)-bw/2;
    const rect={x,y,w:bw,h:bhh}, raw=stats(rect,W,H), st={v:raw.v,sd:raw.sd*0.3,busy:1};
    const mode=decideMode('glass',st,o.color,env), t=need(st,mode,0.2), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'glassB',axis:'y',mode,bands:[br.band]},env);
    const ta=smoothVal('glassT:'+mode,t.a,env);
    ctx.save(); rr(ctx,x,y,bw,bhh,18*s); ctx.clip();
    ctx.drawImage(blurred(src,W,H),0,0,W,H);
    ctx.fillStyle=`rgba(${RGB[mode]},${ta.toFixed(4)})`; ctx.fillRect(x,y,bw,bhh); ctx.restore();
    ctx.strokeStyle=mode==='light'?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.6)'; ctx.lineWidth=1.5*s;
    rr(ctx,x+0.75*s,y+0.75*s,bw-1.5*s,bhh-1.5*s,18*s); ctx.stroke();
    const col=colsMode(mode);
    drawBlock(ctx,b,x+bw/2,y+pad,'center',col); drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'xy'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },

  /* Editorial */
  cover(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.cover;
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const m=64*s, mt='REALM OF FRAGRANCE';
    let ms=70*s; for(;;){ctx.font=`600 ${ms}px ${F_L}`; if(spacedW(ctx,mt,ms*0.16)<=W-2*m||ms<=20*s)break; ms-=1*s;}
    const mTop=58*s, mH=ms*1.0, ruleY=mTop+mH+14*s, uS=16*s, mBot=ruleY+(S.url?18*s+uS:4*s);
    const b=buildBlock(ctx,s,W-2*m,{titleMax:116,titleMin:50,titleLines:3,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1);
    const minY=mBot+70*s, maxY=Math.max(minY,H-72*s-bhh);
    const a=anchorOf(o); let y;
    if(a)y=a.y*H; else y=busyScore({x:m,y:maxY,w:Math.max(bw,W*0.5),h:bhh},W,H)<=busyScore({x:m,y:H*0.5,w:Math.max(bw,W*0.5),h:bhh},W,H)+0.15?maxY:H*0.5;
    y=clamp(y,minY,maxY);
    const rect={x:m,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('cover',st,o.color,env), t=need(st,mode,0.1);
    const mst=stats({x:m,y:mTop,w:W-2*m,h:mBot-mTop},W,H), mn=need(mst,mode,0.08);
    scrim(ctx,W,H,{key:'cover',axis:'y',mode,bands:[{from:0,to:mBot+10*s,fade:220*s,a:mn.a},{from:y-24*s,to:y+bhh+24*s,fade:290*s,a:t.a}]},env);
    const col=colsMode(mode);
    ctx.textBaseline='middle'; ctx.font=`600 ${ms}px ${F_L}`; ctx.fillStyle=col.title;
    drawSpaced(ctx,mt,W/2+ms*0.08,mTop+mH/2,ms*0.16,'center');
    ctx.fillStyle=col.rule; ctx.fillRect(m,ruleY,W-2*m,1.5*s);
    if(S.url){ctx.font=`400 ${uS}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,'realmoffragrance.com',W/2,ruleY+18*s+uS*0.5,uS*0.12,'center');}
    drawBlock(ctx,b,m,y,'left',col);
    return {photo:pr,text:{rect,anchor:{x:m/W,y:y/H},axis:'y'},c:Math.min(t.c,mn.c),onPhoto:true};
  },
  arch(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.arch, sf=SURF[o.surf]||SURF.paper, col=colsSurf(o.surf);
    ctx.fillStyle=sf.bg; ctx.fillRect(0,0,W,H);
    const m=120*s, aw=W-2*m, top=104*s, bh=brandH(s), brandTop=H-64*s-bh;
    const b=buildBlock(ctx,s,W-2*80*s,{titleMax:80,titleLines:2,notesLines:2,scale:o.scale});
    let ah=brandTop-56*s-b.h-60*s-top; ah=clamp(ah,H*0.42,H*0.6);
    const r=aw/2;
    const path=(ctx,x,y,w,h,rad)=>{ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+rad);ctx.arc(x+rad,y+rad,rad,Math.PI,0);ctx.lineTo(x+w,y+h);ctx.closePath();};
    const pr={x:m,y:top,w:aw,h:ah};
    ctx.save(); path(ctx,m,top,aw,ah,r); ctx.clip(); drawPhoto(ctx,src,pr); ctx.restore();
    const off=16*s; ctx.strokeStyle=sf.dark?'rgba(211,230,228,0.5)':'rgba(62,107,106,0.5)'; ctx.lineWidth=1.5*s;
    path(ctx,m-off,top-off,aw+2*off,ah+off*2,r+off); ctx.stroke();
    const areaTop=top+ah+off, ty=areaTop+Math.max(30*s,(brandTop-areaTop-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',col); drawBrand(ctx,s,W/2,brandTop,col);
    return {photo:pr,text:null,c:21};
  },
  split(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.split, sf=SURF[o.surf]||SURF.petrol, col=colsSurf(o.surf);
    const pad=58*s, bh=brandH(s);
    const b=buildBlock(ctx,s,W-2*90*s,{titleMax:88,titleLines:2,notesLines:2,scale:o.scale});
    const gapB=b.h?46*s:0, needH=pad+b.h+gapB+bh+pad*0.85;
    const maxPh=H-needH, minPh=Math.min(maxPh,H*0.45);
    const a=anchorOf(o); let ph=a?a.y*H:clamp(H-needH-90*s,H*0.5,H*0.7);
    ph=clamp(ph,minPh,maxPh);
    if(env.drag&&Math.abs(ph-H*2/3)<14*s&&H*2/3<=maxPh){ph=H*2/3;env.guides.push({h:2/3});}
    const pr={x:0,y:0,w:W,h:ph}; drawPhoto(ctx,src,pr);
    ctx.fillStyle=sf.bg; ctx.fillRect(0,ph,W,H-ph);
    const brandTop=H-pad*0.85-bh, avail=brandTop-gapB-ph;
    const ty=ph+Math.max(pad*0.8,(avail-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',col); drawBrand(ctx,s,W/2,brandTop,col);
    return {photo:pr,text:{rect:{x:0,y:ph,w:W,h:H-ph},anchor:{x:0,y:ph/H},axis:'y'},c:21};
  },
  frame(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.frame;
    const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr);
    const fm=46*s, L=22*s, lw=brandW(ctx,s,22/24), uS=15*s;
    const b=buildBlock(ctx,s,W-2*(fm+70*s),{titleMax:96,titleLines:2,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=fm+90*s, maxY=Math.max(minY,H-fm-80*s-bhh);
    const a=anchorOf(o); let y;
    if(a)y=a.y*H; else y=busyScore({x,y:maxY,w:bw,h:bhh},W,H)<=busyScore({x,y:minY+40*s,w:bw,h:bhh},W,H)+0.1?maxY:minY+40*s;
    y=clamp(y,minY,maxY);
    if(env.drag&&Math.abs(y+bhh/2-H/2)<14*s){y=H/2-bhh/2;env.guides.push({h:0.5});}
    const rect={x,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('frame',st,o.color,env), t=need(st,mode,0.1);
    const tst=stats({x:W/2-lw/2-20*s,y:fm-L,w:lw+40*s,h:2*L},W,H), tn=need(tst,mode,0.12);
    const bands=[{from:0,to:fm+L,fade:170*s,a:tn.a},{from:y-24*s,to:y+bhh+24*s,fade:280*s,a:t.a}];
    let cMin=Math.min(t.c,tn.c);
    if(S.url){const ust=stats({x:W/2-160*s,y:H-fm-uS,w:320*s,h:2*uS},W,H), un=need(ust,mode,0.1); bands.push({from:H-fm-uS*1.5,to:H,fade:150*s,a:un.a}); cMin=Math.min(cMin,un.c);}
    scrim(ctx,W,H,{key:'frame',axis:'y',mode,bands},env);
    const col=colsMode(mode);
    /* Linie mit Lücken für Logo und Adresse */
    ctx.strokeStyle=col.line; ctx.lineWidth=2*s; const g1=lw/2+26*s;
    ctx.beginPath();
    ctx.moveTo(W/2-g1,fm); ctx.lineTo(fm,fm); ctx.lineTo(fm,H-fm);
    if(S.url){ctx.font=`400 ${uS}px ${F_S}`; const uw=spacedW(ctx,'realmoffragrance.com',uS*0.08)/2+22*s; ctx.lineTo(W/2-uw,H-fm); ctx.moveTo(W/2+uw,H-fm);}
    ctx.lineTo(W-fm,H-fm); ctx.lineTo(W-fm,fm); ctx.lineTo(W/2+g1,fm); ctx.stroke();
    ctx.textBaseline='middle'; ctx.font=`600 ${L}px ${F_L}`; ctx.fillStyle=col.logo; drawSpaced(ctx,'REALM OF FRAGRANCE',W/2+L*0.15,fm,L*0.3,'center');
    if(S.url){ctx.font=`400 ${uS}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,'realmoffragrance.com',W/2,H-fm,uS*0.08,'center');}
    drawBlock(ctx,b,W/2,y,'center',col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:cMin,onPhoto:true};
  }
};

/* ---------- Vorschau ---------- */
const mainCv=$('main');
let LAST=null, DRAG=null, raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;renderMain();});}
function renderMain(){
  if(!S.prev)return;
  needMore=false; analyze();
  const W=mainCv.width, H=mainCv.height, ctx=mainCv.getContext('2d');
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.clearRect(0,0,W,H);
  const env={kind:'main',drag:!!(DRAG&&DRAG.type==='text'),guides:[]};
  const r=R[S.tpl](ctx,W,H,S.prev,env); LAST={r,W,H};
  /* Stößt der Text an den Rand, rückt der Bezugspunkt mit: Zurückziehen wirkt sofort, ohne toten Bereich */
  if(env.drag&&r.text&&DRAG&&DRAG.type==='text'){
    const o=S.opt[S.tpl], u=W/1000;
    if(o.pos){
      const ex=(r.text.anchor.x-o.pos.x)*W, ey=(r.text.anchor.y-o.pos.y)*H;
      if(Math.abs(ex)>16*u){DRAG.a0.x+=ex/W;o.pos.x=r.text.anchor.x;}
      if(Math.abs(ey)>16*u){DRAG.a0.y+=ey/H;o.pos.y=r.text.anchor.y;}
    }
  }
  if(env.drag&&r.text){
    const k=W/1000; ctx.save(); ctx.strokeStyle='rgba(134,181,178,0.95)'; ctx.lineWidth=2*k; ctx.setLineDash([10*k,8*k]);
    const t=r.text.rect; if(S.tpl==='band'||S.tpl==='split')ctx.strokeRect(t.x+k,t.y+k,t.w-2*k,t.h-2*k); else{rr(ctx,t.x-12*k,t.y-12*k,t.w+24*k,t.h+24*k,8*k);ctx.stroke();}
    ctx.setLineDash([]); ctx.strokeStyle='rgba(134,181,178,0.9)'; ctx.lineWidth=1.5*k;
    env.guides.forEach(g=>{ctx.beginPath(); if(g.v!=null){ctx.moveTo(g.v*W,0);ctx.lineTo(g.v*W,H);} else {ctx.moveTo(0,g.h*H);ctx.lineTo(W,g.h*H);} ctx.stroke();});
    ctx.restore();
  }
  const chip=$('chip');
  if(r.c>=4.5){chip.className='chip';chip.textContent='Gut lesbar';}
  else{chip.className='chip bad';chip.textContent=r.onPhoto?'Kontrast knapp: Schrift oder Position ändern':'Kontrast knapp';}
  if(needMore)schedule();
}
function layout(){
  const st=$('stage').getBoundingClientRect(), pad=12;
  let h=st.height-2*pad, w=h/1.5;
  if(w>st.width-2*pad){w=st.width-2*pad;h=w*1.5;}
  w=Math.max(60,Math.floor(w)); h=Math.floor(w*1.5);
  mainCv.style.width=w+'px'; mainCv.style.height=h+'px';
  const dpr=Math.min(window.devicePixelRatio||1,2), W=Math.round(Math.min(w*dpr,1500)), H=Math.round(W*1.5);
  if(mainCv.width!==W||mainCv.height!==H){mainCv.width=W;mainCv.height=H;}
  schedule();
}

/* ---------- Vorlagen-Leiste ---------- */
const thumbs={};
function buildTemplates(){
  const box=$('tpls'); let grp=null, row=null;
  TPLS.forEach(t=>{
    if(!grp||grp.dataset.g!==t.group){
      grp=document.createElement('div'); grp.className='tgroup'; grp.dataset.g=t.group;
      const l=document.createElement('span'); l.className='glabel'; l.textContent=t.group;
      row=document.createElement('div'); row.className='trow'; grp.append(l,row); box.append(grp);
    }
    const b=document.createElement('button'); b.type='button'; b.className='tb'; b.setAttribute('aria-pressed',String(S.tpl===t.key));
    const cv=document.createElement('canvas'); cv.setAttribute('aria-hidden','true');
    const nm=document.createElement('span'); nm.textContent=t.name;
    b.append(cv,nm); row.append(b);
    b.addEventListener('click',()=>selectTpl(t.key));
    thumbs[t.key]={btn:b,cv};
  });
}
function selectTpl(key){
  S.tpl=key; Object.keys(thumbs).forEach(k=>thumbs[k].btn.setAttribute('aria-pressed',String(k===key)));
  const t=TPL[key]; if(t.drag&&S.opt[key].pos==null)showHint();
  buildStyle(); schedule(); saveState();
}
let thumbT=0, thumbPending=false;
function schedThumbs(){
  clearTimeout(thumbT);
  thumbT=setTimeout(()=>{ if(DRAG){thumbPending=true;return;} renderThumbs(); },160);
}
function renderThumbs(){
  if(!S.prev||$('tpls').closest('[data-pane]').hidden){thumbPending=true;return;}
  thumbPending=false; analyze();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  TPLS.forEach(t=>{
    const cv=thumbs[t.key].cv, w=cv.getBoundingClientRect().width||86;
    const W=Math.round(Math.min(w*dpr,320)), H=Math.round(W*1.5);
    if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    const ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.clearRect(0,0,W,H);
    R[t.key](ctx,W,H,S.prev,{kind:'thumb',drag:false,guides:[]});
  });
}

/* ---------- Stil-Bereich ---------- */
function seg(parent,label,options,get,set,inline){
  const g=document.createElement('div'); g.className='ctl'+(inline?' inline':'');
  const lb=document.createElement('span'); lb.className='lbl'; lb.textContent=label;
  const sg=document.createElement('div'); sg.className='seg'; sg.setAttribute('role','group'); sg.setAttribute('aria-label',label);
  options.forEach(([val,txt])=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=txt; b.setAttribute('aria-pressed',String(get()===val));
    b.addEventListener('click',()=>{set(val); sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); changed();});
    sg.append(b);
  });
  g.append(lb,sg); parent.append(g); return sg;
}
function buildStyle(){
  const box=$('styleBox'); box.textContent='';
  const t=TPL[S.tpl], o=S.opt[S.tpl];
  if(t.ctl.includes('surf'))seg(box,'Fläche',Object.keys(SURF).map(k=>[k,SURF[k].name]),()=>o.surf,v=>{o.surf=v;},true);
  if(t.ctl.includes('color'))seg(box,'Schrift',[['auto','Auto'],['light','Hell'],['dark','Dunkel']],()=>o.color,v=>{o.color=v;},true);
  if(t.ctl.includes('align'))seg(box,'Ausrichtung',[['left','Links'],['center','Mitte']],()=>o.align,v=>{o.align=v; if(o.pos)o.pos.x=null;},true);
  if(t.ctl.includes('scale')){
    const g=document.createElement('div'); g.className='ctl inline';
    const lb=document.createElement('label'); lb.className='lbl'; lb.textContent='Textgröße'; lb.htmlFor='scale';
    const wr=document.createElement('div'); wr.className='range';
    const r=document.createElement('input'); r.type='range'; r.id='scale'; r.min='0.8'; r.max='1.3'; r.step='0.01'; r.value=String(o.scale);
    const out=document.createElement('output'); out.textContent=Math.round(o.scale*100)+' %';
    r.addEventListener('input',()=>{o.scale=parseFloat(r.value)||1; out.textContent=Math.round(o.scale*100)+' %'; schedule(); schedThumbs(); saveState();});
    wr.append(r,out); g.append(lb,wr); box.append(g);
  }
  if(t.ctl.includes('reset')){
    const row=document.createElement('div'); row.className='rowc'; row.style.marginTop='0';
    const b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent='Position automatisch';
    b.addEventListener('click',()=>{o.pos=null; schedule(); toast('Position wird wieder automatisch gewählt.');});
    const h=document.createElement('span'); h.className='hint'; h.textContent='Oder Text im Bild ziehen.';
    row.style.flexWrap='wrap'; row.append(b,h); box.append(row);
  }
}
function changed(){schedule();schedThumbs();saveState();}

/* ---------- Bedienung im Bild: Text ziehen, Foto ziehen, mit zwei Fingern zoomen ---------- */
const ptrs=new Map();
function toCv(e){const r=mainCv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*mainCv.width,y:(e.clientY-r.top)/r.height*mainCv.height,k:mainCv.width/r.width};}
function inRect(p,r,pad){return r&&p.x>=r.x-pad&&p.x<=r.x+r.w+pad&&p.y>=r.y-pad&&p.y<=r.y+r.h+pad;}
function startPan(p){
  const pr=LAST&&LAST.r.photo; if(!pr)return null;
  normCrop(pr.w/pr.h); return {type:'pan',p0:p,c0:{x:S.crop.x,y:S.crop.y},pr};
}
function startPinch(){
  const a=[...ptrs.values()]; if(a.length<2)return null;
  const pr=LAST&&LAST.r.photo; if(!pr)return null; normCrop(pr.w/pr.h);
  return {type:'pinch',d0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,m0:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},z0:S.crop.z,c0:{x:S.crop.x,y:S.crop.y},pr};
}
mainCv.addEventListener('pointerdown',e=>{
  if(!LAST)return; e.preventDefault();
  try{mainCv.setPointerCapture(e.pointerId);}catch(_){}
  const p=toCv(e); ptrs.set(e.pointerId,p); hideHint();
  if(ptrs.size>=2){DRAG=startPinch();schedule();return;}
  const t=LAST.r.text;
  if(t&&inRect(p,t.rect,22*p.k)){DRAG={type:'text',p0:p,a0:{x:t.anchor.x,y:t.anchor.y},axis:t.axis};}
  else DRAG=startPan(p);
  schedule();
});
mainCv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){ /* Mauszeiger: zeigen, dass Text greifbar ist */
    if(LAST&&LAST.r.text&&e.pointerType==='mouse'){const p=toCv(e);mainCv.style.cursor=inRect(p,LAST.r.text.rect,22*p.k)?'grab':(LAST.r.photo?'move':'default');}
    return;
  }
  const p=toCv(e); ptrs.set(e.pointerId,p); if(!DRAG)return;
  const W=mainCv.width, H=mainCv.height;
  if(DRAG.type==='text'){
    const o=S.opt[S.tpl], dx=(p.x-DRAG.p0.x)/W, dy=(p.y-DRAG.p0.y)/H;
    o.pos={x:DRAG.axis==='y'?DRAG.a0.x:DRAG.a0.x+dx,y:DRAG.axis==='x'?DRAG.a0.y:DRAG.a0.y+dy};
  }else if(DRAG.type==='pan'){
    const d=dims(S.prev), c=getCrop(d.w,d.h,DRAG.pr.w/DRAG.pr.h,{x:DRAG.c0.x,y:DRAG.c0.y},S.crop.z);
    S.crop.x=DRAG.c0.x-(p.x-DRAG.p0.x)*(c.cw/DRAG.pr.w)/d.w;
    S.crop.y=DRAG.c0.y-(p.y-DRAG.p0.y)*(c.ch/DRAG.pr.h)/d.h;
    S.crop.x=clamp(S.crop.x,-0.5,1.5); S.crop.y=clamp(S.crop.y,-0.5,1.5);
  }else if(DRAG.type==='pinch'){
    const a=[...ptrs.values()]; if(a.length<2)return;
    const dd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1, mid={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
    S.crop.z=clamp(DRAG.z0*dd/DRAG.d0,1,4);
    const d=dims(S.prev), c=getCrop(d.w,d.h,DRAG.pr.w/DRAG.pr.h,{x:DRAG.c0.x,y:DRAG.c0.y},S.crop.z);
    S.crop.x=DRAG.c0.x-(mid.x-DRAG.m0.x)*(c.cw/DRAG.pr.w)/d.w;
    S.crop.y=DRAG.c0.y-(mid.y-DRAG.m0.y)*(c.ch/DRAG.pr.h)/d.h;
    syncZoom();
  }
  schedule();
});
function endPtr(e){
  if(!ptrs.has(e.pointerId))return; ptrs.delete(e.pointerId);
  if(ptrs.size===1&&DRAG&&DRAG.type==='pinch'){DRAG=startPan([...ptrs.values()][0]);return;}
  if(ptrs.size===0){
    if(DRAG&&(DRAG.type==='pan'||DRAG.type==='pinch')&&LAST&&LAST.r.photo)normCrop(LAST.r.photo.w/LAST.r.photo.h);
    DRAG=null; schedule(); schedThumbs(); if(thumbPending)renderThumbs();
  }
}
mainCv.addEventListener('pointerup',endPtr); mainCv.addEventListener('pointercancel',endPtr); mainCv.addEventListener('lostpointercapture',endPtr);
mainCv.addEventListener('wheel',e=>{ /* Trackpad oder Maus: zoomen */
  if(!LAST||!LAST.r.photo)return; e.preventDefault();
  S.crop.z=clamp(S.crop.z*Math.exp(-e.deltaY*0.002),1,4); normCrop(LAST.r.photo.w/LAST.r.photo.h); syncZoom(); schedule(); schedThumbs();
},{passive:false});

let hintShown=false;
function showHint(){
  if(hintShown)return; let seen=false; try{seen=localStorage.getItem('rofpins.hint')==='1';}catch(_){}
  if(seen)return; hintShown=true; const h=$('ghint'); h.hidden=false; h.style.opacity='1';
}
function hideHint(){
  const h=$('ghint'); if(h.hidden)return; h.style.opacity='0'; setTimeout(()=>{h.hidden=true;},400);
  try{localStorage.setItem('rofpins.hint','1');}catch(_){}
}

/* ---------- Menüleiste ---------- */
function setTab(tab){
  S.tab=tab;
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  document.querySelectorAll('#panel [data-pane]').forEach(p=>{p.hidden=p.dataset.pane!==tab;});
  $('panel').scrollTop=0;
  if(tab==='tpl')requestAnimationFrame(renderThumbs);
}
document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));

/* ---------- Text ---------- */
function checkWarn(){
  const t=[S.text.brand,S.text.name,S.text.notes,S.text.extra].join(' '), m=[];
  if(/&/.test(t))m.push('„und“ statt „&“ schreiben.');
  if(/€|\beuro\b|\d+\s?%|\bunter\s+\d+/i.test(t))m.push('Keine Preis- oder Rabattangaben auf Pins.');
  if(/\b(im test|getestet|testbericht|praxistest)\b/i.test(t))m.push('Kein „im Test“ oder „getestet“.');
  if(/\bversus\b/i.test(t))m.push('„vs“ statt „versus“ schreiben.');
  if(/\bboozy\b/i.test(t))m.push('„boozy“ deutsch umschreiben, z. B. „cognacwarm“.');
  if(/oriental|exotisch/i.test(t))m.push('Begriff aus dem Sprachleitfaden vermeiden.');
  const w=$('warn'); w.hidden=!m.length; w.textContent=m.join(' ');
}
['brand','name','notes','extra'].forEach(id=>{
  const el=$(id); el.value=S.text[id];
  el.addEventListener('input',()=>{
    if(el.value.indexOf("'")>-1){const p=el.selectionStart; el.value=el.value.replace(/'/g,'’'); try{el.setSelectionRange(p,p);}catch(_){}}
    S.text[id]=el.value; checkWarn(); changed(); fontsReady(el.value).then(schedule);
  });
  el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur();});
});
const extraSeg=$('extraSeg');
[['top','Zusatz oben'],['bottom','Zusatz unten']].forEach(([v,t])=>{
  const b=document.createElement('button'); b.type='button'; b.textContent=t; b.setAttribute('aria-pressed',String(S.text.extraPos===v));
  b.addEventListener('click',()=>{S.text.extraPos=v; extraSeg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); changed();});
  extraSeg.append(b);
});
$('url').addEventListener('change',e=>{S.url=e.target.checked; changed();});

/* ---------- Foto ---------- */
function syncZoom(){$('zoom').value=String(S.crop.z);$('zoomOut').textContent=Math.round(S.crop.z*100)+' %';}
$('zoom').addEventListener('input',e=>{S.crop.z=clamp(parseFloat(e.target.value)||1,1,4); if(LAST&&LAST.r.photo)normCrop(LAST.r.photo.w/LAST.r.photo.h); syncZoom(); schedule(); schedThumbs();});
$('cropReset').addEventListener('click',()=>{S.crop={x:0.5,y:0.5,z:1}; syncZoom(); changed();});
function makePreview(src){
  const d=dims(src), long=1600; if(Math.max(d.w,d.h)<=long)return src;
  const k=long/Math.max(d.w,d.h), c=mk(d.w*k,d.h*k), x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(src,0,0,c.width,c.height); return c;
}
function makeSample(){
  const c=mk(1200,1800), x=c.getContext('2d');
  let g=x.createLinearGradient(0,0,0,1800); g.addColorStop(0,'#121010'); g.addColorStop(0.55,'#271b15'); g.addColorStop(1,'#3a291e');
  x.fillStyle=g; x.fillRect(0,0,1200,1800);
  for(let i=0;i<70;i++){const y=1100+i*10+Math.sin(i)*4; x.strokeStyle=`rgba(${95+(i*37)%40},${62+(i*13)%25},40,${0.07+((i*7)%10)/120})`; x.lineWidth=2+(i%3); x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(400,y+12,800,y-14,1200,y+6); x.stroke();}
  x.fillStyle='rgba(72,86,88,0.6)'; x.beginPath(); x.ellipse(720,1100,430,150,0,0,Math.PI*2); x.fill();
  const fruit=(cx,cy,r,c1,c2)=>{const rg=x.createRadialGradient(cx-r*0.35,cy-r*0.4,r*0.08,cx,cy,r); rg.addColorStop(0,c1); rg.addColorStop(1,c2); x.fillStyle=rg; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.fill();};
  fruit(560,990,150,'#56619a','#141733'); fruit(870,1015,165,'#5f69a6','#15183a'); fruit(710,1085,128,'#f2ab45','#7a3f12');
  x.fillStyle='rgba(60,96,52,0.8)'; x.beginPath(); x.ellipse(430,1130,120,34,-0.4,0,Math.PI*2); x.fill();
  const v=x.createRadialGradient(720,1020,220,640,900,1250); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.6)');
  x.fillStyle=v; x.fillRect(0,0,1200,1800); return c;
}
function setImage(src,isSample){
  S.full=src; S.prev=makePreview(src); S.isSample=isSample; S.imgId++;
  S.crop={x:0.5,y:0.5,z:1}; syncZoom();
  TPLS.forEach(t=>{S.opt[t.key].pos=null;});
  Object.keys(MODE).forEach(k=>delete MODE[k]);
  AN=null; changed();
}
function pickFile(){$('file').click();}
$('openBtn').addEventListener('click',pickFile); $('pickBtn').addEventListener('click',pickFile);
$('file').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  $('fileErr').hidden=true;
  const url=URL.createObjectURL(f), img=new Image();
  img.onload=()=>{setImage(img,false); toast('Foto geladen. Text und Foto lassen sich im Bild verschieben.');};
  img.onerror=()=>{URL.revokeObjectURL(url); $('fileErr').hidden=false; setTab('photo'); toast('Das Foto ließ sich nicht öffnen.');};
  img.src=url; e.target.value='';
});

/* ---------- Schriften ---------- */
const FONT_SPECS=['500 40px "Playfair Display"','400 40px Jost','500 40px Jost','600 40px "Cormorant Garamond"'];
function fontsReady(extra){
  if(!document.fonts||!document.fonts.load)return Promise.resolve();
  const t='AaÄäÖöÜüßÊêÉéÈèÂâ’„“REALM OF FRAGRANCE realmoffragrance.com '+(extra||'');
  return Promise.all(FONT_SPECS.map(f=>document.fonts.load(f,t))).catch(()=>{});
}

/* ---------- Speichern ---------- */
function slug(t){
  return (t||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'pin';
}
function fileName(){return `pin-${slug(S.text.name)}-${slug(TPL[S.tpl].name)}.jpg`;}
function saveInfo(){
  const W=S.size, H=W*1.5; let t=`${W} × ${H} Pixel, JPEG mit Qualität 100 %.`;
  if(!S.isSample&&S.full&&LAST&&LAST.r.photo){
    const pr=LAST.r.photo, d=dims(S.full), c=getCrop(d.w,d.h,pr.w/pr.h,S.crop,S.crop.z), need=pr.w/LAST.W*W;
    if(c.cw<need*0.95)t+=` Dein Ausschnitt hat ${Math.round(c.cw)} Pixel Breite und wird hochgerechnet. Mit weniger Zoom oder 1000 × 1500 bleibt er schärfer.`;
  }
  $('saveInfo').textContent=t;
}
(function(){
  const sg=$('sizeSeg');
  [[2000,'2000 × 3000'],[1000,'1000 × 1500']].forEach(([v,txt])=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=txt; b.setAttribute('aria-pressed',String(S.size===v));
    b.addEventListener('click',()=>{S.size=v; sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); saveInfo(); saveState();});
    sg.append(b);
  });
})();
$('saveBtn').addEventListener('click',()=>{
  const sg=$('sizeSeg'); sg.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String((i===0&&S.size===2000)||(i===1&&S.size===1000))));
  saveInfo(); $('saveSheet').hidden=false; $('saveGo').focus();
});
$('saveCancel').addEventListener('click',()=>{$('saveSheet').hidden=true;});
$('saveSheet').addEventListener('click',e=>{if(e.target===$('saveSheet'))$('saveSheet').hidden=true;});
let toastT=0;
function toast(msg){const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{t.hidden=true;},3000);}
let resUrl=null;
function showResult(blob,meta,name){
  if(resUrl)URL.revokeObjectURL(resUrl); resUrl=URL.createObjectURL(blob);
  $('resImg').src=resUrl; $('resMeta').textContent=meta;
  const a=$('resDl'); a.href=resUrl; a.download=name||'pin.jpg';
  $('result').hidden=false; $('resClose').focus();
}
$('resClose').addEventListener('click',()=>{$('result').hidden=true;});
$('result').addEventListener('click',e=>{if(e.target===$('result'))$('result').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('result').hidden=true;$('saveSheet').hidden=true;}});
async function exportBlob(W){
  await fontsReady([S.text.brand,S.text.name,S.text.notes,S.text.extra].join(' '));
  analyze();
  const H=Math.round(W*1.5), c=mk(W,H), ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H);
  R[S.tpl](ctx,W,H,S.full,{kind:'export',drag:false,guides:[]});
  const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',1));
  c.width=1; c.height=1; return blob;
}
$('saveGo').addEventListener('click',async()=>{
  const btn=$('saveGo'); if(btn.disabled)return;
  btn.disabled=true; btn.textContent='Wird erstellt …';
  try{
    const W=S.size, H=W*1.5, blob=await exportBlob(W);
    const name=fileName(), meta=`${W} × ${H} Pixel · ${(blob.size/1048576).toFixed(1).replace('.',',')} MB · JPEG 100 %`;
    $('saveSheet').hidden=true;
    const file=new File([blob],name,{type:'image/jpeg'}); let handled=false;
    if(navigator.canShare&&navigator.share){
      let can=false; try{can=navigator.canShare({files:[file]});}catch(_){can=false;}
      if(can){
        try{await navigator.share({files:[file]}); toast('Fertig: '+name); handled=true;}
        catch(e){if(e&&e.name==='AbortError'){toast('Speichern abgebrochen.');handled=true;}}
      }
    }
    if(!handled)showResult(blob,meta,name);
  }catch(err){
    toast('Das Bild konnte nicht erstellt werden. Bitte mit 1000 × 1500 noch einmal versuchen.');
  }finally{
    btn.disabled=false; btn.textContent='Als JPEG speichern';
  }
});

/* ---------- Bildschirmgröße, Tastatur ---------- */
const app=$('app');
function fitViewport(){
  const vv=window.visualViewport;
  if(vv){app.style.height=vv.height+'px'; app.style.transform=vv.offsetTop?`translateY(${vv.offsetTop}px)`:'';}
  else app.style.height=window.innerHeight+'px';
}
if(window.visualViewport){visualViewport.addEventListener('resize',fitViewport);visualViewport.addEventListener('scroll',fitViewport);}
window.addEventListener('resize',fitViewport);
if(window.ResizeObserver)new ResizeObserver(layout).observe($('stage')); else window.addEventListener('resize',layout);

/* Testzugang für automatische Prüfungen */
window.__rofpins={S,R,TPLS,exportBlob,selectTpl,setTab,renderThumbs,LAST:()=>LAST};

/* ---------- Start ---------- */
loadState();
['brand','name','notes','extra'].forEach(id=>{$(id).value=S.text[id];});
$('url').checked=S.url;
extraSeg.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String((i===0)===(S.text.extraPos==='top'))));
checkWarn();
buildTemplates(); buildStyle(); fitViewport();
setImage(makeSample(),true);
layout(); setTab('tpl');
selectTpl(S.tpl);
fontsReady().then(()=>{schedule();renderThumbs();});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{schedule();renderThumbs();});
})();
