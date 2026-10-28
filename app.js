import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

const $ = s => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const chapters = {
 space: {title:'Space',number:'02',point:new THREE.Vector3(2.4,.3,1.0),heading:'空間，作為城市的身份。',description:'建築形態 · 城市脈絡 · 空間設計',view:new THREE.Vector3(12.7,9.8,15)},
 visual: {title:'Visual',number:'01',point:new THREE.Vector3(-2.5,.65,1.6),heading:'視覺，重新辨識城市。',description:'道路標誌 · 城市符號 · 視覺轉譯',view:new THREE.Vector3(7,7,18)},
 sound: {title:'Sound',number:'03',point:new THREE.Vector3(.2,2.55,-.5),heading:'聲音，連結日常與記憶。',description:'日常聲景 · 文化記憶 · 生活經驗',view:new THREE.Vector3(-10,9,18)}
};
let renderer, camera, controls, city, running=true, tween=null;
let toastTimer;
const toast = text => { $('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200); };
const scene = new THREE.Scene();
scene.background=new THREE.Color('#f2f2f2');
const hotspots=[];
let modelReady=false,heroInView=true;
new IntersectionObserver(entries=>{heroInView=entries[0].isIntersecting;},{rootMargin:'100px'}).observe($('#experience'));
let autoRotate=false;
let initialPosition=new THREE.Vector3(12.7,9.8,15);
const initialTarget=new THREE.Vector3(0,0,0);
const clock=new THREE.Clock();

function setup(){
 try {
 renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<2,alpha:false,powerPreference:'high-performance'});
 }catch(e){fail('此瀏覽器暫時無法啟用 3D，請使用支援 WebGL 的瀏覽器重試。');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.06;
 $('#scene').appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','可旋轉的橫琴與澳門建築場景');
 camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,150);
 camera.position.copy(initialPosition);
 controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.065;
 controls.enablePan=false;controls.minDistance=8;controls.maxDistance=32;
 controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI*.48;
 controls.autoRotate=autoRotate;controls.autoRotateSpeed=.3;
 controls.target.copy(initialTarget);
 controls.addEventListener('start',()=>{tween=null;});
 renderer.domElement.addEventListener('wheel',event=>{if(!event.shiftKey)event.stopImmediatePropagation();},{capture:true,passive:true});
 scene.add(new THREE.HemisphereLight(0xd9e8f1,0x354333,2.8));
 const key=new THREE.DirectionalLight(0xffe8ce,3.7);key.position.set(7,12,8);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa0d6e0,2.1);fill.position.set(-8,6,-5);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(8.5,96),new THREE.MeshBasicMaterial({color:0xcacaca,transparent:true,opacity:.10,depthWrite:false}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-3.1;scene.add(ground);
 const ring=new THREE.Mesh(new THREE.RingGeometry(7.5,7.515,128),new THREE.MeshBasicMaterial({color:0xa6a6a6,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;ring.position.y=-3.08;scene.add(ring);
 const ring2=ring.clone();ring2.scale.setScalar(.93);ring2.material=ring.material.clone();ring2.material.opacity=.11;scene.add(ring2);
 for(const [id,chapter] of Object.entries(chapters)){
  const button=document.createElement('a');button.href='./'+id+'/';button.className='hotspot';button.dataset.label=id;button.setAttribute('aria-label','前往 '+chapter.title);
  button.innerHTML=`<span class="hotspot-dot"></span><span class="hotspot-label">${chapter.title}<small>${chapter.number}</small></span>`;
  $('#hotspots').appendChild(button);hotspots.push({id,button,point:chapter.point});
 }
 resize();window.addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;fail('3D 畫面暫時中斷，請重新載入。');});
 animate();loadCity();
}
function resize(){
 if(!renderer)return;
 const w=$('#scene').clientWidth,h=$('#scene').clientHeight;
 camera.aspect=w/h;
 camera.fov=w<=700?68:w<=900?46:38;
 camera.setViewOffset(w,h,w>900?-w*.15:w>600?-w*.09:0,w<=700?-h*.015:h*.035,w,h);
 camera.updateProjectionMatrix();renderer.setSize(w,h);
}
async function loadCity(){
 try{
  const res=await fetch('./assets/model.json', {cache:'no-store'});if(!res.ok)throw Error('模型清單讀取失敗');const info=await res.json();let received=0;
  const chunks=await Promise.all(info.parts.map(async part=>{
   const r=await fetch(part.url);if(!r.ok)throw Error('模型下載失敗');const reader=r.body.getReader();const list=[];let size=0;
   while(true){const {value,done}=await reader.read();if(done)break;list.push(value);size+=value.length;received+=value.length;const p=Math.min(89,Math.floor(received/info.compressedBytes*89));$('#progress').style.width=p+'%';$('#load-percent').textContent=p+'%';}
   const b=new Uint8Array(size);let i=0;for(const a of list){b.set(a,i);i+=a.length;}return b;
  }));
  $('#load-message').textContent='正在解析模型與材質';$('#progress').style.width='92%';$('#load-percent').textContent='92%';
  const zipped=new Blob(chunks);
  if(!('DecompressionStream' in window))throw Error('目前的瀏覽器不支援模型解壓，請更新瀏覽器');
  const buffer=await new Response(zipped.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,location.href.replace(/[^/]*$/,''));
  city=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(city),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const scale=10/Math.max(size.x,size.y,size.z);city.scale.setScalar(scale);city.position.copy(center).multiplyScalar(-scale);
  city.traverse(obj=>{if(obj.isMesh){obj.frustumCulled=true;}});
  scene.add(city);
  const base=-size.y*scale/2;groundHeight(base);
  controls.update();renderer.render(scene,camera);
  modelReady=true;$('#progress').style.width='100%';$('#load-percent').textContent='100%';$('#load-message').textContent='準備就緒';
  setTimeout(()=>{$('#loading').classList.add('done');hotspots.forEach(h=>h.button.classList.add('visible'));},300);
  window.__cityReady=true;
 }catch(error){console.error(error);fail('模型載入失敗，請檢查網絡後重試。');}
}
function groundHeight(base){scene.children.forEach(o=>{if(o.isMesh && o.geometry.type==='CircleGeometry')o.position.y=base-.025;if(o.isMesh&&o.geometry.type==='RingGeometry')o.position.y=base-.015;});}
function fail(message){$('#loading').classList.remove('done');$('#loading h2').textContent='暫時無法進入地圖';$('#load-message').textContent=message;$('#load-percent').textContent='';$('#retry').hidden=false;}
$('#retry').onclick=()=>location.reload();
function animate(){
 if(!running)return;requestAnimationFrame(animate);if(!heroInView)return;const dt=Math.min(clock.getDelta(),.1);
 if(tween){const t=Math.min(1,(performance.now()-tween.start)/tween.duration);const e=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t===1)tween=null;}
 controls.update(dt);
 if(modelReady){
  const occupied=[];
  for(const h of hotspots){
   const p=h.point.clone().project(camera),width=h.button.offsetWidth||145,height=h.button.offsetHeight||50;
   const sceneWidth=$('#scene').clientWidth,sceneHeight=$('#scene').clientHeight;
   const minY=innerWidth<=780?220:100,maxY=sceneHeight-120;
   const originX=(p.x*.5+.5)*sceneWidth,originY=(-p.y*.5+.5)*sceneHeight;
   const clampX=x=>Math.max(10,Math.min(sceneWidth-width-10,x));
   const clampY=y=>Math.max(minY,Math.min(maxY,y));
   let x=clampX(originX),y=clampY(originY);
   const offsets=[[0,0],[0,-55],[0,55],[-100,-30],[100,30],[0,-110],[0,110],[-100,-85],[100,85]];
   for(const [dx,dy] of offsets){
    const cx=clampX(originX+dx),cy=clampY(originY+dy);
    if(!occupied.some(o=>cx<o.x+o.width+8&&cx+width+8>o.x&&cy<o.y+o.height+8&&cy+height+8>o.y)){x=cx;y=cy;break;}
   }
   occupied.push({x,y,width,height});h.button.style.transform=`translate3d(${x}px,${y}px,0)`;h.button.style.visibility=p.z>1?'hidden':'visible';
  }
 }
 renderer.render(scene,camera);
}
function flyTo(position,target,duration=1000){
 if(!controls)return;
 if(reduceMotion){camera.position.copy(position);controls.target.copy(target);controls.update();return;}
 tween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration};
}

