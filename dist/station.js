// Distinct physical ticket lines. The negative/positive sides refer to the named axis.
// Machine positions, map markers, transfer boundaries and jump points all use this list.
export const operators = {
  jr: {name:'JR東日本', short:'JR', color:'#39724c'},
  odakyu: {name:'小田急線', short:'小田急', color:'#227b9b'},
  keio: {name:'京王線', short:'京王', color:'#a04170'},
  shared: {name:'京王新線・都営新宿線', short:'新線', color:'#548247'},
  oedo: {name:'都営大江戸線', short:'大江戸', color:'#9c4466'},
  metro: {name:'東京メトロ丸ノ内線', short:'丸ノ内', color:'#b74738'}
};

function gate(id, operator, name, floor, x, z, axis, negative, positive, toward, note='', oneWay=0) {
  return {id,operator,name,floor,x,z,axis,negative,positive,toward,note,oneWay};
}
export const ticketGates = [
  gate('jr-east','jr','東改札','B1',50,-14,'z','jr','public','東口・歌舞伎町方面'),
  gate('jr-west','jr','西改札','B1',-38,-14,'z','jr','public','東西自由通路・西口地下広場'),
  gate('jr-central-east','jr','中央東改札','B1',62,18,'x','jr','public','中央東口・東口地下広場'),
  gate('jr-central-west','jr','中央西改札','B1',-56,12,'z','public','jr','小田急側・西口地下広場','6:00〜終電'),
  gate('jr-keio-west','jr','JR中央西改札（京王口）','B1',-80,18,'x','public','jr','京王百貨店・京王モール方面'),
  gate('jr-odakyu-central','jr','小田急線のりかえ口（中央地下）','B1',-57,24,'z','jr','odakyu','JR中央地下通路 ↔ 小田急線','中央地下JR線連絡改札口'),
  gate('jr-keio-transfer','jr','京王線連絡口','B1',-73,24,'z','jr','keio','JR中央地下通路 ↔ 京王線','京王側はJR連絡口'),
  gate('jr-south','jr','南改札','2F',-18,74,'z','jr','public','南口・甲州街道'),
  gate('jr-southeast','jr','東南改札','2F',76,52,'x','jr','public','東南口・東南口広場方面'),
  gate('jr-odakyu-south','jr','小田急線のりかえ口（南口）','2F',-60,52,'x','odakyu','jr','JR南コンコース ↔ 小田急線','南口JR線連絡改札口'),
  gate('jr-koshu','jr','甲州街道改札','2F',-6,116,'z','public','jr','甲州街道・バスタ新宿方面'),
  gate('jr-new-south','jr','新南改札','2F',-24,144,'z','jr','public','新南口・サザンテラス方面'),
  gate('jr-miraina','jr','ミライナタワー改札','2F',80,136,'x','jr','public','ミライナタワー・NEWoMan方面'),
  gate('odakyu-basement','odakyu','西口地下改札','B1',-96,-2,'x','odakyu','public','西口地下広場'),
  gate('odakyu-ground','odakyu','西口地上改札','1F',-88,-12,'z','public','odakyu','地上ホーム・新宿西口方面'),
  gate('odakyu-south','odakyu','南口改札','2F',-84,74,'z','odakyu','public','小田急線南口・甲州街道'),
  gate('keio-west','keio','京王西口','B1',-130,-6,'z','public','keio','西口地下広場'),
  gate('keio-store','keio','京王百貨店口','B1',-114,4,'x','keio','public','京王百貨店方面'),
  gate('keio-lumine','keio','京王ルミネ口','B1',-128,40,'z','keio','public','ルミネ1方面','6:30〜22:00'),
  gate('keio-plaza','keio','広場口','B1',-148,4,'x','public','keio','西口広場方面','出場専用 · 初電〜22:00',-1),
  gate('keio-temporary','keio','臨時口','B1',-148,26,'x','public','keio','西口広場方面','出場専用 · 平日 7:10〜9:00',-1),
  gate('shared-new','shared','京王新線口','B1',-112,80,'x','keio','public','京王新線・都営新宿線 ↔ 南口方面'),
  gate('shared-shintoshin','shared','新都心口','B1',-148,80,'x','public','keio','新都心・都庁方面','6:45〜22:00'),
  gate('oedo-jr','oedo','JR新宿駅方面改札','B1',-100,80,'x','public','keio','JR新宿駅・京王新線口方面'),
  gate('oedo-minds','oedo','マインズタワー方面改札','B3',-88,152,'z','keio','public','A1・マインズタワー方面'),
  gate('metro-west','metro','西改札','B1',-69,-51,'z','metro','public','西口・西新宿方面'),
  gate('metro-east','metro','東改札','B1',53,-51,'z','metro','public','東口・新宿通り方面')
];

