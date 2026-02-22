import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminToken } from "@/lib/admin";
import { parse } from "csv-parse/sync";

type Row = {
  barcode: string;
  name: string;
  shelfLifeDays: number;
  notes?: string;
  isActive?: boolean;
};

function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return undefined;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  const guard = requireAdminToken(req);
  if (guard) return guard;

  const contentType = req.headers.get("content-type") ?? "";
  let csvText = "";

  // Supports either multipart/form-data (file upload) or raw text/csv.
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Missing CSV file in form field 'file'." },
        { status: 400 }
      );
    }
    csvText = await file.text();
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "CSV content is empty." },
      { status: 400 }
    );
  }

  let records: any[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "CSV parse failed. Ensure it has headers." },
      { status: 400 }
    );
  }

  const rows: Row[] = [];
  const warnings: { row: number; message: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i] ?? {};
    const barcode = String(r.barcode ?? "").trim();
    const name = String(r.name ?? "").trim();
    const shelfLifeDaysRaw = String(r.shelfLifeDays ?? r.shelf_life_days ?? "").trim();

    if (!barcode) {
      warnings.push({ row: i + 2, message: "Missing barcode" });
      continue;
    }
    if (!name) {
      warnings.push({ row: i + 2, message: "Missing name" });
      continue;
    }

    const shelfLifeDays = Number(shelfLifeDaysRaw);
    if (!Number.isFinite(shelfLifeDays) || shelfLifeDays < 0 || shelfLifeDays > 30) {
      warnings.push({ row: i + 2, message: "Invalid shelfLifeDays (must be 0-30)" });
      continue;
    }

    const notes = r.notes !== undefined ? String(r.notes).trim() : undefined;
    const isActive = toBool(r.isActive);

    rows.push({ barcode, name, shelfLifeDays, notes, isActive });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "No valid rows found.",
        warnings,
      },
      { status: 400 }
    );
  }

  // Avoid interactive transactions (5s timeout). Upsert in batches.
  const BATCH_SIZE = 25;

  let upserted = 0;
  let created = 0;
  let updated = 0;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    // Check existing barcodes in one query (faster than per-row)
    const barcodes = batch.map((b) => b.barcode);
    const existing = await prisma.product.findMany({
      where: { barcode: { in: barcodes } },
      select: { barcode: true },
    });
    const existingSet = new Set(existing.map((e) => e.barcode));

    await Promise.all(
      batch.map(async (row) => {
        await prisma.product.upsert({
          where: { barcode: row.barcode },
          update: {
            name: row.name,
            shelfLifeDays: row.shelfLifeDays,
            notes: row.notes ?? null,
            ...(row.isActive === undefined ? {} : { isActive: row.isActive }),
            version: { increment: 1 },
          },
          create: {
            barcode: row.barcode,
            name: row.name,
            shelfLifeDays: row.shelfLifeDays,
            notes: row.notes ?? null,
            isActive: row.isActive ?? true,
            version: 1,
          },
        });

        upserted++;
        if (existingSet.has(row.barcode)) updated++;
        else created++;
      })
    );
  }

  // Audit log AFTER import (no transaction needed)
  try {
    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_UPSERTED",
        actor: "CSV_IMPORT",
        entity: "Product",
        entityId: "bulk",
        meta: {
          upserted,
          created,
          updated,
          warningsCount: warnings.length,
        },
      },
    });
  } catch {
    // Non-blocking: import succeeded even if audit fails
  }

  return NextResponse.json(
    {
      ok: true,
      upserted,
      created,
      updated,
      warnings,
      templateHeaders: ["barcode", "name", "shelfLifeDays", "notes", "isActive"],
    },
    { status: 200 }
  );
}