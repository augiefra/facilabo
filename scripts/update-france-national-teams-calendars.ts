#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: null,
    outputFoot: null,
    outputRugby: null,
    mirrorFoot: null,
    mirrorRugby: null
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

    if (token === '--output-foot' && argv[i + 1]) {
      args.outputFoot = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--output-rugby' && argv[i + 1]) {
      args.outputRugby = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--mirror-foot' && argv[i + 1]) {
      args.mirrorFoot = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--mirror-rugby' && argv[i + 1]) {
      args.mirrorRugby = argv[i + 1];
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
  console.error(`[update-france-national-teams-calendars] ERROR: ${message}`);
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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
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

function parseIsoDate(dateString) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateString);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoDateTime(dateTimeString) {
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
  return Number.isNaN(date.getTime()) ? null : date;
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
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(date.getUTCHours() + Number(hoursToAdd || 0));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
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

function toParisFromIsoDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return toParisDateTimeParts(date);
}

function inRollingWindow(dateString, pastDays, futureDays) {
  const parsed = parseIsoDate(dateString);
  if (!parsed) return false;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const min = new Date(today);
  min.setUTCDate(min.getUTCDate() - pastDays);

  const max = new Date(today);
  max.setUTCDate(max.getUTCDate() + futureDays);

  return parsed >= min && parsed <= max;
}

function normalizeIcsDateToken(value, key) {
  if (!value) return null;
  const token = value.trim();

  if (/^[0-9]{8}$/.test(token)) {
    const year = token.slice(0, 4);
    const month = token.slice(4, 6);
    const day = token.slice(6, 8);
    return {
      timed: false,
      startDate: `${year}-${month}-${day}`
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
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator <= 0) continue;

    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).trim();

    const normalizedKey = key.toUpperCase();
    if (normalizedKey.startsWith('UID')) {
      current.uid = value;
      continue;
    }

    if (normalizedKey.startsWith('SUMMARY')) {
      current.summary = value;
      continue;
    }

    if (normalizedKey.startsWith('DESCRIPTION')) {
      current.description = value;
      continue;
    }

    if (normalizedKey.startsWith('LOCATION')) {
      current.location = value;
      continue;
    }

    if (normalizedKey.startsWith('URL')) {
      current.url = value;
      continue;
    }

    if (normalizedKey.startsWith('DTSTART')) {
      current.dtStartKey = normalizedKey;
      current.dtStartValue = value;
      continue;
    }

    if (normalizedKey.startsWith('DTEND')) {
      current.dtEndKey = normalizedKey;
      current.dtEndValue = value;
      continue;
    }
  }

  return events;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function eventMatchesKeywords(source, summary, competition) {
  const includeKeywords = Array.isArray(source.include_keywords) ? source.include_keywords : [];
  const excludeKeywords = Array.isArray(source.exclude_keywords) ? source.exclude_keywords : [];
  const haystack = `${summary || ''} ${competition || ''}`.toLowerCase();

  if (includeKeywords.length > 0) {
    const matched = includeKeywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
    if (!matched) return false;
  }

  if (excludeKeywords.length > 0) {
    const blocked = excludeKeywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
    if (blocked) return false;
  }

  return true;
}

function defaultCategoriesFor(source) {
  if (Array.isArray(source.categories) && source.categories.length > 0) {
    return source.categories;
  }
  return ['Sport', source.sport === 'football' ? 'Football' : 'Rugby', 'Equipe de France'];
}

