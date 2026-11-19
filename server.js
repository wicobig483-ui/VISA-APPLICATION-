const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

const app = express();

// =====================================
// ENVIRONMENT AND DATABASE
// =====================================

const required = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =====================================
// MEDIA URL HELPERS
// =====================================

function optimizedImageUrl(publicId, fallbackUrl) {
  if (!publicId) return fallbackUrl || null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }]
  });
}

function optimizedVideoUrl(publicId, fallbackUrl) {
  if (!publicId) return fallbackUrl || null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "video",
    transformation: [{ quality: "auto" }]
  });
}

// =====================================
// CLOUDINARY UPLOAD CONFIGURATION
// =====================================

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "canada-recruitment",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"]
  })
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed."));
    }

    cb(null, true);
  }
});

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "canada-recruitment/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "webm"]
  })
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only MP4, MOV and WEBM videos are allowed."));
    }

    cb(null, true);
  }
});

// =====================================
// APP, SECURITY, REQUEST PARSING
// =====================================

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
        "media-src": [
          "'self'",
          "https://res.cloudinary.com",
          "blob:"
        ]
      }
    }
  })
);

app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));

// =====================================
// SESSION
// =====================================

app.use(
  session({
    store: new pgSession({
      pool,
      createTableIfMissing: true,
      tableName: "user_sessions"
    }),
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
  })
);

// =====================================
// RATE LIMITING
// =====================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.use("/api", apiLimiter);

// =====================================
// DATABASE INITIALIZATION AND MIGRATIONS
// =====================================

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT 'Full-time',
      image_url TEXT,
      image_public_id TEXT,
      video_url TEXT,
      video_public_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS image_public_id TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_public_id TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements TEXT NOT NULL DEFAULT '';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'Full-time';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS applications (
      id BIGSERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
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

    ALTER TABLE applications ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_received_email_sent_at TIMESTAMPTZ;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS under_review_email_sent_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS gallery_photos (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      image_public_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS image_public_id TEXT;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE INDEX IF NOT EXISTS applications_email_reference_idx
      ON applications (email, reference);

    CREATE INDEX IF NOT EXISTS applications_created_at_idx
      ON applications (created_at DESC);

    CREATE INDEX IF NOT EXISTS gallery_photos_created_at_idx
      ON gallery_photos (created_at DESC);
  `);
}

// =====================================
// GENERAL HELPERS
// =====================================

function clean(value, max = 500) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone) {
  const digits = phone.replace(/\D/g, "");

  return (
    /^[+]?[0-9\s().-]+$/.test(phone) &&
    digits.length >= 7 &&
    digits.length <= 15
  );
}

function adminOnly(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) {
    return res.status(401).json({
      error: "Please sign in as an administrator."
    });
  }

  next();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// =====================================
// PUBLIC: LIST ACTIVE JOBS
// =====================================
app.get("/api/jobs", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, location, description, requirements,
             employment_type, image_url, image_public_id,
             video_url, video_public_id, created_at
      FROM jobs
      WHERE active = TRUE
      ORDER BY created_at DESC
    `);

    res.json(result.rows.map((job) => ({
      ...job,
      image_url: optimizedImageUrl(job.image_public_id, job.image_url),
      video_url: optimizedVideoUrl(job.video_public_id, job.video_url)
    })));
  } catch (err) {
    console.error("Public jobs error:", err);
    res.status(500).json({
      error: "Unable to load vacancies."
    });
  }
});

// =====================================
// PUBLIC: GALLERY
// =====================================

app.get("/api/gallery", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, image_url, created_at
      FROM gallery_photos
      WHERE active = TRUE
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Public gallery error:", err);
    res.status(500).json({
      error: "Unable to load gallery."
    });
  }
});

// =====================================
// PUBLIC: SUBMIT APPLICATION
// =====================================

