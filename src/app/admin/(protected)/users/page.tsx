import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { UserAdmin } from "@/components/admin/UserAdmin";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const actor = await requireUser("OWNER");

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="display text-2xl">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Who can sign in to the admin. Owners can manage users; staff can manage the catalog,
          orders and appointments; read-only can look but not touch.
        </p>
      </header>

      <UserAdmin
        actorId={actor.id}
        users={users.map((u) => ({
          ...u,
          lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
