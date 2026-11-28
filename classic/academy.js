/* ============================================================
   Shinobi Legacy: Remastered — Academy, AI Squad & Progression
   Systems: Ninja Academy spawn + intro, 5-stage graduation exam,
   chakra nature discovery (replaces element rolls), AI squad
   (2 teammates + sensei), bonding, D–S missions, chunin exam,
   full rank progression.
   Modular. Loaded from the Remastered menu ("Academy" button)
   and hooked into the world (spawn / scene / boot).
   Depends on phase1.js helpers + CSS.
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, V_ui } from "./phase1.js?v=p1135";

const AV = "1";
const AKEY = "sl2_academy_v" + AV;

/* ---------- academy geometry per village (matches the world's building table) ----------
   [x, z, yaw, w, d] — yaw is the direction the door faces (outward). */
const ACADEMY_POS = {
  leaf:   [-74,  -25,   0,     30, 16],
  sand:   [-81.1,-21.7, 1.373, 20, 13],
  mist:   [ 18.1, 20.1, -1.356,22, 14],
  cloud:  [  1.2,-35,  -3.031,22, 14],
  stone:  [-16.8, 24.9, 1.516, 22, 14]
};
const VILLAGE_FULL = { leaf:"Hidden Leaf", sand:"Hidden Sand", mist:"Hidden Mist", cloud:"Hidden Cloud", stone:"Hidden Stone" };
/* village centers in world coords (world.js w3 expansion moved the villages far apart;
   ACADEMY_POS is stored village-relative, these offsets map it to world space) */
const VCENTER = { leaf:[0,0], sand:[-1620,1460], mist:[1660,540], cloud:[260,-1880], stone:[-1760,-1120] };
function vco(vid){ const c = VCENTER[vid] || [0,0]; return c; }

/* ---------- chakra natures ---------- */
const NATURES = ["fire", "water", "wind", "earth", "lightning"];
const NATURE_NAME = { fire:"Fire Release", water:"Water Release", wind:"Wind Release", earth:"Earth Release", lightning:"Lightning Release" };
const NATURE_ICON = { fire:"🔥", water:"💧", wind:"🌪", earth:"🪨", lightning:"⚡" };

/* ---------- exam stages ---------- */
const EXAM_STAGES = ["written", "chakra", "clone", "course", "instructor"];
const EXAM_STAGE_NAME = { written:"Written Exam", chakra:"Chakra Control", clone:"Clone Technique", course:"Obstacle Course", instructor:"Instructor Bout" };

/* ---------- ranks ---------- */
const RANKS = [
  { name:"Academy Student", minLevel:1 },
  { name:"Genin",           minLevel:3 },
  { name:"Chunin",          minLevel:6 },
  { name:"Jonin",           minLevel:10 },
  { name:"Special Jonin",   minLevel:14 },
  { name:"ANBU",            minLevel:18 },
  { name:"Kage-level",      minLevel:25 }
];

/* ---------- tiny helpers ---------- */
const keyOf = (save) => String((save && (save.name || save.charName)) || "unknown").toLowerCase().slice(0, 40) || "unknown";
const now = () => Date.now();

