# Aero Services Dispatch — carte du code

Ordre de chargement (index.html) : config → settings → core → fids → crewbus → ops → timeline → nav → sync → init
(scripts classiques : les `const`/`let` sont partagés, l'ordre compte)

| Fichier | Rôle | À toucher pour… |
|---|---|---|
| index.html | Structure HTML (sections 1–4, gabarits d'impression) | ajouter/déplacer un bloc visuel |
| css/base.css | Base, nav mobile, responsive | thème général |
| css/components.css | Réglages, vols, boutons, formulaire manuel | look d'un composant |
| css/print.css | Impression PDF | mise en page PDF |
| css/timeline.css | Timeline | look timeline |
| css/theme.css | Thème Material sombre (polices, arrondis, en-tête, boutons) — chargé en dernier | changer le look global |
| js/config.js | État `S`, `DEFAULT_PARAMS`, `PARAMS` (localStorage) | préfixes par défaut |
| js/settings.js | Écran paramètres, mot de passe, décalage UTC | réglages |
| js/core.js | selShift, reset, shouldInclude, pickup | règles de base |
| js/fids.js | Appel FIDS, fuseau, fenêtres de dates | filtre / chargement des vols |
| js/crewbus.js | Feuille crew-bus, ajout manuel, PDF crew-bus | feuille crew-bus |
| js/ops.js | Catering / Opération / Headset / FedEx + PDF ops | feuille opérations |
| js/timeline.js | Timeline | timeline |
| js/nav.js | Barre de navigation mobile | nav |
| js/sync.js | Fusion des données à la synchro FIDS (garde éditions/sélections) | règles de synchro |
| js/init.js | Démarrage : shift actuel, synchro chaque minute, flèches de date | comportement au lancement |
| netlify/functions/fids.js | Proxy FIDS | (rarement) |
