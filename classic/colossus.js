/* ============================================================
   Shinobi Legacy: Remastered — SECRET COLOSSUS (non-canon)
   A fully piloted giant mech hidden behind a sealed cliff-face
   hangar. Increment 1: exterior, hangar discovery, pilot mount,
   mech movement, rocket punch. Zero touches to saves/progression.
   ============================================================ */
import { hh, toast } from "./phase1.js?v=p1135";

const CS = "c1";
/* hangar site: leaf outskirts, south field (tweak after eyeballing) */
const SITE = { x: -30, z: -150, yaw: 0.35 };

const S = {
  on:false, scene:null, game:null, root:null, mech:null, parts:{},
  door:null, doorT:0, discovered:false, piloting:false,
  yaw:SITE.yaw, keys:{}, cd:0, cdMax:6, fly:null, raf:0,
  prevInput:null, playerMesh:null, hud:null, prompt:null, t:0,
  TH:null, lastScene:null, eWait:false
};

/* ---------- harvest THREE classes from the live scene ---------- */
function harvest(g0){
  const g = g0 || (window.SL && window.SL.game); if(!g || !g.scene) return false;
  const sc = g.scene;
  let meshC=null, boxC=null, sphC=null, cylC=null, matC=null, grpC=null, lightC=null;
  sc.traverse(o=>{
    if(o.isMesh){
      if(!meshC) meshC=o.constructor;
      const gt=o.geometry&&o.geometry.type;
      if(!boxC&&gt==="BoxGeometry") boxC=o.geometry.constructor;
      if(!sphC&&gt==="SphereGeometry") sphC=o.geometry.constructor;
      if(!cylC&&gt==="CylinderGeometry") cylC=o.geometry.constructor;
      if(!matC&&o.material){ const m=Array.isArray(o.material)?o.material[0]:o.material; matC=m.constructor; }
    }
    if(!grpC&&o.isGroup&&o!==sc) grpC=o.constructor;
    if(!lightC&&o.isPointLight) lightC=o.constructor;
  });
  if(!meshC||!boxC||!matC){ console.log("[colossus] harvest missing classes"); return false; }
  S.TH = { Mesh:meshC, Box:boxC, Sphere:sphC||boxC, Cyl:cylC||boxC, Mat:matC, Group:grpC||meshC, Light:lightC||null, scene:sc };
  S.scene = sc; S.game = g;
  return true;
}
function mat(color, opts){ const M=S.TH.Mat; const m=new M({ color: color }); if(opts) Object.assign(m, opts); return m; }
function glowMat(color, intensity){
  const M=S.TH.Mat; const m=new M({ color: color });
  try { m.emissive = new m.color.constructor(color); m.emissiveIntensity = intensity==null?1.6:intensity; } catch(e){}
  return m;
}
function box(w,h,d,x,y,z,material,parent){
  const M=S.TH; const g=new M.Box(w,h,d); const mesh=new M.Mesh(g, material);
  mesh.position.set(x,y,z); (parent||S.mech).add(mesh); return mesh;
}

