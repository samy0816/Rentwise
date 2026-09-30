"""Extraction heuristic tests."""
from app.services.extraction_service import (
    _detect_contract_type,
    _extract_heuristic,
    _notice_period,
)

SAMPLE = """
Mietvertrag
Die monatliche Kaltmiete beträgt 850,00 €.
Die monatlichen Nebenkosten betragen 180,00 €.
Der Mieter leistet eine Kaution in Höhe von 1.700,00 €.
Das Mietverhältnis beginnt am 01.10.2026. Das Mietverhältnis ist unbefristet.
Das Mietverhältnis kann mit einer Frist von drei Monaten gekündigt werden.
Eine Untervermietung bedarf der Zustimmung des Vermieters.
"""


def test_extract_financial_fields():
    fields = _extract_heuristic(SAMPLE, [(1, SAMPLE)])
    assert fields["monthly_rent"] == 850
    assert fields["utilities"] == 180
    assert fields["deposit"] == 1700


def test_extract_contract_type_unlimited():
    assert _detect_contract_type(SAMPLE) == "unlimited"


def test_extract_contract_type_limited():
    assert _detect_contract_type("Das Mietverhältnis ist befristet.") == "limited"


def test_extract_notice_period():
    assert _notice_period("Die Kündigungsfrist beträgt 3 Monate.") == "3 Monat"
    assert _notice_period("Notice period of three months.") is not None


def test_extract_subletting_required():
    fields = _extract_heuristic(SAMPLE, [(1, SAMPLE)])
    assert fields["subletting_allowed"] is True  # consent required clause present
