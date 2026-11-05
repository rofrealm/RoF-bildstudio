/* RoF Pins 6: Text im RoF-Design auf Stimmungsbilder für Pinterest. Alles läuft lokal im Browser, nichts wird hochgeladen.
   Neu in 6: Glas-Material, Farbe aus dem Foto, weiches WERBUNG-Label, Figtree wie auf der Website, kursive Akzentwörter,
   Design-Werte (Luft, Gewicht, Akzent, Glas, Ecken), eigene Stile, großes Bedienfeld im Hochformat. */
(function(){
"use strict";

/* ---------- Grundwerte ---------- */
const PETROL='#3E6B6A', BROWN='#8C5E34', OFF='#F2F0EB', WEBPAPER='#FAF7F2', CARD='#FFFDFA', CARDLINE='#E8E1D6', INK='#1a1a1a';
const F_T='"Playfair Display", Georgia, "Times New Roman", serif';
const F_S='Figtree, "Helvetica Neue", Arial, sans-serif';
const F_L='"Cormorant Garamond", Garamond, Georgia, serif';
const AW=60, AH=90;                        /* Raster der Bildanalyse (2:3) */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
/* Wiederverwendete Hilfs-Leinwände: Safari auf dem iPad begrenzt den Canvas-Speicher; ständig neue Leinwände beim Ziehen
   würden ihn füllen. Jede Aufgabe bekommt eine feste Leinwand, die nur bei neuer Größe neu angelegt wird. */
const POOL={};
function tmp(key,w,h,read){
  w=Math.max(1,Math.round(w)); h=Math.max(1,Math.round(h)); let c=POOL[key];
  if(!c){c=POOL[key]=mk(w,h); if(read)c.getContext('2d',{willReadFrequently:true}); return c;} /* read: Pixel werden oft ausgelesen */
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;return c;} /* neue Größe setzt auch den Zeichenzustand zurück */
  const x=c.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='source-over'; x.globalAlpha=1; x.clearRect(0,0,w,h);
  return c;
}

/* Flächen: RoF-Farben, Website-Papier und ein dunkler Ton aus dem Foto. Die Papier-Varianten bekommen eine zarte Papierstruktur. */
const SURF={
  off:   {bg:OFF,dark:false,name:'Off-White'},
  offp:  {bg:OFF,dark:false,tex:true,name:'Off-White Papier'},
  paper: {bg:WEBPAPER,dark:false,name:'Website'},
  paperp:{bg:WEBPAPER,dark:false,tex:true,name:'Website Papier'},
  petrol:{bg:PETROL,dark:true,name:'Petrol'},
  brown: {bg:BROWN,dark:true,name:'Braun'},
  brownp:{bg:BROWN,dark:true,tex:true,name:'Braun Papier'},
  tone:  {bg:null,dark:true,name:'Fototon'},
  tonep: {bg:null,dark:true,tex:true,name:'Fototon Papier'}
};
const SURF_OLD={paper:'off',white:'off',dark:'petrol'}; /* gespeicherte Werte aus RoF Pins 2 */

/* Vorlagen: Gruppe, Name, welche Einstellungen es gibt, Standardwerte */
const TPLS=[
  {key:'cover',     group:'Auf dem Foto',       name:'Magazin',     ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'midline',   group:'Auf dem Foto',       name:'Mittellinie', ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'issue',     group:'Auf dem Foto',       name:'Ausgabe',     ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'spine',     group:'Auf dem Foto',       name:'Buchrücken',  ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'glasscard', group:'Glas',               name:'Glaskarte',   ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'glassbar',  group:'Glas',               name:'Glasleiste',  ctl:['color','scale'],         def:{}},
  {key:'glasslabel',group:'Glas',               name:'Glas-Etikett',ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'footband',  group:'Fläche und Papier',  name:'Fußband',     ctl:['surf','edge','scale'],   def:{surf:'brownp',edge:'soft'}},
  {key:'polaroid',  group:'Fläche und Papier',  name:'Polaroid',    ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'feuilleton',group:'Fläche und Papier',  name:'Feuilleton',  ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'paper',     group:'Fläche und Papier',  name:'Papier',      ctl:['surf','scale'],          def:{surf:'paperp'}}
];
const TPL={}; TPLS.forEach(t=>{TPL[t.key]=t;});
const TPL_FALLBACK='cover';

/* Design-Werte: gelten für alle Vorlagen */
const D_DEF={air:1, weight:'500', accent:'petrol', glass:0.5, round:'soft', bright:0, warm:0};
const SHOW_DEF={logo:true, url:true, brand:true, notes:true, extra:true};

const S={
  full:null, prev:null, isSample:true, imgId:0, objUrl:null,
  crop:{x:0.5,y:0.5,z:1},
  text:{brand:'House of Thêom Heaven’s Reserve', name:'Pflaume, Rum und *Zimt* für kalte Abende', notes:'Duftverlauf und Haltbarkeit im Artikel', extra:'Gourmand', extraPos:'top'},
  show:Object.assign({},SHOW_DEF),
  ad:true, adStyle:'glass', adSide:'left',
  brandK:1, tpl:'glasscard', size:2000, tab:'tpl', stab:'tpl', compact:false,
  d:Object.assign({},D_DEF),
  opt:{}
};
function resetOpt(){TPLS.forEach(t=>{S.opt[t.key]=Object.assign({color:'auto',surf:'off',edge:'soft',scale:1,pos:null},t.def);});}
resetOpt();

/* ---------- Speichern der Einstellungen (nur in diesem Browser) ---------- */
const STORE='rofpins.v3', STORE_OLD='rofpins.v2', STYLES='rofpins.styles';
function readOpt(dOpt){
  if(!dOpt)return;
  Object.keys(dOpt).forEach(k=>{
    if(!S.opt[k])return; const o=dOpt[k]||{}, t=TPL[k];
    if(o.color==='auto'||o.color==='light'||o.color==='dark')S.opt[k].color=o.color;
    if(typeof o.surf==='string'){const v=SURF[o.surf]?o.surf:SURF_OLD[o.surf]; if(v&&t.ctl.includes('surf'))S.opt[k].surf=v;}
    if(o.edge==='soft'||o.edge==='hard')S.opt[k].edge=o.edge;
    if(typeof o.scale==='number'&&isFinite(o.scale))S.opt[k].scale=clamp(o.scale,0.8,1.3);
  });
}
function readD(d){
  if(!d)return;
  if(typeof d.air==='number'&&isFinite(d.air))S.d.air=clamp(d.air,0.7,1.4);
  if(d.weight==='500'||d.weight==='600')S.d.weight=d.weight;
  if(d.accent==='petrol'||d.accent==='brown'||d.accent==='photo')S.d.accent=d.accent;
  if(typeof d.glass==='number'&&isFinite(d.glass))S.d.glass=clamp(d.glass,0,1);
  if(d.round==='soft'||d.round==='square')S.d.round=d.round;
  if(typeof d.bright==='number'&&isFinite(d.bright))S.d.bright=clamp(d.bright,-0.5,0.5);
  if(typeof d.warm==='number'&&isFinite(d.warm))S.d.warm=clamp(d.warm,-0.5,0.5);
}
function readShow(sh){if(sh)Object.keys(SHOW_DEF).forEach(k=>{if(typeof sh[k]==='boolean')S.show[k]=sh[k];});}
function readAd(d){
  if(d.adStyle==='glass'||d.adStyle==='line'||d.adStyle==='solid')S.adStyle=d.adStyle;
  if(d.adSide==='left'||d.adSide==='right')S.adSide=d.adSide;
}
function loadState(){
  let d=null, old=false;
  try{d=JSON.parse(localStorage.getItem(STORE)||'null'); if(!d){d=JSON.parse(localStorage.getItem(STORE_OLD)||'null'); old=!!d;}}catch(_){d=null;}
  if(!d||typeof d!=='object')return;
  try{
    if(d.text)Object.keys(S.text).forEach(k=>{if(typeof d.text[k]==='string')S.text[k]=d.text[k];});
    if(S.text.extraPos!=='top'&&S.text.extraPos!=='bottom')S.text.extraPos='top';
    if(old){if(typeof d.url==='boolean')S.show.url=d.url;} else readShow(d.show);
    if(typeof d.ad==='boolean')S.ad=d.ad;
    readAd(d);
    if(typeof d.brandK==='number'&&isFinite(d.brandK))S.brandK=clamp(d.brandK,0.7,1.4);
    if(typeof d.tpl==='string')S.tpl=TPL[d.tpl]?d.tpl:TPL_FALLBACK; /* entfernte Vorlage: Magazin */
    if(d.size===1000||d.size===2000)S.size=d.size;
    readD(d.d); readOpt(d.opt);
    if(typeof d.stab==='string'&&STABS.some(x=>x[0]===d.stab))S.stab=d.stab;
  }catch(_){}
}
let saveT=0;
function saveNow(){try{localStorage.setItem(STORE,JSON.stringify({text:S.text,show:S.show,ad:S.ad,adStyle:S.adStyle,adSide:S.adSide,brandK:S.brandK,tpl:S.tpl,size:S.size,d:S.d,stab:S.stab,opt:optSnap(Object.keys(S.opt))}));}catch(_){}}
function optSnap(keys){const opt={}; keys.forEach(k=>{const o=S.opt[k]; opt[k]={color:o.color,surf:o.surf,edge:o.edge,scale:o.scale};}); return opt;}
function saveState(){
  clearTimeout(saveT);
  saveT=setTimeout(()=>{
    saveNow();
  },400);
}

/* ---------- Farben ---------- */
function hexRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function rgbHex(c){return '#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');}
function toLin(v){return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
function relLum(c){return 0.2126*toLin(c[0]/255)+0.7152*toLin(c[1]/255)+0.0722*toLin(c[2]/255);}
function contrastL(a,b){return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);}
function lumHex(h){const c=hexRgb(h);return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;}
/* Kontrast nach WCAG mit Helligkeitswerten (0 bis 1, wie im Foto gemessen) */
function contrastV(a,b){const A=toLin(a),B=toLin(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);}
function rgb2hsl(c){
  const r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2; let h=0,s=0;
  if(mx!==mn){const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn); h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h/=6;}
  return [h,s,l];
}
function hsl2rgb(h,s,l){
  if(s===0)return [l*255,l*255,l*255];
  const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  const f=t=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  return [f(h+1/3)*255,f(h)*255,f(h-1/3)*255];
}
/* Ton aus dem Foto: Farbe des Fotos halb mit RoF-Braun (warm) oder Petrol (kühl) gemischt, dann tief abgedunkelt */
/* Kräftigste Farbe des Fotos; nur wenn sie deutlich farbig ist, sonst bleibt es bei Petrol bzw. Braun */
function photoDom(){if(!AN||!AN.dom||AN.domW<1e-4)return null; const h=rgb2hsl(AN.dom); return h[1]>=0.12&&h[2]>0.06&&h[2]<0.94?AN.dom:null;}
let toneCache={k:'',v:'#3A2A1E'};
function toneHex(){
  const d=photoDom(), k=d?d.map(Math.round).join(','):'-';
  if(toneCache.k===k)return toneCache.v;
  let v='#3A2A1E';
  if(d){
    const h=rgb2hsl(d)[0]*360, warm=h<75||h>320, base=hexRgb(warm?BROWN:PETROL);
    const mix=[0,1,2].map(i=>d[i]*0.5+base[i]*0.5);
    let lo=0,hi=2; for(let i=0;i<24;i++){const m=(lo+hi)/2; if(relLum(mix.map(x=>Math.min(255,x*m)))>0.045)hi=m; else lo=m;}
    v=rgbHex(mix.map(x=>Math.min(255,x*lo)));
  }
  toneCache={k,v}; return v;
}
function surfBg(key){const sf=SURF[key]||SURF.off; return (key==='tone'||key==='tonep')?toneHex():sf.bg;}
/* Akzentfarbe (Rubrik, Marke, Linie, Wortmarke auf hellem Grund). „Aus dem Foto“ wird so weit abgedunkelt, dass sie lesbar bleibt. */
function accentFor(bgHex){
  const bgL=relLum(hexRgb(bgHex||OFF));
  if(S.d.accent==='brown')return BROWN;
  if(S.d.accent==='photo'){
    const d=photoDom();
    if(d){
      const hsl=rgb2hsl(d), sat=clamp(hsl[1],0.3,0.6); let l=0.5, c=hsl2rgb(hsl[0],sat,l);
      for(let i=0;i<40&&contrastL(relLum(c),bgL)<4.6;i++){l-=0.012; c=hsl2rgb(hsl[0],sat,l);}
      return rgbHex(c);
    }
  }
  return PETROL;
}
/* Farbe für das WERBUNG-Label im Stil „Fläche“: Akzentfarbe, bei Bedarf dunkler, damit helle Schrift darauf gut lesbar ist */
function solidAdHex(){
  let c=hexRgb(S.d.accent==='brown'?BROWN:S.d.accent==='photo'?accentFor(OFF):PETROL);
  for(let i=0;i<30&&contrastL(relLum(c),relLum(hexRgb(CARD)))<4.8;i++)c=c.map(v=>v*0.94);
  return rgbHex(c);
}

