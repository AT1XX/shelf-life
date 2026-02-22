import { NextResponse } from "next/server";

// Simple production-safe guard for an internal tool:
// Manager routes require an admin token in header.
// In production, replace with SSO (Entra/Google) + RBAC.

export function requireAdminToken(req: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SERVER_NOT_CONFIGURED", message: "ADMIN_TOKEN is not set." },
      { status: 500 }
    );
  }
  const token = req.headers.get("x-admin-token");
  if (!token || token !== expected) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}
