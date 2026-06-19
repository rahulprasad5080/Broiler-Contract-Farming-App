# Office Expense API Handoff

Base path:

- `/api/v1`

This document explains the new office-expense flow added in backend.

Important distinction:

- Company and farmer expenses linked to a batch continue to use the existing batch APIs.
- Office expense is a new organization-level expense.
- Office expense is not linked to any farm.
- Office expense is not linked to any batch.
- Office expense still reduces financial totals and available balance in dashboard summary.

## 1. Frontend Change Count

Frontend should plan for `6 major changes`.

1. Add a new Office Expense list screen or tab.
2. Add a new Office Expense create form.
3. Add a new Office Expense edit form.
4. Add Office Expense filters for search, vendor, payment status, and category.
5. Use the existing payment API to mark/pay an office expense.
6. Update financial dashboard cards to show `officeExpenses` and `availableBalance`.

## 2. What Stays Unchanged

- Existing batch expense APIs remain unchanged for batch-linked company expenses.
- Existing batch expense APIs remain unchanged for farmer expenses.
- Batch create/update/report screens should continue working as before.
- Office expense should not ask the user to select `farmId` or `batchId`.

## 3. New APIs

## 3.1 List Office Expenses

URL:

- `GET /finance/office-expenses`

Roles:

- `OWNER`
- `ACCOUNTS`

Supported query params:

- `page`
- `limit`
- `search`
- `vendorId`
- `paymentStatus`
- `category`

Example:

```text
/finance/office-expenses?page=1&limit=10&search=rent&paymentStatus=PENDING
```

Dummy response:

