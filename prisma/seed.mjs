import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = [
    { barcode: "0623461234567", name: "Frozen Butter Croissant 4-Pack", shelfLifeDays: 2, notes: "Thaw on rack. Do not refreeze." },
    { barcode: "0623467654321", name: "Frozen Apple Danish 4-Pack", shelfLifeDays: 1, notes: "Thaw on rack. Best same day." },
    { barcode: "0623461112223", name: "Frozen Blueberry Muffin 6-Pack", shelfLifeDays: 3, notes: "Keep covered once thawed." }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {
        name: p.name,
        shelfLifeDays: p.shelfLifeDays,
        notes: p.notes,
        isActive: true,
        version: { increment: 1 }
      },
      create: p,
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
