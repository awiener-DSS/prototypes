from commerce_analyst.text import decode_html_entities, decode_product_name


def test_decode_html_entities_decodes_numeric_slash() -> None:
    raw = "5 x 5&#47;8-11NC Knot Twisted Conical (Bevel) Brush - High Performance"
    assert decode_html_entities(raw) == "5 x 5/8-11NC Knot Twisted Conical (Bevel) Brush - High Performance"


def test_decode_html_entities_decodes_named_dash() -> None:
    raw = "Chest Waders &ndash; Steel Toe/Plate &ndash; Black &ndash;"
    assert decode_html_entities(raw) == "Chest Waders – Steel Toe/Plate – Black –"


def test_decode_html_entities_decodes_bare_ndash_without_semicolon() -> None:
    raw = "Chest Waders &ndash Steel Toe/Plate &ndash Black"
    assert decode_html_entities(raw) == "Chest Waders – Steel Toe/Plate – Black"


def test_decode_html_entities_decodes_named_entities() -> None:
    assert decode_html_entities("Tom &amp; Jerry &lt;3") == "Tom & Jerry <3"


def test_decode_product_name_passes_through_plain_text() -> None:
    assert decode_product_name("Plain brush") == "Plain brush"
    assert decode_product_name(None) is None
