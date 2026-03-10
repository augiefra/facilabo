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

## Specific notes for new feeds

- `societe/reperes-france.ics`: keep deterministic FR rules (mothers/fathers/grandparents days) and preserve overlap rationale with `ecommerce/fetes-commerciales.ics`.
- `sport/cyclisme-majeurs.ics`: keep strict scope (Monuments + Grands Tours + Mondiaux route), and maintain rolling window target `J-30 -> J+730`.
- `sport/wec.ics`: one event per official FIA WEC round, stable round keys (`imola`, `spa`, `lemans`, `saopaulo`, `austin`, `fuji`, `bahrain`), date-only until an official race start time is published, and no expected overlap with `f1`, `motogp` or `nascar`.
