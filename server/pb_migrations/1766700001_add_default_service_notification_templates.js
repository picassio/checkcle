/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("service_notification_templates");

  // Create Default template
  const defaultTemplate = new Record(collection, {
    "name": "Default",
    "up_message": "🟢 Service ${service_name} is UP\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⏱️ Response Time: ${response_time}\n📊 Uptime: ${uptime}\n🕐 Time: ${timestamp}",
    "down_message": "🔴 Service ${service_name} is DOWN\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n❌ Error: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "warning_message": "⚠️ Service ${service_name} WARNING\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⚠️ Issue: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "incident_message": "🚨 Service ${service_name} INCIDENT\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n❌ Error: ${error_message}\n🕐 Time: ${timestamp}",
    "maintenance_message": "🔧 Service ${service_name} is under MAINTENANCE\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n🕐 Time: ${timestamp}",
    "resolved_message": "✅ Service ${service_name} RECOVERED\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${service_name}, ${status}, ${url}, ${host}, ${port}, ${domain}, ${service_type}, ${error_message}, ${response_time}, ${timestamp}, ${time}, ${date}, ${uptime}, ${region_name}, ${agent_id}"
  });
  app.save(defaultTemplate);

  // Create HTTP template
  const httpTemplate = new Record(collection, {
    "name": "HTTP",
    "up_message": "🟢 HTTP Service ${service_name} is UP\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⏱️ Response Time: ${response_time}\n📊 Status: ${status}\n🕐 Time: ${timestamp}",
    "down_message": "🔴 HTTP Service ${service_name} is DOWN\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n❌ Error: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "warning_message": "⚠️ HTTP Service ${service_name} WARNING\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⚠️ Issue: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "incident_message": "🚨 HTTP Service ${service_name} INCIDENT\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n❌ Error: ${error_message}\n🕐 Time: ${timestamp}",
    "maintenance_message": "🔧 HTTP Service ${service_name} is under MAINTENANCE\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n🕐 Time: ${timestamp}",
    "resolved_message": "✅ HTTP Service ${service_name} RECOVERED\n━━━━━━━━━━━━━━━━━━━━\n🌐 URL: ${url}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${service_name}, ${status}, ${url}, ${host}, ${error_message}, ${response_time}, ${timestamp}, ${time}, ${date}, ${uptime}"
  });
  app.save(httpTemplate);

  // Create TCP template
  const tcpTemplate = new Record(collection, {
    "name": "TCP",
    "up_message": "🟢 TCP Service ${service_name} is UP\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "down_message": "🔴 TCP Service ${service_name} is DOWN\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n❌ Error: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "warning_message": "⚠️ TCP Service ${service_name} WARNING\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n⚠️ Issue: ${error_message}\n🕐 Time: ${timestamp}",
    "incident_message": "🚨 TCP Service ${service_name} INCIDENT\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n❌ Error: ${error_message}\n🕐 Time: ${timestamp}",
    "maintenance_message": "🔧 TCP Service ${service_name} is under MAINTENANCE\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n🕐 Time: ${timestamp}",
    "resolved_message": "✅ TCP Service ${service_name} RECOVERED\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🔌 Port: ${port}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${service_name}, ${status}, ${host}, ${port}, ${error_message}, ${response_time}, ${timestamp}, ${time}, ${date}"
  });
  app.save(tcpTemplate);

  // Create DNS template
  const dnsTemplate = new Record(collection, {
    "name": "DNS",
    "up_message": "🟢 DNS Service ${service_name} is UP\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n🖥️ Host: ${host}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "down_message": "🔴 DNS Service ${service_name} is DOWN\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n🖥️ Host: ${host}\n❌ Error: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "warning_message": "⚠️ DNS Service ${service_name} WARNING\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n⚠️ Issue: ${error_message}\n🕐 Time: ${timestamp}",
    "incident_message": "🚨 DNS Service ${service_name} INCIDENT\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n❌ Error: ${error_message}\n🕐 Time: ${timestamp}",
    "maintenance_message": "🔧 DNS Service ${service_name} is under MAINTENANCE\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n🕐 Time: ${timestamp}",
    "resolved_message": "✅ DNS Service ${service_name} RECOVERED\n━━━━━━━━━━━━━━━━━━━━\n🌐 Domain: ${domain}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${service_name}, ${status}, ${domain}, ${host}, ${error_message}, ${response_time}, ${timestamp}, ${time}, ${date}"
  });
  app.save(dnsTemplate);

  // Create PING template
  const pingTemplate = new Record(collection, {
    "name": "PING",
    "up_message": "🟢 PING Service ${service_name} is UP\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n⏱️ Response Time: ${response_time}\n📊 Uptime: ${uptime}\n🕐 Time: ${timestamp}",
    "down_message": "🔴 PING Service ${service_name} is DOWN\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n❌ Error: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "warning_message": "⚠️ PING Service ${service_name} WARNING\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n⚠️ Issue: ${error_message}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "incident_message": "🚨 PING Service ${service_name} INCIDENT\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n❌ Error: ${error_message}\n🕐 Time: ${timestamp}",
    "maintenance_message": "🔧 PING Service ${service_name} is under MAINTENANCE\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n🕐 Time: ${timestamp}",
    "resolved_message": "✅ PING Service ${service_name} RECOVERED\n━━━━━━━━━━━━━━━━━━━━\n🖥️ Host: ${host}\n⏱️ Response Time: ${response_time}\n🕐 Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${service_name}, ${status}, ${host}, ${error_message}, ${response_time}, ${timestamp}, ${time}, ${date}, ${uptime}"
  });
  app.save(pingTemplate);

}, (app) => {
  // Rollback: delete the templates
  const collection = app.findCollectionByNameOrId("service_notification_templates");

  const templates = ["Default", "HTTP", "TCP", "DNS", "PING"];
  for (const name of templates) {
    try {
      const record = app.findFirstRecordByData(collection, "name", name);
      if (record) {
        app.delete(record);
      }
    } catch (e) {
      // Ignore if not found
    }
  }
});
