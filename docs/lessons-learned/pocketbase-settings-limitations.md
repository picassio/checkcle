# PocketBase System Settings Limitations - Lessons Learned

## Overview

This document captures lessons learned from attempting to store custom branding settings in PocketBase's system `/api/settings` endpoint. The issue resulted in settings appearing to save successfully but not persisting.

---

## The Problem

We tried to store custom branding data inside PocketBase's system `/api/settings` endpoint by adding a `branding` object to the `meta` field:

```javascript
// What we tried to do
const settings = {
  meta: {
    appName: "CheckCle",
    appURL: "http://localhost:8090",
    senderName: "Support",
    senderAddress: "support@example.com",
    hideControls: true,
    branding: {  // ❌ Custom field - silently ignored!
      logoUrl: "...",
      faviconUrl: "...",
      showSocialLinks: true,
      // ... more custom settings
    }
  }
};

await fetch('/api/settings', {
  method: 'PATCH',
  body: JSON.stringify(settings)
});
```

### Symptoms
- API returned `200 OK` - appeared successful
- No error messages in response
- When fetching settings back, `meta.branding` was `undefined`
- Settings were lost on every page refresh

---

## Root Cause

**PocketBase's `/api/settings` endpoint only accepts a fixed set of fields** in the `meta` object:

| Field | Type | Description |
|-------|------|-------------|
| `appName` | string | Application name |
| `appURL` | string | Application URL |
| `senderName` | string | Email sender name |
| `senderAddress` | string | Email sender address |
| `hideControls` | boolean | Hide admin controls |

Any custom fields like `branding` are **silently ignored** - no error is thrown, the data simply doesn't persist.

---

## The Solution

Store custom application settings in a **dedicated PocketBase collection** instead of trying to extend the system settings.

### Step 1: Create/Update Collection Schema

Add a JSON field to store flexible data:

```javascript
// Migration: Add branding field to data_settings collection
migrate((app) => {
  const collection = app.findCollectionByNameOrId("data_settings");

  collection.fields.push(new Field({
    "hidden": false,
    "id": "json_branding",
    "maxSize": 0,
    "name": "branding",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  return app.save(collection);
});
```

### Step 2: Create a Service for Custom Settings

```typescript
// brandingService.ts
import { pb } from "@/lib/pocketbase";

export const brandingService = {
  async getBranding(): Promise<BrandingData | null> {
    try {
      const records = await pb.collection('data_settings').getList(1, 1);
      if (records.items.length > 0) {
        return records.items[0].branding || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching branding:', error);
      return null;
    }
  },

  async saveBranding(branding: BrandingData): Promise<BrandingData | null> {
    const records = await pb.collection('data_settings').getList(1, 1);

    if (records.items.length > 0) {
      // Update existing record
      const record = await pb.collection('data_settings').update(records.items[0].id, {
        branding: branding
      });
      return record.branding;
    } else {
      // Create new record
      const record = await pb.collection('data_settings').create({
        branding: branding
      });
      return record.branding;
    }
  }
};
```

### Step 3: Use Collection Instead of System Settings

```typescript
// ❌ DON'T do this
await fetch('/api/settings', {
  method: 'PATCH',
  body: JSON.stringify({ meta: { branding: {...} } })
});

// ✅ DO this instead
await pb.collection('data_settings').update(id, {
  branding: { ... }
});
```

---

## Key Takeaways

### 1. Don't Extend PocketBase System Settings
PocketBase's `/api/settings` endpoint has a fixed schema. It will silently ignore any fields it doesn't recognize.

### 2. Use Collections for Custom Data
Create a dedicated collection with a `json` type field to store flexible/custom data structures.

### 3. Silent Failures Are Tricky
The API returned success (200 OK) even though the custom field wasn't saved. Always verify data persistence by reading it back after writing.

### 4. Add Debug Logging Early
Console logs helped identify that `meta.branding` was `undefined` after save, revealing the root cause quickly:

```typescript
// Helpful debug logging during development
console.log('[getSettings] meta.branding:', settings.meta?.branding);
```

### 5. Check API Documentation
Understanding PocketBase's system settings schema would have prevented this architectural mistake upfront. The official docs specify which fields are accepted.

---

## When to Use System Settings vs Collections

| Use System Settings (`/api/settings`) | Use Collections |
|---------------------------------------|-----------------|
| App name, URL | Custom branding (logos, colors) |
| Email sender info | User preferences |
| SMTP configuration | Feature flags |
| Rate limits | Application state |
| Backup settings | Custom configurations |

---

## Files Changed to Fix This Issue

### New Files
- `server/pb_migrations/1766300001_add_branding_to_data_settings.js` - Migration to add branding field
- `application/src/services/brandingService.ts` - Service for branding CRUD

### Modified Files
- `application/src/contexts/BrandingContext.tsx` - Use brandingService instead of settingsService
- `application/src/components/settings/branding/BrandingSettings.tsx` - Use brandingService for save/load

---

## Testing Checklist

When implementing custom settings storage:

- [ ] Verify data persists after page refresh
- [ ] Verify data persists after server restart
- [ ] Check for silent failures by reading data back after write
- [ ] Test with empty/null values
- [ ] Test migration on fresh database
- [ ] Test migration on existing database with data

---

## Resources

- [PocketBase Settings API](https://pocketbase.io/docs/api-settings/)
- [PocketBase Collections](https://pocketbase.io/docs/collections/)
- [PocketBase Migrations](https://pocketbase.io/docs/migrations/)
