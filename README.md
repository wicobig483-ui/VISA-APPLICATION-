# Canada Employment Recruitment Portal (working backend)

This is a recruitment portal, Government of Canada or IRCC website. It supports real online vacancy listings, candidate applications, reference numbers, status tracking, and an administrator dashboard.

## Important scope and safeguards

- This system handles recruitment applications only. It submit immigration applications to IRCC, issue work permits, or guarantee a job or visa.
- Only publish genuine vacancies from employers who have authorized recruitment.
- it charge candidates recruitment fees or pass employer LMIA/recruitment costs to workers. Check current Canadian and applicable provincial rules.
- This starter intentionally does accept passport scans, identity documents, bank details, or payments. Add a professionally reviewed secure document workflow only if genuinely necessary.
- Publish a privacy notice, retention schedule, contact details, and clear consent wording before collecting real applicant data.
- Protect the administrator password and database credentials. Use a unique password and a long random session secret.

## Requirements

- Node.js 20+
- A PostgreSQL database
- A hosting provider that supports Node.js and persistent environment variables (for example Render, Railway, or another Node host)

GitHub Pages alone cannot run this backend. The site must be deployed to a Node.js host with PostgreSQL. You can keep the source code in GitHub.

## Run locally

1. Install Node.js 20 or later.
2. Create a PostgreSQL database.
3. Copy `.env.example` to `.env` and fill in the database URL, a random session secret, admin email, and strong admin password.
4. Install dependencies: `npm install`
5. Start the server: `npm start`
6. Open `http://localhost:3000`
7. Open `http://localhost:3000/admin.html` to sign in as administrator.

Do not commit `.env` to GitHub. Add it to `.gitignore`.

## Deploy

1. Push this project to a GitHub repository.
2. Create a PostgreSQL database with your hosting provider.
3. Create a Node.js web service connected to the repository.
4. Set build command to `npm install` and start command to `npm start`.
5. Add environment variables from `.env.example` in the host dashboard.
6. Set `NODE_ENV=production`, use HTTPS, and test application submission, tracking, admin login, vacancy publishing, and status updates.
7. Use the deployed Node host URL as your website address, or configure a custom domain.

## First use

The vacancies page starts empty. Sign in to `/admin.html`, publish a real authorized vacancy, then check that it appears on the public page. Applications submitted on the public page are saved in PostgreSQL.

## Security notes

This is a practical starter, not a completed legal/privacy/security certification. Before public launch, have the deployment and privacy controls reviewed, add monitoring and backups, define who may access applicant records, and test rate limits and recovery procedures. Admin credentials are stored as deployment secrets; never place them in frontend JavaScript or commit them to source control.
