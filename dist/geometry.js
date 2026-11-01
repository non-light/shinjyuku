import {floors,regions,rawFloorAt,hasFloorAt,hasCeilingAt,isStairPortal} from './layout.js';
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
  const raw=new Set(),floor=new Set(),ceiling=new Set(),walls=[];
  for(let x=bounds.x0;x<bounds.x1;x++)for(let z=bounds.z0;z<bounds.z1;z++){
    if(rawFloorAt(x+.5,z+.5,f.id))raw.add(`${x},${z}`);
    if(hasFloorAt(x+.5,z+.5,f.id))floor.add(`${x},${z}`);
    if(hasCeilingAt(x+.5,z+.5,f.id))ceiling.add(`${x},${z}`);
  }
  for(const cell of raw){const[x,z]=cell.split(',').map(Number);
    for(const[dx,dz,a,b]of[[-1,0,[x,z],[x,z+1]],[1,0,[x+1,z+1],[x+1,z]],[0,-1,[x+1,z],[x,z]],[0,1,[x,z+1],[x+1,z+1]]]){
      if(raw.has(`${x+dx},${z+dz}`))continue;
      const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
      if(!isStairPortal(mx,mz,f.id))walls.push({a,b,dx,dz});
    }
  }
  return {floor:f,rawCells:raw,floorCells:floor,ceilingCells:ceiling,patches:rectanglesFromCells(floor),ceilingPatches:rectanglesFromCells(ceiling),walls};
});
