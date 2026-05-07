# FacilAbo Calendars

Public ICS feeds used by FacilAbo.

## Quick access

Canonical raw URL format:
- `https://raw.githubusercontent.com/augiefra/facilabo/main/<category>/<file>.ics`

Examples:
- `https://raw.githubusercontent.com/augiefra/facilabo/main/belgique/feries-remplacement.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/belgique/ponts.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/luxembourg/feries-legaux.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/luxembourg/vacances-scolaires.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/luxembourg/ponts.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-geneve-feries.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-geneve-vacances.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-vaud-feries.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-vaud-vacances.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-neuchatel-feries.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-neuchatel-vacances.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-jura-feries.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/suisse/romande-jura-vacances.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/canada/feries-publics.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/canada/quebec-feries.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/fiscal/france.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/fiscal/paye-fonction-publique.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/education/examens-2026.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/education/parcoursup-2026.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/sport/wec.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/sport/rugby-top-14-complet.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/sport/rugby-six-nations-complet.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/sport/worldcup-2026-all.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/main/sport/worldcup-2026-france.ics`

## Covered categories

- `astronomie`
- `belgique`
- `canada`
- `culture`
- `education`
- `ecommerce`
- `fiscal`
- `jardin`
- `luxembourg`
- `religion`
- `soldes`
- `sport`
- `suisse`
- `tennis`

## Legal

- Repository license: [`LICENSE`](LICENSE)
- ICS terms of use: [`docs/legal/TERMS-ICS.md`](docs/legal/TERMS-ICS.md)
- Brand notice: [`docs/legal/BRAND-NOTICE.md`](docs/legal/BRAND-NOTICE.md)

## Docs

- Catalog: [`docs/CATALOG.md`](docs/CATALOG.md)
- Sources: [`docs/SOURCES.md`](docs/SOURCES.md)
- Operations: [`docs/OPERATIONS.md`](docs/OPERATIONS.md)

## Continuity guarantee

This repo keeps existing ICS paths stable for app compatibility.
No existing feed path is changed by legal/documentation updates.
Belgium existing slugs stay unchanged; `belgique/ponts.ics` is an additive derived feed.
Luxembourg school holidays currently follow the official MENJE publication through summer 2028.
Suisse romande feeds are canton-scoped only: Geneve, Vaud, Neuchatel and Jura MVP; Fribourg and Valais remain to study later.
Canada/Quebec feeds stay deliberately narrow: ARC public-holiday markers for Canada 2026, and CNESST Quebec statutory-holiday markers only. No Canada/Quebec school feed is published here.
World Cup 2026 feeds use stable match-number UIDs to avoid duplicate events when team placeholders are updated.
