# Daily Entry with Vaccination & Medication — Frontend Guide

The daily entry now supports recording **vaccination and medication** in the *same* request as the daily log. Treatments are also returned on every daily-log read, so you can show them per day.

- **Base URL:** `{{BASE_URL}}/api/v1`
- **Auth:** `Authorization: Bearer <jwt>` (required on all endpoints below)
- **Roles allowed to create/update:** `OWNER`, `SUPERVISOR`, `FARMER`
- **Content-Type:** `application/json`

> A daily entry = one row per batch per date (`logDate` is unique per batch).
> Treatments attached here are auto-linked to that day (`dailyLogId`) and inherit the entry's date unless you pass a `treatmentDate`.

---

## The `treatments[]` object

Used inside both create and update payloads.

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string | ✅ | One of `VACCINATION`, `MEDICATION`, `OTHER` (case-insensitive; validated server-side). |
| `treatmentName` | string | ✅ | e.g. `"Lasota"`, `"Enrofloxacin"`. |
| `catalogItemId` | uuid | ❌ | Link to a catalog item (medicine/vaccine) if picked from inventory. |
| `dosage` | string | ❌ | Free text, e.g. `"1 drop/bird"`, `"10ml/100L water"`. |
| `birdCount` | number | ❌ | Birds treated. |
| `notes` | string | ❌ | Free text. |
| `treatmentDate` | string (`YYYY-MM-DD`) | ❌ | Defaults to the entry's `logDate`. |
| `clientReferenceId` | string | ❌ | Your idempotency/reference key. |

---

## 1. Create a daily entry (with treatments)

**`POST /api/v1/batches/{batchId}/daily-logs`**

`batchId` example: `c1ee7079-2378-4f84-b39b-2bf9f8d7f217`

### Request body

```jsonc
{
  "logDate": "2026-07-10",
  "openingBirdCount": 4637,   // optional — auto-computed if omitted
  "mortalityCount": 5,
  "cullCount": 0,
  "feedConsumedKg": 240.5,    // this is what drives totalFeedConsumedKg + FCR
  "waterConsumedLtr": 480,
  "avgWeightGrams": 1850,
  "notes": "Birds active, normal intake",
  "treatments": [
    {
      "kind": "VACCINATION",
      "treatmentName": "Lasota",
      "dosage": "1 drop/bird",
      "birdCount": 4632
    },
    {
      "kind": "MEDICATION",
      "treatmentName": "Enrofloxacin",
      "dosage": "10ml/100L water",
      "notes": "3-day course, day 1"
    }
  ]
}
```

> `treatments` is **optional** — send `[]` or omit it for a plain daily entry.

### Response `201 Created`

```jsonc
{
  "id": "9f0c1b2a-1111-4d2e-8a10-abc123456789",
  "organizationId": "e3b8708c-7e83-4df7-8c9c-e92a2c1e908e",
  "batchId": "c1ee7079-2378-4f84-b39b-2bf9f8d7f217",
  "logDate": "2026-07-10T00:00:00.000Z",
  "openingBirdCount": 4637,
  "mortalityCount": 5,
  "cullCount": 0,
  "feedConsumedKg": 240.5,
  "waterConsumedLtr": 480,
  "avgWeightGrams": 1850,
  "notes": "Birds active, normal intake",
  "clientReferenceId": null,
  "recordedById": "d60a078e-71cb-47d8-b794-93c41ed9d610",
  "correctedById": null,
  "createdAt": "2026-07-10T06:12:48.732Z",
  "updatedAt": "2026-07-10T06:12:48.732Z",
  "treatments": [
    {
      "id": "aa11bb22-cc33-4455-8899-000000000001",
      "organizationId": "e3b8708c-7e83-4df7-8c9c-e92a2c1e908e",
      "batchId": "c1ee7079-2378-4f84-b39b-2bf9f8d7f217",
      "dailyLogId": "9f0c1b2a-1111-4d2e-8a10-abc123456789",
      "treatmentDate": "2026-07-10T00:00:00.000Z",
      "kind": "VACCINATION",
      "catalogItemId": null,
      "treatmentName": "Lasota",
      "dosage": "1 drop/bird",
      "birdCount": 4632,
      "notes": null,
      "clientReferenceId": null,
      "administeredById": "d60a078e-71cb-47d8-b794-93c41ed9d610",
      "createdAt": "2026-07-10T06:12:48.900Z",
      "updatedAt": "2026-07-10T06:12:48.900Z"
    },
    {
      "id": "aa11bb22-cc33-4455-8899-000000000002",
      "organizationId": "e3b8708c-7e83-4df7-8c9c-e92a2c1e908e",
      "batchId": "c1ee7079-2378-4f84-b39b-2bf9f8d7f217",
      "dailyLogId": "9f0c1b2a-1111-4d2e-8a10-abc123456789",
      "treatmentDate": "2026-07-10T00:00:00.000Z",
      "kind": "MEDICATION",
      "catalogItemId": null,
      "treatmentName": "Enrofloxacin",
      "dosage": "10ml/100L water",
      "birdCount": null,
      "notes": "3-day course, day 1",
      "clientReferenceId": null,
      "administeredById": "d60a078e-71cb-47d8-b794-93c41ed9d610",
      "createdAt": "2026-07-10T06:12:48.950Z",
      "updatedAt": "2026-07-10T06:12:48.950Z"
    }
  ]
}
```

