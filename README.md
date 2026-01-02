# FacilAbo Calendars

Calendriers ICS personnalises pour l'application FacilAbo.

## Structure

```
/
├── astronomie/
│   └── calendrier-astronomie.ics  # Phases lunaires, eclipses, etc.
├── fiscal/
│   └── france.ics          # Calendrier fiscal francais (2025-2030)
├── jardin/
│   └── lunaire.ics         # Calendrier lunaire (genere par nos soins)
├── soldes/
│   └── france.ics          # Dates des soldes (2025-2030)
├── culture/
│   └── france.ics          # Evenements culturels (2025-2030)
├── ecommerce/
│   ├── blackfriday.ics     # Black Friday & Cyber Monday (2025-2030)
│   ├── primeday.ics        # Prime Day & Singles Day (2025-2030)
│   ├── frenchdays.ics      # French Days (2025-2030)
│   └── fetes-commerciales.ics  # Fetes commerciales (2025-2030)
├── privacy-policy.html     # Page de confidentialite (App Store)
└── README.md
```

## Calendriers disponibles

### Astronomie (`astronomie/calendrier-astronomie.ics`)
- **X-WR-CALNAME**: "Calendrier Astronomie"
- Contenu:
  - Phases de la lune
  - Eclipses et principaux evenements astronomiques

### Calendrier Fiscal (`fiscal/france.ics`)
- **X-WR-CALNAME**: "Calendrier Fiscal France"
- Contenu:
  - Declaration de revenus (papier et en ligne par zone)
  - Taxe fonciere (paiement classique et en ligne)
  - IFI (Impot sur la Fortune Immobiliere)

### Soldes (`soldes/france.ics`)
- **X-WR-CALNAME**: "Soldes France"
- Contenu:
  - Soldes d'hiver (2eme mercredi de janvier, 4 semaines)
  - Soldes d'ete (dernier mercredi de juin, 4 semaines)
- Calcul base sur le Code du commerce francais

### Culture (`culture/france.ics`)
- **X-WR-CALNAME**: "Evenements Culturels France"
- Contenu:
  - Nuit europeenne des Musees (3eme samedi de mai)
  - Fete de la Musique (21 juin)
  - Journees europeennes du Patrimoine (3eme week-end de septembre)

### Jardin (`jardin/lunaire.ics`)
- **X-WR-CALNAME**: "Calendrier Lunaire Jardin"
- Contenu:
  - Conseils quotidiens bases sur les cycles lunaires
  - Fichier genere par nos soins (source interne)

### E-commerce

#### Black Friday & Cyber Monday (`ecommerce/blackfriday.ics`)
- **X-WR-CALNAME**: "Black Friday & Cyber Monday"
- Contenu:
  - Black Friday (dernier vendredi de novembre)
  - Cyber Monday (lundi suivant le Black Friday)

#### Prime Day & Singles Day (`ecommerce/primeday.ics`)
- **X-WR-CALNAME**: "Prime Day & Singles Day"
- Contenu:
  - Amazon Prime Day (mi-juillet, 2 jours)
  - Singles Day Alibaba (11 novembre)

#### French Days (`ecommerce/frenchdays.ics`)
- **X-WR-CALNAME**: "French Days"
- Contenu:
  - French Days Printemps (fin avril/debut mai)
  - French Days Automne (fin septembre)

#### Fetes Commerciales (`ecommerce/fetes-commerciales.ics`)
- **X-WR-CALNAME**: "Fetes Commerciales"
- Contenu:
  - Saint-Valentin (14 fevrier)
  - Fete des Meres (dernier dimanche de mai)
  - Fete des Peres (3eme dimanche de juin)
  - Halloween (31 octobre)

## Acces aux fichiers (repo public)

URLs raw GitHub:
```
https://raw.githubusercontent.com/augiefra/facilabo/main/astronomie/calendrier-astronomie.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/fiscal/france.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/soldes/france.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/culture/france.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/jardin/lunaire.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/ecommerce/blackfriday.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/ecommerce/primeday.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/ecommerce/frenchdays.ics
https://raw.githubusercontent.com/augiefra/facilabo/main/ecommerce/fetes-commerciales.ics
```

## Mise a jour

Les calendriers couvrent 2025-2030. Pour mettre a jour:
1. Modifier les fichiers `.ics`
2. Push sur `main`
3. Les URLs raw sont immediatement accessibles

## Sources

- **Fiscal**: [impots.gouv.fr](https://www.impots.gouv.fr)
- **Soldes**: [economie.gouv.fr](https://www.economie.gouv.fr/dgccrf/soldes)
- **Culture**: [culture.gouv.fr](https://www.culture.gouv.fr)
- **E-commerce**: Dates calculees selon les standards du marche francais
- **Astronomie**: Sources publiques + curation
- **Jardin**: Calendrier genere en interne
