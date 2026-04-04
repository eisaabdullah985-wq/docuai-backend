# Data Extraction API

## Description

An intelligent document processing API that accepts PDF, DOCX, and image files as base64-encoded strings, extracts their text content, and uses Claude AI to generate summaries, extract named entities, and classify document sentiment — all in a single synchronous API call.

---

## Tech Stack

- **Language / Framework**: Node.js + Express.js
- **PDF extraction**: `pdf-parse` + OCR fallback using `pdf-poppler` + `tesseract.js`
- **DOCX extraction**: `mammoth`
- **OCR (images)**: `tesseract.js`
- **Image preprocessing**: `sharp`
- **LLM / AI model**: Anthropic Claude (`claude-opus-4-5`) via `@anthropic-ai/sdk`
- **Logging**: Winston

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/docuai-backend.git
cd docuai-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
PORT=5000
ANTHROPIC_API_KEY=your_anthropic_api_key_here
API_KEY=sk_track2_987654321
AI_MODEL=claude-opus-4-5
TESSERACT_LANG=eng
```

### 4. Run the application

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:5000`.

---

## API Usage

### Endpoint

```
POST /api/document-analyze
```

### Authentication

All requests must include a valid API key in the header:

```
x-api-key: YOUR_API_KEY
```

Requests without a valid key receive `401 Unauthorized`.

### Request Body

```json
{
  "fileName": "sample.pdf",
  "fileType": "pdf",
  "fileBase64": "<base64 encoded file content>"
}
```

| Field | Required | Description |
|---|---|---|
| `fileName` | ✅ | Original file name |
| `fileType` | ✅ | `pdf`, `docx`, or `image` |
| `fileBase64` | ✅ | Base64-encoded file content |

### cURL Example

```bash
# Encode your file
BASE64=$(base64 -w 0 sample.pdf)

curl -X POST https://your-domain.com/api/document-analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_track2_987654321" \
  -d "{\"fileName\": \"sample.pdf\", \"fileType\": \"pdf\", \"fileBase64\": \"$BASE64\"}"
```

### Success Response

```json
{
  "status": "success",
  "fileName": "sample1.pdf",
  "summary": "This document is an invoice issued by ABC Pvt Ltd to Ravi Kumar on 10 March 2026 for an amount of ₹10,000.",
  "entities": {
    "names": ["Ravi Kumar"],
    "dates": ["10 March 2026"],
    "organizations": ["ABC Pvt Ltd"],
    "amounts": ["₹10,000"]
  },
  "sentiment": "Neutral"
}
```

### Error Responses

| Status | Scenario |
|---|---|
| `400` | Missing or invalid fields |
| `401` | Missing or invalid `x-api-key` |
| `422` | No text could be extracted from the file |
| `429` | Rate limit exceeded (30 req/min) |
| `500` | Internal server error |

---

## Architecture Overview

The system follows a modular API-first architecture:

1. **Client Request Layer**
   - Accepts a single base64-encoded file via REST API
   - Validates request fields and API key authentication

2. **Document Extraction Layer**
   - **PDF**: Attempts direct text extraction using `pdf-parse`
   - **Scanned/Image-based PDF**: Falls back to OCR via `pdf-poppler` + `tesseract.js`
   - **DOCX**: Extracts structured text using `mammoth`
   - **Images**: Uses OCR with preprocessing (`sharp`) and `tesseract.js`

3. **AI Analysis Layer**
   - Sends extracted text to Claude for:
     - summary generation
     - named entity extraction
     - sentiment classification

4. **Response Layer**
   - Normalizes and validates AI output
   - Returns clean JSON response in hackathon-specified format

### High-Level Flow

`Base64 File Input → Validation → Text Extraction / OCR → Claude Analysis → JSON Response`

## AI Tools Used

The following AI tools were used during development and implementation:

- **Anthropic Claude API**  
  Used in the application itself for:
  - document summarization
  - entity extraction
  - sentiment analysis

- **ChatGPT**  
  Used as a development assistant for:
  - architecture planning
  - OCR improvement strategy
  - prompt engineering refinement
  - code review and debugging support

No hardcoded outputs, pre-mapped answers, or test-case-specific logic were used. All document analysis results are generated dynamically from extracted file content.

## Known Limitations

- OCR quality depends on image clarity, resolution, and scan quality.
- Very large or heavily scanned PDFs may take longer to process.
- PDF OCR fallback relies on system-level PDF rendering support (`pdf-poppler`), which may require additional configuration in some deployment environments.
- Extremely noisy or low-resolution documents may produce partial extraction errors.
- The current implementation processes one document per request synchronously for hackathon simplicity.


## Approach

### Text Extraction Strategy

- **PDF** — `pdf-parse` reads the PDF binary buffer directly and extracts the underlying text layer. Works on most electronically generated PDFs.
- **DOCX** — `mammoth` parses the Open XML format and extracts clean plain text, preserving paragraph and heading structure.
- **Images** — `tesseract.js` runs OCR entirely in-process (no external API). Before OCR, images are preprocessed with `sharp` (grayscale, normalization, sharpening) to improve text recognition accuracy on noisy scans, screenshots, receipts, and mobile-captured documents.

All extractors accept base64 input, decode it to a `Buffer`, and return clean plain text with normalised whitespace.

### AI Analysis Strategy

A single Claude API call performs all three analysis tasks simultaneously:

1. **Summary** — Claude generates a concise 2–4 sentence factual summary covering the document's main purpose and key details.

2. **Entity Extraction** — Claude identifies and categorises:
   - `names` — human person names
   - `dates` — all date and time references
   - `organizations` — companies, institutions, brands, government bodies
   - `amounts` — monetary values, percentages, quantities with units

3. **Sentiment Classification** — Claude judges the overall tone as `Positive`, `Neutral`, or `Negative` based on the document's language and purpose (e.g. invoices → Neutral, complaints → Negative, commendation letters → Positive).

The prompt instructs Claude to return a strict JSON structure. The response is validated and normalised before returning to the client, so malformed AI output never reaches the consumer.

### Why a single synchronous call?
 
The hackathon requires one POST → one JSON response. All processing (extraction + AI) happens in the request lifecycle. For large files, Tesseract OCR is the slowest step (~5–15s). Claude analysis typically takes 2–5s.