/* ---------- build the mech ---------- */
function buildMech(x,z,yaw,gy){
  const T=S.TH, grp=new T.Group(); grp.position.set(x,gy||0,z); grp.rotation.y=yaw; S.mech=grp; S.parts={}; (S.allMechs=S.allMechs||[]).push(grp);
  const armor=mat(0x2b2f38), armor2=mat(0x3a3f4c), crimson=mat(0x7d1f2a), teal=glowMat(0x2ee8c8,1.8), dark=mat(0x14161c);
  const P=S.parts;
  /* legs */
  for(const side of [-1,1]){
    box(7,2.4,10, side*6,1.2,0, dark, grp);                     /* foot */
    box(5,15,5,  side*6,10,0,  armor, grp);                     /* shin */
    box(4.2,1.1,4.2, side*6,5.5,1.2, teal, grp);                /* knee seam */
    box(6,14,6,  side*6,24.5,0, armor2, grp);                   /* thigh */
  }
  /* hips + torso */
  box(15,7,9, 0,33,0, crimson, grp);
  box(17,16,10, 0,45,0, armor, grp);
  box(11,9,1.4, 0,46,5.2, armor2, grp);                          /* chest plate */
  box(3.2,3.2,1.2, 0,45,6.1, teal, grp);                         /* reactor core */
  box(18,.9,.9, 0,51.5,4.6, teal, grp);                          /* collar seam */
  /* head */
  box(7.5,6.5,7.5, 0,56.5,0, armor2, grp);
  box(6.2,1.3,.8, 0,57.2,3.9, teal, grp);                        /* visor slit */
  box(2.6,2.2,2.2, 0,60.5,-.6, crimson, grp);                    /* crest */
  /* arms: right arm (x>0) is the rocket-punch arm */
  const mkArm=(side,rocket)=>{
    const sh=new T.Group(); sh.position.set(side*11.5,49,0); grp.add(sh);
    box(5.5,5.5,5.5,0,0,0, crimson, sh);                          /* pauldron */
    const up=new T.Mesh(new T.Box(4.4,11,4.4), armor); up.position.set(side*1.2,-8,0); sh.add(up);
    const fore=new T.Group(); fore.position.set(side*1.2,-15.5,0); sh.add(fore);
    box(3.8,10,3.8,0,-3,0, armor2, fore);
    box(1,.9,1,0,-7.4,0, teal, fore);
    box(4.6,4.6,4.6,0,-10.4,0, dark, fore);                       /* fist */
    P[rocket?"rArm":"lArm"]=sh; P[rocket?"rFore":"lFore"]=fore;
  };
  mkArm(-1,false); mkArm(1,true);
  /* teal leg seams */
  box(.8,10,.8, -8.6,24.5,2.6, teal, grp); box(.8,10,.8, 8.6,24.5,2.6, teal, grp);
  /* ground shadow disc */
  const disc=new T.Mesh(new T.Box(26,.3,26), dark); disc.position.set(0,.2,0); grp.add(disc);
  if(S.TH.Light){ try{ const pl=new S.TH.Light(0x2ee8c8, 2.2, 90); pl.position.set(0,46,8); grp.add(pl);}catch(e){} }
  S.scene.add(grp); return grp;
}

/* ---------- build the hangar ---------- */
function buildHangar(gy){
  const T=S.TH, grp=new T.Group(); grp.position.set(SITE.x,gy||0,SITE.z); grp.rotation.y=SITE.yaw; S.hangarGrp=grp;
  const rock=mat(0x4a4038), rock2=mat(0x3a332c), teal=glowMat(0x2ee8c8,1.2), dark=mat(0x0a0c10);
  /* cliff mass */
  box(70,42,34, 0,21,-6, rock, grp);
  box(70,42,10, 0,21,14, rock2, grp);                            /* face */
  /* doorway */
  box(13,26,3, 0,0,15.2, dark, grp);                             /* black mouth */
  box(7,30,6, -13,15,13, rock2, grp); box(7,30,6, 13,15,13, rock2, grp); /* jambs */
  box(34,6,6, 0,29,13, rock2, grp);                              /* lintel */
  box(20,1,1, 0,26.2,13.4, teal, grp);                           /* door seam glow */
  /* sliding door slab */
  const door=new T.Mesh(new T.Box(20,26,2.4), mat(0x5a5148)); door.position.set(0,13,15.4); grp.add(door);
  box(18,1,1, 0,0,1.3, teal, door);                              /* seam on door (child of door) */
  S.door=door;
  S.scene.add(grp);
}

/* ---------- HUD ---------- */
const CSS = `
.colPrompt{position:fixed;left:50%;bottom:18vh;transform:translateX(-50%);z-index:9300;display:none;align-items:center;gap:8px;background:rgba(6,10,24,.9);border:1px solid rgba(46,232,200,.5);border-radius:12px;padding:9px 14px;color:#dffef6;font:600 14px "Segoe UI",system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)}
.colPrompt kbd{background:#12222e;border:1px solid rgba(46,232,200,.6);border-radius:6px;padding:2px 8px;color:#7ff5df;font-weight:800}
.colHud{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9300;display:none;flex-direction:column;align-items:center;gap:4px;background:rgba(4,8,18,.85);border:1px solid rgba(46,232,200,.5);border-radius:12px;padding:8px 16px;color:#dffef6;font:700 13px "Segoe UI",system-ui,sans-serif;letter-spacing:.08em}
.colHud .colCd{font-size:11px;color:#8fd8c8;letter-spacing:.04em}
`;
function injectCss(){ if(document.getElementById("colCss")) return; const s=document.createElement("style"); s.id="colCss"; s.textContent=CSS; document.head.appendChild(s); }
function ensureHud(){
  injectCss();
  if(!S.prompt){ S.prompt=hh("div",{class:"colPrompt",id:"colPrompt"}); document.body.appendChild(S.prompt); }
  if(!S.hud){ S.hud=hh("div",{class:"colHud",id:"colHud"}, hh("b",{},"COLOSSUS · PILOT ONLINE"), hh("span",{class:"colCd",id:"colCd"},"")); document.body.appendChild(S.hud); }
}
function setPrompt(txt){ if(!S.prompt) return; if(!txt){ S.prompt.style.display="none"; return; } S.prompt.innerHTML="<kbd>"+(S.piloting?"X":"E")+"</kbd> "+txt; S.prompt.style.display="flex"; }

