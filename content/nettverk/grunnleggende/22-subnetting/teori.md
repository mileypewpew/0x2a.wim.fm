---
id: "22-subnetting"
kode: "NG2.2"
tittel: "Subnetting"
beskrivelse: "Nett, broadcast, vertsområde og oppdeling av nett, regnet steg for steg."
nivå: 2
kilder:
  - tittel: "RFC 950: Internet Standard Subnetting Procedure"
    url: "https://www.rfc-editor.org/rfc/rfc950"
  - tittel: "RFC 4632: Classless Inter-domain Routing (CIDR)"
    url: "https://www.rfc-editor.org/rfc/rfc4632"
  - tittel: "RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links"
    url: "https://www.rfc-editor.org/rfc/rfc3021"
oppdatert: "2026-11-18"
---
## Metoden: blokkstørrelse

1. Finn den **interessante oktetten**, den der masken ikke er 255 eller 0.
2. **Blokkstørrelse** = 256 − maskeverdien i den oktetten. For eksempel gir /27 masken .224, og 256 − 224 = 32.
3. **Nettadresse:** det største multiplumet av blokkstørrelsen som er ≤ adressens verdi i oktetten.
4. **Kringkasting (broadcast):** neste nett minus 1.
5. **Første vert** = nettadresse + 1. **Siste vert** = broadcast − 1.
6. **Antall verter** = $2^{(32-n)} - 2$. Nettadressen og broadcast kan ikke gis til verter.

### Eksempel: 192.168.10.77/27

| Steg | Regning | Svar |
|---|---|---|
| Maske | /27 | 255.255.255.224 |
| Blokk | 256 − 224 | 32 |
| Nett | 77 ligger i 64–95 | 192.168.10.64 |
| Broadcast | 96 − 1 | 192.168.10.95 |
| Verter | .65 – .94 | $2^5 - 2 = 30$ |

## Dele opp en /24

Hver bit du låner fra vertsdelen, dobler antall subnett og halverer størrelsen.

| Prefiks | Maske | Blokk | Subnett i en /24 | Verter per subnett |
|---|---|---|---|---|
| /24 | .0 | 256 | 1 | 254 |
| /25 | .128 | 128 | 2 | 126 |
| /26 | .192 | 64 | 4 | 62 |
| /27 | .224 | 32 | 8 | 30 |
| /28 | .240 | 16 | 16 | 14 |
| /29 | .248 | 8 | 32 | 6 |
| /30 | .252 | 4 | 64 | 2 |

Større nett enn /24 regnes på samme måte i tredje oktett. For eksempel har /22 masken 255.255.252.0 og blokkstørrelse 4 i tredje oktett.

**Spesialtilfeller:** /31 brukes på punkt-til-punkt-lenker med 2 brukbare adresser (RFC 3021). /32 er én enkelt vert.

**Velge størrelse:** finn minste $h$ slik at $2^h - 2 \ge$ antall verter du trenger. Prefikset blir da $32 - h$.
