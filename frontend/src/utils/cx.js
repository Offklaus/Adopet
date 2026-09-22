/** Junta classes CSS ignorando valores falsos. */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
