---
name: hd-docs-parse
description: Parse and extract text from documents (PDF, DOCX, XLSX, PPTX, images, emails, HTML, eBooks, archives, and 75+ formats) using kreuzberg. Use this skill whenever the user wants to extract text content from any document file, convert documents to markdown or plain text, OCR scanned documents or images, batch-process multiple files, or needs document content for analysis. Triggers on any mention of parsing, extracting, reading, or converting document files.
license: proprietary
metadata:
  version: "1.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Document Parser Skill

> **[IMPORTANT]** This skill is a TOOL skill — it runs a Python script to extract text from files.
> It does NOT analyze or summarize content. For image/audio/video analysis, use `hd-look-at` instead.
> For document content that needs further processing (summarization, translation, comparison), chain with the appropriate skill after extraction.

Extract text content from 75+ document formats using [kreuzberg](https://github.com/kreuzberg-dev/kreuzberg), a high-performance document intelligence framework with a Rust core.

## Pipeline

```
INPUT → Arg Parse → Dependency Check → Extract → Format → Output
```

| Phase               | Purpose                                    | Output                  |
| ------------------- | ------------------------------------------ | ----------------------- |
| 0. Arg Parse        | Parse invocation, resolve files and options | Validated arguments     |
| 1. Dependency Check | Verify kreuzberg + optional deps installed | Ready / install hints   |
| 2. Extract          | Run kreuzberg on each file                 | Raw content + metadata  |
| 3. Format           | Convert to plain text / markdown / JSON    | Formatted output        |
| 4. Output           | Write to stdout / file / directory         | Final deliverable       |

---

## Phase 0: Arg Parse

Parse the invocation:

```
/hd-docs-parse <file(s)> [options]
```

| Argument | Required | Default | Notes |
|----------|----------|---------|-------|
| `<file(s)>` | Yes | — | One or more file paths or glob patterns |
| `--markdown`, `-m` | No | plain text | Output as markdown (preserves headings, lists, tables) |
| `--output`, `-o` | No | stdout | Write result to a single file |
| `--output-dir` | No | — | Write each file's result to a directory |
| `--ocr` | No | off | Enable OCR for scanned docs/images |
| `--force-ocr` | No | off | Force OCR even on text-based PDFs |
| `--lang` | No | `eng` | OCR language codes (e.g., `eng`, `vie+eng`) |
| `--metadata` | No | off | Include document metadata in output |
| `--json` | No | — | Output as JSON (content + metadata) |
| `--check` | No | — | Verify installation and dependencies |
| `--cache` | No | off | Enable result caching (speeds up repeated extractions) |

### Natural Language Resolution

If the user's request is conversational, extract intent:

| Pattern | Example | Resolution |
|---------|---------|------------|
| "extract text from X" | "extract text from report.pdf" | `FILES=report.pdf` |
| "convert X to markdown" | "convert proposal.docx to markdown" | `FILES=proposal.docx --markdown` |
| "OCR this image" | "OCR this scan.png" | `FILES=scan.png --ocr` |
| "parse all PDFs in folder" | "parse all PDFs in ./docs/" | `FILES=./docs/*.pdf` |
| "read this spreadsheet" | "read budget.xlsx" | `FILES=budget.xlsx` |
| "what's in this file" | "what's in contract.pdf" | `FILES=contract.pdf --markdown` |

After resolving, run the script with the determined arguments.

---

## Phase 1: Dependency Check

Before first use or if extraction fails, verify setup:

```bash
python scripts/parse_document.py --check
```

This checks:

| Dependency | Required | Purpose |
|------------|----------|---------|
| `kreuzberg` | Yes | Core extraction engine |
| `tesseract` | No | OCR for scanned docs/images |
| `libreoffice` | No | Legacy Office formats (.doc, .ppt, .xls) |
| `pandoc` | No | Extra format support |
| `gmft` | No | Table extraction |

### Setup Commands

```bash
# Core (required)
pip install kreuzberg

# OCR support (optional — for scanned PDFs, images)
brew install tesseract          # macOS
pip install "kreuzberg[easyocr]" # alternative OCR backend

# Legacy Office formats (optional — for .doc, .ppt, .xls)
brew install --cask libreoffice
```

---

## Phase 2: Extract

Run the script on the resolved file(s):

```bash
# Single file
python scripts/parse_document.py document.pdf

# Multiple files
python scripts/parse_document.py file1.pdf file2.docx file3.xlsx

# With OCR
python scripts/parse_document.py scanned.pdf --ocr

# OCR with language hint
python scripts/parse_document.py scanned.pdf --ocr --lang vie+eng

# Force OCR even on text PDFs
python scripts/parse_document.py document.pdf --force-ocr
```

### Supported Formats

| Category | Extensions |
|---|---|
| PDF & eBooks | `.pdf`, `.epub`, `.fb2` |
| Office (modern) | `.docx`, `.xlsx`, `.xlsm`, `.pptx`, `.ppsx`, `.odt`, `.ods` |
| Office (legacy) | `.doc`, `.ppt`, `.xls` (needs LibreOffice) |
| Images (OCR) | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tiff`, `.svg` |
| Web & Data | `.html`, `.htm`, `.xml`, `.json`, `.yaml`, `.csv`, `.tsv` |
| Text & Markup | `.txt`, `.md`, `.rst`, `.org`, `.rtf` |
| Email | `.eml`, `.msg` (with attachments) |
| Archives | `.zip`, `.tar`, `.gz`, `.7z` (recursive extraction) |
| Academic | `.bib`, `.tex`, `.ipynb` |

---

## Phase 3: Format

Choose output format based on use case:

| Format | Flag | Best For |
|--------|------|----------|
| Plain text | (default) | Piping to other tools, simple content |
| Markdown | `--markdown` | Preserves headings, lists, tables — best for reading and further AI processing |
| JSON | `--json` | Programmatic access to content + metadata |

### Show Metadata

```bash
python scripts/parse_document.py document.pdf --metadata
```

Returns: page count, author, creation date, title, and other document properties.

---

## Phase 4: Output

| Mode | Flag | Behavior |
|------|------|----------|
| Stdout | (default) | Print to terminal — use for single files or piping |
| Single file | `-o output.md` | Write all results to one file (separator between multi-file) |
| Directory | `--output-dir ./extracted/` | One output file per input file, auto-named |

```bash
# Save to file
python scripts/parse_document.py document.pdf --markdown -o output.md

# Batch → output directory
python scripts/parse_document.py *.pdf --markdown --output-dir ./extracted/
```

---

## Scripts

- **`parse_document.py`**: CLI tool that wraps kreuzberg for text extraction from 75+ formats. Handles single/batch files, OCR with language hints, markdown/JSON/plain text output, metadata extraction, and directory-mode output. Includes dependency checker (`--check`) and clear error messages with install hints.

---

## Usage from Python (inline)

When the script isn't needed, use kreuzberg directly:

```python
from kreuzberg import extract_file_sync

# Plain text extraction
result = extract_file_sync("document.pdf")
print(result.content)

# Markdown extraction
from kreuzberg import ExtractionConfig
config = ExtractionConfig(output_format="markdown")
result = extract_file_sync("document.pdf", config=config)
print(result.content)
```

---

## Skill Integration

Chain `hd-docs-parse` with other skills for end-to-end workflows:

| After Extraction | Chain With | Example |
|------------------|------------|---------|
| Summarize content | Direct AI analysis | Extract → ask Claude to summarize |
| Analyze images/diagrams in doc | `hd-look-at` | For visual content that OCR can't handle well |
| Create documentation from source | `hd-docs-init` | Extract specs → generate project docs |
| Review extracted code snippets | `hd-code-review` | Extract from PDF → review embedded code |
| Plan feature from spec | `hd-planning` | Extract requirements doc → plan implementation |
| Estimate from requirements doc | `hd-estimation` | Extract RFP/spec → produce ballpark estimate |

---

## Limits

| Constraint | Limit | Notes |
|------------|-------|-------|
| Max file size | System memory dependent | Large files (>500MB) may need chunking |
| OCR accuracy | Depends on scan quality | 300 DPI+ recommended for scanned docs |
| OCR languages | Tesseract language packs | Install additional packs: `brew install tesseract-lang` |
| Archive depth | Recursive | Nested archives extracted fully |
| Legacy Office | Requires LibreOffice | `.doc`, `.ppt`, `.xls` need external converter |
| Concurrent files | Sequential processing | Files processed one at a time |

---

## Error Handling

The script prints clear error messages for common issues:

| Error | Message | Fix |
|-------|---------|-----|
| Missing file | "File not found: `<path>`" | Check file path |
| Missing kreuzberg | Install instructions | `pip install kreuzberg` |
| Missing OCR engine | Tesseract hint | `brew install tesseract` |
| Missing LibreOffice | LibreOffice hint | `brew install --cask libreoffice` |
| Unsupported format | Lists supported formats | Check format table above |

---

## Resources

- [kreuzberg GitHub](https://github.com/kreuzberg-dev/kreuzberg) — Source, API docs, changelog
- [kreuzberg PyPI](https://pypi.org/project/kreuzberg/) — Installation and version info
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) — OCR engine documentation
- [Tesseract Language Packs](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html) — Available language codes

---

## Common Mistakes

- **Using this for image analysis** → This extracts text via OCR. For describing image content, use `hd-look-at`
- **Forgetting `--ocr` for scanned PDFs** → Without it, scanned pages return empty content
- **Wrong language for OCR** → Vietnamese docs need `--lang vie` or `--lang vie+eng`
- **Expecting formatted tables from plain text mode** → Use `--markdown` to preserve table structure
- **Parsing huge archives without `--output-dir`** → Stdout becomes unwieldy; use directory output for batch jobs
- **Not checking dependencies first** → Run `--check` before first use to avoid cryptic errors

---

## Quick Reference

```
/hd-docs-parse report.pdf                         — extract text to stdout
/hd-docs-parse report.pdf --markdown              — extract as markdown
/hd-docs-parse report.pdf -m -o output.md         — extract markdown to file
/hd-docs-parse *.pdf --output-dir ./extracted/    — batch extract to directory
/hd-docs-parse scan.png --ocr                     — OCR an image
/hd-docs-parse scan.pdf --ocr --lang vie+eng      — OCR with Vietnamese + English
/hd-docs-parse report.pdf --force-ocr             — force OCR on text PDF
/hd-docs-parse report.pdf --metadata --json       — full metadata as JSON
/hd-docs-parse --check                            — verify dependencies
/hd-docs-parse report.pdf --cache                — enable caching for repeated extractions
```
