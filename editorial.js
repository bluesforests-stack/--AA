const field=document.querySelector('#gallery-field');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const groupNames={1:'空間',2:'視覺',3:'聲音'};
let items=[],activeIndex=0,raf=0,scrollLock='';
const viewer=document.querySelector('#image-viewer');
// A single reading sequence interleaves all three source layers.
const streamOrder=[[1,0],[2,0],[3,0],[1,1],[3,1],[2,1],[3,2],[1,2],[2,2],[3,3],[2,3],[1,3],[3,4],[1,4],[3,5],[2,4],[3,6],[1,5],[3,9],[2,5],[3,7],[1,6],[3,10],[2,6],[3,8]];
const streamRank=new Map(streamOrder.map(([g,i],rank)=>[`${g}:${i}`,rank]));
// Clearly separated velocities; smooth saturation keeps neighbouring pairs apart.
function speedFor(group,mobile){return (mobile?{1:.42,2:1,3:1.68}:{1:.35,2:1,3:1.8})[group];}
let compositions=[];
function layout(){
 if(!field)return;
 const mobile=innerWidth<=780;
 field.classList.toggle('is-static',reduced.matches);compositions=[];
 let cursor=mobile?55:90;
 const angles=[-1.1,.8,-.7,1.2,-.9,.6];
 for(let i=0;i<items.length;i+=2){
  const entries=items.slice(i,i+2),row=i/2;
  const shapes=entries.map((entry,j)=>{
   const ribbon=entry.aspect<.2,wide=entry.aspect>2;
   // Never enlarge the narrow paper strips beyond their source pixels.
   const width=Math.min(entry.sourceWidth||entry.width,innerWidth*(ribbon?(mobile?.19:.105):wide?(mobile?.62:.49):(mobile?.45:[.30,.33,.29][(row+j)%3])));
   const height=width/entry.aspect,angle=ribbon?(j?.25:-.25):angles[(i+j)%angles.length];
   const r=Math.abs(angle)*Math.PI/180;
   return{entry,width,height,angle,bw:width*Math.cos(r)+height*Math.sin(r),bh:height*Math.cos(r)+width*Math.sin(r)};
  });
  const minHeight=Math.min(...shapes.map(x=>x.bh)),travel=Math.min(mobile?45:85,minHeight*.24);
  const rowHeight=Math.max(...shapes.map(x=>x.bh));
  const composition={shapes,travel,center:cursor+travel+rowHeight/2,row};
  for(const shape of shapes){
   const {entry,width,angle,height}=shape,card=entry.element;
   card.classList.toggle('ribbon',entry.aspect<.2);card.style.width=width+'px';card.style.left='0px';card.style.top='0px';
   card.style.setProperty('--card-angle',reduced.matches?'0deg':angle+'deg');
   card.style.transformOrigin=`50% ${height/2}px`;
   card.dataset.streamIndex=String(items.indexOf(entry));card.dataset.composition=String(row);
   entry.speed=speedFor(entry.group,mobile);
  }
  compositions.push(composition);
  cursor+=rowHeight+travel*1.35+(mobile?24:[35,50,30][row%3])+35;
 }
 field.style.height=reduced.matches?'auto':Math.ceil(cursor+40)+'px';
 updateScroll();
}
function updateScroll(){
 raf=0;if(!field||!items.length)return;
 const rect=field.getBoundingClientRect(),mobile=innerWidth<=780;
 document.querySelector('.archive-progress').style.width=Math.max(0,Math.min(1,(-rect.top+innerHeight*.3)/(field.offsetHeight-innerHeight*.4)))*100+'%';
 for(const layer of field.querySelectorAll('.parallax-layer'))layer.style.transform='none';
 for(const composition of compositions){
  const {shapes,center,travel,row}=composition;
  const distance=innerHeight*.5-(rect.top+center);
  const ys=shapes.map(shape=>center+(reduced.matches?0:travel*Math.tanh(distance*(1-shape.entry.speed)/travel)));
  let overlap=0;
  if(shapes.length===2){
   const [a,b]=shapes;
   const intersectionHeight=Math.min(ys[0]+a.bh/2,ys[1]+b.bh/2)-Math.max(ys[0]-a.bh/2,ys[1]-b.bh/2);
   // One partner per artwork: 12–16% intersection of the smaller bounds.
   // Recalculate horizontal intersection as the two vertical speeds diverge.
   const target=[.14,.12,.16,.13][row%4];
   overlap=target*Math.min(a.bw*a.bh,b.bw*b.bh)/intersectionHeight;
  }
  const span=shapes.reduce((n,x)=>n+x.bw,0)-overlap;
  const free=Math.max(0,innerWidth-span),fractions=mobile?[.5,.42,.58]:[.25,.72,.42,.65];
  let x=free*fractions[row%fractions.length];
  shapes.forEach((shape,j)=>{
   const card=shape.entry.element;
   card.style.transform=`translate3d(${x+(shape.bw-shape.width)/2}px,${ys[j]-shape.height/2}px,0) rotate(${shape.angle}deg)`;
   x+=shape.bw-overlap;
  });
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
 fetch('./media/gallery.json?v=20261028-rhythm').then(r=>{if(!r.ok)throw Error('gallery');return r.json();}).then(data=>{
  const counts={1:0,2:0,3:0};items=data.map((entry,index)=>{
   const ordinal=counts[entry.group]++,button=document.createElement('button');button.type='button';button.className='gallery-card';button.setAttribute('aria-label',`展開${groupNames[entry.group]}圖像：${entry.title}`);
   const image=document.createElement('img');image.src=entry.src;image.alt=entry.title;image.loading='lazy';image.decoding='async';image.width=entry.width;image.height=entry.height;
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
