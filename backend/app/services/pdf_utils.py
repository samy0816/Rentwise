"""PDF text extraction helpers.

Uses pypdf (fast, dependency-light) with a fallback to pdfplumber for better
layout-aware extraction on some documents. If a PDF contains no extractable text
it is treated as a scanned/image-only document and reported as unsupported.
"""
from __future__ import annotations

from pathlib import Path


class ScannedPdfError(Exception):
    """Raised when a PDF has no extractable text (scanned/image-only)."""


def extract_pdf_text(path: Path, max_pages: int | None = None) -> tuple[str, int]:
    """Extract all text from a PDF.

    Returns `(text, page_count)`. Raises `ScannedPdfError` when the document
    holds no extractable text.
    """
    pages = extract_pdf_pages(path, max_pages=max_pages)
    combined = "\n\n".join(t for _, t in pages)
    page_count = len(pages)
    if not combined.strip():
        raise ScannedPdfError(
            "No extractable text found. The document may be a scanned image, "
            "which is not currently supported."
        )
    return combined, page_count


def extract_pdf_pages(
    path: Path, max_pages: int | None = None
) -> list[tuple[int, str]]:
    """Extract text per page.

    Returns a list of `(page_number, text)` tuples (1-indexed). Raises
    `ScannedPdfError` when there is no extractable text at all.
    """
    try:
        from pypdf import PdfReader
    except Exception as exc:  # pragma: no cover - dependency guard
        raise RuntimeError("PDF library (pypdf) is not installed.") from exc

    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages):
        if max_pages and i >= max_pages:
            break
        page_text = page.extract_text() or ""
        pages.append((i + 1, page_text))

    combined = "\n\n".join(t for _, t in pages)
    if not combined.strip():
        # Try pdfplumber as a fallback before giving up.
        pages = _pdfplumber_pages(path, max_pages)
        combined = "\n\n".join(t for _, t in pages)
    if not combined.strip():
        raise ScannedPdfError(
            "No extractable text found. The document may be a scanned image, "
            "which is not currently supported."
        )
    return pages


def _pdfplumber_pages(path: Path, max_pages: int | None = None) -> list[tuple[int, str]]:
    try:
        import pdfplumber  # type: ignore
    except Exception:
        return []
    pages: list[tuple[int, str]] = []
    try:
        with pdfplumber.open(str(path)) as pdf:
            for i, page in enumerate(pdf.pages):
                if max_pages and i >= max_pages:
                    break
                text = page.extract_text() or ""
                pages.append((i + 1, text))
    except Exception:
        return []
    return pages
