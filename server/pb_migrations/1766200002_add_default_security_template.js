/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("security_notification_templates");

  // Create default security notification template
  const record = new Record(collection, {
    "name": "Default Security Template",
    "critical": "🚨 [CRITICAL] Security Vulnerability Found\n• Scan: ${scan_name}\n• Target: ${target_url}\n• Finding: ${template_name}\n• Host: ${host}\n• CVEs: ${cve_ids}\n• Description: ${description}\n• Solution: ${solution}\n• Time: ${timestamp}",
    "high": "🟠 [HIGH] Security Vulnerability Found\n• Scan: ${scan_name}\n• Target: ${target_url}\n• Finding: ${template_name}\n• Host: ${host}\n• CVEs: ${cve_ids}\n• Description: ${description}\n• Solution: ${solution}\n• Time: ${timestamp}",
    "medium": "🟡 [MEDIUM] Security Vulnerability Found\n• Scan: ${scan_name}\n• Target: ${target_url}\n• Finding: ${template_name}\n• Host: ${host}\n• Description: ${description}\n• Time: ${timestamp}",
    "low": "🔵 [LOW] Security Finding\n• Scan: ${scan_name}\n• Target: ${target_url}\n• Finding: ${template_name}\n• Host: ${host}\n• Description: ${description}\n• Time: ${timestamp}",
    "info": "ℹ️ [INFO] Security Information\n• Scan: ${scan_name}\n• Target: ${target_url}\n• Finding: ${template_name}\n• Host: ${host}\n• Description: ${description}\n• Time: ${timestamp}",
    "summary": "🛡️ Security Scan Complete: ${scan_name}\n• Target: ${target_url}\n• Total Findings: ${total_findings}\n• Critical: ${critical_count}\n• High: ${high_count}\n• Medium: ${medium_count}\n• Low: ${low_count}\n• Info: ${info_count}\n• Time: ${timestamp}",
    "placeholder": "Available placeholders:\n${scan_name}, ${target_url}, ${template_id}, ${template_name}, ${severity}, ${host}, ${matched_url}, ${description}, ${solution}, ${cve_ids}, ${timestamp}, ${time}, ${date}\n\nFor summary: ${total_findings}, ${critical_count}, ${high_count}, ${medium_count}, ${low_count}, ${info_count}"
  });

  return app.save(record);
}, (app) => {
  const collection = app.findCollectionByNameOrId("security_notification_templates");
  const record = app.findFirstRecordByData(collection, "name", "Default Security Template");
  if (record) {
    return app.delete(record);
  }
});
