import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: any) {
  const params = await context.params; // Next.js 15 expects this
  const barcode = String(params?.barcode ?? "").trim();

  if (!barcode) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Missing barcode." },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { barcode },
  });

  if (!product || !product.isActive) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Product not found. Submit a request to add it." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      barcode: product.barcode,
      name: product.name,
      shelfLifeDays: product.shelfLifeDays,
      notes: product.notes ?? null,
      isActive: product.isActive,
      version: product.version,
      updatedAt: product.updatedAt,
    },
    { status: 200 }
  );
}