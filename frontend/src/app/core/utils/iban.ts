export function normalizeIban(value: string): string {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let digits = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    digits += code >= 65 && code <= 90 ? (code - 55).toString() : ch;
  }

  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    const chunk = remainder.toString() + digits.substring(i, i + 7);
    remainder = Number(chunk) % 97;
  }
  return remainder === 1;
}
