#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    path.resolve(process.cwd(), 'sources/tech-gaming-watchlist.yaml'),
    path.resolve(process.cwd(), 'facilabo-calendars/sources/tech-gaming-watchlist.yaml')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate tech-gaming-watchlist.yaml. Provide --file.');
}

function fail(message) {
  console.error(`[validate-tech-gaming-sources] ERROR: ${message}`);
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
  assertCondition(config.timezone_default === 'Europe/Paris', 'timezone_default must be Europe/Paris');
  assertCondition(config.cadence_hours === 6, 'cadence_hours must be 6 to match watcher schedule');
  assertCondition(Array.isArray(config.sources), 'sources must be an array');

  const requiredSourceFields = [
    'slug',
    'source_url',
    'selector_rule',
    'timezone_source',
    'confidence_rule',
    'enabled'
  ];

  const slugSet = new Set();
  let mvpCount = 0;
  let watchOnlyCount = 0;

  for (const source of config.sources) {
    for (const field of requiredSourceFields) {
      assertCondition(Object.prototype.hasOwnProperty.call(source, field), `Missing '${field}' for source ${JSON.stringify(source.slug || source.event_name || source)}`);
    }

    assertCondition(!slugSet.has(source.slug), `Duplicate slug detected: ${source.slug}`);
    slugSet.add(source.slug);

    assertCondition(typeof source.source_url === 'string' && source.source_url.startsWith('https://'), `source_url must be https for ${source.slug}`);
    assertCondition(typeof source.selector_rule === 'string' && source.selector_rule.length > 3, `selector_rule required for ${source.slug}`);
    assertCondition(typeof source.timezone_source === 'string' && source.timezone_source.includes('/'), `timezone_source must look like Area/City for ${source.slug}`);
    assertCondition(typeof source.confidence_rule === 'string' && source.confidence_rule.length > 3, `confidence_rule required for ${source.slug}`);

    if (source.enabled !== true && source.enabled !== false) {
      fail(`enabled must be boolean for ${source.slug}`);
    }

    if (source.watch_only) {
      watchOnlyCount += 1;
      continue;
    }

    if (source.enabled) {
      mvpCount += 1;
      assertCondition(typeof source.event === 'object' && source.event !== null, `event block required for enabled source ${source.slug}`);

      const isTimed = source.event.timed === true;
      if (isTimed) {
        assertCondition(typeof source.event.start_datetime === 'string', `start_datetime required for timed source ${source.slug}`);
        assertCondition(typeof source.event.end_datetime === 'string', `end_datetime required for timed source ${source.slug}`);
      } else {
        assertCondition(typeof source.event.start_date === 'string', `start_date required for all-day source ${source.slug}`);
        assertCondition(typeof source.event.end_date === 'string', `end_date required for all-day source ${source.slug}`);
      }

      assertCondition(typeof source.event.summary === 'string' && source.event.summary.length > 3, `summary required for ${source.slug}`);
      assertCondition(typeof source.event.dtstamp === 'string' && /^[0-9]{8}T[0-9]{6}Z$/.test(source.event.dtstamp), `dtstamp must be UTC timestamp format for ${source.slug}`);
    }
  }

  assertCondition(mvpCount >= 10, `Expected at least 10 enabled non-watch-only sources, got ${mvpCount}`);
  assertCondition(slugSet.has('wwdc'), 'WWDC watchlist entry is required');
  assertCondition(slugSet.has('google-io'), 'Google I/O watchlist entry is required');

  console.log('[validate-tech-gaming-sources] OK');
  console.log(`- file: ${filePath}`);
  console.log(`- total sources: ${config.sources.length}`);
  console.log(`- mvp enabled: ${mvpCount}`);
  console.log(`- watch-only: ${watchOnlyCount}`);
}

main();
