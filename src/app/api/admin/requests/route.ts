import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";

export async function GET(req: Request) {
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") ?? "PENDING") as any;

  const results = await prisma.newItemRequest.findMany({
    where: { status },
    orderBy: { submittedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ count: results.length, results }, { status: 200 });
}
