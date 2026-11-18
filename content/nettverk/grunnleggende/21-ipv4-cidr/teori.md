---
id: "21-ipv4-cidr"
kode: "NG2.1"
tittel: "IPv4-adressering og CIDR"
beskrivelse: "Nettmaske og prefiks, klasser mot CIDR og spesielle adresser."
nivå: 2
kilder:
  - tittel: "RFC 791: Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
  - tittel: "RFC 4632: Classless Inter-domain Routing (CIDR)"
    url: "https://www.rfc-editor.org/rfc/rfc4632"
  - tittel: "RFC 1918: Address Allocation for Private Internets"
    url: "https://www.rfc-editor.org/rfc/rfc1918"
  - tittel: "RFC 3927: Dynamic Configuration of IPv4 Link-Local Addresses"
    url: "https://www.rfc-editor.org/rfc/rfc3927"
  - tittel: "RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space"
    url: "https://www.rfc-editor.org/rfc/rfc6598"
  - tittel: "RFC 6890: Special-Purpose IP Address Registries"
    url: "https://www.rfc-editor.org/rfc/rfc6890"
  - tittel: "RFC 5737: IPv4 Address Blocks Reserved for Documentation"
    url: "https://www.rfc-editor.org/rfc/rfc5737"
oppdatert: "2026-11-18"
---
## IPv4-adressen

En IPv4-adresse er 32 bit, skrevet som fire oktetter i desimal (0–255): `192.168.1.10`. Adressen har en **nettdel** og en **vertsdel**. Prefikslengden eller nettmasken forteller hvor skillet går.

| Prefiks | Nettmaske | Binært (siste oktett) | Vertsbit |
|---|---|---|---|
| /8 | 255.0.0.0 | – | 24 |
| /16 | 255.255.0.0 | – | 16 |
| /24 | 255.255.255.0 | 00000000 | 8 |
| /25 | 255.255.255.128 | 10000000 | 7 |
| /26 | 255.255.255.192 | 11000000 | 6 |
| /27 | 255.255.255.224 | 11100000 | 5 |
| /28 | 255.255.255.240 | 11110000 | 4 |
| /29 | 255.255.255.248 | 11111000 | 3 |
| /30 | 255.255.255.252 | 11111100 | 2 |

Verdiene en maskeoktett kan ha: 0, 128, 192, 224, 240, 248, 252, 254, 255.

## Klasser (historisk) og CIDR

| Klasse | Første oktett | Standardmaske | Bruk |
|---|---|---|---|
| A | 1–126 | /8 | Store nett |
| B | 128–191 | /16 | Mellomstore nett |
| C | 192–223 | /24 | Små nett |
| D | 224–239 | – | Multicast |
| E | 240–255 | – | Reservert/eksperimentelt |

127 hører formelt til klasse A-området, men er satt av til loopback. Klassene sløste med adresser og ga store rutetabeller. Siden 1993 brukes **CIDR** (RFC 4632): prefikset kan ha hvilken som helst lengde (/0–/32), og nett kan slås sammen (aggregeres) i rutetabellen. Klassene er nå bare historie og ordforråd.

## Spesielle adresser

| Blokk | Betydning | Kilde |
|---|---|---|
| 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 | Private adresser, rutes ikke på internett | RFC 1918 |
| 127.0.0.0/8 | Loopback (maskinen selv), vanligvis 127.0.0.1 | RFC 1122 |
| 169.254.0.0/16 | Link-local (APIPA), når DHCP ikke svarer | RFC 3927 |
| 100.64.0.0/10 | Delt adresserom for CGNAT hos operatører | RFC 6598 |
| 0.0.0.0 | «Denne verten / ingen adresse ennå». 0.0.0.0/0 = standardrute | RFC 1122 |
| 255.255.255.255 | Begrenset kringkasting, bare i eget nett | RFC 919/1122 |
| 224.0.0.0/4 | Multicast | RFC 5771 |
| 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 | Dokumentasjon og eksempler | RFC 5737 |
