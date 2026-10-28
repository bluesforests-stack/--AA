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
 const mobile=innerWidth<=780,columns=mobile?2:3;
 field.classList.toggle('is-static',reduced.matches);
 // Pack rotated bounds into staggered columns. Reserve the entire parallax
 // travel above and below every image, so different velocities cannot collide.
 const margin=innerWidth*(mobile?.055:.055),gutter=innerWidth*(mobile?.055:.045);
 const columnWidth=(innerWidth-2*margin-gutter*(columns-1))/columns;
 const travel=mobile?12:24,gap=mobile?24:30;
 const bottoms=Array.from({length:columns},(_,i)=>70+i*(mobile?55:95));
 const angles=[-1.6,1.2,-.8,1.8,-1.3,.7];
 for(const [rank,entry] of items.entries()){
  const card=entry.element,ribbon=entry.aspect<.2;
  card.classList.toggle('ribbon',ribbon);
  const angle=ribbon?(rank%2?.3:-.3):angles[rank%angles.length];
  const radians=Math.abs(angle)*Math.PI/180;
  const fraction=ribbon?.88:[.98,.92,1,.95][rank%4];
  // Solve the rotated bounding width, including a conservative caption height.
  const width=(columnWidth-48*Math.sin(radians))/(Math.cos(radians)+Math.sin(radians)/entry.aspect)*fraction;
  const height=width/entry.aspect+48;
  const boundW=width*Math.cos(radians)+height*Math.sin(radians);
  const boundH=height*Math.cos(radians)+width*Math.sin(radians);
  const lane=bottoms.indexOf(Math.min(...bottoms));
  const boundTop=bottoms[lane]+travel;
  const left=margin+lane*(columnWidth+gutter)+(columnWidth-width)/2;
  const top=boundTop+(boundH-height)/2;
  card.style.width=width+'px';card.style.left=left+'px';card.style.top=top+'px';
  card.style.setProperty('--card-angle',reduced.matches?'0deg':angle+'deg');
  card.dataset.streamIndex=String(rank);entry.baseCenter=top+height/2;
  entry.travel=travel;entry.speed=speedFor(entry.group,mobile);
  bottoms[lane]=boundTop+boundH+travel+gap;
 }
 field.style.height=reduced.matches?'auto':Math.ceil(Math.max(...bottoms)+55)+'px';
 updateScroll();
}
function updateScroll(){
 raf=0;if(!field||!items.length)return;
 const rect=field.getBoundingClientRect();
 const progress=Math.max(0,Math.min(1,(-rect.top+innerHeight*.3)/(field.offsetHeight-innerHeight*.4)));
 document.querySelector('.archive-progress').style.width=progress*100+'%';
 for(const layer of field.querySelectorAll('.parallax-layer'))layer.style.transform='none';
 for(const entry of items){
  const distance=innerHeight*.5-(rect.top+entry.baseCenter);
  const shift=reduced.matches?0:Math.max(-entry.travel,Math.min(entry.travel,distance*(1-entry.speed)));
  entry.element.style.setProperty('--parallax-y',shift+'px');
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
