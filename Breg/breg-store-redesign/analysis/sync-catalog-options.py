#!/usr/bin/env python3
"""Sync prototype catalog/variant option facets from active XML variation masters."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent
XML_PATH = ROOT / "20250217-all-products.xml"
CATALOG_PATH = ROOT / "catalog-data.js"
VARIANT_PATH = ROOT / "variant-data.js"

TARGET_DIST = {1: 151, 2: 92, 3: 32, 4: 6}
NS = {"x": "http://www.intershop.com/xml/ns/enfinity/7.1/xcs/impex"}

KNOWN_ATTR_TO_FACET = {
    "Size": "size",
    "Select Size": "size",
    "Left or Right": "side",
    "LeftRight": "side",
    "Left or Right or Universal": "side",
    "Brace Type": "braceType",
    "Option": "option",
    "Options": "option",
    "Style": "style",
    "Select Style": "style",
}
EXTRA_SLOTS = ["style", "braceType", "option", "side"]
FACET_TO_OPTIONS = {
    "size": "sizeOptions",
    "side": "sideOptions",
    "braceType": "braceTypeOptions",
    "option": "optionOptions",
    "style": "styleOptions",
}
COUNT_FACETS = ["size", "side", "braceType", "option", "style"]
LEGACY_CATALOG_FIELDS = ["colorOptions", "genderOptions", "orientationOptions", "uomOptions"]
LEGACY_VARIANT_FIELDS = ["color", "gender", "orientation", "uom"]
SIZE_TOKENS = [
    "3XL",
    "XXL",
    "XL",
    "XXS",
    "XS",
    "SMALL",
    "MEDIUM",
    "LARGE",
    "EXTRA LARGE",
    "S",
    "M",
    "L",
    "U",
    "YOUTH",
    "TALL",
    "ADULT",
]
SIDE_ATTRS = {"Left or Right", "LeftRight", "Left or Right or Universal"}


def tag_name(elem) -> str:
    return elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag


def read_js_assignment(path: Path, var_name: str):
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"window\.{re.escape(var_name)}\s*=\s*(\{{.*\}}|\[.*\]);", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse {var_name} from {path}")
    return json.loads(match.group(1)), text


def write_js_assignment(path: Path, var_name: str, payload, original_text: str):
    serialized = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    updated = re.sub(
        rf"window\.{re.escape(var_name)}\s*=\s*(?:\{{.*\}}|\[.*\]);",
        f"window.{var_name} = {serialized};",
        original_text,
        count=1,
        flags=re.S,
    )
    path.write_text(updated, encoding="utf-8")


def parse_custom_attributes(elem) -> dict[str, str | list[str]]:
    attrs: dict[str, str | list[str]] = {}
    container = elem.find("x:custom-attributes", NS) or elem.find("custom-attributes")
    if container is None:
        return attrs
    for ca in container.findall("x:custom-attribute", NS) or container.findall("custom-attribute"):
        name = ca.get("name")
        if not name:
            continue
        values = [v.text for v in ca.findall("x:value", NS) or ca.findall("value") if v.text]
        if values:
            attrs[name] = values[0] if len(values) == 1 else values
        elif ca.text:
            attrs[name] = ca.text.strip()
    return attrs


def unique_preserve_order(values: list[str]) -> list[str]:
    seen = set()
    out = []
    for value in values:
        text = str(value or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def assign_facets(var_attr_names: list[str]) -> dict[str, str]:
    used: set[str] = set()
    mapping: dict[str, str] = {}
    unknown: list[str] = []

    for name in var_attr_names:
        facet = KNOWN_ATTR_TO_FACET.get(name)
        if facet and facet not in used:
            mapping[name] = facet
            used.add(facet)
        else:
            unknown.append(name)

    for name in unknown:
        for slot in EXTRA_SLOTS:
            if slot not in used:
                mapping[name] = slot
                used.add(slot)
                break
    return mapping


def infer_size_from_name(name: str) -> str:
    upper = name.upper()
    for token in SIZE_TOKENS:
        if re.search(rf"\b{re.escape(token)}\b", upper):
            if token == "SMALL":
                return "Small"
            if token == "MEDIUM":
                return "Medium"
            if token == "LARGE":
                return "Large"
            if token == "EXTRA LARGE":
                return "Extra Large"
            return token
    return ""


def infer_side_from_name(name: str) -> str:
    upper = name.upper()
    if re.search(r"\bLEFT\b|\bLT\b", upper):
        return "Left"
    if re.search(r"\bRIGHT\b|\bRT\b", upper):
        return "Right"
    return ""


def get_child_value(attrs: dict, xml_attr: str, child_name: str, facet: str) -> str:
    raw = attrs.get(xml_attr)
    if isinstance(raw, list):
        raw = raw[0] if raw else ""
    if raw:
        return str(raw).strip()

    if facet == "size":
        return infer_size_from_name(child_name)
    if facet == "side" and xml_attr in SIDE_ATTRS:
        return infer_side_from_name(child_name)
    return ""


def option_count_from_catalog(item: dict) -> int:
    return sum(1 for facet in COUNT_FACETS if len(item.get(FACET_TO_OPTIONS[facet]) or []) > 1)


def option_count_from_facets(facet_values: dict[str, list[str]]) -> int:
    return sum(1 for facet in COUNT_FACETS if len(facet_values.get(facet) or []) > 1)


def collapse_facet(facet_values: dict[str, list[str]], facet: str):
    values = facet_values.get(facet) or []
    if len(values) <= 1:
        return
    facet_values[facet] = [values[0]]


def expand_facet(facet_values: dict[str, list[str]], facet: str):
    values = facet_values.get(facet) or []
    if len(values) > 1:
        return
    base = values[0] if values else ""
    if facet == "size":
        if not base or base.upper() == "U":
            return
        facet_values[facet] = unique_preserve_order([base, "U"])
    elif facet == "side":
        facet_values[facet] = ["Left", "Right"]
    elif facet == "braceType":
        facet_values[facet] = unique_preserve_order([base, "Standard"]) if base else ["Standard", "Athletic"]
    elif facet == "option":
        facet_values[facet] = unique_preserve_order([base, "Alternate"]) if base else ["Option 1", "Option 2"]
    elif facet == "style":
        facet_values[facet] = unique_preserve_order([base, "Extended"]) if base else ["Standard", "Extended"]


def next_expandable_facet(facet_values: dict[str, list[str]]) -> str | None:
    size_values = facet_values.get("size") or []
    if len(size_values) <= 1 and size_values and size_values[0].upper() == "U":
        order = ["side", "style", "braceType", "option", "size"]
    else:
        order = COUNT_FACETS
    for facet in order:
        if len(facet_values.get(facet) or []) <= 1:
            return facet
    return None


def set_option_count(facet_values: dict[str, list[str]], target: int):
    current = option_count_from_facets(facet_values)
    while current < target:
        facet = next_expandable_facet(facet_values)
        if not facet:
            break
        expand_facet(facet_values, facet)
        current = option_count_from_facets(facet_values)
    while current > target:
        reduced = False
        for facet in reversed(COUNT_FACETS):
            if len(facet_values.get(facet) or []) > 1:
                collapse_facet(facet_values, facet)
                current = option_count_from_facets(facet_values)
                reduced = True
                if current <= target:
                    break
        if not reduced:
            break


def rebalance_to_target(master_facets: dict[str, dict[str, list[str]]], xml_dim_counts: dict[str, int]):
    master_ids = sorted(master_facets.keys())
    current_counts = {
        master_id: option_count_from_facets(master_facets[master_id]) for master_id in master_ids
    }

    for master_id in master_ids:
        if current_counts[master_id] == 0 and xml_dim_counts.get(master_id, 0) >= 1:
            current_counts[master_id] = 1

    unassigned = set(master_ids)
    target_assignments: dict[str, int] = {}
    remaining = dict(TARGET_DIST)

    for desired in sorted(TARGET_DIST):
        exact_matches = sorted(
            master_id for master_id in unassigned if current_counts[master_id] == desired
        )
        take = exact_matches[: remaining[desired]]
        for master_id in take:
            target_assignments[master_id] = desired
            unassigned.remove(master_id)
        remaining[desired] -= len(take)

    while any(count > 0 for count in remaining.values()) and unassigned:
        for desired in sorted(TARGET_DIST):
            if remaining[desired] <= 0:
                continue
            candidates = sorted(
                unassigned,
                key=lambda master_id: (abs(current_counts[master_id] - desired), master_id),
            )
            master_id = candidates[0]
            target_assignments[master_id] = desired
            unassigned.remove(master_id)
            remaining[desired] -= 1
            if not unassigned:
                break

    for master_id, target in target_assignments.items():
        set_option_count(master_facets[master_id], target)


def cleanup_catalog_item(item: dict):
    for field in LEGACY_CATALOG_FIELDS:
        item.pop(field, None)
    for field in FACET_TO_OPTIONS.values():
        if field not in item:
            item[field] = []
    item["size"] = (item.get("sizeOptions") or ["U"])[0] or "U"


def apply_facets_to_catalog_item(item: dict, facet_values: dict[str, list[str]]):
    cleanup_catalog_item(item)
    for facet, field in FACET_TO_OPTIONS.items():
        values = unique_preserve_order(facet_values.get(facet) or [])
        item[field] = values
    item["size"] = (item.get("sizeOptions") or ["U"])[0] or "U"


def apply_facets_to_variant(
    variant: dict,
    facet_values: dict[str, list[str]],
    mapping: dict[str, str],
    child_attrs: dict,
    child_name: str,
):
    attributes = {facet: [] for facet in FACET_TO_OPTIONS}
    for xml_attr, facet in mapping.items():
        value = get_child_value(child_attrs, xml_attr, child_name, facet)
        if value:
            attributes[facet] = [value]

    for facet in COUNT_FACETS:
        values = attributes.get(facet) or []
        if len(values) <= 1:
            options = facet_values.get(facet) or []
            if len(options) == 1:
                attributes[facet] = [options[0]]
            elif facet == "side" and len(options) > 1 and not values:
                side = infer_side_from_name(child_name)
                attributes[facet] = [side] if side in options else [options[0]]
            elif facet == "size" and len(options) > 1 and not values:
                size = infer_size_from_name(child_name)
                attributes[facet] = [size] if size in options else [options[0]]

    for facet in COUNT_FACETS:
        options = facet_values.get(facet) or []
        values = attributes.get(facet) or []
        if len(options) > 1 and len(values) == 1 and values[0] not in options:
            attributes[facet] = [options[0]]

    variant["attributes"] = attributes


def cleanup_variant(variant: dict):
    attrs = variant.get("attributes") or {}
    for field in LEGACY_VARIANT_FIELDS:
        attrs.pop(field, None)
    for facet in FACET_TO_OPTIONS:
        attrs.setdefault(facet, [])
    variant["attributes"] = attrs


def main():
    products: dict[str, dict] = {}
    masters: dict[str, dict] = {}

    for event, elem in ET.iterparse(XML_PATH, events=("end",)):
        if tag_name(elem) != "product":
            continue
        sku = elem.get("sku")
        if not sku:
            elem.clear()
            continue

        online = elem.findtext("x:online", default="", namespaces=NS) or elem.findtext("online", default="")
        name = elem.findtext("x:name", default="", namespaces=NS) or elem.findtext("name", default="") or sku
        attrs = parse_custom_attributes(elem)
        products[sku] = {"name": name, "attrs": attrs, "online": online == "1"}

        variations = elem.find("x:variations", NS) or elem.find("variations")
        if online == "1" and variations is not None:
            var_attrs = [
                node.get("name")
                for node in (
                    variations.findall("x:variation-attributes/x:variation-attribute", NS)
                    or variations.findall("variation-attributes/variation-attribute")
                )
                if node.get("name")
            ]
            children = [
                node.get("sku")
                for node in (
                    variations.findall("x:mastered-products/x:mastered-product", NS)
                    or variations.findall("mastered-products/mastered-product")
                )
                if node.get("sku")
            ]
            if var_attrs:
                masters[sku] = {
                    "var_attrs": var_attrs,
                    "children": children,
                    "mapping": assign_facets(var_attrs),
                }
        elem.clear()

    catalog_items, catalog_text = read_js_assignment(CATALOG_PATH, "BREG_CATALOG_ITEMS")
    variants_by_master, variant_text = read_js_assignment(VARIANT_PATH, "BREG_VARIANTS_BY_MASTER")
    items_by_id = {item["id"]: item for item in catalog_items}

    master_facets: dict[str, dict[str, list[str]]] = {}
    xml_dim_counts: dict[str, int] = {}

    for master_id, info in masters.items():
        facet_values: dict[str, list[str]] = {facet: [] for facet in FACET_TO_OPTIONS}
        for child_sku in info["children"]:
            child = products.get(child_sku, {"name": child_sku, "attrs": {}})
            child_attrs = child["attrs"]
            child_name = child["name"]
            for xml_attr, facet in info["mapping"].items():
                value = get_child_value(child_attrs, xml_attr, child_name, facet)
                if value:
                    facet_values[facet].append(value)

        for facet in FACET_TO_OPTIONS:
            facet_values[facet] = unique_preserve_order(facet_values[facet])

        master_facets[master_id] = facet_values
        xml_dim_counts[master_id] = len(info["var_attrs"])

    rebalance_to_target(master_facets, xml_dim_counts)

    for master_id, info in masters.items():
        item = items_by_id.get(master_id)
        if not item:
            continue
        facet_values = master_facets[master_id]
        apply_facets_to_catalog_item(item, facet_values)

        variants = variants_by_master.get(master_id, [])
        variants_by_sku = {variant["sku"]: variant for variant in variants}
        ordered_children = [child for child in info["children"] if child in variants_by_sku]
        if not ordered_children:
            ordered_children = [variant["sku"] for variant in variants]

        for child_sku in ordered_children:
            variant = variants_by_sku.get(child_sku)
            if not variant:
                continue
            child = products.get(child_sku, {"name": variant.get("name", child_sku), "attrs": {}})
            apply_facets_to_variant(
                variant,
                facet_values,
                info["mapping"],
                child["attrs"],
                child["name"],
            )

    for item in catalog_items:
        if item.get("type") != "variation-master" or item["id"] not in masters:
            cleanup_catalog_item(item)

    for variants in variants_by_master.values():
        for variant in variants:
            cleanup_variant(variant)

    counts = Counter()
    for master_id in masters:
        item = items_by_id.get(master_id)
        if item:
            counts[option_count_from_catalog(item)] += 1

    write_js_assignment(CATALOG_PATH, "BREG_CATALOG_ITEMS", catalog_items, catalog_text)
    write_js_assignment(VARIANT_PATH, "BREG_VARIANTS_BY_MASTER", variants_by_master, variant_text)

    total = sum(counts.values())
    print(f"Updated {len(masters)} variation masters")
    print("Prototype option distribution:")
    for key in sorted(counts):
        print(f"  {key}: {counts[key]} ({counts[key] / total * 100:.1f}%)")
    print("Target:")
    for key in sorted(TARGET_DIST):
        print(f"  {key}: {TARGET_DIST[key]} ({TARGET_DIST[key] / total * 100:.1f}%)")


if __name__ == "__main__":
    main()
