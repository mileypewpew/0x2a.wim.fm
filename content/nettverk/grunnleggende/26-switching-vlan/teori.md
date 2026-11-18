---
id: "26-switching-vlan"
kode: "NG2.6"
tittel: "Switching og VLAN"
beskrivelse: "MAC-tabell, kollisjons- og kringkastingsdomener, 802.1Q, access og trunk."
nivå: 2
kilder:
  - tittel: "IEEE 802.1Q: Bridges and Bridged Networks"
    url: "https://standards.ieee.org/ieee/802.1Q/10323/"
  - tittel: "Proxmox VE: Network Configuration (VLAN)"
    url: "https://pve.proxmox.com/wiki/Network_Configuration"
  - tittel: "OPNsense: Other Types (bl.a. VLAN)"
    url: "https://docs.opnsense.org/manual/other-interfaces.html"
oppdatert: "2026-11-18"
---
## Hvordan en switch arbeider

En switch arbeider på lag 2 og bygger en **MAC-tabell** (CAM-tabell) med MAC-adresse → port.

| Situasjon | Hva switchen gjør |
|---|---|
| En ramme kommer inn | **Lærer** kilde-MAC og porten den kom på |
| Mål-MAC finnes i tabellen | **Videresender** bare ut på den porten |
| Mål-MAC er ukjent | **Flømmer**: sender ut på alle porter i VLAN-et, unntatt porten den kom på |
| Mål er kringkasting (`ff:ff:ff:ff:ff:ff`) | Sender ut på alle porter i VLAN-et |
| Oppføring er ubrukt lenge | Fjernes etter en aldringstid (ofte 300 s) |

## Kollisjonsdomene og kringkastingsdomene

| | Kollisjonsdomene | Kringkastingsdomene |
|---|---|---|
| Hva | Område der samtidige sendinger kan kollidere | Område en kringkasting når fram til |
| Hub | Hele huben er ett domene | Ett |
| Switch | Hver port er sitt eget (full dupleks: ingen kollisjoner) | Hele switchen (per VLAN) er ett |
| Ruter | Skiller | **Skiller** kringkastingsdomener |

## VLAN (IEEE 802.1Q)

Et VLAN deler én fysisk switch i flere logiske lag 2-nett. **Hvert VLAN er ett kringkastingsdomene og normalt ett IP-subnett.** Trafikk mellom VLAN må gå via en ruter eller lag 3-switch (inter-VLAN-ruting).

802.1Q setter inn en **4 byte tagg** i Ethernet-rammen:

| Felt | Bit | Innhold |
|---|---|---|
| TPID | 16 | `0x8100` (viser at rammen er tagget) |
| PCP | 3 | Prioritet (QoS), 0–7 |
| DEI | 1 | Kan forkastes ved metning |
| VID | 12 | VLAN-ID, 0–4095. 0 og 4095 er reservert, så 1–4094 kan brukes |

| Porttype | Tagging | Bruk |
|---|---|---|
| **Access** (untagged) | Ingen tagg. Porten tilhører ett VLAN | PC, skriver, aksesspunkt med ett nett |
| **Trunk** (tagged) | Rammer har tagg med VLAN-ID. Fører mange VLAN | Mellom switcher, til ruter/brannmur, til hypervisor |
| Native VLAN | Det ene VLAN-et som går *utagget* på en trunk | Må være likt i begge ender |

**Ruter på en pinne:** én fysisk lenke er trunk til ruteren, som har ett virtuelt grensesnitt per VLAN, f.eks. `vlan10` med 10.0.10.1/24.

## Løkker

To kabler mellom de samme switchene uten **STP** (Spanning Tree Protocol) gir en løkke. Kringkastinger går da i ring og formerer seg (kringkastingsstorm), og nettet stopper. STP blokkerer overflødige lenker.
