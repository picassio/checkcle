/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Add user_agent field for custom user-agent string
  collection.fields.push(new Field({
    "hidden": false,
    "id": "text_user_agent",
    "max": 500,
    "min": 0,
    "name": "user_agent",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Remove the user_agent field
  collection.fields.removeByName("user_agent");

  return app.save(collection);
});
