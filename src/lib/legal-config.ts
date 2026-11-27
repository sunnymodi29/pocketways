/** Facts the legal pages quote. Edit here, not in the pages. */
export const LEGAL = {
  product: "Pocketways",
  /** Who runs the service. Change to your registered name or company. */
  operator: "the Pocketways team",
  /** Shown as the contact and grievance address. Set NEXT_PUBLIC_CONTACT_EMAIL in the environment. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  /** When these documents last changed in substance. */
  updated: "27 November 2026",
  effective: "27 November 2026",
  jurisdiction: "India",
  /** How long poll data is kept (see src/lib/poll.ts). */
  pollRetentionDays: 60,
} as const;
