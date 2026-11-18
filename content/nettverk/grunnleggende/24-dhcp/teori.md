---
id: "24-dhcp"
kode: "NG2.4"
tittel: "DHCP i dybden"
beskrivelse: "DORA, leietid og fornying, opsjoner, reservasjoner og relé."
nivå: 2
kilder:
  - tittel: "RFC 2131: Dynamic Host Configuration Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc2131"
  - tittel: "RFC 2132: DHCP Options and BOOTP Vendor Extensions"
    url: "https://www.rfc-editor.org/rfc/rfc2132"
  - tittel: "RFC 3046: DHCP Relay Agent Information Option"
    url: "https://www.rfc-editor.org/rfc/rfc3046"
  - tittel: "OPNsense: Dnsmasq DNS & DHCP"
    url: "https://docs.opnsense.org/manual/dnsmasq.html"
oppdatert: "2026-11-18"
---
## DORA i detalj (IPv4)

| Steg | Melding | Fra → til | Innhold |
|---|---|---|---|
| 1 | DHCPDISCOVER | 0.0.0.0:68 → 255.255.255.255:67 | «Er det en DHCP-server her?» med klientens MAC |
| 2 | DHCPOFFER | Server:67 → klient:68 | Tilbudt adresse, maske, gateway, DNS og leietid |
| 3 | DHCPREQUEST | 0.0.0.0:68 → 255.255.255.255:67 | «Jeg tar tilbudet fra server X» (option 54) |
| 4 | DHCPACK | Server:67 → klient:68 | Bekreftelse. Klienten kan bruke adressen |

Request kringkastes slik at også andre DHCP-servere ser at tilbudet deres ble avslått. Om svarene sendes som unicast eller kringkasting, avhenger av klienten (broadcast-flagget).

Andre meldinger: **DHCPNAK** (avslag, f.eks. feil nett), **DHCPDECLINE** (klienten fant at adressen allerede er i bruk), **DHCPRELEASE** (klienten gir adressen tilbake) og **DHCPINFORM** (klienten har adresse, men vil ha andre innstillinger).

## Leietid og fornying

| Tidspunkt | Standard (RFC 2131) | Hva klienten gjør |
|---|---|---|
| T1 | 50 % av leietiden | Unicast DHCPREQUEST til samme server for å fornye |
| T2 | 87,5 % av leietiden | Kringkaster REQUEST til en hvilken som helst server |
| Utløp | 100 % | Må slutte å bruke adressen og starte med DISCOVER |

## Vanlige DHCP-opsjoner (RFC 2132)

| Opsjon | Innhold |
|---|---|
| 1 | Nettmaske |
| 3 | Ruter (standard gateway) |
| 6 | DNS-servere |
| 15 | Domenenavn (f.eks. `nermo.farm`) |
| 42 | NTP-servere |
| 51 | Leietid |
| 53 | Meldingstype (DISCOVER, OFFER …) |
| 54 | Serveridentifikator |
| 66 / 67 | TFTP-server og oppstartsfil (PXE) |
| 82 | Relay agent information (RFC 3046) |

## Pool, reservasjon og relé

- **Pool (scope):** området serveren deler ut fra, f.eks. 10.0.0.100–10.0.0.200.
- **Reservasjon (statisk tildeling):** en bestemt MAC-adresse får alltid samme IP. Legg reservasjoner utenfor poolen, eller sørg for at serveren tar hensyn til dem, så unngår du konflikter.
- **DHCP-relé:** kringkasting stopper ved ruteren. Et relé («ip helper») på ruteren tar imot DISCOVER i ett nett, setter sin egen adresse i feltet **giaddr** og sender meldingen som unicast til en DHCP-server i et annet nett. Serveren velger pool ut fra giaddr.
- **Falsk (rogue) DHCP-server:** en uautorisert server kan gi klienter feil gateway eller DNS. *DHCP snooping* på switcher stopper OFFER fra porter som ikke er klarert.
