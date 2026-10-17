/* RoF Pin-Studio: Text im RoF-Design auf Stimmungsbilder für Pinterest. Alles läuft lokal im Browser. */
(function(){
"use strict";
const PETROL='#3E6B6A', PAPER='#F2F0EB', INK='#1a1a1a', INK2='#4a4a4a', GREY='#8a8a8a';
const F_TITLE='"Playfair Display", Georgia, "Times New Roman", serif';
const F_SANS='Jost, "Helvetica Neue", Arial, sans-serif';
const F_LOGO='"Cormorant Garamond", Garamond, Georgia, serif';
const AW=40, AH=60;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

const S={
  full:null, prev:null, isSample:true,
  focus:{x:0.6,y:0.57}, zoom:1, fo:{x:0.6,y:0.57}, an:null,
  brand:'House of Thêom', name:'Heaven’s Reserve', notes:'Pflaume, Rum und Zimt', url:true,
  layout:'free', size:2000,
  opt:{ pass:{}, free:{pos:'auto',color:'auto',shift:0}, band:{pos:'auto'}, side:{pos:'auto',color:'auto'} },
  res:{}
};
const LAYOUTS=[
  {key:'pass',name:'Passepartout',slug:'rahmen'},
  {key:'free',name:'Freistehend',slug:'frei'},
  {key:'band',name:'Band',slug:'band'},
  {key:'side',name:'Seitlich',slug:'seitlich'}
];

/* ---------- Hilfen ---------- */
function dims(src){return {w:src.naturalWidth||src.width, h:src.naturalHeight||src.height};}
function getCrop(sw,sh,a,f,z){
  const cw=Math.min(sw,sh*a)/z, ch=cw/a;
  const sx=clamp(f.x*sw-cw/2,0,sw-cw), sy=clamp(f.y*sh-ch/2,0,sh-ch);
  return {sx,sy,cw,ch,fo:{x:(f.x*sw-sx)/cw,y:(f.y*sh-sy)/ch}};
}
function drawCover(ctx,src,r){
  const d=dims(src); const c=getCrop(d.w,d.h,r.w/r.h,S.focus,S.zoom);
  ctx.drawImage(src,c.sx,c.sy,c.cw,c.ch,r.x,r.y,r.w,r.h); return c;
}
function spacedWidth(ctx,t,sp){const ch=Array.from(t);let w=0;for(const c of ch)w+=ctx.measureText(c).width;return w+sp*Math.max(0,ch.length-1);}
function drawSpaced(ctx,t,x,y,sp,align){
  const w=spacedWidth(ctx,t,sp); let cx=align==='center'?x-w/2:x; ctx.textAlign='left';
  for(const c of Array.from(t)){ctx.fillText(c,cx,y);cx+=ctx.measureText(c).width+sp;}
}
function wrapLines(ctx,text,maxW){
  const words=text.trim().split(/\s+/).filter(Boolean); if(!words.length)return [];
  const lines=[]; let cur=words[0];
  for(let i=1;i<words.length;i++){const t=cur+' '+words[i]; if(ctx.measureText(t).width<=maxW)cur=t; else{lines.push(cur);cur=words[i];}}
  lines.push(cur);
  if(lines.length===2){
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
  for(;;){
    ctx.font=fontFn(size); lines=wrapLines(ctx,text,maxW);
    const ok=lines.length<=maxLines&&lines.every(l=>ctx.measureText(l).width<=maxW);
    if(ok||size<=minSize)break; size=Math.max(minSize,size-2);
  }
  if(lines.length>maxLines)lines=lines.slice(0,maxLines-1).concat([lines.slice(maxLines-1).join(' ')]);
  while(size>8&&lines.some(l=>ctx.measureText(l).width>maxW)){size-=1;ctx.font=fontFn(size);}
  return {size,lines};
}

/* ---------- Textblock ---------- */
function buildBlock(ctx,s,maxW,o){
  const items=[]; let w=0;
  const brand=S.brand.trim(), name=S.name.trim(), notes=S.notes.trim();
  if(brand){
    const txt=brand.toUpperCase(); let sz=22*s;
    for(;;){ctx.font=`500 ${sz}px ${F_SANS}`; if(spacedWidth(ctx,txt,sz*0.2)<=maxW||sz<=10*s)break; sz-=1;}
    w=Math.max(w,spacedWidth(ctx,txt,sz*0.2));
    items.push({k:'sp',text:txt,font:`500 ${sz}px ${F_SANS}`,sp:sz*0.2,h:sz*1.3,role:'eyebrow'});
    items.push({k:'gap',h:20*s});
  }
  if(name){
    const f=z=>`500 ${z}px ${F_TITLE}`;
    const r=fitLines(ctx,name,f,o.titleMax*s,(o.titleMin||40)*s,maxW,o.titleLines||2);
    ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.12,h:r.size*1.12*r.lines.length,role:'title'});
  }
  if(notes){
    if(name){items.push({k:'gap',h:24*s});items.push({k:'rule',h:2*s,w:56*s,role:'rule'});items.push({k:'gap',h:22*s});}
    const f=z=>`400 ${z}px ${F_SANS}`;
    const r=fitLines(ctx,notes,f,30*s,18*s,maxW,o.notesLines||2);
    ctx.font=f(r.size); r.lines.forEach(l=>{w=Math.max(w,ctx.measureText(l).width);});
    items.push({k:'ln',lines:r.lines,font:f(r.size),lh:r.size*1.35,h:r.size*1.35*r.lines.length,role:'notes'});
  }
  while(items.length&&items[items.length-1].k==='gap')items.pop();
  return {items,h:items.reduce((a,i)=>a+i.h,0),w};
}
function drawBlock(ctx,b,x,y,align,col){
  let cy=y; ctx.textBaseline='middle';
  for(const it of b.items){
    if(it.k==='gap'){cy+=it.h;continue;}
    if(it.k==='rule'){ctx.fillStyle=col.rule;ctx.fillRect(align==='center'?x-it.w/2:x,cy,it.w,it.h);cy+=it.h;continue;}
    ctx.fillStyle=col[it.role]; ctx.font=it.font;
    if(it.k==='sp'){drawSpaced(ctx,it.text,x,cy+it.h/2,it.sp,align);cy+=it.h;continue;}
    ctx.textAlign=align==='center'?'center':'left';
    for(const l of it.lines){ctx.fillText(l,x,cy+it.lh/2);cy+=it.lh;}
  }
}
function brandH(s){return 24*s*1.2+(S.url?12*s+17*s*1.2:0);}
function drawBrand(ctx,s,cx,top,cLogo,cUrl){
  ctx.textBaseline='middle'; const L=24*s;
  ctx.font=`600 ${L}px ${F_LOGO}`; ctx.fillStyle=cLogo;
  drawSpaced(ctx,'REALM OF FRAGRANCE',cx,top+L*0.6,L*0.3,'center');
  if(S.url){const u=17*s; ctx.font=`400 ${u}px ${F_SANS}`; ctx.fillStyle=cUrl; drawSpaced(ctx,'realmoffragrance.com',cx,top+L*1.2+12*s+u*0.6,u*0.06,'center');}
}

/* ---------- Bildanalyse ---------- */
function toLin(v){return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
function contrastV(a,b){const A=toLin(a),B=toLin(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);}
function analyze(){
  const c=document.createElement('canvas'); c.width=AW; c.height=AH;
  const x=c.getContext('2d',{willReadFrequently:true});
  const crop=drawCover(x,S.prev,{x:0,y:0,w:AW,h:AH});
  const d=x.getImageData(0,0,AW,AH).data;
  const vp=new Float32Array(AW*AH), g=new Float32Array(AW*AH);
  for(let i=0;i<AW*AH;i++){vp[i]=(0.2126*d[4*i]+0.7152*d[4*i+1]+0.0722*d[4*i+2])/255;}
  let gs=0;
  for(let yy=0;yy<AH;yy++)for(let xx=0;xx<AW;xx++){
    const i=yy*AW+xx; const r=xx<AW-1?Math.abs(vp[i]-vp[i+1]):0; const b=yy<AH-1?Math.abs(vp[i]-vp[i+AW]):0;
    g[i]=r+b; gs+=g[i];
  }
  S.an={vp,g,gMean:gs/(AW*AH)||1e-3}; S.fo=crop.fo;
}
function stats(r,W,H){
  const a=S.an;
  let x0=clamp(Math.floor(r.x/W*AW),0,AW-1), x1=clamp(Math.ceil((r.x+r.w)/W*AW),x0+1,AW);
  let y0=clamp(Math.floor(r.y/H*AH),0,AH-1), y1=clamp(Math.ceil((r.y+r.h)/H*AH),y0+1,AH);
  let s=0,sq=0,gs=0,n=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*AW+x;s+=a.vp[i];sq+=a.vp[i]*a.vp[i];gs+=a.g[i];n++;}
  const m=s/n; return {v:m,sd:Math.sqrt(Math.max(0,sq/n-m*m)),busy:(gs/n)/a.gMean};
}
function zoneScore(r,W,H,wBusy,wFocus){
  wBusy=wBusy==null?1:wBusy; wFocus=wFocus==null?2.5:wFocus;
  const st=stats(r,W,H); const fx=S.fo.x*W, fy=S.fo.y*H;
  const dx=Math.max(r.x-fx,0,fx-(r.x+r.w)), dy=Math.max(r.y-fy,0,fy-(r.y+r.h));
  const dist=Math.hypot(dx/W,dy/H); const pen=Math.max(0,1-dist/0.18)*wFocus;
  return st.busy*wBusy+st.sd*3+pen;
}
function solve(st,mode){
  const tv=mode==='light'?0.98:0.10, sv=mode==='light'?0.05:0.965;
  const worst=mode==='light'?Math.min(1,st.v+1.2*st.sd):Math.max(0,st.v-1.2*st.sd);
  let a=0.12, c=0;
  for(;a<=0.76;a+=0.04){c=contrastV(tv,worst*(1-a)+sv*a); if(c>=4.5)break;}
  a=Math.min(a,0.76); c=contrastV(tv,worst*(1-a)+sv*a);
  return {a,c};
}
function chooseColor(st,pref){
  if(pref==='light'||pref==='dark')return Object.assign({mode:pref},solve(st,pref));
  const cands=[Object.assign({mode:'light'},solve(st,'light')),Object.assign({mode:'dark'},solve(st,'dark'))];
  const ok=cands.filter(c=>c.c>=4.5);
  if(ok.length)return ok.sort((p,q)=>p.a-q.a)[0];
  return cands.sort((p,q)=>q.c-p.c)[0];
}
function colorsOf(mode){
  return mode==='light'
    ?{eyebrow:'#D3E6E4',title:'#FAFAF7',rule:'#D3E6E4',notes:'rgba(250,250,247,0.92)',logo:'#FAFAF7',url:'rgba(250,250,247,0.85)'}
    :{eyebrow:PETROL,title:INK,rule:PETROL,notes:'#2E2E2C',logo:PETROL,url:INK2};
}
function rgbOf(mode){return mode==='light'?'12,14,14':'246,245,240';}
function scrimV(ctx,W,H,bTop,bBot,a,rgb,fade){
  const top=Math.max(0,bTop-fade), bot=Math.min(H,bBot+fade), span=bot-top; if(span<=0)return;
  const f=y=>clamp((y-top)/span,0,1);
  const g=ctx.createLinearGradient(0,top,0,bot);
  g.addColorStop(0,`rgba(${rgb},${top<=0.5?a:0})`);
  g.addColorStop(f(bTop),`rgba(${rgb},${a})`);
  g.addColorStop(f(bBot),`rgba(${rgb},${a})`);
  g.addColorStop(1,`rgba(${rgb},${bot>=H-0.5?a:0})`);
  ctx.fillStyle=g; ctx.fillRect(0,top,W,span);
}
function scrimH(ctx,W,H,bL,bR,a,rgb,fade){
  const l=Math.max(0,bL-fade), r=Math.min(W,bR+fade), span=r-l; if(span<=0)return;
  const f=x=>clamp((x-l)/span,0,1);
  const g=ctx.createLinearGradient(l,0,r,0);
  g.addColorStop(0,`rgba(${rgb},${l<=0.5?a:0})`);
  g.addColorStop(f(bL),`rgba(${rgb},${a})`);
  g.addColorStop(f(bR),`rgba(${rgb},${a})`);
  g.addColorStop(1,`rgba(${rgb},${r>=W-0.5?a:0})`);
  ctx.fillStyle=g; ctx.fillRect(l,0,span,H);
}
function brandOnPhoto(ctx,W,H,s,brandTop){
  const br={x:W/2-240*s,y:brandTop,w:480*s,h:brandH(s)};
  const bc=chooseColor(stats(br,W,H),'auto');
  scrimV(ctx,W,H,brandTop-20*s,H,bc.a,rgbOf(bc.mode),200*s);
  const c=colorsOf(bc.mode); drawBrand(ctx,s,W/2,brandTop,c.logo,c.url);
  return bc;
}

/* ---------- Varianten ---------- */
const RENDER={
  pass(ctx,W,H,src){
    const s=W/1000; ctx.fillStyle=PAPER; ctx.fillRect(0,0,W,H);
    const m=56*s, b=buildBlock(ctx,s,W-2*m-80*s,{titleMax:80,titleLines:2,notesLines:2});
    const brandTop=H-m-brandH(s);
    let ph=brandTop-48*s-b.h-58*s-m; ph=Math.max(ph,H*0.45);
    drawCover(ctx,src,{x:m,y:m,w:W-2*m,h:ph});
    const areaTop=m+ph, ty=areaTop+Math.max(0,(brandTop-areaTop-b.h)/2);
    drawBlock(ctx,b,W/2,ty,'center',colorsOf('dark'));
    drawBrand(ctx,s,W/2,brandTop,PETROL,GREY);
    return {ok:true,c:21};
  },
  free(ctx,W,H,src){
    const s=W/1000; drawCover(ctx,src,{x:0,y:0,w:W,h:H});
    const m=72*s, bh=brandH(s), brandTop=H-56*s-bh, o=S.opt.free;
    const b=buildBlock(ctx,s,W-2*m,{titleMax:100,titleLines:2,notesLines:2});
    const topY=m+16*s, botY=brandTop-70*s-b.h;
    let pos=o.pos;
    if(pos==='auto'){
      const w=Math.max(b.w,W*0.4), hh=Math.max(b.h,40*s);
      pos=zoneScore({x:m,y:topY,w,h:hh},W,H)<=zoneScore({x:m,y:botY,w,h:hh},W,H)?'top':'bottom';
    }
    const y=clamp((pos==='top'?topY:botY)+o.shift*0.3*H,m*0.6,Math.max(m*0.6,botY));
    const rect={x:m,y,w:Math.max(b.w,1),h:Math.max(b.h,1)};
    const c=chooseColor(stats(rect,W,H),o.color);
    const fade=260*s; scrimV(ctx,W,H,y,y+b.h,c.a,rgbOf(c.mode),fade);
    drawBlock(ctx,b,m,y,'left',colorsOf(c.mode));
    let worst=c.c;
    if(y+b.h+fade>=H-0.5){const cc=colorsOf(c.mode);drawBrand(ctx,s,W/2,brandTop,cc.logo,cc.url);}
    else{const bc=brandOnPhoto(ctx,W,H,s,brandTop); worst=Math.min(worst,bc.c);}
    return {ok:c.c>=4.5,c:c.c,brandC:worst};
  },
  band(ctx,W,H,src){
    const s=W/1000; drawCover(ctx,src,{x:0,y:0,w:W,h:H});
    const padX=88*s, pad=64*s, bh=brandH(s);
    const b=buildBlock(ctx,s,W-2*padX,{titleMax:84,titleLines:2,notesLines:2});
    const hB=pad+b.h+44*s+bh+pad*0.8, hT=pad+b.h+pad;
    let pos=S.opt.band.pos;
    if(pos==='auto')pos=zoneScore({x:0,y:0,w:W,h:hT},W,H,0.6,4)<=zoneScore({x:0,y:H-hB,w:W,h:hB},W,H,0.6,4)?'top':'bottom';
    ctx.fillStyle=PAPER;
    if(pos==='bottom'){
      const y0=H-hB; ctx.fillRect(0,y0,W,hB);
      drawBlock(ctx,b,W/2,y0+pad,'center',colorsOf('dark'));
      drawBrand(ctx,s,W/2,y0+pad+b.h+44*s,PETROL,GREY);
      return {ok:true,c:21};
    }
    ctx.fillRect(0,0,W,hT);
    drawBlock(ctx,b,W/2,pad,'center',colorsOf('dark'));
    const bc=brandOnPhoto(ctx,W,H,s,H-56*s-bh);
    return {ok:bc.c>=4.5,c:bc.c};
  },
  side(ctx,W,H,src){
    const s=W/1000; drawCover(ctx,src,{x:0,y:0,w:W,h:H});
    const m=64*s, bh=brandH(s), brandTop=H-56*s-bh, bottomY=brandTop-56*s, L=bottomY-m;
    const b=buildBlock(ctx,s,L,{titleMax:124,titleMin:44,titleLines:1,notesLines:1});
    const len=Math.max(b.w,1), th=Math.max(b.h,1);
    const zl={x:m,y:bottomY-len,w:th,h:len}, zr={x:W-m-th,y:bottomY-len,w:th,h:len};
    let pos=S.opt.side.pos;
    if(pos==='auto')pos=zoneScore(zl,W,H)<=zoneScore(zr,W,H)?'left':'right';
    const z=pos==='left'?zl:zr;
    const c=chooseColor(stats(z,W,H),S.opt.side.color);
    scrimH(ctx,W,H,z.x,z.x+z.w,c.a,rgbOf(c.mode),240*s);
    ctx.save(); ctx.translate(z.x,bottomY); ctx.rotate(-Math.PI/2);
    drawBlock(ctx,b,0,0,'left',colorsOf(c.mode)); ctx.restore();
    const bc=brandOnPhoto(ctx,W,H,s,brandTop);
    return {ok:c.c>=4.5&&bc.c>=4.5,c:Math.min(c.c,bc.c)};
  }
};

/* ---------- Zeichnen in der Oberfläche ---------- */
function renderTo(canvas,key,cssW){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const W=Math.max(60,Math.round(Math.min(cssW*dpr,1400))), H=Math.round(W*1.5);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.clearRect(0,0,W,H);
  return RENDER[key](ctx,W,H,S.prev);
}
const varBtns={};
function buildVariants(){
  const box=$('variants');
  LAYOUTS.forEach(l=>{
    const b=document.createElement('button'); b.type='button'; b.className='var'; b.setAttribute('aria-pressed',String(S.layout===l.key));
    const cv=document.createElement('canvas'); cv.setAttribute('aria-hidden','true');
    const nm=document.createElement('span'); nm.className='var-name';
    const t=document.createElement('span'); t.textContent=l.name;
    const dot=document.createElement('span'); dot.className='dot'; dot.title='Lesbarkeit';
    nm.append(t,dot); b.append(cv,nm);
    b.addEventListener('click',()=>{S.layout=l.key; Object.values(varBtns).forEach(v=>v.btn.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); buildCtrls(); schedule();});
    box.append(b); varBtns[l.key]={btn:b,cv,dot};
  });
}
function seg(parent,label,options,get,set){
  const g=document.createElement('div'); g.className='group';
  const lb=document.createElement('span'); lb.className='group-label'; lb.textContent=label;
  const sg=document.createElement('div'); sg.className='seg'; sg.setAttribute('role','group'); sg.setAttribute('aria-label',label);
  options.forEach(([val,txt])=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=txt; b.setAttribute('aria-pressed',String(get()===val));
    b.addEventListener('click',()=>{set(val); sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); schedule();});
    sg.append(b);
  });
  g.append(lb,sg); parent.append(g);
}
function buildCtrls(){
  const c=$('ctrls'); c.textContent='';
  const o=S.opt[S.layout];
  if(S.layout==='pass'){const p=document.createElement('p');p.className='hint';p.textContent='Der Text steht im hellen Rahmen. Diese Variante passt zu jedem Foto.';c.append(p);return;}
  if(S.layout==='band'){const p=document.createElement('p');p.className='hint';p.textContent='Ein heller Streifen trägt den Text. Auto legt ihn dorthin, wo das Motiv nicht ist.';c.append(p);}
  if(S.layout==='side')seg(c,'Seite',[['auto','Auto'],['left','Links'],['right','Rechts']],()=>o.pos,v=>{o.pos=v;});
  else seg(c,'Position',[['auto','Auto'],['top','Oben'],['bottom','Unten']],()=>o.pos,v=>{o.pos=v;});
  if(S.layout==='free'||S.layout==='side')seg(c,'Schrift',[['auto','Auto'],['light','Hell'],['dark','Dunkel']],()=>o.color,v=>{o.color=v;});
  if(S.layout==='free'){
    const g=document.createElement('div'); g.className='field';
    const lb=document.createElement('label'); lb.htmlFor='shift'; lb.textContent='Text verschieben';
    const r=document.createElement('input'); r.type='range'; r.id='shift'; r.min='-1'; r.max='1'; r.step='0.01'; r.value=String(o.shift);
    r.addEventListener('input',()=>{o.shift=parseFloat(r.value)||0; schedule();});
    g.append(lb,r); c.append(g);
  }
}
function drawPicker(){
  const cv=$('focus'), wrap=cv.parentElement; const d=dims(S.prev);
  const maxW=Math.max(100,wrap.clientWidth-20), maxH=240;
  let w=maxW, h=w*d.h/d.w; if(h>maxH){h=maxH;w=h*d.w/d.h;}
  const dpr=Math.min(window.devicePixelRatio||1,2);
  cv.style.width=w+'px'; cv.style.height=h+'px';
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.imageSmoothingQuality='high';
  x.drawImage(S.prev,0,0,w,h);
  const c=getCrop(d.w,d.h,2/3,S.focus,S.zoom); const k=w/d.w;
  const rx=c.sx*k, ry=c.sy*k, rw=c.cw*k, rh=c.ch*k;
  x.fillStyle='rgba(0,0,0,0.5)';
  x.fillRect(0,0,w,ry); x.fillRect(0,ry+rh,w,h-ry-rh); x.fillRect(0,ry,rx,rh); x.fillRect(rx+rw,ry,w-rx-rw,rh);
  x.strokeStyle='rgba(255,255,255,0.9)'; x.lineWidth=1.5; x.strokeRect(rx+0.75,ry+0.75,rw-1.5,rh-1.5);
  const fx=S.focus.x*w, fy=S.focus.y*h;
  x.beginPath(); x.arc(fx,fy,11,0,Math.PI*2); x.fillStyle='rgba(62,107,106,0.35)'; x.fill();
  x.lineWidth=2.5; x.strokeStyle='#FFFFFF'; x.stroke();
  x.beginPath(); x.arc(fx,fy,3,0,Math.PI*2); x.fillStyle='#FFFFFF'; x.fill();
}
function renderAll(){
  if(!S.prev)return;
  drawPicker();
  LAYOUTS.forEach(l=>{
    const v=varBtns[l.key]; const w=v.cv.getBoundingClientRect().width||150;
    const r=renderTo(v.cv,l.key,w); S.res[l.key]=r;
    v.dot.className='dot'+(r.ok?'':' bad'); v.dot.title=r.ok?'Gut lesbar':'Lesbarkeit prüfen';
  });
  const main=$('main'); const mw=main.getBoundingClientRect().width||360;
  const r=renderTo(main,S.layout,mw);
  const chip=$('mainChip');
  if(r.ok){chip.className='chip';chip.textContent='Gut lesbar';}
  else{chip.className='chip bad';chip.textContent=S.layout==='band'?'Lesbarkeit prüfen: Position wechseln':'Lesbarkeit prüfen: Schrift, Position oder Ausschnitt ändern';}
  updateSaveInfo();
}
let raf=0;
function schedule(){if(raf)return; raf=requestAnimationFrame(()=>{raf=0;renderAll();});}