/* ---------- Text-Hilfen ---------- */
const MW=new Map();
function mw(ctx,font,t){
  const k=font+'\u0001'+t; let v=MW.get(k);
  if(v===undefined){ctx.font=font; v=ctx.measureText(t).width; if(MW.size>8000)MW.clear(); MW.set(k,v);}
  return v;
}
function spacedW(ctx,t,sp){const f=ctx.font, ch=Array.from(t);let w=0;for(const c of ch)w+=mw(ctx,f,c);return w+sp*Math.max(0,ch.length-1);}
function drawSpaced(ctx,t,x,y,sp,align){
  const f=ctx.font, w=spacedW(ctx,t,sp); let cx=align==='center'?x-w/2:(align==='right'?x-w:x); ctx.textAlign='left';
  for(const c of Array.from(t)){ctx.fillText(c,cx,y);cx+=mw(ctx,f,c)+sp;}
}
/* Fließtext in Wörter zerlegen. Mit rich=true schaltet ein Sternchen auf kursiv um und wieder zurück (*Wort*).
   Ergebnis: Absätze (eigene Zeilenumbrüche bleiben erhalten), darin Wörter, darin Abschnitte {t, it}. */
function parseRich(text,rich){
  let src=String(text||'').replace(/\r/g,'');
  if(rich){const n=(src.match(/\*/g)||[]).length; if(n%2===1){const i=src.lastIndexOf('*'); src=src.slice(0,i)+src.slice(i+1);}}
  const paras=[]; let it=false;
  for(const line of src.split('\n')){
    const words=[]; let segs=[], cur='';
    const endSeg=()=>{if(cur){segs.push({t:cur,it});cur='';}};
    const endWord=()=>{endSeg(); if(segs.length)words.push(segs); segs=[];};
    for(const ch of Array.from(line)){
      if(rich&&ch==='*'){endSeg(); it=!it; continue;}
      if(/\s/.test(ch)){endWord(); continue;}
      cur+=ch;
    }
    endWord();
    if(words.length)paras.push(words);
  }
  return paras;
}
function wordText(w){return w.map(g=>g.t).join('');}
function wordW(ctx,w,ff,z){let x=0; for(const g of w)x+=mw(ctx,ff(z,g.it),g.t); return x;}
function lineW(ctx,line,ff,z){const sp=mw(ctx,ff(z,false),' '); let x=0; line.forEach((w,i)=>{x+=wordW(ctx,w,ff,z)+(i?sp:0);}); return x;}
/* Zahlen bleiben beim nächsten Wort ("7 Herbstdüfte"), damit keine Zahl allein am Zeilenende hängt */
function unitsOf(words){
  const u=[];
  for(let i=0;i<words.length;i++){
    if(/^\d+[.,]?$/.test(wordText(words[i]))&&i<words.length-1){u.push([words[i],words[i+1]]);i++;}
    else u.push([words[i]]);
  }
  return u;
}
function wrapUnits(ctx,units,ff,z,maxW,balance){
  if(!units.length)return [];
  const lines=[]; let cur=units[0].slice();
  for(let i=1;i<units.length;i++){const t=cur.concat(units[i]); if(lineW(ctx,t,ff,z)<=maxW)cur=t; else{lines.push(cur);cur=units[i].slice();}}
  lines.push(cur);
  if(balance&&lines.length===2){ /* zwei Zeilen möglichst gleich lang */
    let best=null;
    for(let k=1;k<units.length;k++){
      const a=[].concat(...units.slice(0,k)), b=[].concat(...units.slice(k));
      const m=Math.max(lineW(ctx,a,ff,z),lineW(ctx,b,ff,z));
      if(m<=maxW&&(!best||m<best.m))best={m,l:[a,b]};
    }
    if(best)return best.l;
  }
  return lines;
}
function wrapRich(ctx,paras,ff,z,maxW){
  const U=paras.map(unitsOf);
  if(U.length===1)return wrapUnits(ctx,U[0],ff,z,maxW,true);
  const out=[]; U.forEach(u=>{wrapUnits(ctx,u,ff,z,maxW,false).forEach(l=>out.push(l));}); return out;
}
/* Schriftgröße finden: erst die Grundgröße für 100 %, dann mit dem Regler skalieren.
   Größer darf bis zu zwei Zeilen mehr belegen; passt es nicht, wird nur so weit verkleinert wie nötig. */
function fitRich(ctx,paras,ff,maxSize,minSize,maxW,maxLines,k){
  const pc=paras.length; maxLines=Math.max(maxLines,pc);
  const step=Math.max(0.5,maxSize/60), wide=(l,z)=>l.some(x=>lineW(ctx,x,ff,z)>maxW);
  let size=maxSize, lines=[], done=false;
  if(!pc)return {size,lines};
  if(pc>1){ /* eigene Umbrüche: jede Zeile möglichst ungebrochen, Schrift dafür bis 60 % kleiner */
    for(let z=maxSize;z>=Math.max(minSize,maxSize*0.6);z-=step){const l=wrapRich(ctx,paras,ff,z,maxW); if(l.length===pc&&!wide(l,z)){size=z;lines=l;done=true;break;}}
  }
  if(!done){
    for(;;){lines=wrapRich(ctx,paras,ff,size,maxW); if((lines.length<=maxLines&&!wide(lines,size))||size<=minSize)break; size=Math.max(minSize,size-step);}
    if(lines.length>maxLines)lines=lines.slice(0,maxLines-1).concat([[].concat(...lines.slice(maxLines-1))]);
    while(size>6&&wide(lines,size))size-=step*0.5;
  }
  if(k&&Math.abs(k-1)>=0.005){
    const lim=maxLines+(k>1?2:0); let z=size*k, l=lines;
    for(let i=0;i<90;i++){l=wrapRich(ctx,paras,ff,z,maxW); if((l.length<=lim&&!wide(l,z))||z<=6)break; z*=0.97;}
    size=z; lines=l;
  }
  return {size,lines};
}
function drawRichLine(ctx,line,ff,z,x,y,align){
  const w=lineW(ctx,line,ff,z), sp=mw(ctx,ff(z,false),' ');
  let cx=align==='center'?x-w/2:(align==='right'?x-w:x); ctx.textAlign='left';
  line.forEach((wd,i)=>{
    if(i)cx+=sp;
    for(const g of wd){const f=ff(z,g.it); ctx.font=f; ctx.fillText(g.t,cx,y); cx+=mw(ctx,f,g.t);}
  });
}
function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
/* Design-Werte als Hilfen: Luft (Abstände), Ränder, Ecken */
function air(){return S.d.air||1;}
function GAP(v){return v*air();}
function MAR(v){return v*(0.7+0.3*air());}
function RAD(s,v){return S.d.round==='square'?Math.min(v,3)*s:v*s;}
function titleFF(){const w=S.d.weight==='600'?600:500; return (z,it)=>`${it?'italic ':''}${w} ${z}px ${F_T}`;}

/* Textblock: Rubrik (oben als Kapsel), Marke, Titel, Linie, Kernnoten, Rubrik (unten als Hinweis).
   Was im Reiter Stil ausgeblendet ist, fällt weg. o.skip blendet Teile für eine Vorlage aus,
   o.notesCaps setzt die Kernnoten gesperrt in Versalien, o.ruleW/ruleH/ruleRole formen die Linie. */
function buildBlock(ctx,s,maxW,o){
  const T=S.text, k=o.scale||1, items=[], sk=o.skip||{}, sh=S.show; let w=0;
  const extra=(sk.extra||!sh.extra)?'':T.extra.trim(), brand=(sk.brand||!sh.brand)?'':T.brand.trim();
  const tp=sk.title?[]:parseRich(T.name,true), notes=(sk.notes||!sh.notes)?'':T.notes.trim();
  maxW=Math.max(maxW,40*s);
  let titleY=null, titleH=0, titleW=0;
  if(extra&&T.extraPos==='top'){
    const txt=extra.toUpperCase(); let sz=15*s*Math.min(k,1.15), f;
    for(;;){f=`600 ${sz}px ${F_S}`; ctx.font=f; if(spacedW(ctx,txt,sz*0.2)+32*s<=maxW||sz<=8*s)break; sz-=0.5*s;}
    ctx.font=f; const pw=spacedW(ctx,txt,sz*0.2)+32*s;
    w=Math.max(w,pw);
    items.push({k:'pill',text:txt,font:f,sp:sz*0.2,w:pw,h:sz+20*s,lw:1.4*s,role:'pill'});
    items.push({k:'gap',h:GAP(22)*s});
  }
  if(brand){
    const txt=brand.toUpperCase(); let sz=(o.brandSize||21)*s*Math.min(k,1.15), f;
    for(;;){f=`600 ${sz}px ${F_S}`; ctx.font=f; if(spacedW(ctx,txt,sz*0.2)<=maxW||sz<=9*s)break; sz-=0.5*s;}
    ctx.font=f; const bw=spacedW(ctx,txt,sz*0.2);
    w=Math.max(w,bw);
    items.push({k:'sp',text:txt,font:f,sp:sz*0.2,w:bw,h:sz*1.3,role:'eyebrow'});
    items.push({k:'gap',h:GAP(o.brandGap||18)*s});
  }
  if(tp.length){
    const ff=titleFF(), r=fitRich(ctx,tp,ff,o.titleMax*s,(o.titleMin||38)*s,maxW,o.titleLines||2,k);
    r.lines.forEach(l=>{titleW=Math.max(titleW,lineW(ctx,l,ff,r.size));}); w=Math.max(w,titleW);
    items.push({k:'rich',lines:r.lines,ff,z:r.size,lh:r.size*1.1,h:r.size*1.1*r.lines.length,role:'title',tw:titleW});
  }
  if(notes){
    if(tp.length&&!o.noRule){items.push({k:'gap',h:GAP(24)*s});items.push({k:'rule',h:(o.ruleH||2)*s,w:(o.ruleW||56)*s,role:o.ruleRole||'rule'});items.push({k:'gap',h:GAP(22)*s});}
    else if(tp.length)items.push({k:'gap',h:GAP(20)*s});
    let done=false;
    if(o.notesCaps){
      const txt=notes.toUpperCase(); let sz=(o.notesMax||19)*s*k, f;
      for(;;){f=`500 ${sz}px ${F_S}`; ctx.font=f; if(spacedW(ctx,txt,sz*0.16)<=maxW||sz<=12*s)break; sz-=0.5*s;}
      ctx.font=f;
      if(spacedW(ctx,txt,sz*0.16)<=maxW){const tw=spacedW(ctx,txt,sz*0.16); w=Math.max(w,tw); items.push({k:'sp',text:txt,font:f,sp:sz*0.16,w:tw,h:sz*1.4,role:'notes'}); done=true;}
    }
    if(!done){
      const ff=z=>`400 ${z}px ${F_S}`, r=fitRich(ctx,parseRich(notes,false),ff,(o.notesMax||30)*s,(o.notesMin||17)*s,maxW,o.notesLines||2,k);
      r.lines.forEach(l=>{w=Math.max(w,lineW(ctx,l,ff,r.size));});
      items.push({k:'rich',lines:r.lines,ff,z:r.size,lh:r.size*1.35,h:r.size*1.35*r.lines.length,role:'notes'});
    }
  }
  if(extra&&T.extraPos==='bottom'){
    items.push({k:'gap',h:GAP(18)*s});
    const txt=extra.toUpperCase(); let sz=17*s*Math.min(k,1.15), f;
    for(;;){f=`500 ${sz}px ${F_S}`; ctx.font=f; if(spacedW(ctx,txt,sz*0.18)<=maxW||sz<=9*s)break; sz-=0.5*s;}
    ctx.font=f; const tw=spacedW(ctx,txt,sz*0.18); w=Math.max(w,tw);
    items.push({k:'sp',text:txt,font:f,sp:sz*0.18,w:tw,h:sz*1.4,role:'hint'});
  }
  while(items.length&&items[0].k==='gap')items.shift();
  while(items.length&&items[items.length-1].k==='gap')items.pop();
  let cy=0; items.forEach(it=>{if(it.role==='title'){titleY=cy;titleH=it.h;} cy+=it.h;});
  return {items,h:cy,w,titleY,titleH,titleW};
}
function drawBlock(ctx,b,x,y,align,col){
  let cy=y; ctx.textBaseline='middle';
  const ax=w=>align==='center'?x-w/2:(align==='right'?x-w:x);
  for(const it of b.items){
    if(it.k==='gap'){cy+=it.h;continue;}
    if(it.k==='rule'){ctx.fillStyle=col[it.role]||col.rule;ctx.fillRect(ax(it.w),cy,it.w,it.h);cy+=it.h;continue;}
    if(it.k==='pill'){
      const px=ax(it.w);
      ctx.strokeStyle=col.pill; ctx.lineWidth=it.lw; rr(ctx,px+it.lw/2,cy+it.lw/2,it.w-it.lw,it.h-it.lw,S.d.round==='square'?3*it.lw:it.h/2); ctx.stroke();
      /* Versalien optisch genau mittig: Grundlinie = Mitte + halbe Versalhöhe */
      const ch=capH(ctx,it.font,parseFloat(it.font.split(' ')[1])||16);
      ctx.fillStyle=col.pill; ctx.font=it.font; ctx.textBaseline='alphabetic';
      drawSpaced(ctx,it.text,px+it.w/2,cy+it.h/2+ch/2,it.sp,'center'); ctx.textBaseline='middle'; cy+=it.h; continue;
    }
    ctx.fillStyle=col[it.role];
    if(it.k==='sp'){ctx.font=it.font; drawSpaced(ctx,it.text,x,cy+it.h/2,it.sp,align);cy+=it.h;continue;}
    for(const l of it.lines){drawRichLine(ctx,l,it.ff,it.z,x,cy+it.lh/2,align);cy+=it.lh;}
  }
}
/* Wortmarke in Versalien (Buchstabenabstand 0,3em), darunter die Webadresse. Beide lassen sich im Reiter Stil ausblenden.
   S.brandK (Regler „Logo und Webadresse“) vergrößert oder verkleinert beides in allen Vorlagen. */
