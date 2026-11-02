import {amenities,amenityBounds} from './amenities.js';
import {room, stationRegions, stationStairs, ticketGates, gatePoint} from './station.js';
// Floor heights and positions are scaled for walking.
export const floors=[
  ...[
    ['B7','大江戸線ホーム','#8398a6'], ['B6','大江戸線 中間階','#91a8b0'],
    ['B5','京王新線・都営線ホーム階','#83a798'], ['B4','都営線 乗換通路','#9eb1a5'],
    ['B3','マインズタワー方面改札','#a0b4b2'], ['B2','京王線・丸ノ内線ホーム','#9aabb6']
  ].map(([id,title,color])=>({id,title,color,height:(1-Number(id.slice(1)))*5,ceiling:3.8})),
  {id:'B1',height:0,title:'地下通路・地下改札',color:'#9cac8b',ceiling:3.8},
  {id:'1F',height:5,title:'JR・小田急ホーム／東口広場',color:'#88aaa8',ceiling:3.9},
  {id:'2F',height:10,title:'南口・新南口の改札',color:'#d6b76b',ceiling:3.8}
];
export const floorById=Object.fromEntries(floors.map(f=>[f.id,f]));
export const platforms=[
  {id:'p15',x:-42,numbers:'15・16',line:'山手線外回り・中央総武線',color:'#81a849',z0:-18,z1:138},
  {id:'p13',x:-28,numbers:'13・14',line:'中央総武線・山手線内回り',color:'#81a849',z0:-18,z1:138},
  {id:'p11',x:-14,numbers:'11・12',line:'中央線快速 高尾方面',color:'#d78a3d',z0:-18,z1:138},
  {id:'p9',x:0,numbers:'9・10',line:'中央本線特急',color:'#668dab',z0:-18,z1:138},
  {id:'p7',x:14,numbers:'7・8',line:'中央線快速 東京方面',color:'#d78a3d',z0:-18,z1:138},
  {id:'p5',x:28,numbers:'5・6',line:'成田エクスプレス・特急',color:'#b86655',z0:100,z1:164},
  {id:'p3',x:42,numbers:'3・4',line:'埼京線・湘南新宿ライン',color:'#589e8c',z0:-18,z1:138},
  {id:'p1',x:56,numbers:'1・2',line:'埼京線・湘南新宿ライン',color:'#589e8c',z0:-18,z1:138}
];
export const regions=[
  room('passage','B1','public','東西自由通路',-70,80,-8,4),
  room('west','B1','public','西口地下広場',-80,-48,-24,12),
  room('east','B1','public','東口地下広場',62,80,-20,28),
  room('central','B1','jr','中央地下通路',-80,62,12,24),
  ...platforms.map(p=>room(p.id,'1F','jr',p.numbers+'番線ホーム',p.x-4,p.x+4,p.z0,p.z1,'platform')),
  room('nex-link','1F','jr','3・4番線から5・6番線への連絡部',28,46,116,122),
  room('south','2F','jr','南改札・南口コンコース',-60,76,42,74),
  room('new-south','2F','jr','新南改札コンコース',-52,72,116,144),
  room('miraina','2F','jr','ミライナタワー改札側',62,80,130,144),
  ...stationRegions
];
export const stairs=[];
function addStair(id,from,to,x,z0,z1,label){stairs.push({id,from,to,x,width:4,z0,z1,label,y0:floorById[from].height,y1:floorById[to].height});}
for(const p of platforms.filter(p=>p.id!=='p5')){
  addStair(`E-${p.id}`,'B1','1F',p.x,-25,-11,`JR北通路 ↔ ${p.numbers}番線`);
  addStair(`B-${p.id}`,'B1','1F',p.x,24,38,`地下通路 ↔ ${p.numbers}番線`);
  addStair(`S-${p.id}`,'1F','2F',p.x,72,58,`${p.numbers}番線 ↔ 南改札`);
  addStair(`N-${p.id}`,'1F','2F',p.x,110,124,`${p.numbers}番線 ↔ 新南改札`);
}
addStair('N-p5','1F','2F',28,152,138,'5・6番線 ↔ 新南改札');
for(const specification of stationStairs)addStair(...specification);
export const destinations=[
  {id:'passage',name:'東西自由通路',en:'East–west passage',floor:'B1',x:-26,z:-2,yaw:-Math.PI/2},
  {id:'west',name:'西口地下広場',en:'West underground concourse',floor:'B1',x:-58,z:-2,yaw:-Math.PI/2},
  {id:'east',name:'東口地下広場',en:'East underground plaza',floor:'B1',x:70,z:-2,yaw:Math.PI},
  {id:'central',name:'中央地下通路',en:'Central underground passage',floor:'B1',x:2,z:18,yaw:Math.PI},
  {id:'platform',name:'13・14番線ホーム',en:'JR platform 13 / 14',floor:'1F',x:-26,z:84,yaw:Math.PI},
  {id:'rapid',name:'7・8番線ホーム',en:'JR platform 7 / 8',floor:'1F',x:16,z:84,yaw:Math.PI},
  {id:'nex',name:'5・6番線ホーム',en:'Narita Express / Limited Express',floor:'1F',x:28,z:146,yaw:0},
  {id:'south',name:'南改札・南口',en:'South gate',floor:'2F',x:-54,z:48,yaw:-Math.PI/2},
  {id:'new-south',name:'新南改札',en:'New South gate',floor:'2F',x:-26,z:132,yaw:-Math.PI/2},
  {id:'miraina',name:'ミライナタワー改札側',en:'Miraina Tower gate',floor:'2F',x:76,z:136,yaw:Math.PI/2},
  {id:'kabukicho',name:'東口駅前広場・歌舞伎町方面',en:'East exit / toward Kabukicho',floor:'1F',x:70,z:-36,yaw:0},
  ...[
    ['metro-platform',-12,-63], ['odakyu-lower',-100,0], ['odakyu-upper',-91,36],
    ['keio-platform',-124,18], ['toei-transfer',-111,96],
    ['shinjuku-platform',-120,112], ['oedo-platform',-88,113]
  ].map(([id,x,z])=>{const r=regions.find(r=>r.id===id);return {id,x,z,name:r.name,floor:r.floor,en:'ホーム・連絡通路',yaw:0};})
];
export const spawn={x:-58,z:-2,y:0,surfaceId:'floor:B1',floor:'B1',yaw:-Math.PI/2};
export const pillars=[];
for(const x of[-63,73])for(const z of[-13,15])pillars.push({x,z,y:0,floor:'B1'});
for(const x of[-34,34])pillars.push({x,z:-6,y:0,floor:'B1'});
for(const p of platforms)for(const z of[p.z0+9,86,p.z1-5])if(z>p.z0&&z<p.z1)pillars.push({x:p.x,z,y:5,floor:'1F'});
for(const z of[47,137])for(const x of[-51,7,67])pillars.push({x,z,y:10,floor:'2F'});
export const obstacles=pillars.map(p=>({x0:p.x-.5,x1:p.x+.5,z0:p.z-.5,z1:p.z+.5,y:p.y,height:3.8,kind:'pillar'}));
export const gates=ticketGates.flatMap(g=>[-3,-1,1,3].map(offset=>({
  ...gatePoint(g,0,offset),y:floorById[g.floor].height,floor:g.floor,axis:g.axis,gateId:g.id
})));
for(const g of gates)obstacles.push({x0:g.x-(g.axis==='x'?1.05:.42),x1:g.x+(g.axis==='x'?1.05:.42),z0:g.z-(g.axis==='x'?.42:1.05),z1:g.z+(g.axis==='x'?.42:1.05),y:g.y,height:1.2,kind:'gate'});
for(const a of amenities)obstacles.push({...amenityBounds(a),y:floorById[a.floor].height});
export const inRegion=(r,x,z)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
export const inStair=(s,x,z,margin=0)=>Math.abs(x-s.x)<=s.width/2+margin&&z>=Math.min(s.z0,s.z1)-margin&&z<=Math.max(s.z0,s.z1)+margin;
export function stairHeight(s,x,z){
  const distance=Math.max(0,Math.min(14,(z-s.z0)/(s.z1-s.z0)*14));
  const progress=distance<6?distance/12:distance<=8?.5:.5+(distance-8)/12;
  return s.y0+(s.y1-s.y0)*progress;
}
const roomsByFloor=Object.fromEntries(floors.map(f=>[f.id,regions.filter(r=>r.floor===f.id)]));
// Sampling cell centres gives both renderers the same fare boundaries and outdoor areas.
export const regionAt=(x,z,floor)=>roomsByFloor[floor]?.findLast(r=>inRegion(r,x,z));
export const rawFloorAt=(x,z,floor)=>Boolean(regionAt(x,z,floor));
const gridSize=8;
export function spatialIndex(items,bounds,margin=0){
  const columns=new Map();
  for(const item of items){
    const b=bounds(item);
    for(let i=Math.floor((b.x0-margin)/gridSize);i<=Math.floor((b.x1+margin)/gridSize);i++){
      if(!columns.has(i))columns.set(i,new Map());
      const column=columns.get(i);
      for(let j=Math.floor((b.z0-margin)/gridSize);j<=Math.floor((b.z1+margin)/gridSize);j++){
        if(!column.has(j))column.set(j,[]);
        column.get(j).push(item);
      }
    }
  }
  return (x,z)=>columns.get(Math.floor(x/gridSize))?.get(Math.floor(z/gridSize))??[];
}
export const stairsNear=spatialIndex(stairs,s=>({x0:s.x-2,x1:s.x+2,z0:Math.min(s.z0,s.z1),z1:Math.max(s.z0,s.z1)}),.1);
export const isFloorHole=(x,z,floor)=>stairsNear(x,z).some(s=>s.to===floor&&inStair(s,x,z));
export const hasFloorAt=(x,z,floor)=>rawFloorAt(x,z,floor)&&!isFloorHole(x,z,floor);
export const hasCeilingAt=(x,z,floor)=>{
  const r=regionAt(x,z,floor);
  return !!r&&r.kind!=='outdoor'&&!stairsNear(x,z).some(s=>s.from===floor&&inStair(s,x,z));
};
export const isStairPortal=(x,z,floor)=>stairsNear(x,z).some(s=>(s.from===floor||s.to===floor)&&inStair(s,x,z,.01));
export function floorForHeight(y){return floors.reduce((best,f)=>Math.abs(f.height-y)<Math.abs(best.height-y)?f:best,floors[0]);}
// Handrails have the same location in collision and rendering geometry.
for(const s of stairs)for(const side of[-1,1])for(let d=.25;d<13.75;d+=1.5){
  const za=s.z0+(s.z1-s.z0)*d/14,zb=s.z0+(s.z1-s.z0)*Math.min(13.75,d+1.5)/14;
  const ya=stairHeight(s,s.x,za),yb=stairHeight(s,s.x,zb),x=s.x+side*1.95;
  obstacles.push({x0:x-.035,x1:x+.035,z0:Math.min(za,zb),z1:Math.max(za,zb),y:Math.min(ya,yb),height:Math.abs(yb-ya)+1,kind:'rail'});
}
