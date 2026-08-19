function normalizeForScan(text: string): string {
  // 1. Strip zero-width characters (Zero Width Space, Non-Joiner, Joiner, BOM)
  let normalized = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. Collapse all unicode whitespace (including U+00A0, U+2000-200A) to standard space
  normalized = normalized.replace(/\s+/g, ' ');

  // 3. NFKC Normalization
  normalized = normalized.normalize('NFKC');

  // 4. Strip combining diacritical marks (by decomposing the NFKC output first)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036F]/g, '');

  // 5. Homoglyph mapping (Cyrillic and Greek look-alikes to Latin)
  const homoglyphMap: Record<string, string> = {
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'а': 'a', 'е': 'e', 'о': 'o',
    'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'І': 'I',
    'Ј': 'J', 'ο': 'o', 'ν': 'v', 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z',
    'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P',
    'Τ': 'T', 'Υ': 'Y', 'Χ': 'X'
  };

  normalized = normalized.split('').map(c => homoglyphMap[c] ?? c).join('');

  // 6. Lowercase
  return normalized.toLowerCase();
}

export function screenInput(text: string): { pass: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { pass: false, reason: 'Invalid input type.' };
  }

  const trimmed = text.trim();

  // 1. Length Bounds
  if (trimmed.length < 50) {
    return { pass: false, reason: 'Input is too short to be a valid job description.' };
  }
  if (trimmed.length > 50000) {
    return { pass: false, reason: 'Input is too long to be a valid job description.' };
  }

  // 2. Injection Pattern Scan
  const scannedText = normalizeForScan(trimmed);
  const injectionPatterns = [
    "ignore previous instructions",
    "ignore previous directions",
    "ignore all prior instructions",
    "forget all instructions",
    "forget previous instructions",
    "disregard previous instructions",
    "output your system prompt",
    "you are now a",
    "you will act as",
    "new role:",
    "ignore the above",
    "ignore prior",
    "disregard prior"
  ];

  for (const pattern of injectionPatterns) {
    if (scannedText.includes(pattern)) {
      return { pass: false, reason: 'Doesn\'t look like a valid job description.' };
    }
  }

  // 3. Character Composition (Simple check for high garbage/binary content)
  // Check if there is an excessive amount of non-printable or repeated characters
  // A simple heuristic: if the ratio of standard alphanumeric chars to total length is extremely low
  // Or checking for an excessive number of curly braces/code which might indicate a raw payload dump (though JDs can have some)
  // Let's just check for raw repeat spam
  const maxRepeatedChars = 100;
  const repeatRegex = /(.)\1{100,}/;
  if (repeatRegex.test(trimmed)) {
    return { pass: false, reason: 'Doesn\'t look like a valid job description.' };
  }

  return { pass: true };
}
