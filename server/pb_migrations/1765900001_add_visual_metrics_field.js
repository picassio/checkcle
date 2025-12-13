/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_performance_tests");

  // Add visual_metrics boolean field
  collection.fields.push({
    "hidden": false,
    "id": "bool_visual_metrics",
    "name": "visual_metrics",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_performance_tests");

  // Remove the visual_metrics field
  const fieldIndex = collection.fields.findIndex(f => f.name === "visual_metrics");
  if (fieldIndex !== -1) {
    collection.fields.splice(fieldIndex, 1);
  }

  return app.save(collection);
});