const WM='REALM OF FRAGRANCE', WEB='realmoffragrance.com';
function bK(){return S.brandK||1;}
function brandParts(s,k){k=(k||1)*bK(); const L=24*s*k, u=17*s*k, lo=S.show.logo, ur=S.show.url; return {L,u,lo,ur,gap:12*s*k,h:(lo?L*1.2:0)+(lo&&ur?12*s*k:0)+(ur?u*1.2:0)};}
function brandH(s,k){return brandParts(s,k).h;}
function brandW(ctx,s,k){
  const p=brandParts(s,k); let w=0;
  if(p.lo){ctx.font=`600 ${p.L}px ${F_L}`; w=spacedW(ctx,WM,p.L*0.3);}
  if(p.ur){ctx.font=`400 ${p.u}px ${F_S}`; w=Math.max(w,spacedW(ctx,WEB,p.u*0.06));}
  return w;
}
function fitK(ctx,s,maxW,kMax){const w=brandW(ctx,s,1); return w>0?Math.min(kMax||1,maxW/w):(kMax||1);}
function drawBrand(ctx,s,x,top,col,k,align){
  const p=brandParts(s,k); align=align||'center'; ctx.textBaseline='middle'; let y=top;
  if(p.lo){ctx.font=`600 ${p.L}px ${F_L}`; ctx.fillStyle=col.logo; drawSpaced(ctx,WM,x,y+p.L*0.6,p.L*0.3,align); y+=p.L*1.2+(p.ur?p.gap:0);}
  if(p.ur){ctx.font=`400 ${p.u}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,WEB,x,y+p.u*0.6,p.u*0.06,align);}
}
function hline(ctx,x0,x1,y,h,c){ctx.fillStyle=c;ctx.fillRect(x0,y,x1-x0,h);}

/* Farben für Text: hell auf dunklem Grund, dunkel (mit Akzentfarbe) auf hellem Grund */
const LT='242,240,235';
function colsMode(mode,bgHex){
  if(mode==='light')return {eyebrow:OFF,title:OFF,rule:OFF,rule2:OFF,notes:`rgba(${LT},0.94)`,hint:`rgba(${LT},0.86)`,pill:OFF,logo:OFF,url:`rgba(${LT},0.86)`,line:`rgba(${LT},0.62)`};
  const a=accentFor(bgHex||OFF);
  return {eyebrow:a,title:INK,rule:a,rule2:BROWN,notes:INK,hint:'#3f3a35',pill:a,logo:a,url:'#4a4a4a',line:'rgba(26,26,26,0.45)'};
}
function colsSurf(key){
  const sf=SURF[key]||SURF.off;
  if(sf.dark)return colsMode('light');
  return Object.assign(colsMode('dark',surfBg(key)),{notes:'#47423d',hint:'#5a534c',url:'#6e675f',line:'rgba(26,26,26,0.22)'});
}
function surfC(key){const sf=SURF[key]||SURF.off; return sf.dark?contrastV(0.94,lumHex(surfBg(key))):contrastV(0.1,lumHex(surfBg(key)));}

/* ---------- Papierstruktur ----------
   Feste Zufallszahlen: Vorschau und gespeichertes Bild sehen gleich aus. Werte vom Pinterest-Karten-Standard, für Pins auf 60 % gesenkt.
   Papierzahn 0,014 als Relief mit seitlichem Licht, rund 9000 Fasern 0,065, Wolkung 0,0035, Rand 0,02. Kein Filmkorn, keine Fleckchen. */
const TEXK=0.6, TEX=new Map();
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function noiseGrid(W,H,cell,seed){const r=rng(seed),gw=Math.ceil(W/cell)+3,gh=Math.ceil(H/cell)+3,g=new Float32Array(gw*gh);for(let i=0;i<g.length;i++)g[i]=r()*2-1;return {cell,gw,g};}
function noiseAt(G,px,py){
  const fx=px/G.cell, fy=py/G.cell, ix=fx|0, iy=fy|0, tx=fx-ix, ty=fy-iy, sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty), i=iy*G.gw+ix, g=G.g;
  const a=g[i]+(g[i+1]-g[i])*sx, b=g[i+G.gw]+(g[i+G.gw+1]-g[i+G.gw])*sx; return a+(b-a)*sy;
}
function paperTex(W,H,bg){
  const key=W+'x'+H+bg;
  if(TEX.has(key)){const v=TEX.get(key); TEX.delete(key); TEX.set(key,v); return v;} /* zuletzt benutzt nach hinten */
  while(TEX.size>=6)TEX.delete(TEX.keys().next().value); /* nur die älteste Struktur verwerfen */
  const s=W/1000, c=mk(W,H), x=c.getContext('2d');
  const B=hexRgb(bg), R0=B[0], G0=B[1], B0=B[2];
  const img=x.createImageData(W,H), d=img.data;
  const tooth=noiseGrid(W,H,Math.max(1,1.5*s),11), c1=noiseGrid(W,H,190*s,23), c2=noiseGrid(W,H,70*s,37);
  const T=new Float32Array(W*H);
  for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)T[yy*W+xx]=noiseAt(tooth,xx,yy);
  const off=Math.max(1,Math.round(1.2*s)), edge=0.09*Math.min(W,H);
  const aT=0.014*TEXK*2.2, aC=0.0035*TEXK*2, aE=0.02*TEXK;
  for(let yy=0;yy<H;yy++){
    const yo=Math.max(0,yy-off)*W;
    for(let xx=0;xx<W;xx++){
      const i=yy*W+xx, rel=T[i]-T[yo+Math.max(0,xx-off)];
      const cl=noiseAt(c1,xx,yy)*0.65+noiseAt(c2,xx,yy)*0.35;
      const dE=Math.min(xx,yy,W-1-xx,H-1-yy), e=dE<edge?(1-dE/edge)*(1-dE/edge):0;
      const L=1+aT*rel+aC*cl-aE*e, j=i*4;
      d[j]=R0*L; d[j+1]=G0*L; d[j+2]=B0*L; d[j+3]=255;
    }
  }
  x.putImageData(img,0,0);
  const r=rng(57); x.lineCap='round';
  /* Dunkle Fasern: auf hellem Papier warmes Grau, auf dunklen Flächen ein Ton der Fläche selbst, damit sie nicht fleckig wirkt */
  const darkBg=lumHex(bg)<0.5, DF=darkBg?`${R0*0.62|0},${G0*0.62|0},${B0*0.62|0}`:'120,104,80', LK=darkBg?0.75:1.3;
  for(let n=0;n<9000;n++){
    const px=r()*W, py=r()*H, len=(6+r()*22)*s, ang=r()*Math.PI, bend=(r()-0.5)*len*0.5;
    const dx=Math.cos(ang)*len/2, dy=Math.sin(ang)*len/2, dark=r()<0.55, a=0.065*TEXK*(0.35+r()*0.65);
    x.strokeStyle=dark?`rgba(${DF},${a.toFixed(4)})`:`rgba(255,255,252,${(a*LK).toFixed(4)})`;
    x.lineWidth=Math.max(0.35,(0.4+r()*0.45)*s);
    x.beginPath(); x.moveTo(px-dx,py-dy); x.quadraticCurveTo(px-dy/len*bend*2,py+dx/len*bend*2,px+dx,py+dy); x.stroke();
  }
  TEX.set(key,c); return c;
}
/* Fläche füllen, rechteckig oder mit eigener Form */
function fillSurf(ctx,key,W,H,shape){
  const sf=SURF[key]||SURF.off, bg=surfBg(key); ctx.save();
  if(typeof shape==='function')shape(ctx); else{ctx.beginPath();ctx.rect(shape.x,shape.y,shape.w,shape.h);}
  ctx.clip();
  if(sf.tex)ctx.drawImage(paperTex(W,H,bg),0,0,W,H); else{ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);}
  ctx.restore();
}
/* Fläche mit weichem Übergang nach oben: über „fade“ Pixel blendet sie von durchsichtig zu deckend */
function fillSurfFade(ctx,key,W,H,top,fade){
  const sf=SURF[key]||SURF.off, bg=surfBg(key), f0=Math.max(0,top-fade), h=H-f0;
  const t=tmp('fade',W,h), x=t.getContext('2d');
  if(sf.tex)x.drawImage(paperTex(W,H,bg),0,f0,W,h,0,0,W,h); else{x.fillStyle=bg;x.fillRect(0,0,W,h);}
  /* Eine einzige Maske über die ganze Höhe: „destination-in“ löscht alles, was die Maske nicht abdeckt */
  x.globalCompositeOperation='destination-in';
  const g=x.createLinearGradient(0,0,0,h), e=clamp((top-f0)/h,0,1), N=12;
  for(let i=0;i<=N;i++){const p=i/N; g.addColorStop(p*e,`rgba(0,0,0,${sstep(p).toFixed(4)})`);}
  g.addColorStop(1,'rgba(0,0,0,1)');
  x.fillStyle=g; x.fillRect(0,0,W,h);
  ctx.drawImage(t,0,f0,W,h);
}

/* ---------- Foto, Ausschnitt, Helligkeit und Wärme ---------- */
function dims(src){return {w:src.naturalWidth||src.width, h:src.naturalHeight||src.height};}
function getCrop(sw,sh,a,c,z){
  const cw=Math.min(sw,sh*a)/z, ch=cw/a;
  return {sx:clamp(c.x*sw-cw/2,0,sw-cw),sy:clamp(c.y*sh-ch/2,0,sh-ch),cw,ch};
}
function adjOn(){return Math.abs(S.d.bright)>0.004||Math.abs(S.d.warm)>0.004;}
let LUT={k:'',r:null,g:null,b:null};
function lut(){
  const b=S.d.bright, w=S.d.warm, k=b.toFixed(3)+'|'+w.toFixed(3); if(LUT.k===k)return LUT;
  const R=new Uint8ClampedArray(256), G=new Uint8ClampedArray(256), B=new Uint8ClampedArray(256), gm=Math.pow(2,-b*1.3);
  for(let i=0;i<256;i++){
    const v=Math.pow(i/255,gm);
    R[i]=255*clamp(v*(1+w*0.1)+w*0.015,0,1); G[i]=255*clamp(v*(1+w*0.015),0,1); B[i]=255*clamp(v*(1-w*0.1)-w*0.01,0,1);
  }
  LUT={k,r:R,g:G,b:B}; return LUT;
}
function applyAdj(cv){
  const x=cv.getContext('2d'), id=x.getImageData(0,0,cv.width,cv.height), d=id.data, L=lut();
  for(let i=0;i<d.length;i+=4){d[i]=L.r[d[i]];d[i+1]=L.g[d[i+1]];d[i+2]=L.b[d[i+2]];}
  x.putImageData(id,0,0);
}
/* Vorschau: das ganze verkleinerte Foto einmal anpassen und merken */
let ADJ={k:'',cv:null};
function adjPrev(){
  const k=S.imgId+'|'+lut().k; if(ADJ.k===k)return ADJ.cv;
  const d=dims(S.prev), c=tmp('adj',d.w,d.h,true); c.getContext('2d').drawImage(S.prev,0,0); applyAdj(c);
  ADJ={k,cv:c}; return c;
}
function drawPhoto(ctx,src,r){
  const d=dims(src), c=getCrop(d.w,d.h,r.w/r.h,S.crop,S.crop.z);
  if(adjOn()){
    if(src!==S.prev){ /* Speichern: nur den sichtbaren Ausschnitt in voller Auflösung anpassen */
      const t=mk(r.w,r.h), tx=t.getContext('2d'); tx.imageSmoothingEnabled=true; tx.imageSmoothingQuality='high';
      tx.drawImage(src,c.sx,c.sy,c.cw,c.ch,0,0,t.width,t.height); applyAdj(t);
      ctx.drawImage(t,r.x,r.y,r.w,r.h); t.width=1; t.height=1; return c; /* Speicher sofort freigeben */
    }
    src=adjPrev();
  }
  ctx.drawImage(src,c.sx,c.sy,c.cw,c.ch,r.x,r.y,r.w,r.h); return c;
}
function normCrop(a){ /* Mitte so setzen, dass der Ausschnitt im Bild bleibt */
  if(!S.prev)return; const d=dims(S.prev), c=getCrop(d.w,d.h,a,S.crop,S.crop.z);
  S.crop.x=(c.sx+c.cw/2)/d.w; S.crop.y=(c.sy+c.ch/2)/d.h;
}
function cropKey(){return S.imgId+':'+S.crop.x.toFixed(4)+':'+S.crop.y.toFixed(4)+':'+S.crop.z.toFixed(4)+':'+lut().k;}

/* Weichgezeichnetes Foto (für Glas und Polaroid), mehrstufig verkleinert und vergrößert. Die Glas-Variante ist kräftiger gesättigt. */
const BLUR={key:'',cv:null,sat:null};
function blurred(src,W,H){
  const key=cropKey()+'|'+Math.round(W)+'|'+(src===S.prev?'p':'f');
  if(BLUR.key===key)return BLUR.cv;
  const a=tmp('blA',Math.max(30,W/8),Math.max(45,H/8)); const ax=a.getContext('2d'); ax.imageSmoothingQuality='high';
  drawPhoto(ax,src,{x:0,y:0,w:a.width,h:a.height});
  const b=tmp('blB',Math.max(10,W/40),Math.max(15,H/40)); const bx=b.getContext('2d'); bx.imageSmoothingQuality='high'; bx.drawImage(a,0,0,b.width,b.height);
  const c=tmp('blC',a.width,a.height); const cx=c.getContext('2d'); cx.imageSmoothingQuality='high'; cx.drawImage(b,0,0,c.width,c.height);
  const d=tmp('blD',Math.max(10,W/28),Math.max(15,H/28)); d.getContext('2d').drawImage(c,0,0,d.width,d.height);
  const e=tmp('blE',Math.max(40,W/4),Math.max(60,H/4)); const ex=e.getContext('2d'); ex.imageSmoothingQuality='high'; ex.drawImage(d,0,0,e.width,e.height);
  BLUR.key=key; BLUR.cv=e; BLUR.sat=null; return e;
}
function saturate(cv,k){
  const x=cv.getContext('2d'), id=x.getImageData(0,0,cv.width,cv.height), d=id.data;
  for(let i=0;i<d.length;i+=4){const l=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; d[i]=l+(d[i]-l)*k; d[i+1]=l+(d[i+1]-l)*k; d[i+2]=l+(d[i+2]-l)*k;}
  x.putImageData(id,0,0);
}
function blurredSat(src,W,H){
  const b=blurred(src,W,H); if(BLUR.sat)return BLUR.sat;
  const c=tmp('blS',b.width,b.height,true); c.getContext('2d').drawImage(b,0,0); saturate(c,1.4); BLUR.sat=c; return c;
}

/* ---------- Bildanalyse: Helligkeit, Unruhe und Farbe im Raster ---------- */
let AN=null, anKey='';
function analyze(){
  if(!S.prev)return; const key=cropKey(); if(AN&&key===anKey)return;
  const c=tmp('an',AW,AH,true), x=c.getContext('2d'); x.imageSmoothingQuality='high';
  drawPhoto(x,S.prev,{x:0,y:0,w:AW,h:AH});
  const d=x.getImageData(0,0,AW,AH).data, n=AW*AH, vp=new Float32Array(n), g=new Float32Array(n);
  let sr=0,sg=0,sb=0,wr=0,wg=0,wb=0,ws=0;
  for(let i=0;i<n;i++){
    const r=d[4*i],gg=d[4*i+1],b=d[4*i+2];
    vp[i]=(0.2126*r+0.7152*gg+0.0722*b)/255;
    sr+=r; sg+=gg; sb+=b;
    const mx=Math.max(r,gg,b)/255, mn=Math.min(r,gg,b)/255, sat=mx-mn, wt=sat*sat*sat*(0.25+mx); /* stark farbige Stellen zählen viel mehr */
    wr+=r*wt; wg+=gg*wt; wb+=b*wt; ws+=wt;
  }
  let gs=0;
  for(let yy=0;yy<AH;yy++)for(let xx=0;xx<AW;xx++){
    const i=yy*AW+xx, r=xx<AW-1?Math.abs(vp[i]-vp[i+1]):0, b=yy<AH-1?Math.abs(vp[i]-vp[i+AW]):0;
    g[i]=r+b; gs+=g[i];
  }
  AN={vp,g,gMean:Math.max(gs/n,0.01),avg:[sr/n,sg/n,sb/n],dom:ws>1e-4?[wr/ws,wg/ws,wb/ws]:null,domW:ws/n}; anKey=key;
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

const TV={light:0.94,dark:0.11}, SV={light:0.04,dark:0.955};
/* Nötige Deckkraft eines Schattens oder einer Tönung, stufenlos per Halbierungssuche.
   v/sd: Helligkeit des Untergrunds, tintV: Helligkeit der Tönung, textV: Helligkeit der Schrift. */
function needTint(v,sd,tintV,textV,aMin){
  const worst=textV>0.5?Math.min(1,v+1.1*sd):Math.max(0,v-1.1*sd);
  const cAt=a=>contrastV(textV,worst*(1-a)+tintV*a);
  let a=clamp(aMin||0,0,1);
  if(cAt(a)<4.6){let lo=a,hi=1;for(let i=0;i<18;i++){const m=(lo+hi)/2;if(cAt(m)>=4.6)hi=m;else lo=m;}a=hi;}
  return {a,c:cAt(a)};
}
function need(st,mode,minA){
  const r=needTint(st.v,st.sd,SV[mode],TV[mode],0);
  const a=Math.min(0.9,Math.max(r.a+clamp((st.busy-1.2)*0.05,0,0.1),minA||0));
  return {a,c:contrastV(TV[mode],(mode==='light'?Math.min(1,st.v+1.1*st.sd):Math.max(0,st.v-1.1*st.sd))*(1-a)+SV[mode]*a)};
}
/* Helle oder dunkle Schrift; mit Trägheit, damit sie beim Verschieben nicht hin und her springt */
const MODE={};
let DRAG=null;
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

/* ---------- Glas ----------
   Glas wie auf der Website: weichgezeichnetes, kräftiger gesättigtes Foto, leicht vergrößert (wirkt wie eine Linse),
   darüber eine Tönung aus der Fotofarbe, oben eine Lichtkante, außen ein weicher Schatten.
   Die Tönung wird so kräftig wie nötig, damit der Text mindestens 4,5 : 1 Kontrast hat. Der Regler Glas legt nur das Minimum fest. */
function glassTint(mode){
  const a=(AN&&AN.avg)||[60,50,40], dk=[16,13,10], lt=[250,247,242];
  if(mode==='light')return [0,1,2].map(i=>a[i]*0.25+dk[i]*0.75); /* helle Schrift: dunkles Rauchglas mit einem Hauch Fotofarbe */
  return [0,1,2].map(i=>lt[i]*0.88+a[i]*0.12);                     /* dunkle Schrift: helles Milchglas */
}
function glassEdge(ctx,x,y,w,h,r,s,k,flat){
  ctx.save();
  rr(ctx,x,y,w,h,r); ctx.clip();
  const sh=ctx.createLinearGradient(0,y,0,y+Math.min(h,260*s));
  sh.addColorStop(0,`rgba(255,255,255,${(0.13*k).toFixed(3)})`); sh.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sh; ctx.fillRect(x,y,w,Math.min(h,260*s));
  if(flat){hline(ctx,x,x+w,y,1.4*s,`rgba(255,255,255,${(0.5*k).toFixed(3)})`); ctx.restore(); return;}
  const lw=1.4*s; rr(ctx,x+lw/2,y+lw/2,w-lw,h-lw,Math.max(0,r-lw/2));
  const g=ctx.createLinearGradient(0,y,0,y+h);
  g.addColorStop(0,`rgba(255,255,255,${(0.62*k).toFixed(3)})`); g.addColorStop(0.35,`rgba(255,255,255,${(0.1*k).toFixed(3)})`);
  g.addColorStop(0.75,`rgba(255,255,255,${(0.06*k).toFixed(3)})`); g.addColorStop(1,`rgba(255,255,255,${(0.24*k).toFixed(3)})`);
  ctx.strokeStyle=g; ctx.lineWidth=lw; ctx.stroke();
  ctx.restore();
}
function glassPanel(ctx,W,H,src,rect,r,env,key,pref,flat){
  const s=W/1000, st=stats(rect,W,H), bst={v:st.v,sd:st.sd*0.45,busy:1};
  const mode=decideMode(key,bst,pref,env), tint=glassTint(mode), tv=lumHex(rgbHex(tint));
  const g=S.d.glass, aMin=mode==='light'?lerp(0.74,0.16,g):lerp(0.86,0.34,g);
  const n=needTint(bst.v,bst.sd,tv,TV[mode],aMin);
  if(!flat){
    ctx.save(); ctx.shadowColor=`rgba(0,0,0,${mode==='light'?0.34:0.24})`; ctx.shadowBlur=46*s; ctx.shadowOffsetY=16*s;
    ctx.fillStyle=rgbHex(tint); rr(ctx,rect.x,rect.y,rect.w,rect.h,r); ctx.fill(); ctx.restore();
  }
  ctx.save(); rr(ctx,rect.x,rect.y,rect.w,rect.h,r); ctx.clip();
  const B=blurredSat(src,W,H), k=B.width/W, lens=1+0.07*(0.4+g*0.6), cx=rect.x+rect.w/2, cy=rect.y+rect.h/2;
  const sx=clamp(rect.x*k,0,B.width-1), sy=clamp(rect.y*k,0,B.height-1), sw=Math.max(1,Math.min(rect.w*k,B.width-sx)), sh=Math.max(1,Math.min(rect.h*k,B.height-sy));
  ctx.drawImage(B,sx,sy,sw,sh,cx-rect.w*lens/2,cy-rect.h*lens/2,rect.w*lens,rect.h*lens);
  ctx.fillStyle=`rgba(${tint.map(Math.round).join(',')},${n.a.toFixed(4)})`; ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  ctx.restore();
  glassEdge(ctx,rect.x,rect.y,rect.w,rect.h,r,s,mode==='light'?0.75:1,flat);
  const bgHex=rgbHex([0,1,2].map(i=>tint[i]*n.a+(AN?AN.avg[i]:128)*(1-n.a)));
  return {mode,c:n.c,col:colsMode(mode==='light'?'light':'dark',bgHex)};
}

/* ---------- Werbekennzeichnung ----------
   „WERBUNG“ auf jedem Pin oben in der Ecke, gut lesbar auf jedem Untergrund. Grund: Pinterest zeigt im Feed keine Beschreibung
   und vom Titel oft nichts; Werbung muss schon in der Vorschau-Kachel erkennbar sein.
   Größe bleibt so, dass die Schrift auch bei 236 Pixel Feedbreite lesbar ist (Versalhöhe rund 5 Pixel).
   Seit RoF Pins 6 steht das Label auf derselben Randlinie wie der Inhalt der Vorlage und nimmt die Farbe seines Untergrunds auf:
   Glas: Ton in Ton mit dem Untergrund (dunkler Grund: dunkles Rauchglas, helle Schrift). Linie: feine Kontur. Fläche: Akzentfarbe. */
const AD_TXT='WERBUNG', AD_FS=32, AD_Y=40;
function adGeom(ctx,s,W,mx){
  const fs=AD_FS*s, sp=fs*0.16, f=`600 ${fs}px ${F_S}`; ctx.font=f;
  const tw=spacedW(ctx,AD_TXT,sp), px=fs*0.6, h=fs*1.6, w=tw+2*px;
  const x=S.adSide==='right'?W-mx-w:mx;
  return {x,y:AD_Y*s,w,h,fs,sp,px,f};
}
/* Unterkante des Labels plus Abstand, falls es mit dem Bereich x0..x1 überlappt; sonst 0 */
function adClear(ctx,s,W,mx,x0,x1){
  if(!S.ad)return 0; const g=adGeom(ctx,s,W,mx);
  if(x1<g.x-18*s||x0>g.x+g.w+18*s)return 0;
  return g.y+g.h+24*s;
}
/* Untergrund unter dem Label aus der fertigen Vorlage lesen: weichzeichnen, Helligkeit und Streuung messen */
function backdrop(ctx,g,s){
  const cv=ctx.canvas, pad=g.h*0.7;
  const x0=Math.max(0,Math.floor(g.x-pad)), y0=Math.max(0,Math.floor(g.y-pad)), x1=Math.min(cv.width,Math.ceil(g.x+g.w+pad)), y1=Math.min(cv.height,Math.ceil(g.y+g.h+pad));
  const bw=Math.max(1,x1-x0), bh=Math.max(1,y1-y0), tw=Math.max(6,Math.round(bw/12)), th=Math.max(4,Math.round(bh/12));
  const a=tmp('bdA',tw,th,true), ax=a.getContext('2d'); ax.imageSmoothingEnabled=true; ax.imageSmoothingQuality='high';
  ax.drawImage(cv,x0,y0,bw,bh,0,0,tw,th);
  const id=ax.getImageData(0,0,tw,th), d=id.data;
  const ix0=Math.floor((g.x-x0)/bw*tw), ix1=Math.ceil((g.x+g.w-x0)/bw*tw), iy0=Math.floor((g.y-y0)/bh*th), iy1=Math.ceil((g.y+g.h-y0)/bh*th);
  let s1=0,s2=0,n=0; const rgb=[0,0,0];
  for(let yy=Math.max(0,iy0);yy<Math.min(th,iy1);yy++)for(let xx=Math.max(0,ix0);xx<Math.min(tw,ix1);xx++){
    const j=(yy*tw+xx)*4, v=(0.2126*d[j]+0.7152*d[j+1]+0.0722*d[j+2])/255; s1+=v; s2+=v*v; n++; rgb[0]+=d[j]; rgb[1]+=d[j+1]; rgb[2]+=d[j+2];
  }
  const v=n?s1/n:0.5, sd=n?Math.sqrt(Math.max(0,s2/n-v*v)):0.1; if(n){rgb[0]/=n;rgb[1]/=n;rgb[2]/=n;} else rgb.fill(128);
  for(let i=0;i<d.length;i+=4){const l=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; d[i]=l+(d[i]-l)*1.35; d[i+1]=l+(d[i+1]-l)*1.35; d[i+2]=l+(d[i+2]-l)*1.35;}
  ax.putImageData(id,0,0);
  const b=tmp('bdB',tw*3,th*3), bx=b.getContext('2d'); bx.imageSmoothingEnabled=true; bx.imageSmoothingQuality='high'; bx.drawImage(a,0,0,b.width,b.height);
  return {cv:b,x0,y0,bw,bh,v,sd,rgb};
}
/* Höhe der Großbuchstaben, damit Versalien in Label und Kapsel genau mittig sitzen.
   Nicht über measureText: dessen Ascent-Werte unterscheiden sich zwischen Browsern und hängen von textBaseline ab
   (Fehler in 6.0 bis 6.2: Text saß auf dem iPad zu hoch). Stattdessen wird ein „H“ einmal unsichtbar in großer Schrift
   gezeichnet und die Höhe an den echten Pixeln abgezählt. Ergebnis je Schrift gemerkt, neu bestimmt sobald Schriften geladen sind. */
const CAP=new Map();
function capRatio(font){
  const key=font.replace(/\d+(\.\d+)?px/,'200px'); const hit=CAP.get(key); if(hit)return hit;
  const c=document.createElement('canvas'); c.width=400; c.height=300;
  const x=c.getContext('2d',{willReadFrequently:true}); x.font=key; x.textBaseline='alphabetic'; x.fillStyle='#000'; x.fillText('H',60,250);
  const d=x.getImageData(0,0,400,300).data; let top=-1;
  for(let y=0;y<300&&top<0;y++)for(let xx=0;xx<400;xx++){if(d[(y*400+xx)*4+3]>127){top=y;break;}}
  let r=top>=0?(250-top)/200:0.7; if(!(r>0.4&&r<0.95))r=0.7;
  let ready=true; try{if(document.fonts&&document.fonts.check)ready=document.fonts.check(key,'H');}catch(_){}
  if(ready)CAP.set(key,r); /* erst merken, wenn die echte Schrift da ist */
  return r;
}
function capH(ctx,font,fs){return capRatio(font)*fs;}
function drawAd(ctx,W,H,s,mx){
  const g=adGeom(ctx,s,W,mx), r=S.d.round==='square'?4*s:g.h/2, st=S.adStyle;
  let textCol, c=7;
  ctx.save();
  if(st==='solid'){
    /* Fläche: Akzentfarbe, flach, nur eine feine helle Kante */
    const bg=solidAdHex();
    ctx.fillStyle=bg; rr(ctx,g.x,g.y,g.w,g.h,r); ctx.fill();
    const lw=1.2*s; ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=lw; rr(ctx,g.x+lw/2,g.y+lw/2,g.w-lw,g.h-lw,Math.max(0,r-lw/2)); ctx.stroke();
    textCol=CARD; c=contrastL(relLum(hexRgb(bg)),relLum(hexRgb(CARD)));
  }else{
    /* Glas (Standard): Ton in Ton. Das Label nimmt die Farbe seines Untergrunds auf, auf dunklem Grund abgedunkelt
       mit heller Schrift, auf hellem Grund aufgehellt mit dunkler Schrift. So trägt es dieselben Farben wie der Pin,
       statt als helle Fläche herauszustechen. Linie: nur so viel Tönung wie für den Kontrast nötig, dazu eine Kontur. */
    const bd=backdrop(ctx,g,s), darkBg=bd.v<0.55, lightText=darkBg;
    let tint, aMin;
    if(st==='glass'){
      tint=darkBg?bd.rgb.map(v=>v*0.3):bd.rgb.map(v=>v*0.22+252*0.78);
      aMin=lerp(0.66,0.36,S.d.glass);
    }else{tint=darkBg?[30,24,18]:[250,247,242]; aMin=0.12;}
    tint=tint.map(Math.round);
    const tv=lumHex(rgbHex(tint)), n=needTint(bd.v,bd.sd,tv,lightText?0.965:0.13,aMin);
    ctx.save(); rr(ctx,g.x,g.y,g.w,g.h,r); ctx.clip();
    const lens=1.04, cx=g.x+g.w/2, cy=g.y+g.h/2;
    ctx.save(); ctx.translate(cx,cy); ctx.scale(lens,lens); ctx.translate(-cx,-cy);
    ctx.drawImage(bd.cv,bd.x0,bd.y0,bd.bw,bd.bh); ctx.restore();
    ctx.fillStyle=`rgba(${tint.join(',')},${n.a.toFixed(4)})`; ctx.fillRect(g.x,g.y,g.w,g.h);
    ctx.restore();
    const lw=(st==='line'?1.6:1.1)*s;
    ctx.strokeStyle=st==='line'?(lightText?'rgba(246,243,238,0.9)':'rgba(42,32,24,0.8)'):(lightText?'rgba(255,255,255,0.2)':'rgba(42,32,24,0.16)');
    ctx.lineWidth=lw; rr(ctx,g.x+lw/2,g.y+lw/2,g.w-lw,g.h-lw,Math.max(0,r-lw/2)); ctx.stroke();
    textCol=lightText?'#F6F3EE':'#2A2018'; c=n.c;
  }
  const ch=capH(ctx,g.f,g.fs);
  ctx.fillStyle=textCol; ctx.font=g.f; ctx.textBaseline='alphabetic';
  drawSpaced(ctx,AD_TXT,g.x+g.px,g.y+g.h/2+ch/2,g.sp,'left');
  ctx.restore();
  return c;
}
/* Eine Vorlage zeichnen, danach das Werbelabel obenauf */
function drawPin(ctx,W,H,src,env,key){
  const r=R[key||S.tpl](ctx,W,H,src,env);
  if(S.ad){const c=drawAd(ctx,W,H,W/1000,r.mx!=null?r.mx:48*W/1000); r.c=Math.min(r.c,c);}
  return r;
}

/* ---------- Gemeinsame Teile der Vorlagen ---------- */
function anchorOf(o){return o.pos||null;}
function snapX(env,x,target,tol,W){if(env.drag&&Math.abs(x-target)<tol){env.guides.push({v:target/W});return target;}return x;}
function snapY(env,y,h,H,s){if(env.drag&&Math.abs(y+h/2-H/2)<14*s){env.guides.push({h:0.5});return H/2-h/2;}return y;}
function fullPhoto(ctx,W,H,src){const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr); return pr;}
/* Wortmarke und Webadresse unten auf dem Foto, mit eigenem weichen Schatten */
function photoBrand(ctx,W,H,s,mode,k){
  const bh=brandH(s,k), top=H-MAR(56)*s-bh;
  if(bh<=0)return {top,band:{from:H,to:H,fade:1,a:0},c:21};
  const st=stats({x:W/2-250*s,y:top,w:500*s,h:bh},W,H), n=need(st,mode,0.05);
  return {top,band:{from:top-16*s,to:H,fade:220*s,a:n.a},c:n.c};
}
/* Großer Schriftzug über die ganze Breite (Magazin) */
function mastSize(ctx,W,s,m){
  let ms=84*s*Math.min(1,bK()); for(;;){ctx.font=`600 ${ms}px ${F_L}`; if(spacedW(ctx,WM,ms*0.25)<=W-2*m||ms<=20*s)break; ms-=1*s;}
  return ms;
}

/* ---------- Die 11 Vorlagen ---------- */
const R={
  /* ===== Auf dem Foto ===== */
  /* Magazin: großer Schriftzug oben über die ganze Breite, feine Linie, Text unten links */
  cover(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.cover, pr=fullPhoto(ctx,W,H,src);
    const m=MAR(64)*s, top0=Math.max(MAR(52)*s,adClear(ctx,s,W,m,m,W-m));
    const lo=S.show.logo, ur=S.show.url, ms=lo?mastSize(ctx,W,s,m):0, uS=16*s*bK();
    const ruleY=top0+(lo?ms+16*s:0), mBot=lo||ur?ruleY+(ur?20*s+uS*1.1:6*s):top0;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:116,titleMin:50,titleLines:3,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1);
    const minY=mBot+GAP(70)*s, maxY=Math.max(minY,H-MAR(72)*s-bhh);
    const a=anchorOf(o); let y;
    if(a)y=a.y*H; else y=busyScore({x:m,y:maxY,w:Math.max(bw,W*0.5),h:bhh},W,H)<=busyScore({x:m,y:H*0.5,w:Math.max(bw,W*0.5),h:bhh},W,H)+0.15?maxY:H*0.5;
    y=clamp(y,minY,maxY); y=snapY(env,y,bhh,H,s);
    const rect={x:m,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('cover',st,o.color,env), t=need(st,mode,0.1);
    const mn=(lo||ur)?need(stats({x:m,y:top0,w:W-2*m,h:mBot-top0},W,H),mode,0.08):{a:0,c:21};
    scrim(ctx,W,H,{key:'cover',axis:'y',mode,bands:[{from:0,to:mBot+10*s,fade:220*s,a:mn.a},{from:y-24*s,to:y+bhh+24*s,fade:290*s,a:t.a}]},env);
    const col=colsMode(mode);
    ctx.textBaseline='middle';
    if(lo){ctx.font=`600 ${ms}px ${F_L}`; ctx.fillStyle=col.title; drawSpaced(ctx,WM,W/2,top0+ms/2,ms*0.25,'center'); ctx.fillStyle=col.rule; ctx.fillRect(m,ruleY,W-2*m,1.5*s);}
    if(ur){ctx.font=`400 ${uS}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,WEB,W/2,(lo?ruleY+20*s:top0)+uS*0.55,uS*0.12,'center');}
    drawBlock(ctx,b,m,y,'left',col);
    return {photo:pr,text:{rect,anchor:{x:m/W,y:y/H},axis:'y'},c:Math.min(t.c,mn.c),onPhoto:true,mx:m};
  },
  /* Mittellinie: Titel mittig, links und rechts feine Linien, Wortmarke unten */
  midline(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.midline, pr=fullPhoto(ctx,W,H,src);
    const m=MAR(56)*s, bh=brandH(s), brandTop=H-MAR(56)*s-bh;
    const b=buildBlock(ctx,s,W-2*150*s,{titleMax:100,titleMin:40,titleLines:2,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=Math.max(m+20*s,adClear(ctx,s,W,m,x,x+bw)), maxY=Math.max(minY,brandTop-(bh?80:40)*s-bhh);
    const a=anchorOf(o); let y=a?a.y*H:H*0.46-bhh/2;
    y=clamp(y,minY,maxY); y=snapY(env,y,bhh,H,s);
    const rect={x,y,w:bw,h:bhh}, st=stats({x:m,y,w:W-2*m,h:bhh},W,H);
    const mode=decideMode('midline',st,o.color,env), t=need(st,mode,0.12), br=photoBrand(ctx,W,H,s,mode);
    scrim(ctx,W,H,{key:'mid',axis:'y',mode,bands:[{from:y-30*s,to:y+bhh+30*s,fade:260*s,a:t.a},br.band]},env);
    const col=colsMode(mode);
    if(b.titleY!=null){
      const ly=y+b.titleY+b.titleH/2, gap=34*s, l0=W/2-b.titleW/2-gap, r0=W/2+b.titleW/2+gap;
      if(l0-m>36*s){hline(ctx,m,l0,ly,1.5*s,col.line);hline(ctx,r0,W-m,ly,1.5*s,col.line);}
    }
    drawBlock(ctx,b,W/2,y,'center',col); if(bh)drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,br.c),onPhoto:true,mx:m};
  },
  /* Ausgabe: kleine Wortmarke oben links mit Linie, Text unten */
  issue(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.issue, pr=fullPhoto(ctx,W,H,src);
    const m=MAR(64)*s, k=0.75, bh=brandH(s,k), bwm=brandW(ctx,s,k);
    const top0=Math.max(m,bh?adClear(ctx,s,W,m,m,m+bwm):0), hy=top0+bh+18*s;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:112,titleMin:44,titleLines:3,notesLines:2,scale:o.scale});
    const minY=Math.max(bh?hy+GAP(70)*s:m,adClear(ctx,s,W,m,m,m+b.w)), maxY=Math.max(minY,H-MAR(76)*s-b.h);
    const a=anchorOf(o); let y=a?a.y*H:maxY; y=clamp(y,minY,maxY); y=snapY(env,y,b.h,H,s);
    const rect={x:m,y,w:Math.max(b.w,1),h:Math.max(b.h,1)}, st=stats(rect,W,H);
    const mode=decideMode('issue',st,o.color,env), t=need(st,mode,0.12);
    const tn=bh?need(stats({x:m,y:top0,w:bwm,h:bh+20*s},W,H),mode,0.08):{a:0,c:21};
    scrim(ctx,W,H,{key:'issue',axis:'y',mode,bands:[{from:0,to:hy+14*s,fade:200*s,a:tn.a},{from:y-24*s,to:y+b.h+76*s,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    if(bh){drawBrand(ctx,s,m,top0,col,k,'left'); hline(ctx,m,m+bwm,hy,1.5*s,col.line);}
    drawBlock(ctx,b,m,y,'left',col);
    return {photo:pr,text:{rect,anchor:{x:m/W,y:y/H},axis:'y'},c:Math.min(t.c,tn.c),onPhoto:true,mx:m};
  },
  /* Buchrücken: Wortmarke senkrecht am linken Rand, Text unten */
  spine(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.spine, pr=fullPhoto(ctx,W,H,src);
    const k=0.85, bh=brandH(s,k), sx=MAR(44)*s, x=bh?sx+bh+50*s:MAR(64)*s, m=MAR(64)*s;
    const b=buildBlock(ctx,s,W-x-m,{titleMax:100,titleMin:38,titleLines:3,notesLines:2,scale:o.scale});
    const minY=Math.max(m,adClear(ctx,s,W,sx,x,x+b.w)), maxY=Math.max(minY,H-MAR(72)*s-b.h);
    const a=anchorOf(o); let y=a?a.y*H:maxY; y=clamp(y,minY,maxY); y=snapY(env,y,b.h,H,s);
    const rect={x,y,w:Math.max(b.w,1),h:Math.max(b.h,1)}, st=stats(rect,W,H);
    const mode=decideMode('spine',st,o.color,env), t=need(st,mode,0.12);
    const bw=brandW(ctx,s,k), sn=bh?need(stats({x:sx,y:H-72*s-bw,w:bh,h:bw},W,H),mode,0.08):{a:0,c:21};
    scrim(ctx,W,H,{key:'spineX',axis:'x',mode,bands:[{from:0,to:sx+bh+12*s,fade:190*s,a:sn.a}]},env);
    scrim(ctx,W,H,{key:'spineY',axis:'y',mode,bands:[{from:y-24*s,to:y+b.h+72*s,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    if(bh){ctx.save(); ctx.translate(sx,H-72*s); ctx.rotate(-Math.PI/2); drawBrand(ctx,s,0,0,col,k,'left'); ctx.restore();}
    drawBlock(ctx,b,x,y,'left',col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,sn.c),onPhoto:true,mx:sx};
  },

  /* ===== Glas ===== */
  /* Glaskarte: abgerundete Glasfläche über die Breite, Text links, Wortmarke unten in der Karte. Lässt sich nach oben ziehen. */
  glasscard(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.glasscard, pr=fullPhoto(ctx,W,H,src);
    const m=MAR(44)*s, pad=MAR(54)*s, cw=W-2*m, k=0.74;
    const b=buildBlock(ctx,s,cw-2*pad,{titleMax:90,titleMin:40,titleLines:3,notesLines:2,notesMax:27,scale:o.scale});
    const bh=brandH(s,k), sep=(bh&&b.h)?GAP(44)*s:0, ch=pad+b.h+sep+bh+pad*0.92;
    const minY=Math.max(m,adClear(ctx,s,W,m,m,W-m)), maxY=Math.max(minY,H-m-ch);
    const a=anchorOf(o); let y;
    if(a)y=a.y*H;
    else{
      const cands=[maxY,(H-ch)/2,minY]; let best=null;
      cands.forEach((c,i)=>{const yy=clamp(c,minY,maxY), sc=busyScore({x:m,y:yy,w:cw,h:ch},W,H)+i*0.25; if(!best||sc<best.sc)best={sc,yy};});
      y=best.yy;
    }
    y=clamp(y,minY,maxY); y=snapY(env,y,ch,H,s);
    const rect={x:m,y,w:cw,h:ch}, gp=glassPanel(ctx,W,H,src,rect,RAD(s,30),env,'glasscard',o.color,false);
    drawBlock(ctx,b,m+pad,y+pad,'left',gp.col);
    if(bh){
      const bt=y+ch-pad*0.92-bh;
      if(b.h)hline(ctx,m+pad,W-m-pad,bt-sep/2,1.2*s,gp.col.line);
      drawBrand(ctx,s,m+pad,bt,gp.col,k,'left');
    }
    return {photo:pr,text:{rect,anchor:{x:m/W,y:y/H},axis:'y'},c:gp.c,onPhoto:true,mx:m};
  },
  /* Glasleiste: Glas über die ganze Breite am unteren Rand, Text links, Wortmarke rechts unten */
  glassbar(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.glassbar, pr=fullPhoto(ctx,W,H,src);
    const pad=MAR(58)*s, inner=W-2*pad, lw=inner*0.64;
    const b=buildBlock(ctx,s,lw,{titleMax:78,titleMin:34,titleLines:3,notesLines:2,notesMax:25,scale:o.scale});
    const k=fitK(ctx,s,inner-lw-36*s,0.72), bh=brandH(s,k);
    const hb=pad*1.05+Math.max(b.h,bh)+pad, top=H-hb, rect={x:0,y:top,w:W,h:hb};
    const gp=glassPanel(ctx,W,H,src,rect,0,env,'glassbar',o.color,true);
    drawBlock(ctx,b,pad,top+pad*1.05,'left',gp.col);
    if(bh)drawBrand(ctx,s,W-pad,top+pad*1.05+Math.max(b.h,bh)-bh,gp.col,k,'right');
    return {photo:pr,text:null,c:gp.c,onPhoto:true,mx:pad};
  },
  /* Glas-Etikett: kompakte Glaskarte mit mittigem Text, frei verschiebbar */
  glasslabel(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.glasslabel, pr=fullPhoto(ctx,W,H,src);
    const pad=MAR(46)*s, bk=0.74, m=MAR(44)*s;
    const b=buildBlock(ctx,s,W*0.62,{titleMax:70,titleMin:34,titleLines:3,notesLines:2,notesMax:25,scale:o.scale});
    const bh=brandH(s,bk), lw=brandW(ctx,s,bk), gap=(b.h&&bh)?GAP(34)*s:0;
    const cw=Math.max(b.w,lw,320*s)+2*pad, ch=pad+b.h+gap+bh+pad*0.88;
    const a=anchorOf(o); let x,y;
    const tY=Math.max(m,adClear(ctx,s,W,m,(W-cw)/2,(W+cw)/2));
    if(a){x=a.x*W;y=a.y*H;}
    else{
      const cands=[[(W-cw)/2,H-m-ch-20*s],[(W-cw)/2,(H-ch)/2],[(W-cw)/2,tY]];
      let best=null; cands.forEach((c,i)=>{const sc=busyScore({x:c[0],y:c[1],w:cw,h:ch},W,H)+i*0.2; if(!best||sc<best.sc)best={sc,c};});
      x=best.c[0]; y=best.c[1];
    }
    x=clamp(x,m*0.5,W-m*0.5-cw);
    const yMin=Math.max(m*0.5,adClear(ctx,s,W,m,x,x+cw)); y=clamp(y,yMin,Math.max(yMin,H-m*0.5-ch));
    x=snapX(env,x+cw/2,W/2,14*s,W)-cw/2; y=snapY(env,y,ch,H,s);
    const rect={x,y,w:cw,h:ch}, gp=glassPanel(ctx,W,H,src,rect,RAD(s,28),env,'glasslabel',o.color,false);
    drawBlock(ctx,b,x+cw/2,y+pad,'center',gp.col);
    if(bh)drawBrand(ctx,s,x+cw/2,y+pad+b.h+gap,gp.col,bk);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'xy'},c:gp.c,onPhoto:true,mx:m};
  },

  /* ===== Fläche und Papier ===== */
  /* Fußband: Foto oben, Fläche unten mit Text links und Wortmarke rechts; Übergang weich oder als Kante */
  footband(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.footband, col=colsSurf(o.surf), pad=MAR(56)*s, inner=W-2*pad, lw=inner*0.62;
    const b=buildBlock(ctx,s,lw,{titleMax:72,titleMin:32,titleLines:3,notesLines:2,notesMax:25,scale:o.scale});
    const k=fitK(ctx,s,inner-lw-36*s,0.72), bh=brandH(s,k);
    const hb=pad+Math.max(b.h,bh)+pad*0.95, top=H-hb, soft=o.edge!=='hard';
    let pr;
    if(soft){pr=fullPhoto(ctx,W,H,src); fillSurfFade(ctx,o.surf,W,H,top,150*s);}
    else{pr={x:0,y:0,w:W,h:top}; drawPhoto(ctx,src,pr); fillSurf(ctx,o.surf,W,H,{x:0,y:top,w:W,h:hb});}
    drawBlock(ctx,b,pad,top+pad,'left',col);
    if(bh)drawBrand(ctx,s,W-pad,top+pad+Math.max(b.h,bh)-bh,col,k,'right');
    return {photo:pr,text:null,c:surfC(o.surf),mx:pad};
  },
  /* Polaroid: weichgezeichnetes Foto als Hintergrund, Karte mit Foto und Text, Wortmarke darunter */
  polaroid(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.polaroid, sf=SURF[o.surf]||SURF.off, col=colsSurf(o.surf);
    ctx.drawImage(blurredSat(src,W,H),0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.30)'; ctx.fillRect(0,0,W,H);
    const cw=W*0.8, pm=36*s, pw=cw-2*pm, bh=brandH(s), left=(W-cw)/2, cr=RAD(s,10);
    const b=buildBlock(ctx,s,pw-30*s,{titleMax:66,titleLines:2,notesLines:2,notesMax:26,scale:o.scale});
    const textH=(b.h?GAP(34)*s+b.h:0)+GAP(50)*s, bgap=bh?50*s:0;
    const t0=Math.max(36*s,adClear(ctx,s,W,left,left,left+cw));
    let ph=Math.min(pw*1.04,H-t0-44*s-pm-textH-bgap-bh);
    ph=Math.max(ph,H*0.3);
    const cardH=pm+ph+textH, total=cardH+bgap+bh;
    const top=Math.max(t0,(H-total)/2), btop=top+cardH+bgap;
    let n={a:0,c:21};
    if(bh){
      const st=stats({x:W/2-250*s,y:btop,w:500*s,h:bh},W,H), dim={v:st.v*0.7,sd:0,busy:1};
      n=need(dim,'light',0.05);
      scrim(ctx,W,H,{key:'polB',axis:'y',mode:'light',bands:[{from:btop-10*s,to:H,fade:160*s,a:n.a}]},env);
    }
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.38)'; ctx.shadowBlur=46*s; ctx.shadowOffsetY=14*s;
    ctx.fillStyle=surfBg(o.surf); rr(ctx,left,top,cw,cardH,cr); ctx.fill(); ctx.restore();
    fillSurf(ctx,o.surf,W,H,c=>rr(c,left,top,cw,cardH,cr));
    const pr={x:left+pm,y:top+pm,w:pw,h:ph};
    ctx.save(); rr(ctx,pr.x,pr.y,pr.w,pr.h,RAD(s,4)); ctx.clip(); drawPhoto(ctx,src,pr); ctx.restore();
    if(!sf.dark){ctx.save(); rr(ctx,pr.x,pr.y,pr.w,pr.h,RAD(s,4)); ctx.strokeStyle='rgba(26,26,26,0.08)'; ctx.lineWidth=1*s; ctx.stroke(); ctx.restore();}
    if(b.h)drawBlock(ctx,b,W/2,top+pm+ph+GAP(34)*s,'center',col);
    if(bh)drawBrand(ctx,s,W/2,btop,colsMode('light'));
    return {photo:pr,text:null,c:Math.min(n.c,surfC(o.surf)),mx:left};
  },
  /* Feuilleton: Papierseite mit Wortmarke, doppelter Linie, Foto und Text darunter */
  feuilleton(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.feuilleton, col=colsSurf(o.surf), m=MAR(64)*s, k=0.8, bh=brandH(s,k), bwm=brandW(ctx,s,k);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const top0=Math.max(m,bh?adClear(ctx,s,W,m,m,m+bwm):adClear(ctx,s,W,m,m,W-m)); if(bh)drawBrand(ctx,s,m,top0,col,k,'left');
    const r1=top0+(bh?bh+22*s:0); hline(ctx,m,W-m,r1,2.5*s,col.title); hline(ctx,m,W-m,r1+7*s,1*s,col.title);
    const b=buildBlock(ctx,s,W-2*m,{titleMax:92,titleMin:38,titleLines:3,notesLines:2,notesMax:26,scale:o.scale});
    const py=r1+GAP(40)*s, pw=W-2*m, bot=H-m;
    const ph=clamp(bot-GAP(30)*s-b.h-GAP(48)*s-py,H*0.3,pw*0.96);
    const pr={x:m,y:py,w:pw,h:ph};
    ctx.save(); rr(ctx,pr.x,pr.y,pr.w,pr.h,RAD(s,6)); ctx.clip(); drawPhoto(ctx,src,pr); ctx.restore();
    drawBlock(ctx,b,m,py+ph+GAP(48)*s,'left',col);
    hline(ctx,m,W-m,bot,1*s,col.title);
    return {photo:pr,text:null,c:surfC(o.surf),mx:m};
  },
  /* Papier: wie eine Seite der Website. Kopfzeile mit Wortmarke und Webadresse, darunter eine helle Karte mit Foto und Text. */
  paper(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.paper, sf=SURF[o.surf]||SURF.off, pcol=colsSurf(o.surf), m=MAR(52)*s;
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const p=brandParts(s,0.8), lo=p.lo, ur=p.ur;
    ctx.font=`600 ${p.L}px ${F_L}`; const lw=lo?spacedW(ctx,WM,p.L*0.3):0;
    ctx.font=`400 ${p.u}px ${F_S}`; const uw=ur?spacedW(ctx,WEB,p.u*0.06):0;
    const oneRow=lo&&ur&&lw+uw+40*s<=W-2*m, hh=lo||ur?(oneRow?p.L*1.2:p.h):0;
    let top0=m*0.9;
    if(hh){
      const c1=lo?adClear(ctx,s,W,m,m,m+lw):0, c2=ur?(oneRow?adClear(ctx,s,W,m,W-m-uw,W-m):adClear(ctx,s,W,m,m,m+Math.max(lw,uw))):0;
      top0=Math.max(top0,c1,c2);
    }else top0=Math.max(top0,adClear(ctx,s,W,m,m,W-m)-24*s);
    ctx.textBaseline='middle';
    if(hh){
      if(oneRow){
        ctx.font=`600 ${p.L}px ${F_L}`; ctx.fillStyle=pcol.logo; drawSpaced(ctx,WM,m,top0+p.L*0.6,p.L*0.3,'left');
        ctx.font=`400 ${p.u}px ${F_S}`; ctx.fillStyle=pcol.url; drawSpaced(ctx,WEB,W-m,top0+p.L*0.62,p.u*0.06,'right');
      }else drawBrand(ctx,s,m,top0,pcol,0.8,'left');
    }
    const hy=top0+hh+(hh?20*s:0);
    if(hh)hline(ctx,m,W-m,hy,1.2*s,sf.dark?'rgba(242,240,235,0.3)':CARDLINE);
    const cx=m, cy=hy+GAP(30)*s, cw=W-2*m, ch=H-m-cy, cr=RAD(s,16), tp=MAR(44)*s;
    const ccol=colsSurf('paper');
    const b=buildBlock(ctx,s,cw-2*tp,{titleMax:78,titleMin:34,titleLines:3,notesLines:2,notesMax:25,scale:o.scale});
    const ph=Math.max(H*0.28,ch-tp*0.9-b.h-tp*0.95);
    ctx.save(); ctx.shadowColor=sf.dark?'rgba(0,0,0,0.3)':'rgba(60,40,20,0.12)'; ctx.shadowBlur=34*s; ctx.shadowOffsetY=10*s;
    ctx.fillStyle=CARD; rr(ctx,cx,cy,cw,ch,cr); ctx.fill(); ctx.restore();
    const pr={x:cx,y:cy,w:cw,h:ph};
    ctx.save(); rr(ctx,cx,cy,cw,ch,cr); ctx.clip(); drawPhoto(ctx,src,pr); ctx.restore();
    ctx.save(); rr(ctx,cx+0.6*s,cy+0.6*s,cw-1.2*s,ch-1.2*s,Math.max(0,cr-0.6*s)); ctx.strokeStyle=CARDLINE; ctx.lineWidth=1.2*s; ctx.stroke(); ctx.restore();
    hline(ctx,cx+1.2*s,cx+cw-1.2*s,cy+ph,1*s,'rgba(255,255,255,0.7)');
    drawBlock(ctx,b,cx+tp,cy+ph+tp*0.9,'left',ccol);
    return {photo:pr,text:null,c:Math.min(surfC(o.surf),contrastL(relLum(hexRgb(CARD)),relLum(hexRgb(INK)))),mx:m};
  }
};

/* ---------- Vorschau ---------- */
const mainCv=$('main');
let LAST=null, raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;renderMain();});}
function renderMain(){
  if(!S.prev)return;
  needMore=false; analyze();
  const W=mainCv.width, H=mainCv.height, ctx=mainCv.getContext('2d');
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,H);
  const env={kind:'main',drag:!!(DRAG&&DRAG.type==='text'),guides:[]};
  const r=drawPin(ctx,W,H,S.prev,env); LAST={r,W,H};
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
    const t=r.text.rect; rr(ctx,t.x-12*k,t.y-12*k,t.w+24*k,t.h+24*k,8*k); ctx.stroke();
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
  if(!TPL[key])key=TPL_FALLBACK;
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
    drawPin(ctx,W,H,S.prev,{kind:'thumb',drag:false,guides:[]},t.key);
  });
}

