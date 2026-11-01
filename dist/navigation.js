import {floors,floorById,regions,stairs,platforms,pillars,obstacles,destinations,spawn,inStair,stairHeight,hasFloorAt,floorForHeight,inRegion} from './layout.js';
export {floors,floorById,regions,stairs,platforms,pillars,obstacles,destinations,spawn,inRegion};
const referenceY=ref=>typeof ref==='number'?ref:typeof ref==='string'?(floorById[ref]?.height??0):(ref?.y??0);
export function surfaceAt(x,z,reference=0,maxStep=.3){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const y=referenceY(reference),candidates=[];
  for(const s of stairs)if(inStair(s,x,z)){
    const h=stairHeight(s,x,z);if(Math.abs(h-y)<=maxStep)candidates.push({x,z,y:h,surfaceId:s.id,stairId:s.id,floor:floorForHeight(h).id});
  }
  if(candidates.length){const current=candidates.find(s=>s.surfaceId===reference?.surfaceId);if(current)return current;return candidates.sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];}
  for(const f of floors)if(Math.abs(f.height-y)<=maxStep&&hasFloorAt(x,z,f.id)){
    if(stairs.some(s=>inStair(s,x,z)&&stairHeight(s,x,z)>f.height+.08&&stairHeight(s,x,z)<f.height+1.95))continue;
    candidates.push({x,z,y:f.height,surfaceId:`floor:${f.id}`,stairId:null,floor:f.id});
  }
  return candidates.sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0]??null;
}
export function heightAt(x,z,reference=0){return surfaceAt(x,z,reference)?.y??null;}
export function isWalkable(x,z,reference=0,radius=.28){
  const centre=surfaceAt(x,z,reference);if(!centre)return false;
  for(const[dx,dz]of[[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]])if(!surfaceAt(x+dx,z+dz,centre,.36))return false;
  return !obstacles.some(o=>centre.y+1.8>o.y+.05&&centre.y+.05<o.y+o.height&&x+radius>o.x0&&x-radius<o.x1&&z+radius>o.z0&&z-radius<o.z1);
}
export function movePlayer(position,dx,dz){
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return {...position};
  let current=surfaceAt(position.x,position.z,position)??{...position};
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let i=0;i<steps;i++){
    const x=current.x+dx/steps;if(isWalkable(x,current.z,current))current=surfaceAt(x,current.z,current);
    const z=current.z+dz/steps;if(isWalkable(current.x,z,current))current=surfaceAt(current.x,z,current);
  }
  return current;
}
export function areaAt(x,z,reference=0){
  const s=surfaceAt(x,z,reference);if(!s)return '通路';
  if(s.stairId)return `階段：${stairs.find(st=>st.id===s.stairId).label}`;
  const rs=regions.filter(r=>r.floor===s.floor&&inRegion(r,x,z));
  return rs.at(-1)?.name??'通路';
}
export function visitIdAt(position){
  if(position.stairId)return null;
  if(position.floor==='1F')return position.x>24&&position.x<32&&position.z>=100?'nex':position.x>10&&position.x<18?'rapid':position.x>-32&&position.x<-24?'platform':null;
  return regions.filter(r=>r.floor===position.floor&&inRegion(r,position.x,position.z)).at(-1)?.id??null;
}
export function nearestStair(position,maxDistance=10){
  if(position.stairId)return stairs.find(s=>s.id===position.stairId);
  return stairs.map(s=>{const lower=Math.abs(position.y-s.y0)<.2,upper=Math.abs(position.y-s.y1)<.2;return {s,d:lower?Math.hypot(position.x-s.x,position.z-s.z0):upper?Math.hypot(position.x-s.x,position.z-s.z1):Infinity};}).filter(a=>a.d<=maxDistance).sort((a,b)=>a.d-b.d)[0]?.s??null;
}
