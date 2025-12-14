/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Find and update the scan_mode field to add 'url_list' option
  const scanModeField = collection.fields.find(f => f.name === "scan_mode");
  if (scanModeField) {
    scanModeField.values = [
      "single",
      "url_list",
      "crawl",
      "automatic",
      "headless",
      "dast"
    ];
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_scans");

  // Remove 'url_list' from scan_mode values
  const scanModeField = collection.fields.find(f => f.name === "scan_mode");
  if (scanModeField) {
    scanModeField.values = [
      "single",
      "crawl",
      "automatic",
      "headless",
      "dast"
    ];
  }

  return app.save(collection);
});
