/** Formatea un entero de pesos MXN a texto: 1830 -> "$1,830.00 MXN". */
export function formatMxn(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}