/* ---------- persistence ---------- */
let AROOT = null;
function aLoad() {
  try { AROOT = JSON.parse(localStorage.getItem(AKEY) || "null"); } catch (e) { AROOT = null; }
  if (!AROOT || typeof AROOT !== "object" || !AROOT.chars) AROOT = { v: AV, chars: {} };
}
function aSave() { try { if (!AROOT) aLoad(); localStorage.setItem(AKEY, JSON.stringify(AROOT)); } catch (e) { console.log("[academy] save err", e && e.message); } }
aLoad(); // populate AROOT at module init so spawn/boot hooks see persisted state
function freshAcd() {
  return {
    v: AV,
    spawned: false,          // intro cinematic completed (new players)
    uniform: false,
    exam: { stage: 0, attempts: 0, passed: false, scores: { written: 0, chakra: 0, clone: 0, course: 0, instructor: 0 }, graduatedAt: 0 },
    natures: { primary: null, secondary: null, discoveredAt: 0, source: "" }, // source: "exam" | "legacy"
    squad: { generated: false, number: "", members: [], sensei: null },
    missions: { board: [], refreshedAt: 0, done: 0, best: "" },
    chunin: { entered: false, stage: 0, passed: false, scores: [] }
  };
}
function acdOf(save) {
  if (!save) save = (window.SL && window.SL.profile) || null;
  aLoad();
  const k = keyOf(save);
  if (!AROOT.chars[k]) AROOT.chars[k] = { acd: freshAcd() };
  const c = AROOT.chars[k];
  c.acd = c.acd || freshAcd();
  const a = c.acd;
  a.exam = a.exam || freshAcd().exam;
  a.natures = a.natures || freshAcd().natures;
  a.squad = a.squad || freshAcd().squad;
  a.missions = a.missions || freshAcd().missions;
  a.chunin = a.chunin || freshAcd().chunin;
  try { // dev-only: ?acadtest=<n>&acadpass=1 marks the exam passed for automated squad testing (never set on production URLs)
    const qp = new URLSearchParams(location.search);
    if (!a.exam.passed && qp.get("acadtest") && qp.get("acadpass") === "1") {
      a.exam.passed = true; a.exam.graduatedAt = Date.now();
      for (const k of ["written","chakra","clone","course","instructor"]) a.exam.scores[k] = a.exam.scores[k] || 100;
      aSave();
      console.log("[academy] dev acadpass hook fired");
    }
  } catch (e) {}
  return a;
}
function rankOf(level, passed) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.minLevel) r = x;
  if (passed && r === RANKS[0]) r = RANKS[1];
  return r.name;
}

/* ---------- academy interior layout ----------
   u = door direction (outward). Player spawns just inside the door facing in.
   Instructor stands at the front wall (opposite the door) facing the room. */
function academyLayout(vid) {
  const b = ACADEMY_POS[vid];
  if (!b) return null;
  const cv = vco(vid);
  const [x, z, yaw, w, d] = [b[0] + cv[0], b[1] + cv[1], b[2], b[3], b[4]];
  const ux = Math.sin(yaw), uz = Math.cos(yaw);
  const px = Math.cos(yaw), pz = -Math.sin(yaw); // perpendicular
  const half = d / 2;
  return {
    vid, x, z, yaw, w, d,
    ux, uz, px, pz,
    spawn:  { x: x + ux * (half - 2.2), z: z + uz * (half - 2.2), yaw: yaw + Math.PI }, // just inside the door, facing the instructor
    front:  { x: x - ux * (half - 2.6), z: z - uz * (half - 2.6) },                     // instructor spot
    desk:   { x: x - ux * (half - 4.4), z: z - uz * (half - 4.4) }
  };
}
/* ---------- academy NPCs ---------- */
function academyNpcs(L, vid) {
  const vill = VILLAGE_FULL[vid] || vid;
  const spot = (du, dp) => ({ x: L.front.x + L.ux * du + L.px * dp, z: L.front.z + L.uz * du + L.pz * dp });
  return [
    {
      id: "aca_sensei_" + vid, name: "Instructor Hayate", role: "elder",
      color: "#2b3a55", hair: "#4a4a55", at: [L.front.x, L.front.z],
      ap: { body: "male", hairstyle: "short", hair: "#4a4a55", eyes: "#2b2b33", outfit: "#2b3a55", headband: "forehead", skin: "#e8c7a6", build: "lean" },
      lines: [
        "Welcome to the " + vill + " Ninja Academy, recruit.",
        "The graduation exam has five stages: written, chakra control, the clone technique, the obstacle course… and me.",
        "Pass all five and you walk out of here a Genin with your own squad. Fail, and you come back tomorrow.",
        "When you're ready, open the Academy panel in your menu and begin."
      ]
    },
    {
      id: "aca_stu1_" + vid, name: "Academy Student Ren", role: "elder",
      color: "#3c4a63", hair: "#16161c", at: [spot(2.4, 2.1).x, spot(2.4, 2.1).z],
      ap: { body: "male", hairstyle: "spiky", hair: "#16161c", eyes: "#2b2b33", outfit: "#3c4a63", headband: "forehead", skin: "#e8c7a6", build: "slim" },
      lines: ["First day? Don't worry, the written part is easier than everyone says.", "The obstacle course though… good luck with the log bridge."]
    },
    {
      id: "aca_stu2_" + vid, name: "Academy Student Mina", role: "elder",
      color: "#4a3a55", hair: "#5a3a26", at: [spot(2.4, -2.1).x, spot(2.4, -2.1).z],
      ap: { body: "female", hairstyle: "ponytail", hair: "#5a3a26", eyes: "#2b2b33", outfit: "#4a3a55", headband: "forehead", skin: "#e8c7a6", build: "slim" },
      lines: ["I failed the clone technique twice before it clicked. You'll get it.", "Watch your chakra meter on stage two — don't push it into the red."]
    },
    {
      id: "aca_stu3_" + vid, name: "Academy Student Goro", role: "elder",
      color: "#3a4a55", hair: "#7a5234", at: [spot(5.2, 0).x, spot(5.2, 0).z],
      ap: { body: "male", hairstyle: "short", hair: "#7a5234", eyes: "#2b2b33", outfit: "#3a4a55", headband: "forehead", skin: "#e8c7a6", build: "sturdy" },
      lines: ["Sensei says chakra natures show themselves during the exam.", "Two natures, they say. Nobody knows which until the water sphere test."]
    }
  ];
}

