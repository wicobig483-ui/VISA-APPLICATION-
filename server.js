
"use strict";

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
    transformation: [
      { quality: "auto", fetch_format: "auto" }
    ]
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
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
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
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "video/mp4",
      "video/quicktime",
      "video/webm"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Only MP4, MOV and WEBM videos are allowed.")
      );
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
        "img-src": [
          "'self'",
          "data:",
          "https://res.cloudinary.com"
        ],
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
app.use(
  express.urlencoded({
    extended: false,
    limit: "30kb"
  })
);

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
// DATABASE INITIALIZATION
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
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS approved_email_sent_at TIMESTAMPTZ;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejected_email_sent_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS employer_invoices (
      id BIGSERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      employer_name TEXT NOT NULL,
      employer_email TEXT NOT NULL,
      base_amount NUMERIC(12,2) NOT NULL CHECK (base_amount > 0),
      fee_amount NUMERIC(12,2) NOT NULL CHECK (fee_amount >= 0),
      total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
      currency TEXT NOT NULL DEFAULT 'USDT',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'paid')),
      transaction_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      verified_at TIMESTAMPTZ
    );

    ALTER TABLE employer_invoices ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
    ALTER TABLE employer_invoices ALTER COLUMN currency SET DEFAULT 'USDT';

    CREATE INDEX IF NOT EXISTS employer_invoices_created_at_idx
      ON employer_invoices (created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS employer_invoices_transaction_hash_uidx
      ON employer_invoices (transaction_hash)
      WHERE transaction_hash IS NOT NULL;

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
  const value = String(phone || "").trim();
  const digits = value.replace(/\D/g, "");

  return (
    /^[+]?[0-9\s().-]+$/.test(value) &&
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
             video_url, video_public_id, created_at,
             salary_min, salary_max, salary_period, salary_currency,
             salary_confirmed, lmia_status, work_permit_support
      FROM jobs
      WHERE active = TRUE
      ORDER BY created_at DESC
    `);

    res.json(result.rows.map((job) => ({
      ...job,
      image_url: optimizedImageUrl(
        job.image_public_id,
        job.image_url
      ),
      video_url: optimizedVideoUrl(
        job.video_public_id,
        job.video_url
      )
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
    const jobId = req.body.jobId
      ? Number(req.body.jobId)
      : null;

    const consent =
      req.body.consent === true ||
      req.body.consent === "true" ||
      req.body.consent === "on" ||
      req.body.consent === 1 ||
      req.body.consent === "1";
console.log("APPLICATION VALIDATION:", {
  fullName: fullName ? "PROVIDED" : "EMPTY",
  email: validEmail(email) ? "VALID" : "INVALID",
  phone: phone ? "PROVIDED" : "EMPTY",
  phoneValid: validPhone(phone),
  country: country ? "PROVIDED" : "EMPTY",
  occupation: occupation ? "PROVIDED" : "EMPTY",
  experience: experience ? "PROVIDED" : "EMPTY",
  education: education ? "PROVIDED" : "EMPTY",
  cvStatus: cvStatus ? "PROVIDED" : "EMPTY",
  consent,
  jobId
});
    if (
      !fullName ||
      !validEmail(email) ||
      !phone ||
      !validPhone(phone) ||
      !country ||
      !occupation ||
      !experience ||
      !education ||
      !cvStatus ||
      !consent
    ) {
      return res.status(400).json({
        error:
          "Complete all required fields, enter a valid phone number, and confirm the consent statement."
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
      "CA-" +
      crypto.randomBytes(6).toString("hex").toUpperCase();

    const insertedApplication = await pool.query(
      `INSERT INTO applications
       (reference, full_name, email, phone, country, occupation,
        experience, education, cv_status, job_id, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        reference,
        fullName,
        email,
        phone,
        country,
        occupation,
        experience,
        education,
        cvStatus,
        jobId,
        message
      ]
    );

    // Return the application response without waiting for the email provider.
    // Email delivery continues in the background and is logged if it fails.
    const savedApplication = insertedApplication.rows[0];
    void sendApplicationReceivedEmail(savedApplication)
      .then(() =>
        pool.query(
          `UPDATE applications
           SET application_received_email_sent_at = NOW()
           WHERE id = $1
             AND application_received_email_sent_at IS NULL`,
          [savedApplication.id]
        )
      )
      .catch((emailError) => {
        console.error("Application-received email error:", emailError);
      });

    res.status(201).json({
      message: "Your recruitment application has been received.",
      reference
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
    const reference = clean(
      req.body.reference,
      30
    ).toUpperCase();

    const email = clean(
      req.body.email,
      254
    ).toLowerCase();

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
        error:
          "No matching application was found. Check your reference number and email."
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
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8
  }),
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

        res.json({
          message: "Signed in."
        });
      });
    });
  }
);

