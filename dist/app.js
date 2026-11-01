import {createWorld} from './world.js';
import {destinations,spawn,surfaceAt,movePlayer,areaAt,visitIdAt,nearestStair} from './navigation.js';
import {floorById} from './layout.js';
import {drawFloorMap,drawOverview,mapHits} from './map.js';

const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let preferences=read('shinjuku-walk-preferences-v1',{});
if(!preferences||typeof preferences!=='object')preferences={};
let sensitivity=Math.max(.4,Math.min(1.8,Number(preferences.sensitivity)||1));
let speed=[1.5,2.8].includes(preferences.speed)?preferences.speed:2.8;
let quality=[1,1.5].includes(preferences.quality)?preferences.quality:1.5;
const rawVisited=read('shinjuku-walk-visited-v2',[]);
const visited=new Set(Array.isArray(rawVisited)?rawVisited.filter(id=>destinations.some(d=>d.id===id)):[]);
let world,started=false,activeDialog=null,walked=0,yaw=-Math.PI/2,pitch=-.035;
let position={...spawn};
let mapFloor='overview';
const keys=new Set(),joy={x:0,y:0},velocity={x:0,z:0};
let toastTimer,hintTimer,joyPointer=null,lookPointer=null,lastLook=null;
let lastFrame=0,lastMap=0,stepDistance=0;
let audioContext,audioGain,audioEnabled=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
function stopInput(){keys.clear();joy.x=joy.y=velocity.x=velocity.z=0;joyPointer=lookPointer=null;$('stick').style.transform='translate(0,0)';lastLook=null;}
function storePreferences(){save('shinjuku-walk-preferences-v1',{sensitivity,speed,quality});}
function markArea(){
  const id=visitIdAt(position);
  if(!id)return;
  if(!visited.has(id)){visited.add(id);save('shinjuku-walk-visited-v2',[...visited]);updateDestinations();}
  $('visited').textContent=`${visited.size} / ${destinations.length} エリア`;
}
function updateLocation(){
  for(const b of document.querySelectorAll('[data-view-floor]'))b.classList.toggle('active',b.dataset.viewFloor===position.floor);
  $('floor').textContent=position.stairId?'↕':position.floor;$('location').textContent=areaAt(position.x,position.z,position);
  const connection=nearestStair(position);$('connection-hint').hidden=!connection;if(connection)$('connection-hint').textContent=`階段 ${connection.from} ↔ ${connection.to} · ${connection.label}`;
  if(started)markArea();
}
function start(){
  if(started||!world)return;started=true;
  $('intro').hidden=true;$('intro-caption').hidden=true;$('play-ui').hidden=false;
  updateLocation();$('world').focus({preventScroll:true});hintTimer=setTimeout(()=>$('look-hint').style.opacity='0',6500);
}
$('start').addEventListener('click',start);
function openDialog(id){stopInput();if(activeDialog)activeDialog.close();activeDialog=$(id);activeDialog.showModal();if(id==='map-dialog'){updateDestinations();drawMap($('large-map'),true);}}
for(const d of document.querySelectorAll('dialog')){
  d.querySelector('.close-dialog').addEventListener('click',()=>d.close());
  d.addEventListener('close',()=>{if(activeDialog===d)activeDialog=null;stopInput();});
  d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
}
$('settings').addEventListener('click',()=>openDialog('settings-dialog'));
$('about').addEventListener('click',()=>openDialog('about-dialog'));
for(const id of['open-map','mini-map-button'])$(id).addEventListener('click',()=>openDialog('map-dialog'));
function teleport(d){
  stopInput();position=surfaceAt(d.x,d.z,d.floor);yaw=d.yaw;pitch=-.035;
  if(!started)start();if(activeDialog)activeDialog.close();
  world.camera.position.set(position.x,position.y+1.65,position.z);updateLocation();toast(`${d.name}へ移動しました`);$('world').focus({preventScroll:true});
}
$('reset').addEventListener('click',()=>teleport(destinations[0]));
function updateDestinations(){
  $('destination-list').replaceChildren();
  destinations.forEach((d,i)=>{
    if(mapFloor!=='overview'&&d.floor!==mapFloor)return;
    const b=document.createElement('button');b.className='destination';
    b.innerHTML=`<span class="destination-num">${String(i+1).padStart(2,'0')}</span><span class="destination-name"><strong>${d.name}</strong><small>${d.floor} · ${d.en}</small></span>${visited.has(d.id)?'<span class="destination-visited">訪問済</span>':''}<svg><use href="#i-arrow"/></svg>`;
    b.addEventListener('click',()=>{if(world)teleport(d);});$('destination-list').append(b);
  });
}
function drawMap(canvas,large=false){
  const marker={...position,yaw};
  if(large&&mapFloor==='overview')drawOverview(canvas,marker,visited);
  else drawFloorMap(canvas,marker,visited,large?mapFloor:position.floor,large);
}
function setMapFloor(value){
  mapFloor=value;
  for(const option of document.querySelectorAll('[data-map-floor]')){const selected=option.dataset.mapFloor===value;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));}
  $('map-description').textContent=mapFloor==='overview'?'地下通路・ホーム・改札階を、22か所の階段でひと続きに。':`${mapFloor} · ${floorById[mapFloor].title}（黄色い部分が階段）`;
  updateDestinations();drawMap($('large-map'),true);
}
for(const b of document.querySelectorAll('[data-map-floor]'))b.addEventListener('click',()=>setMapFloor(b.dataset.mapFloor));
for(const b of document.querySelectorAll('[data-view-floor]'))b.addEventListener('click',()=>{setMapFloor(b.dataset.viewFloor);openDialog('map-dialog');});
$('large-map').addEventListener('click',e=>{
  if(!world)return;const canvas=$('large-map'),r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;
  const hit=(mapHits.get(canvas)??[]).find(h=>Math.hypot(h.x-x,h.y-y)<19);if(hit)teleport(hit.d);
});
$('sensitivity').value=sensitivity;
$('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);storePreferences();});
function selectOption(id,value){for(const b of $(id).querySelectorAll('button')){const selected=Number(b.dataset.value)===value;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}}
selectOption('speed-options',speed);selectOption('quality-options',quality);
for(const b of $('speed-options').querySelectorAll('button'))b.addEventListener('click',()=>{speed=Number(b.dataset.value);selectOption('speed-options',speed);storePreferences();});
for(const b of $('quality-options').querySelectorAll('button'))b.addEventListener('click',()=>{quality=Number(b.dataset.value);world?.setQuality(quality);selectOption('quality-options',quality);storePreferences();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('このブラウザでは全画面表示に対応していません');if(activeDialog)activeDialog.close();}catch{toast('全画面表示を開始できませんでした');}});

