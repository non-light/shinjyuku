// Each fixture is built in metres about its floor centre, with the front toward +Z.
export function addAmenityModels({THREE, scene, box, mat, texture, shadow}, fixtures) {
  const steel = mat('#b7bdb8', .34, .65);
  const graphite = mat('#33403e', .54, .27);
  const inset = mat('#293331', .86);
  const enamel = mat('#d5dbd3', .46, .19);
  const petrol = mat('#365c58', .52, .24);
  const warmWhite = mat('#ecece2', .44, .13);
  const greyBlue = mat('#6e8587', .52, .29);
  const oak = mat('#ffffff', .68, .03);
  oak.map = texture(256,64,c=>{
    c.fillStyle='#aa8055';c.fillRect(0,0,256,64);
    for (let i=0;i<22;i++) {
      c.strokeStyle=i%3===0?'#805d3d':'#b58b61';c.lineWidth=i%4===0?1.4:.7;
      const y=(i*17)%65;
      c.beginPath();c.moveTo(0,y);
      c.bezierCurveTo(74,y+4*Math.cos(i),148,y-5*Math.sin(i),256,y+2);c.stroke();
    }
  });

  function rect(c, color, x, y, w, h) {
    c.fillStyle=color;c.fillRect(x,y,w,h);
  }
  function text(c, value, x, y, font, color) {
    c.font=font;c.fillStyle=color;c.fillText(value,x,y);
  }
  function decal(w,h,map,cutout=false) {
    const material=new THREE.MeshStandardMaterial({map,roughness:.58,metalness:.05,
      alphaTest:cutout ? .5 : 0,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.11});
    return {geometry:new THREE.PlaneGeometry(w,h),material};
  }
  function meshFrom(part) { return new THREE.Mesh(part.geometry,part.material); }

  const doorW=.428, doorH=.54, front=.334;
  const columns=[-1.32,-.88,-.44,.44,.88,1.32], rows=[1.495,.938,.381];
  const doorNumber=(row,col)=>row*columns.length+col+1;
  const active=9;
  function paintDoor(c,number) {
    const skin=['#c7d1c6','#d2d9cf','#c1cec6'];
    rect(c,skin[number%3],0,0,128,160);
    rect(c,'#edf1e8',1,1,126,1.5);
    rect(c,'#889689',2,157,125,2);
    rect(c,'#eff1e7',9,10,35,21);
    text(c,String(number).padStart(2,'0'),14,26,'bold 16px sans-serif','#34433e');
    rect(c,'#354943',94,58,21,38);
    rect(c,number===active?'#92d69b':'#bfcaac',101,62,7,3);
    rect(c,'#76857c',103,70,6,13);
    for(let i=0;i<3;i++)rect(c,'#99a79b',12+i*10,141,7,2);
  }
  const lockerMap=texture(1024,656,c=>{
    c.clearRect(0,0,1024,656);
    for(const [row,y] of rows.entries())for(const [col,x] of columns.entries()){
      const n=doorNumber(row,col);if(n===active)continue;
      c.save();c.translate((x-doorW/2+1.6)*320,(2.05-y-doorH/2)*320);
      c.scale(doorW*320/128,doorH*320/160);paintDoor(c,n);c.restore();
    }
    // Illuminated header and central terminal share the same face atlas.
    rect(c,'#345752',8,6,1008,73);
    rect(c,'#a7c5a2',8,73,1008,6);
    c.strokeStyle='#f0f4dd';c.lineWidth=4;
    c.strokeRect(33,28,38,30);c.strokeRect(45,21,14,7);
    text(c,'コインロッカー',89,52,'bold 32px sans-serif','#f2f2e6');
    text(c,'COIN LOCKERS',406,52,'24px sans-serif','#dbdfcc');
    text(c,'01–18',911,52,'23px sans-serif','#e0e9d6');
    rect(c,'#485952',448,91,128,529);
    rect(c,'#cde5da',459,230,106,81);
    text(c,'受付',485,263,'bold 24px sans-serif','#2d5045');
    text(c,'LOCKER',484,288,'15px sans-serif','#36584b');
    rect(c,'#1f2e2b',473,338,79,31);
    text(c,'IC',500,361,'bold 18px sans-serif','#e0dcb9');
    rect(c,'#c4c5ad',477,391,70,5);
  });
  const lockerFace=decal(3.2,2.05,lockerMap,true);
  const doorFace=decal(doorW,doorH,texture(128,160,c=>paintDoor(c,active)));
  const doorPlate=new THREE.BoxGeometry(doorW,doorH,.042);
  const doorGrip=new THREE.BoxGeometry(.023,.057,.028);
  const hinges=new Map();

  const drinks=[
    ['天然水','#c4e4e4','#729caf'],['緑 茶','#b0ba64','#55733e'],
    ['珈 琲','#79604c','#513f38'],['ソーダ','#83c4cc','#247189'],
    ['みかん','#efae62','#c27836'],['麦 茶','#ccaf74','#8f773f']
  ];
  function paintCan(c,idx,x,y) {
    const [name,body,label]=drinks[idx],bottle=idx!==2;
    // Each row alternates tall PET silhouettes and the shorter coffee can.
    const top=y+(bottle?0:12),height=55-(top-y);
    const shade=c.createLinearGradient(x-14,0,x+14,0);
    shade.addColorStop(0,'#687775');shade.addColorStop(.18,body);
    shade.addColorStop(.48,'#f3f0d9');shade.addColorStop(.68,body);shade.addColorStop(1,label);
    c.fillStyle=shade;c.beginPath();c.moveTo(x-14,y+55);c.lineTo(x-14,top+9);
    c.lineTo(x-(bottle?7:13),top);c.lineTo(x+(bottle?7:13),top);
    c.lineTo(x+14,top+9);c.lineTo(x+14,y+55);c.closePath();c.fill();
    rect(c,bottle?label:'#d3d7cd',x-(bottle?7:14),top-4,bottle?14:28,5);
    rect(c,label,x-14,top+height*.37,28,17);
    text(c,name,x-13,top+height*.37+12,'bold 9px sans-serif','#fffbe9');
  }
  const vendingMap=texture(640,680,c=>{
    rect(c,'#e6e9df',0,0,640,680);
    rect(c,'#3a6467',0,0,640,72);
    rect(c,'#c9b85a',0,66,640,6);
    text(c,'駅ののみもの',24,47,'bold 32px sans-serif','#f3f1dc');
    text(c,'DRINK STAND',407,44,'22px sans-serif','#d5e5db');
    rect(c,'#394c4d',18,85,604,416);
    for(let row=0;row<3;row++){
      const top=96+row*132;
      const light=c.createLinearGradient(0,top,0,top+97);
      light.addColorStop(0,'#ceddd7');light.addColorStop(.7,'#f9f9e9');light.addColorStop(1,'#b8c8bf');
      c.fillStyle=light;c.fillRect(30,top,580,97);
      for(let col=0;col<6;col++){
        const x=73+col*98;
        paintCan(c,(col+row*2)%6,x,top+25);
        rect(c,'#d7e2db',x-25,top+94,50,18);
        rect(c,row===2?'#b75e46':'#58899a',x-19,top+101,38,4);
      }
      rect(c,'#7e928c',30,top+116,580,3);
    }
    rect(c,'#b6c3bb',20,523,600,2);
    text(c,'COLD  /  HOT',27,570,'bold 21px sans-serif','#42686a');
    text(c,'つめたい  ・  あたたかい',27,605,'15px sans-serif','#4e6059');
    rect(c,'#334d4c',303,541,102,63);
    text(c,'IC',337,583,'bold 29px sans-serif','#c0dbb7');
    rect(c,'#3b4947',443,544,118,18);
    rect(c,'#92a293',454,550,94,4);
    text(c,'コイン',456,588,'15px sans-serif','#536660');
    rect(c,'#77949a',22,648,596,7);
  });
  const vendingFace=decal(1.245,1.32,vendingMap);
  const bottleShape=new THREE.LatheGeometry([[0,0],[.046,0],[.053,.013],[.053,.185],
    [.05,.208],[.025,.235],[.019,.24],[.019,.25],[0,.25]].map(([r,h])=>new THREE.Vector2(r,h)),12);
  const bottleBody=mat('#bee1dc',.3,.05), bottleInk=mat('#36758c',.48);
  const sleeveShape=new THREE.CylinderGeometry(.054,.054,.082,12);
  const capShape=new THREE.CylinderGeometry(.023,.023,.021,12);
  const bottles=new Map();

  for(const f of fixtures){
    const c=Math.cos(f.yaw),s=Math.sin(f.yaw);
    function position(x,y,z){
      return [f.x+c*x+s*z,f.y+y,f.z-s*x+c*z];
    }
    function part(x,y,z,w,h,d,material){
      box(...position(x,y,z),w,h,d,material,f.yaw);
    }
    function place(object,x,y,z){
      object.position.set(...position(x,y,z));object.rotation.y=f.yaw;scene.add(object);
      return object;
    }
    function contact(w,d) {
      shadow(f.x,f.z,Math.abs(c)*w+Math.abs(s)*d+.44,
        Math.abs(s)*w+Math.abs(c)*d+.36,f.y);
    }

    if(f.type==='locker'){
      contact(3.2,.75);
      part(0,.055,0,3.2,.11,.75,graphite);
      part(0,1.915,-.021,3.2,.27,.708,petrol);
      part(0,.943,-.348,3.12,1.7,.054,greyBlue);
      for(const x of [-1.57,1.57])part(x,.945,0,.06,1.67,.75,steel);
      for(const x of [-1.10,-.66,-.22,.22,.66,1.10])part(x,.945,-.01,.018,1.67,.67,steel);
      for(const y of [.111,.66,1.217,1.773])part(0,y,-.01,3.12,.018,.68,steel);
      part(0,.945,-.014,.43,1.66,.695,graphite);
      for(const [row,y] of rows.entries())for(const [col,x] of columns.entries()){
        if(doorNumber(row,col)===active)continue;
        part(x,y,front-.022,doorW,doorH,.042,enamel);
        part(x+.145,y-.004,.349,.023,.057,.028,graphite);
      }
      place(meshFrom(lockerFace),0,1.025,front+.001);
      const x=columns[2],y=rows[1];
      const hinge=place(new THREE.Group(),x-doorW/2,y,front);
      hinge.name='locker-door:'+f.id;
      const panel=new THREE.Mesh(doorPlate,enamel);
      panel.position.set(doorW/2,0,-.021);hinge.add(panel);
      const label=meshFrom(doorFace);label.position.set(doorW/2,0,.001);hinge.add(label);
      const handle=new THREE.Mesh(doorGrip,graphite);
      handle.position.set(doorW/2+.145,-.004,.015);hinge.add(handle);
      hinges.set(f.id,{hinge,yaw:f.yaw});
    }
    if(f.type==='vending'){
      contact(1.35,.85);
      part(0,.065,-.012,1.22,.13,.79,graphite);
      part(0,1.015,-.075,1.35,1.87,.70,warmWhite);
      part(0,1.225,.305,1.35,1.45,.065,warmWhite);
      part(0,.178,.315,1.35,.146,.14,enamel);
      for(const x of [-.57,.57])part(x,.386,.31,.21,.27,.16,enamel);
      for(const x of [-.648,.648])part(x,1.225,.372,.054,1.45,.106,enamel);
      part(0,1.918,.368,1.30,.064,.114,steel);
      place(meshFrom(vendingFace),0,1.226,.35);
      part(0,.386,.281,.94,.27,.014,inset);
      part(0,.265,.349,.96,.034,.152,steel);
      part(0,.524,.361,.97,.043,.128,graphite);
      part(.407,.792,.37,.19,.036,.045,steel);
      const bottle=place(new THREE.Group(),-.129,.338,.351);
      bottle.name='vended-drink:'+f.id;
      const horizontal=new THREE.Group();horizontal.rotation.z=-Math.PI/2;bottle.add(horizontal);
      horizontal.add(new THREE.Mesh(bottleShape,bottleBody));
      const sleeve=new THREE.Mesh(sleeveShape,bottleInk);
      sleeve.position.y=.116;horizontal.add(sleeve);
      const cap=new THREE.Mesh(capShape,bottleInk);
      cap.position.y=.252;horizontal.add(cap);
      bottle.visible=false;bottles.set(f.id,bottle);
    }
    if(f.type==='bench'){
      contact(2.6,.72);
      for(const x of [-.99,.99]){
        part(x,.029,0,.22,.058,.72,steel);
        part(x,.23,-.02,.11,.39,.11,graphite);
        part(x,.39,0,.19,.065,.55,steel);
        part(x,.65,-.29,.055,.45,.06,steel);
      }
      part(0,.36,-.025,2.36,.08,.08,graphite);
      for(const x of [-.865,0,.865]){
        for(const z of [-.155,.008,.17])part(x,.455,z,.81,.066,.148,oak);
        part(x,.666,-.256,.81,.106,.068,oak);
        part(x,.819,-.285,.81,.122,.073,oak);
      }
      for(const x of [-1.27,-.432,.432,1.27]){
        part(x,.517,.198,.06,.18,.054,steel);
        part(x,.595,-.012,.06,.055,.47,graphite);
        part(x,.535,-.222,.06,.15,.053,steel);
      }
    }
  }

  return {
    setLockerOpen(id,open){
      const door=hinges.get(id);
      if(door)door.hinge.rotation.y=door.yaw-(open?Math.PI*0.46:0);
    },
    setDrinkVisible(id,visible){
      const bottle=bottles.get(id);
      if(bottle)bottle.visible=Boolean(visible);
    }
  };
}
