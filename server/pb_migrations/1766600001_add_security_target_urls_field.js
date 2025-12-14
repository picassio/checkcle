/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Add target_urls field for multiple URLs (JSON array)
  collection.fields.push(new Field({
    "hidden": false,
    "id": "json_target_urls",
    "maxSize": 0,
    "name": "target_urls",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Remove the target_urls field
  collection.fields.removeByName("target_urls");

  return app.save(collection);
});
