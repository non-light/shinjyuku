import {ticketGates} from './station.js';
import {floors,regions,regionAt,isFloorHole,hasCeilingAt,isStairPortal} from './layout.js';
// Renderer and maps consume the same plans, including all stair openings.
export const bounds={x0:Math.min(...regions.map(r=>r.x0)),x1:Math.max(...regions.map(r=>r.x1)),z0:Math.min(...regions.map(r=>r.z0)),z1:Math.max(...regions.map(r=>r.z1))};
function rectanglesFromCells(cells){
  const rects=[],active=new Map();
  for(let z=bounds.z0;z<bounds.z1;z++){
    const spans=[];let start=null;
    for(let x=bounds.x0;x<=bounds.x1;x++){
      const filled=cells.has(`${x},${z}`);
      if(filled&&start===null)start=x;
      if(!filled&&start!==null){spans.push([start,x]);start=null;}
    }
    const next=new Map();
    for(const[x0,x1]of spans){const key=`${x0},${x1}`,r=active.get(key)??{x0,x1,z0:z,z1:z};r.z1=z+1;next.set(key,r);if(!active.has(key))rects.push(r);}
    active.clear();for(const[k,v]of next)active.set(k,v);
  }
  return rects;
}
export const plans=floors.map(f=>{
  const raw=new Set(),floor=new Set(),ceiling=new Set(),walls=[],fences=[];
  const zones=new Map();
  for(const r of regions.filter(r=>r.floor===f.id)){
    for(let x=r.x0;x<r.x1;x++)for(let z=r.z0;z<r.z1;z++){
      const key=x+','+z;
      raw.add(key);zones.set(key,r.zone);
    }
  }
  const gates=ticketGates.filter(g=>g.floor===f.id);
  for(const cell of raw){
    const [x,z]=cell.split(',').map(Number);
    if(!isFloorHole(x+.5,z+.5,f.id))floor.add(cell);
    if(hasCeilingAt(x+.5,z+.5,f.id))ceiling.add(cell);
    for(const [axis,dx,dz] of [['x',1,0],['z',0,1]]){
      const side=zones.get((x+dx)+','+(z+dz)),zone=zones.get(cell);
      if(!side||side===zone)continue;
      const mx=x+.5+dx*.5,mz=z+.5+dz*.5;
      const open=gates.some(g=>g.axis===axis&&g.negative===zone&&g.positive===side&&
        (dx?g.x===mx&&Math.abs(g.z-mz)<4:g.z===mz&&Math.abs(g.x-mx)<4));
      if(!open)fences.push({x:mx,z:mz,axis,y:f.height,w:dx?.12:1,d:dz?.12:1});
    }
  }
  for(const cell of raw){const[x,z]=cell.split(',').map(Number);
    for(const[dx,dz,a,b]of[[-1,0,[x,z],[x,z+1]],[1,0,[x+1,z+1],[x+1,z]],[0,-1,[x+1,z],[x,z]],[0,1,[x,z+1],[x+1,z+1]]]){
      if(raw.has(`${x+dx},${z+dz}`))continue;
      const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
      if(!isStairPortal(mx,mz,f.id))walls.push({a,b,dx,dz,kind:regionAt(x+.5,z+.5,f.id).kind});
    }
  }
  const byZone=new Map();
  for(const cell of floor){const zone=zones.get(cell);if(!byZone.has(zone))byZone.set(zone,new Set());byZone.get(zone).add(cell);}
  const zonePatches=[...byZone].flatMap(([zone,cells])=>rectanglesFromCells(cells).map(r=>({...r,zone})));
  return {floor:f,fences,zonePatches,rawCells:raw,floorCells:floor,ceilingCells:ceiling,patches:rectanglesFromCells(floor),ceilingPatches:rectanglesFromCells(ceiling),walls};
});
