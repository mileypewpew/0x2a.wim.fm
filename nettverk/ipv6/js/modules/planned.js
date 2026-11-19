/* «Kommer snart»: planlagte rader i modulkartet, pluss protokoller som ennå ikke har innhold.
 * 2a (smarthus1) ligger etter 2.2 fordi order er 2.2a. Koden som vises er 2a. */
(function (g) {
  'use strict';
  var R = g.IPV6T.registry;
  (g.IPV6T.MODULE_MAP || []).forEach(function (row) {
    if (!row || row.status !== 'planned') return;
    R.register({
      id: row.jsId,
      code: row.kode,
      order: row.order || row.kode,
      title: row.title,
      description: row.description || '',
      status: 'soon',
      contentId: row.contentId
    });
  });
  R.register({
    id: 'protokoller',
    code: '3',
    title: 'Protokoller',
    status: 'soon',
    description: 'NDP, SLAAC og DHCPv6.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
