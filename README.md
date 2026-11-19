# AeroServices
Outils opérationnels (Dispatch Liège Airport). Voir ARCHITECTURE.md.

## Mise en ligne (sans Netlify)
1. **Site** : GitHub → Settings → Pages → Source « Deploy from a branch » → `main` / `(root)`.
2. **Proxy FIDS** : dash.cloudflare.com → Workers & Pages → Create → Worker → Deploy → Edit code → coller `worker/fids-worker.js` → Deploy.
3. Copier l'adresse du Worker (`https://xxx.workers.dev`) dans `FIDS_PROXY` de `js/fids.js`, puis push.
4. Désactiver le lien Netlify (Site configuration → Build & deploy → Stop builds) pour ne plus consommer de déploiements.
