/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Add rate_limit field (requests per second)
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_rate_limit",
    "max": 500,
    "min": 1,
    "name": "rate_limit",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add bulk_size field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_bulk_size",
    "max": 100,
    "min": 1,
    "name": "bulk_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add concurrency field
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_concurrency",
    "max": 100,
    "min": 1,
    "name": "concurrency",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Add timeout field (seconds)
  collection.fields.push(new Field({
    "hidden": false,
    "id": "number_timeout",
    "max": 7200,
    "min": 60,
    "name": "timeout",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Remove the added fields
  collection.fields.removeByName("rate_limit");
  collection.fields.removeByName("bulk_size");
  collection.fields.removeByName("concurrency");
  collection.fields.removeByName("timeout");

  return app.save(collection);
});