/* ---------- Bedienelemente ---------- */
function changed(){schedule();schedThumbs();saveState();}
function el(tag,cls,txt){const e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e;}
function seg(parent,label,options,get,set,opts){
  opts=opts||{};
  const g=el('div','ctl'+(opts.inline?' inline':''));
  const lb=el('span','lbl',label);
  const sg=el('div','seg'+(opts.wrap?' wrap':'')); sg.setAttribute('role','group'); sg.setAttribute('aria-label',label);
  options.forEach(([val,txt])=>{
    const b=el('button',null,txt); b.type='button'; b.setAttribute('aria-pressed',String(get()===val));
    b.addEventListener('click',()=>{set(val); sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); changed();});
    sg.append(b);
  });
  g.append(lb,sg); parent.append(g); return sg;
}
let rangeN=0;
function range(parent,label,min,max,step,get,set,fmt,def){
  const id='rg'+(++rangeN), g=el('div','ctl inline');
  const lb=el('label','lbl',label); lb.htmlFor=id;
  const wr=el('div','range');
  const r=el('input'); r.type='range'; r.id=id; r.min=String(min); r.max=String(max); r.step=String(step); r.value=String(get());
  const out=el('button','val',fmt(get())); out.type='button'; out.title='Tippen setzt zurück'; out.setAttribute('aria-label',label+' zurücksetzen');
  const upd=()=>{out.textContent=fmt(get());};
  r.addEventListener('input',()=>{const v=parseFloat(r.value); set(isFinite(v)?v:def); upd(); changed();});
  out.addEventListener('click',()=>{set(def); r.value=String(def); upd(); changed();});
  wr.append(r,out); g.append(lb,wr); parent.append(g); return r;
}
function sw(parent,label,get,set){
  const l=el('label','sw'), i=el('input'); i.type='checkbox'; i.checked=!!get();
  i.addEventListener('change',()=>{set(i.checked); changed();});
  l.append(i,el('span','tr'),document.createTextNode(label)); parent.append(l); return i;
}
const pct=v=>Math.round(v*100)+' %', spct=v=>{const n=Math.round(v*100); return (n>0?'+':'')+n+' %';};

