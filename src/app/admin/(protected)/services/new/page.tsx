import Link from "next/link";
import { requireUser, canWrite } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata = { title: "New service" };

export default async function NewServicePage() {
  const user = await requireUser("STAFF");
  if (!canWrite(user.role)) {
    return <p className="text-sm text-muted">You don&apos;t have permission to add services.</p>;
  }

  // Put it at the end of the list by default rather than at position 0, where a
  // new service would silently jump above everything the shop has ordered.
  const last = await prisma.service.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (
    <div>
      <Link
        href="/admin/services"
        className="focus-ring mb-4 inline-block rounded text-sm text-muted hover:text-text"
      >
        ← Services
      </Link>
      <h1 className="display mb-6 text-xl">New service</h1>

      <ServiceForm
        initial={{
          name: "",
          blurb: "",
          description: "",
          category: "",
          priceFrom: "",
          priceNote: "",
          durationMinutes: 60,
          requiresVehicle: true,
          active: true,
          sortOrder: (last?.sortOrder ?? 0) + 10,
        }}
      />
    </div>
  );
}
