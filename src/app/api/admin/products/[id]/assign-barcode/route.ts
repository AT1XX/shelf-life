import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";

export async function PATCH(req: Request, context: any) {
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const params = await context.params;
  const id = String(params?.id ?? "").trim();

  const body = await req.json().catch(() => ({}));
  const barcode = String(body?.barcode ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Missing product id." }, { status: 400 });
  }
  if (!barcode) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Missing barcode." }, { status: 400 });
  }

  // Prevent assigning a barcode already used by another product
  const existing = await prisma.product.findUnique({ where: { barcode } });
  if (existing && existing.id !== id) {
    return NextResponse.json(
      { error: "BARCODE_EXISTS", message: "That barcode is already linked to another product." },
      { status: 400 }
    );
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { barcode, version: { increment: 1 } },
  });

  return NextResponse.json({ ok: true, product: updated }, { status: 200 });
}