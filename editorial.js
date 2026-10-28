const field=document.querySelector('#gallery-field');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const groupNames={1:'空間',2:'視覺',3:'聲音'};
let items=[],activeIndex=0,raf=0,scrollLock='';
const viewer=document.querySelector('#image-viewer');
// A single reading sequence interleaves all three source layers.
const streamOrder=[[1,0],[2,0],[3,0],[1,1],[3,1],[2,1],[3,2],[1,2],[2,2],[3,3],[2,3],[1,3],[3,4],[1,4],[3,5],[2,4],[3,6],[1,5],[3,9],[2,5],[3,7],[1,6],[3,10],[2,6],[3,8]];
const streamRank=new Map(streamOrder.map(([g,i],rank)=>[`${g}:${i}`,rank]));
// Five art-directed spreads, with quiet depth rather than competing scroll speeds.
function speedFor(group){return {1:.97,2:1,3:1.03}[group];}
let compositions=[];
const desktopSpreads=[
 [[6,29,.02,-.6],[39,23,.16,.8],[69,24,.05,-.7],[13,25,.45,.5],[48,31,.52,-.4]],
 [[6,22,.02,.7],[30,34,.12,-.5],[72,22,.09,.6],[12,25,.53,-.8],[57,28,.57,.4]],
 [[7,30,.03,-.5],[44,24,.02,.6],[70,24,.31,-.4],[15,28,.48,.7],[47,32,.58,-.6]],
 [[5,25,.03,.6],[36,32,.15,-.4],[73,22,.04,.5],[12,7,.42,-.2],[35,57,.65,.3]],
 [[6,28,.02,-.6],[40,29,.17,.5],[82,7,.04,.2],[9,60,.69,-.3],[62,27,.46,.6]]
];
const mobileSpreads=[
 [[5,47,.02,-.5],[52,43,.17,.6],[8,43,.47,-.4],[48,45,.62,.5],[19,60,.99,-.3]],
 [[5,43,.01,.5],[42,53,.22,-.4],[7,44,.61,.5],[51,44,.73,-.4],[14,64,1.12,.3]],
 [[5,48,.02,-.5],[53,42,.19,.4],[6,45,.53,-.4],[47,48,.72,.5],[15,65,1.1,-.4]],
 [[5,45,.02,.5],[46,49,.18,-.4],[7,43,.59,.5],[80,10,.58,-.2],[8,74,1.12,.2]],
 [[5,47,.02,-.5],[48,46,.24,.4],[83,10,.01,.2],[6,76,.91,-.2],[44,49,1.12,.4]]
];
function layout(){
 if(!field)return;
 const mobile=innerWidth<=780,unit=innerWidth*(mobile?.94:.7);
 field.classList.toggle('is-static',reduced.matches);compositions=[];
 let cursor=mobile?35:65;
 const plans=mobile?mobileSpreads:desktopSpreads;
 for(let spread=0;spread<5;spread++){
  const entries=items.slice(spread*5,spread*5+5),plan=plans[spread];let end=0;const placed=[];
  entries.forEach((entry,i)=>{
   const [x,w,y,angle]=plan[i],ribbon=entry.aspect<.2,card=entry.element;
   const width=Math.min(entry.sourceWidth||entry.width,innerWidth*w/100),height=width/entry.aspect;
   let top=cursor+y*unit;const left=innerWidth*x/100;
   // Preserve the composed position unless it hides too much of another image.
   const candidate={left,top,width,height};
   const intersection=(a,b)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
   for(let attempt=0;attempt<180;attempt++){
    candidate.top=top;const all=[...placed,candidate];
    const tooDense=all.some(a=>all.reduce((sum,b)=>sum+(a===b?0:intersection(a,b)),0)>a.width*a.height*.15);
    if(!tooDense)break;top+=6;
   }
   placed.push({...candidate,top});
   card.classList.toggle('ribbon',ribbon);card.style.width=width+'px';card.style.left='0px';card.style.top='0px';
   card.style.transformOrigin='50% 50%';card.style.zIndex=String([2,4,1,5,3][i]);
   card.dataset.streamIndex=String(spread*5+i);card.dataset.composition=String(spread);
   entry.speed=speedFor(entry.group);compositions.push({entry,left,top,height,angle,travel:mobile?6:10});
   end=Math.max(end,top-cursor+height+35);
  });
  cursor+=end+(mobile?28:40);
 }
 field.style.height=reduced.matches?'auto':Math.ceil(cursor+30)+'px';updateScroll();
}
function updateScroll(){
 raf=0;if(!field||!items.length)return;
 const rect=field.getBoundingClientRect();
 document.querySelector('.archive-progress').style.width=Math.max(0,Math.min(1,(-rect.top+innerHeight*.3)/(field.offsetHeight-innerHeight*.4)))*100+'%';
 for(const layer of field.querySelectorAll('.parallax-layer'))layer.style.transform='none';
 for(const {entry,left,top,height,angle,travel} of compositions){
  const d=innerHeight*.5-(rect.top+top+height/2);
  const shift=reduced.matches?0:travel*Math.tanh(d*(1-entry.speed)/travel);
  entry.element.style.transform=`translate3d(${left}px,${top+shift}px,0) rotate(${angle}deg)`;
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
 fetch('./media/gallery.json?v=20261028-editorial').then(r=>{if(!r.ok)throw Error('gallery');return r.json();}).then(data=>{
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
