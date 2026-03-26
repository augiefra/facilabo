#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: null,
    outputTop14: null,
    outputSixNations: null,
    mirrorTop14: null,
    mirrorSixNations: null
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
    if (token === '--output-top14' && argv[i + 1]) {
      args.outputTop14 = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--output-six-nations' && argv[i + 1]) {
      args.outputSixNations = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--mirror-top14' && argv[i + 1]) {
      args.mirrorTop14 = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--mirror-six-nations' && argv[i + 1]) {
      args.mirrorSixNations = argv[i + 1];
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
  if (existing) return existing;
  if (required) return path.resolve(candidates[0]);
  return null;
}

function fail(message) {
  console.error(`[update-rugby-competition-calendars] ERROR: ${message}`);
  process.exit(1);
}

function loadConfig(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON/YAML syntax in ${filePath}. ${error.message}`);
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function cleanText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
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

function dtstampForEvent(event) {
  return `${formatDateForIcs(event.startDate)}T000000Z`;
}

function toParisDateTimeParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    dateTime: `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`
  };
}

function normalizeIcsDateToken(value, key) {
  if (!value) return null;
  const token = value.trim();

  if (/^[0-9]{8}$/.test(token)) {
    return {
      timed: false,
      startDate: `${token.slice(0, 4)}-${token.slice(4, 6)}-${token.slice(6, 8)}`
    };
  }

  if (!/^[0-9]{8}T[0-9]{6}Z?$/.test(token)) {
    return null;
  }

  const year = token.slice(0, 4);
  const month = token.slice(4, 6);
  const day = token.slice(6, 8);
  const hour = token.slice(9, 11);
  const minute = token.slice(11, 13);
  const second = token.slice(13, 15);
  const isUtc = token.endsWith('Z');

  if (isUtc) {
    const utcDate = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ));
    const paris = toParisDateTimeParts(utcDate);
    return {
      timed: true,
      startDate: paris.date,
      startDateTime: paris.dateTime
    };
  }

  return {
    timed: !String(key || '').includes('VALUE=DATE'),
    startDate: `${year}-${month}-${day}`,
    startDateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}`
  };
}

function unfoldIcsLines(rawText) {
  const lines = rawText.split(/\r?\n/);
  const unfolded = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseIcsEvents(rawText) {
  const lines = unfoldIcsLines(rawText);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const separator = line.indexOf(':');
    if (separator <= 0) continue;

    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).trim();
    const normalizedKey = key.toUpperCase();

    if (normalizedKey.startsWith('UID')) current.uid = value;
    else if (normalizedKey.startsWith('SUMMARY')) current.summary = value;
    else if (normalizedKey.startsWith('DESCRIPTION')) current.description = value;
    else if (normalizedKey.startsWith('LOCATION')) current.location = value;
    else if (normalizedKey.startsWith('URL')) current.url = value;
    else if (normalizedKey.startsWith('DTSTART')) {
      current.dtStartKey = normalizedKey;
      current.dtStartValue = value;
    } else if (normalizedKey.startsWith('DTEND')) {
      current.dtEndKey = normalizedKey;
      current.dtEndValue = value;
    }
  }

  return events;
}

function parseIsoDate(dateString) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateString);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRollingWindow(dateString, pastDays, futureDays) {
  const parsed = parseIsoDate(dateString);
  if (!parsed) return false;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const min = new Date(today);
  const max = new Date(today);
  min.setUTCDate(min.getUTCDate() - Number(pastDays || 0));
  max.setUTCDate(max.getUTCDate() + Number(futureDays || 0));

  return parsed >= min && parsed <= max;
}

function addHoursToLocalDateTime(dateTimeString, hoursToAdd) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(dateTimeString);
  if (!match) return null;

  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || '0')
  ));
  if (Number.isNaN(date.getTime())) return null;

  date.setUTCHours(date.getUTCHours() + Number(hoursToAdd || 0));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

function fetchText(url, acceptHeader) {
  const args = ['-sSL'];
  if (acceptHeader) {
    args.push('-H', `Accept: ${acceptHeader}`);
  }
  args.push('-A', 'FacilAbo/1.0 (rugby-competition-crawler)');
  args.push(url);

  try {
    return execFileSync('curl', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    const stderr = cleanText(error.stderr || '');
    throw new Error(stderr || error.message || 'curl failed');
  }
}

function buildSixNationsDateTime(dateToken, timeToken) {
  const day = dateToken.slice(0, 2);
  const month = dateToken.slice(2, 4);
  const year = dateToken.slice(4, 8);
  const hour = timeToken.slice(0, 2);
  const minute = timeToken.slice(2, 4);
  const utcDate = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0
  ));
  return toParisDateTimeParts(utcDate).dateTime;
}

