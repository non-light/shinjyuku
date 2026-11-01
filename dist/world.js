import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {floors,regions,stairs,platforms,pillars,gates,benches,hasFloorAt,hasCeilingAt,stairHeight} from './layout.js';
import {plans} from './geometry.js';

export function createWorld(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b7bbb5');scene.fog=new THREE.Fog('#b7bbb5',44,150);
  const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.08,180);camera.rotation.order='YXZ';
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#f5f7f0','#777567',2.05));const daylight=new THREE.DirectionalLight('#fff4d9',1.65);daylight.position.set(-20,30,12);scene.add(daylight);
  const batches=new Map(),cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={metal:mat('#aaaead',.32,.72),dark:mat('#222a2b',.6,.3),cream:mat('#dddcd2'),white:mat('#e6e7df',.65),wood:mat('#806348'),green:mat('#86ac57',.4,.25),yellow:mat('#dec04f',.6),ceiling:mat('#b8bcb1',1),glass:mat('#334349',.16,.6),light:new THREE.MeshStandardMaterial({color:'#fffef2',emissive:'#fff4d0',emissiveIntensity:2.4,roughness:.4})};
  function box(x,y,z,w,h,d,m=mats.cream,rotation=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m).push(dummy.matrix.clone());}
  function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),c);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
  let seed=1729;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const floorTexture=texture(512,512,c=>{c.fillStyle='#b9b8ac';c.fillRect(0,0,512,512);for(let i=0;i<33000;i++){const v=Math.floor(125+random()*100);c.fillStyle=`rgba(${v},${v},${v-7},${.06+random()*.17})`;c.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}c.strokeStyle='#96988e';c.lineWidth=1.5;for(let x=0;x<=512;x+=256){c.beginPath();c.moveTo(x,0);c.lineTo(x,512);c.moveTo(0,x);c.lineTo(512,x);c.stroke();}});floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;
  const wallTexture=texture(256,256,c=>{c.fillStyle='#d6d7ce';c.fillRect(0,0,256,256);for(let i=0;i<5000;i++){c.fillStyle=random()>.5?'#ffffff0b':'#5260500a';c.fillRect(random()*256,random()*256,1,1);}c.strokeStyle='#b7bcb2';for(let y=0;y<=256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}c.strokeRect(0,0,256,256);});wallTexture.wrapS=wallTexture.wrapT=THREE.RepeatWrapping;
  const floorMat=new THREE.MeshStandardMaterial({map:floorTexture,bumpMap:floorTexture,bumpScale:.018,roughness:.52,metalness:.06,side:THREE.DoubleSide});
  const wallMat=new THREE.MeshStandardMaterial({map:wallTexture,bumpMap:wallTexture,bumpScale:.008,roughness:.8,side:THREE.DoubleSide});
  const floorData={p:[],u:[]},ceilingData={p:[],u:[]},wallData={p:[],u:[]},stairUndersides={p:[],u:[]};
  function quad(data,points,uvs){for(const i of[0,1,2,0,2,3]){data.p.push(...points[i]);data.u.push(...uvs[i]);}}
  function surface(data,material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.u,2));g.computeVertexNormals();scene.add(new THREE.Mesh(g,material));}
  // One source of truth supplies floor holes, ceiling holes and wall portals.
  for(const plan of plans){const f=plan.floor;
    for(const r of plan.patches)quad(floorData,[[r.x0,f.height,r.z0],[r.x0,f.height,r.z1],[r.x1,f.height,r.z1],[r.x1,f.height,r.z0]],[[r.x0/2,r.z0/2],[r.x0/2,r.z1/2],[r.x1/2,r.z1/2],[r.x1/2,r.z0/2]]);
    for(const r of plan.ceilingPatches){const y=f.height+f.ceiling;quad(ceilingData,[[r.x0,y,r.z0],[r.x1,y,r.z0],[r.x1,y,r.z1],[r.x0,y,r.z1]],[[r.x0/2,r.z0/2],[r.x1/2,r.z0/2],[r.x1/2,r.z1/2],[r.x0/2,r.z1/2]]);}
    if(f.id==='1F')continue; // Platforms open onto the tracks; walking still respects their edges.
    for(const{a,b,dx}of plan.walls){const y=f.height;quad(wallData,[[a[0],y,a[1]],[b[0],y,b[1]],[b[0],y+f.ceiling,b[1]],[a[0],y+f.ceiling,a[1]]],[[0,0],[.5,0],[.5,f.ceiling/2],[0,f.ceiling/2]]);box((a[0]+b[0])/2,y+.12,(a[1]+b[1])/2,dx?.05:1,.24,dx?1:.05,mats.metal);}
  }
  surface(floorData,floorMat);surface(ceilingData,mats.ceiling);surface(wallData,wallMat);
  const lampLocations=[];
  function lamp(x,z,y=0,alongX=true,length=3.5){box(x,y+3.58,z,alongX?length:.5,.12,alongX?.5:length,mats.dark);box(x,y+3.505,z,alongX?length-.12:.36,.025,alongX?.36:length-.12,mats.light);lampLocations.push(new THREE.Vector3(x,y+3.2,z));}
  for(const f of floors){
    if(f.id==='1F'){for(const p of platforms)for(let z=p.z0+5;z<p.z1;z+=9)if(hasCeilingAt(p.x,z,f.id))lamp(p.x,z,f.height,false);}
    else for(let x=-66;x<80;x+=8)for(let z=-20;z<145;z+=8)if(hasCeilingAt(x,z,f.id))lamp(x,z,f.height);
  }
  for(const r of regions.filter(r=>r.floor!=='1F')){const y=floors.find(f=>f.id===r.floor).height;for(let z=r.z0+2;z<r.z1;z+=4)box((r.x0+r.x1)/2,y+3.7,z,r.x1-r.x0,.12,.09,mats.white);}
  for(const p of platforms)for(let z=p.z0+5;z<p.z1;z+=8)if(hasCeilingAt(p.x,z,'1F'))box(p.x,8.8,z,8,.13,.16,mats.metal);
  const litAreas=[new THREE.PointLight('#fff7df',8,15,2),new THREE.PointLight('#f9fff0',8,15,2)];litAreas.forEach(l=>scene.add(l));
  const tactileTex=texture(128,128,c=>{c.fillStyle='#d8b64f';c.fillRect(0,0,128,128);for(let x=10;x<128;x+=21){c.fillStyle='#efce69';c.fillRect(x,5,8,118);c.fillStyle='#a68a3b';c.fillRect(x+8,5,2,118);}c.strokeStyle='#ad903e';c.strokeRect(0,0,128,128);});
  const tactileMat=new THREE.MeshStandardMaterial({map:tactileTex,bumpMap:tactileTex,bumpScale:.015,roughness:.7});
  for(let x=-69;x<79;x++){box(x+.5,.022,-2,1,.035,.43,tactileMat);if(hasFloorAt(x+.5,18,'B1'))box(x+.5,.022,18,1,.035,.43,tactileMat);}
  for(const x of[-58,70])for(let z=-1;z<19;z++)box(x,.022,z+.5,.43,.035,1,tactileMat);
  for(const p of platforms)for(const side of[-1,1])for(let z=p.z0+1;z<p.z1-1;z++)box(p.x+side*3.25,5.022,z+.5,.43,.035,1,tactileMat);
  for(const z of[48,132])for(let x=-58;x<75;x++)if(hasFloorAt(x+.5,z,'2F'))box(x+.5,10.022,z,1,.035,.43,tactileMat);
  const signCache=new Map();
  function signTexture(title,subtitle,arrow='↑',badge='出口'){
    const key=[title,subtitle,arrow,badge].join('|');if(signCache.has(key))return signCache.get(key);
    const t=texture(896,176,c=>{c.fillStyle='#202725';c.fillRect(0,0,896,176);c.fillStyle='#ecd16e';c.fillRect(0,0,18,176);c.font='64px sans-serif';c.fillText(arrow,35,108);c.fillStyle='#f6f6ed';c.font='500 44px sans-serif';c.fillText(title,132,77);c.fillStyle='#c6cfc0';c.font='22px sans-serif';c.fillText(subtitle,134,121);c.fillStyle='#edcf69';c.fillRect(773,29,94,99);c.fillStyle='#29372b';c.font='500 32px sans-serif';c.fillText(badge,787,92);c.fillStyle='#88917f';c.font='13px sans-serif';c.fillText('SHINJUKU STATION / 3D WALK',134,153);});signCache.set(key,t);return t;
  }
  function picture(tex,x,y,z,w,h,ry=0,emissive=.16){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:emissive,roughness:.65}));mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh);return mesh;}
  function hanging(x,z,title,sub,backTitle=title,backSub=sub,ry=0,y=0,w=6,badge='出口'){
    box(x,y+2.88,z,w,.96,.14,mats.dark,ry);for(const side of[-1,1])box(x+Math.cos(ry)*w*.38*side,y+3.43,z-Math.sin(ry)*w*.38*side,.035,.7,.035,mats.metal);
    picture(signTexture(title,sub,'↑',badge),x+Math.sin(ry)*.076,y+2.88,z+Math.cos(ry)*.076,w-.07,.89,ry,.35);
    picture(signTexture(backTitle,backSub,'↑',badge),x-Math.sin(ry)*.076,y+2.88,z-Math.cos(ry)*.076,w-.07,.89,ry+Math.PI,.35);
  }
  hanging(-35,-2,'東口・東西自由通路','East Exit / Passage','西口','West Exit',-Math.PI/2);
  hanging(40,-2,'東口','East Exit','西口・東西自由通路','West Exit / Passage',-Math.PI/2);
  hanging(-58,8,'中央地下通路・JR改札','Central passage / JR gate','東西自由通路','East–west passage',Math.PI);
  hanging(70,8,'JR線・中央地下通路','JR Lines / Central passage','東口・東西自由通路','East Exit / Passage',Math.PI);
  hanging(0,18,'1F JR線ホーム','JR platforms upstairs','地下改札','Underground gates',-Math.PI/2,0,6.3,'JR');
  hanging(-52,48,'南改札・南口','South gate','1F JR線ホーム','JR platforms downstairs',Math.PI/2,10,6.5,'2F');
  hanging(-39,132,'新南改札','New South gate','1F JR線ホーム','JR platforms downstairs',0,10,6,'2F');
  hanging(69,136,'ミライナタワー改札','Miraina Tower gate','新南改札','New South gate',-Math.PI/2,10,6.5,'2F');
  const railMat=mat('#bcc0bb',.25,.8),railMatrices=[];
  function rail(a,b,r=.035){const d=new THREE.Vector3().subVectors(b,a),length=d.length(),mid=a.clone().add(b).multiplyScalar(.5),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());railMatrices.push(new THREE.Matrix4().compose(mid,rotation,new THREE.Vector3(r,length,r)));}
  // Each staircase has two flights, a 2m landing, matching holes, handrails and signs.
  for(const s of stairs){const direction=Math.sign(s.z1-s.z0),at=d=>s.z0+direction*d;
    for(const offset of[0,8])for(let i=0;i<15;i++){const d=offset+i*.4,top=stairHeight(s,s.x,at(d+.4));box(s.x,top-.09,at(d+.2),s.width,.18,.4,mats.cream);box(s.x,top+.003,at(d+.03),s.width,.012,.045,mats.metal);}
    box(s.x,s.y0+2.4,at(7),s.width,.2,2,mats.cream);
    for(const[a,b]of[[0,6],[6,8],[8,14]]){
      const ya=stairHeight(s,s.x,at(a)),yb=stairHeight(s,s.x,at(b));
      quad(stairUndersides,[[s.x-2,ya-.18,at(a)],[s.x+2,ya-.18,at(a)],[s.x+2,yb-.18,at(b)],[s.x-2,yb-.18,at(b)]],[[0,0],[1,0],[1,1],[0,1]]);
      // Overhead surfaces follow the flight and join the correct upper ceiling.
      quad(ceilingData,[[s.x-2,ya+3.6,at(a)],[s.x+2,ya+3.6,at(a)],[s.x+2,yb+3.6,at(b)],[s.x-2,yb+3.6,at(b)]],[[0,0],[1,0],[1,1],[0,1]]);
      for(const side of[-1,1])rail(new THREE.Vector3(s.x+side*1.95,ya+.95,at(a)),new THREE.Vector3(s.x+side*1.95,yb+.95,at(b)));
    }
    for(const side of[-1,1])for(let d=0;d<=14;d+=2){const y=stairHeight(s,s.x,at(d));rail(new THREE.Vector3(s.x+side*1.95,y,at(d)),new THREE.Vector3(s.x+side*1.95,y+.95,at(d)),.022);}
    hanging(s.x,s.z0-direction*.65,`${s.to} ${s.to==='1F'?'JRホーム':'改札階'}`,s.label,`${s.to} へ上がる`,s.label,0,s.y0,3.8,s.to);
    hanging(s.x,s.z1+direction*.65,`${s.from} へ下りる`,s.label,`${s.from} へ下りる`,s.label,0,s.y1,3.8,s.from);
    lamp(s.x,at(7),s.y0+2.5,false,1.5);
  }
  surface(stairUndersides,new THREE.MeshStandardMaterial({color:'#acb2a5',roughness:.9,side:THREE.DoubleSide}));
  // Add only the newly appended staircase ceilings (main ceiling data was already emitted).
  const stairCeilings={p:ceilingData.p.slice(plans.reduce((n,p)=>n+p.ceilingPatches.length*18,0)),u:ceilingData.u.slice(plans.reduce((n,p)=>n+p.ceilingPatches.length*12,0))};surface(stairCeilings,new THREE.MeshStandardMaterial({color:'#c2c6ba',roughness:1,side:THREE.DoubleSide}));
  const shadowTex=texture(128,128,c=>{const g=c.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'#16201870');g.addColorStop(1,'#16201800');c.fillStyle=g;c.fillRect(0,0,128,128);});
  const shadowMat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});
  function shadow(x,z,w,d,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),shadowMat);m.rotation.x=-Math.PI/2;m.position.set(x,y+.013,z);scene.add(m);}
  const pillarLabels=new Map();
  for(const p of pillars){box(p.x,p.y+1.87,p.z,.9,3.74,.9,mats.white);box(p.x,p.y+.68,p.z,.94,1.36,.94,mats.metal);box(p.x,p.y+.06,p.z,1,.12,1,mats.dark);shadow(p.x,p.z,2.6,2.6,p.y);
    if(!pillarLabels.has(p.floor))pillarLabels.set(p.floor,texture(256,256,c=>{c.fillStyle='#e9ebe2';c.fillRect(0,0,256,256);c.fillStyle='#829d5d';c.fillRect(0,0,256,15);c.fillStyle='#29392f';c.font='500 52px sans-serif';c.fillText('新 宿',28,93);c.font='22px sans-serif';c.fillText('SHINJUKU',42,140);c.font='37px sans-serif';c.fillText(p.floor,97,209);}));
    picture(pillarLabels.get(p.floor),p.x-.458,p.y+1.94,p.z,.65,.65,-Math.PI/2);
  }
  for(const g of gates){const rotate=g.axis==='z'?Math.PI/2:0;box(g.x,g.y+.54,g.z,2.1,1.08,.8,mats.metal,rotate);box(g.x,g.y+1.105,g.z,2.12,.13,.82,mats.dark,rotate);box(g.x,g.y+1.19,g.z,.5,.08,.55,mats.green);shadow(g.x,g.z,g.axis==='x'?3.5:1.8,g.axis==='x'?1.8:3.5,g.y);}
  for(const b of benches){box(b.x,b.y+.49,b.z,b.w,.12,1.05,mats.wood);box(b.x,b.y+.93,b.z+.46,b.w,.75,.1,mats.wood);for(const a of[-1,1])box(b.x+a*(b.w/2-.5),b.y+.23,b.z,.12,.5,.8,mats.metal);shadow(b.x,b.z,b.w+1,2.5,b.y);}
  const lockerTex=texture(512,512,c=>{c.fillStyle='#bfc3bb';c.fillRect(0,0,512,512);for(let x=0;x<4;x++)for(let y=0;y<3;y++){const a=x*128,b=y*171;c.fillStyle=['#c1c8be','#ccd0c5','#b3beb4'][(x+y)%3];c.fillRect(a+3,b+3,122,165);c.strokeStyle='#808d7b';c.strokeRect(a+3,b+3,122,165);c.fillStyle='#6b796a';c.fillRect(a+104,b+74,8,25);c.font='15px sans-serif';c.fillText(String(100+x+y*4),a+10,b+23);}});picture(lockerTex,71,1.3,-19.97,8,2.6);
  function vendingTexture(){return texture(512,1024,c=>{
    c.fillStyle='#e8ebe7';c.fillRect(0,0,512,1024);c.fillStyle='#547b91';c.fillRect(22,25,468,112);c.fillStyle='#fff';c.font='500 32px sans-serif';c.fillText('REFRESH & GO',83,96);
    c.fillStyle='#e2e9e3';c.fillRect(30,165,452,570);
    const colors=['#ba4f38','#76a0b2','#6c8a50','#ddc25c','#e0e2da'];
    for(let y=0;y<3;y++)for(let x=0;x<5;x++){const a=46+x*87,b=190+y*176;c.fillStyle='#ffffff';c.fillRect(a+6,b,47,104);c.fillStyle=colors[(x+y)%5];c.fillRect(a+6,b+24,47,56);c.fillStyle='#7c8b82';c.fillRect(a+20,b-7,20,9);c.fillStyle='#848e80';c.fillRect(a,b+131,61,3);c.font='16px sans-serif';c.fillText('¥150',a+10,b+123);c.fillStyle='#7a9867';c.beginPath();c.arc(a+30,b+151,7,0,7);c.fill();}
    c.fillStyle='#273831';c.fillRect(350,780,117,80);c.fillStyle='#7cbb84';c.fillRect(366,792,80,30);c.fillStyle='#3d4b43';c.fillRect(100,878,300,80);c.fillStyle='#9ba69a';c.fillRect(130,890,240,35);
  });}
  const vendTex=vendingTexture();
  for(let z=8;z<=11;z+=1.65){box(-69.3,1.15,z,1.5,2.3,1.4,mats.white);picture(vendTex,-68.54,1.15,z,1.4,2.2,Math.PI/2,.38);}
  const adTex=texture(512,768,c=>{c.fillStyle='#bdc6b3';c.fillRect(0,0,512,768);c.fillStyle='#e3e5d3';c.beginPath();c.arc(360,220,175,0,7);c.fill();c.fillStyle='#8f9f79';for(let i=0;i<8;i++)c.fillRect(40+i*56,360-i*21,40,280+i*20);c.fillStyle='#f6f2dd';c.font='40px serif';c.fillText('ひと息、つこう。',55,119);c.font='20px sans-serif';c.fillText('A SLOW MOMENT IN THE CITY',52,706);});
  for(const x of[-19,-3,16]){box(x,1.65,-7.96,1.6,2.4,.055,mats.metal);picture(adTex,x,1.65,-7.925,1.5,2.28,0,.15);}
  const clockTex=texture(256,256,c=>{c.fillStyle='#e7e9df';c.beginPath();c.arc(128,128,124,0,7);c.fill();c.strokeStyle='#3c4a3d';c.lineWidth=4;c.stroke();for(let i=0;i<12;i++){c.save();c.translate(128,128);c.rotate(i*Math.PI/6);c.fillStyle='#344132';c.fillRect(-2,-111,4,12);c.restore();}c.strokeStyle='#35472f';c.lineWidth=7;c.beginPath();c.moveTo(128,128);c.lineTo(90,94);c.moveTo(128,128);c.lineTo(205,128);c.stroke();c.fillStyle='#35472f';c.beginPath();c.arc(128,128,7,0,7);c.fill();});picture(clockTex,-69.97,2.7,-3,.72,.72,Math.PI/2);
  const coffeeTex=texture(1024,512,c=>{c.fillStyle='#615543';c.fillRect(0,0,1024,512);for(let x=0;x<1024;x+=22){c.fillStyle=x%44===0?'#6d5c49':'#615543';c.fillRect(x,0,20,512);}c.fillStyle='#dfd9c5';c.font='34px sans-serif';c.fillText('TAKE A LITTLE BREAK',270,91);c.font='54px serif';c.fillText('STATION COFFEE',235,165);c.fillStyle='#23362e';c.fillRect(70,214,884,241);c.fillStyle='#b9ad89';c.fillRect(70,415,884,14);for(let x=130;x<840;x+=140){c.fillStyle='#e0d8bf';c.fillRect(x,340,40,62);}});picture(coffeeTex,-59,1.6,-23.97,10,3.1);
  // Eight platform islands are oriented north–south, beneath the 2F bridges.
  for(const p of platforms){
    const stripe=mat(p.color,.45,.2);const tx=p.x+5.5;
    for(const x of[tx-.7,tx+.7])box(x,4.52,(p.z0+p.z1)/2,.12,.16,p.z1-p.z0,mats.metal);
    for(let z=p.z0+3;z<p.z1-9;z+=16){
      if(p.id==='p5'&&z<123&&z+15>115)continue;
      box(tx,6.43,z+7.5,2.7,2.86,15,mats.metal);box(tx,7.91,z+7.5,2.68,.12,15,mats.white);box(tx-1.36,6.08,z+7.5,.035,.24,14.8,stripe);
      for(let dz=1;dz<15;dz+=2.8){box(tx-1.37,7.02,z+dz,.04,.86,1.9,mats.dark);box(tx-1.39,7.02,z+dz,.035,.73,1.73,mats.glass);}
      for(const dz of[3.5,11.5]){box(tx-1.41,6.43,z+dz,.06,2.63,2.1,mats.white);for(const a of[-1,1]){box(tx-1.45,6.43,z+dz+a*.5,.035,2.53,.95,mats.metal);box(tx-1.48,7.01,z+dz+a*.5,.025,.82,.64,mats.glass);}box(tx-1.48,6.08,z+dz,.03,.24,2.05,stripe);}
    }
    hanging(p.x,p.id==='p5'?108:80,`${p.numbers}番線`,p.line,`${p.numbers}番線`,p.line,0,5,6.4,'JR');
    for(const z of[p.z0+.15,p.z1-.15]){box(p.x,5.55,z,7.8,.08,.08,mats.metal);for(const dx of[-3.7,0,3.7])box(p.x+dx,5.45,z,.08,.9,.08,mats.metal);}
  }
  for(const[m,matrices]of batches){const mesh=new THREE.InstancedMesh(cube,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);}
  const railingMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,8),railMat,railMatrices.length);railMatrices.forEach((m,i)=>railingMesh.setMatrixAt(i,m));railingMesh.instanceMatrix.needsUpdate=true;railingMesh.computeBoundingSphere();scene.add(railingMesh);
  let lastLightUpdate=-1000;
  return {renderer,scene,camera,resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();},setQuality(ratio){renderer.setPixelRatio(Math.min(devicePixelRatio||1,ratio));},render(time){if(time-lastLightUpdate>350){lastLightUpdate=time;const nearest=lampLocations.slice().sort((a,b)=>a.distanceToSquared(camera.position)-b.distanceToSquared(camera.position));litAreas.forEach((l,i)=>l.position.copy(nearest[i]));}renderer.render(scene,camera);}};
}
