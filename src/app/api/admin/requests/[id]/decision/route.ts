import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";

const Schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  decisionBy: z.string().min(2),
  managerComment: z.string().optional(),
});

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const id = params.id;
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const requestRow = await prisma.newItemRequest.findUnique({ where: { id: params.id } });
  if (!requestRow) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const status = parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await prisma.newItemRequest.update({
    where: { id: params.id },
    data: {
      status,
      decisionBy: parsed.data.decisionBy,
      decisionAt: new Date(),
      managerComment: parsed.data.managerComment,
    },
  });

  if (status === "APPROVED") {
    await prisma.product.upsert({
      where: { barcode: requestRow.barcode },
      update: {
        name: requestRow.name,
        shelfLifeDays: requestRow.shelfLifeDays,
        notes: requestRow.notes,
        isActive: true,
        version: { increment: 1 },
      },
      create: {
        barcode: requestRow.barcode,
        name: requestRow.name,
        shelfLifeDays: requestRow.shelfLifeDays,
        notes: requestRow.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "REQUEST_APPROVED",
        actor: parsed.data.decisionBy,
        entity: "NewItemRequest",
        entityId: updated.id,
        meta: { barcode: requestRow.barcode, name: requestRow.name },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_UPSERTED",
        actor: parsed.data.decisionBy,
        entity: "Product",
        entityId: requestRow.barcode,
        meta: { shelfLifeDays: requestRow.shelfLifeDays },
      },
    });
  } else {
    await prisma.auditLog.create({
      data: {
        action: "REQUEST_REJECTED",
        actor: parsed.data.decisionBy,
        entity: "NewItemRequest",
        entityId: updated.id,
        meta: { managerComment: parsed.data.managerComment ?? null },
      },
    });
  }

  return NextResponse.json(updated, { status: 200 });
}
