# Frozen Bakery Shelf Life (Scan + Search)

Internal-style web app to:
- Scan a frozen bakery item's barcode using the camera
- Show shelf life (days)
- Show the **exact date to write on the gun** based on store policy: **thaw day counts as Day 1**
- Search by product name
- Submit new item requests for manager approval
- Manager approvals queue (token-protected)

## 1) Prereqs
- Node.js 18+ (recommended 20+)
- MongoDB Atlas cluster (or MongoDB compatible)

## 2) Setup

### Install
```bash
npm install
```

### Environment
Create `.env.local`:
```env
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"

# Manager token for approvals API (send as x-admin-token)
ADMIN_TOKEN="change-me-to-a-long-random-string"
```

### Prisma
```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

## 3) Run
```bash
npm run dev
```
Open:
- http://localhost:3000

## 4) Manager approvals
- Visit `/admin/approvals`
- Paste `ADMIN_TOKEN`
- Approve/Reject pending requests

## 5) Production notes
This repo is structured so you can upgrade safely:
- Replace `ADMIN_TOKEN` with SSO (Entra/Google Workspace) + RBAC
- Add audit log viewer
- CSV import/export (implemented): `/admin/products`
- Add label/print mode

## 6) Products CSV import/export
- Visit `/admin/products`
- Paste `ADMIN_TOKEN`
- Export downloads `frozen-products.csv`
- Import supports headers:
  - `barcode` (required)
  - `name` (required)
  - `shelfLifeDays` (required)
  - `notes` (optional)
  - `isActive` (optional: true/false)

Import behavior: **upsert by barcode** (updates bump version, inserts default to active).

## Store policy implemented
**Write-on date = thawDate + (shelfLifeDays - 1)**

Examples:
- shelfLifeDays=1 -> write same day
- shelfLifeDays=2 -> write next day
- shelfLifeDays=3 -> write 2 days later
