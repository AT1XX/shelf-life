import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ count: 0, results: [] }, { status: 200 });
  }

  const results = await prisma.product.findMany({
    where: {
      isActive: true,
      name: { contains: query, mode: "insensitive" },
    },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    {
      count: results.length,
      results: results.map((p) => ({
        barcode: p.barcode,
        name: p.name,
        shelfLifeDays: p.shelfLifeDays,
        notes: p.notes ?? null,
      })),
    },
    { status: 200 }
  );
}
