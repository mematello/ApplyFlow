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
  const lowerText = trimmed.toLowerCase();
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
    if (lowerText.includes(pattern)) {
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