### Common errors

| Status | When |
|---|---|
| `400` | `logDate` in the future, or a daily entry already exists for that date. |
| `400` | `kind` is not a valid TREATMENT_KIND value. |
| `400` | `catalogItemId` doesn't belong to your organization. |
| `403` | Role not permitted / farmer editing another user's entry. |

---

## 2. List daily entries (treatments included)

**`GET /api/v1/batches/{batchId}/daily-logs`**

### Response `200 OK`

```jsonc
{
  "data": [
    {
      "id": "9f0c1b2a-1111-4d2e-8a10-abc123456789",
      "logDate": "2026-07-10T00:00:00.000Z",
      "mortalityCount": 5,
      "cullCount": 0,
      "feedConsumedKg": 240.5,
      "avgWeightGrams": 1850,
      "notes": "Birds active, normal intake",
      "recordedById": "d60a078e-71cb-47d8-b794-93c41ed9d610",
      "createdAt": "2026-07-10T06:12:48.732Z",
      "updatedAt": "2026-07-10T06:12:48.732Z",
      "treatments": [
        {
          "id": "aa11bb22-cc33-4455-8899-000000000001",
          "kind": "VACCINATION",
          "treatmentName": "Lasota",
          "dosage": "1 drop/bird",
          "birdCount": 4632,
          "treatmentDate": "2026-07-10T00:00:00.000Z",
          "dailyLogId": "9f0c1b2a-1111-4d2e-8a10-abc123456789"
        }
      ]
    }
    // ...more days, newest first. treatments: [] when none.
  ]
}
```

> Fields shown above are trimmed for readability — the actual objects carry the full field set from section 1.

---

## 3. Update a daily entry (append treatments)

**`PUT /api/v1/batches/{batchId}/daily-logs/{dailyLogId}`**

Treatments in the array are **appended** to the day. Existing treatments are **not** modified or removed here — use section 4 for those.

### Request body

```jsonc
{
  "mortalityCount": 6,
  "feedConsumedKg": 245,
  "treatments": [
    {
      "kind": "MEDICATION",
      "treatmentName": "Vitamin B-Complex",
      "dosage": "5ml/100L water"
    }
  ]
}
```

### Response `200 OK`

Returns the updated daily log with the **full** treatments list for that day (the previously saved ones + the newly appended one).

---

## 4. Managing individual treatments (edit / delete / standalone add)

These existing endpoints are unchanged — use them to edit or remove a single treatment, or to add one outside the daily-entry screen.

| Method | URL | Purpose |
|---|---|---|
| `GET`  | `/api/v1/batches/{batchId}/treatments` | List all treatments for a batch. |
| `POST` | `/api/v1/batches/{batchId}/treatments` | Add one treatment (pass `dailyLogId` to link it to a day). |

> Standalone `POST /treatments` requires `treatmentDate` and `kind` + `treatmentName`; `dailyLogId` is optional.

---

## UI notes / recommendations

- On the **daily entry form**, add a repeatable "Vaccination / Medication" section that maps 1:1 to the `treatments[]` array. Use `kind` as a dropdown (`VACCINATION` / `MEDICATION` / `OTHER`).
- On the **day detail view**, render `dailyLog.treatments` as a list/chips grouped by `kind`.
- `feedConsumedKg` on the daily log is what powers **`totalFeedConsumedKg`** and **FCR** in the batch summary — treatments do not affect those numbers.
- To edit/remove a treatment already saved, call the standalone treatment endpoints (section 4), not the daily-log update.
