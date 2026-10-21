/* RoF Pins 3: Text im RoF-Design auf Stimmungsbilder für Pinterest. Alles läuft lokal im Browser, nichts wird hochgeladen. */
(function(){
"use strict";

/* ---------- Grundwerte ---------- */
const PETROL='#3E6B6A', PAPER='#F2F0EB', INK='#1a1a1a', GREY='#8a8a8a';
const F_T='"Playfair Display", Georgia, "Times New Roman", serif';
const F_S='Jost, "Helvetica Neue", Arial, sans-serif';
const F_L='"Cormorant Garamond", Garamond, Georgia, serif';
const AW=60, AH=90;                        /* Raster der Bildanalyse (2:3) */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};

const BROWN='#8C5E34', OFF=PAPER;
/* Flächen: nur RoF-Farben. "Off-White Papier" bekommt eine zarte Papierstruktur. */
const SURF={
  off:{bg:OFF,dark:false,name:'Off-White'},
  offp:{bg:OFF,dark:false,tex:true,name:'Off-White Papier'},
  petrol:{bg:PETROL,dark:true,name:'Petrol'},
  brown:{bg:BROWN,dark:true,name:'Braun'}
};
const SURF_OLD={paper:'off',white:'off',dark:'petrol'}; /* gespeicherte Werte aus RoF Pins 2 */

/* Vorlagen: Gruppe, Name, welche Einstellungen es gibt, Standardwerte */
const TPLS=[
  {key:'center',   group:'Auf dem Foto', name:'Zentriert',      ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'cover',    group:'Auf dem Foto', name:'Magazin',        ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'masthead', group:'Auf dem Foto', name:'Titelseite',     ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'lower',    group:'Auf dem Foto', name:'Unteres Drittel',ctl:['color','scale'],         def:{}},
  {key:'right',    group:'Auf dem Foto', name:'Rechtsbündig',   ctl:['color','scale'],         def:{}},
  {key:'midline',  group:'Auf dem Foto', name:'Mittellinie',    ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'headline', group:'Auf dem Foto', name:'Schlagzeile',    ctl:['color','scale'],         def:{}},
  {key:'underline',group:'Auf dem Foto', name:'Unterstrichen',  ctl:['color','scale','reset'], def:{}, drag:true},
  {key:'colfoot',  group:'Auf dem Foto', name:'Spaltenfuß',     ctl:['color','scale'],         def:{}},
  {key:'issue',    group:'Auf dem Foto', name:'Ausgabe',        ctl:['color','scale'],         def:{}},
  {key:'spine',    group:'Auf dem Foto', name:'Buchrücken',     ctl:['color','scale'],         def:{}},
  {key:'label',    group:'Mit Fläche',   name:'Etikett',        ctl:['surf','scale','reset'],  def:{surf:'off'}, drag:true},
  {key:'headband', group:'Mit Fläche',   name:'Kopfband',       ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'footband', group:'Mit Fläche',   name:'Fußband',        ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'corner',   group:'Mit Fläche',   name:'Ecke',           ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'note',     group:'Mit Fläche',   name:'Notiz',          ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'column',   group:'Mit Fläche',   name:'Spalte',         ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'colorfoot',group:'Mit Fläche',   name:'Farbfuß',        ctl:['surf','scale'],          def:{surf:'petrol'}},
  {key:'colorhead',group:'Mit Fläche',   name:'Farbkopf',       ctl:['surf','scale'],          def:{surf:'brown'}},
  {key:'pass',     group:'Papierseite',  name:'Passepartout',   ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'polaroid', group:'Papierseite',  name:'Polaroid',       ctl:['surf','scale'],          def:{surf:'off'}},
  {key:'feuilleton',group:'Papierseite', name:'Feuilleton',     ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'chapter',  group:'Papierseite',  name:'Kapitel',        ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'gallery',  group:'Papierseite',  name:'Galerie',        ctl:['surf','scale'],          def:{surf:'offp'}},
  {key:'window',   group:'Papierseite',  name:'Fenster',        ctl:['surf','scale'],          def:{surf:'offp'}}
];
const TPL={}; TPLS.forEach(t=>{TPL[t.key]=t;});

const S={
  full:null, prev:null, isSample:true, imgId:0,
  crop:{x:0.5,y:0.5,z:1},
  text:{brand:'House of Thêom', name:'Heaven’s Reserve', notes:'Pflaume, Rum und Zimt', extra:'', extraPos:'top'},
  url:true, tpl:'lower', size:2000, tab:'tpl',
  opt:{}
};
function resetOpt(){TPLS.forEach(t=>{S.opt[t.key]=Object.assign({color:'auto',align:'left',surf:'off',scale:1,pos:null},t.def);});}
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
    if(d.opt)Object.keys(d.opt).forEach(k=>{if(S.opt[k]){const o=d.opt[k];['color','align'].forEach(p=>{if(typeof o[p]==='string')S.opt[k][p]=o[p];}); if(typeof o.surf==='string'){const v=SURF[o.surf]?o.surf:SURF_OLD[o.surf]; if(v&&TPL[k].ctl.includes('surf'))S.opt[k].surf=v;} if(typeof o.scale==='number')S.opt[k].scale=clamp(o.scale,0.8,1.3);}});
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
  const w=spacedW(ctx,t,sp); let cx=align==='center'?x-w/2:(align==='right'?x-w:x); ctx.textAlign='left';
  for(const c of Array.from(t)){ctx.fillText(c,cx,y);cx+=ctx.measureText(c).width+sp;}
}
/* Eigene Zeilenumbrüche (Enter) bleiben erhalten; nur zu lange Zeilen werden zusätzlich umbrochen */
function paras(text){return String(text||'').split(/\r?\n/).map(p=>p.trim().replace(/\s+/g,' ')).filter(Boolean);}
function wrapPara(ctx,text,maxW,balance){
  const words=text.split(' ').filter(Boolean); if(!words.length)return [];
  const lines=[]; let cur=words[0];
  for(let i=1;i<words.length;i++){const t=cur+' '+words[i]; if(ctx.measureText(t).width<=maxW)cur=t; else{lines.push(cur);cur=words[i];}}
  lines.push(cur);
  if(balance&&lines.length===2){ /* zwei Zeilen möglichst gleich lang */
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
function wrapLines(ctx,text,maxW){
  const p=paras(text); if(!p.length)return [];
  if(p.length===1)return wrapPara(ctx,p[0],maxW,true);
  const out=[]; p.forEach(x=>{wrapPara(ctx,x,maxW,false).forEach(l=>out.push(l));}); return out;
}
function fitLines(ctx,text,fontFn,maxSize,minSize,maxW,maxLines){
  const pc=paras(text).length; maxLines=Math.max(maxLines,pc);
  let size=maxSize, lines=[];
  const step=Math.max(1,maxSize/60);
  if(pc>1){ /* eigene Umbrüche: jede Zeile möglichst ungebrochen, Schrift dafür bis 60 % kleiner */
    for(let z=maxSize;z>=Math.max(minSize,maxSize*0.6);z-=step){ctx.font=fontFn(z); const l=wrapLines(ctx,text,maxW); if(l.length===pc)return {size:z,lines:l};}
  }
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

/* Textblock: Zusatzzeile oben (als Rubrik), Marke, Titel, Linie, Kernnoten, Zusatzzeile unten (als Hinweis).
   o.skip blendet Teile aus, o.notesCaps setzt die Kernnoten gesperrt in Versalien, o.ruleW/ruleH/ruleRole formen die Linie. */
function buildBlock(ctx,s,maxW,o){
  const T=S.text, k=o.scale||1, items=[], sk=o.skip||{}; let w=0;
  const extra=sk.extra?'':T.extra.trim(), brand=sk.brand?'':T.brand.trim(), name=sk.title?'':paras(T.name).join('\n'), notes=sk.notes?'':T.notes.trim();
  maxW=Math.max(maxW,40*s);
  let titleY=null, titleH=0, titleW=0;
  if(extra&&T.extraPos==='top'){
    const txt=extra.toUpperCase(); let sz=15*s*Math.min(k,1.15);
    for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,txt,sz*0.22)+30*s<=maxW||sz<=8*s)break; sz-=0.5*s;}
    const tw=spacedW(ctx,txt,sz*0.22), pw=tw+30*s;
    w=Math.max(w,pw);
    items.push({k:'pill',text:txt,font:`500 ${sz}px ${F_S}`,sp:sz*0.22,w:pw,h:sz+20*s,lw:1.5*s,role:'pill'});
    items.push({k:'gap',h:22*s});
  }
  if(brand){
    const txt=brand.toUpperCase(); let sz=(o.brandSize||22)*s*Math.min(k,1.15);
    for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,txt,sz*0.2)<=maxW||sz<=9*s)break; sz-=0.5*s;}
    w=Math.max(w,spacedW(ctx,txt,sz*0.2));
    items.push({k:'sp',text:txt,font:`500 ${sz}px ${F_S}`,sp:sz*0.2,w:spacedW(ctx,txt,sz*0.2),h:sz*1.3,role:'eyebrow'});
    items.push({k:'gap',h:(o.brandGap||18)*s});
  }
  if(name){
    const f=z=>`500 ${z}px ${F_T}`;
    const r=fitLines(ctx,name,f,o.titleMax*s*k,(o.titleMin||38)*s*Math.min(k,1),maxW,o.titleLines||2);
    ctx.font=f(r.size); r.lines.forEach(l=>{titleW=Math.max(titleW,ctx.measureText(l).width);}); w=Math.max(w,titleW);
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.12,h:r.size*1.12*r.lines.length,role:'title',tw:titleW});
  }
  if(notes){
    if(name&&!o.noRule){items.push({k:'gap',h:24*s});items.push({k:'rule',h:(o.ruleH||2)*s,w:(o.ruleW||56)*s,role:o.ruleRole||'rule'});items.push({k:'gap',h:22*s});}
    else if(name)items.push({k:'gap',h:20*s});
    let done=false;
    if(o.notesCaps){
      const txt=notes.toUpperCase(); let sz=(o.notesMax||19)*s*k;
      for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,txt,sz*0.16)<=maxW||sz<=12*s)break; sz-=0.5*s;}
      if(spacedW(ctx,txt,sz*0.16)<=maxW){const tw=spacedW(ctx,txt,sz*0.16); w=Math.max(w,tw); items.push({k:'sp',text:txt,font:`500 ${sz}px ${F_S}`,sp:sz*0.16,w:tw,h:sz*1.4,role:'notes'}); done=true;}
    }
    if(!done){
      const f=z=>`400 ${z}px ${F_S}`;
      const r=fitLines(ctx,notes,f,(o.notesMax||30)*s*k,(o.notesMin||17)*s,maxW,o.notesLines||2);
      ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
      items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.35,h:r.size*1.35*r.lines.length,role:'notes'});
    }
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
      ctx.strokeStyle=col.pill; ctx.lineWidth=it.lw; rr(ctx,px+it.lw/2,cy+it.lw/2,it.w-it.lw,it.h-it.lw,it.h/2); ctx.stroke();
      ctx.fillStyle=col.pill; ctx.font=it.font; drawSpaced(ctx,it.text,px+it.w/2+it.sp/2,cy+it.h/2,it.sp,'center'); cy+=it.h; continue;
    }
    ctx.fillStyle=col[it.role]; ctx.font=it.font;
    if(it.k==='sp'){drawSpaced(ctx,it.text,x,cy+it.h/2,it.sp,align);cy+=it.h;continue;}
    ctx.textAlign=align==='center'?'center':(align==='right'?'right':'left');
    for(const l of it.lines){ctx.fillText(l,x,cy+it.lh/2);cy+=it.lh;}
  }
}
/* Wortmarke in Versalien (Buchstabenabstand 0,3em), darunter die Webadresse */
const WM='REALM OF FRAGRANCE', WEB='realmoffragrance.com';
function brandH(s,k){k=k||1;return 24*s*k*1.2+(S.url?12*s*k+17*s*k*1.2:0);}
function brandW(ctx,s,k){k=k||1;const L=24*s*k;ctx.font=`600 ${L}px ${F_L}`;return spacedW(ctx,WM,L*0.3);}
function fitK(ctx,s,maxW,kMax){return Math.min(kMax||1,maxW/brandW(ctx,s,1));}
function drawBrand(ctx,s,x,top,col,k,align){
  k=k||1; align=align||'center'; ctx.textBaseline='middle'; const L=24*s*k;
  ctx.font=`600 ${L}px ${F_L}`; ctx.fillStyle=col.logo;
  drawSpaced(ctx,WM,align==='center'?x+L*0.15:x,top+L*0.6,L*0.3,align);
  if(S.url){const u=17*s*k; ctx.font=`400 ${u}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,WEB,x,top+L*1.2+12*s*k+u*0.6,u*0.06,align);}
}
function hline(ctx,x0,x1,y,h,c){ctx.fillStyle=c;ctx.fillRect(x0,y,x1-x0,h);}

/* Farben: nur RoF-Farben (Petrol, Braun, Off-White, Text, Nebentext, Labels) */
const LT='242,240,235';
function colsMode(mode){
  if(mode==='light')return {eyebrow:OFF,title:OFF,rule:OFF,rule2:OFF,notes:`rgba(${LT},0.94)`,hint:`rgba(${LT},0.84)`,pill:OFF,logo:OFF,url:`rgba(${LT},0.86)`,line:`rgba(${LT},0.7)`};
  return {eyebrow:PETROL,title:INK,rule:PETROL,rule2:BROWN,notes:INK,hint:'#4a4a4a',pill:PETROL,logo:PETROL,url:'#4a4a4a',line:'rgba(26,26,26,0.5)'};
}
function colsSurf(key){
  const sf=SURF[key]||SURF.off;
  if(sf.dark)return colsMode('light');
  return Object.assign(colsMode('dark'),{notes:'#4a4a4a',url:GREY,line:'rgba(26,26,26,0.28)'});
}
function surfC(key){const sf=SURF[key]||SURF.off; return sf.dark?contrastV(0.94,lumHex(sf.bg)):contrastV(0.1,lumHex(sf.bg));}
function lumHex(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return (0.2126*r+0.7152*g+0.0722*b)/255;}

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
  const key=W+'x'+H+bg; if(TEX.has(key))return TEX.get(key);
  if(TEX.size>4)TEX.clear();
  const s=W/1000, c=mk(W,H), x=c.getContext('2d');
  const R0=parseInt(bg.slice(1,3),16), G0=parseInt(bg.slice(3,5),16), B0=parseInt(bg.slice(5,7),16);
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
  for(let n=0;n<9000;n++){
    const px=r()*W, py=r()*H, len=(6+r()*22)*s, ang=r()*Math.PI, bend=(r()-0.5)*len*0.5;
    const dx=Math.cos(ang)*len/2, dy=Math.sin(ang)*len/2, dark=r()<0.55, a=0.065*TEXK*(0.35+r()*0.65);
    x.strokeStyle=dark?`rgba(120,104,80,${a.toFixed(4)})`:`rgba(255,255,252,${(a*1.3).toFixed(4)})`;
    x.lineWidth=Math.max(0.35,(0.4+r()*0.45)*s);
    x.beginPath(); x.moveTo(px-dx,py-dy); x.quadraticCurveTo(px-dy/len*bend*2,py+dx/len*bend*2,px+dx,py+dy); x.stroke();
  }
  TEX.set(key,c); return c;
}
/* Fläche füllen, rechteckig oder mit eigener Form */
function fillSurf(ctx,key,W,H,shape){
  const sf=SURF[key]||SURF.off; ctx.save();
  if(typeof shape==='function')shape(ctx); else{ctx.beginPath();ctx.rect(shape.x,shape.y,shape.w,shape.h);}
  ctx.clip();
  if(sf.tex)ctx.drawImage(paperTex(W,H,sf.bg),0,0,W,H); else{ctx.fillStyle=sf.bg;ctx.fillRect(0,0,W,H);}
  ctx.restore();
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
const TV={light:0.94,dark:0.11}, SV={light:0.04,dark:0.955};
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

/* ---------- Die 25 Vorlagen ---------- */
function fullPhoto(ctx,W,H,src){const pr={x:0,y:0,w:W,h:H}; drawPhoto(ctx,src,pr); return pr;}
/* Masthead mit großer Wortmarke über die ganze Breite (Magazin, Titelseite) */
function masthead(ctx,W,H,s,m){
  let ms=84*s; for(;;){ctx.font=`600 ${ms}px ${F_L}`; if(spacedW(ctx,WM,ms*0.25)<=W-2*m||ms<=20*s)break; ms-=1*s;}
  return {ms,top:54*s,h:ms};
}
const R={
  /* ===== Auf dem Foto ===== */
  center(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.center, pr=fullPhoto(ctx,W,H,src);
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
  cover(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.cover, pr=fullPhoto(ctx,W,H,src);
    const m=64*s, M=masthead(ctx,W,H,s,m), ms=M.ms;
    const mTop=M.top, mH=ms, ruleY=mTop+mH+14*s, uS=16*s, mBot=ruleY+(S.url?18*s+uS:4*s);
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
    drawSpaced(ctx,WM,W/2+ms*0.125,mTop+mH/2,ms*0.25,'center');
    ctx.fillStyle=col.rule; ctx.fillRect(m,ruleY,W-2*m,1.5*s);
    if(S.url){ctx.font=`400 ${uS}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,WEB,W/2,ruleY+18*s+uS*0.5,uS*0.12,'center');}
    drawBlock(ctx,b,m,y,'left',col);
    return {photo:pr,text:{rect,anchor:{x:m/W,y:y/H},axis:'y'},c:Math.min(t.c,mn.c),onPhoto:true};
  },
  masthead(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.masthead, pr=fullPhoto(ctx,W,H,src);
    const m=56*s, M=masthead(ctx,W,H,s,m), ms=M.ms, uS=16*s;
    const mBot=M.top+ms+(S.url?20*s+uS*1.2:6*s);
    const b=buildBlock(ctx,s,W-2*90*s,{titleMax:110,titleMin:46,titleLines:3,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=mBot+80*s, maxY=Math.max(minY,H-86*s-bhh);
    const a=anchorOf(o); let y=a?a.y*H:maxY;
    y=clamp(y,minY,maxY);
    if(env.drag&&Math.abs(y+bhh/2-H/2)<14*s){y=H/2-bhh/2;env.guides.push({h:0.5});}
    const rect={x,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('masthead',st,o.color,env), t=need(st,mode,0.1);
    const mn=need(stats({x:m,y:M.top,w:W-2*m,h:mBot-M.top},W,H),mode,0.08);
    scrim(ctx,W,H,{key:'mast',axis:'y',mode,bands:[{from:0,to:mBot+10*s,fade:220*s,a:mn.a},{from:y-24*s,to:y+bhh+24*s,fade:290*s,a:t.a}]},env);
    const col=colsMode(mode);
    ctx.textBaseline='middle'; ctx.font=`600 ${ms}px ${F_L}`; ctx.fillStyle=col.logo;
    drawSpaced(ctx,WM,W/2+ms*0.125,M.top+ms/2,ms*0.25,'center');
    if(S.url){ctx.font=`400 ${uS}px ${F_S}`; ctx.fillStyle=col.url; drawSpaced(ctx,WEB,W/2,M.top+ms+20*s+uS*0.6,uS*0.12,'center');}
    drawBlock(ctx,b,W/2,y,'center',col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,mn.c),onPhoto:true};
  },
  lower(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.lower, pr=fullPhoto(ctx,W,H,src);
    const m=72*s, k=0.85, bh=brandH(s,k), brandTop=H-60*s-bh;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:96,titleMin:40,titleLines:3,notesLines:2,scale:o.scale});
    const by=brandTop-46*s-b.h, hy=by-30*s;
    const rect={x:m,y:hy,w:W-2*m,h:H-60*s-hy}, st=stats(rect,W,H);
    const mode=decideMode('lower',st,o.color,env), t=need(st,mode,0.12);
    scrim(ctx,W,H,{key:'lower',axis:'y',mode,bands:[{from:hy-30*s,to:H,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    hline(ctx,m,W-m,hy,1.5*s,col.line);
    drawBlock(ctx,b,m,by,'left',col); drawBrand(ctx,s,m,brandTop,col,k,'left');
    return {photo:pr,text:null,c:t.c,onPhoto:true};
  },
  right(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.right, pr=fullPhoto(ctx,W,H,src);
    const m=72*s, k=0.85, bh=brandH(s,k), brandTop=H-60*s-bh;
    const b=buildBlock(ctx,s,W*0.72,{titleMax:100,titleMin:40,titleLines:3,notesLines:2,ruleW:64,scale:o.scale});
    const by=brandTop-46*s-b.h, bw=Math.max(b.w,brandW(ctx,s,k));
    const rect={x:W-m-bw,y:by,w:bw,h:H-60*s-by}, st=stats(rect,W,H);
    const mode=decideMode('right',st,o.color,env), t=need(st,mode,0.12);
    scrim(ctx,W,H,{key:'right',axis:'y',mode,bands:[{from:by-30*s,to:H,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    drawBlock(ctx,b,W-m,by,'right',col); drawBrand(ctx,s,W-m,brandTop,col,k,'right');
    return {photo:pr,text:null,c:t.c,onPhoto:true};
  },
  midline(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.midline, pr=fullPhoto(ctx,W,H,src);
    const m=56*s, bh=brandH(s), brandTop=H-56*s-bh;
    const b=buildBlock(ctx,s,W-2*150*s,{titleMax:100,titleMin:40,titleLines:2,notesLines:2,scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=m+20*s, maxY=Math.max(minY,brandTop-80*s-bhh);
    const a=anchorOf(o); let y=a?a.y*H:H*0.46-bhh/2;
    y=clamp(y,minY,maxY);
    if(env.drag&&Math.abs(y+bhh/2-H/2)<14*s){y=H/2-bhh/2;env.guides.push({h:0.5});}
    const rect={x,y,w:bw,h:bhh}, st=stats({x:m,y,w:W-2*m,h:bhh},W,H);
    const mode=decideMode('midline',st,o.color,env), t=need(st,mode,0.12), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'mid',axis:'y',mode,bands:[{from:y-30*s,to:y+bhh+30*s,fade:260*s,a:t.a},br.band]},env);
    const col=colsMode(mode);
    if(b.titleY!=null){
      const ly=y+b.titleY+b.titleH/2, gap=34*s, l0=W/2-b.titleW/2-gap, r0=W/2+b.titleW/2+gap;
      if(l0-m>36*s){hline(ctx,m,l0,ly,1.5*s,col.line);hline(ctx,r0,W-m,ly,1.5*s,col.line);}
    }
    drawBlock(ctx,b,W/2,y,'center',col); drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  headline(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.headline, pr=fullPhoto(ctx,W,H,src);
    const m=64*s, y=m+16*s;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:150,titleMin:52,titleLines:3,notesLines:2,scale:o.scale});
    const rect={x:m,y,w:Math.max(b.w,1),h:Math.max(b.h,1)}, st=stats(rect,W,H);
    const mode=decideMode('headline',st,o.color,env), t=need(st,mode,0.12), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'head',axis:'y',mode,bands:[{from:0,to:y+rect.h+24*s,fade:300*s,a:t.a},br.band]},env);
    const col=colsMode(mode);
    drawBlock(ctx,b,m,y,'left',col); drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:null,c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  underline(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.underline, pr=fullPhoto(ctx,W,H,src);
    const m=80*s, bh=brandH(s), brandTop=H-56*s-bh;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:104,titleMin:42,titleLines:3,notesCaps:true,notesMax:19,ruleW:72,ruleH:4,ruleRole:'rule2',scale:o.scale});
    const bw=Math.max(b.w,1), bhh=Math.max(b.h,1), x=(W-bw)/2;
    const minY=m, maxY=Math.max(minY,brandTop-64*s-bhh);
    const a=anchorOf(o); let y=a?a.y*H:maxY;
    y=clamp(y,minY,maxY);
    if(env.drag&&Math.abs(y+bhh/2-H/2)<14*s){y=H/2-bhh/2;env.guides.push({h:0.5});}
    const rect={x,y,w:bw,h:bhh}, st=stats(rect,W,H);
    const mode=decideMode('underline',st,o.color,env), t=need(st,mode,0.12), br=photoBrand(ctx,W,H,s,mode,env);
    scrim(ctx,W,H,{key:'under',axis:'y',mode,bands:[{from:y-24*s,to:y+bhh+24*s,fade:290*s,a:t.a},br.band]},env);
    const col=colsMode(mode);
    drawBlock(ctx,b,W/2,y,'center',col); drawBrand(ctx,s,W/2,br.top,col);
    return {photo:pr,text:{rect,anchor:{x:x/W,y:y/H},axis:'y'},c:Math.min(t.c,br.band.c),onPhoto:true};
  },
  colfoot(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.colfoot, pr=fullPhoto(ctx,W,H,src);
    const m=60*s, gut=52*s, inner=W-2*m, lw=inner*0.56, rw=inner-lw-gut, xr=m+lw+gut;
    const bl=buildBlock(ctx,s,lw,{titleMax:80,titleMin:34,titleLines:3,skip:{notes:1},scale:o.scale});
    const brt=buildBlock(ctx,s,rw,{titleMax:10,skip:{title:1,brand:1,extra:1},notesMax:25,notesMin:15,notesLines:4,scale:o.scale});
    const k=fitK(ctx,s,rw,0.72), bh=brandH(s,k);
    const rh=brt.h+(brt.h?34*s:0)+bh, zh=Math.max(bl.h,rh), bot=H-64*s, top=bot-zh;
    const rect={x:m,y:top-40*s,w:inner,h:bot-top+40*s}, st=stats(rect,W,H);
    const mode=decideMode('colfoot',st,o.color,env), t=need(st,mode,0.12);
    scrim(ctx,W,H,{key:'colfoot',axis:'y',mode,bands:[{from:top-60*s,to:H,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    hline(ctx,m,W-m,top-36*s,1.5*s,col.line);
    ctx.fillStyle=col.line; ctx.fillRect(m+lw+gut/2-0.75*s,top,1.5*s,zh);
    drawBlock(ctx,bl,m,top,'left',col);
    if(brt.h)drawBlock(ctx,brt,xr,top,'left',col);
    drawBrand(ctx,s,xr,bot-bh,col,k,'left');
    return {photo:pr,text:null,c:t.c,onPhoto:true};
  },
  issue(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.issue, pr=fullPhoto(ctx,W,H,src);
    const m=64*s, k=0.75, bh=brandH(s,k), bwm=brandW(ctx,s,k), hy=m+bh+18*s;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:112,titleMin:44,titleLines:3,notesLines:2,scale:o.scale});
    const y=H-76*s-b.h, rect={x:m,y,w:Math.max(b.w,1),h:Math.max(b.h,1)}, st=stats(rect,W,H);
    const mode=decideMode('issue',st,o.color,env), t=need(st,mode,0.12);
    const tn=need(stats({x:m,y:m,w:bwm,h:bh+20*s},W,H),mode,0.08);
    scrim(ctx,W,H,{key:'issue',axis:'y',mode,bands:[{from:0,to:hy+14*s,fade:200*s,a:tn.a},{from:y-24*s,to:H,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    drawBrand(ctx,s,m,m,col,k,'left'); hline(ctx,m,m+bwm,hy,1.5*s,col.line);
    drawBlock(ctx,b,m,y,'left',col);
    return {photo:pr,text:null,c:Math.min(t.c,tn.c),onPhoto:true};
  },
  spine(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.spine, pr=fullPhoto(ctx,W,H,src);
    const k=0.85, bh=brandH(s,k), sx=44*s, x=sx+bh+50*s, m=64*s;
    const b=buildBlock(ctx,s,W-x-m,{titleMax:100,titleMin:38,titleLines:3,notesLines:2,scale:o.scale});
    const y=H-72*s-b.h, rect={x,y,w:Math.max(b.w,1),h:Math.max(b.h,1)}, st=stats(rect,W,H);
    const mode=decideMode('spine',st,o.color,env), t=need(st,mode,0.12);
    const bw=brandW(ctx,s,k), sn=need(stats({x:sx,y:H-72*s-bw,w:bh,h:bw},W,H),mode,0.08);
    scrim(ctx,W,H,{key:'spineX',axis:'x',mode,bands:[{from:0,to:sx+bh+12*s,fade:190*s,a:sn.a}]},env);
    scrim(ctx,W,H,{key:'spineY',axis:'y',mode,bands:[{from:y-24*s,to:H,fade:300*s,a:t.a}]},env);
    const col=colsMode(mode);
    ctx.save(); ctx.translate(sx,H-72*s); ctx.rotate(-Math.PI/2); drawBrand(ctx,s,0,0,col,k,'left'); ctx.restore();
    drawBlock(ctx,b,x,y,'left',col);
    return {photo:pr,text:null,c:Math.min(t.c,sn.c),onPhoto:true};
  },

  /* ===== Mit Fläche ===== */
  label(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.label, sf=SURF[o.surf]||SURF.off, col=colsSurf(o.surf), pr=fullPhoto(ctx,W,H,src);
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
    fillSurf(ctx,o.surf,W,H,c=>rr(c,x,y,cw,ch,6*s));
    drawBlock(ctx,b,x+cw/2,y+pad,'center',col);
    drawBrand(ctx,s,x+cw/2,y+pad+b.h+gap,col,bk);
    return {photo:pr,text:{rect:{x,y,w:cw,h:ch},anchor:{x:x/W,y:y/H},axis:'xy'},c:surfC(o.surf)};
  },
  headband(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.headband, col=colsSurf(o.surf), pad=54*s, k=0.78, bh=brandH(s,k);
    const b=buildBlock(ctx,s,W-2*pad,{titleMax:74,titleMin:34,titleLines:2,notesLines:2,notesMax:26,scale:o.scale});
    const hy=pad+bh+22*s, ty=hy+30*s, hb=ty+b.h+pad*0.95;
    const pr={x:0,y:hb,w:W,h:H-hb}; drawPhoto(ctx,src,pr);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:hb});
    drawBrand(ctx,s,pad,pad,col,k,'left'); hline(ctx,pad,W-pad,hy,1.5*s,col.line);
    drawBlock(ctx,b,pad,ty,'left',col);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  footband(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.footband, col=colsSurf(o.surf), pad=54*s, inner=W-2*pad, lw=inner*0.62;
    const b=buildBlock(ctx,s,lw,{titleMax:70,titleMin:32,titleLines:3,notesLines:2,notesMax:25,scale:o.scale});
    const k=fitK(ctx,s,inner-lw-36*s,0.72), bh=brandH(s,k);
    const hb=pad+Math.max(b.h,bh)+pad*0.95, top=H-hb;
    const pr={x:0,y:0,w:W,h:top}; drawPhoto(ctx,src,pr);
    fillSurf(ctx,o.surf,W,H,{x:0,y:top,w:W,h:hb});
    drawBlock(ctx,b,pad,top+pad,'left',col);
    drawBrand(ctx,s,W-pad,top+pad+Math.max(b.h,bh)-bh,col,k,'right');
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  corner(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.corner, col=colsSurf(o.surf), pr=fullPhoto(ctx,W,H,src);
    const pad=50*s, k=0.74, bh=brandH(s,k), lw=brandW(ctx,s,k);
    const b=buildBlock(ctx,s,W*0.66-2*pad,{titleMax:66,titleMin:32,titleLines:3,notesLines:2,notesMax:24,scale:o.scale});
    const cw=Math.min(W*0.76,Math.max(b.w,lw)+2*pad), ch=pad+b.h+(b.h?36*s:0)+bh+pad*0.9, y=H-ch;
    fillSurf(ctx,o.surf,W,H,{x:0,y,w:cw,h:ch});
    drawBlock(ctx,b,pad,y+pad,'left',col); drawBrand(ctx,s,pad,H-pad*0.9-bh,col,k,'left');
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  note(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.note, sf=SURF[o.surf]||SURF.off, col=colsSurf(o.surf), pr=fullPhoto(ctx,W,H,src);
    const m=52*s, pad=40*s, edge=5*s, k=0.6, bh=brandH(s,k);
    const b=buildBlock(ctx,s,W*0.6-2*pad,{titleMax:54,titleMin:28,titleLines:4,notesLines:3,notesMax:22,notesMin:15,brandSize:18,scale:o.scale});
    const cw=Math.max(b.w,brandW(ctx,s,k),250*s)+2*pad, ch=edge+pad+b.h+(b.h?30*s:0)+bh+pad*0.8, x=W-m-cw, y=m;
    fillSurf(ctx,o.surf,W,H,{x,y,w:cw,h:ch});
    if(!sf.dark){ctx.strokeStyle='rgba(26,26,26,0.12)';ctx.lineWidth=1*s;ctx.strokeRect(x+0.5*s,y+0.5*s,cw-s,ch-s);}
    ctx.fillStyle=sf.dark?OFF:PETROL; ctx.fillRect(x,y,cw,edge);
    drawBlock(ctx,b,x+pad,y+edge+pad,'left',col); drawBrand(ctx,s,x+pad,y+ch-pad*0.8-bh,col,k,'left');
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  column(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.column, col=colsSurf(o.surf), pw=Math.round(W*0.55), pad=46*s, cwid=W-pw-2*pad;
    const pr={x:0,y:0,w:pw,h:H}; drawPhoto(ctx,src,pr);
    fillSurf(ctx,o.surf,W,H,{x:pw,y:0,w:W-pw,h:H});
    const b=buildBlock(ctx,s,cwid,{titleMax:68,titleMin:26,titleLines:5,notesLines:4,notesMax:24,notesMin:15,brandSize:18,scale:o.scale});
    const k=fitK(ctx,s,cwid,0.8), bh=brandH(s,k);
    drawBlock(ctx,b,pw+pad,Math.max(pad+50*s,H*0.3-b.h/2),'left',col);
    hline(ctx,pw+pad,W-pad,H-pad-50*s-bh-24*s,1.5*s,col.line);
    drawBrand(ctx,s,pw+pad,H-pad-50*s-bh,col,k,'left');
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  colorfoot(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.colorfoot, col=colsSurf(o.surf), pad=60*s, k=0.8, bh=brandH(s,k);
    const b=buildBlock(ctx,s,W-2*pad,{titleMax:76,titleMin:34,titleLines:2,notesLines:2,notesMax:25,scale:o.scale});
    const needH=pad+b.h+44*s+bh+pad*0.8+24*s;
    const ph=clamp(H-needH-30*s,H*0.45,H*0.7);
    const pr={x:0,y:0,w:W,h:ph}; drawPhoto(ctx,src,pr);
    fillSurf(ctx,o.surf,W,H,{x:0,y:ph,w:W,h:H-ph});
    const brandTop=H-pad*0.8-bh, hy=brandTop-24*s, ty=ph+Math.max(pad*0.9,(hy-ph-b.h)/2);
    drawBlock(ctx,b,pad,ty,'left',col); hline(ctx,pad,W-pad,hy,1.5*s,col.line);
    drawBrand(ctx,s,pad,brandTop+6*s,col,k,'left');
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  colorhead(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.colorhead, col=colsSurf(o.surf), pad=58*s, k=0.82, bh=brandH(s,k);
    const b=buildBlock(ctx,s,W-2*90*s,{titleMax:90,titleMin:36,titleLines:3,notesLines:2,notesMax:26,scale:o.scale});
    const ry=pad+bh+24*s, ty=ry+44*s, hh=Math.min(H*0.55,ty+b.h+pad);
    const pr={x:0,y:hh,w:W,h:H-hh}; drawPhoto(ctx,src,pr);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:hh});
    drawBrand(ctx,s,W/2,pad,col,k,'center'); ctx.fillStyle=col.rule; ctx.fillRect(W/2-28*s,ry,56*s,2*s);
    drawBlock(ctx,b,W/2,ty,'center',col);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },

  /* ===== Papierseite ===== */
  pass(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.pass, col=colsSurf(o.surf);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const m=56*s, b=buildBlock(ctx,s,W-2*m-80*s,{titleMax:80,titleLines:2,notesLines:2,scale:o.scale});
    const brandTop=H-m-brandH(s);
    let ph=brandTop-48*s-b.h-58*s-m; ph=clamp(ph,H*0.45,H*0.72);
    const pr={x:m,y:m,w:W-2*m,h:ph}; drawPhoto(ctx,src,pr);
    const areaTop=m+ph, ty=areaTop+Math.max(24*s,(brandTop-areaTop-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',col); drawBrand(ctx,s,W/2,brandTop,col);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  polaroid(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.polaroid, sf=SURF[o.surf]||SURF.off, col=colsSurf(o.surf);
    ctx.drawImage(blurred(src,W,H),0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.30)'; ctx.fillRect(0,0,W,H);
    const cw=W*0.8, pm=36*s, pw=cw-2*pm, bh=brandH(s);
    const b=buildBlock(ctx,s,pw-30*s,{titleMax:66,titleLines:2,notesLines:2,notesMax:26,scale:o.scale});
    const textH=(b.h?34*s+b.h:0)+50*s;
    let ph=Math.min(pw*1.04,H-2*44*s-pm-textH-50*s-bh);
    ph=Math.max(ph,H*0.3);
    const cardH=pm+ph+textH, total=cardH+50*s+bh;
    const top=Math.max(36*s,(H-total)/2), left=(W-cw)/2, btop=top+cardH+50*s;
    const st=stats({x:W/2-250*s,y:btop,w:500*s,h:bh},W,H); const dim={v:st.v*0.7,sd:0,busy:1};
    const n=need(dim,'light',0.05);
    scrim(ctx,W,H,{key:'polB',axis:'y',mode:'light',bands:[{from:btop-10*s,to:H,fade:160*s,a:n.a}]},env);
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.38)'; ctx.shadowBlur=46*s; ctx.shadowOffsetY=14*s;
    ctx.fillStyle=sf.bg; ctx.fillRect(left,top,cw,cardH); ctx.restore();
    fillSurf(ctx,o.surf,W,H,{x:left,y:top,w:cw,h:cardH});
    const pr={x:left+pm,y:top+pm,w:pw,h:ph}; drawPhoto(ctx,src,pr);
    drawBlock(ctx,b,W/2,top+pm+ph+34*s,'center',col);
    drawBrand(ctx,s,W/2,btop,colsMode('light'));
    return {photo:pr,text:null,c:Math.min(n.c,surfC(o.surf))};
  },
  feuilleton(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.feuilleton, col=colsSurf(o.surf), m=64*s, k=0.8, bh=brandH(s,k);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    drawBrand(ctx,s,m,m,col,k,'left');
    const r1=m+bh+22*s; hline(ctx,m,W-m,r1,2.5*s,col.title); hline(ctx,m,W-m,r1+7*s,1*s,col.title);
    const b=buildBlock(ctx,s,W-2*m,{titleMax:92,titleMin:38,titleLines:3,notesLines:2,notesMax:26,scale:o.scale});
    const py=r1+40*s, pw=W-2*m, bot=H-m;
    const ph=clamp(bot-30*s-b.h-48*s-py,H*0.3,pw*0.96);
    const pr={x:m,y:py,w:pw,h:ph}; drawPhoto(ctx,src,pr);
    drawBlock(ctx,b,m,py+ph+48*s,'left',col);
    hline(ctx,m,W-m,bot,1*s,col.title);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  chapter(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.chapter, col=colsSurf(o.surf), bh=brandH(s,0.85), brandTop=H-60*s-bh;
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const brand=S.text.brand.trim().toUpperCase();
    let ey=72*s;
    if(brand){let sz=22*s; for(;;){ctx.font=`500 ${sz}px ${F_S}`; if(spacedW(ctx,brand,sz*0.4)<=W-160*s||sz<=10*s)break; sz-=0.5*s;}
      ctx.textBaseline='middle'; ctx.fillStyle=col.eyebrow; drawSpaced(ctx,brand,W/2+sz*0.2,ey+sz*0.6,sz*0.4,'center'); ey+=sz*1.2;}
    const b=buildBlock(ctx,s,W-2*100*s,{titleMax:86,titleMin:36,titleLines:3,notesLines:2,notesMax:25,skip:{brand:1},scale:o.scale});
    const py=ey+44*s, pw=W*0.6, ph=clamp(brandTop-50*s-b.h-50*s-py,H*0.3,pw*1.32);
    const pr={x:(W-pw)/2,y:py,w:pw,h:ph}; drawPhoto(ctx,src,pr);
    const ty=py+ph+Math.max(44*s,(brandTop-50*s-(py+ph)-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',col); drawBrand(ctx,s,W/2,brandTop,col,0.85);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  gallery(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.gallery, col=colsSurf(o.surf), bh=brandH(s,0.78), brandTop=H-56*s-bh;
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const pw=W*0.66, px=(W-pw)/2;
    const b=buildBlock(ctx,s,pw,{titleMax:54,titleMin:28,titleLines:3,notesLines:2,notesMax:21,notesMin:15,brandSize:17,ruleW:40,scale:o.scale});
    const py=104*s, ph=clamp(brandTop-60*s-b.h-60*s-py,H*0.35,pw*1.36);
    const pr={x:px,y:py,w:pw,h:ph};
    ctx.save(); ctx.shadowColor='rgba(26,26,26,0.26)'; ctx.shadowBlur=34*s; ctx.shadowOffsetY=16*s; ctx.fillStyle=INK; ctx.fillRect(px,py,pw,ph); ctx.restore();
    drawPhoto(ctx,src,pr);
    drawBlock(ctx,b,px,py+ph+56*s,'left',col); drawBrand(ctx,s,W/2,brandTop,col,0.78);
    return {photo:pr,text:null,c:surfC(o.surf)};
  },
  window(ctx,W,H,src,env){
    const s=W/1000, o=S.opt.window, col=colsSurf(o.surf), m=64*s, k=0.8, bh=brandH(s,k);
    fillSurf(ctx,o.surf,W,H,{x:0,y:0,w:W,h:H});
    const b=buildBlock(ctx,s,W-2*m,{titleMax:94,titleMin:40,titleLines:3,notesLines:2,notesMax:26,scale:o.scale});
    const brandTop=H-m-bh, ty=brandTop-50*s-b.h;
    const px=W*0.26, pw=W-px-m, ph=clamp(ty-60*s-m,H*0.3,pw*1.3);
    const pr={x:px,y:m,w:pw,h:ph}; drawPhoto(ctx,src,pr);
    drawBlock(ctx,b,m,ty,'left',col); drawBrand(ctx,s,m,brandTop,col,k,'left');
    return {photo:pr,text:null,c:surfC(o.surf)};
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
    const t=r.text.rect; if(false)ctx.strokeRect(t.x+k,t.y+k,t.w-2*k,t.h-2*k); else{rr(ctx,t.x-12*k,t.y-12*k,t.w+24*k,t.h+24*k,8*k);ctx.stroke();}
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
  if(t.ctl.includes('surf'))seg(box,'Fläche',Object.keys(SURF).map(k=>[k,SURF[k].name]),()=>o.surf,v=>{o.surf=v;},false).classList.add('surf');
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
  if(id!=='name')el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur();}); /* im Titel macht Enter eine neue Zeile */
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
