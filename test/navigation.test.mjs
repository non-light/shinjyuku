import {ticketGates,gatePoint,gateApproach} from '../dist/station.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floors,floorById,stairs,platforms,destinations,spawn,surfaceAt,heightAt,isWalkable,movePlayer,areaAt,gateCrossing} from '../dist/navigation.js';
import {hasFloorAt,hasCeilingAt,inStair,stairHeight,regionAt,pillars,gates} from '../dist/layout.js';
import {plans} from '../dist/geometry.js';
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);

test('all destination spawns are on their declared floor',()=>{
  for(const d of destinations){assert.ok(isWalkable(d.x,d.z,d.floor),d.name);close(heightAt(d.x,d.z,d.floor),floorById[d.floor].height,d.name);}
});
test('overlapping floor plans stay distinct without vertical teleportation',()=>{
  assert.equal(heightAt(-26,-2,'B1'),0);assert.equal(heightAt(-26,-2,'1F'),5);
  const ground=movePlayer({x:-26,z:-2,y:0},2,0),upper=movePlayer({x:-26,z:-2,y:5},-2,0);
  close(ground.y,0,'underground');close(upper.y,5,'platform');
  assert.equal(heightAt(-26,-2,'2F'),null);
});
test('all staircases work in both directions, from floor to floor',()=>{
  assert.equal(stairs.length,51);
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
  // Use actual stacked geometry so the collision index is exercised.
  const overlaps=pillars.flatMap(p=>floors.filter(f=>f.height<p.y&&isWalkable(p.x,p.z,f.id)).map(f=>[p,f]));
  assert.ok(overlaps.length>0);
  for(const [p,f] of overlaps){assert.equal(isWalkable(p.x,p.z,p.floor),false);assert.equal(isWalkable(p.x,p.z,f.id),true);}
});
test('walls, platform edges, handrails and gates block movement without tunnelling',()=>{
  assert.equal(isWalkable(90,0,'B1'),false);assert.equal(isWalkable(-37,90,'1F'),false);assert.equal(isWalkable(NaN,0,'B1'),false);
  const wall=movePlayer({x:74,z:1,y:0},60,0);assert.ok(wall.x<=79.73);
  const machine=movePlayer({x:58,z:19,y:0},12,0);assert.ok(machine.x<61);
  const s=stairs[0],z=(s.z0+s.z1)/2,y=stairHeight(s,s.x,z);assert.equal(isWalkable(s.x+1.85,z,{y,surfaceId:s.id}),false);
});
test('labels follow the floor and the actual stair being walked',()=>{
  assert.equal(areaAt(-58,-2,'B1'),'西口地下広場');assert.equal(areaAt(-54,48,'2F'),'南改札・南口コンコース');
  assert.match(areaAt(-28,31,{y:2.5,surfaceId:'B-p13'}),/階段.*13・14/);
});
test('each physical ticket line has a unique place, correctly ordered sides and usable lanes',()=>{
  assert.equal(ticketGates.length,27);
  assert.equal(new Set(ticketGates.map(g=>g.id)).size,27);
  assert.equal(new Set(ticketGates.map(g=>[g.floor,g.x,g.z].join(','))).size,27);
  for(const g of ticketGates){
    assert.equal(gates.filter(m=>m.gateId===g.id).length,4);
    const spawn=gateApproach(g);assert.ok(isWalkable(spawn.x,spawn.z,g.floor),g.name+' approach');
    for(const sign of [-1,1]){
      const a=gatePoint(g,sign*2),b=gatePoint(g,-sign*2);
      assert.equal(regionAt(a.x,a.z,g.floor)?.zone,sign<0?g.negative:g.positive,g.id+' side');
      const end=movePlayer(surfaceAt(a.x,a.z,g.floor),b.x-a.x,b.z-a.z);
      const permitted=!g.oneWay||g.oneWay===-sign;
      assert.equal(Math.hypot(end.x-b.x,end.z-b.z)<1e-5,permitted,g.id+' direction '+sign);
      const at=d=>({...gatePoint(g,d),floor:g.floor});
      const crossed=gateCrossing(at(sign*.08),at(-sign*.08));
      assert.equal(crossed?.gate.id,permitted?g.id:undefined,g.id+' crossing event');
    }
    for(const offset of [-1,1]){
      const body=gatePoint(g,0,offset);assert.equal(isWalkable(body.x,body.z,g.floor),false,g.id+' machine');
    }
  }
});
test('ticket barriers block crossings outside the machine lanes',()=>{
  for(const plan of plans){
    for(const fence of plan.fences)assert.equal(isWalkable(fence.x,fence.z,plan.floor.id),false,plan.floor.id+' fence');
  }
});
test('JR platform to Kabukicho uses a ticket line and two different staircases',()=>{
  let p=surfaceAt(57,-10,'1F');const used=new Set();
  function go(x,z){
    const length=Math.ceil(Math.hypot(x-p.x,z-p.z)/.1),dx=(x-p.x)/length,dz=(z-p.z)/length;
    for(let i=0;i<length;i++){p=movePlayer(p,dx,dz);if(p.stairId)used.add(p.stairId);}
    close(p.x,x,'x');close(p.z,z,'z');
  }
  // The centre of the platform has a column north of the landing. Approach beside it.
  for(const [x,z] of [[56,-10],[56,-26],[50,-26],[50,-16],[50,-12],[50,-2],[70,-2],[70,-36]])go(x,z);
  assert.equal(p.floor,'1F');assert.equal(regionAt(p.x,p.z,p.floor).id,'kabukicho');
  assert.deepEqual([...used],['E-p1','east-street']);
  const free=movePlayer({...spawn},128,0);close(free.x,70,'west to east');assert.equal(free.floor,'B1');
});
const pointKey=p=>[Math.round(p.x),Math.round(p.z),Math.round(p.y*1000)].join(',');
function exploreFrom(start,blockGates=false){
  const queue=[surfaceAt(start.x,start.z,start)],seen=new Set([pointKey(queue[0])]);
  const closed=new Set();
  if(blockGates)for(const g of ticketGates)for(let i=-4;i<=4;i++){
    closed.add(pointKey({...gatePoint(g,0,i),y:floorById[g.floor].height}));
  }
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const q=movePlayer(p,dx,dz);
      if(Math.abs(q.x-p.x-dx)>1e-5||Math.abs(q.z-p.z-dz)>1e-5)continue;
      const k=pointKey(q);
      if(!seen.has(k)&&!closed.has(k)){seen.add(k);queue.push({...q,x:Math.round(q.x),z:Math.round(q.z)});}
    }
  }
  return {queue,seen};
}
test('all public approaches are connected outside fare control without entering a paid area',()=>{
  const {queue,seen}=exploreFrom(spawn,true);
  for(const p of queue)if(!p.stairId){
    assert.equal(regionAt(p.x,p.z,p.floor)?.zone,'public','leak at '+pointKey(p));
  }
  for(const g of ticketGates){
    const sign=g.negative==='public'?-1:g.positive==='public'?1:0;if(!sign)continue;
    assert.ok(seen.has(pointKey({...gatePoint(g,sign*2),y:floorById[g.floor].height})),g.id+' outside');
  }
});
test('each railway connects its gate interiors to its own platforms',()=>{
  const starts={jr:{x:-26,z:84,floor:'1F'},odakyu:{x:-91,z:36,floor:'1F'},
    keio:{x:-124,z:18,floor:'B2'},metro:{x:-12,z:-63,floor:'B2'}};
  for(const [zone,start] of Object.entries(starts)){
    const {seen}=exploreFrom({...start,y:floorById[start.floor].height},true);
    for(const g of ticketGates){
      const sign=g.negative===zone?-1:g.positive===zone?1:0;if(!sign)continue;
      assert.ok(seen.has(pointKey({...gatePoint(g,sign*2),y:floorById[g.floor].height})),g.id+' paid '+zone);
    }
  }
});
test('every destination and every platform is reachable by walking from the start',()=>{
  const {queue,seen}=exploreFrom(spawn);
  for(const d of destinations)assert.ok(seen.has(pointKey({x:d.x,z:d.z,y:floorById[d.floor].height})),`disconnected destination: ${d.id}`);
  for(const g of ticketGates)for(const sign of [-1,1]){
    const p=gatePoint(g,sign*2);assert.ok(seen.has(pointKey({...p,y:floorById[g.floor].height})),g.id+' connected side '+sign);
  }
  for(const p of platforms)assert.ok(queue.some(q=>q.floor==='1F'&&Math.abs(q.x-p.x)<2&&q.z>p.z0+4&&q.z<p.z1-4),`disconnected platform: ${p.numbers}`);
  assert.ok(seen.size>2000,`walked graph too small: ${seen.size}`);
});
