---
id: "23-adressetyper"
kode: "2.3"
tittel: "Adressetyper og scope"
beskrivelse: "Global unicast, link-local, ULA, multicast og virkeområde (scope)."
nivå: 2
kilder:
  - tittel: "RIPE NCC Academy: IPv6 Fundamentals"
    url: "https://academy.ripe.net/course/view.php?id=13"
  - tittel: "RFC 4291: IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - tittel: "RFC 4193: Unique Local IPv6 Unicast Addresses"
    url: "https://www.rfc-editor.org/rfc/rfc4193"
  - tittel: "RFC 3879: Deprecating Site Local Addresses"
    url: "https://www.rfc-editor.org/rfc/rfc3879"
  - tittel: "RFC 3849: IPv6 Address Prefix Reserved for Documentation"
    url: "https://www.rfc-editor.org/rfc/rfc3849"
  - tittel: "RFC 4007: IPv6 Scoped Address Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4007"
  - tittel: "RFC 7346: IPv6 Multicast Address Scopes"
    url: "https://www.rfc-editor.org/rfc/rfc7346"
  - tittel: "RFC 6666: A Discard Prefix for IPv6"
    url: "https://www.rfc-editor.org/rfc/rfc6666"
  - tittel: "RFC 6052: IPv6 Addressing of IPv4/IPv6 Translators"
    url: "https://www.rfc-editor.org/rfc/rfc6052"
oppdatert: "2026-11-19"
---
## Tre bruksformer

IPv6 skiller mellom hvordan du kommuniserer, og hvor langt adressen rekker (**scope**, RFC 4007).

| Form | Til | Eksempel |
|---|---|---|
| **Unicast** | Én grensesnitt (én destinasjon) | En PCs globale adresse |
| **Multicast** | En gruppe som har meldt seg på | Alle rutere på linken |
| **Anycast** | «Nærmeste» av flere som har samme unicast-adresse | Subnet-router anycast |

Det finnes **ingen broadcast**. Jobben er overtatt av multicast (RFC 4291).

En typisk vert har flere adresser samtidig: minst én link-lokal per grensesnitt, ofte en global unicast, pluss multicast-adresser den lytter på (blant annet all-nodes).

## Viktige prefiks

| Type | Prefiks | Scope | Kjennetegn |
|---|---|---|---|
| Uspesifisert | `::/128` | — | «Ingen adresse ennå», brukes f.eks. før adressen er valgt |
| Loopback | `::1/128` | verten selv | Som `127.0.0.1` i IPv4 |
| Global unicast (GUA) | `2000::/3` | globalt | Starter med `2` eller `3`; tildeles av RIR/LIR og rutes på internett |
| Dokumentasjon | `2001:db8::/32` | — | Reservert til eksempler (RFC 3849), ligger inne i `2000::/3` men skal ikke ruttes som vanlig GUA |
| Unique local (ULA) | `fc00::/7` | intern, «global» inne i org. | Praktisk: bruk `fd00::/8` (RFC 4193). `fc00::/8` er reservert |
| Link-lokal | `fe80::/10` | linken | Alltid til stede på et IPv6-grensesnitt. De neste 54 bitene skal være 0, så på en link brukes `fe80::/64` |
| Multicast | `ff00::/8` | avhenger av scope-feltet | Starter alltid med `ff` |
| Discard-only | `100::/64` | — | Pakker hit skal kastes (RFC 6666) |
| IPv4-innebygd (NAT64) | `64:ff9b::/96` | — | Velkjent prefiks for IPv4/IPv6-oversetting (RFC 6052) |

## Global, unik lokal og link-lokal

**GUA** er adressen som skal virke på det offentlige internettet. I dag tildeles de fra `2000::/3`.

**ULA** (RFC 4193) er den nærmeste analogien til RFC 1918, men med en viktig forskjell: du trekker et (tilfeldig) 40-bit *Global ID*, slik at blokken typisk blir en `/48` som starter med `fd`. Den er ment for internt bruk og rutes ikke på det offentlige internettet. Den erstatter ikke GUA; de fleste steder har begge.

De gamle *site-local*-adressene (`fec0::/10`) er avviklet (RFC 3879). Ikke bruk dem.

**Link-lokal** brukes bare på den lokale linken (NDP, neste ruter, og så videre). Den trenger ikke DHCP eller SLAAC fra en ruter for å komme opp: verten lager den selv. To maskiner på samme switch kan snakke IPv6 med `fe80::…` uten noe globalt prefiks. Når du skal angi hvilken link en link-lokal adresse gjelder for, brukes ofte et soneindeks, f.eks. `fe80::1%eth0` (RFC 4007).

## Multicast og scope

En multicast-adresse har formen `ffFL:…` der de fire siste bitene i andre nibble er **scope** (RFC 4291, RFC 7346):

| Scope | Verdi | Rekkevidde |
|---|---|---|
| 1 | `ff01::` | bare på grensesnittet (interface-local) |
| 2 | `ff02::` | linken (link-local) |
| 5 | `ff05::` | site-local |
| 8 | `ff08::` | organisasjonen |
| e | `ff0e::` | globalt |

Noen faste adresser du bør kjenne:

- `ff02::1` — alle noder på linken
- `ff02::2` — alle rutere på linken
- *Solicited-node* `ff02::1:ffXX:XXXX` — de siste 24 bitene av en unicast-adresse; brukes av NDP i stedet for broadcast (dekkes mer i modul 3)

## Hvordan kjenne igjen typen

Se på starten av adressen, i kanonisk form:

- `::` eller `::1` — uspesifisert eller loopback
- `2000::`–`3fff::` — global unicast (husk unntaket `2001:db8::/32`)
- `fd…` — ULA
- `fe80::` — link-lokal
- `ff…` — multicast, les scope i andre siffergruppe