app.post("/api/applications", async (req, res) => {
  try {
    const fullName = clean(req.body.fullName, 120);
    const email = clean(req.body.email, 254).toLowerCase();
    const phone = clean(req.body.phone, 25);
    const country = clean(req.body.country, 100);
    const occupation = clean(req.body.occupation, 120);
    const experience = clean(req.body.experience, 80);
    const education = clean(req.body.education, 120);
    const cvStatus = clean(req.body.cvStatus, 80);
    const message = clean(req.body.message, 1500);
    const jobId = req.body.jobId ? Number(req.body.jobId) : null;
    const consent = req.body.consent === true;

    if (
      !fullName || !validEmail(email) || !phone || !validPhone(phone) ||
      !country || !occupation || !experience || !education ||
      !cvStatus || !consent
    ) {
      return res.status(400).json({
        error: "Complete all required fields, enter a valid phone number, and confirm the consent statement."
      });
    }

    if (
      jobId !== null &&
      (!Number.isSafeInteger(jobId) || jobId < 1)
    ) {
      return res.status(400).json({
        error: "Please select a valid vacancy."
      });
    }

    if (jobId !== null) {
      const job = await pool.query(
        "SELECT id FROM jobs WHERE id = $1 AND active = TRUE",
        [jobId]
      );

      if (!job.rowCount) {
        return res.status(400).json({
          error: "That vacancy is no longer available."
        });
      }
    }

    const reference =
      "CA-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    await pool.query(
      `INSERT INTO applications
       (reference, full_name, email, phone, country, occupation,
        experience, education, cv_status, job_id, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        reference, fullName, email, phone, country, occupation,
        experience, education, cvStatus, jobId, message
      ]
    );

    res.status(201).json({
      message: "Your recruitment application has been received.",
      reference,
      processingFee: "USD 40",
      paymentUrl: "https://www.paypal.com/ncp/payment/BPZVY3EVXS2S4",
      paymentNotice: "This USD 40 charge is an agency application-processing fee, not a Canadian government or IRCC visa fee. Payment does not guarantee a job, job offer, work permit, or visa approval."
    });
  } catch (err) {
    console.error("Application submission error:", err);
    res.status(500).json({
      error: "Unable to submit your application. Please try again."
    });
  }
});

// =====================================
// PUBLIC: TRACK APPLICATION
// =====================================

app.post("/api/track", async (req, res) => {
  try {
    const reference = clean(req.body.reference, 30).toUpperCase();
    const email = clean(req.body.email, 254).toLowerCase();

    if (!reference || !validEmail(email)) {
      return res.status(400).json({
        error: "Enter a valid reference number and email address."
      });
    }

    const result = await pool.query(
      `SELECT a.reference, a.status, a.created_at, a.updated_at,
              j.title AS job_title
       FROM applications a
       LEFT JOIN jobs j ON j.id = a.job_id
       WHERE a.reference = $1 AND a.email = $2`,
      [reference, email]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "No matching application was found. Check your reference number and email."
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Application tracking error:", err);
    res.status(500).json({
      error: "Unable to check application status."
    });
  }
});

// =====================================
// ADMIN: LOGIN
// =====================================

app.post(
  "/api/admin/login",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 8 }),
  (req, res) => {
    const email = clean(req.body.email, 254).toLowerCase();
    const password = String(req.body.password ?? "");
    const expectedEmail = process.env.ADMIN_EMAIL.toLowerCase();

    if (
      email !== expectedEmail ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).json({
          error: "Could not start admin session."
        });
      }

      req.session.isAdmin = true;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError);
          return res.status(500).json({
            error: "Could not save admin session."
          });
        }

        res.json({ message: "Signed in." });
      });
    });
  }
);

// =====================================
// ADMIN: LOGOUT AND SESSION STATUS
// =====================================

app.post("/api/admin/logout", adminOnly, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: "Could not sign out."
      });
    }

    res.clearCookie("recruitment.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.json({ message: "Signed out." });
  });
});

app.get("/api/admin/me", adminOnly, (_req, res) => {
  res.json({ authenticated: true });
});

// =====================================
// ADMIN: LIST APPLICATIONS
// =====================================

app.get("/api/admin/applications", adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.reference, a.full_name, a.email, a.phone,
              a.country, a.occupation, a.experience, a.education,
              a.cv_status, a.message, a.status, a.created_at,
              a.updated_at, j.title AS job_title
       FROM applications a
       LEFT JOIN jobs j ON j.id = a.job_id
       ORDER BY a.created_at DESC
       LIMIT 500`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Admin applications error:", err);
    res.status(500).json({
      error: "Unable to load applications."
    });
  }
});

