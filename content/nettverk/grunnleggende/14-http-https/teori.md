---
id: "14-http-https"
kode: "NG1.4"
tittel: "HTTP og HTTPS"
beskrivelse: "Forespørsel og svar, metoder, statuskoder, versjoner og TLS."
nivå: 1
kilder:
  - tittel: "RFC 9110: HTTP Semantics"
    url: "https://www.rfc-editor.org/rfc/rfc9110"
  - tittel: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc8446"
  - tittel: "RFC 9114: HTTP/3"
    url: "https://www.rfc-editor.org/rfc/rfc9114"
  - tittel: "MDN: An overview of HTTP"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview"
oppdatert: "2026-11-18"
---
## HTTP: forespørsel og svar

HTTP er en klient–tjener-protokoll på applikasjonslaget. Klienten (nettleseren, `curl`) sender en **forespørsel**, og serveren sender et **svar**. HTTP er **tilstandsløs**: hver forespørsel står for seg selv. Innlogging og handlekurv huskes med f.eks. informasjonskapsler (cookies).

```http
GET /index.html HTTP/1.1
Host: wim.fm
User-Agent: curl/8.5.0

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 1234
```

## Metoder

| Metode | Brukes til |
|---|---|
| GET | Hente en ressurs |
| HEAD | Som GET, men bare headere (ingen body) |
| POST | Sende data, f.eks. et skjema, og ofte opprette noe |
| PUT | Erstatte en ressurs |
| PATCH | Endre deler av en ressurs |
| DELETE | Slette en ressurs |
| OPTIONS | Spørre hvilke metoder som er tillatt |

## Statuskoder

| Klasse | Betyr | Eksempler |
|---|---|---|
| 1xx | Informasjon | 101 Switching Protocols |
| 2xx | Vellykket | 200 OK, 201 Created, 204 No Content |
| 3xx | Omdirigering | 301 Moved Permanently, 302 Found, 304 Not Modified |
| 4xx | Feil hos klienten | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | Feil på serveren | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |

- **401** betyr ikke autentisert (pålogging mangler eller er feil). **403** betyr at serveren vet hvem du er, men nekter tilgang.
- **502** fra en omvendt proxy (f.eks. Caddy) betyr vanligvis at tjenesten bak ikke svarte riktig.

## Viktige headere

`Host` (hvilket domene), `Content-Type` (format på body), `Location` (ny adresse ved omdirigering), `Set-Cookie` / `Cookie`, `User-Agent`, `Strict-Transport-Security` (HSTS).

## Versjoner

| Versjon | Transport | Kjennetegn |
|---|---|---|
| HTTP/1.1 | TCP | Tekstbasert, én forespørsel om gangen per tilkobling |
| HTTP/2 | TCP (i praksis med TLS) | Binær, multipleksing av mange forespørsler over én tilkobling |
| HTTP/3 | QUIC over UDP | Unngår at ett tapt segment blokkerer alt |

## HTTPS = HTTP over TLS

HTTPS bruker port 443. TLS gir:

- **Konfidensialitet**: trafikken er kryptert.
- **Integritet**: endringer underveis blir oppdaget.
- **Autentisering**: serveren beviser hvem den er med et sertifikat signert av en sertifikatutsteder (CA), f.eks. Let's Encrypt.

TLS 1.3 (RFC 8446) er nyeste versjon og trenger bare én rundtur (1-RTT) for et fullt håndtrykk. Med **SNI** sier klienten hvilket vertsnavn den vil nå, slik at én IP-adresse kan ha mange nettsteder og sertifikater. **HSTS** ber nettleseren alltid bruke HTTPS mot domenet.