export const isTransfer = g => g.negative !== 'public' && g.positive !== 'public';
export function gatePoint(g, along=0, across=0) {
  return {x:g.x+(g.axis==='x'?along:across), z:g.z+(g.axis==='z'?along:across)};
}
export function gateApproach(g) {
  const side=g.oneWay ? -g.oneWay : g.positive==='public' ? 1 : -1;
  return {...gatePoint(g,side*3), floor:g.floor,
    yaw:g.axis==='x'?side*Math.PI/2:side===1?0:Math.PI};
}

export function room(id,floor,zone,name,x0,x1,z0,z1,kind='hall') {
  return {id,floor,zone,name,x0,x1,z0,z1,kind};
}
export const stationRegions = [
  // Unpaid routes around the west terminal and along the Marunouchi Line.
  room('west-arcade','B1','public','西口地下広場・京王口',-96,-80,-24,44),
  room('west-north','B1','public','京王西口方面通路',-158,-96,-20,-6),
  room('west-perimeter','B1','public','西口広場・新都心方面通路',-158,-148,-20,90),
  room('department','B1','public','京王百貨店方面通路',-114,-104,-6,44),
  room('lumine','B1','public','ルミネ方面通路',-158,-106,40,58),
  room('southwest-approach','B1','public','京王モール・南口方面',-158,-100,56,64),
  room('shared-lobby','B1','public','京王新線・大江戸線改札前',-112,-100,60,106),
  room('metro-walk','B1','public','丸ノ内線 東西地下通路',-96,80,-51,-43),
  room('metro-west-link','B1','public','西口地下広場・丸ノ内線方面',-94,-80,-44,-20),
  room('metro-east-link','B1','public','東口・丸ノ内線方面',64,80,-44,-18),
  room('metro-w-hall','B1','metro','丸ノ内線 西改札内',-78,-60,-65,-51),
  room('metro-e-hall','B1','metro','丸ノ内線 東改札内',44,62,-65,-51),
  room('metro-platform','B2','metro','丸ノ内線 1・2番線ホーム',-80,62,-72,-57,'rail'),
  // Gates between the JR, Odakyu and Keio paid areas.
  room('jr-north','B1','jr','JR北通路',-46,60,-32,-22),
  room('jr-west-bank','B1','jr','JR西改札内',-42,-34,-22,-14),
  room('west-bank-approach','B1','public','西改札前',-42,-34,-14,-8),
  room('jr-east-bank','B1','jr','JR東改札内',46,54,-22,-14),
  room('east-bank-approach','B1','public','東改札前',46,54,-14,-8),
  room('odakyu-jr','B1','odakyu','小田急線 中央地下連絡通路',-64,-50,24,56),
  room('odakyu-mid','B1','odakyu','小田急線 地下ホーム連絡通路',-104,-50,44,56),
  room('odakyu-lower','B1','odakyu','小田急線 地下ホーム',-104,-96,-10,56,'rail'),
  room('odakyu-upper','1F','odakyu','小田急線 地上ホーム',-106,-74,-12,65,'rail'),
  room('odakyu-south-hall','2F','odakyu','小田急線 南口コンコース',-99,-60,42,74),
  room('keio-jr','B1','keio','京王線 JR連絡口内',-80,-66,24,38),
  room('keio-main','B1','keio','京王線 改札内コンコース',-148,-114,-6,40),
  room('keio-platform','B2','keio','京王線 1〜3番線ホーム',-145,-115,-8,54,'rail'),
  room('keio-transfer-link','B2','keio','京王線 JR連絡通路',-145,-67,42,54),
  room('keio-inside-link','B2','keio','京王線・京王新線 連絡通路',-146,-130,54,86),
  // The two lines share an inside-fare connection at B4.
  room('new-line-hall','B1','keio','京王新線・都営新宿線 改札内',-148,-112,70,90),
  room('new-line-b2','B2','keio','京王新線・都営新宿線 連絡階',-146,-118,76,102),
  room('new-line-b3','B3','keio','京王新線・都営新宿線 中間階',-144,-120,52,82),
  room('toei-transfer','B4','keio','都営新宿線・大江戸線 連絡通路',-144,-84,84,108),
  room('shinjuku-platform','B5','keio','京王新線・都営新宿線 4・5番線ホーム',-150,-108,106,119,'rail'),
  room('oedo-north','B1','keio','大江戸線 JR新宿駅方面改札内',-100,-82,70,96),
  room('oedo-b2','B2','keio','大江戸線 北側連絡階',-96,-82,102,132),
  room('oedo-b3','B3','keio','大江戸線 マインズタワー改札内',-98,-80,86,152),
  room('oedo-b5','B5','keio','大江戸線 ホーム方面',-100,-78,116,140),
  room('oedo-b6','B6','keio','大江戸線 階段踊り場',-100,-76,138,160),
  room('oedo-platform','B7','keio','大江戸線 6・7番線ホーム',-94,-82,88,160,'rail'),
  room('minds-lobby','B3','public','マインズタワー方面 改札外',-98,-80,152,174),
  room('minds-b2','B2','public','A1方面 階段踊り場',-110,-80,176,190),
  room('minds-b1','B1','public','マインズタワー出口通路',-111,-87,154,174),
  // Streets, plazas and decks on the public side of the gates.
  room('kabukicho','1F','public','東口駅前広場・歌舞伎町方面',66,94,-60,-25,'outdoor'),
  room('west-ground','1F','public','西口地上広場',-118,-55,-42,-12,'outdoor'),
  room('west-street','1F','public','西口・南口方面歩道',-118,-108,-12,146,'outdoor'),
  room('minds-street','1F','public','マインズタワー方面・A1地上',-112,-72,128,152,'outdoor'),
  room('south-street','2F','public','南口・甲州街道歩道',-100,88,74,84,'outdoor'),
  room('southeast-deck','2F','public','東南口デッキ',76,88,42,84,'outdoor'),
  room('koshu-crossing','2F','public','甲州街道・横断歩道',82,88,84,114,'outdoor'),
  room('koshu-deck','2F','public','甲州街道改札前',-82,90,106,116,'outdoor'),
  room('new-south-deck','2F','public','新南口・サザンテラス',-54,90,144,154,'outdoor'),
  room('miraina-deck','2F','public','ミライナタワー改札前',80,90,116,144,'outdoor')
];

