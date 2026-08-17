export function normalizeTitleCase(str: string): string {
  if (!str) return "";
  return str
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function normalizeSalaryInput(str: string): string {
  if (!str) return "";
  
  // Clean string by removing commas, currency symbols, and extra spaces
  const cleaned = str.replace(/[₱$€£,]/g, '').trim();

  // Check for range pattern
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map(p => p.trim());
    if (parts.length === 2 && parts[0] !== "" && parts[1] !== "") {
      const min = Number(parts[0]);
      const max = Number(parts[1]);
      
      if (!isNaN(min) && !isNaN(max)) {
        return `${min.toLocaleString('en-US')} - ${max.toLocaleString('en-US')}`;
      }
    }
  } else {
    // Check for single number
    if (cleaned !== "") {
      const val = Number(cleaned);
      if (!isNaN(val)) {
        return val.toLocaleString('en-US');
      }
    }
  }

  // If we couldn't parse it as a number/range, return original trimmed
  return str.trim();
}
