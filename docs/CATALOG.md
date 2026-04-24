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
- `sport/worldcup-2026-all.ics` (slug: `worldcup-2026-all`) - 104 matchs Coupe du Monde 2026, `UID` stable par numero de match FIFA
- `sport/worldcup-2026-france.ics` (slug: `worldcup-2026-france`) - matchs France connus; le proxy API derive ce flux du calendrier complet par numeros de match FIFA
- `sport/worldcup-2026-belgium.ics` (slug: `worldcup-2026-belgium`) - matchs Belgique connus; le proxy API derive ce flux du calendrier complet par numeros de match FIFA
- `sport/worldcup-2026-knockout.ics` (slug: `worldcup-2026-knockout`) - phases finales
- `sport/worldcup-2026-big-nights.ics` (slug: `worldcup-2026-big-nights`) - selection editoriale grands soirs

## Stability contract (critical for app continuity)

- Existing file paths and slugs are treated as stable.
- Existing ICS files remain backward compatible unless explicitly deprecated.
- UID stability per event/year must be preserved.
- Coupe du Monde 2026: `UID = worldcup-2026-match-<numero FIFA>@facilabo.app`; mettre a jour les affiches en place sans changer l'UID.
- Apres qualification France/Belgique, ajouter les numeros de match FIFA correspondants dans `facilabo-api/lib/worldcup-2026-routes.ts`, puis redeployer l'API pour enrichir le slug existant sans recreer d'abonnement.
