/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_security_queue",
    "name": "security_queue",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "system": false,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_scan_id",
        "max": 0,
        "min": 0,
        "name": "scan_id",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
          "timeout"
        ]
      },
      {
        "hidden": false,
        "id": "number_priority",
        "max": 100,
        "min": 1,
        "name": "priority",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select_source",
        "maxSelect": 1,
        "name": "source",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "scheduled",
          "manual"
        ]
      },
      {
        "hidden": false,
        "id": "date_queued_at",
        "max": "",
        "min": "",
        "name": "queued_at",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date_started_at",
        "max": "",
        "min": "",
        "name": "started_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date_completed_at",
        "max": "",
        "min": "",
        "name": "completed_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_error",
        "max": 0,
        "min": 0,
        "name": "error",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_findings_count",
        "max": null,
        "min": 0,
        "name": "findings_count",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE INDEX idx_security_queue_status_priority ON security_queue (status, priority, queued_at)",
      "CREATE INDEX idx_security_queue_scan_id ON security_queue (scan_id)"
    ]
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_security_queue");
    return app.delete(collection);
  } catch (e) {
    console.warn("Skip rollback (security_queue):", e?.message);
  }
});