function updateJoystick(e){const r=$('joystick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const limit=34,length=Math.hypot(dx,dy),factor=length>limit?limit/length:1;joy.x=dx*factor/limit;joy.y=dy*factor/limit;$('stick').style.transform=`translate(${dx*factor}px,${dy*factor}px)`;}
$('joystick').addEventListener('pointerdown',e=>{if(joyPointer!==null)return;e.preventDefault();joyPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);updateJoystick(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoystick(e);});
function releaseJoystick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;joy.x=joy.y=0;$('stick').style.transform='translate(0,0)';}
for(const name of['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(name,releaseJoystick);
$('world').addEventListener('pointerdown',e=>{if(!started||activeDialog||lookPointer!==null)return;if(e.pointerType==='mouse'&&e.button!==0)return;lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};$('world').focus({preventScroll:true});$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!lastLook)return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;yaw-=dx*.0032*sensitivity;pitch=Math.max(-1.1,Math.min(1.1,pitch-dy*.0028*sensitivity));lastLook={x:e.clientX,y:e.clientY};$('look-hint').style.opacity='0';});
for(const name of['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(name,e=>{if(e.pointerId===lookPointer){lookPointer=null;lastLook=null;}});
document.addEventListener('keydown',e=>{if(!started||activeDialog||['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',stopInput);
document.addEventListener('visibilitychange',()=>{stopInput();if(document.hidden){audioContext?.suspend();}else if(audioEnabled){audioContext?.resume().catch(()=>{});}});

function createAudio(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');
  audioContext=new Audio();audioGain=audioContext.createGain();audioGain.gain.value=.28;audioGain.connect(audioContext.destination);
  const buffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=190;const gain=audioContext.createGain();gain.gain.value=.12;source.connect(filter).connect(gain).connect(audioGain);source.start();
  const hum=audioContext.createOscillator();hum.frequency.value=60;const humGain=audioContext.createGain();humGain.gain.value=.015;hum.connect(humGain).connect(audioGain);hum.start();
}
function footstep(){
  if(!audioEnabled||!audioContext||audioContext.state!=='running')return;
  const n=Math.floor(audioContext.sampleRate*.095),b=audioContext.createBuffer(1,n,audioContext.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/n*10);
  const s=audioContext.createBufferSource();s.buffer=b;const f=audioContext.createBiquadFilter();f.type='lowpass';f.frequency.value=650;const g=audioContext.createGain();g.gain.value=.18;s.connect(f).connect(g).connect(audioGain);s.start();s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
}
$('sound').addEventListener('click',async()=>{
  try{if(!audioContext)createAudio();await audioContext.resume();audioEnabled=!audioEnabled;audioGain.gain.setTargetAtTime(audioEnabled ? .28 : 0,audioContext.currentTime,.12);$('sound').setAttribute('aria-pressed',String(audioEnabled));$('sound').setAttribute('aria-label',audioEnabled?'環境音をオフにする':'環境音をオンにする');$('sound').querySelector('use').setAttribute('href',audioEnabled?'#i-volume':'#i-mute');toast(audioEnabled?'環境音をオンにしました':'環境音をオフにしました');}catch{toast('このブラウザでは環境音を再生できません');}
});

function frame(t){
  const dt=Math.min(.045,(t-lastFrame)/1000||.016);lastFrame=t;
  if(started&&!activeDialog&&!document.hidden){
    let horizontal=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    let forward=-joy.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    const len=Math.hypot(horizontal,forward);if(len>1){horizontal/=len;forward/=len;}
    const vx=(-Math.sin(yaw)*forward+Math.cos(yaw)*horizontal)*speed,vz=(-Math.cos(yaw)*forward-Math.sin(yaw)*horizontal)*speed;
    const smooth=1-Math.exp(-dt*14);velocity.x+=(vx-velocity.x)*smooth;velocity.z+=(vz-velocity.z)*smooth;
    const next=movePlayer(position,velocity.x*dt,velocity.z*dt),distance=Math.hypot(next.x-position.x,next.z-position.z);position=next;walked+=distance;stepDistance+=distance;
    if(stepDistance>.8){stepDistance=0;footstep();}
    $('walked').textContent=Math.floor(walked);updateLocation();
  }
  world.camera.position.x=position.x;world.camera.position.z=position.z;
  world.camera.position.y+=(position.y+1.65-world.camera.position.y)*(1-Math.exp(-dt*20));
  world.camera.rotation.y=yaw+(!started&&!reducedMotion?Math.sin(t*.00012)*.025:0);world.camera.rotation.x=pitch;
  if(t-lastMap>180){lastMap=t;drawMap($('mini-map'));if(activeDialog?.id==='map-dialog')drawMap($('large-map'),true);}
  world.render(t);requestAnimationFrame(frame);
}
function showError(error){console.error('3D scene could not start',error);$('error').hidden=false;$('intro').hidden=true;$('intro-caption').hidden=true;}
requestAnimationFrame(()=>{
  try{world=createWorld($('world'));world.setQuality(quality);world.camera.position.set(position.x,position.y+1.65,position.z);world.camera.rotation.y=yaw;world.camera.rotation.x=pitch;world.render(0);$('start').disabled=false;$('start-label').textContent='散策をはじめる';requestAnimationFrame(frame);}
  catch(error){showError(error);}
});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();stopInput();showError(new Error('WebGL context lost'));});
window.addEventListener('resize',()=>world?.resize());
updateDestinations();drawMap($('mini-map'));updateLocation();
