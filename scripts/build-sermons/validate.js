// Checks a sermons.json object against the contract shared by the job and assets/js/sermons.js.
// Returns a list of problems; an empty list means the data is valid.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RECENT = 6;

function validateSermons(data) {
  const errors = [];
  const check = (ok, msg) => { if (!ok) errors.push(msg); };
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const str = (v) => typeof v === 'string';
  const strOrNull = (v) => v === null || str(v);
  const date = (v) => str(v) && DATE.test(v);
  const dateOrNull = (v) => v === null || date(v);
  const url = (v) => str(v) && v.startsWith('https://');
  const urlOrNull = (v) => v === null || url(v);
  const has = (o, key, path) => {
    const ok = isObj(o) && Object.prototype.hasOwnProperty.call(o, key);
    check(ok, `${path}.${key} is missing`);
    return ok;
  };
  // Checks each listed key exists and passes its type test.
  const fields = (o, path, spec) => {
    for (const [key, [test, what]] of Object.entries(spec)) {
      if (has(o, key, path)) check(test(o[key]), `${path}.${key} should be ${what}`);
    }
  };

  if (!isObj(data)) return ['data should be an object'];
  check(data.version === 1, 'version should be 1');
  fields(data, 'data', {
    generatedAt: [str, 'a string'],
    streamsUrl: [url, 'an https URL'],
    recent: [Array.isArray, 'an array'],
    series: [Array.isArray, 'an array'],
  });

  if (Array.isArray(data.recent)) {
    check(data.recent.length <= MAX_RECENT, `recent should have at most ${MAX_RECENT} items`);
    data.recent.forEach((v, i) => {
      const p = `recent[${i}]`;
      fields(v, p, {
        videoId: [str, 'a string'],
        url: [url, 'an https URL'],
        thumbnail: [url, 'an https URL'],
        date: [date, 'a YYYY-MM-DD date'],
        youtubeTitle: [str, 'a string'],
        live: [(x) => typeof x === 'boolean', 'true or false'],
        summary: [strOrNull, 'a string or null'],
        sermon: [(x) => x === null || isObj(x), 'an object or null'],
      });
      if (isObj(v) && isObj(v.sermon)) {
        fields(v.sermon, `${p}.sermon`, {
          seriesId: [str, 'a string'],
          seriesTitle: [str, 'a string'],
          number: [str, 'a string'],
          title: [strOrNull, 'a string or null'],
          passage: [strOrNull, 'a string or null'],
          notesUrl: [urlOrNull, 'an https URL or null'],
          audioUrl: [urlOrNull, 'an https URL or null'],
        });
      }
    });
  }

  if (Array.isArray(data.series)) {
    const ids = new Set();
    data.series.forEach((s, i) => {
      const p = `series[${i}]`;
      fields(s, p, {
        id: [str, 'a string'],
        title: [str, 'a string'],
        current: [(x) => typeof x === 'boolean', 'true or false'],
        folderUrl: [url, 'an https URL'],
        summary: [strOrNull, 'a string or null'],
        firstDate: [dateOrNull, 'a YYYY-MM-DD date or null'],
        lastDate: [dateOrNull, 'a YYYY-MM-DD date or null'],
        sermons: [Array.isArray, 'an array'],
      });
      if (isObj(s) && str(s.id)) {
        check(!ids.has(s.id), `${p}.id "${s.id}" is used more than once`);
        ids.add(s.id);
      }
      if (isObj(s) && Array.isArray(s.sermons)) {
        s.sermons.forEach((m, j) => fields(m, `${p}.sermons[${j}]`, {
          key: [str, 'a string'],
          number: [str, 'a string'],
          date: [date, 'a YYYY-MM-DD date'],
          title: [strOrNull, 'a string or null'],
          passage: [strOrNull, 'a string or null'],
          notesUrl: [urlOrNull, 'an https URL or null'],
          audioUrl: [urlOrNull, 'an https URL or null'],
          videoUrl: [urlOrNull, 'an https URL or null'],
          summary: [strOrNull, 'a string or null'],
        }));
      }
    });
  }
  return errors;
}

module.exports = { validateSermons, MAX_RECENT };
