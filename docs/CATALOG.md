# ICS Catalog (FacilAbo)

## Categories

- `astronomie`
- `belgique`
- `culture`
- `ecommerce`
- `fiscal`
- `jardin`
- `religion`
- `societe`
- `soldes`
- `sport`
- `tennis`

## Canonical raw URL format

`https://raw.githubusercontent.com/augiefra/facilabo/main/<category>/<file>.ics`

## Fiscal feeds

- `fiscal/france.ics` (slug: `fiscal-france`)
- `fiscal/paye-fonction-publique.ics` (slug: `fiscal-paye-fonction-publique`)

## Sport feeds

- `sport/wec.ics` (slug: `sport-wec`) - FIA WEC 2026, manches officielles datees uniquement; Qatar 2026 couvre le week-end officiel du 22 au 24 octobre 2026
- `sport/france-foot-equipe-nationale.ics` (slug: `sport-france-foot-equipe-nationale`)
- `sport/france-rugby-equipe-nationale.ics` (slug: `sport-france-rugby-equipe-nationale`)
- `sport/rugby-top-14-complet.ics` (slug: `sport-rugby-top-14-complet`) - a privilegier si tu veux suivre tout le Top 14 sans doublons inter-clubs
- `sport/rugby-six-nations-complet.ics` (slug: `sport-rugby-six-nations-complet`) - a privilegier si tu veux suivre tout le Tournoi sans cumuler Equipe de France + Six Nations

## Stability contract (critical for app continuity)

- Existing file paths and slugs are treated as stable.
- Existing ICS files remain backward compatible unless explicitly deprecated.
- UID stability per event/year must be preserved.
