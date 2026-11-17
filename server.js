
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

// DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

// REQUIRED ENVIRONMENT VARIABLES
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

// CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// IMAGE STORAGE
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "canada-recruitment",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"]
  })
});

const upload = multer({
  storage,
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

// VIDEO STORAGE
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

app.set("trust proxy", 1);

// SECURITY HEADERS
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

// REQUEST PARSING
app.use(express.json({
  limit: "30kb"
}));

app.use(express.urlencoded({
  extended: false,
  limit: "30kb"
}));

// SESSION
app.use(session({
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
}));

// RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.use("/api", limiter);

// DATABASE INITIALIZATION
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

    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS image_url TEXT;

    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS image_public_id TEXT;

    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS video_url TEXT;

    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS video_public_id TEXT;

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

    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS gallery_photos (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      image_public_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS applications_email_reference_idx
      ON applications (email, reference);

    CREATE INDEX IF NOT EXISTS applications_created_at_idx
      ON applications (created_at DESC);

    CREATE INDEX IF NOT EXISTS gallery_photos_created_at_idx
      ON gallery_photos (created_at DESC);
  `);
}

// HELPERS
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

// PUBLIC JOBS
app.get("/api/jobs", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        location,
        description,
        requirements,
        employment_type,
        image_url,
        video_url,
        video_public_id
      FROM jobs
      WHERE active = TRUE
      ORDER BY created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to load vacancies."
    });
  }
});

// PUBLIC GALLERY
app.get("/api/gallery", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        description,
        image_url,
        created_at
      FROM gallery_photos
      WHERE active = TRUE
      ORDER BY created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to load gallery."
    });
  }
});

// APPLICATION SUBMISSION
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

    const consent = req.body.consent === true;

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

    await pool.query(
      `INSERT INTO applications
      (
        reference,
        full_name,
        email,
        phone,
        country,
        occupation,
        experience,
        education,
        cv_status,
        job_id,
        message
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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

    res.status(201).json({
      message: "Your recruitment application has been received.",
      reference
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to submit your application. Please try again."
    });
  }
});

// TRACK APPLICATION
app.post("/api/track", async (req, res) => {
  try {
    const reference =
      clean(req.body.reference, 30).toUpperCase();

    const email =
      clean(req.body.email, 254).toLowerCase();

    if (!reference || !validEmail(email)) {
      return res.status(400).json({
        error: "Enter a valid reference number and email address."
      });
    }

    const result = await pool.query(
      `SELECT
        a.reference,
        a.status,
        a.created_at,
        a.updated_at,
        j.title AS job_title
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      WHERE a.reference = $1
      AND a.email = $2`,
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
    console.error(err);

    res.status(500).json({
      error: "Unable to check application status."
    });
  }
});

// ADMIN LOGIN
app.post(
  "/api/admin/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8
  }),
  (req, res) => {
    const email =
      clean(req.body.email, 254).toLowerCase();

    const password =
      String(req.body.password ?? "");

    const expectedEmail =
      process.env.ADMIN_EMAIL.toLowerCase();

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
        return res.status(500).json({
          error: "Could not start admin session."
        });
      }

      req.session.isAdmin = true;

      req.session.save((saveError) => {
        if (saveError) {
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

// ADMIN LOGOUT
app.post(
  "/api/admin/logout",
  adminOnly,
  (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: "Could not sign out."
        });
      }

      res.clearCookie("recruitment.sid");

      res.json({
        message: "Signed out."
      });
    });
  }
);

// ADMIN STATUS
app.get(
  "/api/admin/me",
  adminOnly,
  (_req, res) => {
    res.json({
      authenticated: true
    });
  }
);

// UPLOAD IMAGE
app.post(
  "/api/admin/uploads",
  adminOnly,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "Please select an image."
      });
    }

    const imageUrl =
      req.file.secure_url ||
      req.file.path;

    const imagePublicId =
      req.file.public_id ||
      req.file.filename;

    if (!imageUrl) {
      return res.status(500).json({
        error: "Cloudinary did not return an image URL."
      });
    }

    res.status(201).json({
      image: {
        url: imageUrl,
        publicId: imagePublicId
      }
    });
  }
);

// UPLOAD JOB VIDEO
app.post(
  "/api/admin/video-uploads",
  adminOnly,
  videoUpload.single("video"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "Please select a video."
      });
    }

    const videoUrl =
      req.file.secure_url ||
      req.file.path;

    const videoPublicId =
      req.file.public_id ||
      req.file.filename;

    if (!videoUrl) {
      return res.status(500).json({
        error: "Cloudinary did not return a video URL."
      });
    }

    res.status(201).json({
      video: {
        url: videoUrl,
        publicId: videoPublicId
      }
    });
  }
);

