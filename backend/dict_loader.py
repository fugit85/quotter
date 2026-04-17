"""Runtime loader for extractor dictionaries produced by tools/build_dicts.py.

Called once at Flask startup. Builds compact in-memory indexes:
  • CITY_SINGLE_LEMMAS  — frozenset of single-token geo names (lowercase)
  • CITY_MULTI_RE       — compiled regex for multi-token geo phrases
  • NAME_LEMMAS         — frozenset of first-name lemmas (all 4 languages merged)
  • MONEY_WORDS_RE      — compiled regex for inflected currency words

All lookups are O(1) for single tokens. Multi-token matches use a single
alternation regex built once — far faster than iterating phrases.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent / "data"


def _read_json(name: str, default):
    path = _DATA_DIR / name
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[dict_loader] WARNING: failed to read {name}: {exc}")
        return default


def _compile_alternation(phrases, *, prefix_boundary: str, suffix_boundary: str):
    if not phrases:
        return None
    ordered = sorted(set(phrases), key=len, reverse=True)
    body = "|".join(re.escape(p) for p in ordered)
    return re.compile(
        f"{prefix_boundary}(?:{body}){suffix_boundary}",
        re.IGNORECASE | re.UNICODE,
    )


# ----- Cities / geo ------------------------------------------------------

_cities = _read_json("cities.json", {"single": [], "multi": []})

CITY_SINGLE_LEMMAS: frozenset[str] = frozenset(
    s.strip().lower() for s in _cities.get("single", []) if s and s.strip()
)

# Multi-token phrases need word-boundary guards that respect Cyrillic.
# Python's \b is Unicode-aware in re, so it handles Cyrillic correctly.
CITY_MULTI_RE = _compile_alternation(
    [p for p in _cities.get("multi", []) if p and p.strip()],
    prefix_boundary=r"(?<![\w\-])",
    suffix_boundary=r"(?![\w\-])",
)


# ----- First names -------------------------------------------------------

_names = _read_json("names.json", {})
_merged_names: set[str] = set()
for _lang_names in _names.values():
    for _n in _lang_names:
        if _n and isinstance(_n, str):
            _merged_names.add(_n.strip().lower())

NAME_LEMMAS: frozenset[str] = frozenset(_merged_names)


# ----- Currencies --------------------------------------------------------

_currencies = _read_json("currencies.json", {"codes": [], "symbols": [], "words": {}})

_currency_words: set[str] = set()
for _lang_words in _currencies.get("words", {}).values():
    for _w in _lang_words:
        if _w and isinstance(_w, str):
            _currency_words.add(_w.strip().lower())

_currency_codes = [c.lower() for c in _currencies.get("codes", []) if c]
_currency_symbols = list(_currencies.get("symbols", []))

CURRENCY_WORDS_RE = _compile_alternation(
    list(_currency_words) + _currency_codes,
    prefix_boundary=r"(?<![a-zа-яёіїєґў])",
    suffix_boundary=r"(?![a-zа-яёіїєґў])",
)
CURRENCY_SYMBOL_SET: frozenset[str] = frozenset(_currency_symbols)


def stats() -> dict:
    """Small summary, printed once at startup."""
    return {
        "city_single": len(CITY_SINGLE_LEMMAS),
        "city_multi": len(_cities.get("multi", [])),
        "names": len(NAME_LEMMAS),
        "currency_words": len(_currency_words),
        "currency_codes": len(_currency_codes),
    }