```json
{
  "data": [
    {
      "id": "office_exp_001",
      "organizationId": "org_001",
      "scope": "OFFICE",
      "ledger": "COMPANY",
      "vendorId": "vendor_001",
      "category": "Office Rent",
      "expenseDate": "2026-06-19T00:00:00.000Z",
      "description": "June office rent",
      "quantity": 1,
      "unit": "month",
      "rate": 25000,
      "totalAmount": 25000,
      "vendorName": "City Properties",
      "invoiceNumber": "RENT-JUN-2026",
      "billPhotoUrl": "https://cdn.example.com/bills/rent-june.jpg",
      "paymentStatus": "PENDING",
      "paidAmount": 0,
      "approvalStatus": "APPROVED",
      "approvedById": "user_accounts_1",
      "approvedAt": "2026-06-19T10:15:00.000Z",
      "rejectedReason": null,
      "notes": "Paid at month end",
      "clientReferenceId": "mobile-office-rent-001",
      "createdById": "user_accounts_1",
      "createdAt": "2026-06-19T10:15:00.000Z",
      "updatedAt": "2026-06-19T10:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

Frontend notes:

- No `batchId` is returned here.
- No `farmId` is returned here.
- Use this screen separately from batch expense screen.

## 3.2 Create Office Expense

URL:

- `POST /finance/office-expenses`

Roles:

- `OWNER`
- `ACCOUNTS`

Required fields:

- `category`
- `expenseDate`
- `description`

Validation rule:

- send either `totalAmount`
- or both `quantity` and `rate`

Dummy request:

```json
{
  "vendorId": "vendor_001",
  "category": "Office Rent",
  "expenseDate": "2026-06-19",
  "description": "June office rent",
  "quantity": 1,
  "unit": "month",
  "rate": 25000,
  "totalAmount": 25000,
  "vendorName": "City Properties",
  "invoiceNumber": "RENT-JUN-2026",
  "billPhotoUrl": "https://cdn.example.com/bills/rent-june.jpg",
  "notes": "Paid at month end",
  "clientReferenceId": "mobile-office-rent-001"
}
```

Dummy response:

```json
{
  "id": "office_exp_001",
  "organizationId": "org_001",
  "scope": "OFFICE",
  "ledger": "COMPANY",
  "vendorId": "vendor_001",
  "category": "Office Rent",
  "expenseDate": "2026-06-19T00:00:00.000Z",
  "description": "June office rent",
  "quantity": 1,
  "unit": "month",
  "rate": 25000,
  "totalAmount": 25000,
  "vendorName": "City Properties",
  "invoiceNumber": "RENT-JUN-2026",
  "billPhotoUrl": "https://cdn.example.com/bills/rent-june.jpg",
  "paymentStatus": "PENDING",
  "paidAmount": 0,
  "approvalStatus": "APPROVED",
  "approvedById": "user_accounts_1",
  "approvedAt": "2026-06-19T10:15:00.000Z",
  "rejectedReason": null,
  "notes": "Paid at month end",
  "clientReferenceId": "mobile-office-rent-001",
  "createdById": "user_accounts_1",
  "createdAt": "2026-06-19T10:15:00.000Z",
  "updatedAt": "2026-06-19T10:15:00.000Z"
}
```

Frontend notes:

- Do not send `batchId`.
- Do not send `farmId`.
- `scope` will always come back as `OFFICE`.
- `ledger` will always come back as `COMPANY`.

## 3.3 Update Office Expense

URL:

- `PUT /finance/office-expenses/{expenseId}`

Roles:

- `OWNER`
- `ACCOUNTS`

Dummy request:

```json
{
  "category": "Office Rent",
  "expenseDate": "2026-06-19",
  "description": "June office rent revised",
  "quantity": 1,
  "unit": "month",
  "rate": 25500,
  "totalAmount": 25500,
  "invoiceNumber": "RENT-JUN-2026-REV",
  "paymentStatus": "PARTIAL",
  "notes": "Advance already paid"
}
```

Dummy response:

```json
{
  "id": "office_exp_001",
  "organizationId": "org_001",
  "scope": "OFFICE",
  "ledger": "COMPANY",
  "vendorId": "vendor_001",
  "category": "Office Rent",
  "expenseDate": "2026-06-19T00:00:00.000Z",
  "description": "June office rent revised",
  "quantity": 1,
  "unit": "month",
  "rate": 25500,
  "totalAmount": 25500,
  "vendorName": "City Properties",
  "invoiceNumber": "RENT-JUN-2026-REV",
  "billPhotoUrl": "https://cdn.example.com/bills/rent-june.jpg",
  "paymentStatus": "PARTIAL",
  "paidAmount": 10000,
  "approvalStatus": "APPROVED",
  "approvedById": "user_accounts_1",
  "approvedAt": "2026-06-19T10:15:00.000Z",
  "rejectedReason": null,
  "notes": "Advance already paid",
  "clientReferenceId": "mobile-office-rent-001",
  "createdById": "user_accounts_1",
  "createdAt": "2026-06-19T10:15:00.000Z",
  "updatedAt": "2026-06-19T10:30:00.000Z"
}
```

## 4. Existing Payment API To Pay Office Expense

Office expense payment uses the existing payment endpoint.

URL:

- `POST /finance/payments`

Use:

- `referenceType = "expense"`
- `referenceId = office expense id`

Notes:

- `batchId` is optional and should usually be omitted for office expense payment.
- `vendorId` is optional.
- if no vendor is linked, send `partyName`.

Dummy request with vendor:

```json
{
  "vendorId": "vendor_001",
  "paymentMode": "ACCOUNT",
  "amount": 10000,
  "paymentDate": "2026-06-20",
  "referenceType": "expense",
  "referenceId": "office_exp_001",
  "notes": "Advance for office rent"
}
```

Dummy request without vendor:

```json
{
  "partyName": "Office Boy Salary",
  "paymentMode": "CASH",
  "amount": 12000,
  "paymentDate": "2026-06-20",
  "referenceType": "expense",
  "referenceId": "office_exp_002",
  "notes": "Cash salary payout"
}
```

## 5. Dashboard Impact

Financial dashboard API:

- `GET /dashboard/financial`

Updated response summary fields:

- `investment`
- `expenses`
- `officeExpenses`
- `sales`
- `availableBalance`
- `netProfitOrLoss`

Dummy summary:

```json
{
  "summary": {
    "investment": 500000,
    "expenses": 212000,
    "officeExpenses": 42000,
    "sales": 310000,
    "availableBalance": 598000,
    "netProfitOrLoss": 98000
  }
}
```

Frontend notes:

- `expenses` now includes office expenses also.
- `officeExpenses` is the office-only subtotal.
- `availableBalance` can be shown directly instead of recalculating in frontend.

## 6. Report Impact

Expense report API:

- `GET /reports/expenses`

New behavior:

- owner/accounts can now also receive office expense rows
- office rows return:
  - `scope = "OFFICE"`
  - `batchId = null`
  - `batchCode = null`
  - `farmId = null`
  - `farmName = null`

Dummy office report row:

```json
{
  "expenseId": "office_exp_001",
  "scope": "OFFICE",
  "batchId": null,
  "batchCode": null,
  "farmId": null,
  "farmName": null,
  "ledger": "COMPANY",
  "category": "Office Rent",
  "expenseDate": "2026-06-19T00:00:00.000Z",
  "description": "June office rent",
  "totalAmount": 25000
}
```

## 7. Recommended UI Fields

Office expense create/edit form should have:

- vendor selector optional
- category
- expense date
- description
- quantity optional
- unit optional
- rate optional
- total amount
- invoice number optional
- bill photo URL optional
- notes optional

Fields that should not exist on office expense form:

- farm
- batch
- ledger selector

## 8. Quick Frontend Checklist

- Add a separate Office Expense module or tab.
- Use `GET /finance/office-expenses` for office expense listing.
- Use `POST /finance/office-expenses` for office expense creation.
- Use `PUT /finance/office-expenses/{expenseId}` for office expense editing.
- Remove farm/batch selectors from office expense form.
- Keep existing batch expense screens unchanged.
- Use `POST /finance/payments` with `referenceType = "expense"` for office expense payment.
- Update financial dashboard cards to read `summary.officeExpenses`.
- Update financial dashboard cards to read `summary.availableBalance`.
- If using `/reports/expenses`, handle rows with `scope = "OFFICE"` and null batch/farm fields.
