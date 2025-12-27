/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration to add queue_id field to security_results table
 * This allows direct linking of results to specific scan runs for accurate per-run filtering
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_results");
  if (!collection) {
    console.warn("security_results collection not found, skipping migration");
    return;
  }

  // Add queue_id field to link results to specific scan runs
  collection.fields.push(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_queue_id",
    "max": 0,
    "min": 0,
    "name": "queue_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,  // Optional for backward compatibility with existing results
    "system": false,
    "type": "text"
  }));

  // Add index for queue_id lookups
  if (!collection.indexes) {
    collection.indexes = [];
  }
  collection.indexes.push("CREATE INDEX idx_security_results_queue_id ON security_results (queue_id)");

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("security_results");
    if (!collection) {
      return;
    }

    // Remove the queue_id field
    collection.fields.removeByName("queue_id");

    // Remove the index
    collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_security_results_queue_id"));

    return app.save(collection);
  } catch (e) {
    console.warn("Skip rollback (security_results queue_id):", e?.message);
  }
});