// =====================================
// ADMIN: LOGOUT
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

    res.json({
      message: "Signed out."
    });
  });
});

// =====================================
// ADMIN: SESSION STATUS
// =====================================

app.get("/api/admin/me", adminOnly, (_req, res) => {
  res.json({
    authenticated: true
  });
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
// EMAIL: BREVO HTTPS API HELPER
// =====================================

async function sendApplicantEmail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;

  if (!apiKey || !fromAddress) {
    throw new Error(
      "Email is not configured. Add BREVO_API_KEY and EMAIL_FROM in Render."
    );
  }

  const senderMatch = fromAddress.match(/^(.*?)\s*<([^<>]+)>$/);
  const sender = senderMatch
    ? { name: senderMatch[1].trim(), email: senderMatch[2].trim() }
    : { email: fromAddress.trim() };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey.trim(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text
    }),
    signal: AbortSignal.timeout(20000)
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = responseBody.message || responseBody.code || `HTTP ${response.status}`;
    throw new Error(`Brevo API rejected the email: ${detail}`);
  }

  console.log(
    "Applicant email accepted by Brevo API:",
    responseBody.messageId || "Message ID unavailable"
  );

  return responseBody;
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

async function sendApprovedEmail(application) {
  const name = escapeHtml(application.full_name);
  const reference = escapeHtml(application.reference);

  return sendApplicantEmail({
    to: application.email,
    subject: "An update on your recruitment application",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#253247">
        <h2>Application Status Update</h2>
        <p>Dear ${name},</p>
        <p>Your recruitment application status has been updated to <strong>Approved</strong> by the recruitment team.</p>
        <p>Application reference: <strong>${reference}</strong></p>
        <p>This status update is not a job offer, employment contract, work permit, or visa approval. Any next steps will be communicated separately.</p>
        <p>Kind regards,<br>Recruitment Team</p>
      </div>
    `,
    text:
      `Dear ${application.full_name},\n` +
      "Your recruitment application status has been updated to Approved.\n" +
      `Reference: ${application.reference}\n` +
      "This is not a job offer, employment contract, work permit, or visa approval. Any next steps will be communicated separately.\n" +
      "Kind regards,\nRecruitment Team"
  });
}

async function sendRejectedEmail(application) {
  const name = escapeHtml(application.full_name);
  const reference = escapeHtml(application.reference);

  return sendApplicantEmail({
    to: application.email,
    subject: "An update on your recruitment application",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#253247">
        <h2>Application Status Update</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest. After review, your recruitment application status has been updated to <strong>Rejected</strong>.</p>
        <p>Application reference: <strong>${reference}</strong></p>
        <p>This decision relates to this recruitment application only. It is not an immigration or visa decision.</p>
        <p>Kind regards,<br>Recruitment Team</p>
      </div>
    `,
    text:
      `Dear ${application.full_name},\n` +
      "Thank you for your interest. After review, your recruitment application status has been updated to Rejected.\n" +
      `Reference: ${application.reference}\n` +
      "This decision relates to this recruitment application only. It is not an immigration or visa decision.\n" +
      "Kind regards,\nRecruitment Team"
  });
}

// =====================================
// ADMIN: UPDATE APPLICATION STATUS
// =====================================

