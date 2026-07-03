// ===== Page de diffusion (slideshow aléatoire, temps réel) =====
// Règle : on tire des photos au hasard SANS repasser une photo déjà montrée,
// jusqu'à ce que toutes soient passées, puis on recommence un nouveau cycle.
// Une nouvelle photo qui arrive s'affiche immédiatement (effet temps réel).

const ADVANCE_MS = 5000; // durée d'affichage d'une photo

const stage = document.getElementById("stage");
const waiting = document.getElementById("waiting");
const badge = document.getElementById("badge");
const dot = document.getElementById("status-dot");

let pool = [];                 // toutes les photos connues [{id,url,author}]
const poolIds = new Set();     // pour éviter les doublons dans le pool
let shown = new Set();         // ids déjà passés dans le cycle courant
let currentEl = null;
let timer = null;

// ---------- Chargement initial ----------
async function init() {
  try {
    const res = await fetch("/api/photos");
    const data = await res.json();
    for (const p of data.photos) addToPool(p);
  } catch (e) {
    // pas grave, le WS remplira le pool
  }
  connectWS();
  if (pool.length > 0) {
    waiting.style.display = "none";
    next();
  }
  scheduleNext();
}

function addToPool(photo) {
  if (poolIds.has(photo.id)) return false;
  poolIds.add(photo.id);
  pool.push(photo);
  updateBadge();
  return true;
}

function updateBadge() {
  badge.textContent = `📸 ${pool.length}`;
}

// ---------- WebSocket temps réel ----------
function connectWS() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => dot.classList.add("on");
  ws.onclose = () => {
    dot.classList.remove("on");
    setTimeout(connectWS, 2000); // reconnexion auto
  };
  ws.onerror = () => ws.close();

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case "new":
          if (msg.photo) {
            const isNew = addToPool(msg.photo);
            if (isNew) {
              waiting.style.display = "none";
              flashNew();
              show(msg.photo, true); // affiche direct la nouvelle photo
              shown.add(msg.photo.id);
              scheduleNext();
            }
          }
          break;
        case "deleted":
          removeFromPool(msg.id);
          break;
        case "reset":
          resetPool();
          break;
        case "balloon":
          updateBalloon(msg.count, msg.goal);
          break;
        case "balloon_pop":
          popBalloon();
          break;
      }
    } catch (e) {}
  };
}

// ---------- Suppression / reset (depuis l'admin) ----------
function removeFromPool(id) {
  if (!poolIds.has(id)) return;
  poolIds.delete(id);
  shown.delete(id);
  pool = pool.filter((p) => p.id !== id);
  updateBadge();
}

function resetPool() {
  pool = [];
  poolIds.clear();
  shown = new Set();
  updateBadge();
  if (currentEl) {
    currentEl.img.remove();
    currentEl.cap.remove();
    currentEl = null;
  }
  waiting.style.display = "";
}

// ---------- Sélection aléatoire sans répétition ----------
function pickNext() {
  if (pool.length === 0) return null;
  let candidates = pool.filter((p) => !shown.has(p.id));
  if (candidates.length === 0) {
    // tout est passé -> nouveau cycle
    shown = new Set();
    candidates = pool.slice();
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  shown.add(choice.id);
  return choice;
}

function next() {
  const photo = pickNext();
  if (photo) show(photo, false);
}

function scheduleNext() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    next();
    scheduleNext();
  }, ADVANCE_MS);
}

// ---------- Affichage d'une photo ----------
function show(photo, immediate) {
  const rot = (Math.random() * 8 - 4).toFixed(1) + "deg";

  const img = document.createElement("img");
  img.className = "photo enter";
  img.style.setProperty("--rot", rot);
  img.src = photo.url;

  const cap = document.createElement("div");
  cap.className = "caption";
  cap.textContent = photo.author ? `📷 ${photo.author}` : "";

  // sortie de l'ancienne
  const old = currentEl;
  if (old) {
    old.img.classList.remove("enter");
    old.img.classList.add("leave");
    const oldCap = old.cap;
    setTimeout(() => { old.img.remove(); oldCap.remove(); }, 600);
  }

  stage.appendChild(img);
  stage.appendChild(cap);
  currentEl = { img, cap };
}

