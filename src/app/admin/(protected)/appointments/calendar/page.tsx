import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  SHOP_TZ,
  BAYS,
  shopDateString,
  shopTimeToUtc,
  formatShopTime,
} from "@/lib/booking";
import { getShopSettings, getClosedDates } from "@/lib/settings";

export const metadata = { title: "Calendar" };

/**
 * A month view of the diary.
 *
 * The list view answers "what is next"; this answers "what does my week look
 * like", which is the question you actually ask before telling a customer to
 * come in on Thursday. Rendered server side with no calendar library: a month
 * grid is six rows of seven cells, and pulling in a dependency to draw that
 * would cost more than it saves.
 *
 * Everything is computed in the shop's timezone. The staff member may be on
 * their phone anywhere, but the diary belongs to Riverside.
 */

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "border-warn/40 bg-warn/10 text-warn",
  CONFIRMED: "border-good/40 bg-good/10 text-good",
  COMPLETED: "border-line bg-surface-2 text-muted",
  CANCELLED: "border-line bg-surface-2 text-muted line-through",
};

/** Shift a YYYY-MM-DD by whole days without tripping over DST. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate(),
  ).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month }] = await Promise.all([searchParams, requireUser("VIEWER")]);

  const today = shopDateString(new Date());
  // "YYYY-MM", defaulting to the month containing today.
  const [year, monthNum] = (month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7))
    .split("-")
    .map(Number);

  const first = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const last = `${year}-${String(monthNum).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Pad to whole weeks so the grid is rectangular.
  const firstWeekday = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay();
  const gridStart = addDays(first, -firstWeekday);
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const [appointments, { SITE }, closed] = await Promise.all([
    prisma.appointment.findMany({
      // One shop-day of slack either side, so an appointment in a padded cell
      // from the previous or next month still appears.
      where: {
        startsAt: {
          gte: shopTimeToUtc(addDays(gridStart, -1), "00:00"),
          lt: shopTimeToUtc(addDays(gridStart, cellCount + 1), "00:00"),
        },
      },
      include: { service: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    getShopSettings(),
    getClosedDates(),
  ]);

  // Bucket by shop-local date rather than UTC date, or a 5pm booking lands on
  // tomorrow's square through the winter.
  const byDate = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const key = shopDateString(a.startsAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(a);
  }

  const cells = Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i));
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    month: "long",
    year: "numeric",
  }).format(shopTimeToUtc(first, "12:00"));

  const prevMonth = monthNum === 1 ? `${year - 1}-12` : `${year}-${String(monthNum - 1).padStart(2, "0")}`;
  const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`;

  const inMonth = appointments.filter(
    (a) => shopDateString(a.startsAt) >= first && shopDateString(a.startsAt) <= last,
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-2xl">{monthLabel}</h1>
          <p className="mt-1 text-sm text-muted">
            {inMonth.length} appointment{inMonth.length === 1 ? "" : "s"} this month ·{" "}
            {BAYS} bays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/appointments/calendar?month=${prevMonth}`}
            className="focus-ring rounded border border-line px-3 py-2 text-sm text-muted hover:border-line-hi hover:text-text"
          >
            ← Prev
          </Link>
          <Link
            href="/admin/appointments/calendar"
            className="focus-ring rounded border border-line px-3 py-2 text-sm text-muted hover:border-line-hi hover:text-text"
          >
            Today
          </Link>
          <Link
            href={`/admin/appointments/calendar?month=${nextMonth}`}
            className="focus-ring rounded border border-line px-3 py-2 text-sm text-muted hover:border-line-hi hover:text-text"
          >
            Next →
          </Link>
          <Link
            href="/admin/appointments"
            className="focus-ring ml-1 rounded border border-line px-3 py-2 text-sm text-muted hover:border-line-hi hover:text-text"
          >
            List view
          </Link>
        </div>
      </header>

      {/* Wide content scrolls inside its own box; the page never scrolls
          sideways on a phone. */}
      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-px border-b border-line">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="eyebrow px-2 py-2 text-center text-[0.6rem] text-muted"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-line">
            {cells.map((date) => {
              const list = byDate.get(date) ?? [];
              const isToday = date === today;
              const otherMonth = date < first || date > last;
              // Month is 1-based in the string, so subtract before asking.
              const dow = new Date(
                Date.UTC(
                  Number(date.slice(0, 4)),
                  Number(date.slice(5, 7)) - 1,
                  Number(date.slice(8, 10)),
                ),
              ).getUTCDay();
              const shut = SITE.hours[dow] === null || closed.has(date);

              return (
                <div
                  key={date}
                  className={`min-h-[7rem] bg-ink p-1.5 ${otherMonth ? "opacity-40" : ""} ${
                    shut ? "bg-surface/40" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs font-bold ${
                        isToday ? "bg-accent text-accent-fg" : "text-muted"
                      }`}
                    >
                      {Number(date.slice(8, 10))}
                    </span>
                    {shut && !otherMonth && (
                      <span className="text-[0.55rem] tracking-wide text-muted uppercase">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {list.map((a) => (
                      <Link
                        key={a.id}
                        href={`/admin/appointments/${a.reference}`}
                        title={`${formatShopTime(a.startsAt)} · ${a.customerName} · ${a.service.name}`}
                        className={`focus-ring block truncate rounded border px-1.5 py-1 text-[0.65rem] leading-tight transition-opacity hover:opacity-80 ${
                          STATUS_STYLE[a.status] ?? "border-line bg-surface-2"
                        }`}
                      >
                        <span className="font-bold">{formatShopTime(a.startsAt)}</span>{" "}
                        {a.customerName}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-warn/40 bg-warn/10" />
          Needs confirming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-good/40 bg-good/10" />
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-line bg-surface-2" />
          Done or cancelled
        </span>
      </div>
    </div>
  );
}
