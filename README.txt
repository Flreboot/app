
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


Ecco i modi pratici per aggiornare la webapp su Render, passo-passo. Ti do 3 flussi (scegline uno e lo impostiamo):

1) Semplice (Auto-deploy su ogni push)

Modifica i file in locale (VS Code).

Test locale (facoltativo): npm ci && npm start → apri http://localhost:3000.

Commit & push:

git add .
git commit -m "fix: testo/feature"
git push


Render, con Auto Deploy ON, compila e pubblica in automatico.
👉 Vedi lo stato in Render → Deploys → Logs.