/* ---------- intro cinematic ---------- */
const INTRO_LINES = (vid, name) => ([
  { who: "Instructor Hayate", text: "So you're the new recruit. Welcome to the " + (VILLAGE_FULL[vid] || vid) + " Ninja Academy, " + name + "." },
  { who: "Instructor Hayate", text: "Every shinobi in this village started in this room. Desks, chalk, and a great deal of falling down." },
  { who: "Instructor Hayate", text: "You wear the academy uniform until you earn your headband — and you earn that in the graduation exam, not the calendar." },
  { who: "Instructor Hayate", text: "Five stages: a written exam, chakra control, the clone technique, the obstacle course, and finally… me." },
  { who: "Instructor Hayate", text: "Pass all five and you leave a Genin with your own squad and a sensei of your own. Fail, and you come back tomorrow. Ready when you are." }
]);

let INTRO_ACTIVE = false;
function runIntro(game, vid, onDone) {
  if (INTRO_ACTIVE) return;
  INTRO_ACTIVE = true;
  try { if (game) game.cineActive = true; } catch (e) {}
  const name = pName();
  const lines = INTRO_LINES(vid, name);
  let i = 0;
  let ov = $q("#acadIntro");
  if (ov) ov.remove();
  const finish = () => {
    if (!INTRO_ACTIVE) return;
    INTRO_ACTIVE = false;
    try { if (game) game.cineActive = false; } catch (e) {}
    if (ov) ov.remove();
    const a = acdOf();
    a.spawned = true;
    aSave();
    toast("🎓 Welcome to the Academy, " + name + " — report to Instructor Hayate for your exam.");
    if (onDone) onDone();
  };
  ov = hh("div", { id: "acadIntro", class: "acadIntro", role: "dialog", "aria-label": "Academy introduction" },
    hh("div", { class: "acadIntroBar top" }),
    hh("div", { class: "acadIntroBar bot" }),
    hh("div", { class: "acadIntroCard" },
      hh("div", { class: "acadIntroWho" }, lines[i].who),
      hh("div", { class: "acadIntroText", id: "acadIntroText" }, lines[i].text),
      hh("div", { class: "acadIntroRow" },
        hh("button", { class: "acadIntroBtn", onclick: () => { V_ui(); i = (i + 1) % lines.length; if (i === 0) { finish(); return; } $q("#acadIntroText").textContent = lines[i].text; } }, "Next ▸"),
        hh("button", { class: "acadIntroBtn ghost", onclick: () => { V_ui(); finish(); } }, "Skip"))));
  document.body.append(ov);
}
const ACADEMY_CSS = `
.acadIntro{position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-end;justify-content:center;background:radial-gradient(120% 100% at 50% 30%,rgba(4,10,26,.42),rgba(2,4,12,.88));font-family:"Segoe UI",system-ui,sans-serif;color:#e8f2ff}
.acadIntroBar{position:absolute;left:0;right:0;height:11vh;background:linear-gradient(180deg,rgba(2,3,8,.95),rgba(2,3,8,.55));pointer-events:none}
.acadIntroBar.top{top:0}.acadIntroBar.bot{bottom:0;background:linear-gradient(0deg,rgba(2,3,8,.95),rgba(2,3,8,.55))}
.acadIntroCard{position:relative;margin-bottom:13vh;width:min(680px,92vw);border:1px solid rgba(70,183,255,.45);border-radius:14px;background:linear-gradient(160deg,rgba(9,15,32,.97),rgba(6,10,24,.97));box-shadow:0 18px 60px rgba(0,0,0,.6),0 0 40px rgba(70,183,255,.12);padding:16px 18px 14px;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}
.acadIntroWho{font-size:.72rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#a8e4ff;margin-bottom:6px}
.acadIntroText{font-size:.95rem;line-height:1.6;color:#dcecff;min-height:3.2em}
.acadIntroRow{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
.acadIntroBtn{all:unset;cursor:pointer;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;border-radius:9px;border:1px solid #46b7ff;color:#04121f;background:#46b7ff}
.acadIntroBtn:hover{filter:brightness(1.12)}
.acadIntroBtn.ghost{background:transparent;color:#a8e4ff;border-color:rgba(70,183,255,.4)}
`;

