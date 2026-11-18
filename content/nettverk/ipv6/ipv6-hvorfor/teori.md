---
id: "ipv6-hvorfor"
kode: "0"
tittel: "Hvorfor IPv6: historie og fremtid"
beskrivelse: "Hvorfor IPv4 tok slutt, plasterløsningene, hva IPv6 løser, en kort tidslinje og status i dag."
nivå: 1
kilder:
  - tittel: "RIPE NCC Academy: IPv6 Fundamentals"
    url: "https://academy.ripe.net/course/view.php?id=13"
  - tittel: "RFC 791: Internet Protocol (IPv4)"
    url: "https://www.rfc-editor.org/rfc/rfc791"
  - tittel: "RFC 1519: Classless Inter-Domain Routing (CIDR)"
    url: "https://www.rfc-editor.org/rfc/rfc1519"
  - tittel: "RFC 1752: The Recommendation for the IP Next Generation Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc1752"
  - tittel: "RFC 1883: Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc1883"
  - tittel: "RFC 1918: Address Allocation for Private Internets"
    url: "https://www.rfc-editor.org/rfc/rfc1918"
  - tittel: "RFC 2460: Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc2460"
  - tittel: "RFC 4291: IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - tittel: "RFC 4862: IPv6 Stateless Address Autoconfiguration"
    url: "https://www.rfc-editor.org/rfc/rfc4862"
  - tittel: "RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space"
    url: "https://www.rfc-editor.org/rfc/rfc6598"
  - tittel: "RFC 8200: Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc8200"
  - tittel: "NRO: Free Pool of IPv4 Address Space Depleted (3 February 2011)"
    url: "https://www.nro.net/ipv4-free-pool-depleted/"
  - tittel: "RIPE NCC: Receives Final /8 of IPv4 Address Space from IANA (3 February 2011)"
    url: "https://www.ripe.net/about-us/news/ripe-ncc-receives-final-8-of-ipv4-address-space-from-iana/"
  - tittel: "RIPE NCC: Begins Allocating Last Blocks of IPv4 Addresses (14 September 2012)"
    url: "https://www.ripe.net/about-us/press-centre/milestone-in-internet-history-as-ripe-ncc-begins-allocating-last-blocks-of-ipv4-addresses/"
  - tittel: "RIPE NCC: The RIPE NCC has run out of IPv4 Addresses (25 November 2019)"
    url: "https://www.ripe.net/about-us/news/the-ripe-ncc-has-run-out-of-ipv4-addresses/"
  - tittel: "Google IPv6 Statistics"
    url: "https://www.google.com/intl/en/ipv6/statistics.html"
  - tittel: "APNIC Labs: IPv6 Capability Metrics for Norway"
    url: "https://stats.labs.apnic.net/ipv6/NO"
  - tittel: "World IPv6 Launch"
    url: "https://www.worldipv6launch.org/"
  - tittel: "Starlink Tariff Transparency (Residential: IPv4 type CGNAT, IPv6 available)"
    url: "https://starlink.com/public-files/Tariff_Transparency_English_FI.pdf"
  - tittel: "Starlink Help Center: What IP address does Starlink provide?"
    url: "https://starlink.com/support/article/1192f3ef-2a17-31d9-261a-a59d215629f4"
oppdatert: "2026-11-18"
---
## Problemet med IPv4

IPv4 (RFC 791, september 1981) bruker **32-bits adresser**. Det gir

$$2^{32} = 4\,294\,967\,296$$

adresser, altså like over **4,3 milliarder**. Ikke alle kan brukes av vanlige maskiner (blant annet nett- og kringkastingsadresser er reservert), men selv hele rommet er for lite.

Internettet vokste fra noen få forskningsnett til milliarder av telefoner, hjemmerutere, servere og IoT-enheter. Én offentlig IPv4-adresse per enhet går ikke lenger.

## Plasterløsningene

Før IPv6 ble vanlig, ble flere teknikker tatt i bruk for å strekke IPv4 lenger:

**CIDR** (Classless Inter-Domain Routing, RFC 1519, september 1993) sluttet med faste A-, B- og C-klasser. Prefikslengden kan velges fritt (`/24`, `/22`, `/16` …). Det reduserer sløsing med adresser og gjør det lettere å slå sammen ruter.

**Private adresser** (RFC 1918, februar 1996) brukes inne i et hjem eller et firma og rutes ikke på det offentlige internettet:

| Blokk | Prefiks |
|---|---|
| `10.0.0.0` – `10.255.255.255` | `10.0.0.0/8` |
| `172.16.0.0` – `172.31.255.255` | `172.16.0.0/12` |
| `192.168.0.0` – `192.168.255.255` | `192.168.0.0/16` |

**NAT** (Network Address Translation) lar mange maskiner med private adresser dele én eller noen få offentlige IPv4-adresser. Hjemmeruteren skriver om adresser og porter og husker oversettelsen i en NAT-tabell.

**CGNAT** (Carrier-Grade NAT) er NAT hos operatøren, én gang til. Mange kunder deler da samme offentlige IPv4-adresse. Kunden får typisk en adresse i det delte området `100.64.0.0/10` (RFC 6598, april 2012), ikke en egen offentlig IPv4-adresse.

Det får konsekvenser:

- **Ende-til-ende-prinsippet** brytes: en maskin bak CGNAT kan starte utgående forbindelser, men kan ikke nås direkte utenfra.
- **Portvideresending** virker ikke slik du er vant til hjemme, fordi du ikke styrer den offentlige NAT-tabellen.
- **P2P og egen server** (spill, VPN, kamera, hjemmelab) blir vanskeligere.
- **Logging** blir grovere: mange kunder skjuler seg bak samme offentlige IP, så adresse alene identifiserer ikke én bruker.

Et konkret eksempel er Starlink. I deres offisielle tariffdokumenter er IPv4-typen på vanlige abonnement oppgitt som CGNAT, og IPv6 er tilgjengelig. Når IPv4 går gjennom CGNAT, er det IPv6 som gir deg en ekte ende-til-ende-adresse.

## Hva IPv6 løser

IPv6 (nå RFC 8200, juli 2017, Internett-standard STD 86) er etterfølgeren til IPv4. De viktigste grepene (RFC 8200 §1 og §3, RFC 4291, RFC 4862):

| Egenskap | IPv4 | IPv6 |
|---|---|---|
| Adresselengde | 32 bit | 128 bit |
| Adresser (teoretisk) | $2^{32}$ ≈ 4,3 milliarder | $2^{128}$ ≈ $3,4 \times 10^{38}$ |
| Header | minst 20 byte, kan vokse med options | fast 40 byte |
| Tilleggsfelt | options i selve headeren | egne **utvidelseshoder** (extension headers) |
| Autokonfigurasjon | typisk DHCP | **SLAAC** (stateless address autoconfiguration): enheten kan sette adressen selv ut fra ruterannonser |
| Kringkasting | broadcast | ingen broadcast; **multicast** tar jobben (RFC 4291) |
| NAT | ofte nødvendig | vanligvis unødvendig; hvert grensesnitt kan ha en unik, global adresse |

De 40 bytene i IPv6-headeren kommer rett fra feltbreddene i RFC 8200 §3: 4+8+20+16+8+8+128+128 = 320 bit = 40 byte. IPv4-headeren er minst 20 byte fordi IHL (Internet Header Length) må være minst 5 ords à 32 bit (RFC 791).

128 bit gir også et stort hierarki. Et typisk nett til sluttbruker er et `/64`. I en `/48` (en vanlig tildeling til en bedrift eller et sted) er det

$$2^{64-48} = 65\,536$$

slike `/64`-nett — bare i den ene blokken.

NAT trengs vanligvis ikke i IPv6. **Brannmuren** er det som skal tillate eller stanse trafikk, akkurat som i IPv4.

## Tidslinje

Kort og i verifiserte steg. Datoer er hentet fra RFC-ene og offisielle kunngjøringer fra IANA/NRO, RIPE NCC og Internet Society.