// =====================================
// EMAIL: RESEND EMAIL HELPERS
// =====================================

async function sendApplicantEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error(
      "Email is not configured. Add RESEND_API_KEY and EMAIL_FROM in Render."
    );
  }

  if (typeof fetch !== "function") {
    throw new Error(
      "This server requires Node.js 18 or newer for the built-in fetch API."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      text
    })
  });

  const responseText = await response.text();
  let result = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (_err) {
    result = { message: responseText };
  }

  if (!response.ok) {
    const detail =
      result.message || result.error || responseText || response.statusText;

    throw new Error(
      `Resend rejected the email (${response.status}): ${detail}`
    );
  }

  console.log(
    "Applicant email accepted by Resend:",
    result.id || "ID unavailable"
  );

  return result;
}

// =====================================
// EMAIL: APPLICATION RECEIVED
// =====================================

async function sendApplicationReceivedEmail(application) {
  const name = escapeHtml(application.full_name);
  const reference = escapeHtml(application.reference);

  return sendApplicantEmail({
    to: application.email,
    subject: "We received your recruitment application",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#253247">
        <h2>Application Received</h2>
        <p>Dear ${name},</p>
        <p>Thank you for submitting your application. We have received it successfully.</p>
        <p>Your application reference is: <strong>${reference}</strong></p>
        <p>Please keep this reference so you can check your application status.</p>
        <p>Submission confirmation does not mean that you have been selected, offered a job, or approved for a visa.</p>
        <p>Kind regards,<br>Recruitment Team</p>
      </div>
    `,
    text:
      `Dear ${application.full_name},\n` +
      "Thank you. We have received your recruitment application.\n" +
      `Application reference: ${application.reference}\n` +
      "Please keep this reference to check your application status.\n" +
      "This confirmation is not a job offer or visa approval.\n" +
      "Kind regards,\nRecruitment Team"
  });
}

// =====================================
// EMAIL: UNDER REVIEW
// =====================================

async function sendUnderReviewEmail(application) {
  const name = escapeHtml(application.full_name);
  const reference = escapeHtml(application.reference);

  return sendApplicantEmail({
    to: application.email,
    subject: "Your recruitment application is under review",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#253247">
        <h2>Application Status Update</h2>
        <p>Dear ${name},</p>
        <p>Your recruitment application has moved to <strong>Under review</strong>.</p>
        <p>Application reference: <strong>${reference}</strong></p>
        <p>Our recruitment team is reviewing your information.</p>
        <p>This update is not a job offer, employment confirmation, or visa approval.</p>
        <p>Kind regards,<br>Recruitment Team</p>
      </div>
    `,
    text:
      `Dear ${application.full_name},\n` +
      "Your recruitment application is now Under review.\n" +
      `Reference: ${application.reference}\n` +
      "Our recruitment team is reviewing your information.\n" +
      "This is not a job offer, employment confirmation, or visa approval.\n" +
      "Kind regards,\nRecruitment Team"
  });
}

// =====================================
// ADMIN: UPDATE APPLICATION STATUS
// =====================================

const allowedApplicationStatuses = [
  "Received",
  "Under review",
  "Shortlisted",
  "Interview",
  "Offer made",
  "Not selected",
  "Closed"
];

