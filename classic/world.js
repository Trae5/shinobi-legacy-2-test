/* ============================================================
   Shinobi Legacy: Remastered — WORLD REMODEL (phase: anime villages)
   Adds per-village anime-identity set pieces + fills empty map space.
   Hook: window.__SL2world.onScene(game, {ground}) from buildScene.
   Pure addition on top of the existing world builder. No save changes.
   ============================================================ */
const WV = "w1";

function rng(seed){ let a = seed >>> 0; return function(){ a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const S = { on:false, game:null, scene:null, TH:null, grp:null, village:null, lastScene:null };

function harvest(g){
  const sc = g.scene; if(!sc) return false;
  let meshC=null, boxC=null, cylC=null, matC=null, grpC=null;
  sc.traverse(o=>{
    if(o.isMesh){
      if(!meshC) meshC=o.constructor;
      const gt=o.geometry&&o.geometry.type;
      if(!boxC&&gt==="BoxGeometry") boxC=o.geometry.constructor;
      if(!cylC&&gt==="CylinderGeometry") cylC=o.geometry.constructor;
      if(!matC&&o.material){ const m=Array.isArray(o.material)?o.material[0]:o.material; matC=m.constructor; }
    }
    if(!grpC&&o.isGroup&&o!==sc) grpC=o.constructor;
  });
  if(!meshC||!boxC||!matC){ return false; }
  S.TH={ Mesh:meshC, Box:boxC, Cyl:cylC||boxC, Mat:matC, Group:grpC||meshC };
  return true;
}
function mat(color, opts){ const M=S.TH.Mat; const m=new M({ color }); if(opts) Object.assign(m,opts); return m; }
function box(w,h,d,material,x,y,z,ry){ const T=S.TH; const mesh=new T.Mesh(new T.Box(w,h,d), material); mesh.position.set(x,y,z); if(ry)mesh.rotation.y=ry; return mesh; }
function cyl(rt,rb,h,seg,material,x,y,z){ const T=S.TH; const mesh=new T.Mesh(new T.Cyl(rt,rb,h,seg), material); mesh.position.set(x,y,z); return mesh; }

/* ---------- LEAF: red gates, hokage monument, lanterns, forest fill ---------- */
function leaf(g, ground, r){
  const grp=S.grp, mWood=mat(0x8a4a2b), mRed=mat(0xb03028), mRedD=mat(0x8a2420), mPlq=mat(0xe8e2d0), mStone=mat(0x8f8f96), mStoneD=mat(0x6d6d75), mRoof=mat(0x2e3238), mLeaf=mat(0x2f7a3a), mTrunk=mat(0x5b4632), mLant=mat(0xf0d060);
  /* big double gates N + S on the main street */
  for(const gz of [-38, 38]){
    const dy=ground(0,gz);
    for(const px of [-8, 8]){
      grp.add(box(2.2,16,2.2,mRed,px,dy+8,gz));
      grp.add(box(3,1.4,3,mRedD,px,dy+0.7,gz));
    }
    grp.add(box(22,1.6,2,mRed,-0+0,dy+14.5,gz));        /* top beam */
    grp.add(box(19,1.1,1.6,mRed,0,dy+11.5,gz));         /* mid beam */
    grp.add(box(5,3,0.6,mPlq,0,dy+16.8,gz));            /* name plaque */
    grp.add(box(6,9,0.5,mWood,-4,dy+4.5,gz));           /* door leaf L */
    grp.add(box(6,9,0.5,mWood,4,dy+4.5,gz));            /* door leaf R */
  }
  /* hokage monument: wide stepped cliff on the north rise */
  const mx=0, mz=150, my=ground(mx,mz);
  for(let i=0;i<4;i++){
    const w=104-i*8, h=9+i*2, d=26-i*3;
    grp.add(box(w,h,d,i%2?mStone:mStoneD, mx, my+h/2+i*1.5, mz-i*6));
  }
  /* 4 carved hokage faces on the cliff face (abstract relief profiles) */
  for(let f=0;f<4;f++){
    const fx=mx-36+f*24, fy=my+30+f*0.6, fz=mz-15.5;
    grp.add(box(10,12,2,mStone, fx,fy,fz));            /* face block proud of cliff */
    for(let s=-1;s<=1;s++) grp.add(box(3,6,1.5,mStone, fx+s*4, fy+8, fz-0.8)); /* hair spikes */
    grp.add(box(2.4,2.4,1.5,mStoneD, fx, fy+1, fz-1));   /* brow */
    grp.add(box(2,3,1.5,mStoneD, fx, fy-2, fz-1));       /* nose ridge */
    grp.add(box(6,1.6,1.5,mStoneD, fx, fy-5.5, fz-1));   /* chin */
  }
  /* hokage residence tower at the monument base */
  grp.add(box(10,22,10,mWood, mx, my+11, mz-38));
  grp.add(box(12,3,12,mRoof, mx, my+23.5, mz-38));
  /* street lanterns along the main street */
  for(let z=-30; z<=30; z+=12) for(const lx of [-5,5]){
    const ly=ground(lx,z);
    grp.add(cyl(0.3,0.4,4.5,6,mWood, lx, ly+2.2, z));
    grp.add(box(1.2,1.4,1.2,mLant, lx, ly+4.9, z));
  }
  /* forest fill north + east of the village core */
  for(let i=0;i<70;i++){
    const a=r()*Math.PI*2, rad=95+r()*90, tx=Math.cos(a)*rad, tz=Math.sin(a)*rad;
    if(Math.abs(tx)<70&&tz>-50&&tz<60) continue;
    if(Math.hypot(tx,tz)>185) continue;
    const ty=ground(tx,tz); if(ty>16) continue;
    grp.add(cyl(0.5,0.8,4+r()*3,5,mTrunk, tx, ty+2, tz));
    grp.add(cyl(0,2.6+r()*1.6,5+r()*3,6,mLeaf, tx, ty+6.5, tz));
  }
}

/* ---------- SAND: sandstone walls, dunes, palms, stalls ---------- */
function sand(g, ground, r){
  const grp=S.grp, mSand=mat(0xd9b26a), mSandD=mat(0xb28c4a), mWall=mat(0xc19a56), mTrunk=mat(0x7a5c34), mFrond=mat(0x4f7d3a), mCloth=mat(0xd8d2c0), mCrate=mat(0x9a7743);
  /* perimeter wall arcs with corner turrets */
  for(const [wx,wz,ry,len] of [[0,-110,0,150],[0,110,0,150],[-95,0,Math.PI/2,130],[95,0,Math.PI/2,130]]){
    grp.add(box(len,7,3.5,mWall, wx, ground(wx,wz)+3.5, wz, ry));
  }
  for(const [tx,tz] of [[-95,-110],[95,-110],[-95,110],[95,110]]){
    const ty=ground(tx,tz);
    grp.add(cyl(4.5,5.5,13,8,mWall, tx, ty+6.5, tz));
    grp.add(cyl(0,6,4,8,mSandD, tx, ty+15, tz));
  }
  /* dune mounds outside the walls */
  for(let i=0;i<26;i++){
    const a=r()*Math.PI*2, rad=115+r()*70, dx=Math.cos(a)*rad, dz=Math.sin(a)*rad;
    if(Math.hypot(dx,dz)>185) continue;
    const dy=ground(dx,dz), s=6+r()*10;
    const m=cyl(0.01, s, s*0.55, 7, mSand, dx, dy+s*0.22, dz);
    grp.add(m);
  }
  /* palms + market stalls */
  for(let i=0;i<18;i++){
    const a=r()*Math.PI*2, rad=60+r()*95, px=Math.cos(a)*rad, pz=Math.sin(a)*rad;
    const py=ground(px,pz);
    grp.add(cyl(0.35,0.6,6+r()*2,5,mTrunk, px, py+3, pz));
    for(let f=0;f<5;f++){ const fr=box(3.2,0.25,0.9,mFrond, px, py+6.4, pz, r()*Math.PI); fr.rotation.z=0.5; grp.add(fr); }
  }
  for(let i=0;i<10;i++){
    const sx=-60+r()*120, sz=-40+r()*80, sy=ground(sx,sz);
    if(Math.abs(sx)<40&&Math.abs(sz)<30) continue;
    grp.add(box(3,2.2,2,mCrate, sx, sy+1.1, sz));
    grp.add(box(4,0.3,3,mCloth, sx, sy+3.4, sz));
    for(const px of [-1.6,1.6]) grp.add(cyl(0.15,0.15,3.4,4,mTrunk, sx+px, sy+1.7, sz));
  }
}

/* ---------- MIST: water pools, stilt huts, reeds ---------- */
function mist(g, ground, r){
  const grp=S.grp, mWater=mat(0x2e6e8a,{transparent:true,opacity:0.85}), mStilt=mat(0x5d4a34), mHut=mat(0x746058), mRoof=mat(0x37414a), mReed=mat(0x5e7d4a);
  for(let i=0;i<9;i++){
    const a=r()*Math.PI*2, rad=70+r()*95, wx=Math.cos(a)*rad, wz=Math.sin(a)*rad;
    if(Math.hypot(wx,wz)>180) continue;
    const wy=ground(wx,wz)-0.4;
    grp.add(cyl(9+r()*7, 9+r()*7, 0.7, 14, mWater, wx, wy, wz));
    const hx=wx+3, hz=wz+2, hy=ground(hx,hz);
    grp.add(box(4.5,3.5,4.5,mHut, hx, hy+3.2, hz));
    grp.add(cyl(0,3.4,2.2,4,mRoof, hx, hy+6, hz));
    for(const [ox,oz] of [[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]]) grp.add(cyl(0.25,0.25,3,4,mStilt, hx+ox, hy+1.5, hz+oz));
  }
  for(let i=0;i<40;i++){
    const a=r()*Math.PI*2, rad=80+r()*100, rx=Math.cos(a)*rad, rz=Math.sin(a)*rad;
    if(Math.hypot(rx,rz)>185) continue;
    const ry=ground(rx,rz);
    grp.add(cyl(0,0.5,2+r()*1.5,4,mReed, rx, ry+1, rz));
  }
}

/* ---------- CLOUD: mountain spires + platforms ---------- */
function cloud(g, ground, r){
  const grp=S.grp, mRock=mat(0x7d879a), mSnow=mat(0xe8ecf2), mWood=mat(0x6b5138), mPlat=mat(0x8a6a45);
  for(let i=0;i<14;i++){
    const a=r()*Math.PI*2, rad=115+r()*65, cx=Math.cos(a)*rad, cz=Math.sin(a)*rad;
    if(Math.hypot(cx,cz)>185) continue;
    const cy=ground(cx,cz), h=18+r()*20, cw=4+r()*3;
    grp.add(cyl(0.4, cw, h, 6, mRock, cx, cy+h*0.45, cz));
    grp.add(cyl(0.4, cw*0.5, h*0.3, 6, mSnow, cx, cy+h*0.95, cz));
  }
  for(let i=0;i<7;i++){
    const a=r()*Math.PI*2, rad=90+r()*70, px=Math.cos(a)*rad, pz=Math.sin(a)*rad;
    const py=ground(px,pz);
    grp.add(box(6,0.5,6,mPlat, px, py+5, pz));
    for(const [ox,oz] of [[-2.4,-2.4],[2.4,-2.4],[-2.4,2.4],[2.4,2.4]]) grp.add(cyl(0.3,0.35,5,4,mWood, px+ox, py+2.5, pz+oz));
  }
}

/* ---------- STONE: canyon pillars + boulders ---------- */
function stone(g, ground, r){
  const grp=S.grp, mRock=mat(0x9a7d55), mRockD=mat(0x7a5f3d), mBoulder=mat(0x857052);
  for(let i=0;i<18;i++){
    const a=r()*Math.PI*2, rad=100+r()*75, cx=Math.cos(a)*rad, cz=Math.sin(a)*rad;
    if(Math.hypot(cx,cz)>185) continue;
    const cy=ground(cx,cz), h=14+r()*18;
    grp.add(box(5+r()*4, h, 5+r()*4, i%2?mRock:mRockD, cx, cy+h*0.45, cz, r()*Math.PI));
  }
  for(let i=0;i<26;i++){
    const a=r()*Math.PI*2, rad=60+r()*115, bx=Math.cos(a)*rad, bz=Math.sin(a)*rad;
    if(Math.hypot(bx,bz)>185) continue;
    const by=ground(bx,bz), s=1.5+r()*3;
    grp.add(cyl(0.01,s,s*0.8,6,mBoulder, bx, by+s*0.35, bz));
  }
}

function onScene(g, env){
  try{
    if(!g||!g.scene) return;
    if(g===S.game&&g.scene===S.lastScene&&S.grp) return; /* already remodeled this scene */
    S.game=g; S.scene=g.scene; S.lastScene=g.scene;
    if(!harvest(g)) return;
    const vid=g.villageId||"leaf", ground=env&&env.ground?env.ground:(x,z)=>0;
    const seed={leaf:11,sand:22,mist:33,cloud:44,stone:55}[vid]||7;
    const r=rng(seed*7919+13);
    if(S.grp){ try{S.grp.parent&&S.grp.parent.remove(S.grp);}catch(e){} S.grp=null; }
    const T=S.TH; S.grp=new T.Group(); S.grp.name="sl2-world-remodel"; g.scene.add(S.grp);
    const low=g.quality==="low";
    if(vid==="leaf") leaf(g,ground,r);
    else if(vid==="sand") sand(g,ground,r);
    else if(vid==="mist") mist(g,ground,r);
    else if(vid==="cloud") cloud(g,ground,r);
    else if(vid==="stone") stone(g,ground,r);
    if(low&&S.grp) S.grp.visible=true; /* keep simple for now; counts are modest */
    console.log("[world] remodel "+vid+" kids "+(S.grp?S.grp.children.length:0));
  }catch(e){ console.log("[world] onScene error "+(e&&e.message)); }
}

export const __sl2world = { onScene, state:S };
export default { onScene, state:S };
