# Architecture

The system separates warehouse inventory from employee-held filament.

## Warehouse Stock

`Filament.currentQuantityKg` represents warehouse stock still available to issue.

## Request Issue

When an employee accepts a manager request, the accepted actual quantity is deducted from warehouse stock and added to `EmployeeFilamentBalance`.

## Usage

Usage is recorded from `EmployeeFilamentBalance`, not from warehouse stock. This prevents double-deducting the same filament.

## Immutable Ledger

`InventoryTransaction` records each movement:

- `STOCK_IN`: initial or purchase stock
- `REQUEST_ISSUED`: warehouse → employee
- `USAGE_CONSUMED`: employee balance → consumed by project/order
- `ADJUSTMENT`: manual stock correction
- `RETURN`: reserved for future employee → warehouse returns

The public API does not expose update/delete endpoints for transaction rows.
