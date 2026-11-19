# Aero Services Dispatch — carte du code

Ordre de chargement (index.html) : config → settings → core → fids → crewbus → ops → workorder → wo-settings → timeline → nav → sync → init
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
| js/workorder.js | Work Order A4 : compagnie, tâches, dates, pages, impression | règles/feuille WO |
| js/wo-settings.js | Paramètres WO (flotte, tâches, handler→compagnie) | écran réglages WO |
| css/workorder.css | Mise en page de la feuille Work Order | look de la feuille WO |
| js/timeline.js | Timeline | timeline |
| js/nav.js | Barre de navigation mobile | nav |
| js/sync.js | Fusion des données à la synchro FIDS (garde éditions/sélections) | règles de synchro |
| js/init.js | Démarrage : shift actuel, synchro chaque minute, flèches de date | comportement au lancement |
| worker/fids-worker.js | Proxy FIDS (Cloudflare Worker, déployé une fois) | (rarement) |

## Hébergement (sans Netlify)
- Site : GitHub Pages (branche main, racine). Chaque push met à jour le site.
- Proxy FIDS : Cloudflare Worker (worker/fids-worker.js), adresse à renseigner dans `FIDS_PROXY` (js/fids.js).
- Cache : après une modification, change le `?v=...` des balises <link>/<script> dans index.html pour forcer le rechargement.
