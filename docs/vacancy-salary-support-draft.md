# Draft: vacancy salary and work-permit support

Target branch: `draft/vacancy-salary-lmia-support`

## Implemented in this draft
- Added an idempotent PostgreSQL migration for salary range, pay period, CAD currency, employer confirmation, LMIA status and work-permit support status.
- Added salary and immigration-support controls to the admin vacancy editor.
- New vacancies require a positive employer-confirmed starting salary, pay period and optional valid maximum.
- Update route validates salary/status values and preserves existing values when fields are omitted.
- Existing vacancies without salary remain editable without inventing a wage; public cards show **Salary not provided**.
- Admin and public vacancy cards show salary, LMIA and work-permit support labels.
- New and edited vacancies persist uploaded image/video metadata.
- Vacancy edits preserve the existing published/hidden state unless visibility is explicitly changed.
- New LMIA and work-permit support statuses default to **Not verified**.

## Data fields
- `salary_min`, `salary_max`: numeric CAD amounts; maximum may be blank.
- `salary_period`: hourly, weekly, monthly or annual.
- `salary_currency`: CAD.
- `salary_confirmed`: employer confirmation boolean; defaults false.
- `lmia_status`: Not verified by default.
- `work_permit_support`: Not verified by default.

## Before testing against a database
1. Apply `migrations/20261126_add_vacancy_salary_support.sql` to a **test PostgreSQL database** first.
2. Do not deploy the application code before the schema migration is applied to the target database.
3. Test new vacancy creation, salary range validation, status validation, legacy rows with no salary, editing, hide/show, media upload, public card rendering and application selection.
4. Run JavaScript syntax checks and the dependency/security audit.
5. Review the draft pull request before merging.

## Safety notes
- Existing rows receive `salary_confirmed = false`, null salary amounts and immigration statuses of `Not verified`.
- The migration does not populate estimated wages.
- An LMIA decision and a work permit are distinct. An employer-entered status is not proof of government approval.
- A job offer, LMIA or employer support statement does not guarantee a work permit or visa.
- No production database migration, merge to `main`, or Render deployment has been performed.
- Render auto-deploy must remain disabled until explicit approval.
