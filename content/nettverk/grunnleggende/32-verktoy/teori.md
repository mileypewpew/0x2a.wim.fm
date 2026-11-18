---
id: "32-verktoy"
kode: "NG3.2"
tittel: "Verktøy og utdata"
beskrivelse: "ping, traceroute, ip, ipconfig, arp, dig/nslookup, ss/netstat og curl, og hvordan du leser utdataene."
nivå: 3
kilder:
  - tittel: "ping(8) – Linux manual page"
    url: "https://man7.org/linux/man-pages/man8/ping.8.html"
  - tittel: "traceroute(8) – Linux manual page"
    url: "https://man7.org/linux/man-pages/man8/traceroute.8.html"
  - tittel: "ip-address(8) – Linux manual page"
    url: "https://man7.org/linux/man-pages/man8/ip-address.8.html"
  - tittel: "ss(8) – Linux manual page"
    url: "https://man7.org/linux/man-pages/man8/ss.8.html"
  - tittel: "BIND 9: Manual pages (dig)"
    url: "https://bind9.readthedocs.io/en/latest/manpages.html"
  - tittel: "curl man page"
    url: "https://curl.se/docs/manpage.html"
  - tittel: "Microsoft: ipconfig"
    url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig"
  - tittel: "Microsoft: tracert"
    url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert"
  - tittel: "RFC 792: Internet Control Message Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc792"
oppdatert: "2026-11-18"
---
## Oversikt

| Oppgave | Linux | Windows |
|---|---|---|
| Vis adresser | `ip addr` (`ip a`) | `ipconfig /all` |
| Vis ruter | `ip route` | `route print` |
| ARP-/nabotabell | `ip neigh` | `arp -a` |
| Test om noe svarer | `ping` | `ping` |
| Vis veien | `traceroute`, `tracepath`, `mtr` | `tracert` |
| DNS-oppslag | `dig`, `nslookup` | `nslookup`, `Resolve-DnsName` |
| Lyttende porter | `ss -tulpn` | `netstat -ano` |
| Test HTTP/TLS | `curl -v` | `curl -v` |
| Fornye DHCP | `dhclient -r` / NetworkManager | `ipconfig /release` + `/renew` |
| Tøm DNS-buffer | `resolvectl flush-caches` | `ipconfig /flushdns` |

## Lese utdata

**ping**
```text
64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=38.2 ms
--- 4 packets transmitted, 4 received, 0% packet loss
```
`time` er rundturstid. `ttl` er det som er igjen av TTL når svaret kommer fram. «Destination Host Unreachable» fra din egen adresse betyr at ARP ikke fikk svar fra en adresse i eget nett.

**traceroute** sender pakker med TTL 1, 2, 3 … og hver ruter svarer med ICMP Time Exceeded. `* * *` betyr at hoppet ikke svarte innen tidsfristen. Det er ofte filtrering og ikke nødvendigvis en feil. Linux-`traceroute` bruker UDP som standard, Windows `tracert` bruker ICMP.

**ip addr**
```text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> ... state UP
    inet 10.0.0.15/24 brd 10.0.0.255 scope global dynamic eth0
```
`LOWER_UP` betyr link. `NO-CARRIER` / `state DOWN` betyr ingen link. `dynamic` betyr adresse fra DHCP.

**ss -tulpn**
```text
tcp LISTEN 0 4096 127.0.0.1:8080  0.0.0.0:*  users:(("app",pid=812))
tcp LISTEN 0 4096       0.0.0.0:443   0.0.0.0:*  users:(("caddy",pid=640))
```
`127.0.0.1:8080` lytter bare lokalt. `0.0.0.0:443` (eller `*:443`, `[::]:443`) lytter på alle grensesnitt.

**dig**
```text
;; ->>HEADER<<- opcode: QUERY, status: NOERROR
;; ANSWER SECTION:
wim.fm.   300   IN   A   203.0.113.10
```
`status` er NOERROR, NXDOMAIN (finnes ikke) eller SERVFAIL (feil hos resolveren). Tallet 300 er TTL. `dig @10.0.0.1 navn` spør en bestemt server. `dig +short` gir bare svaret. `dig -x IP` gjør omvendt oppslag.

**curl -v**
```text
* Trying 203.0.113.10:443...
* Connected to wim.fm (203.0.113.10) port 443
* SSL certificate verify ok.
> GET / HTTP/2
> Host: wim.fm
< HTTP/2 200
< content-type: text/html
```
`*` er informasjon fra curl (DNS, TCP, TLS). `>` er det som sendes, og `<` er det som kommer tilbake.