/* ---------- Schriften ---------- */
const FONT_SPECS=['500 40px "Playfair Display"','400 40px Jost','500 40px Jost','600 40px "Cormorant Garamond"'];
function fontsReady(extra){
  if(!document.fonts||!document.fonts.load)return Promise.resolve();
  const t='AaÄäÖöÜüßÊêÉéÈèÂâ’„“REALM OF FRAGRANCE realmoffragrance.com '+(extra||'');
  return Promise.all(FONT_SPECS.map(f=>document.fonts.load(f,t))).catch(()=>{});
}

/* ---------- Foto ---------- */
function makePreview(src){
  const d=dims(src), long=1400; if(Math.max(d.w,d.h)<=long)return src;
  const k=long/Math.max(d.w,d.h), c=document.createElement('canvas');
  c.width=Math.round(d.w*k); c.height=Math.round(d.h*k);
  const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(src,0,0,c.width,c.height); return c;
}
function makeSample(){
  const c=document.createElement('canvas'); c.width=1200; c.height=1800; const x=c.getContext('2d');
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
  S.full=src; S.prev=makePreview(src); S.isSample=isSample;
  $('sampleTag').hidden=!isSample;
  analyze(); schedule();
}
$('file').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  $('fileErr').hidden=true;
  const url=URL.createObjectURL(f); const img=new Image();
  img.onload=()=>{S.focus={x:0.5,y:0.5}; S.zoom=1; $('zoom').value='1'; setImage(img,false); toast('Foto geladen. Tippe jetzt auf dein Motiv.');};
  img.onerror=()=>{URL.revokeObjectURL(url); $('fileErr').hidden=false;};
  img.src=url; e.target.value='';
});
(function(){
  const cv=$('focus'); let down=false;
  const set=e=>{const r=cv.getBoundingClientRect(); S.focus={x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)}; analyze(); schedule();};
  cv.addEventListener('pointerdown',e=>{down=true; try{cv.setPointerCapture(e.pointerId);}catch(_){} set(e);});
  cv.addEventListener('pointermove',e=>{if(down)set(e);});
  const up=()=>{down=false;}; cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
})();
$('zoom').addEventListener('input',e=>{S.zoom=parseFloat(e.target.value)||1; analyze(); schedule();});

