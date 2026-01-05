(() => {
  const API_BASE = "https://script.google.com/macros/s/AKfycbx5VLx4zyQuVNzOpoQmavLEndiILDCfxZWc-B7HmsyB8LJ-Du_C7RysejprLwG3JyO1Vg/exec"; // la misma que te funciona en el navegador

  const qEl = document.getElementById("q");
  const btn = document.getElementById("btnSearch");
  const resultsEl = document.getElementById("results");
  const msgEl = document.getElementById("msg");

  if (!qEl || !btn) return;

  async function apiGet(params) {
    const url = API_BASE + "?" + new URLSearchParams(params).toString();
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const text = await res.text();
    return { ok: res.ok, text };
  }

  btn.addEventListener("click", async () => {
    resultsEl.style.display = "block";
    msgEl.textContent = "Buscando…";

    const q = qEl.value.trim();
    const out = await apiGet({ action: "search", q });

    msgEl.textContent = "Respuesta cruda (debug):";
    resultsEl.innerHTML = `<pre style="white-space:pre-wrap">${out.text}</pre>`;
  });
})();
