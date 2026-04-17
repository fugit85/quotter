"""
build_dicts.py — one-off dictionary builder for the Извлекатор.

Downloads open data and writes three compact JSON files into backend/data/:

  • cities.json      — populated places in RU/UA/BY/KZ (GeoNames) + world countries
  • names.json       — first names for RU/UA/BE/KK (from tools/names/*.txt)
  • currencies.json  — codes, symbols, and inflected words via Babel

Usage:
    py -3 -m pip install -r tools/build_requirements.txt
    py -3 tools/build_dicts.py

Re-run whenever you want to refresh data (GeoNames updates nightly).
Downloads are cached in tools/.cache/ — delete it to force a refetch.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import time
import zipfile
from io import BytesIO, TextIOWrapper
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
TOOLS_DIR = ROOT / "tools"
NAMES_DIR = TOOLS_DIR / "names"
CACHE_DIR = TOOLS_DIR / ".cache"
DATA_DIR = ROOT / "backend" / "data"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# GeoNames country dumps — we pull only the 4 relevant countries.
# https://download.geonames.org/export/dump/
GEONAMES_COUNTRIES = ("RU", "UA", "BY", "KZ")
GEONAMES_URL = "https://download.geonames.org/export/dump/{cc}.zip"

# Minimum population for a place to count as a "city".
# 5000 gives ~10k cities total across RU/UA/BY/KZ — enough for PPC work.
MIN_POPULATION_CITY = 5000
MIN_POPULATION_REGION = 20000

USER_AGENT = "qoutter-extractor-dict-builder/1.0 (+https://qoutter.cloud)"
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")


def _letterset(*parts: str) -> set[str]:
    merged = set("".join(parts))
    return merged | {c.upper() for c in merged}


_RU_LETTERS = _letterset("абвгдеёжзийклмнопрстуфхцчшщъыьэюя")
_UK_EXTRA = _letterset("іїєґ")
_BE_EXTRA = _letterset("ў")
_KK_EXTRA = _letterset("әғқңөұүһ")

# Accepted = RU ∪ UA ∪ BY ∪ KK (Cyrillic). Everything else (Tatar, Chuvash,
# Kalmyk, Mari, Abkhaz, …) is noise — no one searches in those languages.
_ACCEPTED_LETTERS = _RU_LETTERS | _UK_EXTRA | _BE_EXTRA | _KK_EXTRA
_PURE_RU_LETTERS = _RU_LETTERS
_PURE_UK_LETTERS = _RU_LETTERS | _UK_EXTRA
_PURE_BE_LETTERS = _RU_LETTERS | _BE_EXTRA
_PURE_KK_LETTERS = _RU_LETTERS | _KK_EXTRA


def _uses_only(s: str, allowed: set[str]) -> bool:
    for ch in s:
        if 0x0400 <= ord(ch) <= 0x04FF and ch not in allowed:
            return False
    return True


def _alias_is_slavic_or_kazakh(s: str) -> bool:
    has_cyr = False
    for ch in s:
        code = ord(ch)
        if 0x0400 <= code <= 0x04FF:
            has_cyr = True
            if ch not in _ACCEPTED_LETTERS:
                return False
    return has_cyr


def _alias_rank(a: str) -> tuple:
    """Lower is better. Prefer pure-RU, then UA, BE, KK, then mixed,
    breaking ties by shorter length (canonical native names are short)."""
    if _uses_only(a, _PURE_RU_LETTERS):
        tier = 0
    elif _uses_only(a, _PURE_UK_LETTERS):
        tier = 1
    elif _uses_only(a, _PURE_BE_LETTERS):
        tier = 2
    elif _uses_only(a, _PURE_KK_LETTERS):
        tier = 3
    else:
        tier = 4
    return (tier, len(a))


def log(msg: str) -> None:
    print(f"[build] {msg}", flush=True)


def download_cached(url: str, filename: str) -> bytes:
    path = CACHE_DIR / filename
    if path.exists() and path.stat().st_size > 0:
        log(f"cache hit: {filename} ({path.stat().st_size / 1024:.0f} KB)")
        return path.read_bytes()
    log(f"downloading {url}")
    t0 = time.time()
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=180) as resp:
        data = resp.read()
    path.write_bytes(data)
    log(f"  → {len(data) / 1024:.0f} KB in {time.time() - t0:.1f}s")
    return data


# ---------------------------------------------------------------------------
# Cities
# ---------------------------------------------------------------------------

def _cyrillic_aliases(raw: str) -> list[str]:
    if not raw:
        return []
    buf = []
    seen = set()
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk or not _alias_is_slavic_or_kazakh(chunk):
            continue
        key = chunk.lower()
        if key in seen:
            continue
        seen.add(key)
        buf.append(chunk)
    # Prioritise Russian-like aliases; canonical native forms come first.
    buf.sort(key=_alias_rank)
    return buf


def _pick_primary_cyrillic(name: str, aliases: list[str]) -> str | None:
    if name and _alias_is_slavic_or_kazakh(name):
        return name
    return aliases[0] if aliases else None


def build_cities() -> None:
    all_names: set[str] = set()
    regions: set[str] = set()

    for cc in GEONAMES_COUNTRIES:
        try:
            raw = download_cached(GEONAMES_URL.format(cc=cc), f"{cc}.zip")
        except URLError as exc:
            log(f"WARNING: failed to download {cc}: {exc}")
            continue
        count_city = 0
        count_region = 0
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            with zf.open(f"{cc}.txt") as txt:
                reader = csv.reader(TextIOWrapper(txt, encoding="utf-8"), delimiter="\t")
                for row in reader:
                    if len(row) < 15:
                        continue
                    name = row[1].strip()
                    alt_cyr = _cyrillic_aliases(row[3])
                    feature_class = row[6]
                    feature_code = row[7]
                    try:
                        pop = int(row[14] or 0)
                    except ValueError:
                        pop = 0

                    primary = _pick_primary_cyrillic(name, alt_cyr)
                    if not primary:
                        continue

                    if feature_class == "P" and pop >= MIN_POPULATION_CITY:
                        all_names.add(primary)
                        for a in alt_cyr[:10]:
                            all_names.add(a)
                        count_city += 1
                    elif (
                        feature_class == "A"
                        and feature_code in ("ADM1", "ADM2")
                        and pop >= MIN_POPULATION_REGION
                    ):
                        regions.add(primary)
                        for a in alt_cyr[:5]:
                            regions.add(a)
                        count_region += 1

        log(f"  {cc}: {count_city} cities, {count_region} regions (pop ≥ {MIN_POPULATION_CITY})")

    countries: list[str] = []
    try:
        from babel import Locale  # type: ignore

        for lang in ("ru", "uk", "be", "kk", "en"):
            try:
                loc = Locale.parse(lang)
            except Exception:
                continue
            for code, t_name in loc.territories.items():
                if len(code) == 2 and not code.isdigit():
                    countries.append(t_name)
        log(f"  babel: collected {len(countries)} country names across 5 locales")
    except ImportError:
        log("  WARNING: babel not installed — countries list will be empty")

    # Split into single- vs multi-token for fast runtime lookup.
    def norm(s: str) -> str:
        return s.strip().lower()

    single = set()
    multi = set()

    def _classify(raw: str) -> None:
        n = norm(raw)
        if not n:
            return
        # Names with spaces or hyphens are compound — they can't be looked up
        # by a single pymorphy lemma, so they must live in the multi bucket
        # where a regex alternation handles them.
        if " " in n or "-" in n:
            multi.add(n)
        else:
            single.add(n)

    for raw in all_names:
        _classify(raw)
    for raw in regions:
        _classify(raw)
    for raw in countries:
        _classify(raw)

    out = {
        "single": sorted(single),
        "multi": sorted(multi, key=len, reverse=True),
    }

    path = DATA_DIR / "cities.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    kb = path.stat().st_size / 1024
    log(f"✓ cities.json — {len(out['single'])} single + {len(out['multi'])} multi ({kb:.0f} KB)")


# ---------------------------------------------------------------------------
# Names
# ---------------------------------------------------------------------------

def build_names() -> None:
    buckets: dict[str, list[str]] = {}
    total = 0
    for lang in ("ru", "uk", "be", "kk"):
        src = NAMES_DIR / f"{lang}.txt"
        if not src.exists():
            log(f"  WARNING: {src} missing — skipping {lang}")
            buckets[lang] = []
            continue
        names = set()
        for line in src.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            names.add(s.lower())
        buckets[lang] = sorted(names)
        total += len(names)
        log(f"  {lang}: {len(names)} names from {src.name}")

    path = DATA_DIR / "names.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(buckets, f, ensure_ascii=False, separators=(",", ":"))
    kb = path.stat().st_size / 1024
    log(f"✓ names.json — {total} names total ({kb:.0f} KB)")


# ---------------------------------------------------------------------------
# Currencies
# ---------------------------------------------------------------------------

# Common currencies we want the extractor to recognise.
CURRENCY_CODES = (
    "RUB", "UAH", "BYN", "KZT", "USD", "EUR", "GBP", "CNY", "PLN", "TRY",
    "AZN", "AMD", "GEL", "KGS", "UZS", "TJS", "MDL", "TMT", "CHF", "JPY",
)

CURRENCY_SYMBOLS = ["$", "€", "£", "¥", "₽", "₴", "₸", "zł", "Br", "₼", "₾", "₺", "лв"]

# Hard fallbacks if Babel is unavailable; these cover the CIS markets fully.
FALLBACK_WORDS = {
    "ru": [
        "рубль", "рубля", "рублей", "рублях", "руб", "р",
        "копейка", "копеек", "копейки", "коп",
        "доллар", "долларов", "доллара", "долл", "бакс", "баксов",
        "евро",
        "тенге", "тг",
        "гривна", "гривен", "гривны", "грн",
        "юань", "юаня", "юаней",
        "злотый", "злотых",
        "фунт", "фунта", "фунтов",
        "манат", "маната", "манатов",
        "лира", "лиры", "лир",
        "белорусский рубль",
    ],
    "uk": [
        "гривня", "гривні", "гривень", "грн",
        "копійка", "копійки", "копійок",
        "долар", "долара", "доларів",
        "євро",
        "рубль", "рубля", "рублів",
        "злотий", "злотих",
        "теньге", "тенге",
        "юань", "юаня", "юанів",
    ],
    "be": [
        "рубель", "рубля", "рублёў", "рублёу", "руб", "р",
        "капейка", "капейкі", "капеек",
        "долар", "долараў",
        "еўра",
        "грыўня", "грыўняў",
        "тэнге",
    ],
    "kk": [
        "теңге", "тенге", "тг",
        "тиын", "тиынның", "тиынның",
        "доллар", "долларлар", "долларын",
        "евро",
        "рубль", "рубли",
        "юань",
    ],
}


def _babel_currency_words() -> dict[str, list[str]]:
    try:
        from babel.numbers import get_currency_name  # type: ignore
    except ImportError:
        return {}
    out: dict[str, list[str]] = {"ru": [], "uk": [], "be": [], "kk": []}
    # get_currency_name pulls singular/plural via CLDR plural rules;
    # we ask for the most common counts to cover inflections.
    counts = (0, 1, 2, 5, 100)
    for lang in out:
        seen: set[str] = set()
        for code in CURRENCY_CODES:
            for n in counts:
                try:
                    name = get_currency_name(code, count=n, locale=lang)
                except Exception:
                    continue
                for token in re.split(r"\s+", name):
                    token = token.strip(" .,").lower()
                    if token and token not in seen and not any(ch.isdigit() for ch in token):
                        seen.add(token)
                        out[lang].append(token)
    return out


def build_currencies() -> None:
    out = {
        "codes": list(CURRENCY_CODES),
        "symbols": CURRENCY_SYMBOLS,
        "words": {lang: sorted(set(words)) for lang, words in FALLBACK_WORDS.items()},
    }
    babel_extra = _babel_currency_words()
    for lang, extras in babel_extra.items():
        merged = set(out["words"].get(lang, [])) | set(extras)
        out["words"][lang] = sorted(merged)
    total_words = sum(len(v) for v in out["words"].values())

    path = DATA_DIR / "currencies.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    kb = path.stat().st_size / 1024
    log(
        f"✓ currencies.json — {len(out['codes'])} codes, {len(out['symbols'])} symbols, "
        f"{total_words} words ({kb:.0f} KB)"
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main() -> int:
    t0 = time.time()
    log(f"output: {DATA_DIR}")
    log(f"cache:  {CACHE_DIR}")
    try:
        build_cities()
        build_names()
        build_currencies()
    except Exception as exc:
        log(f"FAILED: {exc!r}")
        return 1
    log(f"done in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