function normalizeEvent(source, input, pastDays, futureDays) {
  const summary = cleanText(input.summary);
  if (!summary) return null;

  const competition = cleanText(input.competition || '');
  if (!eventMatchesKeywords(source, summary, competition)) {
    return null;
  }

  const timed = Boolean(input.timed);
  let startDate = cleanText(input.startDate);
  let startDateTime = cleanText(input.startDateTime);

  if (timed && !startDateTime && input.startDateIso) {
    const paris = toParisFromIsoDateTime(input.startDateIso);
    if (!paris) return null;
    startDate = paris.date;
    startDateTime = paris.dateTime;
  }

  if (!timed && !startDate && input.startDateIso) {
    const paris = toParisFromIsoDateTime(input.startDateIso);
    if (!paris) return null;
    startDate = paris.date;
  }

  if (!startDate && startDateTime) {
    startDate = startDateTime.slice(0, 10);
  }

  if (!startDate) return null;
  if (!inRollingWindow(startDate, pastDays, futureDays)) return null;

  let endDate = cleanText(input.endDate);
  let endDateTime = cleanText(input.endDateTime);

  if (timed && !endDateTime && input.endDateIso) {
    const paris = toParisFromIsoDateTime(input.endDateIso);
    if (paris) {
      endDate = paris.date;
      endDateTime = paris.dateTime;
    }
  }

  if (timed && !endDateTime) {
    const computedEnd = addHoursToLocalDateTime(startDateTime || `${startDate}T00:00:00`, 2);
    if (computedEnd) {
      endDateTime = computedEnd;
      endDate = computedEnd.slice(0, 10);
    }
  }

  if (!timed) {
    if (!endDate) {
      endDate = addOneDay(startDate);
    }
    if (!endDateTime) {
      endDateTime = `${endDate}T00:00:00`;
    }
  } else {
    if (!endDate) {
      endDate = (endDateTime || '').slice(0, 10) || startDate;
    }
  }

  const normalized = {
    sport: source.sport,
    summary,
    timed,
    startDate,
    endDate,
    startDateTime: timed ? (startDateTime || `${startDate}T00:00:00`) : `${startDate}T00:00:00`,
    endDateTime: timed ? (endDateTime || `${startDate}T02:00:00`) : `${endDate}T00:00:00`,
    location: cleanText(input.location) || null,
    competition: competition || null,
    sourceUrl: cleanText(input.sourceUrl || source.source_url),
    status: cleanText(input.status || 'CONFIRMED') || 'CONFIRMED',
    categories: defaultCategoriesFor(source),
    uidKey: cleanText(input.uidKey) || null,
    externalMatchId: cleanText(input.externalMatchId) || null,
    provenance: cleanText(input.provenance) || `crawl:${source.slug}`
  };

  return normalized;
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
      summary: rawEvent.summary,
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

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const rawBlock = match[1].trim();
    if (!rawBlock) continue;
    try {
      const parsed = JSON.parse(rawBlock.replace(/\\u002B/g, '+'));
      blocks.push(parsed);
    } catch {
      // ignore malformed blocks
    }
  }

  return blocks;
}

function decodeHtmlEntities(value) {
  const named = {
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&#39;': "'",
    '&lt;': '<',
    '&gt;': '>'
  };

  return String(value || '')
    .replace(/&(quot|amp|apos|lt|gt);|&#39;/g, (token) => named[token] || token)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? '' : String.fromCodePoint(codePoint);
    })
    .replace(/&#([0-9]+);/g, (_, raw) => {
      const codePoint = Number.parseInt(raw, 10);
      return Number.isNaN(codePoint) ? '' : String.fromCodePoint(codePoint);
    });
}

function flattenJsonLdEntries(value, destination) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      flattenJsonLdEntries(item, destination);
    }
    return;
  }
  if (typeof value === 'object') {
    destination.push(value);
    if (value['@graph']) {
      flattenJsonLdEntries(value['@graph'], destination);
    }
  }
}

function normalizeAbsoluteUrl(url, fallbackBase) {
  const clean = cleanText(url);
  if (!clean) return fallbackBase;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('//')) return `https:${clean}`;
  if (clean.startsWith('/')) {
    try {
      const parsed = new URL(fallbackBase);
      return `${parsed.protocol}//${parsed.host}${clean}`;
    } catch {
      return fallbackBase;
    }
  }
  return clean;
}

function extractTeamName(team) {
  if (!team) return '';
  if (typeof team === 'string') return cleanText(team);
  if (typeof team === 'object') {
    if (typeof team.name === 'string') return cleanText(team.name);
    if (typeof team.alternateName === 'string') return cleanText(team.alternateName);
  }
  return '';
}

function extractMatchIdFromUefaEvent(event) {
  const candidates = [
    cleanText(event.url || ''),
    cleanText(event['@id'] || '')
  ].filter(Boolean);

  for (const value of candidates) {
    const direct = /match\/(\d+)/.exec(value);
    if (direct) return direct[1];
    const hash = /#(\d+)$/.exec(value);
    if (hash) return hash[1];
  }

  return '';
}

function competitionLabelForUefaSource(sourceUrl) {
  const lower = String(sourceUrl || '').toLowerCase();
  if (lower.includes('uefanationsleague')) return 'UEFA Nations League';
  if (lower.includes('european-qualifiers')) return 'European Qualifiers';
  return 'International Football';
}

