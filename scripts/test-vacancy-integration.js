"use strict";

const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

const assert = require("node:assert/strict");

function check(condition, message) {
  assert.ok(condition, message);
  console.log("PASS:", message);
}

async function main() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");

  const schema = "vacancy_api_test_" + crypto.randomBytes(6).toString("hex");
  const adminClient = new Client({
    connectionString: testDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  let child;
  let schemaCreated = false;

  try {
    await adminClient.connect();
    await adminClient.query('CREATE SCHEMA "' + schema + '"');
    schemaCreated = true;

    const scopedUrl = new URL(testDatabaseUrl);
    scopedUrl.searchParams.set("options", "-c search_path=" + schema);
    scopedUrl.searchParams.set("sslmode", "require");

    const db = new Client({
      connectionString: scopedUrl.toString(),
      ssl: { rejectUnauthorized: false }
    });
    await db.connect();

    try {
      await db.query(`
        CREATE TABLE jobs (
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
        )
      `);
      const migration = fs.readFileSync(
        path.join(__dirname, "..", "migrations", "20261126_add_vacancy_salary_support.sql"),
        "utf8"
      );
      await db.query(migration);
    } finally {
      await db.end();
    }

    const port = 31000 + crypto.randomInt(0, 20000);
    const baseUrl = "http://127.0.0.1:" + port;
    child = spawn(process.execPath, ["server.js"], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: scopedUrl.toString(),
        DATABASE_SSL: "true",
        PORT: String(port),
        SESSION_SECRET: "integration-test-session-secret-which-is-long-enough",
        ADMIN_EMAIL: "integration@example.test",
        ADMIN_PASSWORD: "integration-test-password",
        CLOUDINARY_CLOUD_NAME: "test-cloud",
        CLOUDINARY_API_KEY: "test-key",
        CLOUDINARY_API_SECRET: "test-secret",
        BREVO_API_KEY: "",
        EMAIL_FROM: ""
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let serverOutput = "";
    child.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
    child.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

    async function request(route, options = {}, cookie = "") {
      const headers = { ...(options.headers || {}) };
      if (options.body !== undefined) headers["content-type"] = "application/json";
      if (cookie) headers.cookie = cookie;
      const response = await fetch(baseUrl + route, { ...options, headers });
      const body = await response.json().catch(() => ({}));
      return { status: response.status, body, response };
    }

    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (child.exitCode !== null) {
        throw new Error("Test server exited before becoming ready. " + serverOutput);
      }
      try {
        const response = await fetch(baseUrl + "/api/jobs");
        if (response.ok) { ready = true; break; }
      } catch (_error) {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    check(ready, "application starts against an isolated PostgreSQL schema");

    const publicBefore = await request("/api/jobs");
    check(publicBefore.status === 200 && Array.isArray(publicBefore.body),
      "public vacancy endpoint returns a vacancy list");

    const protectedBeforeLogin = await request("/api/admin/jobs");
    check(protectedBeforeLogin.status === 401,
      "admin vacancy endpoint rejects unauthenticated requests");

    const invalidLogin = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "wrong@example.test", password: "wrong" })
    });
    check(invalidLogin.status === 401, "admin login rejects incorrect credentials");

    const login = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: "integration@example.test",
        password: "integration-test-password"
      })
    });
    const setCookie = login.response.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0];
    check(login.status === 200 && cookie.startsWith("recruitment.sid="),
      "admin login creates an authenticated session");

    const missingSalary = await request("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Test labourer", location: "Calgary, Alberta",
        description: "Integration test vacancy"
      })
    }, cookie);
    check(missingSalary.status === 400,
      "new vacancy cannot be created without confirmed salary details");

    const invalidRange = await request("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Invalid range", location: "Calgary, Alberta",
        description: "Should be rejected", salaryMin: 25, salaryMax: 20,
        salaryPeriod: "hourly", salaryConfirmed: true
      })
    }, cookie);
    check(invalidRange.status === 400, "invalid salary range is rejected");

    const invalidLmia = await request("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Invalid LMIA", location: "Calgary, Alberta",
        description: "Should be rejected", salaryMin: 20,
        salaryPeriod: "hourly", salaryConfirmed: true,
        lmiaStatus: "Guaranteed"
      })
    }, cookie);
    check(invalidLmia.status === 400, "unsupported LMIA status is rejected");

    const invalidSupport = await request("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Invalid support", location: "Calgary, Alberta",
        description: "Should be rejected", salaryMin: 20,
        salaryPeriod: "hourly", salaryConfirmed: true,
        workPermitSupport: "Guaranteed visa"
      })
    }, cookie);
    check(invalidSupport.status === 400,
      "unsupported work-permit support status is rejected");

    const created = await request("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Integration General Labourer",
        location: "Calgary, Alberta",
        description: "Temporary integration test vacancy",
        requirements: "Test only",
        employmentType: "Full-time",
        salaryMin: 22,
        salaryMax: 27,
        salaryPeriod: "hourly",
        salaryConfirmed: true,
        lmiaStatus: "Not verified",
        workPermitSupport: "Not verified",
        imageUrl: "https://example.test/test-image.jpg",
        videoUrl: "https://example.test/test-video.mp4"
      })
    }, cookie);
    check(created.status === 201 && created.body.job && created.body.job.id,
      "valid employer-confirmed vacancy is created");
    const jobId = created.body.job.id;

    const publicAfterCreate = await request("/api/jobs");
    const publicJob = publicAfterCreate.body.find((job) => Number(job.id) === Number(jobId));
    check(Boolean(publicJob) && Number(publicJob.salary_min) === 22 &&
      Number(publicJob.salary_max) === 27 && publicJob.salary_period === "hourly",
      "public vacancy endpoint exposes the saved salary range and pay period");
    check(publicJob.lmia_status === "Not verified" &&
      publicJob.work_permit_support === "Not verified",
      "public vacancy labels immigration support as not verified by default");

    const edited = await request("/api/admin/jobs/" + jobId, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Integration General Labourer Updated",
        location: "Calgary, Alberta",
        description: "Updated integration test vacancy",
        requirements: "Updated test",
        employmentType: "Full-time",
        salaryMin: 23,
        salaryMax: 28,
        salaryPeriod: "hourly",
        salaryConfirmed: true,
        lmiaStatus: "LMIA required",
        workPermitSupport: "Employer may support"
      })
    }, cookie);
    check(edited.status === 200 && edited.body.job &&
      Number(edited.body.job.salary_min) === 23 &&
      Number(edited.body.job.salary_max) === 28 &&
      edited.body.job.salary_period === "hourly" &&
      edited.body.job.salary_confirmed === true &&
      edited.body.job.lmia_status === "LMIA required" &&
      edited.body.job.work_permit_support === "Employer may support",
      "editing a vacancy saves updated salary and support statuses; response: " +
        JSON.stringify({ status: edited.status, body: edited.body }));
    check(edited.body.job.image_url === "https://example.test/test-image.jpg" &&
      edited.body.job.video_url === "https://example.test/test-video.mp4",
      "editing without new uploads preserves existing image and video metadata");

    const dbLegacy = new Client({
      connectionString: scopedUrl.toString(),
      ssl: { rejectUnauthorized: false }
    });
    await dbLegacy.connect();
    let legacyId;
    try {
      const legacy = await dbLegacy.query(
        "INSERT INTO jobs (title, location, description) VALUES ($1,$2,$3) RETURNING id",
        ["Legacy no salary", "Toronto, Ontario", "Legacy vacancy"]
      );
      legacyId = legacy.rows[0].id;
    } finally {
      await dbLegacy.end();
    }

    const legacyEdit = await request("/api/admin/jobs/" + legacyId, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Legacy vacancy edited",
        location: "Toronto, Ontario",
        description: "Legacy vacancy edited without inventing pay",
        requirements: "",
        employmentType: "Full-time"
      })
    }, cookie);
    check(legacyEdit.status === 200 && legacyEdit.body.job.salary_min === null,
      "legacy vacancy can be edited without inventing a salary");

    const publicAfterLegacy = await request("/api/jobs");
    const publicLegacy = publicAfterLegacy.body.find(
      (job) => Number(job.id) === Number(legacyId)
    );
    check(Boolean(publicLegacy) && publicLegacy.salary_min === null,
      "legacy public vacancy remains listed without an invented wage");

    const invalidJobApplication = await request("/api/applications", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Test Applicant", email: "applicant@example.test",
        phone: "+14155550123", country: "Canada", occupation: "Labourer",
        experience: "Any", education: "Secondary", cvStatus: "Available",
        consent: true, jobId: 999999999
      })
    });
    check(invalidJobApplication.status === 400,
      "application submission rejects a vacancy that does not exist");

    const application = await request("/api/applications", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Test Applicant", email: "applicant@example.test",
        phone: "+14155550123", country: "Canada", occupation: "Labourer",
        experience: "Any", education: "Secondary", cvStatus: "Available",
        consent: true, jobId
      })
    });
    check(application.status === 201 && /^CA-[A-F0-9]+$/.test(application.body.reference),
      "applicant can submit an application for an active vacancy");

    const tracked = await request("/api/track", {
      method: "POST",
      body: JSON.stringify({
        reference: application.body.reference,
        email: "applicant@example.test"
      })
    });
    check(tracked.status === 200 && tracked.body.job_title === "Integration General Labourer Updated",
      "application tracking returns the selected vacancy title");

    const adminList = await request("/api/admin/jobs", {}, cookie);
    check(adminList.status === 200 &&
      adminList.body.some((job) => Number(job.id) === Number(jobId)),
      "authenticated admin can retrieve vacancy records");

    console.log("PASS: all vacancy API integration checks completed.");
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        child.once("exit", () => { clearTimeout(timeout); resolve(); });
      });
    }
    if (schemaCreated) {
      await adminClient.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    }
    await adminClient.end();
  }
}

main().catch((error) => {
  console.error("Vacancy API integration test failed:", error.stack || error.message);
  process.exitCode = 1;
});
