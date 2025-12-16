/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_queue");

  // Add scanned_urls_count field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_scanned_urls_count",
    "max": null,
    "min": 0,
    "name": "scanned_urls_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add scanned_urls_sample field (JSON array of first 20 URLs)
  collection.fields.push(new Field({
    "hidden": false,
    "id": "json_scanned_urls_sample",
    "maxSize": 0,
    "name": "scanned_urls_sample",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  // Add scan_mode_used field
  collection.fields.push(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_scan_mode_used",
    "max": 50,
    "min": 0,
    "name": "scan_mode_used",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_queue");

  // Remove the added fields
  collection.fields.removeByName("scanned_urls_count");
  collection.fields.removeByName("scanned_urls_sample");
  collection.fields.removeByName("scan_mode_used");

  return app.save(collection);
});
