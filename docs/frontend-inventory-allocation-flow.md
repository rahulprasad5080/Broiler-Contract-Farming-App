# Frontend Handoff: Inventory Allocation by Purchase Lot

## Summary

The allocation flow has changed from:

- old flow: allocate item quantity from combined stock of all purchases

to:

- new flow: allocate item quantity from exactly one purchase at a time

This means:

- one allocation entry = one selected `purchaseId`
- one allocation cannot mix stock from multiple purchases
- if user wants to allocate from 2 purchases, user must submit 2 separate allocation entries
- company expense is now calculated only from the selected purchase's unit cost

## Frontend Change Count

There are `6` frontend changes to implement this properly.

### 1. Update allocation form payload

`POST /inventory/allocate` now requires:

```json
{
  "batchId": "string",
  "catalogItemId": "string",
  "purchaseId": "string",
  "quantity": 0,
  "remarks": "string"
}
```

Mandatory new field:

- `purchaseId`

## 2. Add purchase dropdown after item selection

New expected UI flow:

1. User selects batch
2. User selects item
3. Frontend loads purchase list for that item
4. User selects one purchase
5. Frontend shows available quantity for that selected purchase
6. User enters quantity to allocate
7. User submits allocation

Recommended field order in UI:

1. `Batch`
2. `Item`
3. `Purchase`
4. `Available Qty from selected purchase`
5. `Quantity to allocate`
6. `Remarks`

## 3. Fetch purchases for selected item

Frontend can now call:

`GET /finance/purchases?catalogItemId=<selectedItemId>&page=1&limit=50`

This returns purchases for that selected item only.

Suggested use:

- trigger this API when item changes
- reset selected purchase and quantity when item changes
- populate dropdown with purchase entries

Suggested dropdown label:

- `Invoice/Purchase Date - Vendor - Qty - Unit Cost`

Example:

- `12 Jun 2026 | Vendor A | 60 kg | Rs 20/kg`
- `14 Jun 2026 | Vendor B | 40 kg | Rs 25/kg`

## 4. Calculate available quantity per purchase on frontend

Important:

- purchase list API does `not` directly return remaining available stock per purchase
- frontend should calculate it using inventory ledger

Use:

`GET /inventory/ledger?catalogItemId=<selectedItemId>`

The inventory ledger response now includes:

- `purchaseId`
- `quantityIn`
- `quantityOut`
- `unitCost`

Frontend should group ledger rows by `purchaseId` and compute:

```text
availableQty = sum(quantityIn) - sum(quantityOut)
```

Only show purchases in dropdown where:

```text
availableQty > 0
```

## 5. Add frontend validations

Mandatory validations:

- item must be selected
- purchase must be selected
- quantity must be greater than `0`
- quantity must be less than or equal to available quantity of selected purchase

Recommended UX:

- disable quantity input until purchase is selected
- show available quantity text below purchase dropdown
- disable submit button if quantity exceeds selected purchase balance

Suggested validation messages:

- `Please select an item`
- `Please select a purchase`
- `Quantity must be greater than 0`
- `Only 30 kg is available in the selected purchase`

## 6. Update success state and history display

After successful allocation:

- refresh inventory ledger
- refresh purchase availability for the selected item
- clear quantity input
- optionally keep batch and item selected for fast repeated entries

Inventory ledger response now includes `purchaseId`, so frontend can show which purchase lot the allocation came from.

Suggested table column additions:

- `Purchase`
- `Unit Cost`

## Real Example

Suppose selected item is `Feed`.

There are 2 purchases:

- `P1`: 60 kg at Rs 20/kg
- `P2`: 40 kg at Rs 25/kg

Total stock for feed = `100 kg`

But allocation cannot use both in one request.

### Example A

User selects:

- item: `Feed`
- purchase: `P1`
- batch: `B1`
- quantity: `30`

Calculation:

- selected purchase unit cost = `20`
- allocated quantity = `30`
- company expense = `30 * 20 = Rs 600`

Request:

```json
{
  "batchId": "batch_b1",
  "catalogItemId": "item_feed",
  "purchaseId": "purchase_p1",
  "quantity": 30,
  "remarks": "Feed allocated to Batch B1"
}
```

### Example B

After Example A:

- `P1 remaining = 30 kg`
- `P2 remaining = 40 kg`

If user wants to allocate `50 kg`, user cannot do it in one request from mixed purchases.

User must create 2 separate allocations:

Entry 1:

```json
{
  "batchId": "batch_b1",
  "catalogItemId": "item_feed",
  "purchaseId": "purchase_p1",
  "quantity": 30,
  "remarks": "Feed allocated from Purchase 1"
}
```

Expense:

- `30 * 20 = Rs 600`

Entry 2:

```json
{
  "batchId": "batch_b1",
  "catalogItemId": "item_feed",
  "purchaseId": "purchase_p2",
  "quantity": 20,
  "remarks": "Feed allocated from Purchase 2"
}
```

Expense:

- `20 * 25 = Rs 500`

Total expense added after both entries:

- `Rs 1100`

## Dummy API Data

### Purchase list response example

