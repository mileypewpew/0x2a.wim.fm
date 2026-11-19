# 0x2a.wim.fm

0x2a Lab (0x2a.wim.fm) er et statisk nettsted. Nettverksinnhold kommer fra DOELad, LoRA-innhold fra LoraLad. Endringer via PR, deploy fra main.

## Om nettstedet

Nettstedet er ren statisk HTML, CSS og JS uten byggesteg. Repo-roten tilsvarer sideroten. Det som serveres i dag ligger i `/srv/0x2a/site` på web-VPS-en.

### Mappestruktur

- `index.html` — forsiden
- `assets/` — felles ressurser (blant annet `portal.css`)
- `nettverk/` — nettverksseksjonen (`nettverk/index.html`)
- `nettverk/ipv6/` — IPv6-treneren, med `css/`, `js/` og `js/modules/`
- `content/nettverk/ipv6/` — statiske IPv6-moduler. Versjon i `<meta name="ipv6-innhold-versjon">`. Kartleggingen ligger i `nettverk/ipv6/js/modules/catalog.js`.
- `nettverk/grunnleggende/` — treneren Nettverk grunnleggende
- `content/nettverk/grunnleggende/` — temaene til den treneren, pluss manifestet `index.json`
- `ai/` — AI-seksjonen (`ai/index.html`)
- `ai/lora/` — LoRA-treneren (side, stil, skript og vendored biblioteker)
- `content/ai/lora/` — LoRA-modulene som tekst, pluss manifestet `index.json`
- `tests/` — selvtester som kjøres med Node. Mappen deployes ikke. Se [Tester](#tester).

`.gitignore` i roten utelater `*.bak*` og vanlig støy som `.DS_Store`. Sikkerhetskopier og nøkler skal ikke inn i repoet. `tests/.gitignore` utelater `tests/node_modules`.

### Innhold og pull requests

DOELad og LoraLad legger til nytt innhold via en egen branch og en pull request. Ingen endringer skal pushes direkte til `main`.

### Deploy

Nettstedet deployes fra `main`. Serveren henter `main` automatisk omtrent hvert andre minutt. Direkte endringer på serveren blir overskrevet ved neste henting. Det ligger ingen GitHub Actions-workflows, deploy-konfigurasjon eller nøkler i dette repoet. `tests/` er ikke en del av nettstedet og blir ikke deployet.

## Tester

Selvtestene ligger i `tests/` og kjøres lokalt. Det finnes ingen `package.json` i repo-roten. jsdom er en devDependency i `tests/package.json` og brukes bare av DOM-røyktesten.

IPv6-treneren dekkes av `tests/ipv6/test.js`. Den er verifisert med Node.js 22.23.4. Skriptet leser `nettverk/ipv6/` ut fra sin egen plassering (`path.resolve(__dirname, '../../nettverk/ipv6')`), så arbeidsmappen du starter Node fra spiller ingen rolle. Statiske moduler leser `teori.md` og `oppgaver.json` og bruker YAML, retting og markdown fra `nettverk/grunnleggende/js/`. Hver statisk modul har egen localStorage-nøkkel. `ipv6t.stats.v1` er bare heks-modulen. Nettverk grunnleggende dekkes av `tests/grunnleggende/test.js`. `npm test` kjører begge.

Kartet i `nettverk/ipv6/js/modules/catalog.js` er kilden. `jsId` for notasjon, subnetting og typer er de samme som de gamle plassholderne. Det finnes ingen hash-rute å bevare.

| Innhold | JS-id | Kode | Statistikk |
| --- | --- | --- | --- |
| `ipv6-hvorfor` | `ipv6-hvorfor` | 0 | `ipv6t.hvorfor.stats.v1` |
| `21-adressenotasjon` | `notasjon` | 2.1 | `ipv6t.notasjon.stats.v1` |
| `22-subnetting` | `subnetting` | 2.2 | `ipv6t.subnetting.stats.v1` |
| `2a-smarthus-del-1` | `smarthus1` | 2a | `ipv6t.smarthus1.stats.v1` |
| `23-adressetyper` | `typer` | 2.3 | `ipv6t.typer.stats.v1` |

Kode 2a sorteres med `order` `2.2a`, så rekkefølgen blir 2.1, 2.2, 2a, 2.3. En oppgave som ber om kanonisk form (eller «forkortes etter RFC 5952») og har et adressesvar, rettes eksakt: trim av endene, ellers tegn for tegn. Store bokstaver, ledende nuller, uforkortet form og feil plassering av `::` er feil. Svaret foldes ikke ut.

```bash
cd tests
npm ci
npm test
```

Utskriften er på norsk. Siste linje er `N/N sjekker OK` når alle sjekkene passerer. En feil gir exit-kode 1.

### Cache-busting

Cloudflare cacher statiske filer (CSS, JS og andre ressurser). Nettleseren får `max-age` på 4 timer. HTML caches ikke av Cloudflare, så en oppdatert HTML-side blir synlig så snart serveren har hentet `main`.

CSS- og JS-filer lenkes med queryen `?v=YYYYMMDDx`:

- `YYYYMMDD` er datoen filen endres.
- Bokstaven til slutt er `a` første gang den dagen, deretter `b`, `c` og videre hvis samme fil endres flere ganger samme dag.
- Når en CSS- eller JS-fil endres, må `?v=` økes i alle HTML-sider som lenker den filen. En side som beholder den gamle queryen, kan fortsette å få den cachede utgaven.
- `assets/portal.css` lenkes fra forsiden, `nettverk/` og `ai/` med `?v=20261118a`.

LoRA-innhold har et eget versjonsmerke, atskilt fra `?v=` på CSS og JS. `<meta name="lora-innhold-versjon">` i `ai/lora/index.html` legges på `index.json`, `teori.md` og `oppgaver.json`. Øk meta-verdien når innhold eller manifest endres. Ellers kan Cloudflare fortsette å servere den gamle filen selv om HTML-en er ny.

IPv6-innhold har tilsvarende `<meta name="ipv6-innhold-versjon">` i `nettverk/ipv6/index.html`. Den legges på `teori.md` og `oppgaver.json`. Nåværende verdi er `20261119a`.

KaTeX-fontene lastes relativt fra CSS-en (`fonts/*.woff2`). De har ikke eget `?v=`. woff2 står først i CSS-en, så nettleseren henter ikke woff/ttf, og de filene ligger ikke i repoet. Ved bytte av KaTeX-versjon byttes fontfilene ut.

## LoRA-innhold

Siden `ai/lora/` leser modulene når den åpnes. Det er ingen byggesteg. En statisk server kan ikke liste mapper, derfor finnes et manifest.

### Legge til en modul

1. Opprett mappen `content/ai/lora/<nr>-<slug>/`, for eksempel `01-hva-er-lora`.
2. Legg inn `teori.md` og `oppgaver.json` som beskrevet under.
3. Legg mappenavnet til i `content/ai/lora/index.json`. Rekkefølgen er visningsrekkefølgen. Manifestet har bare mappenavn. Tittel, nivåer og kilder leses fra frontmatter:

```json
{"moduler": ["01-hva-er-lora"]}
```

4. Øk `lora-innhold-versjon` i `ai/lora/index.html`, så Cloudflare ikke beholder gammelt manifest eller gamle modulfiler.
5. Legg gjerne til et punkt under LoRA-kortet i `ai/index.html`, på samme måte som modulene er listet i `nettverk/index.html`. Treneren virker uten det punktet, men kategorisiden oppdateres ikke av seg selv.
6. Åpne en pull request. Ikke push til `main`.

### teori.md

Filen starter med YAML-frontmatter mellom `---` linjer. Parseren er en liten delmengde, ikke full YAML. Den tåler:

- enkle verdier, med eller uten anførselstegn (`"sitat"` eller `'sitat'`)
- lister på én linje: `[lett, middels, vanskelig]`
- lister med ett punkt per linje
- lister av objekter, ett objekt per `-`, med feltene på linjene under, eller som `{tittel: "...", url: "..."}`

Ikke bruk ankre, `|`-blokker eller YAML-tagger.

```yaml
---
id: hva-er-lora
kode: "1"
tittel: "Hva er LoRA"
beskrivelse: "Kort ingress som vises på modulkortet."
nivåer: [lett, middels, vanskelig]
kilder:
  - tittel: "LoRA: Low-Rank Adaptation of Large Language Models"
    url: "https://arxiv.org/abs/2106.09685"
oppdatert: "2026-11-18"
---
```

| Felt | Betydning |
| --- | --- |
| `id` | Stabil id. Brukes som nøkkel i statistikken. Ikke endre den etter at noen har øvd. |
| `kode` | Kort kode som vises på kortet, for eksempel `"1"`. Siter verdien hvis den skal beholde ledende nuller. |
| `tittel` | Overskrift. Siter den hvis den inneholder kolon. |
| `beskrivelse` | Én setning på modulkortet. |
| `nivåer` | Liste med nivå-id-er som oppgavene bruker. `lett`, `middels` og `vanskelig` får etikettene Lett, Middels og Vanskelig. |
| `kilder` | Liste av objekter med `tittel` og `url`. Vises som lenker under teorien. |
| `oppdatert` | Dato som sitert streng, `ÅÅÅÅ-MM-DD`. |

Etter frontmatter kommer brødteksten i GitHub-flavored Markdown. Tabeller, lister, kodeblokker og lenker virker. Bilder og HTML som ikke står på en kort tillatelsesliste, fjernes. Lenker må være `http`, `https` eller `mailto`.

Matte:

- inline: `$h = W x$`
- display: `$$\frac{\alpha}{r}$$`
- Et avsnitt som bare består av ett `$...$`-uttrykk, vises også som display-formel. Da blir en formel på egen linje ikke stående som løpende tekst.
- Dollartegn inni kode (enkelt baktegn eller en kodeblokk) er ikke matte.
- Matten tas ut før Markdown-parseren kjører, så `_` og `\` i formlene ikke blir tolket som Markdown.

KaTeX og marked ligger i `ai/lora/vendor/` med lisensfilene sine. De skal ikke hentes fra et CDN.

### oppgaver.json

En JSON-liste. Hvert element ser slik ut:

```json
{
  "id": "lora1-lett-01",
  "nivå": "lett",
  "type": "flervalg",
  "spørsmål": "Hva står LoRA for?",
  "alternativer": ["Low-Rank Adaptation", "Long-Range Attention"],
  "svar": ["Low-Rank Adaptation"],
  "forklaring": { "steg": ["LoRA = Low-Rank Adaptation."] }
}
```

`type` er `flervalg`, `tall` eller `tekst`. `forklaring.steg` er rene setninger, ikke Markdown.

- **flervalg.** `svar` er teksten til det riktige alternativet, ikke et indeksnummer. Flere strenger betyr at hvilket som helst av dem er riktig. Alternativene stokkes hver gang oppgaven vises. Sammenligningen ignorerer store og små bokstaver og overflødig mellomrom, på samme måte som fritekst.
- **tall.** `svar` er strenger med punktum som desimaltegn, for eksempel `"0.78125"`. `toleranse` er et tall. Mangler den, eller er den `0`, kreves samme tallverdi (`2` og `2.0` er like). Ellers godtas et svar der absoluttverdien av differansen er mindre enn eller lik toleransen. Et svar nøyaktig på grensen skal ikke falle utenfor på grunn av binær avrunding. I det brukeren skriver, fjernes mellomrom og understrek, samme rens som IPv6-treneren bruker, og komma godtas som desimaltegn. Tusenskille med punktum virker ikke: skriv `16777216`, `16 777 216` eller `16_777_216`, ikke `16.777.216`.
- **tekst.** Svaret sammenlignes etter trim, uten hensyn til store og små bokstaver, og med flere mellomrom slått sammen til ett. Flere strenger i `svar` er alternative skrivemåter.

En runde trekker tilfeldig blant oppgavene som passer til valgt nivå og type, uten å gjenta en oppgave i samme runde. Finnes det færre enn antallet du ber om, brukes alle.

Statistikken lagres i nettleseren under nøkkelen `lora.stats.v1`, atskilt fra IPv6-trenerens `ipv6t.stats.v1`.

## Nettverk grunnleggende

Siden `nettverk/grunnleggende/` leser temaene fra `content/nettverk/grunnleggende/`. Manifestet er en ordnet liste med mappenavn:

```json
{"moduler": ["11-osi-tcpip", "12-tcp-udp", "13-porter-protokoller", "14-http-https", "15-mac-ip-arp-dns-dhcp", "21-ipv4-cidr", "22-subnetting", "23-nat-pat", "24-dhcp", "25-dns", "26-switching-vlan", "27-ruting", "31-feilsokingsmetodikk", "32-verktoy", "33-scenarioer", "34-brannmur"]}
```

Hvert tema har `teori.md` (YAML-frontmatter med heltall `nivå` 1, 2 eller 3, `kilder` som `{tittel, url}`, sitert `oppdatert`) og `oppgaver.json` (`flervalg`, `tall`, `tekst`). Rettingen er den samme som for LoRA. Nivå 1, 2 og 3 kan velges, og oppgavene filtreres på nivå og tema. Statistikken ligger i `ngrunn.stats.v1`. Ved endring av innhold, øk `<meta name="ngrunn-innhold-versjon">` i `nettverk/grunnleggende/index.html`. Manifestet lister temaene fra `11-osi-tcpip` til `34-brannmur`.
