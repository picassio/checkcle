/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_performance_tests");

  // Add visual_metrics boolean field after runs field (index 12)
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "bool_visual_metrics",
    "name": "visual_metrics",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_performance_tests");

  // Remove the visual_metrics field
  collection.fields.removeByName("visual_metrics");

  return app.save(collection);
});