/* ---------- Text ---------- */
function checkWarn(){
  const t=[S.brand,S.name,S.notes].join(' '); const m=[];
  if(/&/.test(t))m.push('„und“ statt „&“ schreiben.');
  if(/€|\beuro\b|\d+\s?%/i.test(t))m.push('Keine Preis- oder Rabattangaben auf Pins.');
  if(/\b(im test|getestet|testbericht|praxistest)\b/i.test(t))m.push('Kein „im Test“ oder „getestet“.');
  if(/\bversus\b/i.test(t))m.push('„vs“ statt „versus“ schreiben.');
  if(/\bboozy\b/i.test(t))m.push('„boozy“ deutsch umschreiben, z. B. „cognacwarm“.');
  if(/oriental|exotisch/i.test(t))m.push('Begriff aus dem Sprachleitfaden vermeiden.');
  const w=$('warn'); w.hidden=!m.length; w.textContent=m.join(' ');
}
[['brand','brand'],['name','name'],['notes','notes']].forEach(([id,key])=>{
  const el=$(id); el.value=S[key];
  el.addEventListener('input',()=>{
    if(el.value.indexOf("'")>-1){const p=el.selectionStart; el.value=el.value.replace(/'/g,'’'); try{el.setSelectionRange(p,p);}catch(_){}}
    S[key]=el.value; $('textHint').hidden=true; checkWarn(); schedule(); fontsReady(el.value).then(schedule);
  });
});
$('url').addEventListener('change',e=>{S.url=e.target.checked; schedule();});

/* ---------- Speichern ---------- */
function slug(t){
  return (t||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'pin';
}
function fileName(){const l=LAYOUTS.find(x=>x.key===S.layout); return `pin-${slug(S.name)}-${l.slug}.jpg`;}
function updateSaveInfo(){
  const W=S.size, H=W*1.5; let t=`${W} × ${H} px, JPEG mit Qualität 100 %.`;
  if(!S.isSample&&S.full){
    const d=dims(S.full); const a=S.layout==='pass'?(W-112*W/1000)/(H*0.6):2/3;
    const c=getCrop(d.w,d.h,a,S.focus,S.zoom); const need=S.layout==='pass'?W*0.89:W;
    if(c.cw<need*0.95)t+=` Dein Ausschnitt hat ${Math.round(c.cw)} px Breite und wird hochgerechnet. Mit weniger Vergrößerung oder 1000 × 1500 bleibt er schärfer.`;
  }
  $('saveInfo').textContent=t;
}
(function(){
  const sg=$('sizeSeg');
  [[2000,'2000 × 3000'],[1000,'1000 × 1500']].forEach(([v,txt])=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=txt; b.setAttribute('aria-pressed',String(S.size===v));
    b.addEventListener('click',()=>{S.size=v; sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); updateSaveInfo();});
    sg.append(b);
  });
})();
let toastT=0;
function toast(msg){const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{t.hidden=true;},3200);}
let resUrl=null;
function showResult(blob,meta,name){
  if(resUrl)URL.revokeObjectURL(resUrl); resUrl=URL.createObjectURL(blob);
  $('resImg').src=resUrl; $('resMeta').textContent=meta;
  const a=$('resDl'); a.href=resUrl; a.download=name||'pin.jpg';
  $('result').hidden=false; $('resClose').focus();
}
$('resClose').addEventListener('click',()=>{$('result').hidden=true;});
$('result').addEventListener('click',e=>{if(e.target===$('result'))$('result').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('result').hidden=true;});
$('save').addEventListener('click',async()=>{
  const btn=$('save'); if(btn.disabled)return;
  btn.disabled=true; btn.textContent='Wird erstellt …';
  try{
    await fontsReady([S.brand,S.name,S.notes].join(' '));
    const W=S.size, H=Math.round(W*1.5);
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H);
    RENDER[S.layout](ctx,W,H,S.full);
    const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',1));
    c.width=1; c.height=1;
    const name=fileName(), meta=`${W} × ${H} px · ${(blob.size/1048576).toFixed(1).replace('.',',')} MB · JPEG 100 %`;
    const file=new File([blob],name,{type:'image/jpeg'});
    let handled=false;
    if(navigator.canShare&&navigator.share){
      let can=false; try{can=navigator.canShare({files:[file]});}catch(_){can=false;}
      if(can){
        try{await navigator.share({files:[file]}); toast('Fertig: '+name); handled=true;}
        catch(e){ if(e&&e.name==='AbortError'){toast('Speichern abgebrochen.'); handled=true;} }
      }
    }
    if(!handled)showResult(blob,meta,name);
  }catch(err){
    toast('Das Bild konnte nicht erstellt werden. Bitte mit 1000 × 1500 noch einmal versuchen.');
  }finally{
    btn.disabled=false; btn.textContent='Als JPEG speichern';
  }
});

/* ---------- Start ---------- */
buildVariants(); buildCtrls();
setImage(makeSample(),true);
fontsReady().then(schedule);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
window.addEventListener('resize',schedule);
})();