/* ---------- Stil-Bereich mit Unterbereichen ---------- */
const STABS=[['tpl','Vorlage'],['text','Schrift'],['form','Glas und Form'],['ad','Werbung'],['saved','Stile']];
function buildStabs(){
  const box=$('stabs'); box.textContent='';
  STABS.forEach(([k,t])=>{
    const b=el('button',null,t); b.type='button'; b.setAttribute('aria-pressed',String(S.stab===k));
    b.addEventListener('click',()=>{S.stab=k; box.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); buildStyle(); $('panel').scrollTop=0; saveState();});
    box.append(b);
  });
}
function buildStyle(){
  const box=$('styleBox'); box.textContent='';
  const t=TPL[S.tpl], o=S.opt[S.tpl];
  if(S.stab==='tpl'){
    box.append(el('p','sub','Vorlage '+t.name));
    if(t.ctl.includes('surf'))seg(box,'Fläche',Object.keys(SURF).map(k=>[k,SURF[k].name]),()=>o.surf,v=>{o.surf=v;},{wrap:true});
    if(t.ctl.includes('color'))seg(box,t.group==='Glas'?'Glas und Schrift':'Schrift',[['auto','Auto'],['light','Hell'],['dark','Dunkel']],()=>o.color,v=>{o.color=v;},{inline:true});
    if(t.ctl.includes('edge'))seg(box,'Übergang',[['soft','Weich'],['hard','Kante']],()=>o.edge,v=>{o.edge=v;},{inline:true});
    if(t.ctl.includes('scale'))range(box,'Textgröße',0.8,1.3,0.01,()=>o.scale,v=>{o.scale=clamp(v,0.8,1.3);},pct,1);
    if(t.ctl.includes('reset')){
      const row=el('div','rowc'); row.style.marginTop='0';
      const b=el('button','btn','Position automatisch'); b.type='button';
      b.addEventListener('click',()=>{o.pos=null; schedule(); toast('Position wird wieder automatisch gewählt.');});
      row.append(b,el('span','hint','Oder Text im Bild ziehen.')); box.append(row);
    }else box.append(el('p','hint','Bei dieser Vorlage steht der Text fest. Verschieben geht bei „Auf dem Foto“, Glaskarte und Glas-Etikett.'));
  }
  if(S.stab==='text'){
    box.append(el('p','sub','Elemente'));
    const g=el('div','swgrid'); box.append(g);
    [['logo','Wortmarke'],['url','Webadresse'],['brand','Marke und Duft'],['notes','Kernnoten'],['extra','Rubrik-Wort']].forEach(([k,l])=>sw(g,l,()=>S.show[k],v=>{S.show[k]=v;}));
    seg(box,'Titel',[['500','Normal'],['600','Kräftig']],()=>S.d.weight,v=>{S.d.weight=v;},{inline:true});
    seg(box,'Akzentfarbe',[['petrol','Petrol'],['brown','Braun'],['photo','Aus dem Foto']],()=>S.d.accent,v=>{S.d.accent=v;},{inline:true});
    range(box,'Luft',0.7,1.4,0.01,()=>S.d.air,v=>{S.d.air=clamp(v,0.7,1.4);},pct,1);
    range(box,'Logo und Webadresse',0.7,1.4,0.01,()=>S.brandK,v=>{S.brandK=clamp(v,0.7,1.4);},pct,1);
    box.append(el('p','hint','Kursiv: im Titel ein Wort mit Sternchen umschließen, z. B. „Weiches *Leder*“. Akzentfarbe wirkt auf hellem Grund (Marke, Rubrik, Linie, Wortmarke).'));
  }
  if(S.stab==='form'){
    range(box,'Glas',0,1,0.01,()=>S.d.glass,v=>{S.d.glass=clamp(v,0,1);},v=>v<0.34?'Matt':v<0.67?'Mittel':'Klar',0.5);
    seg(box,'Ecken',[['soft','Weich'],['square','Eckig']],()=>S.d.round,v=>{S.d.round=v;},{inline:true});
    box.append(el('p','hint','Glas wirkt bei den Glas-Vorlagen und beim WERBUNG-Label. Klares Glas wird automatisch kräftiger getönt, wenn sonst der Kontrast nicht reicht.'));
  }
  if(S.stab==='ad'){
    const g=el('div','rowc'); g.style.marginTop='0'; box.append(g);
    sw(g,'WERBUNG im Bild',()=>S.ad,v=>{S.ad=v; adNote();});
    const note=el('p','warn','Ohne WERBUNG im Bild: im Pin-Titel „Werbung |“ voranstellen. Ausschalten nur bei Artikeln ohne Affiliate-Link.'); note.id='adNote'; box.append(note);
    seg(box,'Stil',[['glass','Glas'],['line','Linie'],['solid','Fläche']],()=>S.adStyle,v=>{S.adStyle=v;},{inline:true});
    seg(box,'Position',[['left','Oben links'],['right','Oben rechts']],()=>S.adSide,v=>{S.adSide=v;},{inline:true});
    box.append(el('p','hint','Die Größe bleibt fest, damit WERBUNG auch in der kleinen Feed-Kachel lesbar ist. Die Farbe passt sich dem Untergrund an.'));
    adNote();
  }
  if(S.stab==='saved')buildSaved(box);
}
function adNote(){const n=$('adNote'); if(n)n.hidden=S.ad;}

