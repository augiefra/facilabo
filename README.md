# FacilAbo Calendars

Calendriers ICS personnalisés pour l'application FacilAbo.

## Structure

```
calendars/
├── fiscal/
│   └── france.ics      # Calendrier fiscal français (2025-2030)
├── soldes/
│   └── france.ics      # Dates des soldes (2025-2030)
├── culture/
│   └── france.ics      # Événements culturels (2025-2030)
└── README.md
```

## Calendriers disponibles

### Calendrier Fiscal (`fiscal/france.ics`)
- **X-WR-CALNAME**: "Calendrier Fiscal France"
- Contenu:
  - Déclaration de revenus (papier et en ligne par zone)
  - Taxe foncière (paiement classique et en ligne)
  - IFI (Impôt sur la Fortune Immobilière)

### Soldes (`soldes/france.ics`)
- **X-WR-CALNAME**: "Soldes France"
- Contenu:
  - Soldes d'hiver (2ème mercredi de janvier, 4 semaines)
  - Soldes d'été (dernier mercredi de juin, 4 semaines)
- Calcul basé sur le Code du commerce français

### Culture (`culture/france.ics`)
- **X-WR-CALNAME**: "Événements Culturels France"
- Contenu:
  - Nuit européenne des Musées (3ème samedi de mai)
  - Fête de la Musique (21 juin)
  - Journées européennes du Patrimoine (3ème week-end de septembre)

## Accès aux fichiers (repo public)

URLs raw GitHub (pas besoin de GitHub Pages):
- `https://raw.githubusercontent.com/augiefra/facilabo/develop/calendars/fiscal/france.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/develop/calendars/soldes/france.ics`
- `https://raw.githubusercontent.com/augiefra/facilabo/develop/calendars/culture/france.ics`

## Mise à jour

Les calendriers couvrent 2025-2030. Pour mettre à jour:
1. Modifier les fichiers `.ics`
2. Push sur `main`
3. GitHub Pages met à jour automatiquement

## Sources

- **Fiscal**: [impots.gouv.fr](https://www.impots.gouv.fr)
- **Soldes**: [economie.gouv.fr](https://www.economie.gouv.fr/dgccrf/soldes)
- **Culture**: [culture.gouv.fr](https://www.culture.gouv.fr)
