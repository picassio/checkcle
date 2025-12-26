/// <reference path="../pb_data/types.d.ts" />
/**
 * Security Migration: Add proper access rules to all collections
 *
 * This migration updates all data collections to require authentication
 * for read/write operations, preventing unauthorized access to monitoring data.
 */

// Collections that require authentication for all operations
const protectedCollections = [
    'alert_configurations',
    'data_settings',
    'dns_data',
    'docker_metrics',
    'dockers',
    'incidents',
    'maintenance',
    'operational_page',
    'ping_data',
    'regional_service',
    'server_metrics',
    'server_notification_templates',
    'server_threshold_templates',
    'servers',
    'service_notification_templates',
    'services',
    'services_metrics',
    'ssl_certificates',
    'ssl_history',
    'ssl_notification_templates',
    'status_page_components',
    'tcp_data',
    'uptime_data',
    'performance_tests',
    'performance_metrics',
    'performance_budgets',
    'performance_queue',
    'security_scans',
    'security_results',
    'security_queue',
    'security_notification_templates',
    'service_group'
    // Note: 'webhook_configs' removed (collection was deleted)
    // Note: 'uptime_validation_results' removed (it's a field, not a collection)
];

// Rule requiring user to be authenticated
const authRequiredRule = "@request.auth.id != ''";

migrate((app) => {
    for (const collectionName of protectedCollections) {
        try {
            const collection = app.findCollectionByNameOrId(collectionName);
            if (collection) {
                // Set rules to require authentication
                collection.listRule = authRequiredRule;
                collection.viewRule = authRequiredRule;
                collection.createRule = authRequiredRule;
                collection.updateRule = authRequiredRule;
                collection.deleteRule = authRequiredRule;

                app.save(collection);
                console.log(`[Security] Updated access rules for collection: ${collectionName}`);
            }
        } catch (e) {
            // Collection might not exist, skip it
            console.log(`[Security] Skipping collection (not found): ${collectionName}`);
        }
    }

    console.log('[Security] Access rules migration completed');
}, (app) => {
    // Revert: Set rules back to empty (public access) - NOT RECOMMENDED
    // This is only for rollback purposes
    for (const collectionName of protectedCollections) {
        try {
            const collection = app.findCollectionByNameOrId(collectionName);
            if (collection) {
                collection.listRule = "";
                collection.viewRule = "";
                collection.createRule = "";
                collection.updateRule = "";
                collection.deleteRule = "";

                app.save(collection);
            }
        } catch (e) {
            // Collection might not exist, skip it
        }
    }

    console.log('[Security] Access rules reverted (WARNING: Public access restored)');
});
