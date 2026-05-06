# ICS Catalog (FacilAbo)

## Categories

- `astronomie`
- `belgique`
- `culture`
- `education`
- `ecommerce`
- `fiscal`
- `jardin`
- `luxembourg`
- `religion`
- `societe`
- `soldes`
- `sport`
- `suisse`
- `tennis`

## Canonical raw URL format

`https://raw.githubusercontent.com/augiefra/facilabo/main/<category>/<file>.ics`

## Fiscal feeds

- `fiscal/france.ics` (slug: `fiscal-france`)
- `fiscal/paye-fonction-publique.ics` (slug: `fiscal-paye-fonction-publique`)

## Country feeds

### Belgique

- `belgique/feries-remplacement.ics` (slug: `belgique-feries-remplacement`) - jours feries legaux belges + rappels remplacement employeur, slug historique stable
- `belgique/vacances-fwb.ics` (slug: `belgique-vacances-fwb`) - vacances scolaires Federation Wallonie-Bruxelles
- `belgique/vacances-vlaanderen.ics` (slug: `belgique-vacances-vlaanderen`) - vacances scolaires Vlaanderen
- `belgique/soldes-attente.ics` (slug: `belgique-soldes-attente`) - soldes et periodes d'attente
- `belgique/fetes-institutionnelles.ics` (slug: `belgique-fetes-institutionnelles`) - reperes institutionnels
- `belgique/grands-evenements.ics` (slug: `belgique-grands-evenements`) - grands evenements belges
- `belgique/ponts.ics` (slug: `belgique-ponts`) - opportunites de pont derivees des jours feries legaux, non feriees automatiquement

### Luxembourg

- `luxembourg/feries-legaux.ics` (slug: `luxembourg-feries-legaux`) - jours feries legaux nationaux, couverture 2026-2031
- `luxembourg/vacances-scolaires.ics` (slug: `luxembourg-vacances-scolaires`) - vacances et conges scolaires MENJE publies, couverture officielle disponible jusqu'a l'ete 2028
- `luxembourg/ponts.ics` (slug: `luxembourg-ponts`) - opportunites de pont derivees des jours feries legaux, non feriees automatiquement

### Suisse romande

- `suisse/romande-geneve-feries.ics` (slug: `suisse-romande-geneve-feries`) - jours feries officiels du canton de Geneve, couverture 2026-2029
- `suisse/romande-geneve-vacances.ics` (slug: `suisse-romande-geneve-vacances`) - vacances et conges scolaires du canton de Geneve, couverture officielle disponible jusqu'a l'ete 2030
- `suisse/romande-vaud-feries.ics` (slug: `suisse-romande-vaud-feries`) - jours feries officiels du canton de Vaud, couverture 2026-2031
- `suisse/romande-vaud-vacances.ics` (slug: `suisse-romande-vaud-vacances`) - vacances scolaires du canton de Vaud depuis l'ICS officiel, couverture jusqu'a l'ete 2031
- `suisse/romande-neuchatel-feries.ics` (slug: `suisse-romande-neuchatel-feries`) - jours feries officiels du canton de Neuchatel, couverture 2026-2027
- `suisse/romande-neuchatel-vacances.ics` (slug: `suisse-romande-neuchatel-vacances`) - vacances scolaires du canton de Neuchatel, couverture officielle disponible jusqu'a l'ete 2030
- `suisse/romande-jura-feries.ics` (slug: `suisse-romande-jura-feries`) - jours feries officiels du canton du Jura, couverture 2026-2031
- `suisse/romande-jura-vacances.ics` (slug: `suisse-romande-jura-vacances`) - vacances scolaires du canton du Jura, couverture HTML officielle 2026-2027

## Culture feeds

- `culture/france.ics` (slug: `culture-france`) - sorties gratuites culture: Nuit des Musees, Fete de la Musique, Journees du Patrimoine

## Education feeds

- `education/examens-2026.ics` (slug: `education-examens-2026`) - reperes nationaux utiles des examens 2026: bac, brevet, CAP, BTS, BP et BMA
- `education/parcoursup-2026.ics` (slug: `education-parcoursup-2026`) - grandes echeances Parcoursup 2026

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
- Belgique: les 6 slugs historiques restent intouchables; `belgique-ponts` est uniquement additif.
- Luxembourg: `UID = <slug>-<normalized-event-key>-<year>@facilabo.app`; les ponts restent des opportunites editoriales a confirmer selon employeur.
- Suisse romande: `UID = suisse-romande-<canton>-<type>-<event-key>-<year>@facilabo.app`; chaque flux reste cantonal et ne doit jamais etre presente comme Suisse entiere.
- Examens / Parcoursup 2026: `UID = examens-2026-<date>-<type>@facilabo.app` ou `parcoursup-2026-<date>-<type>@facilabo.app`; corriger le contenu en place sans changer les UIDs.
- Coupe du Monde 2026: `UID = worldcup-2026-match-<numero FIFA>@facilabo.app`; mettre a jour les affiches en place sans changer l'UID.
- Apres qualification France/Belgique, ajouter les numeros de match FIFA correspondants dans `facilabo-api/lib/worldcup-2026-routes.ts`, puis redeployer l'API pour enrichir le slug existant sans recreer d'abonnement.
