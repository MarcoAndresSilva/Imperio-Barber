/** `true` si el error es un P2002 de Prisma (violación de constraint único: slug,
 * whatsappPhone, la unique de un día libre repetido, etc.) — se traduce a 409. */
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}
