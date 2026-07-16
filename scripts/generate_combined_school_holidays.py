#!/usr/bin/env python3
"""Generate one readable metropolitan school-holidays calendar from zones A/B/C."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


DEFAULT_SOURCES = {
    "A": "https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-A.ics",
    "B": "https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-B.ics",
    "C": "https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-C.ics",
}


@dataclass(frozen=True)
class SourceEvent:
    summary: str
    start: date
    end: date


@dataclass(frozen=True)
class CombinedEvent:
    summary: str
    start: date
    end: date
    zones: frozenset[str]


def unfold_ical(raw_text: str) -> list[str]:
    lines: list[str] = []
    for raw_line in raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if raw_line.startswith((" ", "\t")) and lines:
            lines[-1] += raw_line[1:]
        else:
            lines.append(raw_line)
    return lines


def field_value(lines: Iterable[str], field: str) -> str | None:
    prefix = f"{field}:"
    parameter_prefix = f"{field};"
    for line in lines:
        if line.startswith(prefix) or line.startswith(parameter_prefix):
            return line.split(":", 1)[1]
    return None


def parse_date(value: str) -> date:
    match = re.match(r"^(\d{8})", value)
    if not match:
        raise ValueError(f"Unsupported ICS date: {value}")
    return datetime.strptime(match.group(1), "%Y%m%d").date()


def normalized_key(summary: str) -> str:
    folded = unicodedata.normalize("NFKD", summary)
    ascii_summary = "".join(char for char in folded if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_summary.casefold()).strip("-")


def parse_source(raw_text: str) -> tuple[list[SourceEvent], str]:
    lines = unfold_ical(raw_text)
    events: list[SourceEvent] = []
    dtstamps: list[str] = []
    current: list[str] | None = None

    for line in lines:
        if line == "BEGIN:VEVENT":
            current = []
        elif line == "END:VEVENT" and current is not None:
            summary = field_value(current, "SUMMARY")
            start_raw = field_value(current, "DTSTART")
            end_raw = field_value(current, "DTEND")
            dtstamp = field_value(current, "DTSTAMP")
            current = None

            if not summary or not start_raw or not end_raw:
                continue
            if "enseignant" in normalized_key(summary):
                continue

            start = parse_date(start_raw)
            end = parse_date(end_raw)
            if end < start:
                raise ValueError(f"DTEND precedes DTSTART for {summary}: {start} -> {end}")
            if end == start:
                end = start + timedelta(days=1)

            events.append(SourceEvent(summary=summary.strip(), start=start, end=end))
            if dtstamp and re.match(r"^\d{8}T\d{6}Z$", dtstamp):
                dtstamps.append(dtstamp)
        elif current is not None:
            current.append(line)

    if not events:
        raise ValueError("No usable VEVENT found in source calendar")
    return events, max(dtstamps, default="19700101T000000Z")


def combine_zone_events(zone_events: dict[str, list[SourceEvent]]) -> list[CombinedEvent]:
    expected_zones = set(DEFAULT_SOURCES)
    if set(zone_events) != expected_zones:
        raise ValueError(f"Expected zones {sorted(expected_zones)}, got {sorted(zone_events)}")

    grouped: dict[str, list[tuple[str, SourceEvent]]] = {}
    display_summaries: dict[str, str] = {}
    for zone, events in zone_events.items():
        seen: set[tuple[str, date, date]] = set()
        for event in events:
            key = normalized_key(event.summary)
            signature = (key, event.start, event.end)
            if signature in seen:
                continue
            seen.add(signature)
            grouped.setdefault(key, []).append((zone, event))
            display_summaries.setdefault(key, event.summary)

    combined: list[CombinedEvent] = []
    for key, entries in grouped.items():
        boundaries = sorted({point for _, event in entries for point in (event.start, event.end)})
        segments: list[CombinedEvent] = []

        for start, end in zip(boundaries, boundaries[1:]):
            active_zones = frozenset(
                zone
                for zone, event in entries
                if event.start <= start and event.end >= end
            )
            if not active_zones:
                continue

            if segments and segments[-1].end == start and segments[-1].zones == active_zones:
                previous = segments[-1]
                segments[-1] = CombinedEvent(
                    summary=previous.summary,
                    start=previous.start,
                    end=end,
                    zones=previous.zones,
                )
            else:
                segments.append(
                    CombinedEvent(
                        summary=display_summaries[key],
                        start=start,
                        end=end,
                        zones=active_zones,
                    )
                )

        combined.extend(segments)

    return sorted(combined, key=lambda event: (event.start, event.end, normalized_key(event.summary)))


def zone_label(zones: frozenset[str]) -> str:
    ordered = [zone for zone in ("A", "B", "C") if zone in zones]
    if ordered == ["A", "B", "C"]:
        return "toutes zones"
    if len(ordered) == 1:
        return f"zone {ordered[0]}"
    return f"zones {' et '.join(ordered)}"


def escape_ical_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(";", "\\;")
        .replace(",", "\\,")
    )


def fold_ical_line(line: str, limit: int = 73) -> list[str]:
    folded: list[str] = []
    remaining = line
    first = True
    while remaining:
        prefix = "" if first else " "
        byte_limit = limit if first else limit - 1
        chunk = ""
        for char in remaining:
            if len((chunk + char).encode("utf-8")) > byte_limit:
                break
            chunk += char
        if not chunk:
            raise ValueError(f"Unable to fold ICS line: {line!r}")
        folded.append(prefix + chunk)
        remaining = remaining[len(chunk) :]
        first = False
    return folded or [""]


def build_calendar(events: list[CombinedEvent], dtstamp: str) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FacilAbo//Vacances scolaires toutes zones//FR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "NAME:Vacances scolaires - Toutes zones (FacilAbo)",
        "X-WR-CALNAME:Vacances scolaires - Toutes zones (FacilAbo)",
        "X-WR-TIMEZONE:Europe/Paris",
        "X-WR-CALDESC:Zones A, B et C sans doublons quotidiens.",
    ]

    for event in events:
        zones_key = "".join(sorted(event.zones)).lower()
        summary_key = normalized_key(event.summary)
        uid = (
            f"vacances-toutes-zones-{summary_key}-{event.start:%Y%m%d}-"
            f"{event.end:%Y%m%d}-{zones_key}@facilabo.app"
        )
        label = zone_label(event.zones)
        description = (
            f"Zones concernées : {label}. Segment calculé à partir des calendriers "
            "officiels des zones A, B et C."
        )
        location = "France métropolitaine" if len(event.zones) == 3 else f"France métropolitaine - {label}"

        event_lines = [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;VALUE=DATE:{event.start:%Y%m%d}",
            f"DTEND;VALUE=DATE:{event.end:%Y%m%d}",
            f"SUMMARY:{escape_ical_text(f'{event.summary} — {label}')}",
            f"DESCRIPTION:{escape_ical_text(description)}",
            f"LOCATION:{escape_ical_text(location)}",
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ]
        for line in event_lines:
            lines.extend(fold_ical_line(line))

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def read_source(location: str) -> str:
    if location.startswith(("https://", "http://")):
        request = urllib.request.Request(location, headers={"User-Agent": "FacilAbo-Calendar-Generator/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8-sig")
    return Path(location).read_text(encoding="utf-8-sig")


def update_anchor_manifest(path: Path, events: list[CombinedEvent]) -> None:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    feeds = manifest.get("feeds")
    if not isinstance(feeds, dict):
        raise ValueError(f"Invalid date-anchor manifest: {path}")

    combined_path = "education/vacances-toutes-zones.ics"
    combined_spec = {
        "mode": "exact",
        "events": [
            {
                "uid": (
                    f"vacances-toutes-zones-{normalized_key(event.summary)}-"
                    f"{event.start:%Y%m%d}-{event.end:%Y%m%d}-"
                    f"{''.join(sorted(event.zones)).lower()}@facilabo.app"
                ),
                "dtstart": event.start.strftime("%Y%m%d"),
                "dtend": event.end.strftime("%Y%m%d"),
            }
            for event in events
        ],
    }
    if combined_path in feeds:
        feeds[combined_path] = combined_spec
    else:
        ordered_feeds: dict[str, object] = {}
        education_paths = [key for key in feeds if key.startswith("education/")]
        insert_after = education_paths[-1] if education_paths else None
        for key, value in feeds.items():
            ordered_feeds[key] = value
            if key == insert_after:
                ordered_feeds[combined_path] = combined_spec
        if insert_after is None:
            ordered_feeds[combined_path] = combined_spec
        manifest["feeds"] = ordered_feeds
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    script_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    for zone in ("A", "B", "C"):
        parser.add_argument(f"--zone-{zone.lower()}", default=DEFAULT_SOURCES[zone])
    parser.add_argument(
        "--output",
        default=str(script_root / "education" / "vacances-toutes-zones.ics"),
        help="Canonical ICS output path.",
    )
    parser.add_argument("--mirror-output", help="Optional second output path for the iOS repo mirror.")
    parser.add_argument("--anchor-manifest", help="Optional date-anchor JSON manifest to update.")
    parser.add_argument(
        "--from-year",
        type=int,
        default=2024,
        help="Keep periods ending in or after this year (default: 2024).",
    )
    args = parser.parse_args()

    zone_events: dict[str, list[SourceEvent]] = {}
    dtstamps: list[str] = []
    for zone in ("A", "B", "C"):
        events, dtstamp = parse_source(read_source(getattr(args, f"zone_{zone.lower()}")))
        zone_events[zone] = events
        dtstamps.append(dtstamp)

    combined = [
        event
        for event in combine_zone_events(zone_events)
        if event.end > date(args.from_year, 1, 1)
    ]
    calendar_text = build_calendar(combined, max(dtstamps))

    output_paths = [Path(args.output)]
    if args.mirror_output:
        output_paths.append(Path(args.mirror_output))
    for output_path in output_paths:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(calendar_text, encoding="utf-8", newline="")
    if args.anchor_manifest:
        update_anchor_manifest(Path(args.anchor_manifest), combined)

    suffix = f"; anchors -> {args.anchor_manifest}" if args.anchor_manifest else ""
    print(f"Generated {len(combined)} events -> {', '.join(str(path) for path in output_paths)}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
