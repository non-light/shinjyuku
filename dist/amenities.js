// Representative placements in the walking model. A bank of lockers is one location.
export const amenityTypes = {
  locker: {name:'コインロッカー', mark:'L', color:'#645587', width:3.2, depth:.75, height:2.05,
    help:'正面の操作ボタンで扉を1つ開け、中をのぞけます。'},
  vending: {name:'自動販売機', mark:'V', color:'#985035', width:1.35, depth:.85, height:1.95,
    help:'正面の操作ボタンで水を1本出し、取り出し口から受け取れます。'},
  bench: {name:'ベンチ', mark:'B', color:'#795d32', width:2.6, depth:.72, height:.88,
    help:'座って構内を見回せます。立ち上がると散策に戻れます。'}
};
function fixture(id,type,area,floor,x,z,yaw){
  return {id,type,area,floor,x,z,yaw,name:area+'の'+amenityTypes[type].name};
}
export const amenities=[
  fixture('locker-east','locker','東口地下広場','B1',79,-9,-Math.PI/2),
  fixture('locker-north','locker','JR北通路・東改札内','B1',33,-31,0),
  fixture('locker-south','locker','JR南改札内','2F',-34,73,Math.PI),
  fixture('vending-west','vending','西口地下広場','B1',-69,10,Math.PI),
  fixture('vending-jr','vending','JR 13・14番線ホーム','1F',-28,94,Math.PI),
  fixture('vending-metro','vending','丸ノ内線ホーム','B2',34,-65,Math.PI/2),
  fixture('vending-new-south','vending','JR新南改札内','2F',18,143,Math.PI),
  fixture('bench-west','bench','西口地下広場','B1',-63,8,Math.PI),
  fixture('bench-east','bench','東口地下広場','B1',73,24,Math.PI),
  fixture('bench-jr','bench','JR 13・14番線ホーム','1F',-28,49,0),
  fixture('bench-plaza','bench','東口駅前広場','1F',90,-44,-Math.PI/2),
  fixture('bench-toei','bench','京王新線・都営新宿線ホーム','B5',-120,115,Math.PI/2)
];

// Local +Z is the front of each fixture, including its working or seating side.
export function amenityApproach(a){
  return {x:a.x+2*Math.sin(a.yaw),z:a.z+2*Math.cos(a.yaw),floor:a.floor,
    yaw:a.yaw,pitch:a.type==='bench'?-.40:-.24,name:a.name};
}
export function amenityBounds(a){
  const {width,depth,height}=amenityTypes[a.type];
  const s=Math.abs(Math.sin(a.yaw)),c=Math.abs(Math.cos(a.yaw));
  const hx=(width*c+depth*s)/2,hz=(width*s+depth*c)/2;
  return {x0:a.x-hx,x1:a.x+hx,z0:a.z-hz,z1:a.z+hz,height,kind:a.type,amenityId:a.id};
}
export function facingAmenity(position,yaw){
  if(position.stairId)return null;
  let best=null,bestDistance=Infinity;
  for(const a of amenities){
    if(a.floor!==position.floor)continue;
    const dx=position.x-a.x,dz=position.z-a.z,s=Math.sin(a.yaw),c=Math.cos(a.yaw);
    const {width,depth}=amenityTypes[a.type];
    const side=dx*c-dz*s,front=dx*s+dz*c-depth/2;
    if(front<0||front>2.15||Math.abs(side)>width/2+.32)continue;
    const offset=side-Math.max(-width/2,Math.min(width/2,side));
    const distance=Math.hypot(front,offset);
    const view=(offset*c+front*s)*Math.sin(yaw)+(-offset*s+front*c)*Math.cos(yaw);
    if(view>=distance*.45&&distance<bestDistance){best=a;bestDistance=distance;}
  }
  return best;
}
