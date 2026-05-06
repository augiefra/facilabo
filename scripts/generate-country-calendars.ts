#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DTSTAMP = '20260506T120000Z';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    sourcesDir: null,
    outputRoot: null,
    mirrorRoot: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--sources' && argv[i + 1]) {
      args.sourcesDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--output' && argv[i + 1]) {
      args.outputRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--mirror' && argv[i + 1]) {
      args.mirrorRoot = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function fail(message) {
  console.error(`[generate-country-calendars] ERROR: ${message}`);
  process.exit(1);
}

function resolvePath(customPath, candidates, required) {
  if (customPath) {
    return path.resolve(customPath);
  }
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  if (required) {
    return path.resolve(candidates[0]);
  }
  return null;
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDate(dateString) {
  return dateString.replace(/-/g, '');
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateFromRule(rule, year) {
  if (rule.type === 'fixed') {
    return `${year}-${String(rule.month).padStart(2, '0')}-${String(rule.day).padStart(2, '0')}`;
  }
  if (rule.type === 'easter_offset') {
    return addDays(easterSunday(year), rule.days);
  }
  fail(`Unsupported date rule: ${JSON.stringify(rule)}`);
}

function normalizeEvent(sourceEvent, calendar, sourceById) {
  const startDate = sourceEvent.date_rule
    ? dateFromRule(sourceEvent.date_rule, sourceEvent.year)
    : sourceEvent.start_date;
  const endDate = sourceEvent.date_rule
    ? startDate
    : sourceEvent.end_date;
  const source = sourceById.get(sourceEvent.source_id);
  return {
    key: sourceEvent.key,
    slug: calendar.slug,
    summary: sourceEvent.summary,
    startDate,
    endDate,
    sourceUrl: source.url,
    type: sourceEvent.type,
    confidence: sourceEvent.confidence,
    note: sourceEvent.note || null,
    categories: calendar.categories,
    description: sourceEvent.description || calendar.description,
    uidYear: sourceEvent.uidYear || null
  };
}

function expandCalendarEvents(calendar, sourceById) {
  const events = [];
  for (const event of calendar.events || []) {
    if (event.date_rule) {
      for (const year of event.years) {
        events.push(normalizeEvent({ ...event, year, uidYear: year }, calendar, sourceById));
      }
      continue;
    }
    events.push(normalizeEvent(event, calendar, sourceById));
  }
  return events;
}

function parseIcsEvents(filePath, slug, categories) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const blocks = raw.split('BEGIN:VEVENT').slice(1).map((chunk) => chunk.split('END:VEVENT')[0]);
  const events = [];

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    const record = {};
    for (const line of lines) {
      const index = line.indexOf(':');
      if (index === -1) continue;
      const key = line.slice(0, index);
      const value = line.slice(index + 1);
      record[key] = value;
    }
    const uid = record.UID || '';
    const categoryText = record.CATEGORIES || '';
    if (!categoryText.includes('Feries')) continue;
    const dateText = record['DTSTART;VALUE=DATE'];
    if (!dateText) continue;
    const startDate = `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`;
    const key = uid.replace('@facilabo.app', '').replace(/^belgique-feries-remplacement-/, '');
    if (key.startsWith('remplacement-') || key.startsWith('rappel-politique-')) continue;
    events.push({
      key,
      slug,
      summary: (record.SUMMARY || '').replace(/\\/g, ''),
      startDate,
      endDate: startDate,
      sourceUrl: record.URL || 'https://www.belgium.be/fr/la_belgique/connaitre_le_pays/la_belgique_en_bref/jours_feries',
      type: 'public_holiday',
      confidence: 'high',
      note: null,
      categories
    });
  }

  return events;
}

function deriveBridgeEvents(calendar, baseEvents) {
  const holidayDates = new Set(baseEvents.map((event) => event.startDate));
  const events = [];

  for (const holiday of baseEvents) {
    const day = weekday(holiday.startDate);
    let bridgeDate = null;
    let relation = null;

    if (day === 4 && calendar.bridge_policy.thursday === 'next-friday') {
      bridgeDate = addDays(holiday.startDate, 1);
      relation = 'vendredi suivant';
    } else if (day === 2 && calendar.bridge_policy.tuesday === 'previous-monday') {
      bridgeDate = addDays(holiday.startDate, -1);
      relation = 'lundi precedent';
    }

    if (!bridgeDate) continue;
    if (calendar.bridge_policy.exclude_weekends && [0, 6].includes(weekday(bridgeDate))) continue;
    if (calendar.bridge_policy.exclude_existing_public_holidays && holidayDates.has(bridgeDate)) continue;

    const year = bridgeDate.slice(0, 4);
    const sourceKey = holiday.key.replace(/-\d{4}$/, '');
    events.push({
      key: `${sourceKey}-${bridgeDate}`,
      slug: calendar.slug,
      summary: `Pont possible - ${holiday.summary}`,
      startDate: bridgeDate,
      endDate: bridgeDate,
      sourceUrl: holiday.sourceUrl,
      type: 'bridge_opportunity',
      confidence: 'medium',
      note: `${calendar.bridge_policy.wording} Jour propose: ${relation} du jour ferie.`,
      categories: calendar.categories,
      description: calendar.description,
      uidYear: year
    });
  }

  return events;
}

