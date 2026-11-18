---
id: "27-ruting"
kode: "NG2.7"
tittel: "Gateway og ruting"
beskrivelse: "Standard gateway, rutetabell, lengste prefiks og statisk mot dynamisk ruting."
nivå: 2
kilder:
  - tittel: "RFC 1812: Requirements for IP Version 4 Routers"
    url: "https://www.rfc-editor.org/rfc/rfc1812"
  - tittel: "RFC 4632: Classless Inter-domain Routing (CIDR)"
    url: "https://www.rfc-editor.org/rfc/rfc4632"
  - tittel: "RFC 2328: OSPF Version 2"
    url: "https://www.rfc-editor.org/rfc/rfc2328"
  - tittel: "ip-route(8) – Linux manual page"
    url: "https://man7.org/linux/man-pages/man8/ip-route.8.html"
oppdatert: "2026-11-18"
---
## Standard gateway

En vert sammenligner måladressen med sitt eget subnett (adresse + maske):

- **Samme subnett:** sender direkte. Den finner mottakerens MAC med ARP (IPv4) eller NDP (IPv6).
- **Annet subnett:** sender til **standard gateway** (ruteren). Rammen får gatewayens MAC, men IP-pakken beholder den endelige måladressen.

Gatewayen må ligge i vertens eget subnett. Uten gateway når verten bare sitt eget nett.

## Rutetabellen

| Felt | Betyr |
|---|---|
| Mål / prefiks | Nettet ruten gjelder, f.eks. 10.0.0.0/24 |
| Neste hopp (via) | Ruteren pakken skal sendes til |
| Grensesnitt (dev) | Porten pakken går ut på |
| Metrikk | Kostnad. Lavest vinner blant like ruter |

```text
$ ip route
default via 10.0.0.1 dev eth0 proto dhcp metric 100
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.15
```

`default` er det samme som 0.0.0.0/0. Ruten for 10.0.0.0/24 er **direkte tilkoblet**: den har ingen `via`, fordi nettet ligger på grensesnittet selv.

## Lengste prefiks vinner

Matcher flere ruter samme måladresse, brukes den mest spesifikke (lengst prefiks).

| Rute | Matcher 10.1.2.3? |
|---|---|
| 0.0.0.0/0 via A | Ja (/0) |
| 10.0.0.0/8 via B | Ja (/8) |
| 10.1.0.0/16 via C | Ja (/16) ← **valgt** |
| 10.1.3.0/24 via D | Nei |

## Typer ruter

| Type | Hvordan | Fordeler / ulemper |
|---|---|---|
| Direkte tilkoblet | Automatisk fra grensesnittets adresse | Alltid riktig |
| Statisk | Lagt inn manuelt | Enkelt og forutsigbart, men tilpasser seg ikke feil |
| Dynamisk | Lært med rutingprotokoll | Tilpasser seg endringer, men er mer komplekst |

| Protokoll | Type | Metrikk | Bruk |
|---|---|---|---|
| RIP | Avstandsvektor | Antall hopp (maks 15) | Små og eldre nett |
| OSPF | Lenketilstand | Kostnad (båndbredde) | Inne i en organisasjon |
| BGP | Stivektor | Policy og attributter | Mellom autonome systemer (internett) |

Når en ruter kjenner samme nett fra flere kilder, velger den etter pålitelighet. Cisco kaller det *administrativ avstand*: direkte = 0, statisk = 1, eBGP = 20, OSPF = 110, RIP = 120. Lavest vinner.

Hver ruter trekker 1 fra **TTL** i IPv4-headeren. Ved 0 kastes pakken, og ruteren sender ICMP «Time Exceeded» tilbake. Det er det traceroute bygger på.
