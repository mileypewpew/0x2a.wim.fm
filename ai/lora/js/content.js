/* Laster manifestet og modulene. Manifestet er bare en ordnet liste med mappenavn.
 * All metadata leses fra frontmatter i teori.md. */
(function (g) {
  'use strict';
  var LORAT = g.LORAT = g.LORAT || {};

  var TYPE_LABEL = { flervalg: 'Flervalg', tall: 'Tall', tekst: 'Tekst' };
  var TYPE_ORDER = ['flervalg', 'tall', 'tekst'];
  var LEVEL_LABEL = { lett: 'Lett', middels: 'Middels', vanskelig: 'Vanskelig' };
  var FOLDER_OK = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

  function levelLabel(id) {
    if (LEVEL_LABEL[id]) return LEVEL_LABEL[id];
    if (!id) return '';
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function asString(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  function pushWarn(list, text) {
    if (list.indexOf(text) === -1) list.push(text);
  }

  function normalizeLevels(raw, warnings) {
    var out = [];
    var seen = {};
    function add(id, label) {
      id = asString(id).trim();
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push({ id: id, label: label || levelLabel(id) });
    }
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        if (typeof item === 'string' || typeof item === 'number') add(String(item), null);
        else if (item && typeof item === 'object') add(asString(item.id || item.nivå), asString(item.label || item.tittel));
        else pushWarn(warnings, 'Et nivå i frontmatter er verken tekst eller objekt.');
      });
    } else if (raw != null && raw !== '') {
      pushWarn(warnings, 'nivåer må være en liste.');
    }
    return out;
  }

  function normalizeKilder(raw, warnings) {
    var out = [];
    var stringCount = 0;
    if (raw == null || raw === '') return out;
    if (!Array.isArray(raw)) {
      pushWarn(warnings, 'kilder må være en liste.');
      return out;
    }
    raw.forEach(function (item) {
      if (typeof item === 'string') {
        var url = item.trim();
        if (!url) return;
        stringCount++;
        out.push({ tittel: url, url: url });
        return;
      }
      if (item && typeof item === 'object') {
        var href = asString(item.url).trim();
        var title = asString(item.tittel).trim() || href;
        if (!title && !href) return;
        out.push({ tittel: title, url: href });
        if (!asString(item.tittel).trim() || !href) {
          pushWarn(warnings, 'En kilde mangler tittel eller url.');
        }
        return;
      }
      pushWarn(warnings, 'En kilde har ukjent form.');
    });
    if (stringCount) {
      pushWarn(warnings, 'kilder har ' + stringCount + ' oppføring' + (stringCount === 1 ? '' : 'er') +
        ' som bare er en URL. Formatet er {tittel, url}. Lenken vises likevel.');
    }
    return out;
  }

  function normalizeTask(raw, index, warnings) {
    var where = 'Oppgave ' + (index + 1);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      pushWarn(warnings, where + ' er ikke et objekt.');
      return null;
    }
    if (raw.id) where = String(raw.id);
    var type = raw.type;
    if (!TYPE_LABEL[type]) {
      pushWarn(warnings, where + ' har ukjent type.');
      return null;
    }
    var question = asString(raw['spørsmål']).trim();
    if (!question) {
      pushWarn(warnings, where + ' mangler spørsmål.');
      return null;
    }
    if (!Array.isArray(raw.svar) || !raw.svar.length) {
      pushWarn(warnings, where + ' mangler svar.');
      return null;
    }
    var svar = [];
    raw.svar.forEach(function (s) {
      if (typeof s === 'string') svar.push(s);
      else if (typeof s === 'number' && isFinite(s)) {
        svar.push(String(s));
        pushWarn(warnings, where + ' har et svar som er et tall, ikke en streng.');
      } else pushWarn(warnings, where + ' har et svar som ikke er tekst.');
    });
    if (!svar.length) return null;

    var alternativer = null;
    if (type === 'flervalg') {
      if (!Array.isArray(raw.alternativer) || raw.alternativer.length < 2) {
        pushWarn(warnings, where + ' mangler minst to alternativer.');
        return null;
      }
      alternativer = [];
      raw.alternativer.forEach(function (alt) {
        if (typeof alt !== 'string' || !alt.trim()) pushWarn(warnings, where + ' har et tomt alternativ.');
        else alternativer.push(alt);
      });
      if (alternativer.length < 2) return null;
      var known = {};
      alternativer.forEach(function (alt) { known[LORAT.grade.normText(alt)] = true; });
      svar.forEach(function (s) {
        if (!known[LORAT.grade.normText(s)]) {
          pushWarn(warnings, where + ' har et svar som ikke finnes blant alternativene.');
        }
      });
    }

    var toleranse = 0;
    if (type === 'tall') {
      if (raw.toleranse == null || raw.toleranse === '') toleranse = 0;
      else if (typeof raw.toleranse === 'number' && isFinite(raw.toleranse) && raw.toleranse >= 0) toleranse = raw.toleranse;
      else {
        pushWarn(warnings, where + ' har ugyldig toleranse. Eksakt treff brukes.');
        toleranse = 0;
      }
      svar.forEach(function (s) {
        if (LORAT.grade.parseAuthorTall(s) == null) {
          pushWarn(warnings, where + ' har et tallsvar som ikke bruker punktum som desimaltegn: ' + s);
        }
      });
    }

    var steg = [];
    var forklaring = raw.forklaring;
    if (!forklaring || !Array.isArray(forklaring.steg)) pushWarn(warnings, where + ' mangler forklaring.steg.');
    else forklaring.steg.forEach(function (step) {
      if (typeof step === 'string') steg.push(step);
      else pushWarn(warnings, where + ' har et forklaringssteg som ikke er tekst.');
    });

    return {
      id: asString(raw.id).trim() || ('oppgave-' + (index + 1)),
      nivå: asString(raw['nivå']).trim(),
      type: type,
      typeLabel: TYPE_LABEL[type],
      spørsmål: question,
      alternativer: alternativer,
      svar: svar,
      toleranse: toleranse,
      forklaring: { steg: steg }
    };
  }

  function normalizeModule(folder, teoriText, oppgaverText) {
    var warnings = [];
    var split = LORAT.yaml.splitFrontmatter(teoriText);
    if (split.error) pushWarn(warnings, split.error);
    var data = split.data || {};
    var tasksRaw;
    try {
      tasksRaw = JSON.parse(oppgaverText);
    } catch (err) {
      pushWarn(warnings, 'oppgaver.json er ikke gyldig JSON.');
      tasksRaw = [];
    }
    if (!Array.isArray(tasksRaw)) {
      pushWarn(warnings, 'oppgaver.json må være en liste.');
      tasksRaw = [];
    }
    var seen = {};
    var oppgaver = [];
    tasksRaw.forEach(function (raw, index) {
      var task = normalizeTask(raw, index, warnings);
      if (!task) return;
      if (seen[task.id]) pushWarn(warnings, 'Oppgave-id er brukt to ganger: ' + task.id);
      seen[task.id] = true;
      oppgaver.push(task);
    });

    var nivåer = normalizeLevels(data['nivåer'], warnings);
    var knownLevel = {};
    nivåer.forEach(function (l) { knownLevel[l.id] = true; });
    oppgaver.forEach(function (task) {
      if (!task.nivå) {
        pushWarn(warnings, task.id + ' mangler nivå.');
        return;
      }
      if (!knownLevel[task.nivå]) {
        knownLevel[task.nivå] = true;
        nivåer.push({ id: task.nivå, label: levelLabel(task.nivå) });
        pushWarn(warnings, 'Nivået «' + task.nivå + '» brukes i oppgaver, men står ikke i frontmatter.');
      }
    });

    var typesPresent = {};
    oppgaver.forEach(function (task) { typesPresent[task.type] = true; });
    var taskTypes = TYPE_ORDER.filter(function (id) { return typesPresent[id]; }).map(function (id) {
      return { id: id, label: TYPE_LABEL[id] };
    });

    var id = asString(data.id).trim() || folder;
    var kode = asString(data.kode).trim() || folder;
    var tittel = asString(data.tittel).trim() || folder;
    if (!asString(data.id).trim()) pushWarn(warnings, 'Frontmatter mangler id. Mappenavnet brukes.');
    if (!asString(data.tittel).trim()) pushWarn(warnings, 'Frontmatter mangler tittel.');
    if (!asString(data.beskrivelse).trim()) pushWarn(warnings, 'Frontmatter mangler beskrivelse.');
    if (!asString(data.oppdatert).trim()) pushWarn(warnings, 'Frontmatter mangler oppdatert.');

    return {
      id: id,
      kode: kode,
      tittel: tittel,
      beskrivelse: asString(data.beskrivelse).trim(),
      nivåer: nivåer,
      kilder: normalizeKilder(data.kilder, warnings),
      oppdatert: asString(data.oppdatert).trim(),
      mappe: folder,
      teori: split.body || '',
      oppgaver: oppgaver,
      taskTypes: taskTypes,
      warnings: warnings
    };
  }

  function contentVersion() {
    var doc = g.document;
    var el = doc && doc.querySelector('meta[name="lora-innhold-versjon"]');
    var v = el && el.getAttribute('content');
    return (v && String(v).trim()) || '0';
  }

  function withVersion(url, version) {
    var u = new URL(url, g.location.href);
    u.searchParams.set('v', version);
    return u.toString();
  }

  function fetchText(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        var path = '';
        try { path = new URL(url).pathname; } catch (e) { path = url; }
        throw new Error('Klarte ikke å hente ' + path + ' (' + res.status + ').');
      }
      return res.text();
    });
  }

  function load() {
    var version = contentVersion();
    var base = new URL('../../content/ai/lora/', g.location.href);
    var manifestUrl = withVersion(new URL('index.json', base).toString(), version);
    return fetchText(manifestUrl).then(function (text) {
      var data;
      try { data = JSON.parse(text); }
      catch (err) { throw new Error('index.json er ikke gyldig JSON.'); }
      if (!data || !Array.isArray(data.moduler)) {
        throw new Error('Manifestet må være en liste med mappenavn: {"moduler": ["00-eksempel"]}.');
      }
      var folders = [];
      var seen = {};
      var manifestWarnings = [];
      data.moduler.forEach(function (item) {
        if (typeof item !== 'string' || !FOLDER_OK.test(item)) {
          manifestWarnings.push('Hoppet over ugyldig oppføring i manifestet.');
          return;
        }
        if (seen[item]) return;
        seen[item] = true;
        folders.push(item);
      });
      return Promise.all(folders.map(function (folder) {
        var root = new URL(folder + '/', base);
        var teoriUrl = withVersion(new URL('teori.md', root).toString(), version);
        var oppUrl = withVersion(new URL('oppgaver.json', root).toString(), version);
        return Promise.all([fetchText(teoriUrl), fetchText(oppUrl)]).then(function (parts) {
          var mod = normalizeModule(folder, parts[0], parts[1]);
          mod.loadError = null;
          return mod;
        }).catch(function (err) {
          return {
            id: folder, kode: folder, tittel: folder, beskrivelse: '',
            nivåer: [], kilder: [], oppdatert: '', mappe: folder, teori: '',
            oppgaver: [], taskTypes: [], loadError: err.message || String(err), warnings: []
          };
        });
      })).then(function (modules) {
        return { modules: modules, warnings: manifestWarnings, version: version };
      });
    });
  }

  LORAT.content = {
    load: load,
    normalizeModule: normalizeModule,
    levelLabel: levelLabel,
    contentVersion: contentVersion,
    TYPE_LABEL: TYPE_LABEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
