// JR Shinjuku B1 / 1F / 2F, interpreted as a connected walking schematic.
// Dimensions and routes are simplified; no surveyed geometry is used.
export const floors=[
  {id:'B1',height:0,title:'地下通路・地下改札',color:'#9cac8b',ceiling:3.8},
  {id:'1F',height:5,title:'JR線ホーム',color:'#88aaa8',ceiling:3.9},
  {id:'2F',height:10,title:'南改札・新南改札',color:'#d6b76b',ceiling:3.8}
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
  {id:'passage',floor:'B1',name:'東西自由通路',x0:-70,x1:80,z0:-8,z1:4},
  {id:'west',floor:'B1',name:'西口地下広場',x0:-70,x1:-48,z0:-24,z1:28},
  {id:'east',floor:'B1',name:'東口・東改札側',x0:62,x1:80,z0:-20,z1:28},
  {id:'central',floor:'B1',name:'中央地下通路',x0:-48,x1:62,z0:12,z1:24},
  ...platforms.map(p=>({id:p.id,floor:'1F',name:`${p.numbers}番線ホーム`,kind:'platform',x0:p.x-4,x1:p.x+4,z0:p.z0,z1:p.z1})),
  {id:'nex-link',floor:'1F',name:'3・4番線から5・6番線への連絡部',x0:28,x1:46,z0:116,z1:122},
  {id:'south',floor:'2F',name:'南改札・南口コンコース',x0:-60,x1:76,z0:42,z1:60},
  {id:'new-south',floor:'2F',name:'新南改札コンコース',x0:-52,x1:72,z0:124,z1:144},
  {id:'miraina',floor:'2F',name:'ミライナタワー改札側',x0:62,x1:80,z0:130,z1:144}
];
export const stairs=[];
function addStair(id,from,to,x,z0,z1,label){stairs.push({id,from,to,x,width:4,z0,z1,label,y0:floorById[from].height,y1:floorById[to].height});}
for(const p of platforms.filter(p=>p.id!=='p5')){
  addStair(`B-${p.id}`,'B1','1F',p.x,24,38,`地下通路 ↔ ${p.numbers}番線`);
  addStair(`S-${p.id}`,'1F','2F',p.x,72,58,`${p.numbers}番線 ↔ 南改札`);
  addStair(`N-${p.id}`,'1F','2F',p.x,110,124,`${p.numbers}番線 ↔ 新南改札`);
}
addStair('N-p5','1F','2F',28,152,138,'5・6番線 ↔ 新南改札');
export const destinations=[
  {id:'passage',name:'東西自由通路',en:'East–west passage',floor:'B1',x:-26,z:-2,yaw:-Math.PI/2},
  {id:'west',name:'西口地下広場',en:'West underground concourse',floor:'B1',x:-58,z:-2,yaw:-Math.PI/2},
  {id:'east',name:'東口・東改札側',en:'East exit / East gate',floor:'B1',x:70,z:-2,yaw:Math.PI},
  {id:'central',name:'中央地下通路',en:'Central underground passage',floor:'B1',x:2,z:18,yaw:Math.PI},
  {id:'platform',name:'13・14番線ホーム',en:'JR platform 13 / 14',floor:'1F',x:-26,z:84,yaw:Math.PI},
  {id:'rapid',name:'7・8番線ホーム',en:'JR platform 7 / 8',floor:'1F',x:16,z:84,yaw:Math.PI},
  {id:'nex',name:'5・6番線ホーム',en:'Narita Express / Limited Express',floor:'1F',x:28,z:146,yaw:0},
  {id:'south',name:'南改札・南口',en:'South gate',floor:'2F',x:-54,z:48,yaw:-Math.PI/2},
  {id:'new-south',name:'新南改札',en:'New South gate',floor:'2F',x:-26,z:132,yaw:-Math.PI/2},
  {id:'miraina',name:'ミライナタワー改札側',en:'Miraina Tower gate',floor:'2F',x:76,z:136,yaw:Math.PI/2}
];
export const spawn={x:-58,z:-2,y:0,surfaceId:'floor:B1',floor:'B1',yaw:-Math.PI/2};
export const pillars=[];
for(const x of[-63,73])for(const z of[-13,15])pillars.push({x,z,y:0,floor:'B1'});
for(const x of[-34,34])pillars.push({x,z:-6,y:0,floor:'B1'});
for(const p of platforms)for(const z of[p.z0+9,86,p.z1-5])if(z>p.z0&&z<p.z1)pillars.push({x:p.x,z,y:5,floor:'1F'});
for(const z of[47,137])for(const x of[-51,7,67])pillars.push({x,z,y:10,floor:'2F'});
export const obstacles=pillars.map(p=>({x0:p.x-.5,x1:p.x+.5,z0:p.z-.5,z1:p.z+.5,y:p.y,height:3.8,kind:'pillar'}));
export const gates=[];
for(const x of[-49,63])for(const z of[13.5,17,20.5])gates.push({x,z,y:0,floor:'B1',axis:'x'});
for(const x of[-57,74])for(const z of[44,48,52,56])gates.push({x,z,y:10,floor:'2F',axis:'x'});
for(const x of[-45,-39,-33,-27,-21])gates.push({x,z:140,y:10,floor:'2F',axis:'z'});
for(const g of gates)obstacles.push({x0:g.x-(g.axis==='x'?1.05:.42),x1:g.x+(g.axis==='x'?1.05:.42),z0:g.z-(g.axis==='x'?.42:1.05),z1:g.z+(g.axis==='x'?.42:1.05),y:g.y,height:1.2,kind:'gate'});
export const benches=[{x:-59,z:23,w:10,y:0},{x:73,z:24,w:9,y:0}];
for(const b of benches)obstacles.push({x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-.6,z1:b.z+.7,y:b.y,height:1.35,kind:'bench'});
export const inRegion=(r,x,z)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
export const inStair=(s,x,z,margin=0)=>Math.abs(x-s.x)<=s.width/2+margin&&z>=Math.min(s.z0,s.z1)-margin&&z<=Math.max(s.z0,s.z1)+margin;
export function stairHeight(s,x,z){
  const distance=Math.max(0,Math.min(14,(z-s.z0)/(s.z1-s.z0)*14));
  const progress=distance<6?distance/12:distance<=8?.5:.5+(distance-8)/12;
  return s.y0+(s.y1-s.y0)*progress;
}
export const rawFloorAt=(x,z,floor)=>regions.some(r=>r.floor===floor&&inRegion(r,x,z));
export const isFloorHole=(x,z,floor)=>stairs.some(s=>s.to===floor&&inStair(s,x,z));
export const hasFloorAt=(x,z,floor)=>rawFloorAt(x,z,floor)&&!isFloorHole(x,z,floor);
export const hasCeilingAt=(x,z,floor)=>rawFloorAt(x,z,floor)&&!stairs.some(s=>s.from===floor&&inStair(s,x,z));
export const isStairPortal=(x,z,floor)=>stairs.some(s=>(s.from===floor||s.to===floor)&&inStair(s,x,z,.01));
export function floorForHeight(y){return floors.reduce((best,f)=>Math.abs(f.height-y)<Math.abs(best.height-y)?f:best,floors[0]);}
// Handrails have the same location in collision and rendering geometry.
for(const s of stairs)for(const side of[-1,1])for(let d=.25;d<13.75;d+=1.5){
  const za=s.z0+(s.z1-s.z0)*d/14,zb=s.z0+(s.z1-s.z0)*Math.min(13.75,d+1.5)/14;
  const ya=stairHeight(s,s.x,za),yb=stairHeight(s,s.x,zb),x=s.x+side*1.95;
  obstacles.push({x0:x-.035,x1:x+.035,z0:Math.min(za,zb),z1:Math.max(za,zb),y:Math.min(ya,yb),height:Math.abs(yb-ya)+1,kind:'rail'});
}

for(const z of[8,9.65])obstacles.push({x0:-70,x1:-68.54,z0:z-.72,z1:z+.72,y:0,height:2.3,kind:'vending'});
