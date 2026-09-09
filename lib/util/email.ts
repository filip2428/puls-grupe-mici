/**
 * Verificare simplă de adresă - cât să prindem greșelile de tastare.
 *
 * Stă aici, nu în `lib/email.ts`, ca s-o poată folosi și un script din
 * `scripturi/` - acela e server-only, pentru că trimite email-uri.
 */
export function emailValid(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
}
