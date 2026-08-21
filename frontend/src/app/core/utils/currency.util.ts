export function formatClp(priceClp: number): string {
  return `$${priceClp.toLocaleString('es-CL')}`;
}
