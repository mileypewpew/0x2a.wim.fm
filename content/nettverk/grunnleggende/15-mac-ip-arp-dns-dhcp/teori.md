---
id: "15-mac-ip-arp-dns-dhcp"
kode: "NG1.5"
tittel: "MAC, IP, ARP, DNS og DHCP"
beskrivelse: "Adresser på lag 2 og 3, og tjenestene som kobler dem sammen."
nivå: 1
kilder:
  - tittel: "RFC 826: An Ethernet Address Resolution Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc826"
  - tittel: "RFC 791: Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
  - tittel: "RFC 1918: Address Allocation for Private Internets"
    url: "https://www.rfc-editor.org/rfc/rfc1918"
  - tittel: "RFC 1034: Domain Names – Concepts and Facilities"
    url: "https://www.rfc-editor.org/rfc/rfc1034"
  - tittel: "RFC 2131: Dynamic Host Configuration Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc2131"
  - tittel: "RFC 4861: Neighbor Discovery for IP version 6"
    url: "https://www.rfc-editor.org/rfc/rfc4861"
oppdatert: "2026-11-18"
---
## Adresser på to lag

| | MAC-adresse | IPv4-adresse | IPv6-adresse |
|---|---|---|---|
| Lag | 2 (datalink) | 3 (nettverk) | 3 (nettverk) |
| Lengde | 48 bit (6 byte, 12 heks-sifre) | 32 bit (4 byte) | 128 bit |
| Skrivemåte | `3c:22:fb:1a:9e:07` | `192.168.1.10` | `2001:db8::1` |
| Rekkevidde | Lokalt nett (ett segment) | Ende til ende, rutes | Ende til ende, rutes |

- De første 24 bitene i en MAC-adresse er **OUI**-en (Organizationally Unique Identifier) og viser produsenten.
- Kringkastingsadressen på lag 2 er `ff:ff:ff:ff:ff:ff`.
- **Private IPv4-områder (RFC 1918):** `10.0.0.0/8`, `172.16.0.0/12` (172.16.0.0–172.31.255.255) og `192.168.0.0/16`.

## ARP: fra IP til MAC (IPv4)

For å sende en pakke i det lokale nettet trenger maskinen mottakerens MAC-adresse:

1. **ARP-forespørsel** som kringkasting: «Hvem har 10.0.0.1? Svar til 10.0.0.5.»
2. **ARP-svar** som unicast: «10.0.0.1 har MAC 3c:22:…»
3. Svaret lagres en stund i ARP-tabellen (`ip neigh` på Linux).

Skal pakken ut av nettet, spør maskinen etter MAC-adressen til **standard gateway** (ruteren), ikke til den endelige mottakeren. IPv6 bruker ikke ARP, men **NDP** (Neighbor Discovery, RFC 4861) med ICMPv6.

## DNS: fra navn til IP

| Posttype | Betyr |
|---|---|
| A | Navn → IPv4-adresse |
| AAAA | Navn → IPv6-adresse |
| CNAME | Alias til et annet navn |
| MX | E-postserver for domenet |
| NS | Navneservere for sonen |
| PTR | Omvendt oppslag: IP → navn |
| TXT | Fri tekst, f.eks. SPF og verifisering |

- Klienten spør en **rekursiv resolver**, som spør videre (rot → TLD → autoritativ server) og mellomlagrer svaret.
- **TTL** sier hvor lenge svaret kan mellomlagres.
- DNS bruker port 53 (UDP, og TCP for store svar). Test med `dig wim.fm AAAA` eller `nslookup`.

## DHCP: automatisk IP-oppsett (IPv4)

Prosessen kalles **DORA**:

| Steg | Melding | Fra → til |
|---|---|---|
| 1 | **D**iscover | Klient (0.0.0.0) → kringkasting 255.255.255.255 |
| 2 | **O**ffer | Server → klient: tilbyr en adresse |
| 3 | **R**equest | Klient → kringkasting: ber om adressen |
| 4 | **A**cknowledge (ACK) | Server → klient: bekrefter |

DHCP gir typisk IP-adresse, nettmaske, standard gateway, DNS-servere og leietid (lease). Klienten må fornye leien før den går ut. Serveren bruker UDP 67, og klienten UDP 68.
