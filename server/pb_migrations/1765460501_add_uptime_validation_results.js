/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const uptimeData = app.findCollectionByNameOrId("uptime_data")

  // Add validation_results field to uptime_data collection
  uptimeData.fields.add(new JSONField({
    name: "validation_results",
    required: false,
    maxSize: 100000,
  }))

  return app.save(uptimeData)
}, (app) => {
  const uptimeData = app.findCollectionByNameOrId("uptime_data")

  uptimeData.fields.removeByName("validation_results")

  return app.save(uptimeData)
})