function humanizeTeamToken(token) {
  const map = {
    france: 'France',
    england: 'Angleterre',
    ireland: 'Irlande',
    scotland: 'Ecosse',
    wales: 'Pays de Galles',
    italy: 'Italie'
  };

  if (map[token]) return map[token];

  return String(token || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseSixNationsLinks(html) {
  const links = [];
  const seen = new Set();
  const regex = /\/fixtures\/([0-9]{6})\/([a-z0-9-]+)-([0-9]{8})-([0-9]{4})\//g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const seasonCode = match[1];
    const matchupSlug = match[2];
    const dateToken = match[3];
    const timeToken = match[4];
    const unique = `${seasonCode}|${matchupSlug}|${dateToken}|${timeToken}`;
    if (seen.has(unique)) continue;
    seen.add(unique);
    links.push({ seasonCode, matchupSlug, dateToken, timeToken });
  }

  return links;
}

function todayIsoDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildFixtureSeasonCandidates(sourceUrl, futureDays) {
  const candidates = [sourceUrl];

  try {
    const parsed = new URL(sourceUrl);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const match = normalizedPath.match(/^(.*\/fixtures)(?:\/[0-9]{6})?$/);
    if (!match) {
      return candidates;
    }

    const currentYear = new Date().getUTCFullYear();
    const additionalYears = Math.max(2, Math.ceil(Number(futureDays || 0) / 365) + 1);
    const seen = new Set(candidates);

    for (let offset = -1; offset <= additionalYears; offset += 1) {
      const seasonCode = `${currentYear + offset}00`;
      const candidate = `${parsed.protocol}//${parsed.host}${match[1]}/${seasonCode}`;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      candidates.push(candidate);
    }
  } catch {
    return candidates;
  }

  return candidates;
}

function defaultCategoriesFor(source) {
  if (Array.isArray(source.categories) && source.categories.length > 0) {
    return source.categories;
  }
  return ['Sport', 'Rugby', 'Competition'];
}

function normalizeEvent(source, input, pastDays, futureDays) {
  const summary = cleanText(input.summary);
  if (!summary) return null;

  const timed = Boolean(input.timed);
  let startDate = cleanText(input.startDate);
  let startDateTime = cleanText(input.startDateTime);

  if (!startDate && startDateTime) {
    startDate = startDateTime.slice(0, 10);
  }

  if (!startDate || !inRollingWindow(startDate, pastDays, futureDays)) {
    return null;
  }

  let endDate = cleanText(input.endDate);
  let endDateTime = cleanText(input.endDateTime);

  if (timed && !endDateTime) {
    const computedEnd = addHoursToLocalDateTime(startDateTime || `${startDate}T00:00:00`, 2);
    if (computedEnd) {
      endDateTime = computedEnd;
      endDate = computedEnd.slice(0, 10);
    }
  }

  if (!timed) {
    if (!endDate) endDate = addOneDay(startDate);
    if (!endDateTime) endDateTime = `${endDate}T00:00:00`;
  } else if (!endDate) {
    endDate = (endDateTime || '').slice(0, 10) || startDate;
  }

  return {
    sport: source.sport,
    summary,
    timed,
    startDate,
    endDate,
    startDateTime: timed ? (startDateTime || `${startDate}T00:00:00`) : `${startDate}T00:00:00`,
    endDateTime: timed ? (endDateTime || `${startDate}T02:00:00`) : `${endDate}T00:00:00`,
    location: cleanText(input.location) || null,
    competition: cleanText(input.competition || source.default_competition || '') || null,
    sourceUrl: cleanText(input.sourceUrl || source.source_url),
    status: cleanText(input.status || 'CONFIRMED') || 'CONFIRMED',
    categories: defaultCategoriesFor(source),
    uidKey: cleanText(input.uidKey) || null,
    externalMatchId: cleanText(input.externalMatchId) || null,
    provenance: cleanText(input.provenance) || `crawl:${source.slug}`
  };
}

function normalizeIcsEvent(source, rawEvent, pastDays, futureDays) {
  const startToken = normalizeIcsDateToken(rawEvent.dtStartValue, rawEvent.dtStartKey);
  if (!startToken || !startToken.startDate) return null;

  let endToken = null;
  if (rawEvent.dtEndValue) {
    endToken = normalizeIcsDateToken(rawEvent.dtEndValue, rawEvent.dtEndKey);
  }

  return normalizeEvent(
    source,
    {
      summary: source.summary_replace && rawEvent.summary
        ? String(rawEvent.summary).replaceAll(source.summary_replace.from || '', source.summary_replace.to || '')
        : rawEvent.summary,
      timed: Boolean(startToken.timed),
      startDate: startToken.startDate,
      startDateTime: startToken.startDateTime,
      endDate: endToken?.startDate || null,
      endDateTime: endToken?.startDateTime || null,
      location: rawEvent.location,
      sourceUrl: rawEvent.url || source.source_url,
      uidKey: rawEvent.uid || null,
      provenance: `crawl:${source.slug}`
    },
    pastDays,
    futureDays
  );
}

function normalizeFallbackEvent(source, fallbackEvent, pastDays, futureDays) {
  const timed = fallbackEvent.timed === true;
  const startDate = timed
    ? String(fallbackEvent.start_datetime || '').slice(0, 10)
    : String(fallbackEvent.start_date || '');

  if (!startDate || !inRollingWindow(startDate, pastDays, futureDays)) {
    return null;
  }

  return normalizeEvent(
    source,
    {
      summary: fallbackEvent.summary,
      timed,
      startDate,
      startDateTime: timed ? String(fallbackEvent.start_datetime) : `${startDate}T00:00:00`,
      endDate: timed ? String(fallbackEvent.end_datetime || '').slice(0, 10) : String(fallbackEvent.end_date || addOneDay(startDate)),
      endDateTime: timed ? String(fallbackEvent.end_datetime) : `${String(fallbackEvent.end_date || addOneDay(startDate))}T00:00:00`,
      location: fallbackEvent.location,
      competition: fallbackEvent.competition,
      sourceUrl: fallbackEvent.source_url || source.source_url,
      status: fallbackEvent.status || 'CONFIRMED',
      uidKey: fallbackEvent.uid_key,
      provenance: `fallback:${source.slug}`
    },
    pastDays,
    futureDays
  );
}

async function collectSixNationsEvents(source, pastDays, futureDays) {
  const events = [];
  const seen = new Set();
  const candidates = buildFixtureSeasonCandidates(source.source_url, futureDays);
  const today = todayIsoDate();

  for (const candidateUrl of candidates) {
    try {
      const html = await fetchText(candidateUrl, 'text/html, application/xhtml+xml, */*');
      const links = parseSixNationsLinks(html);
      if (links.length === 0) continue;

      const pageUrl = new URL(candidateUrl);
      let addedCount = 0;
      let futureCount = 0;

      for (const link of links) {
        const separator = link.matchupSlug.indexOf('-v-');
        if (separator <= 0) continue;

        const homeToken = link.matchupSlug.slice(0, separator);
        const awayToken = link.matchupSlug.slice(separator + 3);
        const summary = `${humanizeTeamToken(homeToken)} - ${humanizeTeamToken(awayToken)}`;
        const startDateTime = buildSixNationsDateTime(link.dateToken, link.timeToken);
        const sourceUrl = `${pageUrl.protocol}//${pageUrl.host}/en/m6n/fixtures/${link.seasonCode}/${link.matchupSlug}-${link.dateToken}-${link.timeToken}`;

        const normalized = normalizeEvent(
          source,
          {
            summary,
            timed: true,
            startDateTime,
            competition: source.default_competition || 'Six Nations',
            sourceUrl,
            status: 'CONFIRMED',
            uidKey: `${source.slug}-${link.seasonCode}-${homeToken}-v-${awayToken}`,
            externalMatchId: `${link.seasonCode}-${homeToken}-v-${awayToken}`,
            provenance: `crawl:${source.slug}`
          },
          pastDays,
          futureDays
        );

        if (!normalized) continue;

        const key = buildUidKey(normalized);
        if (seen.has(key)) continue;
        seen.add(key);
        events.push(normalized);
        addedCount += 1;

        if (normalized.startDate >= today) {
          futureCount += 1;
        }
      }

      if (addedCount > 0 && candidateUrl !== source.source_url) {
        console.log(
          `[update-rugby-competition-calendars] INFO: merged ${addedCount} Six Nations fixture(s) from ${candidateUrl} (${futureCount} future)`
        );
      }
    } catch (error) {
      console.warn(`[update-rugby-competition-calendars] WARN: unable to crawl ${candidateUrl}: ${error.message}`);
    }
  }

  return events;
}

async function fetchSourceEvents(source, pastDays, futureDays) {
  if (!source.crawl_enabled) {
    return [];
  }

  try {
    if (source.parser === 'ics') {
      const body = await fetchText(source.source_url, 'text/calendar, text/plain, */*');
      const rawEvents = parseIcsEvents(body);
      return rawEvents
        .map((rawEvent) => normalizeIcsEvent(source, rawEvent, pastDays, futureDays))
        .filter(Boolean);
    }

    if (source.parser === 'sixnations_fixture_links') {
      return collectSixNationsEvents(source, pastDays, futureDays);
    }

    console.warn(`[update-rugby-competition-calendars] WARN: parser ${source.parser} is not supported for ${source.slug}`);
    return [];
  } catch (error) {
    console.warn(`[update-rugby-competition-calendars] WARN: unable to crawl ${source.slug}: ${error.message}`);
    return [];
  }
}

function buildUidKey(event) {
  if (event.uidKey) return slugify(event.uidKey);
  if (event.externalMatchId) return slugify(`${event.sport}-${event.externalMatchId}`);
  return slugify(`${event.sport}-${event.summary}`);
}

function buildVevent(event, calendarSlug) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${calendarSlug}-${buildUidKey(event)}@facilabo.app`,
    `DTSTAMP:${dtstampForEvent(event)}`
  ];

  if (event.timed) {
    lines.push(`DTSTART;TZID=Europe/Paris:${formatDateTimeForIcs(event.startDateTime)}`);
    lines.push(`DTEND;TZID=Europe/Paris:${formatDateTimeForIcs(event.endDateTime)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDateForIcs(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateForIcs(event.endDate)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);

  const descriptionLines = [
    event.competition ? `Competition: ${event.competition}` : null,
    event.externalMatchId ? `External Match ID: ${event.externalMatchId}` : null,
    `Source: ${event.sourceUrl}`,
    `Provenance: ${event.provenance}`
  ].filter(Boolean);

  lines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join(' | '))}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push(`URL:${event.sourceUrl}`);
  lines.push(`CATEGORIES:${event.categories.map((category) => escapeIcsText(category)).join(',')}`);
  lines.push(`STATUS:${event.status || 'CONFIRMED'}`);
  lines.push('END:VEVENT');

  return lines.join('\n');
}

