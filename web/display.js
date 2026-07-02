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
      if (msg.type === "new" && msg.photo) {
        const isNew = addToPool(msg.photo);
        if (isNew) {
          waiting.style.display = "none";
          flashNew();
          show(msg.photo, true); // affiche direct la nouvelle photo
          shown.add(msg.photo.id);
          scheduleNext();
        }
      }
    } catch (e) {}
  };
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

init();
