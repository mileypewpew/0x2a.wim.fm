---
id: "21-adressenotasjon"
kode: "2.1"
tittel: "Adressenotasjon"
beskrivelse: "Hvordan en IPv6-adresse skrives, forkortes og utvides etter RFC 5952."
nivå: 2
kilder:
  - tittel: "RIPE NCC Academy: IPv6 Fundamentals"
    url: "https://academy.ripe.net/course/view.php?id=13"
  - tittel: "RFC 4291: IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - tittel: "RFC 5952: A Recommendation for IPv6 Address Text Representation"
    url: "https://www.rfc-editor.org/rfc/rfc5952"
  - tittel: "RFC 3849: IPv6 Address Prefix Reserved for Documentation"
    url: "https://www.rfc-editor.org/rfc/rfc3849"
  - tittel: "RFC 3986: Uniform Resource Identifier (URI): Generic Syntax"
    url: "https://www.rfc-editor.org/rfc/rfc3986"
oppdatert: "2026-11-19"
---
## Oppbygning

En IPv6-adresse er **128 bit**. Vi skriver den som **åtte grupper** på 16 bit, skilt med kolon. Hver gruppe er fire heksadesimale siffer (ett siffer = 4 bit, så 16 bit = fire siffer).

```
2001:0db8:0000:0000:0000:0000:0000:0001
 \__/ \__/ \__/ \__/ \__/ \__/ \__/ \__/
   1    2    3    4    5    6    7    8     ← åtte grupper
```

`2001:db8::/32` er reservert til dokumentasjon og eksempler (RFC 3849). Bruk den i oppgaver og labnotater, ikke i et ekte nett.

Hvis heks er nytt: sifrene er 0–9 og a–f (10–15). Gruppen `0db8` er verdien $13 \times 16^{2} + 11 \times 16 + 8 = 3512$ i titallsystemet, men til notasjon trenger du bare å se på sifrene.

## To forkortingsregler (RFC 4291)

**1. Ledende nuller** i en gruppe kan sløyfes. En gruppe som bare er nuller skrives som `0`.

```
2001:0db8:0000:0000:0000:0000:0000:0001
2001:db8:0:0:0:0:0:1
```

Du kan ikke fjerne *etterfølgende* nuller inne i gruppen: `0c50` blir `c50`, aldri `c5`.

**2. Én sammenhengende rekke** av grupper som bare er nuller kan erstattes med `::`. Det kan bare gjøres **én gang** i adressen.

```
2001:db8:0:0:0:0:0:1
2001:db8::1
```

## Kanonisk form (RFC 5952)

Mange skrivemåter er lovlige, men RFC 5952 gir én anbefalt, *kanonisk* form. Bruk den når du skriver en adresse:

| Regel | Hva det betyr | Eksempel |
|---|---|---|
| Små bokstaver | `a`–`f`, ikke `A`–`F` | `2001:db8::abcd` |
| Fjern ledende nuller | aldri `0db8` eller `0001` | `db8`, `1` |
| En enkelt 0-gruppe blir `0` | `::` brukes aldri på bare én gruppe | `2001:db8:0:1:1:1:1:1` (ikke `2001:db8::1:1:1:1:1`) |
| `::` så mye som mulig | den lengste rekken av 0-grupper | `2001:db8:0:0:0:0:2:1` → `2001:db8::2:1` |
| Lik lengde? Ta den venstre | første (venstre) rekke komprimeres | `2001:db8:0:0:1:0:0:1` → `2001:db8::1:0:0:1` |

`2001:db8::0:1` er altså ikke kanonisk, fordi `::` kan trekkes lenger til `2001:db8::1`.

Å utvide er det motsatte: skriv alle åtte gruppene med fire siffer. `2001:db8::1` blir `2001:0db8:0000:0000:0000:0000:0000:0001`.

## Prefiks og nettadresser

Et **prefiks** er de første *n* bitene av adressen, skrevet som `adresse/lengde`. `2001:db8::/32` er alle adresser der de første 32 bitene er `2001:0db8`.

Ikke la deg lure av `::`. `2001:db8:1234::/64` er det samme nettet som `2001:db8:1234:0::/64`. Den fjerde gruppen er null, selv om den er skjult.

I URL-er og i nettleseren må IPv6-adressen i en vertshenvisning stå i hakeparentes, ellers kolliderer kolon med portnummer (RFC 3986): `https://[2001:db8::1]:443/`.

## Vanlige feil

- To `::` i samme adresse (`2001:db8::1::2`) — ulovlig, du vet ikke hvor mange nuller hver skal dekke.
- Å komprimere én enkelt 0-gruppe med `::`.
- Å fjerne nuller på feil plass (`0c50` → `c5`).
- Å la ledende nuller stå igjen når du skal skrive kanonisk form (`2001:0db8::1`).
- Store bokstaver i kanonisk form (`2001:DB8::1`).
