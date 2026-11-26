"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL is required for database tests.");
  }

  // Render PostgreSQL requires TLS for external connections. This applies only\n  // to the dedicated TEST_DATABASE_URL used by this isolated migration test.\n  const client = new Client({\n    connectionString,\n    ssl: { rejectUnauthorized: false }\n  });
  const schema = "vacancy_test_" + crypto.randomBytes(6).toString("hex");
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // All test objects are isolated in a temporary schema and rolled back.
    await client.query('CREATE SCHEMA "' + schema + '"');
    await client.query("SELECT set_config('search_path', $1, true)", [schema]);

    // Simulate the pre-migration jobs table, including an existing legacy row.
    await client.query(`
      CREATE TABLE jobs (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL DEFAULT '',
        employment_type TEXT NOT NULL DEFAULT 'Full-time',
        active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    await client.query(
      "INSERT INTO jobs (title, location, description) VALUES ($1, $2, $3)",
      ["Legacy job", "Toronto, Ontario", "Existing vacancy"]
    );

    const migrationPath = path.join(
      __dirname,
      "..",
      "migrations",
      "20261126_add_vacancy_salary_support.sql"
    );
    const migration = fs.readFileSync(migrationPath, "utf8");
    await client.query(migration);

    const legacy = await client.query(
      "SELECT salary_min, salary_max, salary_period, salary_currency, salary_confirmed, lmia_status, work_permit_support FROM jobs WHERE title = $1",
      ["Legacy job"]
    );
    const oldJob = legacy.rows[0];
    if (
      oldJob.salary_min !== null ||
      oldJob.salary_max !== null ||
      oldJob.salary_period !== null ||
      oldJob.salary_currency !== "CAD" ||
      oldJob.salary_confirmed !== false ||
      oldJob.lmia_status !== "Not verified" ||
      oldJob.work_permit_support !== "Not verified"
    ) {
      throw new Error("Legacy vacancy defaults were not preserved.");
    }

    await client.query(
      `INSERT INTO jobs
       (title, location, description, salary_min, salary_max, salary_period,
        salary_currency, salary_confirmed, lmia_status, work_permit_support)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        "Test vacancy", "Calgary, Alberta", "Migration test",
        20, 25, "hourly", "CAD", true,
        "Not verified", "Not verified"
      ]
    );

    async function mustReject(label, sql, values) {
      await client.query("SAVEPOINT constraint_test");
      try {
        await client.query(sql, values);
        throw new Error(label + " was incorrectly accepted.");
      } catch (error) {
        if (error.message === label + " was incorrectly accepted.") throw error;
        if (error.code !== "23514") {
          throw new Error(label + " failed for an unexpected reason: " + error.code);
        }
      } finally {
        await client.query("ROLLBACK TO SAVEPOINT constraint_test");
        await client.query("RELEASE SAVEPOINT constraint_test");
      }
    }

    await mustReject(
      "Salary maximum below minimum",
      "INSERT INTO jobs (title, location, description, salary_min, salary_max, salary_period) VALUES ('Bad range','Test','Test',25,20,'hourly')"
    );
    await mustReject(
      "Confirmed salary without amount and period",
      "INSERT INTO jobs (title, location, description, salary_confirmed) VALUES ('Bad confirmation','Test','Test',true)"
    );
    await mustReject(
      "Unsupported LMIA status",
      "INSERT INTO jobs (title, location, description, lmia_status) VALUES ('Bad LMIA','Test','Test','Guaranteed')"
    );
    await mustReject(
      "Unsupported work-permit status",
      "INSERT INTO jobs (title, location, description, work_permit_support) VALUES ('Bad support','Test','Test','Guaranteed')"
    );

    console.log("PASS: migration applies to a legacy jobs schema.");
    console.log("PASS: legacy vacancy salary and status defaults are preserved.");
    console.log("PASS: valid salary and support values are accepted.");
    console.log("PASS: invalid salary ranges and unsupported statuses are rejected.");
  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error("Vacancy migration test failed:", error.message);
  process.exitCode = 1;
});
