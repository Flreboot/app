const form = document.getElementById("loginForm");
const errEl = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";

  const data = Object.fromEntries(new FormData(form).entries());

  // pulizia spazi extra nell'username
  data.username = (data.username || "").trim().replace(/\s+/g, " ");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      errEl.textContent = json.error || "Errore di autenticazione.";
      return;
    }
    // Redirect a pagina protetta (placeholder)
    window.location.href = "/dashboard";
  } catch (err) {
    errEl.textContent = "Connessione non disponibile.";
  }
});
