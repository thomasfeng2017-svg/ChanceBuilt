/**
 * How client code tells the header its numbers changed.
 *
 * The header no longer reads cookies on the server (that made every page
 * dynamic and every bot hit a function invocation). It reads them in the
 * browser after the page paints. So when something changes the cart or the
 * garage, it says so here and the header re-reads. Cheaper and more direct
 * than routing a cart badge through the router.
 */
export const CHROME_EVENT = "chrome:refresh";

export function notifyChrome() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHROME_EVENT));
}
