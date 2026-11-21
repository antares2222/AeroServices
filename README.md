# AeroServices
Outils opérationnels (Dispatch Liège Airport). Voir ARCHITECTURE.md.

## Mise en ligne (sans Netlify)
1. **Site** : GitHub → Settings → Pages → Source « Deploy from a branch » → `main` / `(root)`.
2. **Proxy FIDS** : dash.cloudflare.com → Workers & Pages → Create → Worker → Deploy → Edit code → coller `worker/fids-worker.js` → Deploy.
3. Copier l'adresse du Worker (`https://xxx.workers.dev`) dans `FIDS_PROXY` de `js/fids.js`, puis push.
4. Désactiver le lien Netlify (Site configuration → Build & deploy → Stop builds) pour ne plus consommer de déploiements.

## Paramètres partagés (Cloudflare KV)
1. Cloudflare → Storage & databases → KV → Create → nom `aeroservices-params`.
2. Worker `fids` → Settings → Bindings → Add → KV namespace → variable `PARAMS_KV` → `aeroservices-params`.
3. Worker `fids` → Settings → Variables and secrets → Add → type Secret → `SETTINGS_PASSWORD` = mot de passe des paramètres.
4. Worker → Edit code → coller `worker/fids-worker.js` → Deploy.
Au premier déverrouillage des paramètres, les réglages de l'appareil sont envoyés au serveur ; ensuite tous les appareils les lisent au démarrage.
