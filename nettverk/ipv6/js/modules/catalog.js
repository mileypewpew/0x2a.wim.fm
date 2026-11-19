/* Én kartlegging for statiske IPv6-moduler.
 * contentId er mappenavnet under content/nettverk/ipv6/.
 * jsId er nøkkelen i modulregisteret (uendret for notasjon, subnetting og typer).
 * kode vises på kortet. order brukes bare til sortering når koden ikke sorterer riktig.
 * statsKey er localStorage-nøkkelen. Hver modul har sin egen.
 * Ingen rad bruker ipv6t.stats.v1 eller ngrunn.*, og bare modul 0 bruker ipv6t.hvorfor.stats.v1.
 *
 * status 'active' lastes og registreres av static.js.
 * status 'planned' registreres som «Kommer snart» av planned.js og lastes ikke.
 * order '2.2a' legger kode 2a mellom 2.2 og 2.3, fordi ren kodesortering ville lagt 2a etter 2.3.
 */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T = g.IPV6T || {};
  IPV6T.MODULE_MAP = [
    {
      contentId: 'ipv6-hvorfor',
      jsId: 'ipv6-hvorfor',
      kode: '0',
      order: '0',
      statsKey: 'ipv6t.hvorfor.stats.v1',
      status: 'active',
      title: 'Hvorfor IPv6: historie og fremtid',
      description: 'Hvorfor IPv4 tok slutt, plasterløsningene, hva IPv6 løser, en kort tidslinje og status i dag.'
    },
    {
      contentId: '21-adressenotasjon',
      jsId: 'notasjon',
      kode: '2.1',
      order: '2.1',
      statsKey: 'ipv6t.notasjon.stats.v1',
      status: 'active',
      title: 'Adressenotasjon',
      description: 'Hvordan en IPv6-adresse skrives, forkortes og utvides etter RFC 5952.'
    },
    {
      contentId: '22-subnetting',
      jsId: 'subnetting',
      kode: '2.2',
      order: '2.2',
      statsKey: 'ipv6t.subnetting.stats.v1',
      status: 'active',
      title: 'Subnetting',
      description: 'Prefikslengder, /48, /56, /64 og hvordan du deler opp en IPv6-blokk.'
    },
    {
      contentId: '2a-smarthus-del-1',
      jsId: 'smarthus1',
      kode: '2a',
      order: '2.2a',
      statsKey: 'ipv6t.smarthus1.stats.v1',
      status: 'active',
      title: 'Aktivitet 2a: Smarthus – del 1',
      description: 'Øv på å dele en IPv6-blokk til et hus: /64-nett til rom og enhetsgrupper.'
    },
    {
      contentId: '23-adressetyper',
      jsId: 'typer',
      kode: '2.3',
      order: '2.3',
      statsKey: 'ipv6t.typer.stats.v1',
      status: 'active',
      title: 'Adressetyper og scope',
      description: 'Global unicast, link-local, ULA, multicast og virkeområde (scope).'
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
