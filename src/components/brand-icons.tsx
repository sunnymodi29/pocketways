import { cn } from "@/lib/utils";

type P = { className?: string };
/** overflow-visible + a 1px viewBox margin keep glyph tips (like the WhatsApp tail) from being clipped */
const base = "size-4 shrink-0 overflow-visible";

/** WhatsApp glyph (Simple Icons, CC0). Takes the text colour, so it works on the green button and on outline buttons. */
export function WhatsAppIcon({ className }: P) {
  return (
    <svg viewBox="-1 -1 26 26" fill="currentColor" aria-hidden="true" className={cn(base, className)}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/** Google "G" in its four brand colours. */
export function GoogleIcon({ className }: P) {
  return (
    <svg viewBox="-1 -1 26 26" aria-hidden="true" className={cn(base, className)}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.77H1.4v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.36 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.4a12 12 0 0 0 0 10.82l3.96-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.4 6.59l3.96 3.09A7.2 7.2 0 0 1 12 4.75Z" />
    </svg>
  );
}

/** Simplified Google Calendar mark: blue calendar page with "31". */
export function GoogleCalendarIcon({ className }: P) {
  return (
    <svg viewBox="-1 -1 26 26" aria-hidden="true" className={cn(base, className)}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" stroke="#4285F4" strokeWidth="1.6" />
      <path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3H3z" fill="#4285F4" />
      <path d="M21 15v3a3 3 0 0 1-3 3h-3v-6z" fill="#34A853" opacity=".9" />
      <path d="M3 15h5v6H6a3 3 0 0 1-3-3z" fill="#FBBC05" opacity=".9" />
      <text x="12" y="17.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#4285F4" fontFamily="Arial, Helvetica, sans-serif">31</text>
    </svg>
  );
}