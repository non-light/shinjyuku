import {floors,floorById,stairs,platforms,pillars,destinations,stairHeight} from './layout.js';
import {plans} from './geometry.js';
export const mapHits=new WeakMap();
const corners=r=>[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]];
function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function stairPoints(s){return [[s.x-s.width/2,s.z0],[s.x+s.width/2,s.z0],[s.x+s.width/2,s.z1],[s.x-s.width/2,s.z1]];}
function transformFor(canvas,points,padding=30){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const scale=Math.min((canvas.width-padding*2)/(x1-x0),(canvas.height-padding*2)/(y1-y0));return ([x,y])=>[(x-(x0+x1)/2)*scale+canvas.width/2,(y-(y0+y1)/2)*scale+canvas.height/2];}
function dot(c,xy,r,color){c.beginPath();c.arc(...xy,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function player(c,xy,yaw,large){c.save();c.translate(...xy);c.rotate(-yaw);c.fillStyle='#53672b35';c.beginPath();c.moveTo(0,0);c.lineTo(-12,-24);c.quadraticCurveTo(0,-31,12,-24);c.closePath();c.fill();dot(c,[0,0],large?6:5,'#526b2c');c.strokeStyle='#fcfff6';c.lineWidth=2;c.stroke();c.restore();}
function base(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f0efe7';c.fillRect(0,0,canvas.width,canvas.height);return c;}
export function drawFloorMap(canvas,position,visited,floorId,large=false){
  const c=base(canvas),plan=plans.find(p=>p.floor.id===floorId),f=plan.floor;
  const connections=stairs.filter(s=>s.from===floorId||s.to===floorId);
  const allPoints=[...plan.patches.flatMap(corners),...connections.flatMap(stairPoints)];
  const project=transformFor(canvas,allPoints,large?48:23),hits=[];
  for(const r of plan.patches){path(c,corners(r).map(project));c.fillStyle=f.color;c.fill();}
  for(const s of connections){path(c,stairPoints(s).map(project));c.fillStyle='#d8bb67';c.fill();c.strokeStyle='#a18b4f';c.lineWidth=large?1.3:.7;c.stroke();
    for(let i=0;i<=14;i++){const z=s.z0+(s.z1-s.z0)*i/14;c.beginPath();c.moveTo(...project([s.x-s.width/2,z]));c.lineTo(...project([s.x+s.width/2,z]));c.stroke();}
    if(large){const xy=project([s.x,s.from===floorId?s.z0:s.z1]);c.fillStyle='#685b33';c.font='13px sans-serif';c.textAlign='center';c.fillText(s.from===floorId?'↑':'↓',xy[0],xy[1]-8);}
  }
  for(const p of pillars.filter(p=>p.floor===floorId)){const xy=project([p.x,p.z]);c.fillStyle='#6f806c';c.fillRect(xy[0]-1.6,xy[1]-1.6,3.2,3.2);}
  if(large&&floorId==='1F')for(const p of platforms){const xy=project([p.x,p.id==='p5'?108:2]);c.font='16px sans-serif';c.textAlign='center';c.fillStyle='#49615b';p.numbers.split('・').forEach((n,i)=>c.fillText(n,xy[0],xy[1]+i*17-6));}
  destinations.forEach((d,i)=>{if(d.floor!==floorId)return;const xy=project([d.x,d.z]);hits.push({d,x:xy[0],y:xy[1]});dot(c,xy,large?12:5,visited.has(d.id)?'#6d824b':'#f8f9ee');if(large){c.fillStyle=visited.has(d.id)?'#fff':'#5d7050';c.font='14px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),...xy);c.textBaseline='alphabetic';}});
  if(position.floor===floorId)player(c,project([position.x,position.z]),position.yaw,large);
  c.fillStyle='#68785c';c.font=large?'17px sans-serif':'12px sans-serif';c.textAlign='left';c.fillText(`${floorId}${large?'  '+f.title:''}`,large?22:12,large?27:16);
  c.textAlign='right';c.fillStyle='#8b9581';c.font=large?'14px sans-serif':'11px sans-serif';c.fillText('N ↑',canvas.width-16,large?27:16);mapHits.set(canvas,hits);
}
export function drawOverview(canvas,position,visited){
  const c=base(canvas),iso=([x,z,y])=>[x+.42*z,z*.42-y*15];
  const points=plans.flatMap(p=>p.patches.flatMap(r=>corners(r).map(([x,z])=>iso([x,z,p.floor.height]))));
  const fit=transformFor(canvas,points,56),project=(x,z,y)=>fit(iso([x,z,y])),hits=[];
  for(const plan of plans){const f=plan.floor;
    for(const r of plan.patches){const top=corners(r).map(([x,z])=>project(x,z,f.height));const side=[project(r.x0,r.z1,f.height),project(r.x1,r.z1,f.height),project(r.x1,r.z1,f.height-.23),project(r.x0,r.z1,f.height-.23)];path(c,side);c.fillStyle=f.id==='B1'?'#869777':f.id==='1F'?'#688c8b':'#ab8c4f';c.fill();path(c,top);c.globalAlpha=.9;c.fillStyle=f.color;c.fill();c.globalAlpha=1;c.strokeStyle='#596e5528';c.lineWidth=.8;c.stroke();}
    // Stair ribbons are continuous at exactly the same endpoints as the walking model.
    for(const s of stairs.filter(s=>s.from===f.id)){
      for(let i=0;i<28;i++){const za=s.z0+(s.z1-s.z0)*i/28,zb=s.z0+(s.z1-s.z0)*(i+1)/28,ya=stairHeight(s,s.x,za),yb=stairHeight(s,s.x,zb);path(c,[project(s.x-2,za,ya),project(s.x+2,za,ya),project(s.x+2,zb,yb),project(s.x-2,zb,yb)]);c.fillStyle='#dec36e';c.fill();c.strokeStyle='#9c8244';c.lineWidth=.6;c.stroke();}
    }
    const label=project(-77,f.id==='B1'?-8:f.id==='1F'?0:45,f.height);c.fillStyle='#52634b';c.font='600 22px sans-serif';c.textAlign='left';c.fillText(f.id,label[0],label[1]-9);c.font='14px sans-serif';c.fillText(f.id==='B1'?'地下通路':f.id==='1F'?'ホーム':'改札階',label[0],label[1]+12);
    for(const[d,i]of destinations.map((d,i)=>[d,i]).filter(([d])=>d.floor===f.id)){const xy=project(d.x,d.z,f.height);dot(c,xy,10,visited.has(d.id)?'#6c7f45':'#f9faed');c.fillStyle=visited.has(d.id)?'#fff':'#6b7958';c.font='12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),...xy);c.textBaseline='alphabetic';hits.push({d,x:xy[0],y:xy[1]});}
  }
  player(c,project(position.x,position.z,position.y),position.yaw,true);
  c.textAlign='left';c.fillStyle='#7e8a70';c.font='14px sans-serif';c.fillText('北 N ↖',24,canvas.height-23);c.fillStyle='#b09a57';c.fillRect(canvas.width-160,canvas.height-34,19,9);c.fillStyle='#7e8167';c.fillText('階段で接続',canvas.width-130,canvas.height-24);mapHits.set(canvas,hits);
}