// ADMIN GALLERY: CREATE
app.post(
  "/api/admin/gallery",
  adminOnly,
  async (req, res) => {
    try {
      const title = clean(req.body.title, 150);
      const description = clean(req.body.description, 1000);
      const imageUrl = clean(req.body.imageUrl, 2000);
      const imagePublicId = clean(req.body.imagePublicId, 500);

      if (!title || !imageUrl) {
        return res.status(400).json({
          error: "Photo title and image are required."
        });
      }

      const result = await pool.query(
        `INSERT INTO gallery_photos
        (
          title,
          description,
          image_url,
          image_public_id
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *`,
        [
          title,
          description,
          imageUrl,
          imagePublicId || null
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to save gallery photo."
      });
    }
  }
);

// ADMIN GALLERY: LIST
app.get(
  "/api/admin/gallery",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          title,
          description,
          image_url,
          image_public_id,
          active,
          created_at
        FROM gallery_photos
        ORDER BY created_at DESC
      `);

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to load gallery photos."
      });
    }
  }
);

// ADMIN GALLERY: SHOW/HIDE
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

      if (typeof req.body.active !== "boolean") {
        return res.status(400).json({
          error: "Invalid gallery visibility value."
        });
      }

      const result = await pool.query(
        `UPDATE gallery_photos
        SET active = $1
        WHERE id = $2
        RETURNING id, active`,
        [req.body.active, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Gallery photo not found."
        });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to update gallery photo."
      });
    }
  }
);

// ADMIN APPLICATIONS
app.get(
  "/api/admin/applications",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          a.id,
          a.reference,
          a.full_name,
          a.email,
          a.phone,
          a.country,
          a.occupation,
          a.experience,
          a.education,
          a.cv_status,
          a.message,
          a.status,
          a.created_at,
          a.updated_at,
          j.title AS job_title
        FROM applications a
        LEFT JOIN jobs j ON j.id = a.job_id
        ORDER BY a.created_at DESC
        LIMIT 500`
      );

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to load applications."
      });
    }
  }
);

// UPDATE APPLICATION STATUS
app.patch(
  "/api/admin/applications/:id/status",
  adminOnly,
  async (req, res) => {
    const status = clean(req.body.status, 40);

    const allowed = [
      "Received",
      "Under review",
      "Shortlisted",
      "Interview",
      "Offer made",
      "Not selected",
      "Closed"
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: "Invalid status."
      });
    }

    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
          error: "Invalid application ID."
        });
      }

      const result = await pool.query(
        `UPDATE applications
        SET status = $1,
        updated_at = NOW()
        WHERE id = $2
        RETURNING id, reference, status`,
        [status, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Application not found."
        });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to update status."
      });
    }
  }
);

