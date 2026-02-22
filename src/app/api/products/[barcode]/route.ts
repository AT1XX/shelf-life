import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { barcode: string } }) {
  const product = await prisma.product.findUnique({ where: { barcode: params.barcode } });
  if (!product || !product.isActive) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Product not found. Submit a request to add it." },
      { status: 404 }
    );
  }
  return NextResponse.json(product, { status: 200 });
}