| År | Hendelse |
|---|---|
| 1981 | September: RFC 791 publiseres. IPv4 med 32-bits adresser. |
| 1993 | September: CIDR innføres (RFC 1519) for å bremse sløsing med IPv4-adresser og vekst i rutetabellene. |
| 1994–1995 | IETF arbeider med IPng (IP Next Generation). RFC 1752 (januar 1995) anbefaler neste generasjons IP; RFC 1883 (desember 1995) er den første IPv6-spesifikasjonen. |
| 1996 | Februar: RFC 1918 definerer private IPv4-adresser. |
| 1998 | Desember: RFC 2460 avløser RFC 1883 som IPv6-spesifikasjon. |
| 2011 | 3. februar: IANA tildeler de siste fem `/8`-blokkene til de fem regionale registrene (RIR). Den sentrale IPv4-reserven er tom. |
| 2011 | 8. juni: World IPv6 Day — en 24-timers test der store tjenester slår på IPv6. |
| 2012 | April: RFC 6598 reserverer `100.64.0.0/10` som delt adresseområde for CGNAT. |
| 2012 | 6. juni: World IPv6 Launch — deltakende nett og tjenester lar IPv6 stå på for godt. |
| 2012 | 14. september: RIPE NCC begynner å tildele fra sin siste `/8`. Hver LIR kan typisk få én `/22` (1024 adresser), og må ha IPv6. |
| 2017 | Juli: RFC 8200 avløser RFC 2460 og gjør IPv6 til Internett-standard (STD 86). |
| 2019 | 25. november, kl. 15.35 norsk tid: RIPE NCC tildeler den siste `/22` fra den tilgjengelige IPv4-poolen. Videre tildeling skjer fra en venteliste med gjenbrukte adresser. |

## Status i dag

IPv6 er i daglig bruk, men IPv4 er ikke borte. De fleste nett kjører **dual stack**: IPv4 og IPv6 side om side. Når en tjeneste har begge, kan klienten bruke IPv6 og falle tilbake til IPv4 ved behov.

Tallene under ble hentet 18. november 2026 (norsk tid). Ulike kilder måler ulike ting, så de skal ikke sammenlignes som om de var samme prosent.

| Måling | Tall | Hva som telles | Dato i datasettet |
|---|---|---|---|
| Google, globalt | 46,77 % (alt native; 6to4/Teredo 0,00 %) | Andel av Googles brukere som når Google over IPv6 | 16. november 2026 (siste dag i datasettet) |
| Google, Norge | 35,96 % | Samme metode, bare norske brukere | 16. november 2026 |
| APNIC Labs, Norge | 59,2 % kapable, 51,5 % foretrekker IPv6 | Andel målinger som kan nå en IPv6-only ressurs, og andel som velger IPv6 når begge er tilgjengelige (30-dagers snitt) | 15. november 2026 |
| APNIC Labs, verden | 44,6 % kapable, 41,0 % foretrekker IPv6 | Samme metode, global region (kode XA), 30-dagers snitt | 15. november 2026 |

Google-tallet svinger fra dag til dag. I datasettet passerte det 50 % første gang 28. mars 2026 (50,10 %). Snittet de siste 30 dagene fram til 16. november 2026 var 48,01 %. APNIC-filene var oppdatert 18. november 2026.

Poenget er ikke å pugge prosenten, men å se mønsteret: IPv6 er vanlig, utbredelsen varierer mellom land og målemetoder, og dual stack er overgangsstrategien.

## Myter

**«NAT gir sikkerhet.»** NAT skriver om adresser og porter. At uønsket innkommende trafikk ofte stopper, er en *bivirkning* av at det ikke finnes en oversettelse, ikke en sikkerhetspolicy. Det som faktisk tillater eller stanser trafikk, er **brannmurregler**. En IPv6-brannmur kan (og bør) stanse innkommende trafikk som standard, uten NAT.

**«IPv6 er mindre sikkert.»** IPv6 er ikke automatisk mindre eller mer sikkert enn IPv4. Du trenger fortsatt brannmur, oppdateringer og sunn praksis. Noe blir faktisk vanskeligere for en angriper: å gjette seg gjennom et helt `/64` med $2^{64}$ adresser er upraktisk. Samtidig må utvidelseshoder og ny oppførsel forstås og filtreres. Sikkerhet ligger i oppsettet, ikke i versjonsnummeret.

**«IPv6 er ferdig / kommer aldri.»** Begge deler er feil. Protokollen har vært Internett-standard siden 2017, og målingene over viser at en stor del av brukerne allerede bruker IPv6. Samtidig vil IPv4 leve lenge ennå, nettopp derfor dual stack. Det er ikke et prosjekt som «blir slått på én dag» og erstatter alt.

## Mer enn IPv6

«Fremtidens internett» er mer enn byttet fra IPv4 til IPv6. Nye transport- og applikasjonsprotokoller som **QUIC** og **HTTP/3**, og veksten i **IoT**, hører også med. IoT er for øvrig et av argumentene for IPv6: svært mange enheter trenger egne adresser. **Web3** ligger utenfor dette kurset.

Denne modulen forklarer *hvorfor* IPv6 finnes. De neste modulene går på *hvordan*: heksadesimale tall, adressenotasjon, subnetting, adressetyper og protokoller som SLAAC og NDP.
