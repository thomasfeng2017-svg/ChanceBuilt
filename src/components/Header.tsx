import { Suspense } from "react";
import Link from "next/link";
import { SearchBox, SearchBoxFallback } from "./SearchBox";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { AccountLink, CartLink, LiveGarageBar } from "./HeaderChrome";

const NAV = [
  { name: "Parts", href: "/parts" },
  { name: "Merch", href: "/merch" },
  { name: "Services", href: "/services" },
  { name: "Gallery", href: "/gallery" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

/**
 * Site header. Deliberately reads nothing per request.
 *
 * The cart badge, the account name and the garage bar are the only parts that
 * differ between visitors, and they are filled in by HeaderChrome in the
 * browser. Keeping cookies out of here is what lets the pages that use this
 * layout be cached, which is what stops a bot crawl from running a database
 * query per hit.
 */
export function Header() {
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
          {/* SearchBox reads the URL; on a cached page that needs a boundary
              or the page cannot be prerendered. See SearchBoxFallback. */}
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/book"
            className="focus-ring hidden rounded bg-accent px-5 py-2.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi sm:block"
          >
            Book service
          </Link>
          <AccountLink variant="bar" />
          <CartLink />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:hidden">
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>
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
          {/* The account button in the bar above is hidden on small screens,
              so it needs a home in the nav or a phone can't reach it at all. */}
          <li className="sm:hidden">
            <AccountLink variant="nav" />
          </li>
        </ul>
      </nav>

      <LiveGarageBar />
    </header>
  );
}
