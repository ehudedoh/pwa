# Schéma du flux: inscription agriculteur → vérification chez le vérificateur

```mermaid
flowchart TD
    A[Agriculteur ouvre l'app] --> B[Inscription / Connexion]
    B --> C[Firebase Auth: compte créé]
    C --> D[Firestore: profil utilisateur enregistré dans users]
    D --> E[Dashboard Agriculteur]

    E --> F[Créer un nouveau lot]
    F --> G[Saisie: poids, espèce, région]
    G --> H[Ajouter preuves terrain: photo + GPS]
    H --> I[Valider le lot]
    I --> J[Firestore: lot enregistré dans lots]
    I --> K[Firestore: transfert CREATION enregistré]
    I --> L[Blockchain: anchorData du lot]

    J --> M[Lot visible côté coopérative]
    M --> N[Coopérative scan / recherche du lot]
    N --> O[Contrôle: poids, humidité, paiement, grade]
    O --> P[Valider la collecte]
    P --> Q[Firestore: lot mis à jour COLLECTED]
    P --> R[Firestore: transfert COOP_VALIDATION enregistré]
    P --> S[Blockchain: anchorData de la validation]

    Q --> T[Lot prêt pour export / suivi]
    R --> T
    S --> T

    T --> U[Vérificateur ouvre le lot]
    U --> V[Firestore: lecture du lot]
    U --> W[Firestore: lecture des transferts]
    V --> X[Affichage du dossier de traçabilité]
    W --> X
    X --> Y[Timeline complète: récolte → validation coop → vérification]
    Y --> Z[PDF / certificat de conformité]

    M -. si urgence .-> U1[Urgence: transfert vers une autre coopérative]
    U1 --> U2[Firestore: lot.coopId mis à jour]
    U1 --> U3[Firestore: transfert URGENT_TRANSFER enregistré]
    U1 --> U4[Blockchain: trace de l'urgence]
```

## Résumé fonctionnel
- **Inscription / connexion**: Firebase Auth crée le compte, Firestore sauvegarde le profil.
- **Agriculteur**: crée le lot avec photo et GPS, puis le lot est enregistré en base et ancré sur la blockchain.
- **Coopérative**: scanne le lot, vérifie le poids et la qualité, puis valide la collecte.
- **Vérificateur**: lit le lot et toute la chaîne d'événements pour reconstruire la traçabilité complète.
- **Urgence**: si la coopérative d'origine est indisponible, le lot peut être transféré vers une autre coopérative.

## Données persistées
- `users` : profils des utilisateurs.
- `lots` : lots de cacao.
- `lots/{lotId}/transfers` : historique des événements du lot.
- **Blockchain** : hash de création, de validation et d'urgence.
