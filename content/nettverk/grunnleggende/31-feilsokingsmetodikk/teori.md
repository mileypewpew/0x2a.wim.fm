---
id: "31-feilsokingsmetodikk"
kode: "NG3.1"
tittel: "Feilsøkingsmetodikk"
beskrivelse: "Strukturert arbeidsgang, nedenfra og opp, splitt og hersk og gode vaner."
nivå: 3
kilder:
  - tittel: "RFC 2151: A Primer On Internet and TCP/IP Tools and Utilities"
    url: "https://www.rfc-editor.org/rfc/rfc2151"
  - tittel: "ITU-T X.200: OSI Basic Reference Model"
    url: "https://www.itu.int/rec/T-REC-X.200-199407-I/en"
  - tittel: "RFC 1122: Requirements for Internet Hosts – Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122"
oppdatert: "2026-11-18"
---
## En fast arbeidsgang

| Steg | Hva du gjør |
|---|---|
| 1. Beskriv problemet | Hva virker ikke, for hvem, siden når? Hva er endret? |
| 2. Samle fakta | Feilmeldinger, logger, `ip addr`, `ping`, hvem andre er rammet |
| 3. Lag en hypotese | Den mest sannsynlige årsaken ut fra fakta |
| 4. Test hypotesen | Én test som kan bekrefte eller avkrefte |
| 5. Rett feilen | **Én endring om gangen**, med en plan for å rulle tilbake |
| 6. Kontroller | Virker det nå, også for brukeren? Har noe annet sluttet å virke? |
| 7. Dokumenter | Årsak, tiltak og hva du lærte |

## Strategier

| Strategi | Slik gjør du | Passer når |
|---|---|---|
| Nedenfra og opp (OSI 1→7) | Kabel/lys → link → IP → ping → port → applikasjon | Ukjent feil, eller tegn på fysisk feil |
| Ovenfra og ned (7→1) | Starter i applikasjonen og går nedover | Bare én tjeneste er rammet |
| Splitt og hersk | Starter i midten, ofte lag 3 med `ping`, og går opp eller ned ut fra svaret | Rask avgrensning |
| Følg veien | Sjekk hvert hopp fra klient til server (`traceroute`) | Feil et sted underveis |
| Sammenlign | Se hva som er forskjellig fra en maskin eller et oppsett som virker | Ett tilfelle feiler, andre virker |
| Bytt komponent | Ny kabel, annen port, annen klient | Mistanke om maskinvare |

## Typisk rekkefølge for «nettet virker ikke»

1. Har jeg link? (lys, `ip link`)
2. Har jeg riktig IP-adresse, maske og gateway? (`ip addr`, `ip route`)
3. Når jeg gatewayen? (`ping 10.0.0.1`)
4. Når jeg en IP på internett? (`ping 1.1.1.1`)
5. Virker navneoppslag? (`dig wim.fm`)
6. Svarer tjenesten på porten? (`curl -v https://wim.fm`)

Svaret på hvert steg forteller hvilket lag du skal lete videre på.

## Gode vaner

- Ta backup av konfigurasjonen før du endrer noe, og vit hvordan du ruller tilbake.
- Ha en reservevei inn (konsoll eller fysisk tilgang) før du endrer noe som kan stenge deg ute.
- Endre én ting om gangen, ellers vet du ikke hva som hjalp.
- Les feilmeldingen nøye. Den sier ofte hvilket lag feilen er på.