function injectCss() {
  if (!$q("#acadCss")) { const st = document.createElement("style"); st.id = "acadCss"; st.textContent = ACADEMY_CSS; document.head.append(st); }
  if (!$q("#p1css")) { const st = document.createElement("style"); st.id = "p1css"; st.textContent = CSS; document.head.append(st); }
}

/* ============================================================
   WORLD HOOKS (called from game.js)
   ============================================================ */

/* Spawn override: fresh players spawn INSIDE their village's academy. */
window.__SL2academySpawn = function (save, vid) {
  try {
    if (!save) { console.log("[academy] spawn: no save"); return null; }
    aLoad();
    const hasState = !!AROOT && !!AROOT.chars[keyOf(save)];
    const legacy = !hasState && save.pos; // existing players: keep their normal spawn
    console.log("[academy] spawn hook vid=" + vid + " pos=" + JSON.stringify(save.pos) + " created=" + save.created + " hasState=" + hasState + " legacy=" + legacy);
    if (legacy) return null;
    const a = acdOf(save);
    if (a.spawned) return null;                 // intro done → normal spawns
    if (a.exam.passed) return null;
    const L = academyLayout(vid);
    if (!L) { console.log("[academy] spawn: no layout for " + vid); return null; }
    console.log("[academy] spawn override ->", JSON.stringify(L.spawn));
    return { x: L.spawn.x, z: L.spawn.z, yaw: L.spawn.yaw };
  } catch (e) { console.log("[academy] spawn err", e && e.message); return null; }
};

/* Boot: after the player is spawned, run the intro for fresh players. */
window.__SL2academyBoot = function (game) {
  try {
    const SL = window.SL; if (!SL) { console.log("[academy] boot: no window.SL"); return; }
    const save = SL.profile; if (!save) { console.log("[academy] boot: no profile"); return; }
    aLoad();
    const hasState = !!AROOT && !!AROOT.chars[keyOf(save)];
    console.log("[academy] boot pos=" + JSON.stringify(save.pos) + " hasState=" + hasState + " spawnedFlag=" + JSON.stringify(AROOT && AROOT.chars[keyOf(save)] && AROOT.chars[keyOf(save)].acd && AROOT.chars[keyOf(save)].acd.spawned));
    if (!hasState && save.pos) return;          // legacy player: skip silently
    const a = acdOf(save);
    if (a.spawned || a.exam.passed) return;
    if (INTRO_ACTIVE) return;
    const vid = save.at || save.village || "leaf";
    injectCss();
    setTimeout(() => runIntro(game, vid), 900); // let the spawn settle before the cinematic
  } catch (e) { console.log("[academy] boot err", e && e.message); }
};

