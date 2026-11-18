---
id: "33-scenarioer"
kode: "NG3.3"
tittel: "Feilsøkingsscenarioer"
beskrivelse: "Vanlige feil: APIPA, DNS, maske, duplisert IP, gateway, brannmur, sertifikat og VLAN."
nivå: 3
kilder:
  - tittel: "RFC 3927: Dynamic Configuration of IPv4 Link-Local Addresses"
    url: "https://www.rfc-editor.org/rfc/rfc3927"
  - tittel: "RFC 9293: Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293"
  - tittel: "RFC 6125: Representation and Verification of Domain-Based Application Service Identity"
    url: "https://www.rfc-editor.org/rfc/rfc6125"
  - tittel: "curl man page"
    url: "https://curl.se/docs/manpage.html"
  - tittel: "Caddy: Automatic HTTPS"
    url: "https://caddyserver.com/docs/automatic-https"
oppdatert: "2026-11-18"
---
## Symptom → sannsynlig årsak

| Symptom | Sannsynlig årsak | Sjekk |
|---|---|---|
| Adresse 169.254.x.x | DHCP svarte ikke (APIPA) | Link, VLAN, at DHCP-tjenesten kjører, pool full |
| Ping til IP virker, til navn ikke | DNS | `dig navn`, `dig @annen-server navn`, DNS-server i oppsettet |
| Når noen maskiner i eget nett, ikke andre | Feil nettmaske | Sammenlign maske og nett med maskiner som virker |
| Nettet faller ut av og til, varsel om adressekonflikt | Duplisert IP | `arp -a` / `ip neigh`: samme IP får skiftende MAC |
| Lokalt nett virker, ikke internett | Gateway mangler eller er feil | `ip route` / `ipconfig`: finnes `default via`? |
| Ping virker, men nettsiden henger til tidsavbrudd | Brannmur slipper ikke port 443 | `curl -v`: henger på «Trying …» |
| «Connection refused» | Ingen lytter på porten (verten svarer med RST) | `ss -tulpn` på serveren |
| Nettsiden går til feil server | Feil A/AAAA-post eller gammelt bufret svar | `dig +short navn A` og `AAAA`, TTL |
| Nettleseren advarer om sertifikat | Utløpt sertifikat eller feil navn | `curl -v`: «certificate has expired» eller navn som ikke matcher |
| PC får adresse i feil nett, eller ingen | VLAN-feil på porten | Porttype og VLAN på switchen, native VLAN |

## Tidsavbrudd eller avvist?

| Utfall | Betyr |
|---|---|
| **Timeout** (ingen svar) | Pakken ble forkastet underveis (brannmur «drop»), eller verten er nede eller uten rute |
| **Connection refused** | Verten svarte med RST: porten er stengt, men verten nås |
| **No route to host** | Ingen rute, eller ARP mislyktes, eller en brannmur avviste med ICMP |

## Typiske feilmeldinger fra TLS

| Melding (curl/nettleser) | Årsak |
|---|---|
| `certificate has expired` | Sertifikatet er utløpt, f.eks. fordi automatisk fornying feilet |
| `no alternative certificate subject name matches` | Sertifikatet gjelder et annet navn enn det du besøker |
| `unable to get local issuer certificate` | Kjeden er ufullstendig, eller utsteder er ukjent |
| `ERR_TOO_MANY_REDIRECTS` | Omdirigeringsløkke, f.eks. mellom en proxy og serveren |

Husk også klokken: går klokken på maskinen feil, kan gyldige sertifikater se utløpte (eller ennå ikke gyldige) ut.
