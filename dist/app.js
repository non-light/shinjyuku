import {amenities,amenityTypes,amenityApproach,facingAmenity} from './amenities.js';
import {operators,ticketGates,gateApproach,isTransfer} from './station.js';
import {createWorld} from './world.js';
import {createAvatar} from './avatar.js';
import {createShoulderCamera} from './shoulder-camera.js';
import {destinations,spawn,surfaceAt,movePlayer,areaAt,visitIdAt,nearestStair,nearbyGate,gateCrossing} from './navigation.js';
import {floors,floorById,stairs} from './layout.js';
import {drawFloorMap,drawOverview,mapHits} from './map.js';

const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let preferences=read('shinjuku-walk-preferences-v1',{});
if(!preferences||typeof preferences!=='object')preferences={};
let sensitivity=Math.max(.4,Math.min(1.8,Number(preferences.sensitivity)||1));
let speed=[1.5,2.8].includes(preferences.speed)?preferences.speed:2.8;
let movementMode=preferences.movementMode==='run'?'run':'walk';
let cameraMode=preferences.cameraMode==='first'?'first':'shoulder';
let avatarColor=['red','blue','yellow','green'].includes(preferences.avatarColor)?preferences.avatarColor:'red';
const runningSpeed=5.6;
let quality=[1,1.5].includes(preferences.quality)?preferences.quality:1.5;
const rawVisited=read('shinjuku-walk-visited-v2',[]);
const visited=new Set(Array.isArray(rawVisited)?rawVisited.filter(id=>destinations.some(d=>d.id===id)):[]);
let world,started=false,activeDialog=null,walked=0,yaw=-Math.PI/2,pitch=-.035;
let avatar,avatarReady,appliedColor,colorRequest=0,followCamera,cameraCut=true;
let position={...spawn};
let mapFloor='overview',mapPanel='map',selectedPlace=null;
let seated=null,openLocker=null;
const drinksReady=new Set();
const keys=new Set(),joy={x:0,y:0},velocity={x:0,z:0};
let toastTimer,hintTimer,joyPointer=null,lookPointer=null,lastLook=null;
let lastFrame=0,lastMap=0,stepDistance=0;
let audioContext,audioGain,audioEnabled=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
function stopInput(){keys.clear();joy.x=joy.y=velocity.x=velocity.z=0;joyPointer=lookPointer=null;$('stick').style.transform='translate(0,0)';lastLook=null;updateMovementMode();}
function storePreferences(){save('shinjuku-walk-preferences-v1',{sensitivity,speed,quality,movementMode,cameraMode,avatarColor});}
function isRunning(){return movementMode==='run'||keys.has('ShiftLeft')||keys.has('ShiftRight');}
function updateMovementMode(){
  const mode=isRunning()?'run':'walk';
  selectOption('movement-options',mode);
  selectOption('movement-setting-options',mode);
}
function markArea(){
  const id=visitIdAt(position);
  if(!id)return;
  if(!visited.has(id)){visited.add(id);save('shinjuku-walk-visited-v2',[...visited]);updateDestinations();}
  $('visited').textContent=`${visited.size} / ${destinations.length} エリア`;
}
function updateLocation(){
  $('current-floor-badge').textContent=position.floor;
  $('floor').textContent=position.stairId?'↕':position.floor;$('location').textContent=areaAt(position.x,position.z,position);
  const gate=nearbyGate(position),connection=gate?null:nearestStair(position);
  const actionable=started&&(seated||openLocker||facingAmenity(position,yaw));
  updateAmenityPrompt(actionable);
  $('connection-hint').hidden=Boolean(actionable)||(!gate&&!connection);
  if(gate)$('connection-hint').textContent=operators[gate.operator].short+' · '+gate.name+' ｜ '+(gate.oneWay?'出場専用':gate.toward);
  else if(connection)$('connection-hint').textContent='階段 '+connection.from+' ↔ '+connection.to+' · '+connection.label;
  if(started)markArea();
}
function updateAmenityPrompt(a){
  const button=$('amenity-use');button.hidden=!a;
  if(!a)return;
  let action;
  if(a.type==='locker')action=openLocker?'扉を閉める':'09番の扉を開ける';
  if(a.type==='vending')action=drinksReady.has(a.id)?'水を受け取る':'水を1本出す';
  if(a.type==='bench')action=seated?'立ち上がる':'ベンチに座る';
  const where=a.area+' · '+amenityTypes[a.type].name;
  if($('amenity-where').textContent!==where)$('amenity-where').textContent=where;
  if($('amenity-action').textContent!==action)$('amenity-action').textContent=action;
}
function endInspection(){
  if(openLocker){world.amenityControls.setLockerOpen(openLocker.id,false);openLocker=null;}
  if(seated)cameraCut=true;
  seated=null;
}
function useAmenity(){
  if(!started||activeDialog||!world)return;
  if(seated||openLocker){endInspection();}
  else{
    const a=facingAmenity(position,yaw);if(!a)return;
    const front=amenityApproach(a);
    stopInput();position=surfaceAt(front.x,front.z,front.floor);yaw=front.yaw;pitch=front.pitch;cameraCut=true;
    if(a.type==='locker'){
      openLocker=a;world.amenityControls.setLockerOpen(a.id,true);
    }else if(a.type==='vending'){
      const dispense=!drinksReady.has(a.id);
      if(dispense)drinksReady.add(a.id);else drinksReady.delete(a.id);
      world.amenityControls.setDrinkVisible(a.id,dispense);
      pitch=dispense?-.57:front.pitch;
      toast(dispense?'取り出し口に水が出ました':'水を受け取りました');
    }else{
      seated=a;yaw=a.yaw+Math.PI;pitch=-.035;
    }
  }
  updateLocation();$('world').focus({preventScroll:true});
}
$('amenity-use').addEventListener('click',useAmenity);
function start(){
  if(started||!world)return;started=true;
  $('intro').hidden=true;$('intro-caption').hidden=true;$('play-ui').hidden=false;
  updateLocation();$('world').focus({preventScroll:true});hintTimer=setTimeout(()=>$('look-hint').style.opacity='0',6500);
}
$('start').addEventListener('click',start);
function openDialog(id){stopInput();if(activeDialog)activeDialog.close();activeDialog=$(id);activeDialog.showModal();if(id==='map-dialog'){updateDestinations();if(mapPanel==='map')drawMap($('large-map'),true);}}
for(const d of document.querySelectorAll('dialog')){
  d.querySelector('.close-dialog').addEventListener('click',()=>d.close());
  d.addEventListener('close',()=>{if(activeDialog===d)activeDialog=null;stopInput();});
  d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
}
$('settings').addEventListener('click',()=>openDialog('settings-dialog'));
$('about').addEventListener('click',()=>openDialog('about-dialog'));
for(const id of['open-map','mini-map-button','error-map'])$(id).addEventListener('click',()=>openDialog('map-dialog'));
function teleport(d){
  if(!world)return;
  endInspection();stopInput();position=surfaceAt(d.x,d.z,d.floor);yaw=d.yaw;pitch=d.pitch??-.035;
  if(!started)start();if(activeDialog)activeDialog.close();
  cameraCut=true;updateLocation();toast(`${d.name}へ移動しました`);$('world').focus({preventScroll:true});
}
$('reset').addEventListener('click',()=>teleport({...spawn,name:'西口地下広場'}));
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
  const marker={...position,x:seated?.x??position.x,z:seated?.z??position.z,yaw};
  if(large&&mapFloor==='overview')drawOverview(canvas,marker,visited);
  else drawFloorMap(canvas,marker,visited,large?mapFloor:position.floor,large,large?selectedPlace:null);
}
function setMapFloor(value){
  mapFloor=value;
  if(selectedPlace?.floor!==value)selectedPlace=null;
  $('place-detail').hidden=!selectedPlace;
  for(const option of document.querySelectorAll('[data-map-floor]')){const selected=option.dataset.mapFloor===value;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));}
  $('map-description').textContent=mapFloor==='overview'?`地下7階から地上2階まで。駅の${ticketGates.length}か所の改札と${stairs.length}か所の階段を歩けます。`:`${mapFloor} · ${floorById[mapFloor].title}（黄色い部分が階段）`;
  updateDestinations();drawMap($('large-map'),true);
}
function showPanel(panel){
  mapPanel=panel;
  for(const [id,tab] of [['map','map'],['gate','gates'],['amenity','amenities']]){
    $(id+'-panel').hidden=tab!==panel;
    $('mode-'+tab).setAttribute('aria-pressed',String(tab===panel));
  }
  if(panel==='gates')renderGateList();
  if(panel==='map')drawMap($('large-map'),true);
}
function inspectPlace(p){
  selectedPlace=p;setMapFloor(p.floor);showPanel('map');
  const kind=p.type?amenityTypes[p.type]:null,group=kind??operators[p.operator];
  $('place-detail').style.setProperty('--rail',group.color);
  $('detail-operator').textContent=group.name+'  /  '+p.floor;
  $('detail-name').textContent=kind?p.area:p.name;
  $('detail-route').textContent=kind?kind.help:p.toward;
  $('detail-note').textContent=kind?'散策用の配置':[isTransfer(p)?'のりかえ改札':'',p.note].filter(Boolean).join(' · ');
  $('walk-place').disabled=!world;
  $('map-dialog').scrollTop=0;
}
function renderAmenityList(){
  const list=$('amenity-list');
  for(const [type,kind] of Object.entries(amenityTypes)){
    const group=amenities.filter(a=>a.type===type);
    const heading=document.createElement('h3');heading.className='gate-group';heading.style.setProperty('--rail',kind.color);
    heading.textContent=kind.name+'　'+group.length+'か所';list.append(heading);
    for(const a of group){
      const row=document.createElement('button');row.className='gate-row';row.style.setProperty('--rail',kind.color);
      row.innerHTML='<span class="gate-mark amenity-mark" aria-hidden="true">'+kind.mark+'</span><span><strong>'+a.area+'</strong><small>'+a.floor+' · '+kind.name+'</small></span><span class="go" aria-hidden="true">→</span>';
      row.addEventListener('click',()=>inspectPlace(a));list.append(row);
    }
  }
  $('amenity-total').textContent=amenities.length;
}
renderAmenityList();
function renderGateList(){
  const filter=$('gate-operator').value,query=$('gate-search').value.trim().toLowerCase();
  const list=$('gate-list');list.replaceChildren();
  const matching=ticketGates.filter(g=>{
    const sharedTransfer=isTransfer(g)&&(g.negative===filter||g.positive===filter);
    const terms=[operators[g.operator].name,g.name,g.toward,g.note,g.floor].join(' ').toLowerCase();
    return (!filter||g.operator===filter||sharedTransfer)&&terms.includes(query);
  });
  $('gate-count').textContent=matching.length+' か所'+(matching.length?'':' · 路線や検索語を変えてください');
  for(const [id,op] of Object.entries(operators)){
    const group=matching.filter(g=>g.operator===id);if(!group.length)continue;
    const heading=document.createElement('h3');heading.className='gate-group';heading.style.setProperty('--rail',op.color);heading.textContent=op.name;list.append(heading);
    for(const g of group){
      const row=document.createElement('button');row.className='gate-row';row.style.setProperty('--rail',op.color);
      row.innerHTML='<span class="gate-mark" aria-hidden="true">▥</span><span><strong>'+g.name+'</strong><small>'+g.floor+' · '+(g.oneWay?g.note:g.toward)+'</small></span><span class="go" aria-hidden="true">→</span>';
      row.addEventListener('click',()=>inspectPlace(g));list.append(row);
    }
  }
}
for(const [id,op] of Object.entries(operators))$('gate-operator').add(new Option(op.name,id));
$('gate-total').textContent=ticketGates.length;
$('gate-search').addEventListener('input',renderGateList);$('gate-operator').addEventListener('change',renderGateList);
$('mode-map').addEventListener('click',()=>showPanel('map'));$('mode-gates').addEventListener('click',()=>showPanel('gates'));
$('play-gates').addEventListener('click',()=>{showPanel('gates');openDialog('map-dialog');});
$('mode-amenities').addEventListener('click',()=>showPanel('amenities'));
$('walk-place').addEventListener('click',()=>{
  if(!selectedPlace)return;
  const p=selectedPlace;
  teleport(p.type?amenityApproach(p):{...gateApproach(p),name:p.name});
});
for(const id of ['overview',...floors.map(f=>f.id).reverse()]){
  const b=document.createElement('button');b.dataset.mapFloor=id;b.textContent=id==='overview'?'立体':id;
  b.addEventListener('click',()=>setMapFloor(id));$('floor-tabs').append(b);
}
$('current-plan').addEventListener('click',()=>{setMapFloor(position.floor);showPanel('map');openDialog('map-dialog');});
$('large-map').addEventListener('click',e=>{
  const canvas=$('large-map'),r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;
  const hit=(mapHits.get(canvas)??[]).map(h=>({h,d:Math.hypot(h.x-x,h.y-y)})).filter(v=>v.d<18).sort((a,b)=>a.d-b.d)[0]?.h;
  if(hit?.gate||hit?.amenity)inspectPlace(hit.gate??hit.amenity);else if(hit?.d&&world)teleport(hit.d);
});
$('sensitivity').value=sensitivity;
$('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);storePreferences();});
function selectOption(id,value){for(const b of $(id).querySelectorAll('button')){const selected=b.dataset.value===String(value);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}}
async function loadAvatarColor(color){
  const request=++colorRequest;
  $('avatar-status').textContent='';
  try{
    if(!avatarReady){
      avatarReady=createAvatar(world.scene,color).then(loaded=>{
        avatar=loaded;appliedColor=color;cameraCut=true;return loaded;
      }).catch(error=>{avatarReady=null;throw error;});
    }
    const loaded=await avatarReady;
    if(request!==colorRequest)return;
    if(await loaded.setColor(color))appliedColor=color;
  }catch(error){
    if(request!==colorRequest)return;
    console.error('Character model could not be loaded',error);
    if(appliedColor){avatarColor=appliedColor;selectOption('avatar-options',avatarColor);storePreferences();}
    const message='人物の読み込みに失敗しました。服の色を選ぶと再読み込みできます。';
    $('avatar-status').textContent=message;toast(message);
  }
}
selectOption('camera-options',cameraMode);selectOption('avatar-options',avatarColor);
for(const button of $('camera-options').querySelectorAll('button'))button.addEventListener('click',()=>{
  cameraMode=button.dataset.value;cameraCut=true;
  selectOption('camera-options',cameraMode);storePreferences();
  if(cameraMode==='shoulder'&&world&&!avatar)loadAvatarColor(avatarColor);
});
for(const button of $('avatar-options').querySelectorAll('button'))button.addEventListener('click',()=>{
  avatarColor=button.dataset.value;selectOption('avatar-options',avatarColor);storePreferences();
  if(world)loadAvatarColor(avatarColor);
});
selectOption('speed-options',speed);selectOption('quality-options',quality);
updateMovementMode();
for(const id of ['movement-options','movement-setting-options']){
  for(const button of $(id).querySelectorAll('button'))button.addEventListener('click',()=>{
    movementMode=button.dataset.value;
    updateMovementMode();storePreferences();
    toast(movementMode==='run'?'走るモードに切り替えました':'歩くモードに切り替えました');
    if(started&&!activeDialog)$('world').focus({preventScroll:true});
  });
}
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
document.addEventListener('keydown',e=>{
  if(!started||activeDialog||['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)useAmenity();return;}
  if(e.code==='ShiftLeft'||e.code==='ShiftRight'){
    keys.add(e.code);updateMovementMode();return;
  }
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
    e.preventDefault();keys.add(e.code);
  }
});
document.addEventListener('keyup',e=>{
  keys.delete(e.code);
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')updateMovementMode();
});
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

function reportCrossing({gate,zone}){
  const action=zone==='public'?'を出ました':isTransfer(gate)?' → '+operators[zone].name:'から入りました';
  toast(gate.name+action);
  if(!audioEnabled||audioContext?.state!=='running')return;
  const tone=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
  tone.frequency.setValueAtTime(980,now);tone.frequency.setValueAtTime(1320,now+.055);
  gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.13);
  tone.connect(gain).connect(audioGain);tone.start(now);tone.stop(now+.14);
  tone.onended=()=>{tone.disconnect();gain.disconnect();};
}
function updatePlayerView(t,dt,travel,forwardTravel){
  const x=seated?.x??position.x,z=seated?.z??position.z;
  const ground=position.y - (seated ? .16 : 0);
  const viewYaw=yaw+(!started&&!reducedMotion?Math.sin(t*.00012)*.025:0);
  if(avatar){
    avatar.group.position.set(x,ground,z);
    avatar.group.rotation.y=seated?seated.yaw:yaw+Math.PI;
    const moving=dt>0&&travel/dt>.08;
    const running=isRunning();
    const gait=seated?'Sit':moving?(running?'Run':'Walk'):'Idle';
    const pace=moving?Math.max(.4,Math.min(1.6,travel/dt/(running?5.6:2.8))):1;
    avatar.update(activeDialog||document.hidden?0:dt,gait,forwardTravel<-.001?-pace:pace);
    avatar.group.visible=cameraMode==='shoulder'&&followCamera(x,ground,z,viewYaw,pitch,dt,cameraCut);
  }
  if(cameraMode==='first'||!avatar){
    world.camera.position.x=x;world.camera.position.z=z;
    const eye=position.y+(seated?1.16:1.65);
    world.camera.position.y=cameraCut?eye:world.camera.position.y+(eye-world.camera.position.y)*(1-Math.exp(-dt*20));
    world.camera.rotation.set(pitch,viewYaw,0,'YXZ');
  }
  cameraCut=false;
}
function frame(t){
  const dt=Math.min(.045,(t-lastFrame)/1000||.016);lastFrame=t;
  let distance=0,forwardTravel=0;
  if(started&&!activeDialog&&!document.hidden){
    let horizontal=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    let forward=-joy.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    if((seated||openLocker)&&(horizontal||forward))endInspection();
    const len=Math.hypot(horizontal,forward);if(len>1){horizontal/=len;forward/=len;}
    const movementSpeed=isRunning()?runningSpeed:speed;
    const vx=(-Math.sin(yaw)*forward+Math.cos(yaw)*horizontal)*movementSpeed,vz=(-Math.cos(yaw)*forward-Math.sin(yaw)*horizontal)*movementSpeed;
    const smooth=1-Math.exp(-dt*14);velocity.x+=(vx-velocity.x)*smooth;velocity.z+=(vz-velocity.z)*smooth;
    const next=movePlayer(position,velocity.x*dt,velocity.z*dt);
    const dx=next.x-position.x,dz=next.z-position.z;
    distance=Math.hypot(dx,dz);forwardTravel=-Math.sin(yaw)*dx-Math.cos(yaw)*dz;
    const crossed=distance>0?gateCrossing(position,next):null;if(crossed)reportCrossing(crossed);
    position=next;walked+=distance;stepDistance+=distance;
    if(stepDistance>.8){stepDistance=0;footstep();}
    $('walked').textContent=Math.floor(walked);updateLocation();
  }
  updatePlayerView(t,dt,distance,forwardTravel);
  if(t-lastMap>120){lastMap=t;drawMap($('mini-map'));if(activeDialog?.id==='map-dialog'&&mapPanel==='map')drawMap($('large-map'),true);}
  world.render(t);requestAnimationFrame(frame);
}
function showError(error){console.error('3D scene could not start',error);$('error').hidden=false;$('intro').hidden=true;$('intro-caption').hidden=true;}
requestAnimationFrame(async()=>{
  try{
    world=createWorld($('world'));world.setQuality(quality);
    followCamera=createShoulderCamera(world.scene,world.camera);
    await loadAvatarColor(avatarColor);
    updatePlayerView(0,0,0,0);world.render(0);
    $('start').disabled=false;$('start-label').textContent='散策をはじめる';requestAnimationFrame(frame);
  }
  catch(error){showError(error);}
});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();stopInput();showError(new Error('WebGL context lost'));});
window.addEventListener('resize',()=>world?.resize());
setMapFloor('overview');drawMap($('mini-map'));updateLocation();