app.patch(
  "/api/admin/applications/:id/status",
  adminOnly,
  async (req, res) => {
    const id = Number(req.params.id);
    const status = clean(req.body.status, 40);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Invalid application ID."
      });
    }

    if (!allowedApplicationStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid application status."
      });
    }

    let application;
    let shouldSendEmail = false;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT id, reference, full_name, email, status,
                under_review_email_sent_at
         FROM applications
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!existing.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Application not found."
        });
      }

      const current = existing.rows[0];
      const statusUnchanged = current.status === status;

      shouldSendEmail =
        status === "Under review" &&
        !current.under_review_email_sent_at;

      if (statusUnchanged && !shouldSendEmail) {
        await client.query("COMMIT");
        return res.json({
          message: "Application status is unchanged. The notification was already sent.",
          application: current,
          emailSent: null
        });
      }

      if (statusUnchanged) {
        application = current;
      } else {
        const updated = await client.query(
          `UPDATE applications
           SET status = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, reference, full_name, email, status,
                     created_at, updated_at`,
          [status, id]
        );

        application = updated.rows[0];
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("Application status update error:", err);
      return res.status(500).json({
        error: "Unable to update application status."
      });
    } finally {
      client.release();
    }

    let emailSent = null;
    let emailMessage = "";

    if (shouldSendEmail) {
      try {
        await sendUnderReviewEmail(application);

        await pool.query(
          `UPDATE applications
           SET under_review_email_sent_at = NOW()
           WHERE id = $1
           AND under_review_email_sent_at IS NULL`,
          [id]
        );

        emailSent = true;
        emailMessage = "Under Review notification email sent.";
      } catch (err) {
        emailSent = false;
        emailMessage = "Status saved, but notification email failed. You can retry by saving Under review again.";
        console.error("Under Review email error:", err);
      }
    }

    res.json({
      message: shouldSendEmail
        ? (emailSent
            ? "Application status saved and email sent."
            : "Application status saved, but email sending failed.")
        : "Application status updated successfully.",
      application,
      emailSent,
      emailMessage
    });
  }
);

// =====================================
// ADMIN: LIST ALL VACANCIES
// =====================================
app.get("/api/admin/jobs", adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM jobs
      ORDER BY created_at DESC
    `);

    res.json(result.rows.map((job) => ({
      ...job,
      image_url: optimizedImageUrl(job.image_public_id, job.image_url),
      video_url: optimizedVideoUrl(job.video_public_id, job.video_url)
    })));
  } catch (err) {
    console.error("Admin jobs error:", err);
    res.status(500).json({
      error: "Unable to load vacancies."
    });
  }
});

// =====================================
// ADMIN: CREATE VACANCY
// =====================================

app.post("/api/admin/jobs", adminOnly, async (req, res) => {
  try {
    const title = clean(req.body.title, 150);
    const location = clean(req.body.location, 150);
    const description = clean(req.body.description, 5000);
    const requirements = clean(req.body.requirements, 3000);

    const employmentType = clean(
      req.body.employmentType ?? req.body.employment_type ?? "Full-time",
      80
    );

    const imageUrl = clean(
      req.body.imageUrl ?? req.body.image_url,
      1000
    );

    const imagePublicId = clean(
      req.body.imagePublicId ?? req.body.image_public_id,
      255
    );

    const videoUrl = clean(
      req.body.videoUrl ?? req.body.video_url,
      1000
    );

    const videoPublicId = clean(
      req.body.videoPublicId ?? req.body.video_public_id,
      255
    );

    if (!title || !location || !description) {
      return res.status(400).json({
        error: "Title, location, and description are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO jobs
       (title, location, description, requirements, employment_type,
        image_url, image_public_id, video_url, video_public_id, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
       RETURNING *`,
      [
        title,
        location,
        description,
        requirements,
        employmentType,
        imageUrl,
        imagePublicId,
        videoUrl,
        videoPublicId
      ]
    );

    res.status(201).json({
      message: "Vacancy created successfully.",
      job: result.rows[0]
    });
  } catch (err) {
    console.error("Vacancy creation error:", err);
    res.status(500).json({
      error: "Unable to create vacancy."
    });
  }
});

// =====================================
// ADMIN: IMAGE UPLOAD
// =====================================

app.post(
  "/api/admin/uploads",
  adminOnly,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || "Image upload failed."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Please select an image."
        });
      }

      res.json({
        image: {
          url: req.file.path,
          publicId: req.file.filename
        }
      });
    });
  }
);

// =====================================
// ADMIN: VIDEO UPLOAD
// =====================================

app.post(
  "/api/admin/video-uploads",
  adminOnly,
  (req, res, next) => {
    videoUpload.single("video")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || "Video upload failed."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Please select a video."
        });
      }

      res.json({
        video: {
          url: req.file.path,
          publicId: req.file.filename
        }
      });
    });
  }
);

// =====================================
// ADMIN: UPDATE VACANCY
// =====================================