// ADMIN: LIST ALL VACANCIES
app.get(
  "/api/admin/jobs",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          title,
          location,
          description,
          requirements,
          employment_type,
          image_url,
          image_public_id,
          video_url,
          video_public_id,
          active,
          created_at
        FROM jobs
        ORDER BY created_at DESC
      `);

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to load vacancies."
      });
    }
  }
);

// CREATE VACANCY
app.post(
  "/api/admin/jobs",
  adminOnly,
  async (req, res) => {
    const title = clean(req.body.title, 150);
    const location = clean(req.body.location, 120);
    const description = clean(req.body.description, 3000);
    const requirements = clean(req.body.requirements, 3000);

    const employmentType = clean(
      req.body.employmentType || "Full-time",
      60
    );

    const imageUrl = clean(req.body.imageUrl, 2000);
    const imagePublicId = clean(req.body.imagePublicId, 500);
    const videoUrl = clean(req.body.videoUrl, 2000);
    const videoPublicId = clean(req.body.videoPublicId, 500);

    if (!title || !location || !description) {
      return res.status(400).json({
        error: "Title, location and description are required."
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO jobs
        (
          title,
          location,
          description,
          requirements,
          employment_type,
          image_url,
          image_public_id,
          video_url,
          video_public_id
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          title,
          location,
          description,
          requirements,
          employmentType,
          imageUrl || null,
          imagePublicId || null,
          videoUrl || null,
          videoPublicId || null
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to publish vacancy."
      });
    }
  }
);

// EDIT / ACTIVATE / DEACTIVATE JOB
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

      const fields = {
        title: ["title", 150],
        location: ["location", 120],
        description: ["description", 3000],
        requirements: ["requirements", 3000],
        employmentType: ["employment_type", 60],
        imageUrl: ["image_url", 2000],
        imagePublicId: ["image_public_id", 500],
        videoUrl: ["video_url", 2000],
        videoPublicId: ["video_public_id", 500]
      };

      const updates = [];
      const values = [];

      for (const [key, [column, max]] of Object.entries(fields)) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          const value = clean(req.body[key], max);

          if (
            ["title", "location", "description"].includes(key) &&
            !value
          ) {
            return res.status(400).json({
              error: `${key} cannot be empty.`
            });
          }

          values.push(value || null);
          updates.push(`${column} = $${values.length}`);
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
        if (typeof req.body.active !== "boolean") {
          return res.status(400).json({
            error: "Invalid vacancy visibility value."
          });
        }

        values.push(req.body.active);
        updates.push(`active = $${values.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: "No valid changes were provided."
        });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE jobs
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING *`,
        values
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Vacancy not found."
        });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to update vacancy."
      });
    }
  }
);

// SERVE WEBSITE FILES
app.use(express.static(path.join(__dirname, "public")));

// API NOT FOUND
app.use("/api", (_req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// GENERAL ERROR HANDLER
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: err.message || "Something went wrong."
  });
});

// START SERVER
const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });

// ADMIN: LIST ALL VACANCIES
app.get(
  "/api/admin/jobs",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          title,
          location,
          description,
          requirements,
          employment_type,
          image_url,
          image_public_id,
          video_url,
          video_public_id,
          active,
          created_at
        FROM jobs
        ORDER BY created_at DESC
      `);

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to load vacancies."
      });
    }
  }
);

// CREATE VACANCY
app.post(
  "/api/admin/jobs",
  adminOnly,
  async (req, res) => {
    const title = clean(req.body.title, 150);
    const location = clean(req.body.location, 120);
    const description = clean(req.body.description, 3000);
    const requirements = clean(req.body.requirements, 3000);

    const employmentType = clean(
      req.body.employmentType || "Full-time",
      60
    );

    const imageUrl = clean(req.body.imageUrl, 2000);
    const imagePublicId = clean(req.body.imagePublicId, 500);
    const videoUrl = clean(req.body.videoUrl, 2000);
    const videoPublicId = clean(req.body.videoPublicId, 500);

    if (!title || !location || !description) {
      return res.status(400).json({
        error: "Title, location and description are required."
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO jobs
        (
          title,
          location,
          description,
          requirements,
          employment_type,
          image_url,
          image_public_id,
          video_url,
          video_public_id
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          title,
          location,
          description,
          requirements,
          employmentType,
          imageUrl || null,
          imagePublicId || null,
          videoUrl || null,
          videoPublicId || null
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to publish vacancy."
      });
    }
  }
);

// EDIT / ACTIVATE / DEACTIVATE JOB
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

      const fields = {
        title: ["title", 150],
        location: ["location", 120],
        description: ["description", 3000],
        requirements: ["requirements", 3000],
        employmentType: ["employment_type", 60],
        imageUrl: ["image_url", 2000],
        imagePublicId: ["image_public_id", 500],
        videoUrl: ["video_url", 2000],
        videoPublicId: ["video_public_id", 500]
      };

      const updates = [];
      const values = [];

      for (const [key, [column, max]] of Object.entries(fields)) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          const value = clean(req.body[key], max);

          if (
            ["title", "location", "description"].includes(key) &&
            !value
          ) {
            return res.status(400).json({
              error: `${key} cannot be empty.`
            });
          }

          values.push(value || null);
          updates.push(`${column} = $${values.length}`);
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
        if (typeof req.body.active !== "boolean") {
          return res.status(400).json({
            error: "Invalid vacancy visibility value."
          });
        }

        values.push(req.body.active);
        updates.push(`active = $${values.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: "No valid changes were provided."
        });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE jobs
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING *`,
        values
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Vacancy not found."
        });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to update vacancy."
      });
    }
  }
);

// SERVE WEBSITE FILES
app.use(express.static(path.join(__dirname, "public")));

// API NOT FOUND
app.use("/api", (_req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// GENERAL ERROR HANDLER
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: err.message || "Something went wrong."
  });
});

// START SERVER
const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
