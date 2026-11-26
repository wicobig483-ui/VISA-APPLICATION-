# Draft: vacancy salary and work-permit support

Target branch: `draft/vacancy-salary-lmia-support`

## Scope
- Add optional salary range, pay period, CAD currency, employer confirmation, LMIA status and work-permit support status to existing `jobs` records.
- Require an employer-confirmed salary and pay period when creating a new vacancy.
- Keep legacy vacancies valid; if salary is absent, show **Salary not provided**.
- Display immigration-support fields as status labels, defaulting to **Not verified**.
- Never present an employer-reported status as government verification or a guarantee of a work permit or visa.

## Data fields
- `salary_min`, `salary_max`: numeric CAD amount; maximum may be blank.
- `salary_period`: hourly, weekly, monthly or annual.
- `salary_currency`: CAD.
- `salary_confirmed`: employer confirmation boolean; defaults false.
- `lmia_status`: Not verified by default.
- `work_permit_support`: Not verified by default.

## Implementation checklist (not yet complete)
1. Run the idempotent migration in a controlled test database.
2. Extend admin vacancy create/edit form and client validation.
3. Extend authenticated create/update routes; require confirmed salary for newly created jobs.
4. Return new fields from public and admin job APIs.
5. Render salary and status labels on public vacancy cards and admin cards.
6. Test old rows, missing wages, range validation, status validation, editing, hide/show and application selection.
7. Run syntax checks, dependency/security audit and integration tests.
8. Review changes before merging; Render auto-deploy is disabled and must remain so until explicit approval.

## Safety notes
- Existing rows receive `salary_confirmed = false`, null salary amounts and immigration statuses of `Not verified`.
- The migration does not populate estimated wages.
- An LMIA decision and a work permit are distinct. An employer's status entry is not proof of approval.
- No production database migration or Render deployment is performed by this draft.
