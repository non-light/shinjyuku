import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floors,floorById,stairs,platforms,destinations,spawn,obstacles,surfaceAt,heightAt,isWalkable,movePlayer,areaAt} from '../dist/navigation.js';
import {hasFloorAt,hasCeilingAt,inStair,stairHeight} from '../dist/layout.js';
import {plans} from '../dist/geometry.js';
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);

test('all ten destination spawns are on their declared floor',()=>{
  for(const d of destinations){assert.ok(isWalkable(d.x,d.z,d.floor),d.name);close(heightAt(d.x,d.z,d.floor),floorById[d.floor].height,d.name);}
});
test('overlapping floor plans stay distinct without vertical teleportation',()=>{
  assert.equal(heightAt(-26,-2,'B1'),0);assert.equal(heightAt(-26,-2,'1F'),5);
  const ground=movePlayer({x:-26,z:-2,y:0},2,0),upper=movePlayer({x:-26,z:-2,y:5},-2,0);
  close(ground.y,0,'underground');close(upper.y,5,'platform');
  assert.equal(heightAt(-26,-2,'2F'),null);
});
test('all 22 staircases work in both directions, from floor to floor',()=>{
  assert.equal(stairs.length,22);
  for(const s of stairs){const direction=Math.sign(s.z1-s.z0),distance=(14+1.3)*direction;
    const start={x:s.x,z:s.z0-direction*.65,y:s.y0,surfaceId:`floor:${s.from}`};assert.ok(isWalkable(start.x,start.z,start),s.id+' entrance');
    const up=movePlayer(start,0,distance);close(up.y,s.y1,s.id+' upper floor');close(up.z,s.z1+direction*.65,s.id+' exit');assert.equal(up.stairId,null,s.id+' cleared upper landing');
    const down=movePlayer(up,0,-distance);close(down.y,s.y0,s.id+' lower floor');close(down.z,start.z,s.id+' return');assert.equal(down.stairId,null);
  }
});
test('stair landings are horizontal and floor joins are continuous',()=>{
  for(const s of stairs){const at=d=>s.z0+(s.z1-s.z0)*d/14;
    close(stairHeight(s,s.x,at(6.1)),stairHeight(s,s.x,at(7.9)),s.id+' landing');
    close(stairHeight(s,s.x,s.z0),s.y0,s.id+' start');close(stairHeight(s,s.x,s.z1),s.y1,s.id+' end');
  }
});
test('rendered floors and ceilings leave headroom along every staircase',()=>{
  for(const s of stairs)for(let d=.3;d<14;d+=.3){const z=s.z0+(s.z1-s.z0)*d/14,y=stairHeight(s,s.x,z);
    for(const f of floors){if(f.height>y+.06&&f.height<y+1.85)assert.equal(hasFloorAt(s.x,z,f.id),false,`${s.id} blocked by ${f.id} floor`);
      const roof=f.height+f.ceiling;if(roof>y+.06&&roof<y+1.85)assert.equal(hasCeilingAt(s.x,z,f.id),false,`${s.id} blocked by ${f.id} roof`);}
  }
});
test('rendered wall geometry keeps every stair entrance and exit open',()=>{
  for(const s of stairs)for(const f of[s.from,s.to])for(const wall of plans.find(p=>p.floor.id===f).walls){
    const x=(wall.a[0]+wall.b[0])/2,z=(wall.a[1]+wall.b[1])/2;
    assert.equal(inStair(s,x,z,.001),false,`${s.id} has a wall across its ${f} opening`);
  }
});
test('rendered patches exactly cover navigable flat floors and exclude stair holes',()=>{
  for(const p of plans){const area=p.patches.reduce((sum,r)=>sum+(r.x1-r.x0)*(r.z1-r.z0),0);assert.equal(area,p.floorCells.size,p.floor.id);}
  for(const s of stairs){const z=(s.z0+s.z1)/2,p=plans.find(p=>p.floor.id===s.to);assert.ok(!p.patches.some(r=>s.x>r.x0&&s.x<r.x1&&z>r.z0&&z<r.z1),s.id+' upper opening');}
});
test('columns on the upper floor do not obstruct the same coordinates below',()=>{
  obstacles.push({x0:-26.5,x1:-25.5,z0:-2.5,z1:-1.5,y:5,height:3.8});
  try{assert.equal(isWalkable(-26,-2,'B1'),true);assert.equal(isWalkable(-26,-2,'1F'),false);}finally{obstacles.pop();}
});
test('walls, platform edges, handrails and gates block movement without tunnelling',()=>{
  assert.equal(isWalkable(90,0,'B1'),false);assert.equal(isWalkable(-37,90,'1F'),false);assert.equal(isWalkable(NaN,0,'B1'),false);
  const wall=movePlayer({...spawn},-50,0);assert.ok(wall.x>=-69.72);
  const gate=movePlayer({x:-54,z:17,y:0},12,0);assert.ok(gate.x<-50.3&&gate.x>-50.5);
  const s=stairs[0],z=(s.z0+s.z1)/2,y=stairHeight(s,s.x,z);assert.equal(isWalkable(s.x+1.85,z,{y,surfaceId:s.id}),false);
});
test('labels follow the floor and the actual stair being walked',()=>{
  assert.equal(areaAt(-58,-2,'B1'),'西口地下広場');assert.equal(areaAt(-54,48,'2F'),'南改札・南口コンコース');
  assert.match(areaAt(-28,31,{y:2.5,surfaceId:'B-p13'}),/階段.*13・14/);
});
test('every destination and every platform is reachable by walking from the start',()=>{
  const key=p=>`${Math.round(p.x)},${Math.round(p.z)},${Math.round(p.y*1000)}`;
  const queue=[surfaceAt(spawn.x,spawn.z,spawn)],seen=new Set([key(queue[0])]);let index=0;
  while(index<queue.length){const p=queue[index++];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
    const q=movePlayer(p,dx,dz);if(Math.abs(q.x-p.x-dx)>1e-5||Math.abs(q.z-p.z-dz)>1e-5)continue;
    const k=key(q);if(!seen.has(k)){seen.add(k);queue.push({...q,x:Math.round(q.x),z:Math.round(q.z)});}
  }}
  for(const d of destinations)assert.ok(seen.has(key({x:d.x,z:d.z,y:floorById[d.floor].height})),`disconnected destination: ${d.id}`);
  for(const p of platforms)assert.ok(queue.some(q=>q.floor==='1F'&&Math.abs(q.x-p.x)<2&&q.z>p.z0+4&&q.z<p.z1-4),`disconnected platform: ${p.numbers}`);
  assert.ok(seen.size>2000,`walked graph too small: ${seen.size}`);
});
