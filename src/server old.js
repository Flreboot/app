// src/server.js (ESM) with admin + deadline
import express from "express";
import session from "express-session";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { verifyCredentials } from "./users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "fantacalcio-formazioni-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

// Static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Base redirects
app.get("/", (req, res) => res.redirect("/login.html"));
app.get("/login", (req, res) => res.redirect("/login.html"));

// ---- Auth ----
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = verifyCredentials(username, password);
  if (!user) return res.status(401).json({ ok: false, error: "Credenziali non valide." });
  req.session.user = { username: user.username, isAdmin: user.isAdmin || false };
  res.json({ ok: true, user: req.session.user });
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---- Players from rose.txt ----
function norm(s = "") {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

app.get("/api/players", (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const userName = req.session.user.username || "";
  const userNorm = norm(userName);
  const txtPath = path.join(__dirname, "..", "rose.txt");

  if (!fs.existsSync(txtPath)) {
    return res.status(500).json({ ok: false, error: "File rose.txt non trovato nella root del progetto." });
  }

  try {
    const raw = fs.readFileSync(txtPath, "utf-8");
    const lines = raw.split(/\r?\n/);

    let collecting = false;
    const players = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { if (collecting) break; continue; }

      const isHeader = line.indexOf(" - ") === -1;
      if (isHeader) {
        const headNorm = norm(line);
        if (headNorm.startsWith(userNorm)) {
          collecting = true;
        } else if (collecting) {
          break;
        }
        continue;
      }
      if (collecting) {
        const parts = line.split(" - ");
        const name = (parts[0] || "").trim();
        const role = (parts[1] || "").trim().toUpperCase();
        if (name) players.push({ name, role });
      }
    }
    const limited = players.slice(0, 29);
    res.json({ ok: true, user: userName, count: limited.length, players: limited });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Errore lettura/parse di rose.txt" });
  }
});

// ---- Dashboards ----
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login.html");
  if (req.session.user.isAdmin) {
    return res.sendFile(path.join(__dirname, "..", "public", "dashboard-admin.html"));
  }
  res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
});

// ---- Formation & Admin Export ----
const DATA_DIR = path.join(__dirname, "..", "data");
const FORMAZIONI_DIR = path.join(DATA_DIR, "formazioni");
const EXPORTS_DIR = path.join(__dirname, "..", "exports");
for (const dir of [DATA_DIR, FORMAZIONI_DIR, EXPORTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFilename(name) {
  return (name || "utente")
    .toString()
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

app.post("/api/submit-formation", (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
  try {
    const { modulo, capitano, vicecapitano, slots } = req.body || {};
    const username = req.session.user.username;
    const nowIso = new Date().toISOString();
    const toSave = {
      username,
      modulo: modulo || "",
      capitano: capitano || "",
      vicecapitano: vicecapitano || "",
      slots: slots || {},
      saved_at: nowIso,
    };
    const filename = sanitizeFilename(username) + ".json";
    fs.writeFileSync(path.join(FORMAZIONI_DIR, filename), JSON.stringify(toSave, null, 2), "utf8");
    res.json({ ok: true, message: "Formazione inviata", saved_at: nowIso });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Errore salvataggio formazione." });
  }
});

app.get("/api/admin/aggregate-formazioni", (req, res) => {
  try {
    const files = fs.readdirSync(FORMAZIONI_DIR).filter(f => f.endsWith(".json"));
    const rows = files.map(f => JSON.parse(fs.readFileSync(path.join(FORMAZIONI_DIR, f), "utf8")));
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Errore aggregazione." });
  }
});

app.get("/api/admin/export-formazioni.xlsx", (req, res) => {
  try {
    const files = fs.readdirSync(FORMAZIONI_DIR).filter(f => f.endsWith(".json"));
    const headers = ["username", "modulo", "capitano", "vicecapitano", "saved_at"];
    for (let i = 1; i <= 23; i++) headers.push(`slot_${String(i).padStart(2, "0")}`);
    const aoa = [headers];
    for (const f of files) {
      const obj = JSON.parse(fs.readFileSync(path.join(FORMAZIONI_DIR, f), "utf8"));
      const row = [obj.username || "", obj.modulo || "", obj.capitano || "", obj.vicecapitano || "", obj.saved_at || ""];
      for (let i = 1; i <= 23; i++) row.push(obj.slots?.[String(i)] || "");
      aoa.push(row);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Formazioni");
    const filename = `formazioni_${Date.now()}.xlsx`;
    const outPath = path.join(EXPORTS_DIR, filename);
    XLSX.writeFile(wb, outPath);
    res.download(outPath, filename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Errore export Excel." });
  }
});

// ---- DEADLINE config ----
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

app.get("/api/deadline", (req, res) => {
  if (!fs.existsSync(CONFIG_PATH)) return res.json({ ok: true, deadline: null });
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  res.json({ ok: true, deadline: cfg.deadline || null });
});

app.post("/api/admin/deadline", (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ ok: false, error: "Non autorizzato" });
  }
  const { deadline } = req.body || {};
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ deadline }, null, 2), "utf8");
  res.json({ ok: true, deadline });
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
