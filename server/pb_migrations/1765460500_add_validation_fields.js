/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const services = app.findCollectionByNameOrId("services")

  // Add validation fields to services collection
  services.fields.add(new NumberField({
    name: "expected_status_code",
    required: false,
    min: 0,
    max: 599,
  }))

  services.fields.add(new TextField({
    name: "keyword_check",
    required: false,
    max: 1000,
  }))

  services.fields.add(new SelectField({
    name: "keyword_check_type",
    required: false,
    values: ["contains", "not_contains"],
    maxSelect: 1,
  }))

  services.fields.add(new JSONField({
    name: "json_path_checks",
    required: false,
    maxSize: 50000,
  }))

  services.fields.add(new JSONField({
    name: "header_checks",
    required: false,
    maxSize: 50000,
  }))

  return app.save(services)
}, (app) => {
  const services = app.findCollectionByNameOrId("services")

  services.fields.removeByName("expected_status_code")
  services.fields.removeByName("keyword_check")
  services.fields.removeByName("keyword_check_type")
  services.fields.removeByName("json_path_checks")
  services.fields.removeByName("header_checks")

  return app.save(services)
})