/* Scene: each village scene gets its academy NPCs. */
window.__SL2academyScene = function (game, api) {
  try {
    if (!game || !api || typeof api.spawnNpc !== "function") return;
    const vid = game.villageId || "leaf";
    const L = academyLayout(vid);
    if (!L) return;
    for (const def of academyNpcs(L, vid)) {
      try {
        const q = api.spawnNpc(def);
        if (q && def.id === "aca_sensei_" + vid) q.vxExtra = () => examDialogButtons();
      } catch (e) { console.log("[academy] npc", def.id, e && e.message); }
    }
  } catch (e) { console.log("[academy] scene err", e && e.message); }
};

/* ============================================================
   MENU PANEL
   ============================================================ */
let SAVE = null;
function open(system, save, sfx) {
  SAVE = save || (window.SL && window.SL.profile) || null;
  injectCss();
  let CUR = "academy";
  const a = acdOf(SAVE);

  function rerender(tab) {
    CUR = tab || CUR;
    const body = $q("#acadBody");
    if (!body) return;
    body.textContent = "";
    if (CUR === "academy") renderHome(body);
    else if (CUR === "natures") renderNatures(body);
    else if (CUR === "squad") renderSquad(body);
  }

  function statRow(label, value) {
    return hh("div", { class: "p1stat" }, hh("span", {}, label), hh("b", {}, value));
  }

  function renderHome(body) {
    const a2 = acdOf(SAVE);
    const vid = (SAVE && (SAVE.at || SAVE.village)) || "leaf";
    const vill = VILLAGE_FULL[vid] || vid;
    const ex = a2.exam;
    const examState = ex.passed ? "Passed 🎓" : (ex.stage > 0 ? "In progress — stage " + (ex.stage + 1) + " of 5 (" + (EXAM_STAGE_NAME[EXAM_STAGES[ex.stage]] || "?") + ")" : "Not started");
    body.append(
      hh("div", { class: "p1title" }, "🏠 " + vill + " Ninja Academy"),
      hh("div", { class: "p1grid" },
        hh("div", { class: "p1card" },
          hh("h4", {}, "🥋 Your record"),
          statRow("Rank", rankOf(pLv(), acdOf().exam.passed)),
          statRow("Uniform", a2.spawned ? (ex.passed ? "Graduated — headband earned" : "Academy uniform") : "—"),
          statRow("Graduation exam", examState),
          ex.attempts ? statRow("Attempts", String(ex.attempts)) : null,
          hh("p", {}, "Talk to Instructor Hayate inside your village's academy building. The exam has five stages: written, chakra control, clone technique, obstacle course, and the instructor bout."),
      hh("button", { class: "btn small primary", style: "margin-top:8px", onclick: () => {
        import("./academyExam.js?v=e7").then((m) => m.startExam(null)).catch((e) => { console.log("[academy] exam load err", e && e.message); toast("The exam room is stuck. Reload the page and try again."); });
      } }, a2.exam.passed ? "🎓 View diploma" : (a2.exam.stage > 0 ? "▶ Resume exam · Stage " + (a2.exam.stage + 1) : "🎓 Begin the graduation exam"))),
        hh("div", { class: "p1card" },
          hh("h4", {}, "🌀 Chakra natures"),
          renderNatureLine(a2),
          hh("p", {}, ex.passed || a2.natures.primary ? "Your natures are recorded on your profile." : "Your chakra natures reveal themselves during the exam's chakra demonstration — no scrolls, no spins.")),
        a2.squad.generated ? hh("div", { class: "p1card" },
          hh("h4", {}, "🤝 Squad " + (a2.squad.number || "")),
          hh("p", {}, a2.squad.members.map(m => m.name).join(" · ") + (a2.squad.sensei ? " — under " + a2.squad.sensei.name : "")))
        : (a2.exam.passed ? hh("div", { class: "p1card" },
          hh("h4", {}, "🤝 Squad assignment ready"),
          hh("p", {}, "Open the Squad tab to meet your squad.")) : null)));
  }

  function renderNatureLine(a2) {
    const wrap = hh("div", { class: "p1row" });
    if (a2.natures.primary) {
      wrap.append(hh("span", { class: "p1pill" }, NATURE_ICON[a2.natures.primary] + " " + NATURE_NAME[a2.natures.primary]));
      if (a2.natures.secondary) wrap.append(hh("span", { class: "p1pill" }, NATURE_ICON[a2.natures.secondary] + " " + NATURE_NAME[a2.natures.secondary]));
    } else {
      const els = ((SAVE && SAVE.elements) || []).filter(Boolean);
      if (els && els.length) {
        for (const el of els) wrap.append(hh("span", { class: "p1pill" }, (NATURE_ICON[el] || "🌀") + " " + (NATURE_NAME[el] || el)));
      } else {
        wrap.append(hh("span", { class: "p1pill" }, "Undiscovered — revealed during the exam"));
      }
    }
    return wrap;
  }

  function renderSquad(body) {
    import("./squad.js?v=q1")
      .then((m) => { try { m.render(body); } catch (e) { console.log("[academy] squad render err", e && e.message); toast("The squad panel hit a snag. Reopen it."); } })
      .catch((e) => { console.log("[academy] squad load err", e && e.message); toast("The squad panel is stuck. Reload the page and try again."); });
  }

  let ov = $q("#acadOv");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "acadOv" },
    hh("div", { class: "p1m", id: "acadM" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "Ninja Academy"),
        hh("span", { class: "p1who" }, pName() + " · " + rankOf(pLv(), acdOf().exam.passed)),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeAcademy }, "✕")),
      hh("div", { class: "p1tabs" },
        hh("button", { class: "p1tab on", id: "acadTab-academy", onclick: () => { V_ui(); rerender("academy"); } }, "🏫 Academy"),
        hh("button", { class: "p1tab", id: "acadTab-natures", onclick: () => { V_ui(); rerender("natures"); } }, "🌀 Natures"),
        hh("button", { class: "p1tab", id: "acadTab-squad", onclick: () => { V_ui(); rerender("squad"); } }, "🤝 Squad")),
      hh("div", { class: "p1body", id: "acadBody" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Academy · Graduation Exam · Chakra Discovery · Squads"),
        hh("span", {}, "Graduation comes from the exam, not the calendar"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeAcademy(); });
  rerender("academy");
}
function closeAcademy() { const ov = $q("#acadOv"); if (ov) ov.remove(); }

