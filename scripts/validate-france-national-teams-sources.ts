#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ALLOWED_PARSERS = new Set([
  'ics',
  'watch',
  'uefa_jsonld',
  'sixnations_fixture_links'
]);

function parseArgs(argv) {
  const args = { file: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--file' && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function resolveFilePath(customPath) {
  if (customPath) {
    return path.resolve(customPath);
  }

  const candidates = [
    path.resolve(process.cwd(), 'sources/france-national-teams-watchlist.yaml'),
    path.resolve(process.cwd(), 'facilabo-calendars/sources/france-national-teams-watchlist.yaml')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate france-national-teams-watchlist.yaml. Provide --file.');
}

function fail(message) {
  console.error(`[validate-france-national-teams-sources] ERROR: ${message}`);
  process.exit(1);
}

function assertCondition(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const filePath = resolveFilePath(args.file);
  const raw = fs.readFileSync(filePath, 'utf8').trim();

  let config;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    fail(`Invalid YAML/JSON syntax in ${filePath}. This watchlist uses JSON-compatible YAML. ${error.message}`);
  }

  assertCondition(typeof config === 'object' && config !== null, 'Root must be an object');
  assertCondition(config.version === 1, 'version must be 1');
  assertCondition(config.timezone_default === 'Europe/Paris', 'timezone_default must be Europe/Paris');
  assertCondition(config.cadence_hours === 3, 'cadence_hours must be 3 to match crawler schedule');
  assertCondition(Array.isArray(config.sources), 'sources must be an array');

  const requiredSourceFields = [
    'slug',
    'sport',
    'source_url',
    'parser',
    'selector_rule',
    'timezone_source',
    'confidence_rule',
    'enabled',
    'watch_only',
    'include_keywords'
  ];

  const slugSet = new Set();
  const perSportTotal = { football: 0, rugby: 0 };
  const perSportEnabledPublish = { football: 0, rugby: 0 };

  for (const source of config.sources) {
    for (const field of requiredSourceFields) {
      assertCondition(
        Object.prototype.hasOwnProperty.call(source, field),
        `Missing '${field}' for source ${JSON.stringify(source.slug || source)}`
      );
    }

    assertCondition(!slugSet.has(source.slug), `Duplicate slug detected: ${source.slug}`);
    slugSet.add(source.slug);

    assertCondition(source.sport === 'football' || source.sport === 'rugby', `sport must be football or rugby for ${source.slug}`);
    assertCondition(typeof source.source_url === 'string' && source.source_url.startsWith('https://'), `source_url must be https for ${source.slug}`);
    assertCondition(typeof source.selector_rule === 'string' && source.selector_rule.length > 5, `selector_rule required for ${source.slug}`);
    assertCondition(typeof source.timezone_source === 'string' && source.timezone_source.includes('/'), `timezone_source must look like Area/City for ${source.slug}`);
    assertCondition(typeof source.confidence_rule === 'string' && source.confidence_rule.length > 5, `confidence_rule required for ${source.slug}`);
    assertCondition(source.enabled === true || source.enabled === false, `enabled must be boolean for ${source.slug}`);
    assertCondition(source.watch_only === true || source.watch_only === false, `watch_only must be boolean for ${source.slug}`);
    assertCondition(Array.isArray(source.include_keywords) && source.include_keywords.length > 0, `include_keywords required for ${source.slug}`);

    assertCondition(ALLOWED_PARSERS.has(source.parser), `parser '${source.parser}' is not supported for ${source.slug}`);

    if (Object.prototype.hasOwnProperty.call(source, 'exclude_keywords')) {
      assertCondition(Array.isArray(source.exclude_keywords), `exclude_keywords must be an array for ${source.slug}`);
    }

    if (source.parser === 'watch') {
      assertCondition(source.watch_only === true, `watch parser requires watch_only=true for ${source.slug}`);
      assertCondition(source.crawl_enabled === false, `watch parser requires crawl_enabled=false for ${source.slug}`);
    }

    perSportTotal[source.sport] += 1;

    if (source.enabled && !source.watch_only) {
      perSportEnabledPublish[source.sport] += 1;

      if (Object.prototype.hasOwnProperty.call(source, 'fallback_events')) {
        assertCondition(Array.isArray(source.fallback_events), `fallback_events must be an array for ${source.slug}`);

        for (const fallbackEvent of source.fallback_events) {
          assertCondition(typeof fallbackEvent.uid_key === 'string' && fallbackEvent.uid_key.length > 3, `fallback uid_key required for ${source.slug}`);
          assertCondition(typeof fallbackEvent.summary === 'string' && fallbackEvent.summary.length > 3, `fallback summary required for ${source.slug}`);
          assertCondition(fallbackEvent.timed === true || fallbackEvent.timed === false, `fallback timed must be boolean for ${source.slug}`);
          if (fallbackEvent.timed) {
            assertCondition(typeof fallbackEvent.start_datetime === 'string', `fallback start_datetime required for ${source.slug}`);
            assertCondition(typeof fallbackEvent.end_datetime === 'string', `fallback end_datetime required for ${source.slug}`);
          } else {
            assertCondition(typeof fallbackEvent.start_date === 'string', `fallback start_date required for ${source.slug}`);
            assertCondition(typeof fallbackEvent.end_date === 'string', `fallback end_date required for ${source.slug}`);
          }
        }
      }
    }
  }

  assertCondition(perSportTotal.football >= 2, `Expected at least 2 football sources, got ${perSportTotal.football}`);
  assertCondition(perSportTotal.rugby >= 2, `Expected at least 2 rugby sources, got ${perSportTotal.rugby}`);
  assertCondition(perSportEnabledPublish.football >= 1, `Expected at least 1 football publishing source, got ${perSportEnabledPublish.football}`);
  assertCondition(perSportEnabledPublish.rugby >= 1, `Expected at least 1 rugby publishing source, got ${perSportEnabledPublish.rugby}`);

  console.log('[validate-france-national-teams-sources] OK');
  console.log(`- file: ${filePath}`);
  console.log(`- total sources: ${config.sources.length}`);
  console.log(`- football sources: ${perSportTotal.football} (publishing=${perSportEnabledPublish.football})`);
  console.log(`- rugby sources: ${perSportTotal.rugby} (publishing=${perSportEnabledPublish.rugby})`);
}

main();
