#!/usr/bin/env python3
"""Add newly discovered Google Scholar works to publications.json.

Existing hand-curated entries are never overwritten or removed. A snapshot of
Scholar citation IDs makes the first run a baseline, so only future additions
are inserted into the website.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLICATIONS_FILE = ROOT / "publications.json"
SNAPSHOT_FILE = ROOT / ".scholar" / "publication_ids.json"
SCHOLAR_ID = "qFS5KY0AAAAJ"
SCHOLAR_ORIGIN = "https://scholar.google.com"


class ScholarParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.publications: list[dict[str, str]] = []
        self.current: dict[str, object] | None = None
        self.capture: str | None = None

    @staticmethod
    def _classes(attrs: list[tuple[str, str | None]]) -> set[str]:
        return set(dict(attrs).get("class", "").split())

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = self._classes(attrs)
        values = dict(attrs)
        if tag == "tr" and "gsc_a_tr" in classes:
            self.current = {"gray": []}
        elif self.current is not None and tag == "a" and "gsc_a_at" in classes:
            self.capture = "title"
            self.current["detail_url"] = urllib.parse.urljoin(
                SCHOLAR_ORIGIN, html.unescape(values.get("href", ""))
            )
        elif self.current is not None and tag == "div" and "gs_gray" in classes:
            self.capture = "gray"
            self.current["gray"].append("")
        elif self.current is not None and tag == "span" and "gsc_a_h" in classes:
            self.capture = "year"

    def handle_data(self, data: str) -> None:
        if self.current is None or self.capture is None:
            return
        if self.capture == "gray":
            self.current["gray"][-1] += data
        else:
            self.current[self.capture] = str(self.current.get(self.capture, "")) + data

    def handle_endtag(self, tag: str) -> None:
        if self.current is None:
            return
        if tag in {"a", "div", "span"}:
            self.capture = None
        if tag == "tr":
            title = clean(str(self.current.get("title", "")))
            url = str(self.current.get("detail_url", ""))
            match = re.search(r"citation_for_view=([^&]+)", url)
            gray = [clean(str(value)) for value in self.current.get("gray", [])]
            if title and match:
                self.publications.append(
                    {
                        "id": urllib.parse.unquote(match.group(1)),
                        "title": title,
                        "authors": gray[0] if gray else "",
                        "venue": gray[1] if len(gray) > 1 else "",
                        "year": clean(str(self.current.get("year", ""))),
                        "scholar": url,
                    }
                )
            self.current = None
            self.capture = None


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def normalize_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def same_title(left: str, right: str) -> bool:
    left_norm, right_norm = normalize_title(left), normalize_title(right)
    if left_norm == right_norm:
        return True
    # Scholar occasionally changes punctuation or expands a subtitle.
    return SequenceMatcher(None, left_norm, right_norm).ratio() >= 0.92


def fetch_scholar(retries: int = 3) -> list[dict[str, str]]:
    query = urllib.parse.urlencode(
        {"user": SCHOLAR_ID, "hl": "en", "pagesize": "100", "sortby": "pubdate"}
    )
    request = urllib.request.Request(
        f"{SCHOLAR_ORIGIN}/citations?{query}",
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "Chrome/126.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8", errors="replace")
            parser = ScholarParser()
            parser.feed(body)
            if not parser.publications:
                raise RuntimeError("Scholar returned no publications (possibly a CAPTCHA)")
            return parser.publications
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            last_error = error
            if attempt + 1 < retries:
                time.sleep(2**attempt)
    raise RuntimeError(f"Unable to read Google Scholar after {retries} attempts: {last_error}")


def load_json(path: Path, default: object) -> object:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--initialize",
        action="store_true",
        help="Record current Scholar works without adding them to the website",
    )
    args = parser.parse_args()

    scholar_publications = fetch_scholar()
    snapshot = load_json(SNAPSHOT_FILE, {"scholar_id": SCHOLAR_ID, "publication_ids": []})
    known_ids = set(snapshot.get("publication_ids", []))

    if args.initialize or not SNAPSHOT_FILE.exists():
        write_json(
            SNAPSHOT_FILE,
            {"scholar_id": SCHOLAR_ID, "publication_ids": [p["id"] for p in scholar_publications]},
        )
        print(f"Initialized Scholar baseline with {len(scholar_publications)} publications.")
        return 0

    data = load_json(PUBLICATIONS_FILE, {"publications": []})
    existing = data["publications"]
    unseen = [publication for publication in scholar_publications if publication["id"] not in known_ids]
    additions = []
    for publication in unseen:
        if any(same_title(publication["title"], item.get("title", "")) for item in existing):
            continue
        venue = publication["venue"]
        year = publication["year"]
        if year and year not in venue:
            venue = f"{venue}, {year}" if venue else year
        additions.append(
            {
                "title": publication["title"],
                "authors": [name.strip() for name in publication["authors"].split(",") if name.strip()],
                "venue": venue,
                "thumbnail": "",
                "selected": 0,
                "award": "",
                "links": {"scholar": publication["scholar"]},
            }
        )

    if additions:
        data["publications"] = additions + existing
        write_json(PUBLICATIONS_FILE, data)
        print(f"Added {len(additions)} new publication(s):")
        for publication in additions:
            print(f"- {publication['title']}")
    else:
        print("No new publications found.")

    # Only advance the snapshot after a complete, valid fetch and data update.
    write_json(
        SNAPSHOT_FILE,
        {"scholar_id": SCHOLAR_ID, "publication_ids": [p["id"] for p in scholar_publications]},
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
