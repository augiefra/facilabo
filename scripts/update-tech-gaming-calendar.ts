#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: null,
    output: null,
    mirror: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--file' && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--mirror' && argv[i + 1]) {
      args.mirror = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return args;
}

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePath(customPath, candidates, required) {
  if (customPath) {
    return path.resolve(customPath);
  }

  const existing = resolveExistingPath(candidates.map((item) => path.resolve(item)));
  if (existing) {
    return existing;
  }

  if (required) {
    return path.resolve(candidates[0]);
  }

  return null;
}

function fail(message) {
  console.error(`[update-tech-gaming-calendar] ERROR: ${message}`);
  process.exit(1);
}

function loadConfig(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid YAML/JSON syntax in ${filePath}. ${error.message}`);
  }
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDateForIcs(dateString) {
  return dateString.replace(/-/g, '');
}

function formatDateTimeForIcs(dateTimeString) {
  return dateTimeString.replace(/[-:]/g, '');
}

function addOneDay(dateString) {
  const [year, month, day] = dateString.split('-').map((value) => Number(value));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function eventSortKey(source) {
  if (source.event.timed) {
    return source.event.start_datetime;
  }
  return `${source.event.start_date}T00:00:00`;
}

function buildVevent(source) {
  const event = source.event;
  const year = event.timed ? event.start_datetime.slice(0, 4) : event.start_date.slice(0, 4);
  const lines = [
    'BEGIN:VEVENT',
    `UID:culture-tech-gaming-${source.slug}-${year}@facilabo.app`,
    `DTSTAMP:${event.dtstamp}`
  ];

  if (event.timed) {
    lines.push(`DTSTART;TZID=Europe/Paris:${formatDateTimeForIcs(event.start_datetime)}`);
    lines.push(`DTEND;TZID=Europe/Paris:${formatDateTimeForIcs(event.end_datetime)}`);
  } else {
    const endExclusive = addOneDay(event.end_date);
    lines.push(`DTSTART;VALUE=DATE:${formatDateForIcs(event.start_date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateForIcs(endExclusive)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);

  const description = event.description
    ? `${event.description} Source officielle: ${source.source_url}`
    : `Source officielle: ${source.source_url}`;
  lines.push(`DESCRIPTION:${escapeIcsText(description)}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push(`URL:${source.source_url}`);

  const categories = Array.isArray(event.categories) && event.categories.length > 0
    ? event.categories
    : ['Culture', 'Tech', 'Gaming'];
  lines.push(`CATEGORIES:${categories.map((category) => escapeIcsText(category)).join(',')}`);

  lines.push(`STATUS:${event.status || 'CONFIRMED'}`);
  lines.push('END:VEVENT');

  return lines.join('\n');
}

function buildCalendar(config) {
  const activeSources = config.sources
    .filter((source) => source.enabled === true && !source.watch_only)
    .filter((source) => source.event && typeof source.event === 'object')
    .sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)));

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FacilAbo//Conferences Tech-Gaming//FR',
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Conferences Tech/Gaming',
    'X-WR-CALDESC:Conferences Tech/Gaming officielles - MVP 2026',
    'X-WR-TIMEZONE:Europe/Paris',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'X-LIC-LOCATION:Europe/Paris',
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

  const body = activeSources.map((source) => buildVevent(source));
  const footer = ['END:VCALENDAR'];

  return {
    calendarText: [...header, ...body, ...footer].join('\n') + '\n',
    eventCount: activeSources.length
  };
}

function ensureDirectoryFor(filePath) {
  const dirPath = path.dirname(filePath);
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfChanged(filePath, nextValue) {
  const currentValue = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (currentValue === nextValue) {
    return false;
  }
  ensureDirectoryFor(filePath);
  fs.writeFileSync(filePath, nextValue, 'utf8');
  return true;
}

function main() {
  const args = parseArgs(process.argv);

  const watchlistPath = resolvePath(
    args.file,
    [
      'sources/tech-gaming-watchlist.yaml',
      'facilabo-calendars/sources/tech-gaming-watchlist.yaml'
    ],
    true
  );

  const canonicalPath = resolvePath(
    args.output,
    [
      'culture/tech-gaming.ics',
      'facilabo-calendars/culture/tech-gaming.ics'
    ],
    true
  );

  const mirrorPath = resolvePath(
    args.mirror,
    [
      'calendars/culture/tech-gaming.ics',
      '../calendars/culture/tech-gaming.ics'
    ],
    false
  );

  if (!fs.existsSync(watchlistPath)) {
    fail(`Watchlist not found: ${watchlistPath}`);
  }

  const config = loadConfig(watchlistPath);
  const { calendarText, eventCount } = buildCalendar(config);

  const canonicalCurrent = fs.existsSync(canonicalPath) ? fs.readFileSync(canonicalPath, 'utf8') : '';
  const canonicalChanged = canonicalCurrent !== calendarText;

  let mirrorChanged = false;
  if (mirrorPath) {
    const mirrorCurrent = fs.existsSync(mirrorPath) ? fs.readFileSync(mirrorPath, 'utf8') : '';
    mirrorChanged = mirrorCurrent !== calendarText;
  }

  if (args.dryRun) {
    console.log('[update-tech-gaming-calendar] DRY RUN');
    console.log(`- watchlist: ${watchlistPath}`);
    console.log(`- canonical: ${canonicalPath}`);
    console.log(`- mirror: ${mirrorPath || 'not found (skipped)'}`);
    console.log(`- events generated: ${eventCount}`);
    console.log(`- canonical changed: ${canonicalChanged}`);
    console.log(`- mirror changed: ${mirrorChanged}`);
    return;
  }

  const canonicalWritten = writeIfChanged(canonicalPath, calendarText);
  let mirrorWritten = false;

  if (mirrorPath) {
    mirrorWritten = writeIfChanged(mirrorPath, calendarText);
  }

  console.log('[update-tech-gaming-calendar] DONE');
  console.log(`- canonical: ${canonicalPath}`);
  console.log(`- mirror: ${mirrorPath || 'not found (skipped)'}`);
  console.log(`- events generated: ${eventCount}`);
  console.log(`- canonical updated: ${canonicalWritten}`);
  console.log(`- mirror updated: ${mirrorWritten}`);
}

main();