function openProject(){if(controls)controls.autoRotate=false;$('#project-dialog').showModal();$('#project-dialog').scrollTop=0;}
$('#about').onclick=openProject;
$('#read-project').onclick=openProject;
$('#close-project').onclick=()=>$('#project-dialog').close();
$('#back-to-atlas').onclick=()=>$('#project-dialog').close();
$('#project-dialog').addEventListener('close',()=>{if(controls)controls.autoRotate=autoRotate;});
$('#help-button').onclick=()=>{if(controls)controls.autoRotate=false;$('#help').showModal();};
$('#close-help').onclick=()=>$('#help').close();
$('#start-explore').onclick=()=>$('#help').close();
$('#help').addEventListener('close',()=>{if(controls)controls.autoRotate=autoRotate;});
function updateRotate(){
 if(controls)controls.autoRotate=autoRotate&&!$('#help').open&&!$('#project-dialog').open;
 $('#rotate').setAttribute('aria-pressed',String(autoRotate));
 $('#rotate').setAttribute('aria-label',autoRotate?'暫停自動旋轉':'開啟自動旋轉');
 $('#rotate-icon').textContent=autoRotate?'Ⅱ':'▷';
 $('#rotate-text').textContent=autoRotate?'自動環繞':'手動探索';
}
$('#rotate').onclick=()=>{autoRotate=!autoRotate;updateRotate();};
function reset(){flyTo(initialPosition,initialTarget);toast('已回到地圖全景');}
$('#reset').onclick=reset;
function zoom(factor){if(!camera||!controls)return;tween=null;const direction=camera.position.clone().sub(controls.target),distance=THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(direction.setLength(distance));controls.update();}
$('#zoom-in').onclick=()=>zoom(.85);$('#zoom-out').onclick=()=>zoom(1.15);
updateRotate();setup();
