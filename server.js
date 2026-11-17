
// =====================================
// ADMIN GALLERY: SHOW/HIDE
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

      res.json({
        message: "Gallery visibility updated.",
        photo: result.rows[0]
      });

    } catch (err) {
      console.error("Gallery visibility error:", err);

      res.status(500).json({
        error: "Unable to update gallery visibility."
      });
    }
  }
);

// =====================================
// ADMIN: LIST ALL APPLICATIONS
// =====================================

app.get(
  "/api/admin/applications",
  adminOnly,
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
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
          a.job_id,
          a.message,
          a.status,
          a.created_at,
          a.updated_at,
          j.title AS job_title
        FROM applications a
        LEFT JOIN jobs j ON j.id = a.job_id
        ORDER BY a.created_at DESC
      `);

      res.json(result.rows);

    } catch (err) {
      console.error("Admin applications error:", err);

      res.status(500).json({
        error: "Unable to load applications."
      });
    }
  }
);

// =====================================
// EMAIL: UNDER REVIEW NOTIFICATION
// =====================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function sendUnderReviewEmail(application) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return {
      sent: false,
      reason: "Email settings are not configured in Render."
    };
  }

  const name = escapeHtml(application.full_name);
  const reference = escapeHtml(application.reference);

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [application.email],
        subject: "Your recruitment application is under review",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#253247;max-width:600px;margin:auto">
            <h2 style="color:#182d43">Application Status Update</h2>

            <p>Dear ${name},</p>

            <p>
              Thank you for submitting your recruitment application.
              We are writing to confirm that your application has
              moved to the <strong>Under Review</strong> stage.
            </p>

            <p>
              <strong>Application reference:</strong> ${reference}
            </p>

            <p>
              Our recruitment team is reviewing the information
              you provided. We will contact you if there are further
              updates or if additional information is required.
            </p>

            <p>
              Please note that this update is not a job offer,
              employment confirmation, or visa approval.
            </p>

            <p>Kind regards,<br>Recruitment Team</p>
          </div>
        `,
        text: `Dear ${application.full_name},

Your recruitment application has moved to the Under Review stage.

Application reference: ${application.reference}

Our recruitment team is reviewing your submitted information. We will contact you if there are further updates or if additional information is required.

This update is not a job offer, employment confirmation, or visa approval.

Kind regards,
Recruitment Team`
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend error: ${details}`);
  }

  return {
    sent: true
  };
}

// =====================================
// ADMIN: UPDATE APPLICATION STATUS
// =====================================

const allowedApplicationStatuses = [
  "Received",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Offer Made",
  "Not Selected",
  "Closed"
];

app.patch(
  "/api/admin/applications/:id/status",
  adminOnly,
  async (req, res) => {
    const id = Number(req.params.id);
    const status = clean(req.body.status, 50);

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

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT
          id,
          reference,
          full_name,
          email,
          status,
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

      const application = existing.rows[0];
      const previousStatus = application.status;

      if (previousStatus === status) {
        await client.query("COMMIT");

        return res.json({
          message: "Application status is unchanged.",
          application,
          emailSent: null
        });
      }

      const updated = await client.query(
        `UPDATE applications
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           reference,
           full_name,
           email,
           status,
           created_at,
           updated_at`,
        [status, id]
      );

      let emailSent = null;
      let emailMessage = "";

      // Send only when the application first enters Under Review.
      if (
        status === "Under Review" &&
        !application.under_review_email_sent_at
      ) {
        try {
          const emailResult =
            await sendUnderReviewEmail(application);

          emailSent = emailResult.sent;

          if (emailSent) {
            await client.query(
              `UPDATE applications
               SET under_review_email_sent_at = NOW()
               WHERE id = $1`,
              [id]
            );

            emailMessage = "Applicant notification email sent.";
          } else {
            emailMessage = emailResult.reason;
            console.warn(emailMessage);
          }

        } catch (emailError) {
          emailSent = false;
          emailMessage = "Status updated, but notification email failed.";

          console.error(
            "Under Review email error:",
            emailError
          );
        }
      }

      await client.query("COMMIT");

      res.json({
        message: "Application status updated successfully.",
        application: updated.rows[0],
        emailSent,
        emailMessage
      });

    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Application status update error:", err);

      res.status(500).json({
        error: "Unable to update application status."
      });

    } finally {
      client.release();
    }
  }
);

// =====================================
// ADMIN: LIST ALL VACANCIES
// =====================================

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

      const jobs = result.rows.map((job) => ({
        ...job,
        image_url: optimizedImageUrl(
          job.image_public_id,
          job.image_url
        ),
        video_url: optimizedVideoUrl(
          job.video_public_id,
          job.video_url
        )
      }));

      res.json(jobs);

    } catch (err) {
      console.error("Admin jobs error:", err);

      res.status(500).json({
        error: "Unable to load vacancies."
      });
    }
  }
);

// =====================================
// ADMIN: CREATE VACANCY
// =====================================

app.post(
  "/api/admin/jobs",
  adminOnly,
  async (req, res) => {
    try {
      const title = clean(req.body.title, 150);
      const location = clean(req.body.location, 150);
      const description = clean(req.body.description, 5000);
      const requirements = clean(req.body.requirements, 3000);
      const employmentType = clean(
        req.body.employmentType || "Full-time",
        80
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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

      const job = result.rows[0];

      job.image_url = optimizedImageUrl(
        job.image_public_id,
        job.image_url
      );

      job.video_url = optimizedVideoUrl(
        job.video_public_id,
        job.video_url
      );

      res.status(201).json({
        message: "Vacancy created successfully.",
        job
      });

    } catch (err) {
      console.error("Create vacancy error:", err);

      res.status(500).json({
        error: "Unable to create vacancy."
      });
    }
  }
);

// =====================================
// ADMIN: SHOW/HIDE VACANCY
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

      if (typeof req.body.active !== "boolean") {
        return res.status(400).json({
          error: "Invalid vacancy visibility value."
        });
      }

      const result = await pool.query(
        `UPDATE jobs
         SET active = $1
         WHERE id = $2
         RETURNING id, active`,
        [req.body.active, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          error: "Vacancy not found."
        });
      }

      res.json({
        message: "Vacancy visibility updated.",
        job: result.rows[0]
      });

    } catch (err) {
      console.error("Vacancy update error:", err);

      res.status(500).json({
        error: "Unable to update vacancy."
      });
    }
  }
);

// =====================================
// STATIC WEBSITE FILES
// =====================================

app.use(express.static(path.join(__dirname, "public")));

// Website fallback. API requests are not redirected to index.html.
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(
    path.join(__dirname, "public", "index.html"),
    (err) => {
      if (err) next(err);
    }
  );
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((err, _req, res, _next) => {
  console.error("Server error:", err);

  if (res.headersSent) return;

  res.status(500).json({
    error: "An unexpected server error occurred."
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Recruitment portal running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
        
