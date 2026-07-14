export function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function buildDirectWhatsAppUrl({
  number,
  message,
}: {
  number: string;
  message?: string;
}) {
  const normalizedNumber = normalizeWhatsAppNumber(number);

  if (!normalizedNumber) return "#";

  const query = message
    ? `?text=${encodeURIComponent(message)}`
    : "";

  return `https://wa.me/${normalizedNumber}${query}`;
}
