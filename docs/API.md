# API Contract

Base URL: `/api`

All authenticated endpoints use `Authorization: Bearer <token>`.

## Request Creation

```http
POST /api/requests
Content-Type: application/json

{
  "employeeId": "user_id",
  "filamentId": "filament_id",
  "requestedQuantityKg": 0.75,
  "purpose": "Order LS-1024",
  "notes": "Matte black base parts"
}
```

## Employee Acceptance

```http
POST /api/requests/:id/accept
Content-Type: application/json

{
  "actualReceivedQuantityKg": 0.72,
  "employeeRemarks": "Received one opened spool with measured balance"
}
```

Acceptance performs one database transaction:

- Updates request to `ACCEPTED`
- Deducts warehouse stock
- Updates filament status
- Adds employee assigned balance
- Creates immutable `REQUEST_ISSUED` transaction
- Sends manager notification/email
- Sends low-stock alerts if needed

## Usage Recording

```http
POST /api/usage
Content-Type: application/json

{
  "filamentId": "filament_id",
  "projectOrderId": "ORDER-1024",
  "quantityUsedKg": 0.18,
  "notes": "Printed 12 bases"
}
```

Usage recording decrements only the employee assigned balance because warehouse stock was already deducted when the filament was issued.
