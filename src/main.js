import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAGAZINE, circleHitsBox, reloadAmmo, formatTime } from './rules.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch { $('start').disabled = true; $('start').textContent = 'WebGL対応ブラウザが必要です'; throw new Error('WebGL is required'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a5b7b2');
scene.fog = new THREE.FogExp2('#a5b7b2', .012);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .06, 130);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight('#e2eeed', '#766b56', 2.3));
const sun = new THREE.DirectionalLight('#ffebcb', 3.5);
sun.position.set(-18, 30, 16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 90 });
sun.shadow.normalBias = .035; scene.add(sun);
const materials = {};
function mat(color, roughness = .9, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  return materials[key] ||= new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
const solids = [], obstacles = [], enemies = [], effects = [];
function box(x, y, z, w, h, d, color, collision = false, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  mesh.position.set(x, y, z); mesh.castShadow = h > .3; mesh.receiveShadow = true; parent.add(mesh);
  if (collision) { obstacles.push({ x, z, w, d }); solids.push(mesh); }
  return mesh;
}
function label(text, x, y, z, width, height, rotation = 0, color = '#d7ded0', bg = '#213f42') {
  const c = document.createElement('canvas'); c.width = 768; c.height = 256;
  const ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = color; ctx.font = 'bold 100px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }));
  mesh.position.set(x,y,z); mesh.rotation.y = rotation; scene.add(mesh); return mesh;
}
// A compact arena with real cover, long lanes, and an open capture yard.
box(0,-.22,0,58,.4,58,'#a7a18b');
for (let i = -26; i <= 26; i += 4) {
  box(i,.002,0,.025,.01,56,'#8e8c7a'); box(0,.003,i,56,.01,.025,'#8e8c7a');
}
box(0,3,-28,58,6,1,'#b4ad92',true); box(-28,3,0,1,6,58,'#b7b199',true);
box(28,3,0,1,6,58,'#b7b199',true); box(0,3,28,58,6,1,'#b7b199',true);
function building(x,z,w,d,h,color) {
  box(x,h/2,z,w,h,d,color,true);
  box(x,h+.15,z,w+.45,.3,d+.45,'#485857');
  box(x,.35,z+d/2+.025,w,.7,.12,'#7c8276');
  for(let i=-w/2+1.2;i<w/2;i+=2.2) {
    box(x+i,h-.8,z+d/2+.03,1.4,.8,.08,'#314e52');
    box(x+i,h-.8,z+d/2+.09,.035,.8,.04,'#a2afa5');
  }
  box(x-w/2+.05,h+.7,z,.1,1.4,d,'#5e7069');
  box(x+w/2-.05,h+.7,z,.1,1.4,d,'#5e7069');
  box(x,h+1.4,z+d/2,w,.08,.08,'#5e7069');
  box(x,h+1.4,z-d/2,w,.08,.08,'#5e7069');
}
building(-19,-16,14,13,8,'#c2b699');
building(19,-18,14,15,6.5,'#c8bea6');
building(-20,15,12,12,5.5,'#b7af96');
building(21,14,10,12,8,'#c4b8a1');
label('SECTOR 07',-19,4,-9.46,9,2,0,'#eee5d2','#667974');
label('OUTPOST',19,4,-10.46,10,2.3,0,'#e1dac7','#334f50');
label('A',0,3,-27.46,3.5,3.5,0,'#e9dfca','#a55945');
box(0,.02,-12,8,.025,8,'#a99776');
for(const [x,z,w,d] of [[-4,-12,.12,8],[4,-12,.12,8],[0,-16,8,.12],[0,-8,8,.12]]) box(x,.04,z,w,.025,d,'#dac697');
function container(x,z,w,d,color) {
  box(x,1.7,z,w,3.4,d,color,true);
  box(x,3.45,z,w+.08,.12,d+.08,'#718b7f');
  for(let i=-w/2+.3;i<w/2;i+=.42){box(x+i,1.7,z+d/2+.03,.06,3.1,.05,'#507773');box(x+i,1.7,z-d/2-.03,.06,3.1,.05,'#507773');}
  for(let i=-d/2+.3;i<d/2;i+=.45){box(x+w/2+.03,1.7,z+i,.05,3.1,.06,'#507773');box(x-w/2-.03,1.7,z+i,.05,3.1,.06,'#507773');}
  box(x,1.7,z+d/2+.08,.04,3.1,.05,'#b7bd9b');
  label('R / 07',x,2.3,z+d/2+.1,Math.min(w-1,3),.75);
}
container(-7,0,5,8,'#3f6966'); container(9,-7,5,7,'#446c67');
container(6,14,7,4,'#6d7e6a');
function crate(x,z,w=2,h=2) {
  box(x,h/2,z,w,h,w,'#a39a7b',true);
  for(const a of [-1,1]){box(x+a*(w/2-.12),h/2,z+w/2+.015,.16,h,.06,'#666f60');box(x,h/2,z+a*(w/2-.12),w,.12,.12,'#666f60');}
  box(x,h+.03,z,w,.07,w,'#b4aa89');
}
crate(-3,9,2.5,1.8); crate(-.3,9,2.5,1.8); crate(-1.6,9,2.2,3.5);
crate(17,2,2.5,2); crate(-14,-4,2,2); crate(2,-19,2.4,1.8);
box(-12,1.2,20,3,2.4,1.5,'#677a71',true);
for(const x of [-26,26]) {
  for(let z=-24;z<28;z+=7){box(x,6.8,z,.12,2,.12,'#455c5a');}
  box(x,7.7,0,.07,.07,54,'#455c5a');
}
for(let i=0;i<16;i++) {
  const x=(i%2?1:-1)*(29+Math.sin(i*4)*9),z=-34-i*2;
  box(x,3+i%4,z,6,6+i%4*2,6,'#8b9a91');
}
// Batch static architecture by material to keep the arena inexpensive to draw.
scene.updateMatrixWorld(true);
const batches=new Map();
for(const mesh of [...scene.children]){
  if(!mesh.isMesh||mesh.geometry.type!=='BoxGeometry')continue;
  const key=mesh.material.uuid;
  if(!batches.has(key))batches.set(key,{material:mesh.material,geometry:[],meshes:[]});
  const batch=batches.get(key);
  batch.geometry.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));batch.meshes.push(mesh);
}
for(const batch of batches.values()){
  const merged=new THREE.Mesh(mergeGeometries(batch.geometry),batch.material);
  merged.castShadow=true;merged.receiveShadow=true;scene.add(merged);
  for(const mesh of batch.meshes){scene.remove(mesh);if(!solids.includes(mesh))mesh.geometry.dispose();}
  for(const geometry of batch.geometry)geometry.dispose();
}
// First-person rifle. It stays in camera space and has animated recoil and reload.
const gun = new THREE.Group(); camera.add(gun);
gun.position.set(.29,-.3,-.53);gun.scale.setScalar(.8);
box(0,0,0,.12,.14,.48,'#273b40',false,gun);
box(0,.075,-.02,.105,.045,.42,'#42565a',false,gun);
box(0,.012,-.36,.048,.055,.3,'#1c292f',false,gun);
box(0,.015,-.51,.07,.07,.08,'#374447',false,gun);
box(.002,-.13,.03,.07,.2,.13,'#1b2a30',false,gun).rotation.x=.18;
box(0,-.14,.16,.07,.2,.085,'#3e504c',false,gun).rotation.x=-.22;
box(0,-.01,.32,.1,.12,.23,'#344a48',false,gun);
box(0,.11,-.12,.04,.06,.04,'#172a30',false,gun);
box(0,.11,.1,.065,.06,.08,'#172a30',false,gun);
box(.063,.015,.06,.006,.025,.16,'#fa7366',false,gun);
box(-.075,-.14,-.09,.095,.15,.26,'#617a70',false,gun).rotation.z=-.25;
box(.045,-.25,.19,.10,.21,.1,'#617a70',false,gun);
const muzzle = new THREE.PointLight('#ffb75f',0,4); muzzle.position.set(0,.01,-.6); gun.add(muzzle);
const flash = new THREE.Mesh(new THREE.ConeGeometry(.055,.24,5),new THREE.MeshBasicMaterial({color:'#ffe1a1',transparent:true,opacity:.9}));
flash.rotation.x=-Math.PI/2; flash.position.set(0,.01,-.64); flash.visible=false; gun.add(flash);
gun.visible=false;

