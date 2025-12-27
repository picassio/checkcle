/// <reference path="../pb_data/types.d.ts" />
/**
 * Reset internal collection rules to public access
 *
 * This migration resets all internal/monitoring collections to public access.
 * These collections are used by the service-operation Go microservice which
 * runs inside the container and doesn't authenticate with PocketBase.
 *
 * The previous security migration may have set auth requirements on these
 * collections, so we need to explicitly reset them.
 */

// Internal collections that need public access for Go service
const internalCollections = [
    // Monitored resources
    'services',
    'servers',
    'dockers',
    'ssl_certificates',

    // Monitoring data (written by Go service)
    'server_metrics',
    'services_metrics',
    'uptime_data',
    'ssl_history',
    'ping_data',
    'dns_data',
    'tcp_data',
    'docker_metrics',

    // Notification templates (read by Go service)
    'server_notification_templates',
    'service_notification_templates',
    'ssl_notification_templates',
    'security_notification_templates',
    'server_threshold_templates',

    // Alert and incident management
    'alert_configurations',
    'incidents',

    // Performance monitoring
    'performance_tests',
    'performance_metrics',
    'performance_budgets',
    'performance_queue',

    // Security scanning
    'security_scans',
    'security_results',
    'security_queue',

    // Other internal
    'regional_service',
    'service_group',
    'operational_page'
];

migrate((app) => {
    for (const collectionName of internalCollections) {
        try {
            const collection = app.findCollectionByNameOrId(collectionName);
            if (collection) {
                // Set rules to public access (empty string = anyone can access)
                collection.listRule = "";
                collection.viewRule = "";
                collection.createRule = "";
                collection.updateRule = "";
                collection.deleteRule = "";

                app.save(collection);
                console.log(`[Internal] Reset to public access: ${collectionName}`);
            }
        } catch (e) {
            // Collection might not exist, skip it
            console.log(`[Internal] Skipping (not found): ${collectionName}`);
        }
    }

    console.log('[Internal] Internal collection rules reset completed');
}, (app) => {
    // Revert: Set rules to require authentication
    const authRequiredRule = "@request.auth.id != ''";

    for (const collectionName of internalCollections) {
        try {
            const collection = app.findCollectionByNameOrId(collectionName);
            if (collection) {
                collection.listRule = authRequiredRule;
                collection.viewRule = authRequiredRule;
                collection.createRule = authRequiredRule;
                collection.updateRule = authRequiredRule;
                collection.deleteRule = authRequiredRule;

                app.save(collection);
            }
        } catch (e) {
            // Collection might not exist, skip it
        }
    }

    console.log('[Internal] Internal collections reverted to require authentication');
});
