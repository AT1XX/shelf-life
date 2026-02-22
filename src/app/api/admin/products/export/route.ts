import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  // Quote if it contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const products = await prisma.product.findMany({
    orderBy: [{ name: "asc" }],
  });

  // Include isActive so managers can bulk disable/enable via CSV if desired.
  const header = ["barcode", "name", "shelfLifeDays", "notes", "isActive"].join(",");
  const lines = products.map((p) =>
    [
      csvEscape(p.barcode),
      csvEscape(p.name),
      csvEscape(p.shelfLifeDays),
      csvEscape(p.notes ?? ""),
      csvEscape(p.isActive ? "true" : "false"),
    ].join(",")
  );

  const csv = [header, ...lines].join("\n") + "\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="frozen-products.csv"',
      "Cache-Control": "no-store",
    },
  });
}
