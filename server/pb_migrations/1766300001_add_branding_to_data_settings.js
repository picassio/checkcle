/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("data_settings");

  // Add branding JSON field to store all branding settings
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("data_settings");

  // Remove the branding field
  collection.fields.removeByName("branding");

  return app.save(collection);
});