/* ---------- Eigene Stile ---------- */
function loadStyles(){try{const a=JSON.parse(localStorage.getItem(STYLES)||'[]'); return Array.isArray(a)?a.filter(x=>x&&typeof x.name==='string'):[];}catch(_){return [];}}
function storeStyles(a){try{localStorage.setItem(STYLES,JSON.stringify(a)); return true;}catch(_){toast('Speichern nicht möglich (Speicher des Browsers voll oder gesperrt).'); return false;}}
function snapStyle(name){return {name,tpl:S.tpl,d:Object.assign({},S.d),show:Object.assign({},S.show),adStyle:S.adStyle,adSide:S.adSide,brandK:S.brandK,extraPos:S.text.extraPos,opt:optSnap([S.tpl])};}
function applyStyle(p){
  readD(p.d); readShow(p.show); readAd(p); readOpt(p.opt);
  if(typeof p.brandK==='number'&&isFinite(p.brandK))S.brandK=clamp(p.brandK,0.7,1.4);
  if(p.extraPos==='top'||p.extraPos==='bottom'){S.text.extraPos=p.extraPos; syncExtraSeg();}
  selectTpl(TPL[p.tpl]?p.tpl:S.tpl); buildPhoto(); changed(); toast('Stil „'+p.name+'“ angewendet.');
}
function buildSaved(box){
  const list=loadStyles();
  box.append(el('p','sub','Aktuellen Stil speichern'));
  const row=el('div','prow'), inp=el('input'); inp.type='text'; inp.maxLength=40; inp.placeholder='Name, z. B. Herbst Glas'; inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Name des Stils');
  const sv=el('button','btn acc','Speichern'); sv.type='button';
  const save=()=>{
    const nm=(inp.value.trim()||('Stil '+(list.length+1))).slice(0,40), a=loadStyles(), i=a.findIndex(x=>x.name===nm), p=snapStyle(nm);
    if(i>=0)a[i]=p; else{ if(a.length>=20){toast('Höchstens 20 Stile. Bitte erst einen löschen.');return;} a.push(p);}
    if(storeStyles(a)){toast(i>=0?'Stil „'+nm+'“ aktualisiert.':'Stil „'+nm+'“ gespeichert.'); buildStyle();}
  };
  sv.addEventListener('click',save); inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault(); inp.blur(); save();}});
  row.append(inp,sv); box.append(row);
  box.append(el('p','hint','Gespeichert werden Vorlage, Fläche, Design-Werte, Elemente und WERBUNG-Stil, nicht die Texte. Gleicher Name überschreibt.'));
  if(!list.length){box.append(el('p','hint','Noch keine eigenen Stile.')); return;}
  box.append(el('p','sub','Meine Stile'));
  const pl=el('div','plist'); box.append(pl);
  list.forEach((p,idx)=>{
    const r=el('div','prow'), ap=el('button','btn',p.name+' · '+((TPL[p.tpl]&&TPL[p.tpl].name)||'Vorlage')); ap.type='button';
    ap.addEventListener('click',()=>applyStyle(p));
    const del=el('button','btn danger','Löschen'); del.type='button'; let armed=false, tm=0;
    del.addEventListener('click',()=>{
      if(!armed){armed=true; del.textContent='Wirklich?'; clearTimeout(tm); tm=setTimeout(()=>{armed=false; del.textContent='Löschen';},3000); return;}
      const a=loadStyles(); a.splice(idx,1); if(storeStyles(a)){toast('Stil gelöscht.'); buildStyle();}
    });
    r.append(ap,del); pl.append(r);
  });
}

