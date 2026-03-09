#!/usr/bin/env python3
"""Document parser using kreuzberg - extracts text from 75+ file formats.

Usage:
    python parse_document.py document.pdf
    python parse_document.py document.pdf --markdown
    python parse_document.py document.pdf --markdown -o output.md
    python parse_document.py *.pdf --output-dir ./extracted/
    python parse_document.py scanned.pdf --ocr --lang eng+vie
    python parse_document.py document.pdf --metadata --json
"""

import argparse
import json
import sys
from pathlib import Path


def check_installation():
    """Verify kreuzberg and optional dependencies are available."""
    checks = []

    try:
        import kreuzberg
        checks.append(("kreuzberg", True, kreuzberg.__version__ if hasattr(kreuzberg, "__version__") else "installed"))
    except ImportError:
        checks.append(("kreuzberg", False, "pip install kreuzberg"))

    import shutil

    if shutil.which("tesseract"):
        checks.append(("tesseract", True, "available"))
    else:
        checks.append(("tesseract", False, "brew install tesseract (optional, for OCR)"))

    if shutil.which("libreoffice") or shutil.which("soffice"):
        checks.append(("libreoffice", True, "available"))
    else:
        checks.append(("libreoffice", False, "brew install --cask libreoffice (optional, for .doc/.ppt/.xls)"))

    if shutil.which("pandoc"):
        checks.append(("pandoc", True, "available"))
    else:
        checks.append(("pandoc", False, "brew install pandoc (optional, extra format support)"))

    # Check gmft for table extraction
    try:
        import gmft  # noqa: F401
        checks.append(("gmft", True, "available"))
    except ImportError:
        checks.append(("gmft", False, "pip install gmft (optional, for table extraction)"))

    print("kreuzberg dependency check:")
    print("-" * 50)
    all_ok = True
    for name, ok, info in checks:
        status = "OK" if ok else "MISSING"
        icon = "+" if ok else "-"
        print(f"  [{icon}] {name}: {status} — {info}")
        if name == "kreuzberg" and not ok:
            all_ok = False

    if all_ok:
        print("\nReady to parse documents.")
    else:
        print("\nInstall required: pip install kreuzberg")
        sys.exit(1)


def build_config(args):
    """Build ExtractionConfig from CLI arguments.

    kreuzberg v3.x ExtractionConfig params:
        force_ocr, chunk_content, extract_tables, max_chars, max_overlap,
        ocr_backend, ocr_config, gmft_config, post_processing_hooks, validators
    """
    from kreuzberg import ExtractionConfig

    kwargs = {}

    # OCR
    if args.ocr or args.force_ocr:
        kwargs["ocr_backend"] = "tesseract"
        if args.lang and args.lang != "eng":
            from kreuzberg import TesseractConfig
            kwargs["ocr_config"] = TesseractConfig(language=args.lang)

    if args.force_ocr:
        kwargs["force_ocr"] = True

    return ExtractionConfig(**kwargs)


def extract_one(file_path, config, include_metadata=False):
    """Extract content from a single file. Returns dict with content and optional metadata."""
    from kreuzberg import extract_file_sync

    path = Path(file_path).resolve()
    if not path.exists():
        return {"error": f"File not found: {file_path}"}
    if not path.is_file():
        return {"error": f"Not a file: {file_path}"}

    try:
        result = extract_file_sync(str(path), config=config)
    except Exception as e:
        error_msg = str(e)
        if "tesseract" in error_msg.lower():
            error_msg += "\nHint: Install Tesseract OCR: brew install tesseract"
        elif "libreoffice" in error_msg.lower() or "soffice" in error_msg.lower():
            error_msg += "\nHint: Install LibreOffice: brew install --cask libreoffice"
        elif "pandoc" in error_msg.lower():
            error_msg += "\nHint: Install Pandoc: brew install pandoc"
        return {"error": f"Extraction failed for {file_path}: {error_msg}"}

    output = {
        "file": str(path.name),
        "file_path": str(path),
        "content": result.content,
        "mime_type": result.mime_type,
    }

    if include_metadata and result.metadata:
        output["metadata"] = dict(result.metadata)

    return output


