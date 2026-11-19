---
id: "22-subnetting"
kode: "2.2"
tittel: "Subnetting"
beskrivelse: "Prefikslengder, /48, /56, /64 og hvordan du deler opp en IPv6-blokk."
nivå: 2
kilder:
  - tittel: "RIPE NCC Academy: IPv6 Fundamentals"
    url: "https://academy.ripe.net/course/view.php?id=13"
  - tittel: "RFC 4291: IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - tittel: "RFC 6177: IPv6 Address Assignment to End Sites"
    url: "https://www.rfc-editor.org/rfc/rfc6177"
  - tittel: "RFC 4862: IPv6 Stateless Address Autoconfiguration"
    url: "https://www.rfc-editor.org/rfc/rfc4862"
  - tittel: "RFC 5952: A Recommendation for IPv6 Address Text Representation"
    url: "https://www.rfc-editor.org/rfc/rfc5952"
  - tittel: "RFC 3849: IPv6 Address Prefix Reserved for Documentation"
    url: "https://www.rfc-editor.org/rfc/rfc3849"
oppdatert: "2026-11-19"
---
## Prefiks

Et IPv6-prefiks er alle adresser som starter med de samme *n* bitene, skrevet `adresse/n`. `2001:db8:aa00::/48` rommer alle adresser fra

```
2001:0db8:aa00:0000:0000:0000:0000:0000
```

til

```
2001:0db8:aa00:ffff:ffff:ffff:ffff:ffff
```

De første 48 bitene (her `2001:0db8:aa00`) er like. Resten varierer.

En typisk IPv6-adresse til en vert på et LAN har tre deler:

| Del | Vanlig lengde | Hva den gjør |
|---|---|---|
| Nett-prefiks (global routing prefix) | f.eks. `/48` eller `/56` | Blokken du har fått fra operatøren eller LIR |
| Subnett-ID | bitene fram til `/64` | Hvilket LAN eller VLAN adressen tilhører |
| Interface-ID | de siste 64 bitene | Hvilken vert på det LAN-et |

## Hvorfor /64?

Hvert LAN bør være et **`/64`** (RFC 4291, RFC 6177). SLAAC (RFC 4862) forutsetter at interface-ID er 64 bit. Du «sparer» ikke noe nyttig på å gi et Ethernet-nett et `/80` eller `/120`. Antall verter i et `/64` ($2^{64}$) er mer enn stort nok; det er *antall nett* du planlegger etter.

## Hvor mange nett?

Når prefikset blir 4 bit lenger, får du $2^{4} = 16$ ganger så mange nett. 4 bit er ett heksadesimalt siffer, derfor er lengder på **nibble-grense** (`/48`, `/52`, `/56`, `/60`, `/64`) enklest å lese.

| Prefiks | Antall `/64` | Antall `/56` | Merknad |
|---|---|---|---|
| `/64` | 1 | — | Ett LAN |
| `/60` | $2^{4} = 16$ | — | Lite sted, noen LAN |
| `/56` | $2^{8} = 256$ | 1 | Vanlig hjemme- eller småbedriftsblokk |
| `/52` | $2^{12} = 4096$ | 16 | |
| `/48` | $2^{16} = 65\,536$ | 256 | Vanlig blokk til et sted/en bedrift |
| `/32` | $2^{32}$ | $2^{24} = 16\,777\,216$ | Typisk minste LIR-tildeling; inneholder $65\,536$ `/48` |

Tommelfinger: antall undernett = $2^{(ny\ lengde) - (gammel\ lengde)}$. En `/48` delt i `/56` gir $2^{56-48} = 256$ nett.

RFC 6177 sier at sluttbruker bør få en blokk tilpasset behovet, typisk mellom `/64` (ett nett, bare når du virkelig bare trenger ett) og `/48`. Til hjem og små steder brukes ofte `/56` eller `/60`. Unngå å gi bare én enkelt adresse (`/128`) til et sted som kan komme til å trenge flere nett.

## Et eksempel: dele en /48

Gitt `2001:db8:aa00::/48`. Subnett-ID sitter i den fjerde gruppen (bit 49–64 når vi går til `/64`).

**Til `/56`:** du bruker de første 8 bitene av fjerde gruppe (to heks-siffer), og de siste 8 bitene i gruppen blir 0 i nettadressen.

| Nr. (fra 0) | `/56`-nett | Kanonisk form |
|---|---|---|
| 0 | `2001:db8:aa00:0000::/56` | `2001:db8:aa00::/56` |
| 1 | `2001:db8:aa00:0100::/56` | `2001:db8:aa00:100::/56` |
| 2 | `2001:db8:aa00:0200::/56` | `2001:db8:aa00:200::/56` |
| 255 | `2001:db8:aa00:ff00::/56` | `2001:db8:aa00:ff00::/56` |

**Til `/64`:** hele den fjerde gruppen er subnettnummeret: `2001:db8:aa00:0::/64`, `2001:db8:aa00:1::/64`, …, `2001:db8:aa00:ffff::/64` (65 536 nett).

Inne i `2001:db8:aa00:ab00::/56` ligger `/64`-nettene `2001:db8:aa00:ab00::/64` til `2001:db8:aa00:abff::/64` (256 stykker).

## Nibble-grense og «kutt i sifferet»

Lengder som er delelige med 4 holder skillet mellom nett på et heks-siffer. Et prefiks som `/61` kutter midt i fjerde gruppe: `2001:db8::/61` dekker `2001:db8:0:0::` til `2001:db8:0:7:ffff:ffff:ffff:ffff`, altså åtte `/64`. Det er lov, men vanskeligere å lese. Foretrekk `/60` eller `/64` når du kan.

## Første og siste adresse

I `2001:db8:aa00:1::/64` er første adresse `2001:db8:aa00:1::` (interface-ID alle bit 0) og siste `2001:db8:aa00:1:ffff:ffff:ffff:ffff`. IPv6 har ikke broadcast. Adressen med interface-ID lik 0 er reservert som *subnet-router anycast* (RFC 4291). Når du oppgir selve nettet, er det prefikset (`2001:db8:aa00:1::/64`) du skal skrive, i kanonisk form.