/* ---------- piloting ---------- */
const fwd=()=>({x:Math.sin(S.yaw), z:Math.cos(S.yaw)});
function mount(){
  const g=S.game, p=g&&g.player; if(!p) return;
  S.piloting=true; S.prevInput=window.SL.input.enabled; window.SL.input.enabled=false;
  S.playerMesh=null;
  if(p) for(const k of ["mesh","model","root","group","obj","body","avatar","sprite"]){ const v=p[k]; if(v&&v.isObject3D){ S.playerMesh=v; v.visible=false; break; } }
  if(!S.playerMesh && p && p.meshes) try{ p.meshes.forEach(m=>m.visible=false); S.playerMesh={visible:true,_multi:p.meshes}; }catch(e){}
  ensureHud(); S.hud.style.display="flex";
  try{ window.SL.hud && window.SL.hud.banner && window.SL.hud.banner("🤖 COLOSSUS","Pilot link established. The titan answers you.",2600); }catch(e){}
  try{ toast("COLOSSUS online — WASD walk · A/D turn · Q rocket punch · X dismount"); }catch(e){}
}
function dismount(){
  const g=S.game, p=g&&g.player; if(!p) return;
  S.piloting=false;
  try{ window.SL.input.enabled = S.prevInput!==false; }catch(e){}
  if(S.playerMesh){ if(S.playerMesh._multi) try{ S.playerMesh._multi.forEach(m=>m.visible=true); }catch(e){} else S.playerMesh.visible=true; S.playerMesh=null; }
  const f=fwd(); p.pos.x=S.mech.position.x + f.x*10; p.pos.z=S.mech.position.z + f.z*10;
  if(S.hud) S.hud.style.display="none"; setPrompt(null);
  try{ toast("Dismounted — the Colossus powers down to standby."); }catch(e){}
}
function seatPoint(){
  const f=fwd();
  return { x:S.mech.position.x + f.x*7, y:57, z:S.mech.position.z + f.z*7 };
}
function rocketPunch(){
  if(S.cd>0||S.fly) return;
  const F=S.parts.rFore; if(!F) return;
  S.fly={t:0, phase:"out", home:F.position.z, baseY:F.position.y};
  S.cd=S.cdMax;
  try{ toast("ROCKET PUNCH!"); }catch(e){}
}

