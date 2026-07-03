// ===== Page admin : modération, export ZIP, nouvelle soirée =====
const pinEl = document.getElementById("pin");
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");

// PIN pré-rempli si passé en ?pin=... (pratique sur le PC)
const urlPin = new URLSearchParams(location.search).get("pin");
if (urlPin) pinEl.value = urlPin;

function pin() { return encodeURIComponent(pinEl.value || ""); }
function setStatus(msg) { statusEl.textContent = msg || ""; }

const compressEl = document.getElementById("compress");

async function load() {
  setStatus("Chargement…");
  try {
    const res = await fetch(`/api/admin/photos?pin=${pin()}`);
    if (res.status === 403) { setStatus("❌ Code PIN invalide."); return; }
    const data = await res.json();
    render(data.photos || []);
    // reflète l'état du réglage compression
    try {
      const s = await (await fetch("/api/settings", { cache: "no-store" })).json();
      compressEl.checked = !!s.compress;
    } catch (e) {}
    setStatus("");
  } catch (e) {
    setStatus("Erreur de chargement.");
  }
}

compressEl.addEventListener("change", async () => {
  try {
    const res = await fetch(`/api/admin/settings?pin=${pin()}&compress=${compressEl.checked ? 1 : 0}`, { method: "POST" });
    if (res.status === 403) { setStatus("❌ Code PIN invalide."); compressEl.checked = !compressEl.checked; return; }
    const d = await res.json();
    setStatus(d.compress ? "📦 Compression activée (les nouveaux envois seront réduits)." : "Compression désactivée.");
  } catch (e) {
    setStatus("Erreur réseau.");
    compressEl.checked = !compressEl.checked;
  }
});

function render(photos) {
  countEl.textContent = `${photos.length} photo(s)`;
  grid.innerHTML = "";
  if (photos.length === 0) {
    grid.innerHTML = '<div class="empty">Aucune photo pour le moment.</div>';
    return;
  }
  for (const p of photos) {
    const card = document.createElement("div");
    card.className = "card";
    const when = new Date(p.ts).toLocaleTimeString();
    card.innerHTML = `
      <button class="del" title="Supprimer">✕</button>
      <img src="${p.url}" loading="lazy" />
      <div class="meta">${when}</div>`;
    card.querySelector(".del").addEventListener("click", () => del(p.id, card));
    grid.appendChild(card);
  }
}

async function del(id, card) {
  if (!confirm("Supprimer cette photo ?")) return;
  try {
    const res = await fetch(`/api/admin/delete?pin=${pin()}&id=${encodeURIComponent(id)}`, { method: "POST" });
    if (res.ok) {
      card.remove();
      const n = grid.querySelectorAll(".card").length;
      countEl.textContent = `${n} photo(s)`;
      if (n === 0) grid.innerHTML = '<div class="empty">Aucune photo pour le moment.</div>';
    } else if (res.status === 403) {
      setStatus("❌ Code PIN invalide.");
    } else {
      setStatus("Suppression impossible.");
    }
  } catch (e) { setStatus("Erreur réseau."); }
}

function exportZip() {
  if (!pinEl.value) { setStatus("Entre le PIN d'abord."); return; }
  // téléchargement direct via le navigateur
  window.location = `/api/admin/export?pin=${pin()}`;
}

async function resetAll() {
  if (!confirm("NOUVELLE SOIRÉE : supprimer TOUTES les photos ?\n\n(Pense à faire l'export ZIP avant !)")) return;
  if (!confirm("Es-tu sûr ? C'est définitif.")) return;
  try {
    const res = await fetch(`/api/admin/reset?pin=${pin()}`, { method: "POST" });
    if (res.status === 403) { setStatus("❌ Code PIN invalide."); return; }
    const data = await res.json();
    setStatus(`✅ Galerie réinitialisée (${data.deleted} photo(s) supprimée(s)).`);
    render([]);
  } catch (e) { setStatus("Erreur réseau."); }
}

document.getElementById("load").addEventListener("click", load);
document.getElementById("export").addEventListener("click", exportZip);
document.getElementById("reset").addEventListener("click", resetAll);

// charge auto si le PIN est déjà là (via ?pin=)
if (urlPin) load();
