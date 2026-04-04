const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { AI_TEXT_CHAR_LIMIT, DEFAULT_MODEL } = require('../config/constants');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function truncate(text) {
  if (text.length <= AI_TEXT_CHAR_LIMIT) return text;
  const half = Math.floor(AI_TEXT_CHAR_LIMIT / 2);
  return (
    text.slice(0, half) +
    '\n\n[... content truncated for length ...]\n\n' +
    text.slice(text.length - half)
  );
}

async function analyseDocument(text, fileType) {
  const safeText = truncate(text);
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  const prompt = `
You are an expert intelligent document analysis system.

Your task is to analyze extracted text from a ${fileType.toUpperCase()} document and return a STRICT JSON response.

The document may be one of the following:
- invoice
- receipt
- business letter
- complaint letter
- application form
- government or institutional notice
- resume / CV
- certificate
- report
- offer letter
- semi-structured administrative document

You must infer structure even if the text is noisy due to OCR.

IMPORTANT EXTRACTION GOALS:
- Understand headers, sender/receiver info, totals, dates, names, references, and document purpose.
- Treat OCR noise intelligently.
- Prefer factual extraction over guessing.
- Preserve important field-value relationships where possible.

DOCUMENT TEXT:
---
${safeText}
---

Return ONLY valid JSON. No markdown, no explanations, no comments.

Use this EXACT structure:

{
  "summary": "<A concise 2-4 sentence factual summary of the document's purpose, parties involved, and key details>",
  "entities": {
    "names": ["<every human person name explicitly mentioned>"],
    "dates": ["<every date, year, month, deadline, or time period explicitly mentioned>"],
    "organizations": ["<every company, institution, government body, office, brand, school, or organisation explicitly mentioned>"],
    "amounts": ["<every monetary value, percentage, quantity, measurement, invoice total, subtotal, tax amount, or numeric value with unit explicitly mentioned>"]
  },
  "sentiment": "<exactly one of: Positive, Neutral, Negative>"
}

Rules:
- Return JSON only.
- Do NOT hallucinate missing values.
- If uncertain, omit rather than invent.
- If a category has no valid items, return [].
- Remove duplicates while preserving meaningful distinct values.
- Keep extracted values in the original document wording where possible.

Summary rules:
- 2 to 4 sentences only.
- Must explain what the document is about.
- Include the most important factual details such as sender, recipient, purpose, date, and amount if present.
- For invoices/receipts: mention issuer, customer, date, and amount if available.
- For letters/notices: mention sender, recipient, date, and purpose if available.
- For resumes/certificates/forms: mention person, institution, and core purpose if available.
- Do not add assumptions not supported by text.

Entity rules:
- names: only real human names, not company names.
- dates: include dates, years, months, quarters, billing periods, deadlines.
- organizations: include companies, institutions, departments, brands, agencies, schools, offices.
- amounts: include:
  - currency values (₹, $, €, etc.)
  - percentages
  - invoice totals
  - taxes
  - quantities with units
  - measurements
  - counts
  - IDs only if clearly numeric and meaningful in context

Sentiment rules:
- Most formal/business/administrative documents should be "Neutral".
- Use "Positive" only if the text clearly expresses praise, appreciation, achievement, congratulations, approval, or positive evaluation.
- Use "Negative" only if the text clearly expresses complaint, rejection, warning, dispute, loss, penalty, or dissatisfaction.
- When in doubt, choose "Neutral".

Return valid JSON only.
`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.text?.trim() ?? '{}';

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const result = JSON.parse(cleaned);

    return {
      summary: typeof result.summary === 'string' ? result.summary : '',
      entities: {
        names: Array.isArray(result.entities?.names) ? result.entities.names : [],
        dates: Array.isArray(result.entities?.dates) ? result.entities.dates : [],
        organizations: Array.isArray(result.entities?.organizations) ? result.entities.organizations : [],
        amounts: Array.isArray(result.entities?.amounts) ? result.entities.amounts : [],
      },
      sentiment: ['Positive', 'Neutral', 'Negative'].includes(result.sentiment)
        ? result.sentiment
        : 'Neutral',
    };
  } catch (err) {
    logger.error(`AI analysis failed: ${err.message}`);
    throw new Error(`AI analysis failed: ${err.message}`);
  }
}

module.exports = { analyseDocument };