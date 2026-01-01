// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const ADS_FILE = path.join(DATA_DIR, "ads.json");

console.log("Nutze Events-Datei:", EVENTS_FILE);
console.log("Existiert Datei?", fs.existsSync(EVENTS_FILE));
console.log("Arbeitsverzeichnis:", process.cwd());

// Werbung lesen
app.get("/api/ads", (req, res) => {
  res.json(readJSON(ADS_FILE));
});

// Werbung aktualisieren (Admin)
app.post("/api/ads", (req, res) => {
  writeJSON(ADS_FILE, req.body);
  res.json({ ok: true });
});

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* --------------------
   EVENTS API
---------------------*/

// Alle Events holen
app.get("/api/events", (req, res) => {
  res.json(readJSON(EVENTS_FILE));
});

// Events komplett ersetzen (wie Editor)
app.post("/api/events", (req, res) => {
  writeJSON(EVENTS_FILE, req.body);
  res.json({ ok: true });
});

app.post("/api/events/add", (req, res) => {
    console.log("Neues Event empfangen:", req.body); // <--- DEBUG
  const events = readJSON(EVENTS_FILE);
  const newEvent = req.body;

  if (!newEvent.id) {
    newEvent.id = Date.now();
  }

  events.push(newEvent);
  writeJSON(EVENTS_FILE, events);

  res.json({ ok: true, event: newEvent });
});

app.put("/api/events/update/:id", (req, res) => {
  const events = readJSON(EVENTS_FILE);
  const id = Number(req.params.id);
  const updated = req.body;

  const index = events.findIndex(e => Number(e.id) === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  events[index] = updated;
  writeJSON(EVENTS_FILE, events);

  res.json({ ok: true });
});

// Einzelnes Event löschen
app.delete("/api/events/:id", (req, res) => {
  const events = readJSON(EVENTS_FILE);
  const id = Number(req.params.id);
  const filtered = events.filter(e => Number(e.id) !== id);
  writeJSON(EVENTS_FILE, filtered);
  res.json({ ok: true });
});

console.log("Nutze Events-Datei:", EVENTS_FILE);

// --- BLOG API ---------------------------------------------------

// Hole alle Blogposts
app.get("/api/blog", (req, res) => {
  const blogPath = path.join(__dirname, "data", "blog.json");
  const blog = JSON.parse(fs.readFileSync(blogPath, "utf8"));
  res.json(blog);
});

// Neuen Blogeintrag speichern
app.post("/api/blog", (req, res) => {
  const blogPath = path.join(__dirname, "data", "blog.json");
  let posts = JSON.parse(fs.readFileSync(blogPath, "utf8"));

  const newPost = { ...req.body, id: Date.now() };
  posts.unshift(newPost);

  fs.writeFileSync(blogPath, JSON.stringify(posts, null, 2));
  res.json({ success: true, post: newPost });
});

// Blogeintrag löschen
app.delete("/api/blog/:id", (req, res) => {
  const blogPath = path.join(__dirname, "data", "blog.json");
  let posts = JSON.parse(fs.readFileSync(blogPath, "utf8"));

  posts = posts.filter(p => p.id != req.params.id);

  fs.writeFileSync(blogPath, JSON.stringify(posts, null, 2));
  res.json({ success: true });
});

const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Pdf
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  }
});
const upload = multer({ storage });

app.post("/api/upload/pdf", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei" });
  res.json({ path: "/uploads/" + req.file.filename });
});

// Image upload for ads (Admin)
app.post("/api/upload/image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei" });
  res.json({ path: "/uploads/" + req.file.filename });
});


app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});