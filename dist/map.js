import {amenities,amenityTypes} from './amenities.js';
import {operators,ticketGates} from './station.js';
import {stairs,platforms,pillars,destinations,stairHeight} from './layout.js';
import {plans} from './geometry.js';
export const mapHits=new WeakMap();
const corners=r=>[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]];
function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function stairPoints(s){return [[s.x-s.width/2,s.z0],[s.x+s.width/2,s.z0],[s.x+s.width/2,s.z1],[s.x-s.width/2,s.z1]];}
function transformFor(canvas,points,padding=30){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const scale=Math.min((canvas.width-padding*2)/(x1-x0),(canvas.height-padding*2)/(y1-y0));return ([x,y])=>[(x-(x0+x1)/2)*scale+canvas.width/2,(y-(y0+y1)/2)*scale+canvas.height/2];}
function dot(c,xy,r,color){c.beginPath();c.arc(...xy,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
// Canvas coordinates are north-up. The dot stays the same size in CSS pixels on phones.
function player(c,xy,angle,scale){
  c.save();c.translate(...xy);c.scale(scale,scale);c.rotate(angle);
  const beam=c.createRadialGradient(0,0,4,0,0,22);
  beam.addColorStop(0,'rgba(215,29,52,.80)');
  beam.addColorStop(.64,'rgba(233,48,65,.43)');
  beam.addColorStop(1,'rgba(233,48,65,.04)');
  c.beginPath();c.moveTo(0,0);c.arc(0,0,22,-Math.PI/2-.54,-Math.PI/2+.54);c.closePath();
  c.fillStyle=beam;c.fill();
  dot(c,[0,0],10.5,'rgba(225,38,57,.20)');
  c.shadowColor='rgba(93,19,30,.48)';c.shadowBlur=2*scale;
  dot(c,[0,0],6.6,'#ffffff');c.shadowBlur=0;
  dot(c,[0,0],4.9,'#d72136');c.restore();
}
const displayScale=canvas=>canvas.width/(canvas.clientWidth||canvas.width);
function base(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f0efe7';c.fillRect(0,0,canvas.width,canvas.height);return c;}
export function drawFloorMap(canvas,position,visited,floorId,large=false,selectedPlace=null){
  const c=base(canvas),plan=plans.find(p=>p.floor.id===floorId),f=plan.floor;
  const connections=stairs.filter(s=>s.from===floorId||s.to===floorId);
  const allPoints=[...plan.patches.flatMap(corners),...connections.flatMap(stairPoints)];
  const markerScale=displayScale(canvas);
  const project=transformFor(canvas,allPoints,large?48:Math.max(23,12*markerScale)),hits=[];
  const zoneColors={public:'#ced3be',jr:'#9fb594',odakyu:'#a3c3cc',keio:'#bcb1bd',metro:'#cda99b'};
  for(const r of plan.zonePatches){path(c,corners(r).map(project));c.fillStyle=zoneColors[r.zone]??f.color;c.fill();}
  c.beginPath();
  for(const b of plan.fences){const dx=b.axis==='z'?.5:0,dz=b.axis==='x'?.5:0;c.moveTo(...project([b.x-dx,b.z-dz]));c.lineTo(...project([b.x+dx,b.z+dz]));}
  c.lineWidth=large?1.5:.7;c.strokeStyle='#79816c';c.stroke();
  for(const s of connections){path(c,stairPoints(s).map(project));c.fillStyle='#d8bb67';c.fill();c.strokeStyle='#a18b4f';c.lineWidth=large?1.3:.7;c.stroke();
    for(let i=0;i<=14;i++){const z=s.z0+(s.z1-s.z0)*i/14;c.beginPath();c.moveTo(...project([s.x-s.width/2,z]));c.lineTo(...project([s.x+s.width/2,z]));c.stroke();}
    if(large){const xy=project([s.x,s.from===floorId?s.z0:s.z1]);c.fillStyle='#685b33';c.font='13px sans-serif';c.textAlign='center';c.fillText(s.from===floorId?'↑':'↓',xy[0],xy[1]-8);}
  }
  for(const p of pillars.filter(p=>p.floor===floorId)){const xy=project([p.x,p.z]);c.fillStyle='#6f806c';c.fillRect(xy[0]-1.6,xy[1]-1.6,3.2,3.2);}
  if(large&&floorId==='1F')for(const p of platforms){const xy=project([p.x,p.id==='p5'?108:2]);c.font='16px sans-serif';c.textAlign='center';c.fillStyle='#49615b';p.numbers.split('・').forEach((n,i)=>c.fillText(n,xy[0],xy[1]+i*17-6));}
  destinations.forEach((d,i)=>{if(d.floor!==floorId)return;const xy=project([d.x,d.z]);hits.push({d,x:xy[0],y:xy[1]});dot(c,xy,large?12:5,visited.has(d.id)?'#6d824b':'#f8f9ee');if(large){c.fillStyle=visited.has(d.id)?'#fff':'#5d7050';c.font='14px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),...xy);c.textBaseline='alphabetic';}});
  const visibleGates=ticketGates.filter(g=>g.floor===floorId);
  for(const g of visibleGates){
    const [mx,my]=project([g.x,g.z]),r=large?8:3;
    c.fillStyle=operators[g.operator].color;c.fillRect(mx-r,my-r,2*r,2*r);
    c.strokeStyle='#fffdf0';c.lineWidth=large?1.5:1;c.strokeRect(mx-r,my-r,2*r,2*r);
    if(large){c.fillStyle='#fffdf0';for(const offset of [-3,0,3])c.fillRect(mx+offset-0.6,my-3,1.2,6);hits.push({gate:g,x:mx,y:my});}
  }
  if(large)for(const a of amenities.filter(a=>a.floor===floorId)){
    const [x,y]=project([a.x,a.z]),kind=amenityTypes[a.type];
    dot(c,[x,y],9,kind.color);c.strokeStyle='#fffdf4';c.lineWidth=1.5;c.stroke();
    c.fillStyle='white';c.font='bold 12px sans-serif';c.textAlign='center';
    c.textBaseline='middle';c.fillText(kind.mark,x,y);c.textBaseline='alphabetic';
    hits.push({amenity:a,x,y});
  }
  if(large&&selectedPlace?.floor===floorId){
    const [mx,my]=project([selectedPlace.x,selectedPlace.z]);
    c.strokeStyle='#263b31';c.lineWidth=3;c.strokeRect(mx-11,my-11,22,22);
    c.font='bold 17px sans-serif';const w=c.measureText(selectedPlace.type?amenityTypes[selectedPlace.type].name:selectedPlace.name).width+18;
    const left=Math.max(6,Math.min(canvas.width-w-6,mx-w/2)),top=my>72?my-42:my+16;
    c.fillStyle='#263b31';c.fillRect(left,top,w,25);c.fillStyle='white';c.textAlign='left';c.fillText(selectedPlace.type?amenityTypes[selectedPlace.type].name:selectedPlace.name,left+9,top+18);
  }
  c.fillStyle='#68785c';c.font=large?'17px sans-serif':'12px sans-serif';c.textAlign='left';c.fillText(`${floorId}${large?'  '+f.title:''}`,large?22:12,large?27:16);
  c.textAlign='right';c.fillStyle='#8b9581';c.font=large?'14px sans-serif':'11px sans-serif';c.fillText('N ↑',canvas.width-16,large?27:16);
  if(position.floor===floorId)player(c,project([position.x,position.z]),-position.yaw,markerScale);
  mapHits.set(canvas,hits);
}
export function drawOverview(canvas,position,visited){
  const c=base(canvas),iso=([x,z,y])=>[x+.42*z,z*.42-y*9];
  const points=plans.flatMap(p=>p.patches.flatMap(r=>corners(r).map(([x,z])=>iso([x,z,p.floor.height]))));
  const fit=transformFor(canvas,points,56),project=(x,z,y)=>fit(iso([x,z,y])),hits=[];
  for(const plan of plans){const f=plan.floor;
    for(const r of plan.patches){const top=corners(r).map(([x,z])=>project(x,z,f.height));const side=[project(r.x0,r.z1,f.height),project(r.x1,r.z1,f.height),project(r.x1,r.z1,f.height-.23),project(r.x0,r.z1,f.height-.23)];path(c,side);c.fillStyle=f.id==='B1'?'#869777':f.id==='1F'?'#688c8b':'#ab8c4f';c.fill();path(c,top);c.globalAlpha=.9;c.fillStyle=f.color;c.fill();c.globalAlpha=1;c.strokeStyle='#596e5528';c.lineWidth=.8;c.stroke();}
    // Stair ribbons are continuous at exactly the same endpoints as the walking model.
    for(const s of stairs.filter(s=>s.from===f.id)){
      for(let i=0;i<28;i++){const za=s.z0+(s.z1-s.z0)*i/28,zb=s.z0+(s.z1-s.z0)*(i+1)/28,ya=stairHeight(s,s.x,za),yb=stairHeight(s,s.x,zb);path(c,[project(s.x-2,za,ya),project(s.x+2,za,ya),project(s.x+2,zb,yb),project(s.x-2,zb,yb)]);c.fillStyle='#dec36e';c.fill();c.strokeStyle='#9c8244';c.lineWidth=.6;c.stroke();}
    }
    const focus=plan.patches.reduce((min,r)=>Math.min(min,r.z0),Infinity);
    const labelY=project(0,focus,f.height)[1]-5;c.fillStyle='#405343';c.font='bold 17px sans-serif';c.textAlign='left';c.fillText(f.id,12,labelY);
    for(const[d,i]of destinations.map((d,i)=>[d,i]).filter(([d])=>d.floor===f.id)){const xy=project(d.x,d.z,f.height);dot(c,xy,10,visited.has(d.id)?'#6c7f45':'#f9faed');c.fillStyle=visited.has(d.id)?'#fff':'#6b7958';c.font='12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),...xy);c.textBaseline='alphabetic';hits.push({d,x:xy[0],y:xy[1]});}
  }
  const dx=-Math.sin(position.yaw),dz=-Math.cos(position.yaw);
  const heading=Math.atan2(dx+.42*dz,-.42*dz);
  c.textAlign='left';c.fillStyle='#7e8a70';c.font='14px sans-serif';c.fillText('北 N ↖',24,canvas.height-23);c.fillStyle='#b09a57';c.fillRect(canvas.width-160,canvas.height-34,19,9);c.fillStyle='#7e8167';c.fillText('階段で接続',canvas.width-130,canvas.height-24);
  player(c,project(position.x,position.z,position.y),heading,displayScale(canvas));
  mapHits.set(canvas,hits);
}