def format_as_markdown(result, include_metadata=False):
    """Format extraction result as a markdown document."""
    parts = []
    filename = result["file"]
    parts.append(f"# {filename}\n")

    if include_metadata and "metadata" in result and result["metadata"]:
        parts.append("## Metadata\n")
        for k, v in result["metadata"].items():
            if v is not None and v != "":
                parts.append(f"- **{k}**: {v}")
        parts.append("")

    parts.append("## Content\n")
    parts.append(result["content"])

    return "\n".join(parts)


def format_as_plain(result, include_metadata=False):
    """Format extraction result as plain text."""
    parts = []

    if include_metadata and "metadata" in result and result["metadata"]:
        parts.append(f"--- Metadata: {result['file']} ---")
        for k, v in result["metadata"].items():
            if v is not None and v != "":
                parts.append(f"  {k}: {v}")
        parts.append("---\n")

    parts.append(result["content"])
    return "\n".join(parts)


def format_output(result, as_json=False, as_markdown=False, include_metadata=False):
    """Format a single extraction result for display."""
    if "error" in result:
        return result["error"]

    if as_json:
        return json.dumps(result, indent=2, ensure_ascii=False, default=str)

    if as_markdown:
        return format_as_markdown(result, include_metadata=include_metadata)

    return format_as_plain(result, include_metadata=include_metadata)


def main():
    parser = argparse.ArgumentParser(
        description="Extract text from documents using kreuzberg (75+ formats supported).",
        epilog="Examples:\n"
               "  %(prog)s document.pdf\n"
               "  %(prog)s document.pdf --markdown\n"
               "  %(prog)s document.pdf -m -o output.md\n"
               "  %(prog)s *.pdf --output-dir ./extracted/\n"
               "  %(prog)s scanned.pdf --ocr --lang eng+vie\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("files", nargs="*", help="Document file(s) to parse")
    parser.add_argument("-m", "--markdown", action="store_true", help="Output as markdown with document structure")
    parser.add_argument("-o", "--output", help="Write output to file")
    parser.add_argument("--output-dir", help="Write each file's output to this directory")
    parser.add_argument("--ocr", action="store_true", help="Enable OCR for scanned documents/images")
    parser.add_argument("--force-ocr", action="store_true", help="Force OCR even on text-based PDFs")
    parser.add_argument("--lang", default="eng", help="OCR language codes (default: eng)")
    parser.add_argument("--metadata", action="store_true", help="Include document metadata")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output as JSON")
    parser.add_argument("--check", action="store_true", help="Check installation and dependencies")

    args = parser.parse_args()

    if args.check:
        check_installation()
        return

    if not args.files:
        parser.print_help()
        sys.exit(1)

    try:
        import kreuzberg  # noqa: F401
    except ImportError:
        print("kreuzberg is not installed. Run: pip install kreuzberg", file=sys.stderr)
        sys.exit(1)

    config = build_config(args)
    results = []

    for file_path in args.files:
        result = extract_one(file_path, config, include_metadata=args.metadata)
        if "error" in result:
            print(result["error"], file=sys.stderr)
        else:
            results.append(result)

    if not results:
        sys.exit(1)

    fmt_kwargs = dict(as_json=args.as_json, as_markdown=args.markdown, include_metadata=args.metadata)

    # Output: directory mode
    if args.output_dir:
        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        ext = ".json" if args.as_json else (".md" if args.markdown else ".txt")
        for result in results:
            source_name = Path(result["file"]).stem
            out_path = out_dir / f"{source_name}{ext}"
            out_path.write_text(format_output(result, **fmt_kwargs), encoding="utf-8")
            print(f"Wrote: {out_path}", file=sys.stderr)
        return

    # Output: single file mode
    if args.output:
        all_output = []
        for i, result in enumerate(results):
            if len(results) > 1 and i > 0:
                all_output.append(f"\n---\n")
            all_output.append(format_output(result, **fmt_kwargs))
        Path(args.output).write_text("\n".join(all_output), encoding="utf-8")
        print(f"Wrote: {args.output}", file=sys.stderr)
        return

    # Output: stdout
    if args.as_json and len(results) > 1:
        print(json.dumps(results, indent=2, ensure_ascii=False, default=str))
    else:
        for i, result in enumerate(results):
            if len(results) > 1 and i > 0:
                print("\n---\n")
            print(format_output(result, **fmt_kwargs))


if __name__ == "__main__":
    main()
