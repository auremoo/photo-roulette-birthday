// ===== Page capture (téléphones) =====
// Fonctionne même si le wifi saute : les photos sont stockées en file
// d'attente (IndexedDB) et renvoyées automatiquement dès que ça revient.

const fileInput = document.getElementById("file");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const galleryEl = document.getElementById("gallery");
const authorEl = document.getElementById("author");
const btnLabel = document.getElementById("btnLabel");

// mémorise le prénom entre les prises
authorEl.value = localStorage.getItem("author") || "";
authorEl.addEventListener("input", () => localStorage.setItem("author", authorEl.value));

let myCount = Number(localStorage.getItem("myCount") || 0);
renderCount();

// ---------- File d'attente hors-ligne (IndexedDB) ----------
const DB_NAME = "photo-roulette";
const STORE = "queue";
let dbPromise = openDB();

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueAdd(item) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function queueAll() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueDelete(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Prise de photo ----------
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  // on met TOUJOURS en file d'attente d'abord => aucune photo perdue
  await queueAdd({ blob: file, author: authorEl.value || "", ts: Date.now() });
  myCount++;
  localStorage.setItem("myCount", String(myCount));
  renderCount();
  addThumb(URL.createObjectURL(file));
  confettiBurst();
  fileInput.value = "";
  drainQueue();
});

// ---------- Envoi de la file d'attente ----------
let draining = false;
async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    const items = await queueAll();
    if (items.length === 0) {
      setStatus(myCount ? "✅ Tout est envoyé 🎬" : "", myCount ? "ok" : "");
      return;
    }
    setStatus(`<span class="spinner"></span> Envoi… (${items.length} en attente)`, "");
    let skipped = 0;
    let remaining = items.length;
    for (const item of items) {
      const form = new FormData();
      form.append("file", item.blob, "photo.jpg");
      form.append("author", item.author || "");

      let res;
      try {
        res = await fetch("/api/upload", { method: "POST", body: form });
      } catch (e) {
        // vraie coupure réseau : on garde tout, on réessaiera automatiquement
        setStatus(`📴 Pas de réseau — ${remaining} photo(s) en attente, envoi auto au retour du wifi`, "err");
        return;
      }

      if (res.ok) {
        await queueDelete(item.id);
        remaining--;
      } else if (res.status >= 400 && res.status < 500) {
        // image refusée par le serveur (format illisible) : inutile d'insister,
        // sinon elle bloquerait toutes les suivantes dans la file.
        await queueDelete(item.id);
        remaining--;
        skipped++;
      } else {
        // erreur serveur/tunnel temporaire (5xx) : on réessaiera plus tard
        setStatus(`⚠️ Serveur momentanément indisponible — nouvel essai auto…`, "err");
        return;
      }
    }
    if (skipped > 0) {
      setStatus(`⚠️ ${skipped} photo(s) au format non supporté ignorée(s). Le reste est envoyé ✅`, "err");
    } else {
      setStatus("✅ Envoyées ! Ça passe à l'écran 🎬", "ok");
    }
  } finally {
    draining = false;
    btnLabel.textContent = myCount ? "📷 ENCORE UNE !" : "📷 PRENDRE UNE PHOTO";
  }
}

// retente : au retour du réseau, périodiquement, et au chargement
window.addEventListener("online", drainQueue);
setInterval(drainQueue, 8000);
drainQueue();

// ---------- UI ----------
function setStatus(html, cls) {
  statusEl.className = "status " + (cls || "");
  statusEl.innerHTML = html;
}

function renderCount() {
  countEl.textContent = myCount > 0 ? `Tu as balancé ${myCount} photo${myCount > 1 ? "s" : ""} 🔥` : "";
}

function addThumb(url) {
  const img = document.createElement("img");
  img.src = url;
  img.style.setProperty("--r", (Math.random() * 16 - 8).toFixed(1) + "deg");
  galleryEl.prepend(img);
  while (galleryEl.children.length > 8) galleryEl.lastChild.remove();
}

// petit feu d'artifice de confettis à la prise
function confettiBurst() {
  const emojis = ["🎉", "🎊", "✨", "💖", "🥳", "🌈", "⭐", "🍾"];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-40px;font-size:${18 + Math.random() * 22}px;z-index:99;pointer-events:none;transition:transform 1.6s ease-in, opacity 1.6s;`;
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)`;
      s.style.opacity = "0";
    });
    setTimeout(() => s.remove(), 1800);
  }
}

// PWA : enregistre le service worker (permet d'ouvrir l'app même hors-ligne)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/static/sw.js").catch(() => {});
}