export const stationStairs = [
  ['east-street','B1','1F',70,-15,-29,'東口広場・歌舞伎町方面'],
  ['west-street','B1','1F',-58,-16,-30,'西口地下広場 ↔ 西口地上広場'],
  ['odakyu-west','B1','1F',-100,8,22,'小田急線 地下・地上ホーム'],
  ['odakyu-south','1F','2F',-84,28,42,'小田急線 地上ホーム ↔ 南口'],
  ['keio-jr','B2','B1',-73,47,33,'京王線ホーム ↔ JR連絡口'],
  ['keio-main','B2','B1',-132,22,8,'京王線ホーム ↔ 京王各改札'],
  ['metro-west','B2','B1',-68,-68,-54,'丸ノ内線ホーム ↔ 西改札'],
  ['metro-east','B2','B1',52,-68,-54,'丸ノ内線ホーム ↔ 東改札'],
  ['new-b2','B2','B1',-126,98,84,'京王新線口・新都心口方面'],
  ['new-b3','B3','B2',-136,60,74,'京王新線・都営新宿線 連絡階'],
  ['new-b4','B4','B3',-126,92,78,'京王新線・都営新宿線 連絡階'],
  ['new-b5','B5','B4',-136,112,98,'4・5番線 ↔ 大江戸線連絡通路'],
  ['oedo-b2','B2','B1',-90,106,92,'大江戸線 JR新宿駅方面改札'],
  ['oedo-b3','B3','B2',-88,142,128,'大江戸線 北側連絡階'],
  ['oedo-b4','B4','B3',-90,92,106,'大江戸線 マインズタワー方面改札'],
  ['oedo-b5','B5','B4',-88,122,108,'大江戸線 ↔ 新宿線 乗換通路'],
  ['oedo-b6','B6','B5',-94,144,130,'大江戸線 ホーム階段'],
  ['oedo-b7','B7','B6',-86,124,138,'大江戸線 6・7番線'],
  ['minds-b3','B3','B2',-90,166,180,'A1 マインズタワー方面'],
  ['minds-b2','B2','B1',-103,184,170,'A1 マインズタワー方面'],
  ['minds-b1','B1','1F',-94,161,147,'マインズタワー方面 地上出口'],
  ['south-public','1F','2F',-78,130,116,'南口方面歩道 ↔ 甲州街道']
];
