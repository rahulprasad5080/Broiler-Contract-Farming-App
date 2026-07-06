__Recent API Frontend Handoff__

Purchase edit/delete, catalog item delete, and payment edit APIs

__Prepared for frontend implementation\. Date: 06 July 2026__

All endpoints require the existing JWT Authorization header: Authorization: Bearer <token>\.

# Endpoint Summary

__Method__

__URL__

__Role__

__Purpose__

PUT

/finance/purchases/\{purchaseId\}

OWNER, ACCOUNTS

Edit purchase and recalculate linked stock/payment status\.

DELETE

/finance/purchases/\{purchaseId\}

OWNER, ACCOUNTS

Delete unused purchase and linked purchase stock rows\.

DELETE

/master\-data/catalog\-items/\{itemId\}

OWNER, ACCOUNTS, SUPERVISOR

Delete unused catalog item only\.

PUT

/finance/payments/\{paymentId\}

OWNER, ACCOUNTS

Edit payment and recalculate linked totals\.

# 1\. Edit Purchase

### URL

PUT /finance/purchases/\{purchaseId\}

### Dummy request

\{  
  "quantity": 120,  
  "unit": "KG",  
  "unitCost": 42,  
  "totalAmount": 5040,  
  "purchaseDate": "2026\-07\-06",  
  "invoiceNumber": "INV\-1001",  
  "remarks": "Updated purchase"  
\}

### Success response

\{  
  "id": "purchase\-uuid",  
  "organizationId": "organization\-uuid",  
  "purchaseTransactionId": null,  
  "batchId": null,  
  "vendorId": "vendor\-uuid",  
  "warehouseId": "warehouse\-uuid",  
  "warehouseName": "Main Warehouse",  
  "purchaseType": "FEED",  
  "vendorName": "ABC Feeds",  
  "catalogItemId": "catalog\-item\-uuid",  
  "itemName": "Starter Feed",  
  "quantity": 120,  
  "unit": "KG",  
  "unitCost": 42,  
  "totalAmount": 5040,  
  "invoiceNumber": "INV\-1001",  
  "paymentStatus": "PENDING",  
  "paidAmount": 0,  
  "purchaseDate": "2026\-07\-06T00:00:00\.000Z",  
  "attachmentUrl": null,  
  "remarks": "Updated purchase",  
  "clientReferenceId": null,  
  "createdById": "user\-uuid",  
  "createdAt": "2026\-07\-06T10:00:00\.000Z",  
  "updatedAt": "2026\-07\-06T10:10:00\.000Z"  
\}

### Frontend notes

- For stock\-tracked purchases, backend updates purchase row, stock movement, inventory ledger, catalog current stock, and linked unpaid inventory expenses when cost changes\.
- Quantity reduction is blocked if historical inventory usage would become invalid\.
- Vendor or warehouse cannot be changed for purchase items linked to a purchase transaction\.
- Refresh purchase list, inventory ledger, inventory balances, and catalog item list after success\.

### Possible error response

\{  
  "message": "This purchase stock is already used\. Quantity cannot be reduced below 80\."  
\}

# 2\. Delete Purchase

### URL

DELETE /finance/purchases/\{purchaseId\}

### Request body

No request body required\.

### Success response

\{  
  "message": "Purchase deleted successfully"  
\}

### Frontend notes

- Delete is allowed only when the purchase has no linked payments, no batch costs, and no downstream inventory usage\.
- If the purchase created stock rows, backend deletes the linked purchase stock movement and inventory ledger row, then recalculates catalog current stock\.
- Show backend error message directly when deletion is blocked\.

### Possible error responses

\{  
  "message": "This purchase has linked payments\. Remove the linked payment records before deleting it\."  
\}

\{  
  "message": "This purchase stock is already used in inventory records and cannot be deleted\."  
\}

# 3\. Delete Catalog Item

### URL

DELETE /master\-data/catalog\-items/\{itemId\}

### Request body

No request body required\.

### Success response

\{  
  "message": "Catalog item deleted successfully"  
\}

### Frontend notes

- Allow delete action only for OWNER, ACCOUNTS, and SUPERVISOR users\.
- Backend blocks delete when currentStock is not zero\.
- Backend also blocks delete when the item is used in batch costs, treatment logs, purchase entries, inventory ledger, or stock movements\.
- Refresh catalog item list after success\.

### Possible error responses

\{  
  "message": "This catalog item has stock balance and cannot be deleted\."  
\}

\{  
  "message": "This catalog item is already used and cannot be deleted\."  
\}

# 4\. Edit Payment

### URL

PUT /finance/payments/\{paymentId\}

### Dummy request

\{  
  "paymentMode": "CASH",  
  "amount": 2500,  
  "paymentDate": "2026\-07\-06",  
  "referenceType": "purchase",  
  "referenceId": "purchase\-uuid",  
  "vendorId": "vendor\-uuid",  
  "notes": "Updated payment"  
\}

### Success response

\{  
  "id": "payment\-uuid",  
  "organizationId": "organization\-uuid",  
  "batchId": null,  
  "vendorId": "vendor\-uuid",  
  "traderId": null,  
  "partyName": "ABC Feeds",  
  "paymentMode": "CASH",  
  "amount": 2500,  
  "paymentDate": "2026\-07\-06T00:00:00\.000Z",  
  "referenceType": "purchase",  
  "referenceId": "purchase\-uuid",  
  "notes": "Updated payment",  
  "createdById": "user\-uuid",  
  "createdAt": "2026\-07\-06T10:00:00\.000Z",  
  "updatedAt": "2026\-07\-06T10:15:00\.000Z"  
\}

### Frontend notes

- Backend subtracts old payment impact from old linked purchase, expense, sale, or settlement before applying the updated payment\.
- Changing referenceType or referenceId is supported\. The backend validates vendor/trader rules for the new reference\.
- For purchase or expense payments, use vendor fields and do not send traderId\.
- For sale payments, use trader fields and do not send vendorId\.
- For settlement payments, do not send vendorId or traderId\.
- After success, refresh payments and the linked module list/detail because paid amount and payment status may change\.

### Possible error responses

\{  
  "message": "Payment amount must be greater than 0"  
\}

\{  
  "message": "Selected vendor does not match the linked purchase"  
\}

# Suggested Frontend Refresh Map

__After API__

__Refresh these screens or queries__

__Edit purchase__

GET /finance/purchases, GET /inventory/ledger, GET /inventory/balances, GET /master\-data/catalog\-items

__Delete purchase__

GET /finance/purchases, GET /inventory/ledger, GET /inventory/balances, GET /master\-data/catalog\-items

__Delete catalog item__

GET /master\-data/catalog\-items

__Edit payment__

GET /finance/payments plus linked purchase, expense, sale, or settlement screen

# Implementation Checklist

- Use backend error message text for toast/snackbar display\.
- Disable or hide actions based on role where possible, but still handle 403 and 400 from backend\.
- Send only changed fields for edit forms when practical\.
- For delete actions, show a confirmation dialog before calling the API\.
- After successful mutation, invalidate all dependent queries listed in the refresh map\.

