---
id: "12-tcp-udp"
kode: "NG1.2"
tittel: "TCP og UDP"
beskrivelse: "Tilkobling, pålitelighet, håndtrykk og når du velger hva."
nivå: 1
kilder:
  - tittel: "RFC 9293: Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293"
  - tittel: "RFC 768: User Datagram Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc768"
  - tittel: "RFC 9000: QUIC"
    url: "https://www.rfc-editor.org/rfc/rfc9000"
oppdatert: "2026-11-18"
---
## TCP og UDP på transportlaget

Begge ligger på lag 4 og bruker **portnumre** (16 bit, 0–65535) for å levere data til riktig prosess.

| | TCP | UDP |
|---|---|---|
| Tilkobling | Ja (håndtrykk først) | Nei |
| Pålitelig levering | Ja, med kvittering (ACK) og omsending | Nei |
| Rekkefølge | Garantert | Ikke garantert |
| Flyt- og metningskontroll | Ja (vindu) | Nei |
| Header | Minst 20 byte | 8 byte |
| PDU | Segment | Datagram |
| Protokollnummer i IP | 6 | 17 |
| Typisk bruk | Web (HTTP/1.1, HTTP/2), SSH, e-post | DNS, DHCP, NTP, VoIP, strømming, QUIC/HTTP/3 |

## TCP: treveis håndtrykk

```
Klient                     Server
  | ---- SYN (seq=x) ------> |
  | <--- SYN-ACK ----------- |   (seq=y, ack=x+1)
  | ---- ACK (ack=y+1) ----> |
        tilkoblet
```

- **SYN** starter en tilkobling, **ACK** bekrefter mottak.
- **FIN** avslutter pent (hver side sender FIN og får ACK).
- **RST** bryter tilkoblingen brått.
- Sekvensnumrene (32 bit) holder orden på bytene, så mottakeren kan sortere og oppdage tap.
- Mangler ACK (tidsavbrudd eller dupliserte ACK-er), sender TCP segmentet på nytt.
- **Vinduet** (receive window) forteller hvor mye data mottakeren kan ta imot før neste ACK. Det er flytkontroll.

## UDP: enkelt og raskt

UDP sender datagrammer uten håndtrykk. Headeren har bare kildeport, målport, lengde og sjekksum (8 byte). Sjekksummen er valgfri i IPv4, men påkrevd i IPv6.

UDP passer når lav forsinkelse er viktigere enn at hver pakke kommer fram, eller når applikasjonen selv tar seg av pålitelighet (som QUIC).

## En tilkobling identifiseres av fire verdier

Kilde-IP, kildeport, mål-IP og målport. Derfor kan mange klienter snakke med samme server på port 443 samtidig.

DNS bruker vanligvis UDP 53, men går over til TCP 53 når svaret er for stort eller ved soneoverføring.
