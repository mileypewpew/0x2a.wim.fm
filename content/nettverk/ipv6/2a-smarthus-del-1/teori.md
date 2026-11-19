---
id: "2a-smarthus-del-1"
kode: "2a"
tittel: "Aktivitet 2a: Smarthus – del 1"
beskrivelse: "Øv på å dele en IPv6-blokk til et hus: /64-nett til rom og enhetsgrupper."
nivå: 2
kilder:
  - tittel: "RIPE NCC Academy: IPv6 Fundamentals"
    url: "https://academy.ripe.net/course/view.php?id=13"
  - tittel: "RFC 4291: IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - tittel: "RFC 6177: IPv6 Address Assignment to End Sites"
    url: "https://www.rfc-editor.org/rfc/rfc6177"
  - tittel: "RFC 5952: A Recommendation for IPv6 Address Text Representation"
    url: "https://www.rfc-editor.org/rfc/rfc5952"
  - tittel: "RFC 3849: IPv6 Address Prefix Reserved for Documentation"
    url: "https://www.rfc-editor.org/rfc/rfc3849"
  - tittel: "RFC 4862: IPv6 Stateless Address Autoconfiguration"
    url: "https://www.rfc-editor.org/rfc/rfc4862"
oppdatert: "2026-11-19"
---
## Scenarioet

Husholdningen i Fjellveien 4 får IPv6-blokken `2001:db8:a00:bb00::/56` fra internettleverandøren (dokumentasjonsprefiks, RFC 3849). Huset skal ha egne `/64`-nett (ett LAN hver, så SLAAC virker) til rom og enhetsgrupper.

De trenger åtte nett nå, og vil legge planen på **nibble-grense** slik at det er plass til flere senere uten å nummerere på nytt.

| Nr. (fra 0) | Bruk | Prefiks |
|---|---|---|
| 0 | Infrastruktur (ruter og aksesspunkter) | `2001:db8:a00:bb00::/64` |
| 1 | Hjemmekontor | `2001:db8:a00:bb01::/64` |
| 2 | Media og stue | `2001:db8:a00:bb02::/64` |
| 3 | Gjestenett | `2001:db8:a00:bb03::/64` |
| 4 | IoT (lys, termostater, høyttalere) | `2001:db8:a00:bb04::/64` |
| 5 | Kameraer | `2001:db8:a00:bb05::/64` |
| 6 | Kjøkken | `2001:db8:a00:bb06::/64` |
| 7 | Ute og garasje (lader og port) | `2001:db8:a00:bb07::/64` |
| 8–15 | Reservert til senere | `2001:db8:a00:bb08::/64` … `2001:db8:a00:bb0f::/64` |

De åtte nettene pluss reserven er den første `/60` i tildelingen: `2001:db8:a00:bb00::/60` (16 `/64`). Resten av `/56`-en (`bb10`–`bbff`) ligger urørt.

## Fremgangsmåte

1. Skriv blokken du har fått i **kanonisk form** (RFC 5952), med `/lengde`.
2. Hvert LAN får et **`/64`**. Antall `/64` i en blokk er $2^{(64 - p)}$, der $p$ er prefikslengden du har. En `/56` gir $2^{8} = 256$ nett.
3. Tell hvor mange `/64` du trenger *nå*.
4. Rund opp til neste **nibble-grense** (prefikslengde delelig med 4). Fra en `/56` er stegene `/60` (16 nett) og hele `/56` (256 nett). Åtte nett får derfor en `/60`, ikke en `/61` eller `/62`.
5. Nummerer fra 0 i de bitene som er igjen fram til `/64`. Her sitter de i de to siste sifrene av fjerde gruppe (`bb00`, `bb01`, …).
6. **Første** nett har disse bitene satt til 0. **Siste** nett i blokken har dem satt til 1 (`bbff` i `/56`, `bb0f` i den første `/60`).
7. For å finne hvilket nett en adresse tilhører: se på fjerde gruppe, og kutt den til `/64`. Sjekk også at adressen i det hele tatt ligger i `/56`-en.
