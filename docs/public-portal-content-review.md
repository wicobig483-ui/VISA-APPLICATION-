# Public portal content review — draft reference

Target branch: `draft/vacancy-salary-lmia-support`
Related pull request: #3
Status: planning reference only; no production changes.

## Existing public-site structure reviewed

The supplied website content establishes these public sections and flows:

- Header navigation for vacancies, applicant registration, application tracking and contact.
- Hero section introducing Canadian employment opportunities.
- Canada information resources linking to official Government of Canada pages.
- Published vacancy cards with job title, work location, employment type, description and requirements.
- Applicant registration with contact details, occupation, experience, education, CV status, optional vacancy selection and consent.
- Application tracking using the applicant's reference number and email.
- Contact email and clear statements that the portal is privately operated and is not a Government of Canada or IRCC website.

## Content alignment for the vacancy salary/support draft

The public vacancy experience should:

1. Show the employer-entered salary range and pay period prominently, in CAD.
2. Show **Salary not provided** for legacy vacancies without saved salary data. Never estimate or invent a wage.
3. Display LMIA and work-permit support as employer-reported information, not as government verification.
4. Use **Not verified** when no supporting status has been confirmed.
5. Show the actual work location supplied by the employer. Do not assume every vacancy is in Toronto or Ontario.
6. Keep job title, employment type, description and requirements consistent with the employer's published vacancy record.
7. Keep the vacancy selection connected to the applicant form so an applicant can apply for the vacancy they selected.
8. Keep application tracking and the existing applicant form compatible with older vacancy records.

## Editorial improvements to consider

- Use consistent professional job titles, for example **Healthcare Assistant** instead of inconsistent capitalization or wording.
- Remove repeated promotional copy if it appears more than once; keep one clear introduction and one vacancies section.
- Keep vacancy descriptions specific to the role, with clear duties, qualifications, experience requirements and work location.
- Avoid describing a vacancy as offering visa sponsorship, LMIA approval or a guaranteed work permit unless the employer's claim is documented and accurately qualified.
- Keep the private-service disclaimer visible near recruitment/application information.
- Continue advising applicants not to submit bank details or identity documents through the general application form.

## Verification and release safeguards

- The website text supplied for this review is reference material; it does not independently verify that any listed vacancy is genuine, current or open.
- Salary and support information must come from the employer's confirmed vacancy record.
- An employer-reported LMIA or work-permit support status is not proof of approval by Canadian authorities.
- A job application, job offer or LMIA does not guarantee a work permit, visa or entry to Canada.
- This document does not authorize merging the pull request, applying a production database migration, or deploying to Render.
- Keep Render auto-deploy disabled until the user explicitly approves a release.
