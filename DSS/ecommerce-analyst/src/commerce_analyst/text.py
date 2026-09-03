from __future__ import annotations

import html
import re

_NAMED_HTML_ENTITIES = {
    "amp": "&",
    "lt": "<",
    "gt": ">",
    "quot": '"',
    "apos": "'",
    "nbsp": "\u00a0",
    "ndash": "\u2013",
    "mdash": "\u2014",
    "hellip": "\u2026",
}

# GA4 / ICM sometimes omit the trailing semicolon (e.g. "&ndash").
_BARE_NAMED_ENTITIES = frozenset(_NAMED_HTML_ENTITIES)
_NAMED_ENTITY_PATTERN = re.compile(r"&([a-zA-Z][a-zA-Z0-9]+);?")


def _decode_named_entities_once(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        key = name.lower()
        decoded = _NAMED_HTML_ENTITIES.get(key)
        if decoded is None:
            return match.group(0)
        full = match.group(0)
        if full.endswith(";") or key in _BARE_NAMED_ENTITIES:
            return decoded
        return full

    return _NAMED_ENTITY_PATTERN.sub(replace, value)


def decode_html_entities(value: str | None) -> str | None:
    """Decode HTML entities in storefront / GA4 product strings."""
    if value is None:
        return None
    text = str(value)
    if "&" not in text:
        return text
    for _ in range(4):
        next_text = html.unescape(text)
        next_text = _decode_named_entities_once(next_text)
        if next_text == text:
            break
        text = next_text
    return text


def decode_product_name(value: str | None) -> str | None:
    return decode_html_entities(value)