/* ---------- academy center (world coords) ---------- */
function academyCenter(vid) { const p = ACADEMY_POS[vid]; if (!p) return null; const cv = vco(vid); return [p[0] + cv[0], p[1] + cv[1]]; }

/* ---------- exam dialog buttons (Hayate's dialog extra) ---------- */
function examDialogButtons() {
  const a = acdOf();
  const load = (stage) => () => {
    import("./academyExam.js?v=e7")
      .then((m) => { try { window.SL.hud && window.SL.hud.closeDialog && window.SL.hud.closeDialog(); } catch (e) {} m.startExam(stage); })
      .catch((e) => { console.log("[academy] exam load err", e && e.message); toast("The exam room is stuck. Reload the page and talk to Hayate again."); });
  };
  if (a.exam.passed) {
    return [hh("button", { class: "btn small primary", onclick: load(null) }, "🎓 View diploma")];
  }
  const st = a.exam.stage || 0;
  const label = st === 0 ? "🎓 Begin the graduation exam" : "▶ Resume exam · Stage " + (st + 1);
  return [hh("button", { class: "btn small primary", onclick: load(st) }, label)];
}

/* ---------- shared context for the exam module ---------- */
window.__SL2academyCtx = {
  acdOf, aSave, keyOf, rankOf, pName,
  academyLayout, academyCenter,
  VILLAGE_FULL, NATURES, NATURE_NAME, NATURE_ICON,
  EXAM_STAGES, EXAM_STAGE_NAME, RANKS,
  vid: () => { const sv = window.SL && window.SL.profile; return sv ? (sv.at || sv.village || "leaf") : "leaf"; }
};

/* ---------- public api for later stages ---------- */
const Academy = {
  open, acdOf, aSave, aLoad, academyLayout, academyNpcs, rankOf,
  NATURES, NATURE_NAME, NATURE_ICON, EXAM_STAGES, EXAM_STAGE_NAME, RANKS, VILLAGE_FULL
};

export { open, Academy, acdOf, aSave, academyLayout, rankOf };