/* ---------- Bedienung im Bild: Text ziehen, Foto ziehen, mit zwei Fingern zoomen, Tippen klappt das Bedienfeld ein ---------- */
const ptrs=new Map();
let tap=null;
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
  if(document.activeElement&&document.activeElement.blur&&document.activeElement!==document.body)document.activeElement.blur();
  if(ptrs.size>=2){tap=null; DRAG=startPinch(); schedule(); return;}
  tap={x:e.clientX,y:e.clientY,t:performance.now()};
  const t=LAST.r.text;
  if(t&&inRect(p,t.rect,22*p.k)){DRAG={type:'text',p0:p,a0:{x:t.anchor.x,y:t.anchor.y},axis:t.axis,moved:false};}
  else DRAG=startPan(p);
  schedule();
});
mainCv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){ /* Mauszeiger: zeigen, dass Text greifbar ist */
    if(LAST&&LAST.r.text&&e.pointerType==='mouse'){const p=toCv(e);mainCv.style.cursor=inRect(p,LAST.r.text.rect,22*p.k)?'grab':(LAST.r.photo?'move':'default');}
    return;
  }
  if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;
  const p=toCv(e); ptrs.set(e.pointerId,p); if(!DRAG)return;
  const W=mainCv.width, H=mainCv.height;
  if(DRAG.type==='text'){
    if(!DRAG.moved&&Math.hypot(p.x-DRAG.p0.x,p.y-DRAG.p0.y)<4*p.k)return; /* kleines Zittern ist noch kein Ziehen */
    DRAG.moved=true;
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
    const wasTap=tap&&e.type==='pointerup'&&performance.now()-tap.t<350; tap=null;
    if(DRAG&&(DRAG.type==='pan'||DRAG.type==='pinch')&&LAST&&LAST.r.photo)normCrop(LAST.r.photo.w/LAST.r.photo.h);
    DRAG=null; schedule(); schedThumbs(); if(thumbPending)renderThumbs();
    if(wasTap&&isBig()){S.compact=true; panelSize();}
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

/* ---------- Menüleiste und Größe des Bedienfelds ----------
   Hochformat: Vorlagen bleibt kompakt (Leiste mit Vorschaubildern). Text, Stil und Foto öffnen sich so weit wie nötig,
   die Vorschau wird kleiner. Tippen auf die Vorschau oder auf den Griff klappt ein, Tippen auf einen Reiter klappt wieder auf. */
const app=$('app');
function isBig(){return S.tab!=='tpl'&&!S.compact;}
function panelSize(){
  const big=isBig()?'1':'0';
  if(app.dataset.big!==big){app.dataset.big=big; requestAnimationFrame(layout);}
}
function setTab(tab){
  S.tab=tab; S.compact=false;
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  document.querySelectorAll('#panel [data-pane]').forEach(p=>{p.hidden=p.dataset.pane!==tab;});
  $('panel').scrollTop=0; panelSize();
  if(tab==='tpl')requestAnimationFrame(renderThumbs);
}
document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
$('grab').addEventListener('click',()=>{
  if(S.tab==='tpl'){setTab('text'); return;}
  S.compact=!S.compact; panelSize();
});
$('panel').addEventListener('focusin',()=>{if(S.compact&&S.tab!=='tpl'){S.compact=false; panelSize();}});

/* ---------- Text ---------- */
function checkWarn(){
  const t=[S.text.brand,S.text.name,S.text.notes,S.text.extra].join(' '), m=[];
  if(/&/.test(t))m.push('„und“ statt „&“ schreiben.');
  if(/€|\beuro\b|\d+\s?%|\bunter\s+\d+/i.test(t))m.push('Keine Preis- oder Rabattangaben auf Pins.');
  if(/\b(im test|getestet|testbericht|praxistest)\b/i.test(t))m.push('Kein „im Test“ oder „getestet“.');
  if(/\bversus\b/i.test(t))m.push('„vs“ statt „versus“ schreiben.');
  if(/\bboozy\b/i.test(t))m.push('„boozy“ deutsch umschreiben, z. B. „cognacwarm“.');
  if(/oriental|exotisch/i.test(t))m.push('Begriff aus dem Sprachleitfaden vermeiden.');
  if(((S.text.name||'').match(/\*/g)||[]).length%2===1)m.push('Im Titel fehlt ein schließendes Sternchen; das letzte wird ignoriert.');
  if(/\*/.test(S.text.brand+S.text.notes+S.text.extra))m.push('Sternchen wirken nur im Titel.');
  const w=$('warn'); w.hidden=!m.length; w.textContent=m.join(' ');
}
['brand','name','notes','extra'].forEach(id=>{
  const f=$(id);
  f.addEventListener('input',()=>{
    if(f.value.indexOf("'")>-1){const p=f.selectionStart; f.value=f.value.replace(/'/g,'’'); try{f.setSelectionRange(p,p);}catch(_){}}
    S.text[id]=f.value; checkWarn(); changed(); fontsReady(f.value).then(schedule);
  });
  if(id!=='name')f.addEventListener('keydown',e=>{if(e.key==='Enter')f.blur();}); /* im Titel macht Enter eine neue Zeile */
});
const extraSeg=$('extraSeg');
[['top','Oben als Rubrik'],['bottom','Unten als Hinweis']].forEach(([v,t])=>{
  const b=el('button',null,t); b.type='button'; b.dataset.v=v;
  b.addEventListener('click',()=>{S.text.extraPos=v; syncExtraSeg(); changed();});
  extraSeg.append(b);
});
function syncExtraSeg(){extraSeg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.text.extraPos)));}

