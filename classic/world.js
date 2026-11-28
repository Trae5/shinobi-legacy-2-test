/* ============================================================
   Shinobi Legacy: Remastered — WORLD REMODEL (w3: anime villages, full)
   Per-village anime-identity set pieces + dense fill. Hook:
   window.__SL2world.onScene(game, {ground}) from buildScene.
   Pure addition on top of the existing world builder. No save changes.
   ============================================================ */
const WV = "w3";
console.log("[world] module up "+WV);

function rng(seed){ let a = seed >>> 0; return function(){ a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const S = { on:false, game:null, scene:null, TH:null, grp:null, village:null, lastScene:null };

function harvest(g){
  const sc = g.scene; if(!sc) return false;
  let meshC=null, boxC=null, cylC=null, sphC=null, matC=null, grpC=null;
  sc.traverse(o=>{
    if(o.isMesh){
      if(!meshC) meshC=o.constructor;
      const gt=o.geometry&&o.geometry.type;
      if(!boxC&&gt==="BoxGeometry") boxC=o.geometry.constructor;
      if(!cylC&&gt==="CylinderGeometry") cylC=o.geometry.constructor;
      if(!sphC&&gt==="SphereGeometry") sphC=o.geometry.constructor;
      if(!matC&&o.material){ const m=Array.isArray(o.material)?o.material[0]:o.material; matC=m.constructor; }
    }
    if(!grpC&&o.isGroup&&o!==sc) grpC=o.constructor;
  });
  if(!meshC||!boxC||!matC){ return false; }
  S.TH={ Mesh:meshC, Box:boxC, Cyl:cylC||boxC, Sph:sphC||cylC||boxC, Mat:matC, Group:grpC||meshC };
  return true;
}
function mat(color, opts){ const M=S.TH.Mat; const m=new M({ color }); if(opts) Object.assign(m,opts); return m; }
function box(w,h,d,material,x,y,z,ry){ const T=S.TH; const mesh=new T.Mesh(new T.Box(w,h,d), material); mesh.position.set(x,y,z); if(ry)mesh.rotation.y=ry; return mesh; }
function cyl(rt,rb,h,seg,material,x,y,z){ const T=S.TH; const mesh=new T.Mesh(new T.Cyl(rt,rb,h,seg), material); mesh.position.set(x,y,z); return mesh; }
function sph(r,material,x,y,z){ const T=S.TH; const mesh=new T.Mesh(new T.Sph(r,10,8), material); mesh.position.set(x,y,z); return mesh; }

/* POI keep-clear so new props never block the board, shop, gates, arena... */
const POIS=[[0,0],[8,1.5],[-10,1.5],[0,24],[24,6],[0,-95],[-18,-82],[24,-112],[0,-168],[56,6],[0,-38],[0,38],[-72,0]];
function nearPoi(x,z,rad){ for(const p of POIS){ if(Math.hypot(x-p[0],z-p[1])<rad) return true; } return false; }

/* shared anime-village house: red tile roof + plaster walls, optional awning */
function house(grp, m, x, z, gy, w, d, h, ry, wallM, roofM, awnM){
  grp.add(box(w,h,d,wallM,x,gy+h/2,z,ry));
  const ov=Math.max(1.2,w*0.18);
  grp.add(box(w+ov*2,0.9,d+ov*2,roofM,x,gy+h+0.6,z,ry));
  grp.add(box(w*0.8,1.1,d*0.8,roofM,x,gy+h+1.8,z,ry));
  if(awnM){ grp.add(box(w*0.9,0.25,d*0.55,awnM,x,gy+h*0.72,z+(d/2+0.6)*(ry?0:1),ry)); }
  grp.add(box(1.1,2.2,0.2,m.door||wallM,x-Math.sin(ry||0)*(d/2+0.15),gy+1.1,z-Math.cos(ry||0)*(d/2+0.15)));
}

/* ================= LEAF (Konoha) ================= */
function leaf(g, ground, r){
  const grp=S.grp, mWood=mat(0x8a4a2b), mRed=mat(0xb03028), mRedD=mat(0x8a2420), mPlq=mat(0xe8e2d0),
        mStone=mat(0x8f8f96), mStoneD=mat(0x6d6d75), mRoof=mat(0x9c342c), mWall=mat(0xe6ddc8),
        mLeaf=mat(0x2f7a3a), mLeaf2=mat(0x3f9448), mTrunk=mat(0x5b4632), mLant=mat(0xf0d060),
        mGreen=mat(0x2e6e46), mAw=mat(0xd05a3a), mWater=mat(0x3d7ea6,{transparent:true,opacity:0.85});
  const m={door:mWood};

  /* big double gates N + S on the main street */
  for(const gz of [-38, 38]){
    const dy=ground(0,gz);
    for(const px of [-8, 8]){
      grp.add(box(2.2,16,2.2,mRed,px,dy+8,gz));
      grp.add(box(3,1.4,3,mRedD,px,dy+0.7,gz));
    }
    grp.add(box(22,1.6,2,mRed,0,dy+14.5,gz));
    grp.add(box(19,1.1,1.6,mRed,0,dy+11.5,gz));
    grp.add(box(5,3,0.6,mPlq,0,dy+16.8,gz));
    grp.add(box(6,9,0.5,mWood,-4,dy+4.5,gz));
    grp.add(box(6,9,0.5,mWood,4,dy+4.5,gz));
  }
  /* hokage monument: wide stepped cliff on the north rise */
  const mx=0, mz=150, my=ground(mx,mz);
  for(let i=0;i<4;i++){
    const w=104-i*8, h=9+i*2, d=26-i*3;
    grp.add(box(w,h,d,i%2?mStone:mStoneD, mx, my+h/2+i*1.5, mz-i*6));
  }
  for(let f=0;f<4;f++){
    const fx=mx-36+f*24, fy=my+30+f*0.6, fz=mz-15.5;
    grp.add(box(10,12,2,mStone, fx,fy,fz));
    for(let s=-1;s<=1;s++) grp.add(box(3,6,1.5,mStone, fx+s*4, fy+8, fz-0.8));
    grp.add(box(2.4,2.4,1.5,mStoneD, fx, fy+1, fz-1));
    grp.add(box(2,3,1.5,mStoneD, fx, fy-2, fz-1));
    grp.add(box(6,1.6,1.5,mStoneD, fx, fy-5.5, fz-1));
  }
  /* hokage residence: tiered red-roof tower at the monument base */
  const rx=mx, rz=mz-38, ry0=ground(rx,rz);
  grp.add(box(11,10,11,mWall,rx,ry0+5,rz));
  grp.add(box(14,1.2,14,mRed,rx,ry0+10.6,rz));
  grp.add(box(9,8,9,mWall,rx,ry0+15,rz));
  grp.add(box(12,1.2,12,mRed,rx,ry0+19.6,rz));
  grp.add(box(6.5,7,6.5,mRed,rx,ry0+23.5,rz));
  grp.add(box(9,1,9,mRedD,rx,ry0+27.4,rz));
  /* dense red-roof districts filling the village bowl */
  for(let i=0;i<46;i++){
    const a=r()*Math.PI*2, rad=22+r()*58, hx=Math.cos(a)*rad, hz=Math.sin(a)*rad;
    if(Math.abs(hx)<7&&Math.abs(hz)<60) continue;           /* main street clear */
    if(nearPoi(hx,hz,14)) continue;
    const hy=ground(hx,hz); if(hy>14) continue;
    const w=5+r()*4, d=5+r()*4, h=3.5+r()*3, rr=r();
    house(grp,m,hx,hz,hy,w,d,h,rr*Math.PI,mWall, rr<0.8?mRoof:mGreen, rr<0.3?mAw:null);
  }
  /* Ichiraku-style ramen stand by the plaza */
  const ax=12, az=-14, ay=ground(ax,az);
  grp.add(box(4.5,3,3.5,mWood,ax,ay+1.5,az,0.5));
  grp.add(box(5.4,0.35,4.4,mAw,ax,ay+3.3,az,0.5));
  grp.add(box(3.6,0.5,1.2,mWood,ax,ay+1.5,az+2.4,0.5));
  /* training field: three log posts + target near the training POI */
  for(let t=0;t<3;t++){
    const tx=24+t*3-3, tz=6+t*2, ty=ground(tx,tz);
    grp.add(cyl(0.5,0.6,3.2,6,mTrunk,tx,ty+1.6,tz));
    grp.add(cyl(2.2,2.2,0.5,10,mWood,tx,ty+2.6,tz));
  }
  /* park pond with stones SE of the core */
  const px=30, pz=-30, py=ground(px,pz);
  grp.add(cyl(6,6.4,0.5,12,mWater,px,py+0.3,pz));
  for(let k=0;k<7;k++) grp.add(cyl(0.5+r()*0.5,0.6+r()*0.5,0.9,5,mStone,px+Math.cos(k*0.9)*7,py+0.5,pz+Math.sin(k*0.9)*7));
  /* street lanterns along the main street */
  for(let z=-30; z<=30; z+=12) for(const lx of [-5,5]){
    const ly=ground(lx,z);
    grp.add(cyl(0.3,0.4,4.5,6,mWood, lx, ly+2.2, z));
    grp.add(box(1.2,1.4,1.2,mLant, lx, ly+4.9, z));
  }
  /* forest fill: the village sits in a sea of trees */
  for(let i=0;i<90;i++){
    const a=r()*Math.PI*2, rad=95+r()*90, tx=Math.cos(a)*rad, tz=Math.sin(a)*rad;
    if(Math.abs(tx)<70&&tz>-50&&tz<60) continue;
    if(Math.hypot(tx,tz)>185) continue;
    const ty=ground(tx,tz); if(ty>16) continue;
    grp.add(cyl(0.5,0.8,4+r()*3,5,mTrunk, tx, ty+2, tz));
    grp.add(cyl(0,2.6+r()*1.6,5+r()*3,6,r()<0.5?mLeaf:mLeaf2, tx, ty+6.5, tz));
  }
}

/* ================= SAND (Suna) ================= */
function sand(g, ground, r){
  const grp=S.grp, mSand=mat(0xd9b26a), mSandD=mat(0xb28c4a), mWall=mat(0xc19a56), mWallD=mat(0xa37e42),
        mTrunk=mat(0x7a5c34), mFrond=mat(0x4f7d3a), mCloth=mat(0xd8d2c0), mCrate=mat(0x9a7743),
        mGold=mat(0xd9a441), mRed=mat(0xa8342a), mWater=mat(0x3d7ea6,{transparent:true,opacity:0.85});
  const m={door:mWallD};
  /* perimeter wall arcs with corner turrets */
  for(const [wx,wz,ry,len] of [[0,-110,0,150],[0,110,0,150],[-95,0,Math.PI/2,130],[95,0,Math.PI/2,130]]){
    grp.add(box(len,7,3.5,mWall, wx, ground(wx,wz)+3.5, wz, ry));
  }
  for(const [tx,tz] of [[-95,-110],[95,-110],[-95,110],[95,110]]){
    const ty=ground(tx,tz);
    grp.add(cyl(4.5,5.5,13,8,mWall, tx, ty+6.5, tz));
    grp.add(cyl(0,6,4,8,mSandD, tx, ty+15, tz));
  }
  /* kazekage tower: tiered sandstone spire with gold dome, center-north */
  const kx=0, kz=64, ky=ground(kx,kz);
  grp.add(box(12,14,12,mWall,kx,ky+7,kz));
  grp.add(box(14,1.2,14,mWallD,kx,ky+14.4,kz));
  grp.add(box(9,11,9,mWall,kx,ky+20,kz));
  grp.add(box(11,1.2,11,mWallD,kx,ky+26,kz));
  grp.add(cyl(0.01,4.5,7,10,mGold,kx,ky+32.5,kz));
  for(let s=0;s<3;s++) grp.add(box(1.2,2,1.2,mSandD,kx-5+s*5,ky+9+s*8,kz-6.2));
  /* domed sandstone districts */
  for(let i=0;i<40;i++){
    const a=r()*Math.PI*2, rad=20+r()*62, hx=Math.cos(a)*rad, hz=Math.sin(a)*rad;
    if(Math.abs(hx)<7&&Math.abs(hz)<60) continue;
    if(nearPoi(hx,hz,14)) continue;
    const hy=ground(hx,hz); if(hy>12) continue;
    const w=4+r()*3.5, h=3+r()*2.5, dome=h*0.55;
    grp.add(cyl(w*0.55,w*0.62,h,7,i%3?mWall:mWallD,hx,hy+h/2,hz));
    grp.add(cyl(0.01,w*0.62,dome,7,i%2?mSandD:mWall,hx,hy+h+dome*0.4,hz));
    grp.add(box(1,2,0.25,mWallD,hx,hy+1.2,hz+w*0.62+0.1));
  }
  /* bazaar: two rows of stalls with striped cloth */
  for(let b=0;b<14;b++){
    const sx=(b%2?-26:26)+ (r()*8-4), sz=-30+b*4.5, sy=ground(sx,sz);
    if(nearPoi(sx,sz,10)) continue;
    grp.add(box(3.4,2.4,2.2,mCrate, sx, sy+1.2, sz));
    grp.add(box(4.4,0.3,3.2,r()<0.5?mCloth:mRed, sx, sy+3.6, sz));
    for(const px of [-1.7,1.7]) grp.add(cyl(0.14,0.14,3.6,4,mTrunk, sx+px, sy+1.8, sz));
  }
  /* oasis pond + palm cluster west */
  const ox=-46, oz=18, oy=ground(ox,oz);
  grp.add(cyl(7,7.4,0.5,12,mWater,ox,oy+0.3,oz));
  for(let p=0;p<9;p++){
    const px=ox+Math.cos(p*0.7)*11, pz=oz+Math.sin(p*0.7)*11, py=ground(px,pz);
    grp.add(cyl(0.35,0.6,6+r()*2,5,mTrunk, px, py+3, pz));
    for(let f=0;f<5;f++){ const fr=box(3.2,0.25,0.9,mFrond, px, py+6.4, pz, r()*Math.PI); fr.rotation.z=0.5; grp.add(fr); }
  }
  /* red banners along the main street */
  for(let z=-50; z<=50; z+=17) for(const bx of [-12,12]){
    const by=ground(bx,z);
    grp.add(cyl(0.2,0.25,7,4,mTrunk,bx,by+3.5,z));
    grp.add(box(2.2,3.2,0.1,mRed,bx+1,by+5.2,z));
  }
  /* dune mounds + palms outside the walls */
  for(let i=0;i<30;i++){
    const a=r()*Math.PI*2, rad=115+r()*70, dx=Math.cos(a)*rad, dz=Math.sin(a)*rad;
    if(Math.hypot(dx,dz)>185) continue;
    const dy=ground(dx,dz), s=6+r()*10;
    grp.add(cyl(0.01, s, s*0.55, 7, mSand, dx, dy+s*0.22, dz));
  }
  for(let i=0;i<14;i++){
    const a=r()*Math.PI*2, rad=60+r()*100, px=Math.cos(a)*rad, pz=Math.sin(a)*rad;
    if(Math.hypot(px,pz)>185||nearPoi(px,pz,12)) continue;
    const py=ground(px,pz);
    grp.add(cyl(0.35,0.6,6+r()*2,5,mTrunk, px, py+3, pz));
    for(let f=0;f<5;f++){ const fr=box(3.2,0.25,0.9,mFrond, px, py+6.4, pz, r()*Math.PI); fr.rotation.z=0.5; grp.add(fr); }
  }
}

/* ================= MIST (Kiri) ================= */
function mist(g, ground, r){
  const grp=S.grp, mWater=mat(0x2e6e8a,{transparent:true,opacity:0.85}), mWaterD=mat(0x27607c,{transparent:true,opacity:0.9}),
        mStilt=mat(0x5d4a34), mHut=mat(0x746058), mHutB=mat(0x5e6e74), mRoof=mat(0x37414a), mReed=mat(0x5e7d4a),
        mFog=mat(0xdfe8ee,{transparent:true,opacity:0.13,depthWrite:false}), mPlank=mat(0x6a5540), mLant=mat(0xd8e6ee);
  /* big central lake south of the core */
  const lx=0, lz=-120, ly=ground(lx,lz)-0.35;
  grp.add(cyl(52,54,0.6,20,mWaterD,lx,ly,lz));
  /* long wooden pier across the lake to a stilt row */
  for(let s=0;s<22;s++){
    const pz=lz+48-s*4.6, py=ground(0,pz);
    grp.add(box(3,0.4,4.6,mPlank,0,py+0.9,pz));
    if(s%3===0){ for(const ox of [-1.3,1.3]) grp.add(cyl(0.25,0.3,3.2,5,mStilt,ox,py-0.4,pz)); }
    if(s%4===2){ grp.add(cyl(0.16,0.2,2.6,4,mStilt,1.6,py+2.4,pz)); grp.add(box(0.7,0.9,0.7,mLant,1.6,py+3.9,pz)); }
  }
  /* stilt house rows on the shoreline ring */
  for(let i=0;i<26;i++){
    const a=r()*Math.PI*2, rad=62+r()*34, hx=Math.cos(a)*rad, hz=Math.sin(a)*rad;
    if(Math.hypot(hx,hz)>185||nearPoi(hx,hz,16)) continue;
    const hy=ground(hx,hz);
    grp.add(box(4.5,3.5,4.5,r()<0.6?mHut:mHutB, hx, hy+3.2, hz));
    grp.add(cyl(0,3.4,2.2,4,mRoof, hx, hy+6, hz));
    for(const [ox,oz] of [[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]]) grp.add(cyl(0.25,0.25,3,4,mStilt, hx+ox, hy+1.5, hz+oz));
    if(i%3===0) grp.add(box(2.5,0.35,1.4,mPlank,hx,hy+1.4,hz+3.4));
  }
  /* small water pools + reeds further out */
  for(let i=0;i<9;i++){
    const a=r()*Math.PI*2, rad=105+r()*70, wx=Math.cos(a)*rad, wz=Math.sin(a)*rad;
    if(Math.hypot(wx,wz)>180) continue;
    const wy=ground(wx,wz)-0.4;
    grp.add(cyl(9+r()*7, 9+r()*7, 0.7, 14, mWater, wx, wy, wz));
  }
  for(let i=0;i<44;i++){
    const a=r()*Math.PI*2, rad=80+r()*100, rx=Math.cos(a)*rad, rz=Math.sin(a)*rad;
    if(Math.hypot(rx,rz)>185) continue;
    const ry=ground(rx,rz);
    grp.add(cyl(0,0.5,2+r()*1.5,4,mReed, rx, ry+1, rz));
  }
  /* drifting fog banks */
  for(let i=0;i<10;i++){
    const a=r()*Math.PI*2, rad=40+r()*120, fx=Math.cos(a)*rad, fz=Math.sin(a)*rad;
    const fy=ground(fx,fz);
    grp.add(cyl(5+r()*4,5+r()*4,2.4+r()*2,10,mFog,fx,fy+2.2,fz));
  }
  /* beached rowboats */
  for(let b=0;b<5;b++){
    const a=r()*Math.PI*2, rad=70+r()*70, bx=Math.cos(a)*rad, bz=Math.sin(a)*rad;
    if(nearPoi(bx,bz,12)) continue;
    const by=ground(bx,bz);
    grp.add(box(4.5,0.9,1.8,mPlank,bx,by+0.5,bz,r()*Math.PI));
    grp.add(box(1.2,0.8,1.4,mStilt,bx,by+1.1,bz,0));
  }
}

/* ================= CLOUD (Kumo) ================= */
function cloud(g, ground, r){
  const grp=S.grp, mRock=mat(0x7d879a), mSnow=mat(0xe8ecf2), mWood=mat(0x6b5138), mPlat=mat(0x8a6a45),
        mWhite=mat(0xe9e4d8), mGold=mat(0xd9a441), mPuff=mat(0xf2f6fa,{transparent:true,opacity:0.55,depthWrite:false}),
        mRoof=mat(0x3b4656), mRope=mat(0x8a6f4a);
  const m={door:mWood};
  /* tall mountain spires with snow caps */
  const tops=[];
  for(let i=0;i<16;i++){
    const a=r()*Math.PI*2, rad=110+r()*70, cx=Math.cos(a)*rad, cz=Math.sin(a)*rad;
    if(Math.hypot(cx,cz)>185) continue;
    const cy=ground(cx,cz), h=18+r()*22, cw=4+r()*3;
    grp.add(cyl(0.4, cw, h, 6, mRock, cx, cy+h*0.45, cz));
    grp.add(cyl(0.4, cw*0.5, h*0.3, 6, mSnow, cx, cy+h*0.95, cz));
    if(h>24) tops.push([cx,cz,cy+h]);
  }
  /* Kumo towers: white with gold trim, clustered near the core */
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*2, rad=34+r()*30, tx=Math.cos(a)*rad, tz=Math.sin(a)*rad;
    if(nearPoi(tx,tz,14)) continue;
    const ty=ground(tx,tz), h=12+r()*8;
    grp.add(box(5,h,5,mWhite,tx,ty+h/2,tz));
    grp.add(box(6.2,0.9,6.2,mGold,tx,ty+h+0.6,tz));
    grp.add(cyl(0.01,2.6,3.5,6,mGold,tx,ty+h+2.8,tz));
    grp.add(box(1,2,0.25,mGold,tx,ty+2,tz+2.6));
  }
  /* stilt platforms + rope bridges between neighbors */
  const plats=[];
  for(let i=0;i<9;i++){
    const a=(i/9)*Math.PI*2+0.4, rad=64+r()*44, px=Math.cos(a)*rad, pz=Math.sin(a)*rad;
    if(Math.hypot(px,pz)>175||nearPoi(px,pz,16)) continue;
    const py=ground(px,pz);
    grp.add(box(7,0.6,7,mPlat, px, py+5, pz));
    for(const [ox,oz] of [[-2.8,-2.8],[2.8,-2.8],[-2.8,2.8],[2.8,2.8]]) grp.add(cyl(0.3,0.35,5,4,mWood, px+ox, py+2.5, pz+oz));
    plats.push([px,pz,py+5]);
  }
  for(let b=0;b<plats.length-1;b++){
    const [x1,z1,y1]=plats[b], [x2,z2,y2]=plats[b+1];
    const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz); if(len>60||len<12) continue;
    const ang=Math.atan2(dx,dz), my=(y1+y2)/2, mx=(x1+x2)/2, mz=(z1+z2)/2;
    grp.add(box(1.4,0.25,len,mPlank,mx,my-0.6,mz,ang));
    for(const s of [-2.6,2.6]){
      const ox=Math.cos(ang)*s, oz=-Math.sin(ang)*s;
      grp.add(box(0.18,0.18,len,mRope,mx+ox,my+1.1,mz+oz,ang));
      const steps=Math.max(2,Math.round(len/9));
      for(let k=1;k<steps;k++){ const t=k/steps; grp.add(box(0.18,2.1,0.18,mRope,x1+dx*t+ox,my+0.1,mz+dz*t+oz,0)); }
    }
  }
  /* cloud puffs drifting low */
  for(let i=0;i<9;i++){
    const a=r()*Math.PI*2, rad=50+r()*120, cx=Math.cos(a)*rad, cz=Math.sin(a)*rad;
    const cy=ground(cx,cz);
    grp.add(sph(4+r()*4,mPuff,cx,cy+9+r()*7,cz));
    grp.add(sph(2.5+r()*2.5,mPuff,cx+5,cy+8+r()*6,cz+3));
  }
  /* peak cabins on the tallest spires */
  for(const [px,pz,py] of tops.slice(0,4)){
    grp.add(box(3.4,2.6,3.4,mWhite,px,py+0.6,pz));
    grp.add(cyl(0,2.6,1.8,4,mRoof,px,py+2.8,pz));
  }
}

