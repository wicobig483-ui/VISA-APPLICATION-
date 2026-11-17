
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
        `INSERT INTO jobs (
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

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Unable to publish vacancy."
      });
    }
  }
);

// EDIT VACANCY / SHOW / HIDE
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

      const updates = {};
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

      for (const [key, [column, max]] of Object.entries(fields)) {
        if (req.body[key] !== undefined) {
          updates[column] = clean(req.body[key], max);
        }
      }

      if (req.body.active !== undefined) {
        if (typeof req.body.active !== "boolean") {
          return res.status(400).json({
            error: "Invalid vacancy status."
          });
        }

        updates.active = req.body.active;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No changes were provided."
        });
      }

      if (
        ("title" in updates && !updates.title) ||
        ("location" in updates && !updates.location) ||
        ("description" in updates && !updates.description)
      ) {
        return res.status(400).json({
          error: "Title, location and description cannot be empty."
        });
      }

      const columns = Object.keys(updates);
      const values = Object.values(updates);

      const setClause = columns
        .map((column, index) => `${column} = $${index + 1}`)
        .join(", ");

      values.push(id);

      const result = await pool.query(
        `UPDATE jobs
         SET ${setClause}
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

// STATIC WEBSITE FILES
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

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message || "File upload failed."
    });
  }

  res.status(500).json({
    error: err.message || "An unexpected server error occurred."
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
