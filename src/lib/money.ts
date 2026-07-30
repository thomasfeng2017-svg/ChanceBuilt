const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as USD. All money in this app is stored in cents. */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}
