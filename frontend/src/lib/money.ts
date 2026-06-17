/** Formatea pesos MXN: 1830 -> "$1,830". */
export function formatMxn(amount: number, withDecimals = false): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);
}
