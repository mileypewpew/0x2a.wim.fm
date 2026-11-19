/* Modul 0 registreres fra modulkartet i catalog.js, via static.js.
 * Filen blir lastet etter static.js slik at IPV6T.hvorfor finnes for eksisterende kall. */
(function (g) {
  'use strict';
  if (!g.IPV6T || !g.IPV6T.hvorfor) {
    throw new Error('js/modules/static.js må lastes før hvorfor.js');
  }
})(typeof window !== 'undefined' ? window : globalThis);