app.patch("/api/admin/jobs/:id", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Invalid vacancy ID."
      });
    }

    const existing = await pool.query(
      "SELECT * FROM jobs WHERE id = $1",
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        error: "Vacancy not found."
      });
    }

    const old = existing.rows[0];
    const body = req.body || {};

    const title = body.title !== undefined
      ? clean(body.title, 150)
      : old.title;

    const location = body.location !== undefined
      ? clean(body.location, 150)
      : old.location;

    const description = body.description !== undefined
      ? clean(body.description, 5000)
      : old.description;

    const requirements = body.requirements !== undefined
      ? clean(body.requirements, 3000)
      : old.requirements;

    const employmentType = body.employmentType !== undefined
      ? clean(body.employmentType, 80)
      : body.employment_type !== undefined
        ? clean(body.employment_type, 80)
        : old.employment_type;

    const imageUrl = body.imageUrl ?? body.image_url ?? old.image_url;

    const imagePublicId =
      body.imagePublicId ?? body.image_public_id ?? old.image_public_id;

    const videoUrl = body.videoUrl ?? body.video_url ?? old.video_url;

    const videoPublicId =
      body.videoPublicId ?? body.video_public_id ?? old.video_public_id;

    const active = typeof body.active === "boolean"
      ? body.active
      : old.active;

    if (!title || !location || !description) {
      return res.status(400).json({
        error: "Title, location, and description are required."
      });
    }

    const result = await pool.query(
      `UPDATE jobs
       SET title = $1,
           location = $2,
           description = $3,
           requirements = $4,
           employment_type = $5,
           image_url = $6,
           image_public_id = $7,
           video_url = $8,
           video_public_id = $9,
           active = $10
       WHERE id = $11
       RETURNING *`,
      [
        title,
        location,
        description,
        requirements,
        employmentType,
        imageUrl,
        imagePublicId,
        videoUrl,
        videoPublicId,
        active,
        id
      ]
    );

    res.json({
      message: "Vacancy updated successfully.",
      job: result.rows[0]
    });
  } catch (err) {
    console.error("Vacancy update error:", err);
    res.status(500).json({
      error: "Unable to update vacancy."
    });
  }
});

// =====================================
// ADMIN: ADD GALLERY PHOTO
// =====================================

app.post("/api/admin/gallery", adminOnly, async (req, res) => {
  try {
    const title = clean(req.body.title, 150);
    const description = clean(req.body.description, 1000);

    const imageUrl = clean(
      req.body.imageUrl || req.body.image_url,
      1000
    );

    const imagePublicId = clean(
      req.body.imagePublicId || req.body.image_public_id,
      255
    );

    if (!title || !imageUrl) {
      return res.status(400).json({
        error: "A title and image are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO gallery_photos
       (title, description, image_url, image_public_id, active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [title, description, imageUrl, imagePublicId]
    );

    res.status(201).json({
      message: "Gallery photo published successfully.",
      photo: result.rows[0]
    });
  } catch (err) {
    console.error("Gallery creation error:", err);
    res.status(500).json({
      error: "Unable to publish gallery photo."
    });
  }
});

// =====================================
// ADMIN: LIST GALLERY PHOTOS
// =====================================

app.get("/api/admin/gallery", adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM gallery_photos
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map((photo) => ({
      ...photo,
      image_url: optimizedImageUrl(
        photo.image_public_id,
        photo.image_url
      )
    })));
  } catch (err) {
    console.error("Admin gallery error:", err);
    res.status(500).json({
      error: "Unable to load gallery."
    });
  }
});

// =====================================
// ADMIN: SHOW OR HIDE GALLERY PHOTO
// =====================================

app.patch("/api/admin/gallery/:id", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Invalid gallery photo ID."
      });
    }

    if (typeof req.body.active !== "boolean") {
      return res.status(400).json({
        error: "Invalid gallery status."
      });
    }

    const result = await pool.query(
      `UPDATE gallery_photos
       SET active = $1
       WHERE id = $2
       RETURNING *`,
      [req.body.active, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Gallery photo not found."
      });
    }

    res.json({
      message: "Gallery photo updated successfully.",
      photo: result.rows[0]
    });
  } catch (err) {
    console.error("Gallery update error:", err);
    res.status(500).json({
      error: "Unable to update gallery photo."
    });
  }
});

// =====================================
// SERVE WEBSITE FILES
// =====================================

app.use(express.static(path.join(__dirname, "public")));

// =====================================
// SERVER STARTUP
// =====================================

const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
