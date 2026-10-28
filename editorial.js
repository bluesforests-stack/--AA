const field=document.querySelector('#gallery-field');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const groupNames={1:'空間',2:'視覺',3:'聲音'};
let items=[],activeIndex=0,raf=0,scrollLock='';
const viewer=document.querySelector('#image-viewer');
// A single reading sequence interleaves all three source layers.
const streamOrder=[[1,0],[2,0],[3,0],[1,1],[3,1],[2,1],[3,2],[1,2],[2,2],[3,3],[2,3],[1,3],[3,4],[1,4],[3,5],[2,4],[3,6],[1,5],[3,9],[2,5],[3,7],[1,6],[3,10],[2,6],[3,8]];
const streamRank=new Map(streamOrder.map(([g,i],rank)=>[`${g}:${i}`,rank]));
function speedFor(group,mobile){const base=Number(field.querySelector(`[data-group="${group}"]`).dataset.speed);return mobile?1+(base-1)*.65:base;}
function layout(){
 if(!field)return;
 const mobile=innerWidth<=780;field.classList.toggle('is-static',reduced.matches);
 const pathX=[7,36,63,19,54,5,42,64,23,9,57,32];
 const mobileX=[5,25,10,22,3,27,8,20];
 const angles=[-2.3,1.7,-1.1,2.6,-1.9,.9];
 let beat=0,maxReach=0;
 for(const [rank,entry] of items.entries()){
  const card=entry.element,ribbon=entry.aspect<.2,panorama=entry.aspect>2;
  card.classList.toggle('ribbon',ribbon);
  let width=mobile?(ribbon?25:panorama?86:entry.aspect>1.2?78:[67,71,64,69][rank%4]):(ribbon?14:panorama?58:entry.aspect>1.2?36:[27,28,30,26,29][rank%5]);
  let left=mobile?mobileX[rank%mobileX.length]:pathX[rank%pathX.length];
  if(panorama)left=mobile?7:rank%2?7:35;
  if(ribbon)left=entry.ordinal===9?(mobile?8:13):(mobile?65:71);
  width=Math.min(width,96-left);
  const angle=ribbon?(entry.ordinal===9?-1.3:1.1):angles[rank%angles.length];
  const pixels=innerWidth*width/100,imageHeight=pixels/entry.aspect;
  const speed=speedFor(entry.group,mobile),baseY=beat*speed+[110,145,125,165,135,150][rank%6];
  card.style.width=width+'vw';card.style.left=left+'vw';card.style.top=baseY+'px';
  card.style.setProperty('--card-angle',reduced.matches?'0deg':angle+'deg');card.dataset.streamIndex=String(rank);
  const occupiedHeight=imageHeight+Math.abs(Math.sin(angle*Math.PI/180))*pixels+48;
  maxReach=Math.max(maxReach,(baseY+occupiedHeight)/speed);
  const spacing=ribbon?(mobile?230:270):panorama?(mobile?155:190):Math.max(mobile?160:190,Math.min(mobile?255:310,imageHeight*.46));
  beat+=spacing*[1,.88,1.09,.94][rank%4];
 }
 field.style.height=reduced.matches?'auto':Math.ceil(maxReach+Math.min(220,innerHeight*.24))+'px';
 updateScroll();
}
function updateScroll(){
 raf=0;if(!field||!items.length)return;
 const rect=field.getBoundingClientRect(),distance=Math.max(0,Math.min(field.offsetHeight,-rect.top));
 const progress=Math.max(0,Math.min(1,(-rect.top+innerHeight*.3)/(field.offsetHeight-innerHeight*.4)));
 document.querySelector('.archive-progress').style.width=progress*100+'%';
 for(const layer of field.querySelectorAll('.parallax-layer')){
  const speed=speedFor(Number(layer.dataset.group),innerWidth<=780);
  layer.style.transform=reduced.matches?'none':`translate3d(0,${distance*(1-speed)}px,0)`;
 }
}
function queueScroll(){if(!raf)raf=requestAnimationFrame(updateScroll);}
function showImage(index){
 activeIndex=(index+items.length)%items.length;const entry=items[activeIndex];
 const image=document.querySelector('#viewer-image');image.src=entry.src;image.alt=entry.title;
 document.querySelector('#viewer-title').textContent=entry.title;
 document.querySelector('#viewer-group').textContent=`0${entry.group} / ${groupNames[entry.group]}`;
 document.querySelector('#viewer-index').textContent=`${String(activeIndex+1).padStart(2,'0')} / ${items.length}`;
 document.querySelector('.viewer-stage').classList.remove('zoomed');document.querySelector('#viewer-fit').textContent='放大閱讀';document.querySelector('#viewer-fit').setAttribute('aria-pressed','false');
 document.querySelector('.viewer-stage').scrollTop=0;
}
function openViewer(index){showImage(index);scrollLock=document.body.style.overflow;document.body.style.overflow='hidden';viewer.showModal();}
if(field){
 fetch('./media/gallery.json').then(r=>{if(!r.ok)throw Error('gallery');return r.json();}).then(data=>{
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
 document.querySelector('#viewer-fit').onclick=()=>{const stage=document.querySelector('.viewer-stage'),zoom=stage.classList.toggle('zoomed');document.querySelector('#viewer-fit').textContent=zoom?'適合畫面':'放大閱讀';document.querySelector('#viewer-fit').setAttribute('aria-pressed',String(zoom));};
 viewer.addEventListener('close',()=>{document.body.style.overflow=scrollLock;});
 viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close();}});
 document.addEventListener('keydown',e=>{if(!viewer.open)return;if(e.key==='ArrowLeft'){e.preventDefault();showImage(activeIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showImage(activeIndex+1);}});
}
const film=document.querySelector('#atlas-film');
if(film&&'IntersectionObserver'in window){let manuallyPaused=false,internal=false;
 film.addEventListener('pause',()=>{if(!internal&&film.getBoundingClientRect().top<innerHeight&&film.getBoundingClientRect().bottom>0)manuallyPaused=true;});
 new IntersectionObserver(entries=>{const visible=entries[0].isIntersecting;
  if(visible&&!reduced.matches&&!manuallyPaused)film.play().catch(()=>{});
  else if(!visible&&!film.paused){internal=true;film.pause();setTimeout(()=>internal=false,100);}
 },{threshold:.35}).observe(film);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)film.pause();});
}
