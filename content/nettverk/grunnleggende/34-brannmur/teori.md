---
id: "34-brannmur"
kode: "NG3.4"
tittel: "Brannmurregler"
beskrivelse: "Tilstandsfull filtrering, allow/deny, retning, regelrekkefølge og portvideresending."
nivå: 3
kilder:
  - tittel: "OPNsense: Rules (Firewall)"
    url: "https://docs.opnsense.org/manual/firewall.html"
  - tittel: "OPNsense: Network Address Translation"
    url: "https://docs.opnsense.org/manual/nat.html"
  - tittel: "Ubuntu Server: Firewall (ufw)"
    url: "https://documentation.ubuntu.com/server/how-to/security/firewalls/"
  - tittel: "RFC 3022: Traditional IP Network Address Translator"
    url: "https://www.rfc-editor.org/rfc/rfc3022"
oppdatert: "2026-11-18"
---
## Hva en brannmur gjør

En brannmur sammenligner pakker med en liste med **regler** og tillater (allow/pass), forkaster (block/drop) eller avviser (reject) dem. Typiske kriterier er grensesnitt, retning, kilde- og måladresse, protokoll og port.

| Begrep | Betyr |
|---|---|
| **Tilstandsløs** (stateless) | Hver pakke vurderes for seg. Returtrafikk må tillates med egne regler |
| **Tilstandsfull** (stateful) | Brannmuren husker tilkoblinger i en tilstandstabell. Svar på tillatt trafikk slippes automatisk tilbake |
| **Block / drop** | Forkaster stille. Avsenderen får tidsavbrudd |
| **Reject** | Avviser med TCP RST eller ICMP. Avsenderen får raskt svar |
| **Standard nekt** (default deny) | Alt som ikke er uttrykkelig tillatt, blokkeres |
| **Minste privilegium** | Åpne bare det som trengs, for de kildene som trenger det |

## Retning og grensesnitt

- **Inn (inbound / ingress):** trafikk som kommer inn på et grensesnitt.
- **Ut (outbound / egress):** trafikk som går ut. Utgående filtrering kan stoppe f.eks. IoT-enheter som ringer hjem.
- I OPNsense legges reglene per grensesnitt og gjelder som standard trafikk *inn* på det grensesnittet. Første regel som matcher, avgjør (for «quick»-regler, som er standard).

## Vanlig standardoppsett for en hjemmebrannmur

| Grensesnitt | Typisk standard |
|---|---|
| WAN | Blokker alt uoppfordret inn. Svar på utgående trafikk slippes via tilstandstabellen |
| LAN | Tillat LAN-nettet ut til alt |

## Portvideresending (NAT) og regler

Portvideresending (DNAT) bytter måladresse, f.eks. WAN:443 → 10.0.0.20:443. Trafikken må i tillegg tillates av en brannmurregel. Mange brannmurer, også OPNsense, kan lage den regelen automatisk.

## ufw på en Linux-server (eksempel)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 443/tcp
ufw allow in on tailscale0 to any port 22 proto tcp
ufw status verbose
```

Rekkefølgen betyr noe: ufw og de fleste brannmurer bruker **første regel som matcher**.
