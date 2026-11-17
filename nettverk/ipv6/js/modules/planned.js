/* Planlagte moduler, vises som «Kommer snart» på startsiden. */
(function (g) {
  'use strict';
  var R = g.IPV6T.registry;
  R.register({ id: 'notasjon', code: '2.1', title: 'Adressenotasjon', status: 'soon',
    description: 'Forkorting av adresser, ledende nuller og ::-regelen.' });
  R.register({ id: 'subnetting', code: '2.2', title: 'Subnetting', status: 'soon',
    description: 'Prefikslengder, /48, /56, /64 og oppdeling av adresseblokker.' });
  R.register({ id: 'typer', code: '2.3', title: 'Adressetyper og scope', status: 'soon',
    description: 'Global unicast, link-local, ULA, multicast og scope.' });
  R.register({ id: 'protokoller', code: '3', title: 'Protokoller', status: 'soon',
    description: 'NDP, SLAAC og DHCPv6.' });
})(typeof window !== 'undefined' ? window : globalThis);