app.patch(
  "/api/admin/applications/:id/status",
  adminOnly,
  async (req, res) => {
    const id = Number(req.params.id);
    const status = clean(req.body.status, 50);

    const allowedStatuses = [
      "Received",
      "Under review",
      "Approved",
      "Rejected"
    ];

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Invalid application ID."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid application status."
      });
    }

    try {
      const result = await pool.query(
        `UPDATE applications
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Application not found."
        });
      }

      const application = result.rows[0];

      const emailEvents = {
        "Under review": {
          sentAt: "under_review_email_sent_at",
          send: sendUnderReviewEmail
        },
        "Approved": {
          sentAt: "approved_email_sent_at",
          send: sendApprovedEmail
        },
        "Rejected": {
          sentAt: "rejected_email_sent_at",
          send: sendRejectedEmail
        }
      };

      const emailEvent = emailEvents[status];

      if (emailEvent && !application[emailEvent.sentAt]) {
        try {
          await emailEvent.send(application);
          await pool.query(
            `UPDATE applications
             SET ${emailEvent.sentAt} = NOW()
             WHERE id = $1
               AND ${emailEvent.sentAt} IS NULL`,
            [id]
          );
        } catch (emailError) {
          console.error(`${status} application email error:`, emailError);
        }
      }

      res.json({
        message: "Application status updated successfully.",
        application: {
          id: application.id,
          reference: application.reference,
          status: application.status,
          updated_at: application.updated_at
        }
      });
    } catch (err) {
      console.error("Update application status error:", err);

      res.status(500).json({
        error: "Unable to update application status."
      });
    }
  }
);

// =====================================
// ADMIN: LIST JOBS
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
      image_url: optimizedImageUrl(
        job.image_public_id,
        job.image_url
      ),
      video_url: optimizedVideoUrl(
        job.video_public_id,
        job.video_url
      )
    })));
  } catch (err) {
    console.error("Admin jobs error:", err);

    res.status(500).json({
      error: "Unable to load jobs."
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
      req.body.employmentType || "Full-time",
      80
    );
    const salaryMin = req.body.salaryMin === "" || req.body.salaryMin == null
      ? null : Number(req.body.salaryMin);
    const salaryMax = req.body.salaryMax === "" || req.body.salaryMax == null
      ? null : Number(req.body.salaryMax);
    const salaryPeriod = clean(req.body.salaryPeriod, 20).toLowerCase();
    const salaryConfirmed = req.body.salaryConfirmed === true;
    const lmiaStatus = clean(req.body.lmiaStatus || "Not verified", 40);
    const workPermitSupport = clean(req.body.workPermitSupport || "Not verified", 40);
    const validPeriods = ["hourly", "weekly", "monthly", "annual"];
    const validLmia = [
      "Not verified", "LMIA required", "LMIA application in progress",
      "LMIA approved", "LMIA not required", "Not applicable"
    ];
    const validWorkPermit = [
      "Not verified", "Employer may support", "Employer support confirmed",
      "No support offered", "Not applicable"
    ];

    if (!title || !location || !description) {
      return res.status(400).json({
        error: "Title, location and description are required."
      });
    }
    if (
      !Number.isFinite(salaryMin) || salaryMin <= 0 ||
      (salaryMax !== null && (!Number.isFinite(salaryMax) || salaryMax < salaryMin)) ||
      !validPeriods.includes(salaryPeriod) ||
      !salaryConfirmed
    ) {
      return res.status(400).json({
        error: "Enter a valid starting salary, optional maximum salary, pay period, and confirm that the employer has verified the salary."
      });
    }
    if (!validLmia.includes(lmiaStatus) || !validWorkPermit.includes(workPermitSupport)) {
      return res.status(400).json({ error: "Select valid LMIA and work-permit support statuses." });
    }

    const result = await pool.query(
      `INSERT INTO jobs
       (title, location, description, requirements, employment_type,
        salary_min, salary_max, salary_period, salary_currency, salary_confirmed,
        lmia_status, work_permit_support)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CAD', $9, $10, $11)
       RETURNING *`,
      [
        title, location, description, requirements, employmentType,
        salaryMin, salaryMax, salaryPeriod, salaryConfirmed,
        lmiaStatus, workPermitSupport
      ]
    );

    res.status(201).json({
      message: "Vacancy created successfully.",
      job: result.rows[0]
    });
  } catch (err) {
    console.error("Create job error:", err);

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
  (req, res) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Image upload error:", err);

        return res.status(400).json({
          error: err.message || "Unable to upload image."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Please select an image."
        });
      }

      res.status(201).json({
        message: "Image uploaded successfully.",
        url: req.file.path,
        public_id: req.file.filename
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
  (req, res) => {
    videoUpload.single("video")(req, res, (err) => {
      if (err) {
        console.error("Video upload error:", err);

        return res.status(400).json({
          error: err.message || "Unable to upload video."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Please select a video."
        });
      }

      res.status(201).json({
        message: "Video uploaded successfully.",
        url: req.file.path,
        public_id: req.file.filename
      });
    });
  }
);

// =====================================
// ADMIN: UPDATE VACANCY VISIBILITY
// =====================================

app.patch(
  "/api/admin/jobs/:id/status",
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid vacancy ID." });
      }

      if (typeof req.body.active !== "boolean") {
        return res.status(400).json({
          error: "A true or false visibility value is required."
        });
      }

      const result = await pool.query(
        "UPDATE jobs SET active = $1 WHERE id = $2 RETURNING id, title, active",
        [req.body.active, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Vacancy not found." });
      }

      res.json({
        message: result.rows[0].active
          ? "Vacancy published successfully."
          : "Vacancy hidden successfully.",
        job: result.rows[0]
      });
    } catch (err) {
      console.error("Update vacancy visibility error:", err);
      res.status(500).json({
        error: "Unable to change vacancy visibility."
      });
    }
  }
);

// =====================================
// ADMIN: UPDATE VACANCY
// =====================================

app.patch(
  "/api/admin/jobs/:id",
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
          error: "Invalid vacancy ID."
        });
      }

      // Allow the Publish/Hide button to update only the visibility flag.
      // This preserves the vacancy's existing title, description, media and requirements.
      const hasActive = Object.prototype.hasOwnProperty.call(req.body, "active");
      const hasVacancyFields = [
        "title", "location", "description", "requirements",
        "employmentType", "image_url", "image_public_id",
        "video_url", "video_public_id", "salaryMin", "salaryMax",
        "salaryPeriod", "salaryConfirmed", "lmiaStatus", "workPermitSupport"
      ].some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

      if (hasActive && !hasVacancyFields) {
        const active =
          req.body.active === true ||
          req.body.active === "true" ||
          req.body.active === "on" ||
          req.body.active === 1 ||
          req.body.active === "1";

        const result = await pool.query(
          "UPDATE jobs SET active = $1 WHERE id = $2 RETURNING *",
          [active, id]
        );

        if (!result.rowCount) {
          return res.status(404).json({
            error: "Vacancy not found."
          });
        }

        return res.json({
          message: "Vacancy visibility updated successfully.",
          job: result.rows[0]
        });
      }

      const title = clean(req.body.title, 150);
      const location = clean(req.body.location, 150);
      const description = clean(req.body.description, 5000);
      const requirements = clean(req.body.requirements, 3000);

      const employmentType = clean(
        req.body.employmentType || "Full-time",
        80
      );

      const active =
        req.body.active === true ||
        req.body.active === "true" ||
        req.body.active === "on" ||
        req.body.active === 1 ||
        req.body.active === "1";

      const imageUrl = clean(req.body.image_url, 2000);
      const imagePublicId = clean(req.body.image_public_id, 300);
      const videoUrl = clean(req.body.video_url, 2000);
      const videoPublicId = clean(req.body.video_public_id, 300);
      const hasSalaryMin = Object.prototype.hasOwnProperty.call(req.body, "salaryMin");
      const hasSalaryMax = Object.prototype.hasOwnProperty.call(req.body, "salaryMax");
      const hasSalaryPeriod = Object.prototype.hasOwnProperty.call(req.body, "salaryPeriod");
      const hasSalaryConfirmed = Object.prototype.hasOwnProperty.call(req.body, "salaryConfirmed");
      const hasLmiaStatus = Object.prototype.hasOwnProperty.call(req.body, "lmiaStatus");
      const hasWorkPermitSupport = Object.prototype.hasOwnProperty.call(req.body, "workPermitSupport");
      const salaryMin = req.body.salaryMin === "" || req.body.salaryMin == null
        ? null : Number(req.body.salaryMin);
      const salaryMax = req.body.salaryMax === "" || req.body.salaryMax == null
        ? null : Number(req.body.salaryMax);
      const salaryPeriod = clean(req.body.salaryPeriod, 20).toLowerCase();
      const salaryConfirmed = req.body.salaryConfirmed === true;
      const lmiaStatus = clean(req.body.lmiaStatus || "Not verified", 40);
      const workPermitSupport = clean(req.body.workPermitSupport || "Not verified", 40);
      const validPeriods = ["hourly", "weekly", "monthly", "annual"];
      const validLmia = [
        "Not verified", "LMIA required", "LMIA application in progress",
        "LMIA approved", "LMIA not required", "Not applicable"
      ];
      const validWorkPermit = [
        "Not verified", "Employer may support", "Employer support confirmed",
        "No support offered", "Not applicable"
      ];

      if (hasSalaryMin || hasSalaryMax || hasSalaryPeriod || hasSalaryConfirmed) {
        if (
          !Number.isFinite(salaryMin) || salaryMin <= 0 ||
          (salaryMax !== null && (!Number.isFinite(salaryMax) || salaryMax < salaryMin)) ||
          !validPeriods.includes(salaryPeriod) ||
          !salaryConfirmed
        ) {
          return res.status(400).json({
            error: "Enter a valid starting salary, optional maximum salary, pay period, and confirm that the employer has verified the salary."
          });
        }
      }
      if ((hasLmiaStatus && !validLmia.includes(lmiaStatus)) ||
          (hasWorkPermitSupport && !validWorkPermit.includes(workPermitSupport))) {
        return res.status(400).json({ error: "Select valid LMIA and work-permit support statuses." });
      }

      if (!title || !location || !description) {
        return res.status(400).json({
          error: "Title, location and description are required."
        });
      }

      const result = await pool.query(
        `UPDATE jobs
         SET title = $1,
             location = $2,
             description = $3,
             requirements = $4,
             employment_type = $5,
             active = CASE WHEN $24 THEN $25::boolean ELSE active END,
             image_url = NULLIF($7, ''),
             image_public_id = NULLIF($8, ''),
             video_url = NULLIF($9, ''),
             video_public_id = NULLIF($10, ''),
             salary_min = CASE WHEN $12 THEN $13::numeric ELSE salary_min END,
             salary_max = CASE WHEN $14 THEN $15::numeric ELSE salary_max END,
             salary_period = CASE WHEN $16 THEN NULLIF($17, '') ELSE salary_period END,
             salary_currency = CASE WHEN $16 THEN 'CAD' ELSE salary_currency END,
             salary_confirmed = CASE WHEN $18 THEN $19::boolean ELSE salary_confirmed END,
             lmia_status = CASE WHEN $20 THEN $21 ELSE lmia_status END,
             work_permit_support = CASE WHEN $22 THEN $23 ELSE work_permit_support END
         WHERE id = $11
         RETURNING *`,
        [
          title,
          location,
          description,
          requirements,
          employmentType,
          active,
          imageUrl,
          imagePublicId,
          videoUrl,
          videoPublicId,
          id,
          hasSalaryMin, salaryMin,
          hasSalaryMax, salaryMax,
          hasSalaryPeriod, salaryPeriod,
          hasSalaryConfirmed, salaryConfirmed,
          hasLmiaStatus, lmiaStatus,
          hasWorkPermitSupport, workPermitSupport,
          hasActive, active
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Vacancy not found."
        });
      }

      res.json({
        message: "Vacancy updated successfully.",
        job: result.rows[0]
      });
    } catch (err) {
      console.error("Update job error:", err);

      res.status(500).json({
        error: "Unable to update vacancy."
      });
    }
  }
);

// =====================================
// ADMIN: DELETE VACANCY
// =====================================

app.delete("/api/admin/jobs/:id", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid vacancy ID." });
    }

    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 RETURNING id, title",
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Vacancy not found." });
    }

    res.json({
      message: "Vacancy deleted successfully.",
      job: result.rows[0]
    });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ error: "Unable to delete vacancy." });
  }
});

// =====================================
// ADMIN: CREATE GALLERY PHOTO
// =====================================

app.post(
  "/api/admin/gallery",
  adminOnly,
  async (req, res) => {
    try {
      const title = clean(req.body.title, 150);
      const description = clean(req.body.description, 2000);
      const imageUrl = clean(req.body.image_url, 2000);
      const imagePublicId = clean(req.body.image_public_id, 300);

      if (!title || (!imageUrl && !imagePublicId)) {
        return res.status(400).json({
          error: "A title and uploaded image are required."
        });
      }

      const result = await pool.query(
        `INSERT INTO gallery_photos
         (title, description, image_url, image_public_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          title,
          description,
          imageUrl,
          imagePublicId || null
        ]
      );

      res.status(201).json({
        message: "Gallery photo added successfully.",
        photo: result.rows[0]
      });
    } catch (err) {
      console.error("Create gallery photo error:", err);

      res.status(500).json({
        error: "Unable to add gallery photo."
      });
    }
  }
);

