import type { Product } from "@prisma/client";
import { computeWriteDate, formatGunDate, startOfDayLocal } from "@/lib/dates";

export default function ProductResultCard({
  product,
  thawDate,
}: {
  product: Pick<Product, "barcode" | "name" | "shelfLifeDays" | "notes" | "updatedAt">;
  thawDate: Date;
}) {
  const thaw = startOfDayLocal(thawDate);
  const writeDate = computeWriteDate(thaw, product.shelfLifeDays);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Frozen bakery • Barcode {product.barcode}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{product.name}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Shelf life</p>
          <p className="mt-1 text-lg font-semibold">
            {product.shelfLifeDays} day{product.shelfLifeDays === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Thawed date</p>
          <p className="mt-1 text-lg font-semibold">{formatGunDate(thaw)}</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-white">
          <p className="text-xs font-semibold opacity-80">INPUT ON GUN</p>
          <p className="mt-1 text-lg font-semibold">{formatGunDate(writeDate)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Notes</p>
        <p className="mt-1 text-sm text-slate-800">{product.notes ?? "No notes."}</p>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Last updated: {new Date(product.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
