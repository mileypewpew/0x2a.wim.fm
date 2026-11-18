---
id: "23-nat-pat"
kode: "NG2.3"
tittel: "NAT og PAT"
beskrivelse: "Adresseoversetting, portvideresending, CGNAT og hvorfor NAT ikke er en brannmur."
nivå: 2
kilder:
  - tittel: "RFC 3022: Traditional IP Network Address Translator (Traditional NAT)"
    url: "https://www.rfc-editor.org/rfc/rfc3022"
  - tittel: "RFC 4787: NAT Behavioral Requirements for Unicast UDP"
    url: "https://www.rfc-editor.org/rfc/rfc4787"
  - tittel: "RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space"
    url: "https://www.rfc-editor.org/rfc/rfc6598"
  - tittel: "OPNsense: Network Address Translation"
    url: "https://docs.opnsense.org/manual/nat.html"
  - tittel: "Tailscale: What is Tailscale?"
    url: "https://tailscale.com/kb/1151/what-is-tailscale"
oppdatert: "2026-11-18"
---
## Hvorfor NAT?

Det finnes for få offentlige IPv4-adresser. NAT (Network Address Translation, RFC 3022) lar mange maskiner med private adresser dele én eller noen få offentlige adresser. Ruteren skriver om adresser (og porter) i pakkene og husker hver oversettelse i en **NAT-tabell**.

| Type | Hva skjer | Eksempel |
|---|---|---|
| Statisk NAT (1:1) | Én privat adresse har alltid én fast offentlig adresse | Server med egen offentlig IP |
| Dynamisk NAT | Private adresser får en ledig adresse fra en pool | Lite brukt i dag |
| PAT / NAPT («masquerading») | Mange private adresser deler én offentlig adresse, skilt med portnummer | Vanlig hjemmeruter |
| Portvideresending (DNAT) | Innkommende trafikk til en offentlig port sendes til en intern maskin | WAN:443 → 10.0.0.20:443 |

## PAT steg for steg

| | Kilde | Mål |
|---|---|---|
| Fra PC (innsiden) | 10.0.0.15:51000 | 198.51.100.10:443 |
| Etter NAT (utsiden) | 203.0.113.7:62001 | 198.51.100.10:443 |
| Svar inn | 198.51.100.10:443 | 203.0.113.7:62001 → 10.0.0.15:51000 |

Ruteren slår opp port 62001 i NAT-tabellen og sender svaret til riktig PC.

## Viktig å vite

- **Innkommende trafikk** som ingen innenfra har startet, har ingen oppføring i NAT-tabellen. Den kommer ikke inn uten portvideresending. Det gir en viss beskyttelse, men **NAT er ikke en brannmur**. Brannmurregler er det som faktisk styrer trafikken.
- **CGNAT** (Carrier-Grade NAT): operatøren gjør NAT én gang til. WAN-adressen på ruteren din er da privat eller i 100.64.0.0/10 (RFC 6598), og du kan ikke videresende porter fra internett selv. Starlink bruker vanligvis CGNAT for IPv4.
- **Dobbel NAT**: to NAT-rutere etter hverandre, f.eks. egen brannmur bak operatørens ruter. Det kompliserer portvideresending.
- **NAT-hårnål (NAT reflection):** en intern klient når en intern server via den offentlige adressen.
- **Rundt NAT:** VPN-tjenester som Tailscale bruker NAT-traversering (UDP-hullstansing) og faller tilbake til reléservere når direkte forbindelse ikke går. Da trengs ingen åpne porter.
- **IPv6** har nok adresser til at NAT normalt ikke trengs. Brannmuren gjør jobben.
