import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";

export async function GET(req: Request) {
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json({ ok: true, items: [] }, { status: 200 });

  const items = await prisma.product.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, barcode: true, shelfLifeDays: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json({ ok: true, items }, { status: 200 });
}