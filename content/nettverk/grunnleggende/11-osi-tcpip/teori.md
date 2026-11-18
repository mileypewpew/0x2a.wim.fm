---
id: "11-osi-tcpip"
kode: "NG1.1"
tittel: "OSI og TCP/IP"
beskrivelse: "Lagene, hva de gjør, PDU-navnene og innkapsling."
nivå: 1
kilder:
  - tittel: "ITU-T X.200: OSI Basic Reference Model"
    url: "https://www.itu.int/rec/T-REC-X.200-199407-I/en"
  - tittel: "RFC 1122: Requirements for Internet Hosts – Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122"
oppdatert: "2026-11-18"
---
## To modeller

- **OSI-modellen** (ITU-T X.200 / ISO/IEC 7498-1) er en *referansemodell* med 7 lag. Den brukes til å forklare og feilsøke.
- **TCP/IP-modellen** (RFC 1122) beskriver protokollene internett faktisk bruker, med 4 lag.

## OSI-modellen

| Lag | Navn | Oppgave | PDU | Eksempler |
|---|---|---|---|---|
| 7 | Applikasjon | Tjenester for programmer | Data | HTTP, DNS, SSH |
| 6 | Presentasjon | Format, tegnkoding, kryptering | Data | TLS*, UTF-8, JPEG |
| 5 | Sesjon | Opprette, holde og avslutte dialoger | Data | RPC, sesjonshåndtering |
| 4 | Transport | Ende-til-ende mellom prosesser, porter | Segment (TCP) / datagram (UDP) | TCP, UDP |
| 3 | Nettverk | Logisk adressering og ruting | Pakke (IP-datagram) | IPv4, IPv6, ICMP |
| 2 | Datalink | Lokal levering, MAC-adresser | Ramme | Ethernet, Wi-Fi (802.11) |
| 1 | Fysisk | Bit som signaler: spenning, lys, radio | Bit | Kabel, fiber, kontakter |

\*TLS passer ikke perfekt i ett lag; den plasseres ofte mellom lag 4 og 7.

Huskeregel fra lag 1 og opp: **F**ysisk, **D**atalink, **N**ettverk, **T**ransport, **S**esjon, **P**resentasjon, **A**pplikasjon.

## TCP/IP-modellen

| TCP/IP-lag | Tilsvarer OSI | Protokoller |
|---|---|---|
| Applikasjon | 5–7 | HTTP, DNS, DHCP, SSH |
| Transport | 4 | TCP, UDP |
| Internett | 3 | IP, ICMP |
| Link (nettverkstilgang) | 1–2 | Ethernet, Wi-Fi, ARP |

## Innkapsling

Når data sendes, legger hvert lag til sin egen header:

```
Data → [TCP-header | Data] = segment
     → [IP-header | segment] = pakke
     → [Ethernet-header | pakke | FCS] = ramme
     → bit på kabelen
```

Mottakeren gjør det motsatte (dekapsling): hvert lag fjerner sin header og gir resten videre opp.

## Utstyr og lag

| Utstyr | Lag | Ser på |
|---|---|---|
| Hub / repeater | 1 | Bare signaler |
| Switch | 2 | MAC-adresser |
| Ruter | 3 | IP-adresser |
| Brannmur | 3–7 | IP, porter og mer |
