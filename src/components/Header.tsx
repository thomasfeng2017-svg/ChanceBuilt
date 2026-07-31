import Link from "next/link";
import { getVehicle } from "@/lib/garage";
import { getCartCount } from "@/lib/cart";
import { GarageBar } from "./GarageBar";
import { SearchBox } from "./SearchBox";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

const NAV = [
  { name: "Parts", href: "/parts" },
  { name: "Merch", href: "/merch" },
  { name: "Services", href: "/services" },
  { name: "Gallery", href: "/gallery" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export async function Header() {
  const [vehicle, cartCount] = await Promise.all([getVehicle(), getCartCount()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="border-b border-line/60">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[0.7rem] text-muted sm:px-6">
          {/* Uses the tagline rather than repeating it, so this bar and the
              footer can never drift apart. */}
          {SITE.tagline} · {SITE.address.city}, {SITE.address.state} ·{" "}
          <a href={SITE.phoneHref} className="focus-ring rounded text-text hover:underline">
            {SITE.phone}
          </a>
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          aria-label={`${SITE.name} home`}
          className="focus-ring flex shrink-0 items-center rounded"
        >
          <Logo height={42} />
        </Link>

        <div className="hidden flex-1 lg:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/book"
            className="focus-ring hidden rounded bg-accent px-5 py-2.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi sm:block"
          >
            Book service
          </Link>

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
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:hidden">
        <SearchBox />
      </div>

      <nav aria-label="Main" className="border-t border-line/60">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="focus-ring eyebrow block px-3 py-3 text-[0.7rem] whitespace-nowrap text-muted transition-colors hover:text-text"
              >
                {item.name}
              </Link>
            </li>
          ))}
          <li className="sm:hidden">
            <Link
              href="/book"
              className="focus-ring eyebrow block px-3 py-3 text-[0.7rem] whitespace-nowrap text-accent-text"
            >
              Book service
            </Link>
          </li>
        </ul>
      </nav>

      <GarageBar vehicle={vehicle} />
    </header>
  );
}
