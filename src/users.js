// Normalizzazione username: trim, spazi singoli, maiuscolo
export function normalizeUsername(name = "") {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

// Elenco utenti consentiti (username "pulito" -> credenziali originali)
const users = [
  { username: "Xamatt",       password: "admin", isAdmin: true },
  { username: "Atletico Var", password: "varrica"  },
  { username: "Dreamteam",    password: "sasso"    },
  { username: "Mi Max Turbo", password: "caccamo"  },
  { username: "Il Signor G",  password: "scorsone" },
  { username: "Scoglio FFC",  password: "piero"    },
  { username: "Scaglione B",  password: "spektor"  },
  { username: "FC Sofia",     password: "cordova"  }
];

// Indice normalizzato -> record
const userIndex = new Map(
  users.map(u => [normalizeUsername(u.username), u])
);

export function verifyCredentials(inputUser, inputPass) {
  const key = normalizeUsername(inputUser);
  const record = userIndex.get(key);
  if (!record) return null;
  if (record.password !== inputPass) return null;
  return { ...record, isAdmin: !!record.isAdmin };
}
