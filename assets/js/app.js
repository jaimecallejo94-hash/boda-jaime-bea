(() => {
  const form = document.querySelector("#rsvpForm");
  if (!form) return;

  const msg = document.querySelector("#rsvpMsg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    // Demo: aquí luego haremos el POST real (Sheets/Supabase/etc)
    console.log("RSVP demo:", data);

    msg.textContent = "¡Gracias! (Demo) Tu confirmación se ha registrado localmente.";
    form.reset();
  });
})();
