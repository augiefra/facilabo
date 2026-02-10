# Operations and Quality Rules

## Update flow

1. Edit target `.ics` files.
2. Validate format and UID stability.
3. Run verification checks before merge.
4. Push to `main`.

## Non-regression constraints

- Do not rename/move existing public ICS paths without migration.
- Do not change canonical slugs consumed by app/API.
- Avoid breaking schema-level ICS conventions (UID, DTSTART/DTEND consistency).

## Duplicate policy

Allowed:
- Cross-feed overlap when editorially expected.

Forbidden:
- Duplicate event in the same feed/year.
