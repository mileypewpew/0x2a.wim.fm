# 0x2a.wim.fm
0x2a.wim.fm: statisk studieportal (innhold fra DOELad). Endringer via PR, deploy fra main.

## Om nettstedet

Nettstedet er ren statisk HTML, CSS og JS uten byggesteg. Repo-roten tilsvarer sideroten. Det som serveres i dag ligger i `/srv/0x2a/site` på web-VPS-en.

### Mappestruktur

- `index.html` — forsiden
- `assets/` — felles ressurser (blant annet `portal.css`)
- `nettverk/` — nettverksseksjonen (`nettverk/index.html`)
- `nettverk/ipv6/` — IPv6-treneren, med `css/`, `js/` og `js/modules/`

`.gitignore` i roten utelater `*.bak*` og vanlig støy som `.DS_Store`. Sikkerhetskopier og nøkler skal ikke inn i repoet.

### Innhold og pull requests

DOELad legger til nytt innhold (nye filer og sider) via en egen branch og en pull request. Ingen endringer skal pushes direkte til `main`.

### Deploy

Deploy skjer fra `main`. I dag gjør HomeLad det manuelt etter at Wim har sagt ja i chatten. Automatisering kommer senere. Det ligger ingen GitHub Actions-workflows, deploy-konfigurasjon eller nøkler i dette repoet.

### Cache-busting

Cloudflare cacher statiske filer. Derfor skal `?v=YYYYMMDDx`-parameteren på CSS- og JS-lenker i HTML-en økes ved hver endring av CSS eller JS (for eksempel `?v=20261117b`). HTML caches ikke av Cloudflare.
