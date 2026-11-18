---
id: "25-dns"
kode: "NG2.5"
tittel: "DNS i dybden"
beskrivelse: "Resolver og autoritativ server, rekursivt og iterativt oppslag, posttyper, TTL og mellomlagring."
nivå: 2
kilder:
  - tittel: "RFC 1034: Domain Names – Concepts and Facilities"
    url: "https://www.rfc-editor.org/rfc/rfc1034"
  - tittel: "RFC 1035: Domain Names – Implementation and Specification"
    url: "https://www.rfc-editor.org/rfc/rfc1035"
  - tittel: "RFC 2308: Negative Caching of DNS Queries"
    url: "https://www.rfc-editor.org/rfc/rfc2308"
  - tittel: "RFC 9499: DNS Terminology"
    url: "https://www.rfc-editor.org/rfc/rfc9499"
  - tittel: "OPNsense: Unbound DNS"
    url: "https://docs.opnsense.org/manual/unbound.html"
oppdatert: "2026-11-18"
---
## Rollene

| Rolle | Oppgave | Eksempel |
|---|---|---|
| Stub-resolver | Klienten i operativsystemet. Spør én resolver og venter på ferdig svar | PC, mobil |
| Rekursiv resolver | Gjør hele jobben for klienten og mellomlagrer svar | Unbound, 1.1.1.1, operatørens DNS |
| Videresender (forwarder) | Sender spørsmål videre til en annen resolver | Ruter som videresender til operatøren |
| Autoritativ server | Har sonedataene og gir endelige (autoritative) svar | Cloudflare DNS for `wim.fm` |

## Rekursivt og iterativt oppslag

- **Rekursivt:** klienten ber resolveren om et *ferdig* svar (RD-flagget, «recursion desired»).
- **Iterativt:** resolveren spør selv rotserver → TLD-server (`.fm`) → autoritativ server for `wim.fm`. Hver server svarer med det den vet, ofte bare en *henvisning* (referral) til neste.

```
Klient ──rekursivt──▶ Resolver ──▶ Rot (.)     «spør .fm-serverne»
                              ──▶ .fm TLD     «spør wim.fm-serverne (NS)»
                              ──▶ Autoritativ «wim.fm A 203.0.113.10»
```

Det finnes 13 navngitte rotserveridentiteter (a–m.root-servers.net), men hver av dem er hundrevis av servere via anycast.

## Posttyper

| Type | Betyr | Eksempel |
|---|---|---|
| A / AAAA | Navn → IPv4 / IPv6 | `wim.fm. A 203.0.113.10` |
| CNAME | Alias til et annet navn | `www CNAME wim.fm.` |
| MX | E-postserver, med prioritet (lavest først) | `MX 10 mail.example.com.` |
| TXT | Tekst, f.eks. SPF og domenebekreftelse | `"v=spf1 -all"` |
| NS | Hvilke servere som er autoritative for sonen | `NS ns1.example.net.` |
| PTR | Omvendt oppslag IP → navn | `54.0.0.10.in-addr.arpa. PTR vert1.nermo.farm.` |
| SOA | Sonens startpost: primærserver, serienummer og tidsverdier | |

Regler: Et navn med CNAME kan ikke ha andre poster samtidig, og derfor ikke stå på sonetoppen (apex). MX og NS skal peke på et vertsnavn, ikke på en IP-adresse eller et CNAME.

## TTL og mellomlagring

- **TTL** (sekunder) sier hvor lenge en resolver kan mellomlagre et svar. Etter en endring kan gamle svar leve videre til TTL-en er ute.
- **Negativ mellomlagring** (RFC 2308): også «finnes ikke» (NXDOMAIN) mellomlagres, styrt av SOA-posten.
- Senk TTL-en *før* en planlagt endring, så går overgangen raskere.

## Omvendt oppslag

IPv4-adressen skrives baklengs under `in-addr.arpa`: 10.0.0.54 → `54.0.0.10.in-addr.arpa`. IPv6 bruker `ip6.arpa`, med ett heks-siffer per etikett.

## Lokalt domene

Et internt domene, f.eks. `nermo.farm`, kjenner bare din egen DNS-server. En offentlig resolver som 8.8.8.8 vet ingenting om det. Klientene må derfor bruke den lokale resolveren.
