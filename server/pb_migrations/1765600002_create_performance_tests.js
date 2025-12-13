/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_performance_tests",
    "name": "performance_tests",
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
        "id": "text_test_name",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_test_url",
        "max": 0,
        "min": 0,
        "name": "url",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_test_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "active",
          "paused",
          "running",
          "error"
        ]
      },
      {
        "hidden": false,
        "id": "number_schedule_interval",
        "max": null,
        "min": 3600,
        "name": "schedule_interval",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date_last_run",
        "max": "",
        "min": "",
        "name": "last_run",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date_next_run",
        "max": "",
        "min": "",
        "name": "next_run",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_notification_id",
        "max": 0,
        "min": 0,
        "name": "notification_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_budget_id",
        "max": 0,
        "min": 0,
        "name": "budget_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_browser",
        "maxSelect": 1,
        "name": "browser",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "chrome",
          "firefox",
          "edge"
        ]
      },
      {
        "hidden": false,
        "id": "select_connectivity",
        "maxSelect": 1,
        "name": "connectivity",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "native",
          "3g",
          "4g",
          "cable"
        ]
      },
      {
        "hidden": false,
        "id": "number_runs",
        "max": 10,
        "min": 1,
        "name": "runs",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "json_sitespeed_options",
        "maxSize": 50000,
        "name": "sitespeed_options",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
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
    "indexes": []
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_performance_tests");
    return app.delete(collection);
  } catch (e) {
    console.warn("Skip rollback (performance_tests):", e?.message);
  }
});