function splitUefaMatchName(value) {
  const clean = cleanText(value);
  if (!clean) return null;
  const parts = clean.split(/\s+vs\s+/i);
  if (parts.length !== 2) return null;
  return [cleanText(parts[0]), cleanText(parts[1])];
}

function humanizeTeamSlug(token) {
  return String(token || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapUefaMatchStatus(status) {
  const lower = String(status || '').toLowerCase();
  if (lower.includes('cancel')) return 'CANCELLED';
  if (lower.includes('postpon') || lower.includes('suspend') || lower.includes('tbc')) return 'TENTATIVE';
  return 'CONFIRMED';
}

function parseUefaMatchCards(source, html, pastDays, futureDays) {
  const kickoffByMatchId = new Map();
  const optionsRegex = /data-plugin="pk-match-unit"\s+data-options="([\s\S]*?)"/g;
  let optionsMatch;

  while ((optionsMatch = optionsRegex.exec(html)) !== null) {
    const decoded = decodeHtmlEntities(optionsMatch[1]);
    try {
      const parsed = JSON.parse(decoded);
      const matchData = parsed?.match;
      const matchId = cleanText(matchData?.id);
      if (!matchId) continue;
      kickoffByMatchId.set(matchId, {
        kickoffIso: cleanText(matchData?.kickOffTime?.dateTime || ''),
        status: cleanText(matchData?.status || '')
      });
    } catch {
      // ignore malformed option payloads
    }
  }

  const events = [];
  const seenMatchIds = new Set();
  const linkRegex = /<a[^>]+href="([^"]*\/match\/(\d+)--[^"]+)"[^>]*>/g;
  let linkMatch;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const fullTag = linkMatch[0];
    if (!fullTag.includes('match-row_link')) continue;

    const href = cleanText(linkMatch[1]);
    const matchId = cleanText(linkMatch[2]);
    if (!href || !matchId || seenMatchIds.has(matchId)) continue;

    const timing = kickoffByMatchId.get(matchId);
    if (!timing || !timing.kickoffIso) continue;

    let homeName = '';
    let awayName = '';

    const trackingMatch = /data-tracking="([^"]+)"/.exec(fullTag);
    if (trackingMatch) {
      try {
        const decodedTracking = decodeHtmlEntities(trackingMatch[1]);
        const tracking = JSON.parse(decodedTracking);
        const split = splitUefaMatchName(tracking?.name);
        if (split) {
          homeName = localizeFootballTeam(split[0]);
          awayName = localizeFootballTeam(split[1]);
        }
      } catch {
        // fallback to slug parsing below
      }
    }

    if (!homeName || !awayName) {
      const slugMatch = /\/match\/\d+--([a-z0-9-]+)-vs-([a-z0-9-]+)\//i.exec(href);
      if (!slugMatch) continue;
      homeName = localizeFootballTeam(humanizeTeamSlug(slugMatch[1]));
      awayName = localizeFootballTeam(humanizeTeamSlug(slugMatch[2]));
    }

    const summary = cleanText(`${homeName} - ${awayName}`);
    if (!summary) continue;

    const normalized = normalizeEvent(
      source,
      {
        summary,
        timed: true,
        startDateIso: timing.kickoffIso,
        competition: competitionLabelForUefaSource(source.source_url),
        sourceUrl: normalizeAbsoluteUrl(href, source.source_url),
        status: mapUefaMatchStatus(timing.status),
        uidKey: `${source.slug}-${matchId}`,
        externalMatchId: matchId,
        provenance: `crawl:${source.slug}`
      },
      pastDays,
      futureDays
    );

    if (normalized) {
      events.push(normalized);
      seenMatchIds.add(matchId);
    }
  }

  return events;
}

function normalizeTeamToken(token) {
  return slugify(String(token || '').replace(/-/g, ' '));
}

function localizeFootballTeam(name) {
  const normalized = normalizeTeamToken(name);
  const map = {
    france: 'France',
    italy: 'Italie',
    belgium: 'Belgique',
    turkiye: 'Turquie',
    turkey: 'Turquie',
    ukraine: 'Ukraine',
    iceland: 'Islande',
    azerbaijan: 'Azerbaidjan'
  };
  return map[normalized] || cleanText(name);
}