function buildCalendarText({ title, description, prodId, calendarSlug, events }) {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${title}`,
    `X-WR-CALDESC:${description}`,
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

  const sortedEvents = events.slice().sort((a, b) => {
    const left = a.timed ? a.startDateTime : `${a.startDate}T00:00:00`;
    const right = b.timed ? b.startDateTime : `${b.startDate}T00:00:00`;
    const byDate = left.localeCompare(right);
    if (byDate !== 0) return byDate;
    return buildUidKey(a).localeCompare(buildUidKey(b));
  });

  const seen = new Set();
  const body = [];
  for (const event of sortedEvents) {
    const dedupeKey = `${buildUidKey(event)}|${event.startDate}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    body.push(buildVevent(event, calendarSlug));
  }

  return {
    text: [...header, ...body, 'END:VCALENDAR'].join('\n') + '\n',
    eventCount: body.length
  };
}

function ensureDirectoryFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath, nextValue) {
  const currentValue = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (currentValue === nextValue) return false;
  ensureDirectoryFor(filePath);
  fs.writeFileSync(filePath, nextValue, 'utf8');
  return true;
}

async function collectSourceEvents(source, pastDays, futureDays) {
  const crawled = await fetchSourceEvents(source, pastDays, futureDays);
  const events = [...crawled];
  const seen = new Set(events.map((event) => buildUidKey(event)));

  if (Array.isArray(source.fallback_events)) {
    for (const fallbackEvent of source.fallback_events) {
      const normalized = normalizeFallbackEvent(source, fallbackEvent, pastDays, futureDays);
      if (!normalized) continue;
      const key = buildUidKey(normalized);
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(normalized);
    }
  }

  return events;
}

