/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("performance_metrics");

  // Content Size Breakdown fields (bytes)
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_html_size",
    "max": null,
    "min": null,
    "name": "html_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_css_size",
    "max": null,
    "min": null,
    "name": "css_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_js_size",
    "max": null,
    "min": null,
    "name": "js_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_image_size",
    "max": null,
    "min": null,
    "name": "image_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_font_size",
    "max": null,
    "min": null,
    "name": "font_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_other_size",
    "max": null,
    "min": null,
    "name": "other_size",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Navigation Timing fields (ms)
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_dns_time",
    "max": null,
    "min": null,
    "name": "dns_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_connect_time",
    "max": null,
    "min": null,
    "name": "connect_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_ssl_time",
    "max": null,
    "min": null,
    "name": "ssl_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_backend_time",
    "max": null,
    "min": null,
    "name": "backend_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_frontend_time",
    "max": null,
    "min": null,
    "name": "frontend_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_fully_loaded",
    "max": null,
    "min": null,
    "name": "fully_loaded",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Coach Score fields (0-100)
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_coach_score",
    "max": null,
    "min": null,
    "name": "coach_score",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_coach_performance",
    "max": null,
    "min": null,
    "name": "coach_performance",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_coach_accessibility",
    "max": null,
    "min": null,
    "name": "coach_accessibility",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_coach_best_practice",
    "max": null,
    "min": null,
    "name": "coach_best_practice",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // CPU Metrics
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_cpu_long_tasks",
    "max": null,
    "min": null,
    "name": "cpu_long_tasks",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_cpu_long_tasks_time",
    "max": null,
    "min": null,
    "name": "cpu_long_tasks_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_max_long_task_time",
    "max": null,
    "min": null,
    "name": "max_long_task_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // Request Breakdown
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_html",
    "max": null,
    "min": null,
    "name": "requests_html",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_css",
    "max": null,
    "min": null,
    "name": "requests_css",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_js",
    "max": null,
    "min": null,
    "name": "requests_js",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_image",
    "max": null,
    "min": null,
    "name": "requests_image",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_font",
    "max": null,
    "min": null,
    "name": "requests_font",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_requests_other",
    "max": null,
    "min": null,
    "name": "requests_other",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_third_party_requests",
    "max": null,
    "min": null,
    "name": "third_party_requests",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("performance_metrics");

  // Rollback - remove all added fields
  const fieldsToRemove = [
    "html_size", "css_size", "js_size", "image_size", "font_size", "other_size",
    "dns_time", "connect_time", "ssl_time", "backend_time", "frontend_time", "fully_loaded",
    "coach_score", "coach_performance", "coach_accessibility", "coach_best_practice",
    "cpu_long_tasks", "cpu_long_tasks_time", "max_long_task_time",
    "requests_html", "requests_css", "requests_js", "requests_image", "requests_font", "requests_other", "third_party_requests"
  ];

  fieldsToRemove.forEach(name => {
    const field = collection.fields.getByName(name);
    if (field) {
      collection.fields.removeById(field.id);
    }
  });

  return app.save(collection);
});
