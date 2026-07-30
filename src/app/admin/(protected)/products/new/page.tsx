import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const user = await requireUser("STAFF");

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      include: { parent: true },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/products" className="focus-ring rounded hover:text-text">
          ← Products
        </Link>
      </nav>

      <h1 className="display mb-1 text-2xl">New product</h1>
      <p className="mb-6 text-sm text-muted">
        Fitment can be added once the product is created.
      </p>

      <ProductForm
        readOnly={!canWrite(user.role)}
        brands={brands}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.parent?.name ?? null,
          kind: c.kind,
        }))}
        initial={{
          name: "",
          sku: "",
          partNumber: "",
          description: "",
          price: "",
          compareAt: "",
          stock: "0",
          brandId: "",
          categoryId: "",
          isUniversal: false,
          archived: false,
          images: [],
        }}
      />
    </div>
  );
}
