export function formatOrderNumber(orderNumber: string) {
  const shortCode = orderNumber.split("-").at(-1);

  return shortCode ? `#${shortCode}` : orderNumber;
}
