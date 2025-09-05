
FFL Reboot - Invio Formazione & Export

1) Install dipendenze:
   npm i express xlsx

2) Avvio:
   node server.js
   -> http://localhost:3000/dashboard.html

3) Flusso utente:
   - Compila i 23 slot, Capitano, Vice, Modulo
   - Clicca "Invia formazione" (bottone rosso). Appare messaggio "Formazione inviata".
   - Il server salva/sovrascrive in: /data/formazioni/<username>.json

4) Admin:
   - JSON aggregato: GET /api/admin/aggregate-formazioni
   - Export Excel:   GET /api/admin/export-formazioni.xlsx (download)
