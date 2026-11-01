import {ticketGates} from './station.js';
import {plans} from './geometry.js';
import {floors,floorById,regions,stairs,platforms,pillars,obstacles,destinations,spawn,inStair,stairHeight,hasFloorAt,floorForHeight,inRegion,regionAt,stairsNear,spatialIndex} from './layout.js';
export {floors,floorById,regions,stairs,platforms,pillars,obstacles,destinations,spawn,inRegion};
const barriers=plans.flatMap(p=>p.fences.map(b=>({
  x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y:b.y,height:1.6
})));
const solidNear=spatialIndex([...obstacles,...barriers],b=>b,.5);
const exitOnly=ticketGates.filter(g=>g.oneWay);
function allowedStep(current,x,z){
  return !exitOnly.some(g=>{
    if(g.floor!==current.floor||current.stairId)return false;
    const a=g.axis==='x'?current.x:current.z,b=g.axis==='x'?x:z,line=g[g.axis];
    const cross=g.axis==='x'?z-g.z:x-g.x;
    return Math.abs(cross)<4&&g.oneWay*(a-line)>=0&&g.oneWay*(b-line)<0;
  });
}
export function nearbyGate(position,radius=3.2){
  if(position.stairId)return undefined;
  return ticketGates.find(g=>g.floor===position.floor&&
    Math.abs((g.axis==='x'?position.x-g.x:position.z-g.z))<=radius&&
    Math.abs((g.axis==='x'?position.z-g.z:position.x-g.x))<=4);
}
export function gateCrossing(from,to){
  if(from.floor!==to.floor||from.stairId||to.stairId)return null;
  const gate=nearbyGate(to,1.5);if(!gate)return null;
  const axis=gate.axis,line=gate[axis];
  if((from[axis]<line)===(to[axis]<line))return null;
  const sign=to[axis]<line?-1:1;
  if(gate.oneWay&&gate.oneWay!==sign)return null;
  return {gate,zone:sign<0?gate.negative:gate.positive};
}
const referenceY=ref=>typeof ref==='number'?ref:typeof ref==='string'?(floorById[ref]?.height??0):(ref?.y??0);
export function surfaceAt(x,z,reference=0,maxStep=.3){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const y=referenceY(reference),candidates=[];
  for(const s of stairsNear(x,z))if(inStair(s,x,z)){
    const h=stairHeight(s,x,z);if(Math.abs(h-y)<=maxStep)candidates.push({x,z,y:h,surfaceId:s.id,stairId:s.id,floor:floorForHeight(h).id});
  }
  if(candidates.length){const current=candidates.find(s=>s.surfaceId===reference?.surfaceId);if(current)return current;return candidates.sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];}
  for(const f of floors)if(Math.abs(f.height-y)<=maxStep&&hasFloorAt(x,z,f.id)){
    if(stairsNear(x,z).some(s=>inStair(s,x,z)&&stairHeight(s,x,z)>f.height+.08&&stairHeight(s,x,z)<f.height+1.95))continue;
    candidates.push({x,z,y:f.height,surfaceId:`floor:${f.id}`,stairId:null,floor:f.id});
  }
  return candidates.sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0]??null;
}
export function heightAt(x,z,reference=0){return surfaceAt(x,z,reference)?.y??null;}
export function isWalkable(x,z,reference=0,radius=.28){
  const centre=surfaceAt(x,z,reference);if(!centre)return false;
  for(const[dx,dz]of[[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]])if(!surfaceAt(x+dx,z+dz,centre,.36))return false;
  return !solidNear(x,z).some(o=>centre.y+1.8>o.y+.05&&centre.y+.05<o.y+o.height&&x+radius>o.x0&&x-radius<o.x1&&z+radius>o.z0&&z-radius<o.z1);
}
export function movePlayer(position,dx,dz){
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return {...position};
  let current=surfaceAt(position.x,position.z,position)??{...position};
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let i=0;i<steps;i++){
    const x=current.x+dx/steps;if(x!==current.x&&allowedStep(current,x,current.z)&&isWalkable(x,current.z,current))current=surfaceAt(x,current.z,current);
    const z=current.z+dz/steps;if(z!==current.z&&allowedStep(current,current.x,z)&&isWalkable(current.x,z,current))current=surfaceAt(current.x,z,current);
  }
  return current;
}
export function areaAt(x,z,reference=0){
  const s=surfaceAt(x,z,reference);if(!s)return '通路';
  if(s.stairId)return `階段：${stairs.find(st=>st.id===s.stairId).label}`;
  const gate=nearbyGate(s,1.4);
  return gate?.name??regionAt(x,z,s.floor)?.name??'通路';
}
export function visitIdAt(position){
  if(position.stairId)return null;
  const r=regionAt(position.x,position.z,position.floor);
  if(r?.kind==='platform')return {p5:'nex',p7:'rapid',p13:'platform'}[r.id]??null;
  return destinations.some(d=>d.id===r?.id)?r.id:null;
}
export function nearestStair(position,maxDistance=10){
  if(position.stairId)return stairs.find(s=>s.id===position.stairId);
  return stairs.map(s=>{const lower=Math.abs(position.y-s.y0)<.2,upper=Math.abs(position.y-s.y1)<.2;return {s,d:lower?Math.hypot(position.x-s.x,position.z-s.z0):upper?Math.hypot(position.x-s.x,position.z-s.z1):Infinity};}).filter(a=>a.d<=maxDistance).sort((a,b)=>a.d-b.d)[0]?.s??null;
}
