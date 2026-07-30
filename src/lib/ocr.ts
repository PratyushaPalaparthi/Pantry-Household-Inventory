import { createWorker } from "tesseract.js";

// Defaults to English only to keep the language-pack download small. Receipts
// mixing in other scripts (Vietnamese, Chinese, ...) need the matching
// Tesseract language codes added via OCR_LANGUAGES, e.g. "eng+vie+chi_sim".
export async function extractText(buffer: Buffer): Promise<string> {
  const languages = process.env.OCR_LANGUAGES || "eng";
  const worker = await createWorker(languages);
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