const state={mode:'menu',round:1,wins:0,losses:0,hp:100,ammo:24,reserve:120,reloading:0,time:90,kills:0,totalKills:0,shots:0,hits:0,pulseCD:0,healCD:0,reveal:0};
const player=new THREE.Vector3(0,1.7,22);
let yaw=0,pitch=0,shooting=false,aiming=false,lastShot=-100,recoil=0,elapsed=0,roundElapsed=0;
let toastTime=0,hitTime=0,damageTime=0,feed=[];
const keys=new Set(),ray=new THREE.Raycaster(),clock=new THREE.Clock();
let audio, sound=true;
function tone(freq,length=.08,type='sine',volume=.04,slide=0) {
  if(!sound)return;
  try {
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);
    if(slide)o.frequency.exponentialRampToValueAtTime(slide,audio.currentTime+length);
    g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);
    o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);
  }catch{}
}
function toast(text){$('toast').textContent=text;toastTime=2.5;$('toast').style.opacity=1;}
function updateHUD(){
  for(const id of ['wins','losses','health','ammo','reserve'])$(id).textContent=id==='health'?Math.ceil(state.hp):state[id];
  $('health-fill').style.width=`${state.hp}%`; $('health-fill').style.background=state.hp<30?'#fa5d60':'#a9d5c1';
  $('round-label').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;
  $('timer').textContent=formatTime(state.time);
  $('reload-label').textContent=state.reloading>0?'RELOADING…':state.ammo===0?'R を押してリロード':'FULL AUTO · R リロード';
  for(const [id,cd,label] of [['pulse',state.pulseCD,'索敵パルス'],['heal',state.healCD,'応急回復']]){
    $(`${id}-label`).textContent=cd>0?`${Math.ceil(cd)}s`:label;
    $(`${id}-ability`).classList.toggle('cooldown',cd>0);
  }
}
function makeEnemy(x,z,index){
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  const body=box(0,1.16,0,.65,.7,.36,'#6d4542',false,group);
  const vest=box(0,1.2,.21,.53,.52,.10,'#3b4140',false,group);
  const head=box(0,1.8,0,.37,.4,.38,'#b1856b',false,group);
  box(0,1.95,0,.42,.16,.42,'#454b46',false,group);
  box(0,1.82,.198,.30,.08,.018,'#ff625d',false,group);
  const legs=[];
  for(const a of [-1,1]){
    legs.push(box(a*.19,.43,0,.23,.75,.28,'#303e3d',false,group));
    box(a*.4,1.16,.14,.18,.56,.22,'#716550',false,group).rotation.x=-.6;
  }
  box(.22,1.25,.5,.11,.12,.7,'#283737',false,group);
  const glow=new THREE.Mesh(new THREE.RingGeometry(.45,.49,24),new THREE.MeshBasicMaterial({color:'#fa5d60',side:THREE.DoubleSide,transparent:true,opacity:.8,depthTest:false}));
  glow.position.y=2.45;glow.visible=false;group.add(glow);
  const enemy={group,head,body,parts:[body,vest,head],legs,hp:100,cooldown:1.2+index*.3,index,glow,dead:false};
  group.traverse(o=>{if(o.isMesh)o.userData.enemy=enemy;});
  enemies.push(enemy);
}
function collides(x,z,r=.4){return obstacles.some(b=>circleHitsBox(x,z,r,b));}
function move(position,dx,dz,r){if(!collides(position.x+dx,position.z,r))position.x+=dx;if(!collides(position.x,position.z+dz,r))position.z+=dz;}
// Grid navigation lets hostiles find routes around containers and buildings.
const navStep=2, navMin=-26, navSize=27;
function routeTo(from,to){
  const cell=v=>Math.max(0,Math.min(navSize-1,Math.round((v-navMin)/navStep)));
  const sx=cell(from.x),sz=cell(from.z),gx=cell(to.x),gz=cell(to.z);
  const start=sz*navSize+sx,goal=gz*navSize+gx,queue=[start],prev=new Map([[start,null]]);
  for(let n=0;n<queue.length;n++){
    const current=queue[n];if(current===goal)break;
    const cx=current%navSize,cz=Math.floor(current/navSize);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx,nz=cz+dz,key=nz*navSize+nx;
      if(nx<0||nz<0||nx>=navSize||nz>=navSize||prev.has(key)||collides(navMin+nx*navStep,navMin+nz*navStep,.55))continue;
      prev.set(key,current);queue.push(key);
    }
  }
  if(!prev.has(goal))return [];
  const path=[];let cursor=goal;
  while(cursor!==start){path.unshift({x:navMin+(cursor%navSize)*navStep,z:navMin+Math.floor(cursor/navSize)*navStep});cursor=prev.get(cursor);}
  return path;
}
function clearEnemies(){for(const e of enemies)scene.remove(e.group);enemies.length=0;}
function resetRound(){
  clearEnemies();player.set(0,1.7,22);yaw=0;pitch=0;
  Object.assign(state,{hp:100,ammo:MAGAZINE,reserve:120,reloading:0,time:90,kills:0,pulseCD:0,healCD:0,reveal:0});
  roundElapsed=0;lastShot=-100;feed=[];$('killfeed').replaceChildren();
  const spawns=[[-3,-15],[4,-22],[16,-5],[-15,3],[-8,-9],[14,-17]];
  spawns.slice(0,3+Math.min(state.round-1,3)).forEach(([x,z],i)=>makeEnemy(x,z,i));
  updateHUD();$('callout').style.opacity=1;
}
async function lockAndPlay(){
  try {
    await canvas.requestPointerLock();
    if(document.pointerLockElement===canvas){state.mode='playing';$('pause').hidden=true;}
  }catch{toast('画面のクリックでマウス操作を許可してください');}
}
function begin(){
  if(innerWidth<650){toast('このゲームはマウスとキーボードで操作します');}
  Object.assign(state,{round:1,wins:0,losses:0,totalKills:0,shots:0,hits:0});
  $('menu').hidden=true;$('hud').hidden=false;$('result').hidden=true;
  document.body.classList.add('playing');gun.visible=true;resetRound();state.mode='paused';$('pause').hidden=false;
  tone(340,.2,'sine',.04,680);lockAndPlay();
}
function finishRound(win,reason){
  if(state.mode!=='playing')return;
  state.mode='result';shooting=false;aiming=false;keys.clear();
  if(win)state.wins++;else state.losses++;
  const finished=state.wins>=3||state.losses>=3;
  $('result-eyebrow').textContent=finished?'OPERATION COMPLETE':`ROUND ${String(state.round).padStart(2,'0')} COMPLETE`;
  $('result-title').textContent=finished?(win?'VICTORY':'MISSION FAILED'):(win?'AREA SECURED':'ROUND LOST');
  $('result-title').style.color=win?'#a9d5c1':'#fa5d60';
  $('result-copy').textContent=reason+(finished?(win?' 作戦完了。見事な判断だった。':' 装備を整えて、もう一度挑もう。'):' 次のラウンドでは敵が増援される。');
  $('result-stats').textContent=`${state.wins} : ${state.losses}  /  ${state.totalKills} ELIMINATIONS  /  ${state.shots?Math.round(state.hits/state.shots*100):0}% ACCURACY`;
  $('next').innerHTML=finished?'もう一度プレイ <span>↗</span>':'次のラウンド <span>↗</span>';
  $('result').hidden=false;document.exitPointerLock();updateHUD();tone(win?660:180,.4,'triangle',.07,win?990:80);
}
function menu(){state.mode='menu';shooting=false;keys.clear();clearEnemies();gun.visible=false;document.exitPointerLock();document.body.classList.remove('playing');for(const id of ['hud','pause','result'])$(id).hidden=true;$('menu').hidden=false;}
function reload(){if(state.reloading||state.ammo===MAGAZINE||state.reserve===0)return;state.reloading=1.7;tone(220,.12,'triangle',.03);updateHUD();}
function ability(kind){
  if(kind==='pulse'){
    if(state.pulseCD>0)return;state.pulseCD=18;state.reveal=5;tone(440,.4,'sine',.06,1000);toast('索敵パルス：5秒間、ミニマップに敵の位置を表示');
  }else{
    if(state.healCD>0)return;
    if(state.hp>=100){toast('HPはすでに最大です');return;}
    state.healCD=25;state.hp=Math.min(100,state.hp+45);tone(520,.3,'sine',.04,820);toast('応急回復：HP +45');
  }updateHUD();
}
function tracer(start,end,color){
  const geometry=new THREE.BufferGeometry().setFromPoints([start,end]);
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}));scene.add(line);effects.push({mesh:line,life:.09,max:.09});
}
function shoot(){
  if(state.reloading||elapsed-lastShot<.115)return;
  if(state.ammo<=0){reload();return;}
  lastShot=elapsed;state.ammo--;state.shots++;recoil=.07;muzzle.intensity=3;flash.visible=true;
  tone(130,.085,'sawtooth',.07,35);
  const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const spread=aiming?.002:.009;
  dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.normalize();
  ray.set(camera.position,dir);ray.far=80;
  const targets=enemies.filter(e=>!e.dead).flatMap(e=>e.group.children.filter(c=>c.isMesh&&c!==e.glow));
  const hit=ray.intersectObjects([...solids,...targets],false)[0];
  const end=hit?hit.point:camera.position.clone().addScaledVector(dir,75);
  const start=new THREE.Vector3(0,.01,-.64);gun.localToWorld(start);tracer(start,end,'#ffdc98');
  if(hit?.object.userData.enemy){
    const e=hit.object.userData.enemy;
    const headshot=hit.point.y>1.58;
    e.hp-=headshot?100:34;state.hits++;hitTime=.15;$('hitmarker').style.opacity=1;tone(headshot?1100:800,.07,'sine',.035);
    if(e.hp<=0){
      e.dead=true;e.group.visible=false;state.kills++;state.totalKills++;
      const text=`YOU  ${headshot?'HEADSHOT':'V-24'}  ▸  HOSTILE ${String(e.index+1).padStart(2,'0')}`;
      feed.push({text,life:5});
      $('killfeed').replaceChildren(...feed.slice(-4).map(f=>{const div=document.createElement('div');div.textContent=f.text;return div;}));
      if(enemies.every(e=>e.dead))finishRound(true,'敵部隊をすべて排除した。');
    }
  }
  updateHUD();
}
function visibleTo(from,to){
  const direction=to.clone().sub(from),distance=direction.length();ray.set(from,direction.normalize());ray.far=distance;
  return ray.intersectObjects(solids,false).length===0;
}
const radar=$('radar').getContext('2d');
function drawRadar(){
  const size=170,scale=2.6,center=85;
  radar.clearRect(0,0,size,size);radar.fillStyle='#102128cc';radar.fillRect(0,0,size,size);
  radar.strokeStyle='#afc9ba16';radar.lineWidth=1;
  for(let i=7;i<size;i+=26){radar.beginPath();radar.moveTo(i,0);radar.lineTo(i,size);radar.moveTo(0,i);radar.lineTo(size,i);radar.stroke();}
  radar.fillStyle='#667e7166';radar.strokeStyle='#abc7b24d';
  for(const b of obstacles){radar.fillRect(center+(b.x-b.w/2)*scale,center+(b.z-b.d/2)*scale,b.w*scale,b.d*scale);radar.strokeRect(center+(b.x-b.w/2)*scale,center+(b.z-b.d/2)*scale,b.w*scale,b.d*scale);}
  radar.strokeStyle='#d5bc7d';radar.strokeRect(center-4*scale,center-16*scale,8*scale,8*scale);radar.font='9px monospace';radar.fillStyle='#d5bc7d';radar.fillText('A',center-3,center-11*scale);
  for(const e of enemies){
    if(e.dead)continue;
    if(state.reveal>0||e.group.position.distanceTo(player)<8){
      radar.fillStyle='#fa6668';radar.beginPath();radar.arc(center+e.group.position.x*scale,center+e.group.position.z*scale,3,0,Math.PI*2);radar.fill();
    }
  }
  radar.save();radar.translate(center+player.x*scale,center+player.z*scale);radar.rotate(-yaw);
  radar.fillStyle='#b8efda';radar.beginPath();radar.moveTo(0,-5);radar.lineTo(4,4);radar.lineTo(0,2);radar.lineTo(-4,4);radar.closePath();radar.fill();radar.restore();
}
function updateGame(dt){
  state.time-=dt;roundElapsed+=dt;
  if(state.time<=0){finishRound(false,'時間切れ。エリアを確保できなかった。');return;}
  state.pulseCD=Math.max(0,state.pulseCD-dt);state.healCD=Math.max(0,state.healCD-dt);state.reveal=Math.max(0,state.reveal-dt);
  if(state.reloading>0){
    state.reloading-=dt;
    if(state.reloading<=0){Object.assign(state,reloadAmmo(state.ammo,state.reserve));tone(420,.1,'triangle',.03);state.reloading=0;}
  }
  const dx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),dz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
  const moving=dx!==0||dz!==0, speed=(keys.has('ShiftLeft')&&!aiming?7:aiming?2.7:4.5)*dt/(dx&&dz?Math.SQRT2:1);
  move(player,(dx*Math.cos(yaw)+dz*Math.sin(yaw))*speed,(-dx*Math.sin(yaw)+dz*Math.cos(yaw))*speed,.38);
  camera.position.copy(player);camera.position.y+=moving?Math.sin(elapsed*12)*.035:Math.sin(elapsed*2)*.008;
  camera.rotation.set(pitch+recoil*.25,yaw,0,'YXZ');
  const targetFov=aiming?53:75;camera.fov=THREE.MathUtils.damp(camera.fov,targetFov,12,dt);camera.updateProjectionMatrix();
  recoil=THREE.MathUtils.damp(recoil,0,18,dt);
  gun.position.set(THREE.MathUtils.damp(gun.position.x,aiming?.03:.29,15,dt),-.3+(moving?Math.sin(elapsed*12)*.012:0),-.53+recoil);
  gun.rotation.set(state.reloading>0?-.5*Math.sin(state.reloading/1.7*Math.PI):0,0,state.reloading>0?-.45*Math.sin(state.reloading/1.7*Math.PI):0);
  if(shooting&&!keys.has('ShiftLeft'))shoot();
  for(const e of enemies){
    if(e.dead)continue;
    const pos=e.group.position,dist=Math.hypot(player.x-pos.x,player.z-pos.z);
    e.group.rotation.y=Math.atan2(player.x-pos.x,player.z-pos.z);
    const origin=pos.clone().add(new THREE.Vector3(0,1.5,0));
    const sight=visibleTo(origin,player);
    if(dist>6.5||!sight){
      e.repath=(e.repath||0)-dt;
      if(!sight&&e.repath<=0){e.path=routeTo(pos,player);e.repath=1.5;}
      let target=player;
      if(!sight&&e.path?.length){
        while(e.path.length&&Math.hypot(e.path[0].x-pos.x,e.path[0].z-pos.z)<.3)e.path.shift();
        if(e.path.length)target=e.path[0];
      }
      const angle=Math.atan2(target.x-pos.x,target.z-pos.z);
      const speed=(1.25+state.round*.12)*dt;
      move(pos,Math.sin(angle)*speed,Math.cos(angle)*speed,.48);
      e.legs[0].rotation.x=Math.sin(elapsed*8)*.35;e.legs[1].rotation.x=-Math.sin(elapsed*8)*.35;
    }
    e.glow.visible=state.reveal>0;e.glow.quaternion.copy(camera.quaternion);
    e.cooldown-=dt;
    if(sight&&dist<35&&e.cooldown<=0&&roundElapsed>2){
      e.cooldown=1.0+Math.random()*.7;
      const end=player.clone();end.y-=.2;
      tracer(origin,end,'#ff6d5e');tone(90,.09,'sawtooth',.025,40);
      if(Math.random()<Math.max(.28,.78-dist*.012)){
        state.hp=Math.max(0,state.hp-(8+state.round*2));damageTime=.3;$('damage').style.opacity=.8;
        if(state.hp<=0){finishRound(false,'敵の攻撃により戦闘不能になった。');break;}
      }
    }
  }
  $('callout').style.opacity=roundElapsed<4?1:0;
  updateHUD();drawRadar();
}
$('start').onclick=begin;
$('resume').onclick=lockAndPlay;
$('back').onclick=menu;$('result-back').onclick=menu;
$('next').onclick=()=>{if(state.wins>=3||state.losses>=3)begin();else{state.round++;resetRound();$('result').hidden=true;state.mode='paused';$('pause').hidden=false;lockAndPlay();}};
$('sound').onclick=()=>{sound=!sound;$('sound').innerHTML=`SOUND <span>${sound?'ON':'OFF'}</span>`;if(sound)tone(600,.1);};
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement!==canvas&&state.mode==='playing'){
    state.mode='paused';$('pause').hidden=false;shooting=false;aiming=false;keys.clear();
  }
});
document.addEventListener('mousemove',e=>{
  if(state.mode!=='playing'||document.pointerLockElement!==canvas)return;
  yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.3,1.3);
});
document.addEventListener('keydown',e=>{
  if(state.mode!=='playing')return;
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyR')reload();if(e.code==='KeyQ')ability('pulse');if(e.code==='KeyE')ability('heal');
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousedown',e=>{if(state.mode!=='playing')return;if(e.button===0)shooting=true;if(e.button===2)aiming=true;});
document.addEventListener('mouseup',e=>{if(e.button===0)shooting=false;if(e.button===2)aiming=false;});
document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{keys.clear();shooting=false;aiming=false;if(state.mode==='playing')document.exitPointerLock();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
function frame(){
  requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
  if(state.mode==='menu'){
    camera.fov=62;camera.updateProjectionMatrix();camera.position.set(16+Math.sin(elapsed*.05)*2,9,23);camera.lookAt(-1,2,-7);
  }else if(state.mode==='playing')updateGame(dt);
  if(elapsed-lastShot>.045){flash.visible=false;muzzle.intensity=0;}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}
  if(hitTime>0){hitTime-=dt;if(hitTime<=0)$('hitmarker').style.opacity=0;}
  if(damageTime>0){damageTime-=dt;$('damage').style.opacity=Math.max(0,damageTime*2.5);}
  for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.life-=dt;f.mesh.material.opacity=Math.max(0,f.life/f.max);if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();effects.splice(i,1);}}
  renderer.render(scene,camera);
}
frame();
