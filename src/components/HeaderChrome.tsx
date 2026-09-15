"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GarageBar } from "./GarageBar";
import { GARAGE_COOKIE, GARAGE_BAR_COOKIE, parseVehicle, type Vehicle } from "@/lib/vehicle";
import { CHROME_EVENT } from "@/lib/chrome-events";

/**
 * The per-visitor parts of the header: cart badge, account name, garage bar.
 *
 * These used to be rendered on the server from cookies, which meant every page
 * on the site was rendered per request, which meant every request, bot or
 * human, ran a function and queried the database. Fourteen million bot
 * requests in one month turned that into a real bill and then a paused
 * project.
 *
 * Now the server renders the header once, with nothing personal in it, and
 * this fills the personal bits in after the page paints. The cart count and
 * the chosen vehicle come straight from cookies the browser can read, so they
 * appear within a frame. The account name needs a session lookup, so it comes
 * from one small API call. Bots do not run JavaScript, so for them none of this
 * happens at all.
 *
 * The cookie is treated as an external store, which is what it is. During
 * hydration React uses the server snapshot (null: "not read yet"), so the
 * markup matches what the server sent; then it re-renders with the real
 * cookie. Reading document.cookie in render any other way either breaks on the
 * server or produces a hydration mismatch.
 */

type Chrome = {
  cartCount: number;
  customerName: string | null;
  vehicle: Vehicle | null;
  barHidden: boolean;
  /** Cookies have been read at least once, so the garage bar can be trusted. */
  ready: boolean;
};

const EMPTY: Chrome = { cartCount: 0, customerName: null, vehicle: null, barHidden: false, ready: false };

const ChromeContext = createContext<Chrome>(EMPTY);

function subscribe(onChange: () => void) {
  // Anything that changes a cookie says so via notifyChrome. pageshow covers
  // coming back to a page from the back/forward cache with stale counts.
  window.addEventListener(CHROME_EVENT, onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener(CHROME_EVENT, onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

const readCookies = () => document.cookie;
const serverCookies = () => null;

function cookieValue(jar: string, name: string): string | null {
  const hit = jar.split("; ").find((c) => c.startsWith(`${name}=`));
  if (!hit) return null;
  const raw = hit.slice(name.length + 1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Mirror of the server-side cart parser, minus the database it imports. */
function cartCount(jar: string): number {
  const raw = cookieValue(jar, "cart");
  if (!raw) return 0;
  try {
    const lines = JSON.parse(raw) as unknown;
    if (!Array.isArray(lines)) return 0;
    return lines.reduce((sum: number, l) => {
      const q = (l as { quantity?: unknown })?.quantity;
      return sum + (typeof q === "number" && q > 0 ? q : 0);
    }, 0);
  } catch {
    return 0;
  }
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // null until hydrated, then the live cookie string. A primitive, so React's
  // equality check sees "unchanged" whenever nothing was written.
  const jar = useSyncExternalStore(subscribe, readCookies, serverCookies);

  const fromCookies = useMemo(() => {
    if (jar === null) return EMPTY;
    const garage = cookieValue(jar, GARAGE_COOKIE);
    return {
      cartCount: cartCount(jar),
      vehicle: garage ? parseVehicle(garage) : null,
      barHidden: cookieValue(jar, GARAGE_BAR_COOKIE) === "1",
      ready: true,
    };
  }, [jar]);

  // The session cookie is httpOnly, so who is signed in has to come from the
  // server. One request per page view, none for anything that does not run
  // JavaScript. Re-asked on navigation, since signing in and out both redirect.
  const [customerName, setCustomerName] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    fetch("/api/chrome", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { customerName: string | null } | null) => {
        if (!off && d) setCustomerName(d.customerName);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [pathname]);

  const value = useMemo<Chrome>(
    () => ({ ...EMPTY, ...fromCookies, customerName }),
    [fromCookies, customerName],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export const useChrome = () => useContext(ChromeContext);

export function CartLink() {
  const { cartCount } = useChrome();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
      className="focus-ring flex items-center gap-2 rounded border border-line px-3.5 py-2.5 text-sm font-semibold transition-colors hover:border-line-hi"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h2l2.6 12.4A2 2 0 0 0 9.6 18h8.2a2 2 0 0 0 2-1.6L21.5 8H6" />
        <circle cx="10" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
      {cartCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">
          {cartCount}
        </span>
      )}
    </Link>
  );
}

/**
 * Signed out this reads "Sign in", which is a weaker invitation than "Create
 * an account" but the right one: someone who already has an account should
 * not have to hunt, and the register page is one click from the sign-in page.
 */
export function AccountLink({ variant }: { variant: "bar" | "nav" }) {
  const { customerName } = useChrome();
  const href = customerName ? "/account" : "/account/login";

  if (variant === "nav") {
    return (
      <Link
        href={href}
        className="focus-ring eyebrow block px-3 py-3 text-[0.7rem] whitespace-nowrap text-muted"
      >
        {customerName ? "My garage" : "Sign in"}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="focus-ring hidden items-center gap-2 rounded border border-line px-3.5 py-2.5 text-sm font-semibold transition-colors hover:border-line-hi sm:flex"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span className="hidden lg:inline">
        {customerName ? customerName.split(" ")[0] : "Sign in"}
      </span>
    </Link>
  );
}

/**
 * Rendered only once cookies have been read. Before that we do not know
 * whether to show the "select your vehicle" prompt or the chosen car, and
 * showing the prompt to someone who has a car set, then swapping it, is
 * exactly the flash the old server-side read existed to avoid.
 */
export function LiveGarageBar() {
  const { vehicle, barHidden, ready } = useChrome();
  if (!ready) return null;
  return <GarageBar vehicle={vehicle} hidden={barHidden} />;
}