function flashNew() {
  const f = document.createElement("div");
  f.className = "flash-new";
  f.textContent = "✨ NOUVELLE PHOTO ! ✨";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 2000);
}

// ---------- Infos (QR / lien) ----------
async function fetchInfo() {
  try {
    const res = await fetch("/api/info");
    const data = await res.json();
    // le QR image est servi via /static/qr.png (deja dans le HTML) ; rien de plus requis
    return data;
  } catch (e) { return {}; }
}

// ---------- Mascottes qui traversent l'écran ----------
const MASCOTS = ["🎉", "🥳", "🦄", "🍾", "🎂", "💃", "🕺", "👽", "🐙", "🤖", "🌈", "🎈", "😎", "🐧", "🦖"];
function spawnMascot() {
  const el = document.createElement("div");
  el.className = "mascot";
  el.textContent = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
  const fromLeft = Math.random() < 0.5;
  const top = 10 + Math.random() * 70; // vh
  const dur = 6000 + Math.random() * 5000;
  el.style.top = top + "vh";
  el.style.left = fromLeft ? "-15vw" : "115vw";
  document.body.appendChild(el);
  const endX = fromLeft ? "130vw" : "-130vw";
  const spin = (Math.random() * 60 - 30);
  el.animate(
    [
      { transform: `translateX(0) rotate(0deg)` },
      { transform: `translateX(${endX}) rotate(${spin}deg)` },
    ],
    { duration: dur, easing: "linear" }
  ).onfinish = () => el.remove();
}
function startMascots() {
  // une mascotte toutes les 6 à 12 s
  const loop = () => {
    spawnMascot();
    setTimeout(loop, 6000 + Math.random() * 6000);
  };
  setTimeout(loop, 3000);
}

// ---------- Ballon collaboratif ----------
const balloonWrap = document.getElementById("balloon-wrap");
const balloonEl = document.getElementById("balloon");
const balloonLabel = document.getElementById("balloon-label");
let balloonHideTimer = null;

function updateBalloon(count, goal) {
  balloonWrap.classList.add("active");
  balloonEl.classList.remove("pop");
  const ratio = Math.min(count / goal, 1);
  const scale = 1 + ratio * 2.4; // de 1x à ~3.4x
  balloonEl.style.setProperty("--s", scale.toFixed(2));
  balloonEl.style.transform = `scale(${scale.toFixed(2)})`;
  balloonLabel.textContent = `🎈 ${count}/${goal} — appuyez pour gonfler !`;
  // masque le ballon s'il n'y a plus d'activité pendant 30 s
  clearTimeout(balloonHideTimer);
  balloonHideTimer = setTimeout(() => balloonWrap.classList.remove("active"), 30000);
}

function popBalloon() {
  balloonWrap.classList.add("active");
  balloonEl.classList.add("pop");
  balloonLabel.textContent = "💥 BOUM ! Encore ! 🎉";
  bigConfetti();
  setTimeout(() => {
    balloonEl.classList.remove("pop");
    balloonEl.style.transform = "scale(1)";
    balloonEl.style.setProperty("--s", "1");
  }, 700);
}

function bigConfetti() {
  const emojis = ["🎉", "🎊", "✨", "💥", "🎈", "🥳", "🌈", "⭐"];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-40px;font-size:${20 + Math.random() * 34}px;z-index:8;pointer-events:none;`;
    document.body.appendChild(s);
    s.animate(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 1200, easing: "ease-in" }
    ).onfinish = () => s.remove();
  }
}

fetchInfo();
startMascots();
init();
