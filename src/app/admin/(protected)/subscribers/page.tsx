import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Mailing list" };

/**
 * The mailing list, owned by the shop.
 *
 * Deliberately shows the raw list with an export rather than trying to be a
 * campaign tool. Sending is Resend's job; what matters here is that the
 * addresses are visible and portable, so the audience is never trapped in a
 * vendor account.
 */
export default async function SubscribersPage() {
  await requireUser("VIEWER");

  const [subscribers, active, gone] = await Promise.all([
    prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    prisma.subscriber.count({ where: { unsubscribedAt: { not: null } } }),
  ]);

  const bySource = new Map<string, number>();
  for (const s of subscribers) {
    if (s.unsubscribedAt) continue;
    const key = s.source ?? "unknown";
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl">Mailing list</h1>
          <p className="mt-1 text-sm text-muted">
            {active} subscribed
            {gone > 0 && `, ${gone} unsubscribed`}
          </p>
        </div>
        <a
          href="/admin/subscribers/export"
          className="focus-ring rounded border border-line-hi px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          Download CSV
        </a>
      </header>

      {bySource.size > 0 && (
        <p className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {[...bySource.entries()].map(([source, n]) => (
            <span key={source}>
              {source}: <span className="text-text">{n}</span>
            </span>
          ))}
        </p>
      )}

      {subscribers.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
          Nobody has signed up yet. The form is in the footer of every page.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {subscribers.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  s.unsubscribedAt ? "text-muted line-through" : ""
                }`}
              >
                {s.email}
              </span>
              {s.source && (
                <span className="rounded border border-line px-1.5 text-[0.65rem] text-muted">
                  {s.source}
                </span>
              )}
              <span className="text-xs text-muted tabular-nums">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(s.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {subscribers.length === 500 && (
        <p className="mt-3 text-xs text-muted">
          Showing the 500 most recent. The CSV contains everyone.
        </p>
      )}
    </div>
  );
}
