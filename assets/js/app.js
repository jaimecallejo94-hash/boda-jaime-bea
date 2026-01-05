(() => {
  // 1) Pega aquí la URL de tu Apps Script Web App
  const API_BASE = "https://script.google.com/macros/s/AKfycbx5VLx4zyQuVNzOpoQmavLEndiILDCfxZWc-B7HmsyB8LJ-Du_C7RysejprLwG3JyO1Vg/exec";

  const qEl = document.getElementById("q");
  const btn = document.getElementById("btnSearch");
  const resultsEl = document.getElementById("results");
  const partyEl = document.getElementById("party");
  const msgEl = document.getElementById("msg");

  if (!qEl || !btn) return;

  const statusLabel = (s) => {
    switch ((s || "PENDING").toUpperCase()) {
      case "YES": return "✅ Confirmado";
      case "NO": return "❌ No asiste";
      default: return "⏳ Pendiente";
    }
  };

  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  async function apiGet(params) {
    const url = API_BASE + "?" + new URLSearchParams(params).toString();
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("Error de red");
    return res.json();
  }

  async function apiPost(bodyObj) {
    const formBody = new URLSearchParams();
    formBody.set("payload", JSON.stringify(bodyObj));
  
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: formBody.toString(),
      redirect: "follow",
    });
  
    const text = await res.text(); // por si no devuelve JSON válido
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Respuesta no JSON: " + text);
    }
  }

  function showMsg(text) {
    msgEl.textContent = text || "";
  }

  function renderResults(list) {
    resultsEl.style.display = "block";
    partyEl.style.display = "none";
    resultsEl.innerHTML = `
      <h3 style="margin-top:0">Resultados</h3>
      ${list.length === 0 ? `<p class="hint">No se han encontrado coincidencias.</p>` : ""}
      <div class="listwrap" style="display:grid; gap:8px; margin-top:10px">
        ${list.map(r => `
          <button class="box" data-person="${esc(r.person_id)}" style="text-align:left; cursor:pointer">
            <div style="display:flex; justify-content:space-between; gap:10px">
              <strong>${esc(r.display_name)}</strong>
              <span class="hint">${esc(statusLabel(r.status))}</span>
            </div>
          </button>
        `).join("")}
      </div>
      <p class="hint" style="margin-top:10px">Selecciona tu nombre.</p>
    `;

    resultsEl.querySelectorAll("button[data-person]").forEach(b => {
      b.addEventListener("click", async () => {
        const personId = b.getAttribute("data-person");
        await loadParty(personId);
      });
    });
  }

  function renderParty(party) {
    partyEl.style.display = "block";
    const members = party.members || [];

    partyEl.innerHTML = `
      <h3 style="margin-top:0">Tu grupo</h3>
      <p class="hint">Puedes confirmar a cada persona por separado.</p>

      <div style="display:grid; gap:10px; margin-top:10px">
        ${members.map(m => `
          <div class="box" data-row="${esc(m.person_id)}">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center">
              <div>
                <strong>${esc(m.display_name)}</strong><br/>
                <span class="hint">Estado: ${esc(statusLabel(m.status))}</span>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end">
                <button class="btn btn-ghost" data-set="PENDING">Pendiente</button>
                <button class="btn" data-set="YES">Confirmar</button>
                <button class="btn btn-ghost" data-set="NO">No asiste</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px">
        <button class="btn" id="save">Guardar cambios</button>
        <button class="btn btn-ghost" id="back">Volver a buscar</button>
      </div>

      <p class="hint" id="saveMsg" style="margin-top:10px"></p>
    `;

    const pendingUpdates = new Map(); // person_id -> status

    partyEl.querySelectorAll("[data-row]").forEach(row => {
      const pid = row.getAttribute("data-row");
      row.querySelectorAll("button[data-set]").forEach(btn => {
        btn.addEventListener("click", () => {
          const st = btn.getAttribute("data-set");
          pendingUpdates.set(pid, st);

          const hint = row.querySelector(".hint");
          hint.textContent = `Estado: ${statusLabel(st)} (sin guardar)`;
        });
      });
    });

    partyEl.querySelector("#back").addEventListener("click", () => {
      partyEl.style.display = "none";
      resultsEl.style.display = "block";
      showMsg("");
    });

    partyEl.querySelector("#save").addEventListener("click", async () => {
      const saveMsg = partyEl.querySelector("#saveMsg");
      if (pendingUpdates.size === 0) {
        saveMsg.textContent = "No hay cambios.";
        return;
      }

      saveMsg.textContent = "Guardando…";
      try {
        const updates = Array.from(pendingUpdates.entries()).map(([person_id, status]) => ({ person_id, status }));
        const out = await apiPost({ action: "update", updates });
        if (!out.ok) throw new Error(out.error || "No se pudo guardar");

        // Recargar grupo para mostrar estados ya confirmados
        saveMsg.textContent = "¡Guardado! ✅";
        pendingUpdates.clear();
        await loadParty(members[0].person_id);
      } catch (e) {
        saveMsg.textContent = "Error guardando. Intenta de nuevo.";
      }
    });
  }

  async function loadParty(personId) {
    showMsg("Cargando…");
    try {
      const out = await apiGet({ action: "party", person_id: personId });
      if (!out.ok) throw new Error(out.error || "No encontrado");
      showMsg("");
      resultsEl.style.display = "none";
      renderParty(out);
    } catch (e) {
      showMsg("No se pudo cargar.");
    }
  }

  async function search() {
    const q = qEl.value.trim();
    partyEl.style.display = "none";
    resultsEl.style.display = "none";

    if (q.length < 2) {
      showMsg("Escribe al menos 2 letras para buscar.");
      return;
    }

    showMsg("Buscando…");
    try {
      const out = await apiGet({ action: "search", q });
      if (!out.ok) throw new Error(out.error || "Error");
      showMsg("");
      renderResults(out.results || []);
    } catch (e) {
      showMsg("Error buscando. Revisa la URL del script y permisos.");
    }
  }

  btn.addEventListener("click", search);
  qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search();
  });
})();
