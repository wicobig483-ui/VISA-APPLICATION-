# Independent Canada Employment Recruitment Portal

This repository contains a **private recruitment-service website** for publishing authorized job vacancies, receiving candidate applications, issuing application reference numbers, tracking application status, and managing recruitment content.

**This is not a Government of Canada website and is not affiliated with Immigration, Refugees and Citizenship Canada (IRCC).** Do not use Government of Canada or IRCC logos, branding, or wording that could make visitors believe this private service is an official government service.

## Scope and important safeguards

- The portal supports recruitment administration. It does not submit immigration applications to IRCC, issue work permits, make visa decisions, or guarantee employment or immigration outcomes.
- Publish only genuine vacancies for which the employer has authorized recruitment.
- Do not charge candidates prohibited recruitment or LMIA-related fees, or pass employer costs to workers. Check current federal and provincial requirements and obtain qualified legal advice before offering paid recruitment services.
- The application form collects candidate information. Before accepting real applications, publish a clear privacy notice, explain the purpose of collection, obtain appropriate consent, set a retention and deletion schedule, and restrict staff access.
- Do not request passport scans, identity documents, bank details, or other highly sensitive documents unless there is a lawful, necessary, secure, and professionally reviewed process.
- Employer invoice functionality supports USDT payments on the TRON (TRC20) network. It is not an IRCC or government fee collection system. Clearly disclose any legitimate employer service charge and applicable terms before issuing an invoice. Never describe a private service charge as an official visa or government fee.
- A submitted transaction hash is not proof of payment. The server's verification endpoint checks for a confirmed USDT transfer to the configured receiving wallet and the exact invoice amount before marking an invoice paid.

## Requirements

- Node.js 20 or later
- PostgreSQL
- A Node.js hosting provider that supports persistent environment variables, such as Render or Railway

GitHub Pages cannot run this Node.js backend. Deploy the application to a Node.js host with a PostgreSQL database.

## Environment configuration

Set these required variables in your local environment or hosting provider:

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — long, random secret of at least 32 characters
- `ADMIN_EMAIL` — administrator sign-in email
- `ADMIN_PASSWORD` — strong administrator password
- `CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `CLOUDINARY_API_KEY` — Cloudinary API key
- `CLOUDINARY_API_SECRET` — Cloudinary API secret

For employer USDT invoice verification, configure:

- `TRONGRID_API_KEY` — TRON Grid API key
- `USDT_TRC20_ADDRESS` — the exact TRON address controlled by the service and intended to receive USDT payments

Set and independently verify `USDT_TRC20_ADDRESS` before enabling real payments. Do not rely on a code fallback address without confirming control and ownership. Never share private keys or seed phrases, and never put secrets in frontend code.

## Run locally

1. Install Node.js 20 or later.
2. Create a PostgreSQL database.
3. Create a local `.env` file containing the required environment variables listed above.
4. Install dependencies with `npm install`.
5. Start the server with `npm start`.
6. Open `http://localhost:3000`.
7. Open `http://localhost:3000/admin.html` to sign in as administrator.

The repository intentionally does not include real credentials. Keep local `.env` files out of Git.

## Deploy

1. Push the repository to GitHub.
2. Create a PostgreSQL database with the hosting provider.
3. Create a Node.js web service connected to this repository.
4. Set the build command to `npm install` and the start command to `npm start`.
5. Add the required environment variables in the hosting provider's private environment settings.
6. Set `NODE_ENV=production` and use HTTPS.
7. Test application submission, reference tracking, administrator sign-in, vacancy publishing, status updates, and the employer invoice flow using test data before launch.
8. Confirm the configured receiving wallet and complete a controlled end-to-end payment test before accepting real payments.

## First use

The vacancies page starts empty. An administrator can sign in at `/admin.html` and publish only genuine, authorized vacancies. Applications submitted through the public page are stored in PostgreSQL.

## Security and launch checklist

This project is not a legal, privacy, or security certification. Before public launch:

- Have the application, privacy notice, recruitment practices, and payment terms reviewed by qualified professionals.
- Use unique, strong administrator credentials and a long random session secret.
- Keep all secrets in private hosting environment settings; never commit them to GitHub.
- Confirm database backups, access controls, monitoring, and a data retention/deletion process.
- Confirm that the receiving wallet is controlled by the service and is correct before accepting payment.
- Clearly identify the operator and provide working contact details.
- Make it clear on every relevant page that this is an independent private recruitment service, not an official Canadian government or IRCC website.