/* ---------- main loop ---------- */
function tick(ts){
  S.raf=requestAnimationFrame(tick);
  const g=window.SL&&window.SL.game, p=g&&g.player; if(!g||!p){ return; }
  /* village travel guard: rebuild if the scene was swapped */
  if(g.scene!==S.scene){ if(harvest()){ console.log("[colossus] scene rebuild"); buildHangar(S.gy); buildMech(SITE.x,SITE.z-14,SITE.yaw,S.gy); if(S.discovered){S.door.position.y=27;} } else return; }
  S.t=(ts||0)/1000;
  /* DEBUG: ground truth on where everything really is */
  S.f=(S.f||0)+1;
  if(S.f%120===1){
    try{
      const cam=g.camera, m=p.mesh||p.model||p.obj;
      console.log("[colossus] dbg cam",cam?cam.position.x.toFixed(0)+","+cam.position.z.toFixed(0):"-",
        "p",p.pos.x.toFixed(0)+","+p.pos.z.toFixed(0),
        "mesh",m&&m.position?m.position.x.toFixed(0)+","+m.position.z.toFixed(0):"-",
        "mechIn",!!(S.mech&&S.mech.parent===S.scene),"kids",S.scene.children.length,
        "pY",(function(){try{return p.pos.y.toFixed(1)}catch(e){return "?"}})(),
        "far",(function(){try{return g.camera.far}catch(e){return "?"}})(),
        "fog",(function(){try{return g.scene.fog?g.scene.fog.near+"/"+g.scene.fog.far:"none"}catch(e){return "?"}})(),
        "gSite",(function(){try{return S.groundFn?S.groundFn(SITE.x,SITE.z).toFixed(1):"nofn"}catch(e){return "?"}})(),
        "gPlayer",(function(){try{return S.groundFn?S.groundFn(p.pos.x,p.pos.z).toFixed(1):"nofn"}catch(e){return "?"}})(),
        "mechs",(S.allMechs||[]).map(m=>{try{const e=m.matrixWorld.elements;return e[12].toFixed(0)+","+e[14].toFixed(0)+" y"+e[13].toFixed(1)+(m.scale.x!==1?" x"+m.scale.x:"")}catch(e){return "?"}}).join("|"),
        "hangarY",(function(){try{return S.hangarGrp.matrixWorld.elements[13].toFixed(1)}catch(e){return "?"}})(),
        "hangar",(S.hangar?(()=>{try{const e=S.hangar.matrixWorld.elements;return e[12].toFixed(0)+","+e[14].toFixed(0)}catch(e){return "?"}})():"-"));
    }catch(e){}
  }
  if(!S.testDone && p.pos){
    S.testDone=true;
    try{
      const T=S.TH; const tb=new T.Mesh(new T.Box(6,6,6), new T.Mat({color:0xff2020}));
      tb.position.set(p.pos.x+18,6,p.pos.z); S.scene.add(tb);
      console.log("[colossus] test box @",p.pos.x.toFixed(0),p.pos.z.toFixed(0));
    }catch(e){ console.log("[colossus] test box fail",(e&&e.message)||e); }
    try{ buildMech(p.pos.x+12, p.pos.z, 0, S.gy); console.log("[colossus] mech2 beside player @",p.pos.x.toFixed(0),p.pos.z.toFixed(0)); }
    catch(e){ console.log("[colossus] mech2 fail",(e&&e.message)||e); }
    try{
      const recol=(grp,c)=>{ grp.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color&&o.material.color.set){ o.material.color.set(c); } }); };
      (S.allMechs||[]).forEach((m,i)=>{ recol(m,0xff2020); if(i===0){ m.scale.setScalar(3); } });
      if(S.hangar){ recol(S.hangar,0xff8800); }
      console.log("[colossus] recolored mechs:",(S.allMechs||[]).length,"hangar:",!!S.hangar);
    }catch(e){ console.log("[colossus] recolor fail",(e&&e.message)||e); }
    try{
      p.pos.x=-30; p.pos.z=-152; try{p.pos.y=S.groundFn?S.groundFn(-30,-152):0;}catch(e){}
      try{ p.yaw=Math.PI; }catch(e){}
      try{ p.rot&&(p.rot.y=Math.PI); }catch(e){}
      console.log("[colossus] tp to site @ -30 -152");
    }catch(e){ console.log("[colossus] tp fail",(e&&e.message)||e); }
  }
  /* door discovery */
  const dx=p.pos.x-SITE.x, dz=p.pos.z-SITE.z, dH=Math.hypot(dx,dz);
  if(!S.discovered && dH<26){ S.discovered=true; S.doorT=0.001; try{ toast("Something massive shifts behind the cliff face..."); }catch(e){} }
  if(S.doorT>0 && S.doorT<1.15){ S.doorT+=1/60; S.door.position.y=Math.min(27, S.door.position.y+22/60); }
  /* idle life */
  if(S.parts && S.mech){
    const core=S.parts.core; S.mech.position.y=Math.sin(S.t*0.7)*0.35;
    try{ const cm=S.mech.children.find(o=>o.material&&o.material.emissive); }catch(e){}
  }
  if(S.fly){ /* rocket punch flight */
    const F=S.parts.rFore; S.fly.t+=1/60;
    const T=S.fly.t;
    if(S.fly.phase==="out"){ const k=Math.min(1,T/0.45); F.position.y=S.fly.baseY; F.position.z=S.fly.home + k*40; if(k>=1){S.fly.phase="back";S.fly.t=0;} }
    else { const k=Math.min(1,T/0.5); F.position.z=S.fly.home + 40*(1-k); if(k>=1){ F.position.z=S.fly.home; S.fly=null; } }
  }
  if(S.cd>0) S.cd=Math.max(0,S.cd-1/60);
  /* piloting */
  if(S.piloting){
    const f=fwd();
    const turn=(S.keys.a?1:0)-(S.keys.d?1:0);
    if(turn) { S.yaw+=turn*1.05/60; S.mech.rotation.y=S.yaw; }
    const step=(S.keys.w?1:0)-(S.keys.s?1:0);
    if(step){ const sp=step*11; S.mech.position.x+=f.x*sp/60; S.mech.position.z+=f.z*sp/60; }
    const seat=seatPoint(); p.pos.x=seat.x; p.pos.y=seat.y; p.pos.z=seat.z;
    const cdEl=document.getElementById("colCd"); if(cdEl) cdEl.textContent=S.cd>0?("Q Rocket Punch · "+S.cd.toFixed(1)+"s"):"Q Rocket Punch · ready";
    setPrompt("Dismount");
  } else {
    if(S.discovered && dH<14 && !S.eWait) setPrompt("Climb aboard the Colossus");
    else if(!S.discovered && dH<30) setPrompt("Inspect the cliff face");
    else setPrompt(null);
  }
}