/* ================= STONE (Iwa) ================= */
function stone(g, ground, r){
  const grp=S.grp, mRock=mat(0x9a7d55), mRockD=mat(0x7a5f3d), mBoulder=mat(0x857052),
        mWall=mat(0x8f7448), mRoof=mat(0x5c4a30), mWood=mat(0x6b4f33), mGold=mat(0xc2913f);
  const m={door:mWood};
  /* canyon pillars + boulders (kept) */
  for(let i=0;i<20;i++){
    const a=r()*Math.PI*2, rad=100+r()*75, cx=Math.cos(a)*rad, cz=Math.sin(a)*rad;
    if(Math.hypot(cx,cz)>185) continue;
    const cy=ground(cx,cz), h=14+r()*18;
    grp.add(box(5+r()*4, h, 5+r()*4, i%2?mRock:mRockD, cx, cy+h*0.45, cz, r()*Math.PI));
  }
  for(let i=0;i<28;i++){
    const a=r()*Math.PI*2, rad=60+r()*115, bx=Math.cos(a)*rad, bz=Math.sin(a)*rad;
    if(Math.hypot(bx,bz)>185) continue;
    const by=ground(bx,bz), s=1.5+r()*3;
    grp.add(cyl(0.01,s,s*0.8,6,mBoulder, bx, by+s*0.35, bz));
  }
  /* stone monument cliff with carved faces, north */
  const mx=0, mz=140, my=ground(mx,mz);
  for(let i=0;i<3;i++){
    const w=92-i*8, h=8+i*2, d=22-i*3;
    grp.add(box(w,h,d,i%2?mRock:mRockD, mx, my+h/2+i*1.4, mz-i*5));
  }
  for(let f=0;f<3;f++){
    const fx=mx-26+f*26, fy=my+22+f*0.5, fz=mz-12;
    grp.add(box(9,11,2,mRock,fx,fy,fz));
    grp.add(box(2,2.4,1.4,mRockD,fx,fy+1,fz-1));
    grp.add(box(1.8,2.6,1.4,mRockD,fx,fy-2,fz-1));
    grp.add(box(5,1.4,1.4,mRockD,fx,fy-5,fz-1));
  }
  /* earth-style dome districts: squat rock houses with mossy roofs */
  for(let i=0;i<34;i++){
    const a=r()*Math.PI*2, rad=20+r()*62, hx=Math.cos(a)*rad, hz=Math.sin(a)*rad;
    if(Math.abs(hx)<7&&Math.abs(hz)<60) continue;
    if(nearPoi(hx,hz,14)) continue;
    const hy=ground(hx,hz); if(hy>12) continue;
    const w=4.5+r()*3.5, h=3+r()*2;
    grp.add(box(w,h,w,i%3?mWall:mRockD,hx,hy+h/2,hz,r()*Math.PI));
    grp.add(cyl(0.01,w*0.72,h*0.5,6,mRoof,hx,hy+h+h*0.2,hz));
    grp.add(box(1,2,0.25,mWood,hx,hy+1.1,hz+w/2+0.12));
  }
  /* quarry terrace + scaffold west */
  const qx=-56, qz=-30, qy=ground(qx,qz);
  for(let t=0;t<3;t++){
    grp.add(cyl(10-t*3,12-t*3,1.4,12,mRockD,qx,qy+0.8+t*1.2,qz));
  }
  for(const [ox,oz] of [[-3,-3],[3,-3],[-3,3],[3,3]]) grp.add(cyl(0.3,0.35,6,4,mWood,qx+ox,qy+4,qz+oz));
  grp.add(box(7,0.5,7,mWood,qx,qy+7,qz));
  /* ore carts on a rail loop */
  for(let c=0;c<4;c++){
    const a=c*1.6+0.5, cx2=qx+Math.cos(a)*16, cz2=qz+Math.sin(a)*16, cy2=ground(cx2,cz2);
    grp.add(box(2,1.2,1.6,mWood,cx2,cy+0.9,cz2,a));
    grp.add(box(1.6,0.5,1.2,mBoulder,cx2,cy+1.7,cz2,a));
  }
  /* stone gate arches on the main street */
  for(const gz of [-36,36]){
    const dy=ground(0,gz);
    grp.add(box(2,9,2,mRockD,-5,dy+4.5,gz));
    grp.add(box(2,9,2,mRockD,5,dy+4.5,gz));
    grp.add(box(14,1.4,2.4,mGold,0,dy+9.8,gz));
  }
}

