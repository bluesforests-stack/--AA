const field=document.querySelector('#gallery-field');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const groupNames={1:'空間',2:'視覺',3:'聲音'};
let items=[],activeIndex=0,raf=0,scrollLock='';
const viewer=document.querySelector('#image-viewer');
// A single reading sequence interleaves all three source layers.
const streamOrder=[[1,0],[2,0],[3,0],[1,1],[3,1],[2,1],[3,2],[1,2],[2,2],[3,3],[2,3],[1,3],[3,4],[1,4],[3,5],[2,4],[3,6],[1,5],[3,9],[2,5],[3,7],[1,6],[3,10],[2,6],[3,8]];
const streamRank=new Map(streamOrder.map(([g,i],rank)=>[`${g}:${i}`,rank]));
// Scroll-driven contact sheets: three seamless, independently moving image bands.
let bands=[],galleryStage=null;
function ensureStage(){
 if(galleryStage)return;
 galleryStage=document.createElement('div');galleryStage.className='gallery-stage';
 for(const layer of field.querySelectorAll('.parallax-layer'))galleryStage.appendChild(layer);
 field.appendChild(galleryStage);
 const hint=document.createElement('div');hint.className='gallery-motion-hint';
 hint.innerHTML='<span>向下捲動 · 圖像橫向流動</span><span>SCROLL TO EXPLORE →</span>';
 galleryStage.appendChild(hint);
}
function layout(){
 if(!field)return;ensureStage();
 const mobile=innerWidth<=780,staticMode=reduced.matches;
 field.classList.toggle('is-static',staticMode);bands=[];
 field.querySelectorAll('[data-copy]').forEach(e=>e.remove());
 const stickyTop=mobile?155:132;
 const stageHeight=Math.max(mobile?410:480,innerHeight-stickyTop);
 galleryStage.style.height=staticMode?'auto':stageHeight+'px';
 const tileHeight=stageHeight*.315;
 const speeds=mobile?[.42,.72,1.04]:[.48,.80,1.18];
 for(let group=1;group<=3;group++){
  const layer=field.querySelector(`[data-group="${group}"]`);
  const entries=items.filter(e=>e.group===group).sort((a,b)=>a.ordinal-b.ordinal);
  const top=stageHeight*([.025,.32,.615][group-1]);
  let cursor=0;
  for(const entry of entries){
   const card=entry.element,ribbon=entry.aspect<.2;
   let height=tileHeight*(ribbon?1.04:[1,.96,1.03,.98][entry.ordinal%4]);
   let width=Math.min(height*entry.aspect,entry.sourceWidth||entry.width);
   height=width/entry.aspect;
   const y=top+(tileHeight-height)/2+stageHeight*([-.012,.006,.014,-.005][entry.ordinal%4]);
   const angle=[-.6,.45,-.35,.7,-.45][(entry.ordinal+group)%5];
   card.classList.toggle('ribbon',ribbon);card.style.width=width+'px';
   card.style.left='0px';card.style.top='0px';card.style.transformOrigin='50% 50%';
   card.style.transform=`translate3d(${cursor}px,${y}px,0) rotate(${angle}deg)`;
   card.style.zIndex=String(group);card.dataset.streamIndex=String(items.indexOf(entry));
   entry.bandX=cursor;entry.bandY=y;entry.bandAngle=angle;
   cursor+=width+(mobile?22:32);
  }
  const cycle=cursor,repeat=Math.ceil(innerWidth/cycle)+2;
  if(!staticMode)for(let copy=1;copy<repeat;copy++)for(const entry of entries){
   const clone=entry.element.cloneNode(true);clone.dataset.copy=String(copy);clone.tabIndex=-1;clone.setAttribute('aria-hidden','true');
   clone.style.transform=`translate3d(${entry.bandX+cycle*copy}px,${entry.bandY}px,0) rotate(${entry.bandAngle}deg)`;
   clone.addEventListener('click',()=>openViewer(items.indexOf(entry)));layer.appendChild(clone);
  }
  bands.push({layer,cycle,speed:speeds[group-1],phase:cycle*[.02,.24,.46][group-1]});
 }
 // Enough travel to reveal every source image at least once, with no empty tail.
 const travel=Math.max(...bands.map(b=>b.cycle/b.speed));
 field.style.height=staticMode?'auto':Math.ceil(travel+stageHeight)+'px';
 field.dataset.galleryMode=staticMode?'static':'continuous';
 updateScroll();
}
function updateScroll(){
 raf=0;if(!field||!items.length)return;
 const rect=field.getBoundingClientRect(),stickyTop=innerWidth<=780?155:132;
 const distance=Math.max(0,Math.min(field.offsetHeight-galleryStage.offsetHeight,stickyTop-rect.top));
 const total=Math.max(1,field.offsetHeight-galleryStage.offsetHeight);
 document.querySelector('.archive-progress').style.width=Math.min(1,distance/total)*100+'%';
 for(const band of bands){
  const x=reduced.matches?0:-((distance*band.speed+band.phase)%band.cycle);
  band.layer.style.transform=`translate3d(${x}px,0,0)`;
 }
}
function queueScroll(){if(!raf)raf=requestAnimationFrame(updateScroll);}
function showImage(index){
 activeIndex=(index+items.length)%items.length;const entry=items[activeIndex];
 const image=document.querySelector('#viewer-image');image.src=entry.src;image.alt=entry.title;
 const ribbon=entry.aspect<.2;document.querySelector('.viewer-stage').classList.toggle('source-strip',ribbon);image.style.setProperty('--source-width',(entry.sourceWidth||entry.width)+'px');
 document.querySelector('#viewer-title').textContent=entry.title;
 document.querySelector('#viewer-group').textContent=`0${entry.group} / ${groupNames[entry.group]}`;
 document.querySelector('#viewer-index').textContent=`${String(activeIndex+1).padStart(2,'0')} / ${items.length}`;
 document.querySelector('.viewer-stage').classList.remove('zoomed');document.querySelector('#viewer-fit').textContent=entry.aspect<.2?'原始尺寸':'放大閱讀';document.querySelector('#viewer-fit').setAttribute('aria-pressed','false');
 document.querySelector('.viewer-stage').scrollTop=0;
}
function openViewer(index){showImage(index);scrollLock=document.body.style.overflow;document.body.style.overflow='hidden';viewer.showModal();}
if(field){
 fetch('./media/gallery.json?v=20261029-continuous').then(r=>{if(!r.ok)throw Error('gallery');return r.json();}).then(data=>{
  const counts={1:0,2:0,3:0};items=data.map((entry,index)=>{
   const ordinal=counts[entry.group]++,button=document.createElement('button');button.type='button';button.className='gallery-card';button.setAttribute('aria-label',`展開${groupNames[entry.group]}圖像：${entry.title}`);
   const image=document.createElement('img');image.src=entry.thumb||entry.src;image.alt=entry.title;image.loading='eager';image.fetchPriority='low';image.decoding='sync';image.width=entry.width;image.height=entry.height;
   const caption=document.createElement('figcaption');const title=document.createElement('span');title.textContent=entry.title;const count=document.createElement('span');count.textContent=`0${entry.group} / ${String(ordinal+1).padStart(2,'0')}`;caption.append(title,count);button.append(image,caption);button.addEventListener('click',()=>openViewer(items.findIndex(item=>item.element===button)));field.querySelector(`[data-group="${entry.group}"]`).append(button);return {...entry,ordinal,element:button};
  });items.sort((a,b)=>streamRank.get(`${a.group}:${a.ordinal}`)-streamRank.get(`${b.group}:${b.ordinal}`));layout();window.__atlasGalleryReady=true;
 }).catch(error=>{console.error(error);field.textContent='圖像檔案暫時無法載入，請重新整理。';});
 addEventListener('scroll',queueScroll,{passive:true});addEventListener('resize',layout);reduced.addEventListener('change',layout);
 document.querySelectorAll('[data-layer]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-layer]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  field.querySelectorAll('.parallax-layer').forEach(layer=>layer.classList.toggle('muted-layer',button.dataset.layer!=='all'&&button.dataset.layer!==layer.dataset.group));
 }));
 document.querySelector('#viewer-close').onclick=()=>viewer.close();
 document.querySelector('#viewer-prev').onclick=()=>showImage(activeIndex-1);document.querySelector('#viewer-next').onclick=()=>showImage(activeIndex+1);
 document.querySelector('#viewer-fit').onclick=()=>{const stage=document.querySelector('.viewer-stage'),zoom=stage.classList.toggle('zoomed');document.querySelector('#viewer-fit').textContent=zoom?'適合畫面':(items[activeIndex].aspect<.2?'原始尺寸':'放大閱讀');document.querySelector('#viewer-fit').setAttribute('aria-pressed',String(zoom));};
 viewer.addEventListener('close',()=>{document.body.style.overflow=scrollLock;});
 viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close();}});
 document.addEventListener('keydown',e=>{if(!viewer.open)return;if(e.key==='ArrowLeft'){e.preventDefault();showImage(activeIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showImage(activeIndex+1);}});
}
const film=document.querySelector('#atlas-film');
if(film){
 film.muted=true;film.defaultMuted=true;
 let manuallyPaused=false,internal=false,visible=false;
 const play=()=>{if(visible&&!manuallyPaused)film.play().catch(()=>{});};
 film.addEventListener('pause',()=>{if(!internal&&!document.hidden&&visible)manuallyPaused=true;});
 film.addEventListener('play',()=>{manuallyPaused=false;});
 film.addEventListener('loadeddata',play);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{
  visible=entries[0].isIntersecting;
  if(visible)play();
  else if(!film.paused){internal=true;film.pause();setTimeout(()=>internal=false,100);}
 },{threshold:.15}).observe(film);
 else{visible=true;play();}
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){internal=true;film.pause();setTimeout(()=>internal=false,100);}else play();
 });
}
