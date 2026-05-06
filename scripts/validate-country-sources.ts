#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[validate-country-sources] ERROR: ${message}`);
  process.exit(1);
}

function assertCondition(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function resolveSourcesDir() {
  const candidates = [
    path.resolve(process.cwd(), 'sources/countries'),
    path.resolve(process.cwd(), 'facilabo-calendars/sources/countries')
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    fail('Unable to locate sources/countries');
  }
  return found;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function eachEvent(calendar) {
  if (!Array.isArray(calendar.events)) {
    return [];
  }
  return calendar.events;
}

function main() {
  const sourcesDir = resolveSourcesDir();
  const files = fs.readdirSync(sourcesDir).filter((name) => name.endsWith('.json')).sort();
  assertCondition(files.length > 0, 'Expected at least one country source file');

  const knownSlugs = new Set();
  let calendarCount = 0;
  let eventCount = 0;

  for (const fileName of files) {
    const filePath = path.join(sourcesDir, fileName);
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    assertCondition(typeof config.country === 'string' && config.country.length > 1, `${fileName}: country is required`);
    assertCondition(isIsoDate(config.verified_at), `${fileName}: verified_at must be YYYY-MM-DD`);
    assertCondition(Array.isArray(config.sources) && config.sources.length > 0, `${fileName}: sources are required`);
    assertCondition(Array.isArray(config.calendars) && config.calendars.length > 0, `${fileName}: calendars are required`);

    const sourceIds = new Set();
    for (const source of config.sources) {
      assertCondition(typeof source.id === 'string' && source.id.length > 2, `${fileName}: source id required`);
      assertCondition(!sourceIds.has(source.id), `${fileName}: duplicate source id ${source.id}`);
      sourceIds.add(source.id);
      assertCondition(typeof source.url === 'string' && source.url.startsWith('https://'), `${fileName}: source ${source.id} must be https`);
      assertCondition(['high', 'medium', 'low'].includes(source.confidence), `${fileName}: source ${source.id} invalid confidence`);
    }

    const localSlugs = new Set();
    for (const calendar of config.calendars) {
      calendarCount += 1;
      assertCondition(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(calendar.slug), `${fileName}: invalid slug ${calendar.slug}`);
      assertCondition(!localSlugs.has(calendar.slug), `${fileName}: duplicate local slug ${calendar.slug}`);
      assertCondition(!knownSlugs.has(calendar.slug), `${fileName}: duplicate global slug ${calendar.slug}`);
      localSlugs.add(calendar.slug);
      knownSlugs.add(calendar.slug);

      assertCondition(typeof calendar.path === 'string' && calendar.path.endsWith('.ics'), `${calendar.slug}: path must be .ics`);
      assertCondition(calendar.timezone === 'Europe/Paris', `${calendar.slug}: timezone must be Europe/Paris`);
      assertCondition(Array.isArray(calendar.categories) && calendar.categories.includes('Pays'), `${calendar.slug}: categories must include Pays`);
      assertCondition(['events', 'derived-bridges'].includes(calendar.kind), `${calendar.slug}: kind unsupported`);

      const eventKeys = new Set();
      for (const event of eachEvent(calendar)) {
        eventCount += 1;
        assertCondition(typeof event.key === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.key), `${calendar.slug}: invalid event key`);
        assertCondition(!eventKeys.has(event.key), `${calendar.slug}: duplicate event key ${event.key}`);
        eventKeys.add(event.key);
        assertCondition(typeof event.summary === 'string' && event.summary.length > 3, `${calendar.slug}/${event.key}: summary required`);
        assertCondition(sourceIds.has(event.source_id), `${calendar.slug}/${event.key}: unknown source_id ${event.source_id}`);
        assertCondition(['high', 'medium', 'low'].includes(event.confidence), `${calendar.slug}/${event.key}: invalid confidence`);

        if (event.date_rule) {
          assertCondition(Array.isArray(event.years) && event.years.length > 0, `${calendar.slug}/${event.key}: years required for date_rule`);
        } else {
          assertCondition(isIsoDate(event.start_date), `${calendar.slug}/${event.key}: start_date required`);
          assertCondition(isIsoDate(event.end_date), `${calendar.slug}/${event.key}: end_date required`);
        }
      }
    }
  }

  assertCondition(knownSlugs.has('belgique-ponts'), 'belgique-ponts source required');
  assertCondition(knownSlugs.has('luxembourg-feries-legaux'), 'luxembourg-feries-legaux source required');
  assertCondition(knownSlugs.has('luxembourg-vacances-scolaires'), 'luxembourg-vacances-scolaires source required');
  assertCondition(knownSlugs.has('luxembourg-ponts'), 'luxembourg-ponts source required');

  console.log('[validate-country-sources] OK');
  console.log(`- directory: ${sourcesDir}`);
  console.log(`- files: ${files.length}`);
  console.log(`- calendars: ${calendarCount}`);
  console.log(`- explicit events: ${eventCount}`);
}

main();