function logExpectedOverlaps(top14Events, sixNationsEvents) {
  const top14Samples = top14Events
    .slice(0, 3)
    .map((event) => `${event.summary} (${event.startDate})`);
  if (top14Samples.length > 0) {
    console.log(
      `[update-rugby-competition-calendars] INFO: expected overlaps Top 14 vs club feeds -> ${top14Samples.join(' | ')}`
    );
  }

  const franceSample = sixNationsEvents.find((event) => event.summary.includes('France'));
  if (franceSample) {
    console.log(
      `[update-rugby-competition-calendars] INFO: expected overlap Six Nations vs Equipe de France -> ${franceSample.summary} (${franceSample.startDate})`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const watchlistPath = resolvePath(
    args.file,
    [
      'sources/rugby-competitions-watchlist.yaml',
      'facilabo-calendars/sources/rugby-competitions-watchlist.yaml'
    ],
    true
  );

  const top14Path = resolvePath(
    args.outputTop14,
    [
      'sport/rugby-top-14-complet.ics',
      'facilabo-calendars/sport/rugby-top-14-complet.ics'
    ],
    true
  );

  const sixNationsPath = resolvePath(
    args.outputSixNations,
    [
      'sport/rugby-six-nations-complet.ics',
      'facilabo-calendars/sport/rugby-six-nations-complet.ics'
    ],
    true
  );

  const mirrorTop14Path = resolvePath(
    args.mirrorTop14,
    [
      'calendars/sport/rugby-top-14-complet.ics',
      '../calendars/sport/rugby-top-14-complet.ics'
    ],
    false
  );

  const mirrorSixNationsPath = resolvePath(
    args.mirrorSixNations,
    [
      'calendars/sport/rugby-six-nations-complet.ics',
      '../calendars/sport/rugby-six-nations-complet.ics'
    ],
    false
  );

  const config = loadConfig(watchlistPath);
  if (!Array.isArray(config.sources) || config.sources.length < 2) {
    fail('Expected at least 2 rugby competition sources');
  }

  const top14Source = config.sources.find((source) => source.slug === 'rugby-top-14-complet-source');
  const sixNationsSource = config.sources.find((source) => source.slug === 'rugby-six-nations-complet-source');
  if (!top14Source || !sixNationsSource) {
    fail('Missing top14 or six nations source in watchlist');
  }

  const pastDays = Number(config.window_days_past || 30);
  const futureDays = Number(config.window_days_future || 730);

  const top14Events = await collectSourceEvents(top14Source, pastDays, futureDays);
  const sixNationsEvents = await collectSourceEvents(sixNationsSource, pastDays, futureDays);

  if (top14Events.length === 0) {
    fail('No Top 14 events produced. Check upstream source availability.');
  }
  if (sixNationsEvents.length === 0) {
    fail('No Six Nations events produced. Check source and fallback schedule.');
  }

  logExpectedOverlaps(top14Events, sixNationsEvents);

  const top14Calendar = buildCalendarText({
    title: 'Rugby - Top 14 complet',
    description: 'Tous les matchs du Top 14 dans un seul calendrier (fenetre glissante 24 mois)',
    prodId: '-//FacilAbo//Rugby Top 14 Complet//FR',
    calendarSlug: 'sport-rugby-top-14-complet',
    events: top14Events
  });

  const sixNationsCalendar = buildCalendarText({
    title: 'Rugby - Six Nations complet',
    description: 'Tous les matchs du Tournoi des Six Nations dans un seul calendrier (fenetre glissante 24 mois)',
    prodId: '-//FacilAbo//Rugby Six Nations Complet//FR',
    calendarSlug: 'sport-rugby-six-nations-complet',
    events: sixNationsEvents
  });

  const writes = [];

  if (args.dryRun) {
    writes.push({ target: top14Path, changed: true });
    writes.push({ target: sixNationsPath, changed: true });
    if (mirrorTop14Path) writes.push({ target: mirrorTop14Path, changed: true });
    if (mirrorSixNationsPath) writes.push({ target: mirrorSixNationsPath, changed: true });
  } else {
    writes.push({ target: top14Path, changed: writeIfChanged(top14Path, top14Calendar.text) });
    writes.push({ target: sixNationsPath, changed: writeIfChanged(sixNationsPath, sixNationsCalendar.text) });
    if (mirrorTop14Path) writes.push({ target: mirrorTop14Path, changed: writeIfChanged(mirrorTop14Path, top14Calendar.text) });
    if (mirrorSixNationsPath) writes.push({ target: mirrorSixNationsPath, changed: writeIfChanged(mirrorSixNationsPath, sixNationsCalendar.text) });
  }

  console.log('[update-rugby-competition-calendars] OK');
  console.log(`- config: ${watchlistPath}`);
  console.log(`- top14 events: ${top14Calendar.eventCount}`);
  console.log(`- six nations events: ${sixNationsCalendar.eventCount}`);
  for (const write of writes) {
    console.log(`- ${write.changed ? 'updated' : 'unchanged'}: ${write.target}`);
  }
}

main().catch((error) => fail(error.message));
