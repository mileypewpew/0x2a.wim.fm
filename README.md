# 0x2a.wim.fm

0x2a.wim.fm: statisk studieportal. Nettverksinnhold kommer fra DOELad, LoRA-innhold fra LoraLad. Endringer via PR, deploy fra main.

## Om nettstedet

Nettstedet er ren statisk HTML, CSS og JS uten byggesteg. Repo-roten tilsvarer sideroten. Det som serveres i dag ligger i `/srv/0x2a/site` på web-VPS-en.

### Mappestruktur

- `index.html` — forsiden
- `assets/` — felles ressurser (blant annet `portal.css`)
- `nettverk/` — nettverksseksjonen (`nettverk/index.html`)
- `nettverk/ipv6/` — IPv6-treneren, med `css/`, `js/` og `js/modules/`
- `ai/` — AI-seksjonen (`ai/index.html`)
- `ai/lora/` — LoRA-treneren (side, stil, skript og vendored biblioteker)
- `content/ai/lora/` — LoRA-modulene som tekst, pluss manifestet `index.json`

`.gitignore` i roten utelater `*.bak*` og vanlig støy som `.DS_Store`. Sikkerhetskopier og nøkler skal ikke inn i repoet.

### Innhold og pull requests

DOELad og LoraLad legger til nytt innhold via en egen branch og en pull request. Ingen endringer skal pushes direkte til `main`.

### Deploy

Deploy skjer fra `main`. I dag gjør HomeLad det manuelt etter at Wim har sagt ja i chatten. Automatisering kommer senere. Det ligger ingen GitHub Actions-workflows, deploy-konfigurasjon eller nøkler i dette repoet.

### Cache-busting

Cloudflare cacher statiske filer. HTML caches ikke.

- CSS- og JS-lenker i HTML bruker `?v=YYYYMMDDx`. Øk verdien når den filen endres. LoRA-siden bruker `?v=20261118a` på sine egne filer.
- LoRA-treneren henter tekstfiler i `content/ai/lora/` med samme type versjon. Verdien står i `<meta name="lora-innhold-versjon">` i `ai/lora/index.html` og legges på `index.json`, `teori.md` og `oppgaver.json`. Øk meta-verdien når innhold eller manifest endres. Ellers kan Cloudflare fortsette å servere den gamle filen selv om HTML-en er ny.
- KaTeX-fontene lastes relativt fra CSS-en (`fonts/*.woff2`). De har ikke eget `?v=`. woff2 står først i CSS-en, så nettleseren henter ikke woff/ttf, og de filene ligger ikke i repoet. Ved bytte av KaTeX-versjon byttes fontfilene ut.

## LoRA-innhold

Siden `ai/lora/` leser modulene når den åpnes. Det er ingen byggesteg. En statisk server kan ikke liste mapper, derfor finnes et manifest.

### Legge til en modul

1. Opprett mappen `content/ai/lora/<nr>-<slug>/`, for eksempel `01-hva-er-lora`.
2. Legg inn `teori.md` og `oppgaver.json` som beskrevet under.
3. Legg mappenavnet til i `content/ai/lora/index.json`. Rekkefølgen er visningsrekkefølgen. Manifestet har bare mappenavn. Tittel, nivåer og kilder leses fra frontmatter:

```json
{"moduler": ["00-eksempel", "01-hva-er-lora"]}
```

4. Øk `lora-innhold-versjon` i `ai/lora/index.html`, så Cloudflare ikke beholder gammelt manifest eller gamle modulfiler.
5. Legg gjerne til et punkt under LoRA-kortet i `ai/index.html`, på samme måte som modulene er listet i `nettverk/index.html`. Treneren virker uten det punktet, men kategorisiden oppdateres ikke av seg selv.
6. Åpne en pull request. Ikke push til `main`.

`00-eksempel` er testinnhold. Det viser filformatet, og skal ikke brukes som fagtekst.

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
