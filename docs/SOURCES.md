# Editorial Sources

## France

- Education / examens: https://www.education.gouv.fr/reussir-au-lycee/baccalaureat-brevet-cap-parcoursup-le-calendrier-2026-341384 (verifie le 2026-04-24)
- Parcoursup: https://www.parcoursup.gouv.fr/calendrier (verifie le 2026-04-24)
- Fiscal: https://www.impots.gouv.fr
- Paye fonction publique: https://www.education.gouv.fr/la-paye-des-agents-du-ministere-378286 (consulte le 2026-02-25)
- Soldes: https://www.economie.gouv.fr/dgccrf/soldes
- Culture: https://www.culture.gouv.fr

## Belgium

- https://www.belgium.be
- https://emploi.belgique.be
- https://www.enseignement.be
- https://www.onderwijs.vlaanderen.be
- https://economie.fgov.be
- Ponts Belgique: derives de `belgique/feries-remplacement.ics`; ce sont des opportunites de pose, pas des jours feries officiels.

## Luxembourg

- Jours feries legaux: https://luxembourg.public.lu/fr/vivre/qualite-de-vie/jours-feries-legaux.html (verifie le 2026-05-06)
- Vacances et conges scolaires: https://men.public.lu/fr/vacances-scolaires.html (verifie le 2026-05-06)
- Limite editoriale: les vacances scolaires sont publiees officiellement jusqu'a l'annee scolaire 2027/2028; le flux `luxembourg-vacances-scolaires` s'arrete donc a l'ete 2028 tant qu'une nouvelle source officielle n'est pas publiee.
- Ponts Luxembourg: derives des jours feries legaux; ce sont des opportunites de pose, pas des jours feries officiels.

## Societe (France)

- https://www.unwomen.org
- https://www.un.org/fr/observances/happiness-day
- https://www.cancerdusein.org

## Cyclisme

- https://www.uci.org
- https://www.letour.fr
- https://www.giroditalia.it
- https://www.lavuelta.es

## WEC

- https://www.fiawec.com/en/calendar
- https://www.fiawec.com/en/news/qatar-1812-km-postponed
- https://www.fiawec.com/en/news/dates-confirmed-for-rescheduled-qatar-1812km-and-fia-wec-prologue/13118
- https://www.fiawec.com/en/race/show/4948
- https://www.fiawec.com/en/race/show/4949
- https://www.fiawec.com/en/race/show/4951
- https://www.fiawec.com/en/race/show/4952
- https://www.fiawec.com/en/race/show/4953
- https://www.fiawec.com/en/race/show/4954
- https://www.fiawec.com/en/race/show/4955
- Regle editoriale: si seul le week-end officiel est publie, l evenement reste en date-only; l horaire de depart n est ajoute qu apres publication officielle.
- Couverture 2026: 8 manches datees au 2026-03-24. Qatar est fixe au 2026-10-24 et reste en date-only tant qu aucun horaire officiel n est publie.

## Rugby

- https://data.rugbyfixture.io/ical/v1/top14.ics
- https://www.sixnationsrugby.com/en/m6n/fixtures/202600

## Coupe du Monde 2026

- PDF officiel FIFA: https://digitalhub.fifa.com/m/1be9ce37eb98fcc5/original/FWC26-Match-Schedule_English.pdf (verifie le 2026-04-24, document date du 2026-04-10)
- Page officielle FIFA fixtures/stades/resultats: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums (verifie le 2026-04-24)
- Communique FIFA schedule update: https://tickets.fifa.com/organisation/media-releases/updated-world-cup-2026-match-schedule-venues-kick-off-times-104-matches (verifie le 2026-04-24)
- Regle editoriale: les horaires source du PDF sont en Eastern Time; les ICS FacilAbo publient des timestamps UTC pour conserver l'affichage local correct dans Calendrier iOS.
- Regle anti-doublons: chaque VEVENT garde un `UID` derive du numero de match FIFA, meme si une affiche ou un placeholder change.
- Regle qualification: les slugs equipe (`worldcup-2026-france`, `worldcup-2026-belgium`) sont enrichis cote API via `facilabo-api/lib/worldcup-2026-routes.ts` quand les numeros de match post-poules sont connus; ne pas changer le slug ni l'UID.

## Religion and observances

- https://www.vatican.va
- https://www.islamicfinder.org
- https://www.hebcal.com
- https://www.drikpanchang.com
- https://www.un.org
- https://www.sgpc.net
