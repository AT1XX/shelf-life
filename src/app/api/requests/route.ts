import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  barcode: z.string().min(6),
  name: z.string().min(2),
  shelfLifeDays: z.number().int().min(1).max(365),
  notes: z.string().optional(),
  submittedBy: z.string().min(2),
});

export async function POST(req: Request) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.newItemRequest.create({
    data: {
      barcode: parsed.data.barcode,
      name: parsed.data.name,
      shelfLifeDays: parsed.data.shelfLifeDays,
      notes: parsed.data.notes,
      submittedBy: parsed.data.submittedBy,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "REQUEST_CREATED",
      actor: parsed.data.submittedBy,
      entity: "NewItemRequest",
      entityId: created.id,
      meta: { barcode: created.barcode, name: created.name },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