```json
{
  "data": [
    {
      "id": "purchase_p1",
      "organizationId": "org_1",
      "batchId": null,
      "vendorId": "vendor_1",
      "purchaseType": "FEED",
      "vendorName": "Vendor A",
      "catalogItemId": "item_feed",
      "itemName": "Starter Feed",
      "quantity": 60,
      "unit": "kg",
      "unitCost": 20,
      "totalAmount": 1200,
      "invoiceNumber": "INV-101",
      "paymentStatus": "PENDING",
      "paidAmount": 0,
      "purchaseDate": "2026-06-12T00:00:00.000Z",
      "attachmentUrl": null,
      "remarks": "First lot",
      "clientReferenceId": null,
      "createdById": "user_1",
      "createdAt": "2026-06-12T10:00:00.000Z",
      "updatedAt": "2026-06-12T10:00:00.000Z"
    },
    {
      "id": "purchase_p2",
      "organizationId": "org_1",
      "batchId": null,
      "vendorId": "vendor_2",
      "purchaseType": "FEED",
      "vendorName": "Vendor B",
      "catalogItemId": "item_feed",
      "itemName": "Starter Feed",
      "quantity": 40,
      "unit": "kg",
      "unitCost": 25,
      "totalAmount": 1000,
      "invoiceNumber": "INV-102",
      "paymentStatus": "PENDING",
      "paidAmount": 0,
      "purchaseDate": "2026-06-14T00:00:00.000Z",
      "attachmentUrl": null,
      "remarks": "Second lot",
      "clientReferenceId": null,
      "createdById": "user_1",
      "createdAt": "2026-06-14T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

### Inventory ledger response example

```json
{
  "data": [
    {
      "id": "ledger_1",
      "organizationId": "org_1",
      "catalogItemId": "item_feed",
      "catalogItemName": "Starter Feed",
      "batchId": null,
      "purchaseId": "purchase_p1",
      "vendorId": "vendor_1",
      "vendorName": "Vendor A",
      "movementType": "PURCHASE",
      "movementDate": "2026-06-12T00:00:00.000Z",
      "quantityIn": 60,
      "quantityOut": 0,
      "unitCost": 20,
      "balanceAfter": 60,
      "referenceType": "purchase",
      "referenceId": "purchase_p1",
      "notes": "First lot",
      "createdById": "user_1",
      "createdAt": "2026-06-12T10:00:00.000Z"
    },
    {
      "id": "ledger_2",
      "organizationId": "org_1",
      "catalogItemId": "item_feed",
      "catalogItemName": "Starter Feed",
      "batchId": null,
      "purchaseId": "purchase_p2",
      "vendorId": "vendor_2",
      "vendorName": "Vendor B",
      "movementType": "PURCHASE",
      "movementDate": "2026-06-14T00:00:00.000Z",
      "quantityIn": 40,
      "quantityOut": 0,
      "unitCost": 25,
      "balanceAfter": 100,
      "referenceType": "purchase",
      "referenceId": "purchase_p2",
      "notes": "Second lot",
      "createdById": "user_1",
      "createdAt": "2026-06-14T10:00:00.000Z"
    },
    {
      "id": "ledger_3",
      "organizationId": "org_1",
      "catalogItemId": "item_feed",
      "catalogItemName": "Starter Feed",
      "batchId": "batch_b1",
      "purchaseId": "purchase_p1",
      "vendorId": "vendor_1",
      "vendorName": "Vendor A",
      "movementType": "ALLOCATION",
      "movementDate": "2026-06-15T00:00:00.000Z",
      "quantityIn": 0,
      "quantityOut": 30,
      "unitCost": 20,
      "balanceAfter": 70,
      "referenceType": "allocation",
      "referenceId": "batch_b1",
      "notes": "Feed allocated to Batch B1",
      "createdById": "user_1",
      "createdAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

### Frontend computed balances from above data

```text
purchase_p1 => 60 - 30 = 30 kg available
purchase_p2 => 40 - 0 = 40 kg available
```

## Recommended Frontend Data Shape

Suggested transformed dropdown option:

```ts
type PurchaseLotOption = {
  purchaseId: string;
  label: string;
  vendorName: string;
  purchaseDate: string;
  unit: string;
  unitCost: number;
  purchasedQty: number;
  availableQty: number;
};
```

## Recommended UI Text

Selected purchase summary example:

```text
Purchase: INV-101 | Vendor A
Purchased: 60 kg
Available: 30 kg
Unit Cost: Rs 20/kg
Estimated Expense: Rs 600
```

Where:

```text
estimatedExpense = enteredQuantity * selectedPurchase.unitCost
```

## One Important Note

Current backend supports this flow correctly, but it does not yet have a separate API like:

- `GET /inventory/purchase-lots?catalogItemId=...`

So frontend must currently combine:

1. `GET /finance/purchases?catalogItemId=...`
2. `GET /inventory/ledger?catalogItemId=...`

to calculate lot-wise available quantity.

If needed later, backend can expose a dedicated purchase-lot availability endpoint to simplify frontend code.

## Final Rule for Frontend Team

Use this rule everywhere in the allocation form:

```text
1 allocation form submission = 1 purchaseId only
```

and:

```text
company expense = selected purchase unit cost * allocated quantity
```