/* ---------- Foto ---------- */
let zoomR=null;
function syncZoom(){if(zoomR){zoomR.value=String(S.crop.z); zoomR.nextSibling.textContent=pct(S.crop.z);}}
function buildPhoto(){
  const box=$('photoBox'); box.textContent='';
  zoomR=range(box,'Zoom',1,4,0.01,()=>S.crop.z,v=>{S.crop.z=clamp(v,1,4); if(LAST&&LAST.r.photo)normCrop(LAST.r.photo.w/LAST.r.photo.h);},pct,1);
  range(box,'Helligkeit',-0.5,0.5,0.01,()=>S.d.bright,v=>{S.d.bright=clamp(v,-0.5,0.5);},spct,0);
  range(box,'Wärme',-0.5,0.5,0.01,()=>S.d.warm,v=>{S.d.warm=clamp(v,-0.5,0.5);},spct,0);
}
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
  AN=null; ADJ={k:'',cv:null}; BLUR.key=''; BLUR.cv=null; BLUR.sat=null; changed();
}
function pickFile(){$('file').click();}
$('openBtn').addEventListener('click',pickFile); $('pickBtn').addEventListener('click',pickFile);
$('file').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  $('fileErr').hidden=true;
  const url=URL.createObjectURL(f), img=new Image();
  img.onload=()=>{
    if(S.objUrl)URL.revokeObjectURL(S.objUrl); /* altes Foto aus dem Speicher lösen */
    S.objUrl=url; setImage(img,false); toast('Foto geladen. Text und Foto lassen sich im Bild verschieben.');
  };
  img.onerror=()=>{URL.revokeObjectURL(url); $('fileErr').hidden=false; setTab('photo'); toast('Das Foto ließ sich nicht öffnen.');};
  img.src=url; e.target.value='';
});

/* ---------- Schriften ---------- */
const FONT_SPECS=['500 40px "Playfair Display"','600 40px "Playfair Display"','italic 500 40px "Playfair Display"','italic 600 40px "Playfair Display"','400 40px Figtree','500 40px Figtree','600 40px Figtree','600 40px "Cormorant Garamond"'];
function fontsReady(extra){
  if(!document.fonts||!document.fonts.load)return Promise.resolve();
  const t='AaÄäÖöÜüßÊêÉéÈèÂâ’„“REALM OF FRAGRANCE WERBUNG realmoffragrance.com '+(extra||'');
  return Promise.all(FONT_SPECS.map(f=>document.fonts.load(f,t))).then(()=>{MW.clear();CAP.clear();}).catch(()=>{});
}

/* ---------- Speichern ---------- */
function slug(t){
  return (t||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’'*]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'pin';
}
function fileName(){return `pin-${slug(S.text.brand.trim()||S.text.name)}-${slug(TPL[S.tpl].name)}.jpg`;}
function saveInfo(){
  const W=S.size, H=W*1.5; let t=`${W} × ${H} Pixel, JPEG mit Qualität 100 %.`;
  if(!S.isSample&&S.full&&LAST&&LAST.r.photo){
    const pr=LAST.r.photo, d=dims(S.full), c=getCrop(d.w,d.h,pr.w/pr.h,S.crop,S.crop.z), needW=pr.w/LAST.W*W;
    if(c.cw<needW*0.95)t+=` Dein Ausschnitt hat ${Math.round(c.cw)} Pixel Breite und wird hochgerechnet. Mit weniger Zoom oder 1000 × 1500 bleibt er schärfer.`;
  }
  $('saveInfo').textContent=t;
}
(function(){
  const sg=$('sizeSeg');
  [[2000,'2000 × 3000'],[1000,'1000 × 1500']].forEach(([v,txt])=>{
    const b=el('button',null,txt); b.type='button'; b.dataset.v=String(v);
    b.addEventListener('click',()=>{S.size=v; sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); saveInfo(); saveState();});
    sg.append(b);
  });
})();
$('saveBtn').addEventListener('click',()=>{
  $('sizeSeg').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(S.size))));
  saveInfo(); $('saveSheet').hidden=false; $('saveGo').focus();
});
$('saveCancel').addEventListener('click',()=>{$('saveSheet').hidden=true;});
$('saveSheet').addEventListener('click',e=>{if(e.target===$('saveSheet'))$('saveSheet').hidden=true;});
let toastT=0;
function toast(msg){const t=$('toast'); t.onclick=null; t.style.cursor=''; t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{t.hidden=true;},3000);}
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
  drawPin(ctx,W,H,S.full,{kind:'export',drag:false,guides:[]});
  const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',1));
  c.width=1; c.height=1;
  /* Papierstruktur in Speichergröße wird nicht mehr gebraucht: freigeben, damit der Canvas-Speicher auf dem iPad reicht */
  for(const [k,v] of [...TEX]){if(k.indexOf(W+'x'+H)===0){v.width=1;v.height=1;TEX.delete(k);}}
  BLUR.key=''; return blob;
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
function fitViewport(){
  const vv=window.visualViewport, h=vv?vv.height:window.innerHeight;
  app.style.height=h+'px'; app.style.setProperty('--apph',h+'px');
  app.style.transform=vv&&vv.offsetTop?`translateY(${vv.offsetTop}px)`:'';
}
if(window.visualViewport){visualViewport.addEventListener('resize',fitViewport);visualViewport.addEventListener('scroll',fitViewport);}
window.addEventListener('resize',fitViewport);
if(window.ResizeObserver)new ResizeObserver(layout).observe($('stage')); else window.addEventListener('resize',layout);

/* Testzugang für automatische Prüfungen */
window.__rofpins={S,R,TPLS,drawPin,exportBlob,selectTpl,setTab,renderThumbs,setImage,buildStyle,LAST:()=>LAST,AN:()=>AN,capRatio,toneHex,accentFor,solidAdHex,adGeom,buildBlock};

/* ---------- Version und automatische Aktualisierung ----------
   Die Versionsnummer kommt aus dem Skript-Aufruf in index.html (app.js?v=…), es gibt also nur eine Stelle zum Ändern.
   Auf dem Home-Bildschirm läuft die App beim Wechseln oft einfach weiter, ohne neu zu laden; dann käme eine neue
   Version nie an. Darum wird beim Start und jedes Mal, wenn die App wieder sichtbar wird, nachgesehen, ob eine neuere
   Version veröffentlicht ist. Ohne eigenes Foto wird sofort neu geladen, mit Foto erst auf Tippen (das Foto ginge sonst verloren).
   Pro Version höchstens ein Versuch, damit es keine Schleife gibt. */
const VERSION=(()=>{try{const s=document.currentScript&&document.currentScript.src, m=s&&s.match(/[?&]v=([\d.]+)/); return m?m[1]:'';}catch(_){return '';}})();
let updT=0;
function reloadFor(v){
  try{sessionStorage.setItem('rofpins.upd',v);}catch(_){}
  saveNow(); location.reload();
}
function checkUpdate(){
  if(!VERSION||!window.fetch||navigator.onLine===false)return;
  const now=Date.now(); if(now-updT<15000)return; updT=now;
  fetch('./?u='+now,{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.text():'').then(html=>{
    const m=html.match(/app\.js\?v=([\d.]+)/); if(!m||m[1]===VERSION)return;
    let tried=''; try{tried=sessionStorage.getItem('rofpins.upd')||'';}catch(_){}
    if(tried===m[1])return;
    if(S.isSample){toast('Neue Version '+m[1]+' wird geladen …'); setTimeout(()=>reloadFor(m[1]),700); return;}
    const tt=$('toast'); tt.textContent='Neue Version '+m[1]+' ist da. Hier tippen zum Laden (Foto danach neu wählen).';
    tt.hidden=false; tt.style.cursor='pointer'; clearTimeout(toastT); toastT=setTimeout(()=>{tt.hidden=true;},12000);
    tt.onclick=()=>{tt.onclick=null; reloadFor(m[1]);};
  }).catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});
window.addEventListener('pageshow',e=>{if(e.persisted)checkUpdate();});

/* ---------- Start ---------- */
$('ver').textContent=VERSION;
loadState();
['brand','name','notes','extra'].forEach(id=>{$(id).value=S.text[id];});
syncExtraSeg(); checkWarn();
buildTemplates(); buildStabs(); buildPhoto(); fitViewport();
setImage(makeSample(),true);
layout(); setTab('tpl');
selectTpl(S.tpl);
fontsReady().then(()=>{schedule();renderThumbs();});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{MW.clear();CAP.clear();schedule();renderThumbs();});
setTimeout(checkUpdate,1500);
})();
