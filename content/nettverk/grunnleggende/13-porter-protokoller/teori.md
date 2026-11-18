---
id: "13-porter-protokoller"
kode: "NG1.3"
tittel: "Porter og protokoller"
beskrivelse: "Portområder, vanlige porter og hvilken transport de bruker."
nivå: 1
kilder:
  - tittel: "IANA: Service Name and Transport Protocol Port Number Registry"
    url: "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml"
  - tittel: "RFC 6335: IANA Procedures for Port Numbers"
    url: "https://www.rfc-editor.org/rfc/rfc6335"
oppdatert: "2026-11-18"
---
## Hva er en port?

Et portnummer (16 bit, 0–65535) forteller hvilken tjeneste eller prosess på maskinen dataene skal til. IP-adressen finner maskinen, og porten finner programmet.

En **socket** er IP-adresse + port (+ protokoll), f.eks. `10.0.0.5:443/tcp`.

## Portområder (IANA, RFC 6335)

| Område | Navn | Brukes til |
|---|---|---|
| 0–1023 | Systemporter (well-known) | Kjente tjenester. På Linux krever de normalt root for å lytte. |
| 1024–49151 | Registrerte porter (user ports) | Registrerte applikasjoner, f.eks. 3389 (RDP) |
| 49152–65535 | Dynamiske / private porter | Midlertidige kildeporter for klienter (ephemeral) |

Klienten bruker vanligvis en tilfeldig høy kildeport. Linux bruker som standard 32768–60999.

## Vanlige porter

| Port | Protokoll | Transport | Merknad |
|---|---|---|---|
| 20, 21 | FTP (data, kontroll) | TCP | Ukryptert |
| 22 | SSH (og SFTP/SCP) | TCP | Kryptert fjerninnlogging |
| 23 | Telnet | TCP | Ukryptert, erstattet av SSH |
| 25 | SMTP | TCP | E-post mellom servere |
| 53 | DNS | UDP og TCP | |
| 67 / 68 | DHCP (server / klient) | UDP | IPv4 |
| 69 | TFTP | UDP | Bl.a. firmware og PXE |
| 80 | HTTP | TCP | |
| 110 | POP3 | TCP | 995 med TLS |
| 123 | NTP | UDP | Tidssynkronisering |
| 143 | IMAP | TCP | 993 med TLS |
| 161 / 162 | SNMP / SNMP-trap | UDP | Overvåking av nettutstyr |
| 443 | HTTPS | TCP (UDP for HTTP/3) | |
| 514 | Syslog | UDP | |
| 546 / 547 | DHCPv6 (klient / server) | UDP | |
| 587 | E-postinnsending | TCP | STARTTLS |
| 853 | DNS over TLS | TCP | |
| 3389 | RDP | TCP/UDP | Fjernskrivebord i Windows |

## Se porter på Linux

```bash
ss -tulpn          # lytter-porter (TCP/UDP) med prosess
cat /etc/services  # liste over navn og portnumre
```