function onScene(g, env){
  try{
    if(!g||!g.scene){ console.log("[world] hook: no game/scene"); return; }
    if(g===S.game&&g.scene===S.lastScene&&S.grp) return;
    S.game=g; S.scene=g.scene; S.lastScene=g.scene;
    if(!harvest(g)){ console.log("[world] harvest failed"); return; }
    const vid=g.villageId||"leaf", ground=env&&env.ground?env.ground:(x,z)=>0;
    const seed={leaf:11,sand:22,mist:33,cloud:44,stone:55}[vid]||7;
    const r=rng(seed*7919+13);
    if(S.grp){ try{S.grp.parent&&S.grp.parent.remove(S.grp);}catch(e){} S.grp=null; }
    const T=S.TH; S.grp=new T.Group(); S.grp.name="sl2-world-remodel"; g.scene.add(S.grp);
    if(vid==="leaf") leaf(g,ground,r);
    else if(vid==="sand") sand(g,ground,r);
    else if(vid==="mist") mist(g,ground,r);
    else if(vid==="cloud") cloud(g,ground,r);
    else if(vid==="stone") stone(g,ground,r);
    console.log("[world] remodel "+vid+" kids "+(S.grp?S.grp.children.length:0));
  }catch(e){ console.log("[world] onScene error "+(e&&e.message)); }
}

export const __sl2world = { onScene, state:S };
export default { onScene, state:S };