function humanizeTeamToken(token) {
  const map = {
    france: 'France',
    england: 'Angleterre',
    ireland: 'Irlande',
    scotland: 'Ecosse',
    wales: 'Pays de Galles',
    italy: 'Italie',
    'south-africa': 'Afrique du Sud',
    'new-zealand': 'Nouvelle-Zelande',
    argentina: 'Argentine',
    australia: 'Australie',
    japan: 'Japon',
    usa: 'USA',
    fiji: 'Fidji'
  };

  if (map[token]) {
    return map[token];
  }

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

function normalizeSummaryForConflict(summary) {
  return String(summary || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function conflictKey(event) {
  const competition = String(event.competition || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${event.sport}|${normalizeSummaryForConflict(event.summary)}|${competition}`;
}

function normalizeFallbackEvent(source, fallbackEvent, pastDays, futureDays) {
  const timed = fallbackEvent.timed === true;
  const startDate = timed
    ? String(fallbackEvent.start_datetime || '').slice(0, 10)
    : String(fallbackEvent.start_date || '');

  if (!startDate || !inRollingWindow(startDate, pastDays, futureDays)) {
    return null;
  }

  const startDateTime = timed
    ? String(fallbackEvent.start_datetime)
    : `${startDate}T00:00:00`;

  const endDate = timed
    ? String(fallbackEvent.end_datetime || '').slice(0, 10)
    : String(fallbackEvent.end_date || addOneDay(startDate));

  const endDateTime = timed
    ? String(fallbackEvent.end_datetime)
    : `${endDate}T00:00:00`;

  return {
    sport: source.sport,
    summary: cleanText(fallbackEvent.summary),
    timed,
    startDate,
    endDate,
    startDateTime,
    endDateTime,
    location: cleanText(fallbackEvent.location) || null,
    competition: cleanText(fallbackEvent.competition) || null,
    sourceUrl: cleanText(fallbackEvent.source_url || source.source_url),
    status: cleanText(fallbackEvent.status || 'TENTATIVE') || 'TENTATIVE',
    categories: defaultCategoriesFor(source),
    uidKey: cleanText(fallbackEvent.uid_key),
    externalMatchId: null,
    provenance: `fallback:${source.slug}`
  };
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
      const competitionSegment = source.source_url.includes('autumn-nations-series') ? 'autumn-nations-series' : 'm6n';
      const competitionLabel = competitionSegment === 'autumn-nations-series' ? 'Autumn Nations Series' : 'Six Nations';
      let addedCount = 0;
      let futureCount = 0;

      for (const link of links) {
        const separator = link.matchupSlug.indexOf('-v-');
        if (separator <= 0) continue;

        const homeToken = link.matchupSlug.slice(0, separator);
        const awayToken = link.matchupSlug.slice(separator + 3);
        const summary = `${humanizeTeamToken(homeToken)} - ${humanizeTeamToken(awayToken)}`;
        const startDateTime = buildSixNationsDateTime(link.dateToken, link.timeToken);
        const sourceUrl = `${pageUrl.protocol}//${pageUrl.host}/en/${competitionSegment}/fixtures/${link.seasonCode}/${link.matchupSlug}-${link.dateToken}-${link.timeToken}`;

        const normalized = normalizeEvent(
          source,
          {
            summary,
            timed: true,
            startDateTime,
            competition: competitionLabel,
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
          `[update-france-national-teams-calendars] INFO: merged ${addedCount} fixture(s) from ${candidateUrl} (${futureCount} future)`
        );
      }
    } catch (error) {
      console.warn(`[update-france-national-teams-calendars] WARN: unable to crawl ${candidateUrl}: ${error.message}`);
    }
  }

  return events;
}

function buildUidKey(event) {
  if (event.uidKey && event.uidKey.length > 0) {
    return slugify(event.uidKey);
  }

  if (event.externalMatchId) {
    return slugify(`${event.sport}-${event.externalMatchId}`);
  }

  return slugify(`${event.sport}-${event.summary}`);
}

async function fetchText(url, acceptHeader) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FacilAbo/1.0 (france-national-teams-crawler)',
      'Accept': acceptHeader
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchSourceEvents(source, pastDays, futureDays) {
  if (!source.crawl_enabled || source.parser === 'watch') {
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

    if (source.parser === 'uefa_jsonld') {
      const html = await fetchText(source.source_url, 'text/html, application/xhtml+xml, */*');
      const parsedBlocks = extractJsonLdBlocks(html);
      const flattened = [];
      for (const block of parsedBlocks) {
        flattenJsonLdEntries(block, flattened);
      }

      const events = [];
      for (const item of flattened) {
        const typeValue = item['@type'];
        const types = Array.isArray(typeValue) ? typeValue : [typeValue];
        if (!types.includes('SportsEvent')) continue;

        const homeName = localizeFootballTeam(extractTeamName(item.homeTeam));
        const awayName = localizeFootballTeam(extractTeamName(item.awayTeam));
        const summary = cleanText(`${homeName} - ${awayName}`);
        if (!homeName || !awayName) continue;

        const competition = cleanText(item?.superEvent?.name || item?.description || '');
        const matchId = extractMatchIdFromUefaEvent(item);

        const normalized = normalizeEvent(
          source,
          {
            summary,
            timed: true,
            startDateIso: item.startDate,
            endDateIso: item.endDate,
            location: cleanText(item?.location?.name || ''),
            competition,
            sourceUrl: normalizeAbsoluteUrl(item.url || item['@id'] || source.source_url, source.source_url),
            status: 'CONFIRMED',
            uidKey: matchId ? `${source.slug}-${matchId}` : `${source.slug}-${normalizeTeamToken(homeName)}-v-${normalizeTeamToken(awayName)}`,
            externalMatchId: matchId || null,
            provenance: `crawl:${source.slug}`
          },
          pastDays,
          futureDays
        );

        if (normalized) {
          events.push(normalized);
        }
      }

      const cardEvents = parseUefaMatchCards(source, html, pastDays, futureDays);
      const merged = [];
      const seenKeys = new Set();

      for (const event of [...events, ...cardEvents]) {
        const key = event.externalMatchId || event.uidKey || `${event.summary}|${event.startDate}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        merged.push(event);
      }

      return merged;
    }

    if (source.parser === 'sixnations_fixture_links') {
      return collectSixNationsEvents(source, pastDays, futureDays);
    }

    console.warn(`[update-france-national-teams-calendars] WARN: parser ${source.parser} is not supported for ${source.slug}`);
    return [];
  } catch (error) {
    console.warn(`[update-france-national-teams-calendars] WARN: unable to crawl ${source.slug}: ${error.message}`);
    return [];
  }
}

function buildVevent(event, calendarSlug) {
  const uidSuffix = buildUidKey(event);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${calendarSlug}-${uidSuffix}@facilabo.app`,
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
    const dedupeKey = `${buildUidKey(event)}|${event.sport}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    body.push(buildVevent(event, calendarSlug));
  }

  const footer = ['END:VCALENDAR'];
  return {
    text: [...header, ...body, ...footer].join('\n') + '\n',
    eventCount: body.length
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

async function main() {
  const args = parseArgs(process.argv);

  const watchlistPath = resolvePath(
    args.file,
    [
      'sources/france-national-teams-watchlist.yaml',
      'facilabo-calendars/sources/france-national-teams-watchlist.yaml'
    ],
    true
  );

  const canonicalFootPath = resolvePath(
    args.outputFoot,
    [
      'sport/france-foot-equipe-nationale.ics',
      'facilabo-calendars/sport/france-foot-equipe-nationale.ics'
    ],
    true
  );

  const canonicalRugbyPath = resolvePath(
    args.outputRugby,
    [
      'sport/france-rugby-equipe-nationale.ics',
      'facilabo-calendars/sport/france-rugby-equipe-nationale.ics'
    ],
    true
  );

  const mirrorFootPath = resolvePath(
    args.mirrorFoot,
    [
      'calendars/sport/france-foot-equipe-nationale.ics',
      '../calendars/sport/france-foot-equipe-nationale.ics'
    ],
    false
  );

  const mirrorRugbyPath = resolvePath(
    args.mirrorRugby,
    [
      'calendars/sport/france-rugby-equipe-nationale.ics',
      '../calendars/sport/france-rugby-equipe-nationale.ics'
    ],
    false
  );

  const config = loadConfig(watchlistPath);
  if (!Array.isArray(config.sources)) {
    fail('sources must be an array');
  }

  const pastDays = Number(config.window_days_past || 30);
  const futureDays = Number(config.window_days_future || 730);

  const footballSources = config.sources.filter((source) => source.sport === 'football' && source.enabled === true);
  const rugbySources = config.sources.filter((source) => source.sport === 'rugby' && source.enabled === true);

  const allPublishingSources = config.sources.filter((source) => source.enabled === true && source.watch_only !== true);
  const crawledBySlug = {};
  const fallbackBySlug = {};

  const crawledEventsBySlug = {};
  for (const source of allPublishingSources) {
    const crawled = await fetchSourceEvents(source, pastDays, futureDays);
    crawledEventsBySlug[source.slug] = crawled;
    crawledBySlug[source.slug] = crawled.length;
  }

  function collectSportEvents(sportSources, sport) {
    const events = [];
    const crawledKeys = new Set();

    for (const source of sportSources) {
      if (source.watch_only === true) {
        continue;
      }

      const crawledEvents = crawledEventsBySlug[source.slug] || [];
      for (const event of crawledEvents) {
        events.push(event);
        crawledKeys.add(conflictKey(event));
      }

      let fallbackCount = 0;
      if (Array.isArray(source.fallback_events)) {
        for (const fallbackEvent of source.fallback_events) {
          const normalized = normalizeFallbackEvent(source, fallbackEvent, pastDays, futureDays);
          if (normalized && !crawledKeys.has(conflictKey(normalized))) {
            events.push(normalized);
            fallbackCount += 1;
          }
        }
      }

      fallbackBySlug[source.slug] = fallbackCount;
    }

    return events.filter((event) => event.sport === sport);
  }

  const footballEvents = collectSportEvents(footballSources, 'football');
  const rugbyEvents = collectSportEvents(rugbySources, 'rugby');

  if (footballEvents.length === 0) {
    fail('No football events produced. Check watchlist and crawler filters.');
  }
  if (rugbyEvents.length === 0) {
    fail('No rugby events produced. Check watchlist and crawler filters.');
  }

  const footballCalendar = buildCalendarText({
    title: 'Equipe de France Football',
    description: 'Matchs de l equipe de France de football - fenetre glissante 24 mois',
    prodId: '-//FacilAbo//Equipe de France Football//FR',
    calendarSlug: 'sport-france-foot-equipe-nationale',
    events: footballEvents
  });

  const rugbyCalendar = buildCalendarText({
    title: 'Equipe de France Rugby',
    description: 'Matchs de l equipe de France de rugby - fenetre glissante 24 mois',
    prodId: '-//FacilAbo//Equipe de France Rugby//FR',
    calendarSlug: 'sport-france-rugby-equipe-nationale',
    events: rugbyEvents
  });

  const writes = [];

  if (args.dryRun) {
    writes.push({ target: canonicalFootPath, changed: true });
    writes.push({ target: canonicalRugbyPath, changed: true });
    if (mirrorFootPath) writes.push({ target: mirrorFootPath, changed: true });
    if (mirrorRugbyPath) writes.push({ target: mirrorRugbyPath, changed: true });
  } else {
    writes.push({ target: canonicalFootPath, changed: writeIfChanged(canonicalFootPath, footballCalendar.text) });
    writes.push({ target: canonicalRugbyPath, changed: writeIfChanged(canonicalRugbyPath, rugbyCalendar.text) });

    if (mirrorFootPath) {
      writes.push({ target: mirrorFootPath, changed: writeIfChanged(mirrorFootPath, footballCalendar.text) });
    }

    if (mirrorRugbyPath) {
      writes.push({ target: mirrorRugbyPath, changed: writeIfChanged(mirrorRugbyPath, rugbyCalendar.text) });
    }
  }

  console.log('[update-france-national-teams-calendars] OK');
  console.log(`- watchlist: ${watchlistPath}`);
  console.log(`- football events: ${footballCalendar.eventCount}`);
  console.log(`- rugby events: ${rugbyCalendar.eventCount}`);
  console.log(`- dry run: ${args.dryRun ? 'yes' : 'no'}`);

  for (const source of allPublishingSources) {
    const crawledCount = crawledBySlug[source.slug] || 0;
    const fallbackCount = fallbackBySlug[source.slug] || 0;
    console.log(`- source ${source.slug}: crawled=${crawledCount}, fallback=${fallbackCount}`);
  }

  for (const write of writes) {
    console.log(`- ${write.changed ? 'updated' : 'unchanged'}: ${write.target}`);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
