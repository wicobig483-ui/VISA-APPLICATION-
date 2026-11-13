const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const required = ["DATABASE_URL", "SESSION_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters.");
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));

app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true, tableName: "user_sessions" }),
  name: "recruitment.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-7", legacyHeaders: false });
app.use("/api", limiter);

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT 'Full-time',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS applications (
      id BIGSERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      occupation TEXT NOT NULL,
      experience TEXT NOT NULL,
      education TEXT NOT NULL,
      cv_status TEXT NOT NULL,
      job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Received',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS applications_email_reference_idx ON applications (email, reference);
    CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications (created_at DESC);
  `);
}

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function adminOnly(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: "Please sign in as an administrator." });
  next();
}

app.get("/api/jobs", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, location, description, requirements, employment_type FROM jobs WHERE active = TRUE ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Unable to load vacancies." });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const fullName = clean(req.body.fullName, 120);
    const email = clean(req.body.email, 254).toLowerCase();
    const country = clean(req.body.country, 100);
    const occupation = clean(req.body.occupation, 120);
    const experience = clean(req.body.experience, 80);
    const education = clean(req.body.education, 120);
    const cvStatus = clean(req.body.cvStatus, 80);
    const message = clean(req.body.message, 1500);
    const jobId = req.body.jobId ? Number(req.body.jobId) : null;
    const consent = req.body.consent === true;

    if (!fullName || !validEmail(email) || !country || !occupation || !experience || !education || !cvStatus || !consent) {
      return res.status(400).json({ error: "Complete all required fields and confirm the consent statement." });
    }
    if (jobId !== null && (!Number.isSafeInteger(jobId) || jobId < 1)) {
      return res.status(400).json({ error: "Please select a valid vacancy." });
    }
    if (jobId !== null) {
      const job = await pool.query("SELECT id FROM jobs WHERE id = $1 AND active = TRUE", [jobId]);
      if (!job.rowCount) return res.status(400).json({ error: "That vacancy is no longer available." });
    }

    const reference = "CA-" + crypto.randomBytes(6).toString("hex").toUpperCase();
    await pool.query(
      `INSERT INTO applications
       (reference, full_name, email, country, occupation, experience, education, cv_status, job_id, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [reference, fullName, email, country, occupation, experience, education, cvStatus, jobId, message]
    );
    res.status(201).json({
      message: "Your recruitment application has been received.",
      reference
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Unable to submit your application. Please try again." });
  }
});

app.post("/api/track", async (req, res) => {
  try {
    const reference = clean(req.body.reference, 30).toUpperCase();
    const email = clean(req.body.email, 254).toLowerCase();
    if (!reference || !validEmail(email)) return res.status(400).json({ error: "Enter a valid reference number and email address." });
    const result = await pool.query(
      `SELECT a.reference, a.status, a.created_at, a.updated_at, j.title AS job_title
       FROM applications a LEFT JOIN jobs j ON j.id = a.job_id
       WHERE a.reference = $1 AND a.email = $2`,
      [reference, email]
    );
    if (!result.rowCount) return res.status(404).json({ error: "No matching application was found. Check your reference number and email." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Unable to check application status." });
  }
});

app.post("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8 }), (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  const password = String(req.body.password ?? "");
  const expectedEmail = process.env.ADMIN_EMAIL.toLowerCase();
  if (email !== expectedEmail || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start admin session." });
    req.session.isAdmin = true;
    res.json({ message: "Signed in." });
  });
});
app.post("/api/admin/logout", adminOnly, (req, res) => {
  req.session.destroy(() => res.json({ message: "Signed out." }));
});
app.get("/api/admin/me", adminOnly, (_req, res) => res.json({ authenticated: true }));

app.get("/api/admin/applications", adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.reference, a.full_name, a.email, a.country, a.occupation, a.experience,
       a.education, a.cv_status, a.message, a.status, a.created_at, a.updated_at, j.title AS job_title
       FROM applications a LEFT JOIN jobs j ON j.id = a.job_id
       ORDER BY a.created_at DESC LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Unable to load applications." }); }
});
app.patch("/api/admin/applications/:id/status", adminOnly, async (req, res) => {
  const status = clean(req.body.status, 40);
  const allowed = ["Received", "Under review", "Shortlisted", "Interview", "Offer made", "Not selected", "Closed"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });
  try {
    const result = await pool.query(
      "UPDATE applications SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id, reference, status",
      [status, Number(req.params.id)]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Application not found." });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Unable to update status." }); }
});
app.post("/api/admin/jobs", adminOnly, async (req, res) => {
  const title = clean(req.body.title, 150);
  const location = clean(req.body.location, 120);
  const description = clean(req.body.description, 3000);
  const requirements = clean(req.body.requirements, 3000);
  const employmentType = clean(req.body.employmentType || "Full-time", 60);
  if (!title || !location || !description) return res.status(400).json({ error: "Title, location and description are required." });
  try {
    const result = await pool.query(
      "INSERT INTO jobs (title, location, description, requirements, employment_type) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [title, location, description, requirements, employmentType]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Unable to publish vacancy." }); }
});
app.patch("/api/admin/jobs/:id", adminOnly, async (req, res) => {
  try {
    const active = req.body.active === true;
    const result = await pool.query("UPDATE jobs SET active=$1 WHERE id=$2 RETURNING id, active", [active, Number(req.params.id)]);
    if (!result.rowCount) return res.status(404).json({ error: "Vacancy not found." });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Unable to update vacancy." }); }
});

app.use(express.static("public"));
app.get("*", (_req, res) => res.sendFile(require("path").join(__dirname, "public", "index.html")));

initializeDatabase().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Recruitment portal listening on ${port}`));
}).catch(err => { console.error("Database initialization failed:", err); process.exit(1); });