function buildVevent(event) {
  const endExclusive = addDays(event.endDate, 1);
  const year = event.uidYear || event.startDate.slice(0, 4);
  const descriptionParts = [
    event.description,
    event.note,
    `Source: ${event.sourceUrl}`,
    `Fiabilite: ${event.confidence}`
  ].filter(Boolean);

  return [
    'BEGIN:VEVENT',
    `UID:${event.slug}-${event.key}-${year}@facilabo.app`,
    `DTSTAMP:${DTSTAMP}`,
    `DTSTART;VALUE=DATE:${formatDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${formatDate(endExclusive)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join(' '))}`,
    `URL:${event.sourceUrl}`,
    `CATEGORIES:${event.categories.map(escapeIcsText).join(',')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT'
  ].join('\n');
}

function buildCalendar(calendar, events) {
  const sortedEvents = events.sort((a, b) => {
    const byDate = a.startDate.localeCompare(b.startDate);
    return byDate !== 0 ? byDate : a.summary.localeCompare(b.summary);
  });
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//FacilAbo//${calendar.slug}//FR`,
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${calendar.name}`,
    `X-WR-CALDESC:${calendar.description}`,
    `X-WR-TIMEZONE:${calendar.timezone}`,
    'BEGIN:VTIMEZONE',
    `TZID:${calendar.timezone}`,
    `X-LIC-LOCATION:${calendar.timezone}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];
  return [...header, ...sortedEvents.map(buildVevent), 'END:VCALENDAR'].join('\n') + '\n';
}

function ensureDirectoryFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) return false;
  ensureDirectoryFor(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function assertNoDuplicateEvents(slug, events) {
  const seen = new Set();
  for (const event of events) {
    const key = `${event.startDate}|${event.endDate}|${event.summary}`;
    if (seen.has(key)) {
      fail(`${slug}: duplicate event candidate ${key}`);
    }
    seen.add(key);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const sourcesDir = resolvePath(args.sourcesDir, ['sources/countries'], true);
  const outputRoot = resolvePath(args.outputRoot, ['.'], true);
  const mirrorRoot = resolvePath(args.mirrorRoot, ['../calendars'], false);

  const configs = fs.readdirSync(sourcesDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(sourcesDir, name), 'utf8')));

  const generatedBySlug = new Map();
  let changedCount = 0;
  let generatedCount = 0;

  for (const config of configs) {
    const sourceById = new Map(config.sources.map((source) => [source.id, source]));
    for (const calendar of config.calendars) {
      let events = [];
      if (calendar.kind === 'events') {
        events = expandCalendarEvents(calendar, sourceById);
      } else if (calendar.kind === 'derived-bridges') {
        let baseEvents = [];
        if (calendar.source_slug) {
          baseEvents = generatedBySlug.get(calendar.source_slug) || [];
        } else if (calendar.source_calendar) {
          baseEvents = parseIcsEvents(path.join(outputRoot, calendar.source_calendar.path), calendar.slug, calendar.categories);
        }
        events = deriveBridgeEvents(calendar, baseEvents);
      }

      assertNoDuplicateEvents(calendar.slug, events);
      generatedBySlug.set(calendar.slug, events);

      const content = buildCalendar(calendar, events);
      const outputPath = path.join(outputRoot, calendar.path);
      const mirrorPath = mirrorRoot ? path.join(mirrorRoot, calendar.path) : null;

      generatedCount += 1;
      if (args.dryRun) {
        console.log(`[dry-run] ${calendar.slug}: ${events.length} events -> ${outputPath}${mirrorPath ? ` + ${mirrorPath}` : ''}`);
        continue;
      }

      if (writeIfChanged(outputPath, content)) changedCount += 1;
      if (mirrorPath && writeIfChanged(mirrorPath, content)) changedCount += 1;
      console.log(`[write] ${calendar.slug}: ${events.length} events`);
    }
  }

  console.log(`[generate-country-calendars] OK - calendars=${generatedCount} changed=${changedCount} dryRun=${args.dryRun}`);
}

main();