// =====================================
// ADMIN: LIST GALLERY PHOTOS
// =====================================

app.get(
  "/api/admin/gallery",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT *
        FROM gallery_photos
        ORDER BY created_at DESC
      `);

      res.json(result.rows);
    } catch (err) {
      console.error("Admin gallery error:", err);

      res.status(500).json({
        error: "Unable to load gallery photos."
      });
    }
  }
);

// =====================================
// ADMIN: UPDATE GALLERY PHOTO
// =====================================

app.patch(
  "/api/admin/gallery/:id",
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
          error: "Invalid gallery photo ID."
        });
      }

      const title = clean(req.body.title, 150);
      const description = clean(req.body.description, 2000);
      const imageUrl = clean(req.body.image_url, 2000);
      const imagePublicId = clean(req.body.image_public_id, 300);

      const active =
        req.body.active === true ||
        req.body.active === "true" ||
        req.body.active === "on" ||
        req.body.active === 1 ||
        req.body.active === "1";

      if (!title) {
        return res.status(400).json({
          error: "Gallery photo title is required."
        });
      }

      const result = await pool.query(
        `UPDATE gallery_photos
         SET title = $1,
             description = $2,
             image_url = COALESCE(NULLIF($3, ''), image_url),
             image_public_id = COALESCE(NULLIF($4, ''), image_public_id),
             active = $5
         WHERE id = $6
         RETURNING *`,
        [
          title,
          description,
          imageUrl,
          imagePublicId,
          active,
          id
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Gallery photo not found."
        });
      }

      res.json({
        message: "Gallery photo updated successfully.",
        photo: result.rows[0]
      });
    } catch (err) {
      console.error("Update gallery photo error:", err);

      res.status(500).json({
        error: "Unable to update gallery photo."
      });
    }
  }
);

// =====================================
// EMPLOYER INVOICES: ADMIN CREATE AND LIST
// =====================================

app.post("/api/admin/invoices", adminOnly, async (req, res) => {
  try {
    const employerName = clean(req.body.employerName, 150);
    const employerEmail = clean(req.body.employerEmail, 254).toLowerCase();
    const rawAmount = Number(req.body.baseAmount);

    if (!employerName || !validEmail(employerEmail)) {
      return res.status(400).json({
        error: "Enter a valid employer name and email address."
      });
    }

    if (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 10000000) {
      return res.status(400).json({
        error: "Enter an invoice amount greater than 0 and no more than 10,000,000 USD."
      });
    }

    const baseCents = Math.round(rawAmount * 100);
    if (baseCents < 1) {
      return res.status(400).json({
        error: "Invoice amount must be at least 0.01 USD."
      });
    }
    const feeCents = Math.round(baseCents * 0.08);
    const totalCents = baseCents + feeCents;
    const baseAmount = (baseCents / 100).toFixed(2);
    const feeAmount = (feeCents / 100).toFixed(2);
    const totalAmount = (totalCents / 100).toFixed(2);
    const reference = "INV-" + crypto.randomBytes(12).toString("hex").toUpperCase();

    const result = await pool.query(
      `INSERT INTO employer_invoices
       (reference, employer_name, employer_email, base_amount, fee_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reference, employer_name, employer_email,
                 base_amount, fee_amount, total_amount, currency,
                 status, created_at`,
      [reference, employerName, employerEmail, baseAmount, feeAmount, totalAmount]
    );

    res.status(201).json({
      message: "Employer invoice created.",
      invoice: result.rows[0],
      paymentUrl: "/invoice.html?ref=" + encodeURIComponent(reference)
    });
  } catch (err) {
    console.error("Create employer invoice error:", err);
    res.status(500).json({ error: "Unable to create employer invoice." });
  }
});

app.get("/api/admin/invoices", adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reference, employer_name, employer_email,
              base_amount, fee_amount, total_amount, currency,
              status, transaction_hash, created_at, submitted_at, paid_at
       FROM employer_invoices
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List employer invoices error:", err);
    res.status(500).json({ error: "Unable to load employer invoices." });
  }
});

// =====================================
// EMPLOYER INVOICES: PUBLIC VIEW / TX SUBMISSION
// =====================================

app.get("/api/invoices/:reference", async (req, res) => {
  try {
    const reference = clean(req.params.reference, 30).toUpperCase();
    const result = await pool.query(
      `SELECT reference, employer_name, base_amount, fee_amount,
              total_amount, currency, status, created_at
       FROM employer_invoices
       WHERE reference = $1`,
      [reference]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    res.json({
      invoice: result.rows[0],
      network: "TRON (TRC20)",
      walletAddress: process.env.USDT_TRC20_ADDRESS || DEFAULT_USDT_TRC20_ADDRESS
    });
  } catch (err) {
    console.error("Public invoice lookup error:", err);
    res.status(500).json({ error: "Unable to load invoice." });
  }
});

app.post("/api/invoices/:reference/transaction", async (req, res) => {
  try {
    const reference = clean(req.params.reference, 30).toUpperCase();
    const transactionHash = clean(req.body.transactionHash, 128).toLowerCase();

    if (!/^[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        error: "Enter a valid 64-character TRON transaction hash."
      });
    }

    if (!(process.env.USDT_TRC20_ADDRESS || DEFAULT_USDT_TRC20_ADDRESS)) {
      return res.status(503).json({
        error: "USDT TRC20 payment details are not configured. Contact the administrator."
      });
    }

    const result = await pool.query(
      `UPDATE employer_invoices
       SET transaction_hash = $1,
           status = 'submitted',
           submitted_at = NOW()
       WHERE reference = $2
         AND status = 'pending'
       RETURNING reference, status, submitted_at`,
      [transactionHash, reference]
    );

    if (!result.rowCount) {
      const existing = await pool.query(
        "SELECT status FROM employer_invoices WHERE reference = $1",
        [reference]
      );

      if (!existing.rowCount) {
        return res.status(404).json({ error: "Invoice not found." });
      }

      return res.status(409).json({
        error: "This invoice has already had a transaction submitted or has been paid."
      });
    }

    res.json({
      message: "Transaction hash submitted for administrator verification. Payment is not yet marked as paid.",
      invoice: result.rows[0]
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "This transaction hash has already been submitted for another invoice."
      });
    }
    console.error("Submit invoice transaction error:", err);
    res.status(500).json({ error: "Unable to submit transaction hash." });
  }
});

// =====================================
// EMPLOYER INVOICES: ADMIN MARK PAID
// =====================================

// =====================================
// EMPLOYER INVOICES: VERIFY TRC20 PAYMENT
// =====================================

const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const DEFAULT_USDT_TRC20_ADDRESS = "TDHY35mVCLuFPB7gAwG6cPvhTAgV5FmNZU";

app.patch("/api/admin/invoices/:id/paid", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid invoice ID." });
    }

    const apiKey = process.env.TRONGRID_API_KEY;
    const walletAddress = process.env.USDT_TRC20_ADDRESS || DEFAULT_USDT_TRC20_ADDRESS;
    if (!apiKey || !walletAddress) {
      return res.status(503).json({
        error: "Automatic verification is not configured. Add TRONGRID_API_KEY and check USDT_TRC20_ADDRESS in Render."
      });
    }

    const invoiceResult = await pool.query(
      `SELECT id, reference, total_amount, status, transaction_hash, created_at
       FROM employer_invoices WHERE id = $1`,
      [id]
    );
    if (!invoiceResult.rowCount) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    const invoice = invoiceResult.rows[0];
    if (invoice.status !== "submitted" || !invoice.transaction_hash) {
      return res.status(409).json({
        error: "This invoice does not have a transaction awaiting verification."
      });
    }

    const expectedUnits = BigInt(Math.round(Number(invoice.total_amount) * 100)) * 10000n;
    const minTimestamp = Math.max(
      0,
      new Date(invoice.created_at).getTime() - 60000
    );
    let fingerprint = "";
    let matchingTransfer = null;
    let pagesChecked = 0;

    do {
      const query = new URLSearchParams({
        only_confirmed: "true",
        only_to: "true",
        limit: "200",
        contract_address: TRON_USDT_CONTRACT,
        min_timestamp: String(minTimestamp)
      });
      if (fingerprint) query.set("fingerprint", fingerprint);

      const url =
        "https://api.trongrid.io/v1/accounts/" +
        encodeURIComponent(walletAddress) +
        "/transactions/trc20?" + query.toString();

      const chainResponse = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "TRON-PRO-API-KEY": apiKey
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!chainResponse.ok) {
        console.error("TronGrid verification returned:", chainResponse.status);
        return res.status(502).json({
          error: "Could not verify the payment with TRON right now. Please try again later."
        });
      }

      const chainData = await chainResponse.json();
      if (chainData.success === false || !Array.isArray(chainData.data)) {
        return res.status(502).json({
          error: "TRON returned an unexpected verification response."
        });
      }

      matchingTransfer = chainData.data.find((transfer) =>
        String(transfer.transaction_id || "").toLowerCase() ===
          invoice.transaction_hash.toLowerCase()
      ) || null;

      if (matchingTransfer) break;

      fingerprint = chainData.meta && chainData.meta.fingerprint
        ? chainData.meta.fingerprint
        : "";
      pagesChecked += 1;
    } while (fingerprint && pagesChecked < 10);

    if (!matchingTransfer) {
      return res.status(409).json({
        error: "No confirmed USDT transfer matching this transaction hash was found for the receiving wallet."
      });
    }

    // only_confirmed=true on the TRONGrid query filters this list to
    // confirmed chain transactions. TRC20 event records do not reliably
    // include a per-transfer "success" boolean, so do not require one.
    const transferTimestamp = Number(matchingTransfer.block_timestamp);
    const validTransfer =
      matchingTransfer.type === "Transfer" &&
      Number.isFinite(transferTimestamp) &&
      transferTimestamp >= minTimestamp &&
      transferTimestamp <= Date.now() &&
      matchingTransfer.to === walletAddress &&
      matchingTransfer.token_info &&
      matchingTransfer.token_info.address === TRON_USDT_CONTRACT &&
      Number(matchingTransfer.token_info.decimals) === 6 &&
      /^\d+$/.test(String(matchingTransfer.value || "")) &&
      BigInt(matchingTransfer.value) === expectedUnits;

    if (!validTransfer) {
      return res.status(409).json({
        error: "The confirmed transaction does not match the required USDT token, receiving wallet, or exact invoice amount."
      });
    }

    const result = await pool.query(
      `UPDATE employer_invoices
       SET status = 'paid', paid_at = NOW(), verified_at = NOW()
       WHERE id = $1 AND status = 'submitted'
         AND transaction_hash = $2
       RETURNING id, reference, status, paid_at, verified_at`,
      [id, invoice.transaction_hash]
    );

    if (!result.rowCount) {
      return res.status(409).json({
        error: "Invoice changed while verification was running. Refresh the invoice list and try again."
      });
    }

    res.json({
      message: "Confirmed TRC20 USDT payment verified. Invoice marked paid.",
      invoice: result.rows[0]
    });
  } catch (err) {
    console.error("Verify invoice payment error:", err);
    res.status(500).json({
      error: "Unable to verify the payment. Please try again later."
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
                          
