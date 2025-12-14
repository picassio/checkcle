/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Add scan_mode field (single, crawl, automatic, headless, dast)
  collection.fields.push(new Field({
    "hidden": false,
    "id": "select_scan_mode",
    "maxSelect": 1,
    "name": "scan_mode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "single",
      "crawl",
      "automatic",
      "headless",
      "dast"
    ]
  }));

  // Add crawl_enabled field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "bool_crawl_enabled",
    "name": "crawl_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // Add crawl_depth field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_crawl_depth",
    "max": 20,
    "min": 1,
    "name": "crawl_depth",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add crawl_max_pages field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_crawl_max_pages",
    "max": 10000,
    "min": 1,
    "name": "crawl_max_pages",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add headless_enabled field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "bool_headless_enabled",
    "name": "headless_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // Add automatic_scan field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "bool_automatic_scan",
    "name": "automatic_scan",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // Add dast_enabled field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "bool_dast_enabled",
    "name": "dast_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // Add scan_all_ips field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "bool_scan_all_ips",
    "name": "scan_all_ips",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Remove the added fields
  collection.fields.removeByName("scan_mode");
  collection.fields.removeByName("crawl_enabled");
  collection.fields.removeByName("crawl_depth");
  collection.fields.removeByName("crawl_max_pages");
  collection.fields.removeByName("headless_enabled");
  collection.fields.removeByName("automatic_scan");
  collection.fields.removeByName("dast_enabled");
  collection.fields.removeByName("scan_all_ips");

  return app.save(collection);
});