/* ---------- input ---------- */
function onKey(e,down){
  const k=(e.key||"").toLowerCase(); S.keys[k]=down;
  if(!down||e.repeat) return;
  if(k==="e"){
    const g=S.game,p=g&&g.player; if(!p||S.piloting) return;
    const dx=p.pos.x-SITE.x, dz=p.pos.z-SITE.z, d=Math.hypot(dx,dz);
    if(S.discovered && d<14 && !S.eWait){ S.eWait=true; mount(); setTimeout(()=>{S.eWait=false;},400); }
  }
  if(k==="x" && S.piloting) dismount();
  if(k==="q" && S.piloting) rocketPunch();
}
const kd=e=>onKey(e,true), ku=e=>onKey(e,false);

/* ---------- boot ---------- */
function ensure(game){
  const g = game || (window.SL && window.SL.game);
  if(!g || !g.scene) return false;
  if(!harvest(g)) return false;
  if(S.on && S.scene === g.scene && !S.needRebuild) return true;
  let gy = 0; try{ gy = S.groundFn ? S.groundFn(SITE.x, SITE.z) : 0; }catch(e){ gy = 0; }
  S.gy = gy || 0;
  buildHangar(S.gy); buildMech(SITE.x, SITE.z-14, SITE.yaw, S.gy);
  if(!S.on){
    S.on = true; ensureHud();
    addEventListener("keydown",kd,true); addEventListener("keyup",ku,true);
    S.raf = requestAnimationFrame(tick);
    startDevTeleport();
  }
  S.needRebuild = false;
  console.log("[colossus] scene ok v"+CS,"mech @",SITE.x,(SITE.z-14),"gy",S.gy);
  return true;
}
function onScene(game, api){ try{ S.groundFn = api && api.ground; }catch(e){} S.needRebuild = true; ensure(game); }
function startDevTeleport(){
  const dev = new URLSearchParams(location.search).get("colossus");
  if(dev !== "1") return;
  let ticks = 0;
  const wait = setInterval(() => { const p = S.game && S.game.player; if(p && p.pos){ ticks++;
    p.pos.x = SITE.x; p.pos.z = SITE.z-2;
    if(S.door){ S.discovered = true; S.door.position.y = 27; S.doorT = 1.2; }
    if(ticks === 1){ try{ toast("\u{1F916} COLOSSUS dev teleport \u2014 hangar ahead"); }catch(e){} }
    console.log("[colossus] tp", ticks, p.pos.x.toFixed(0), p.pos.z.toFixed(0), "live:", !!(window.SL.game && window.SL.game.player === p));
    if(ticks > 24) clearInterval(wait); } }, 250);
  setTimeout(() => clearInterval(wait), 20000);
}
function boot(){
  S.needRebuild = true;
  if(!ensure()){ setTimeout(boot, 700); }
}
function waitGame(){ const g=window.SL&&window.SL.game; if(g&&g.scene&&g.player){ boot(); } else setTimeout(waitGame,600); }
waitGame();

const Colossus = { boot, onScene, state:S, mount, dismount, rocketPunch, buildMech, buildHangar };
export { Colossus };
