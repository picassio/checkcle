/// <reference path="../pb_data/types.d.ts" />
/**
 * Security Migration: Add proper access rules to user-facing collections
 *
 * This migration updates user-facing collections to require authentication.
 * Internal/monitoring collections are excluded as they are accessed by the
 * service-operation Go microservice which runs inside the container.
 *
 * Security model:
 * - User-facing collections: Require authentication (managed via frontend)
 * - Internal collections: Public access (used by internal Go service)
 * - The frontend handles user authentication for all user operations
 * - The Go service handles internal monitoring without auth overhead
 */

// Collections that require authentication (user-facing only)
const protectedCollections = [
    'data_settings',          // User preferences
    'maintenance',            // User-managed maintenance windows
    'status_page_components', // User-managed status page config
    // RBAC collections - protected for user management
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'user_permissions',
    'resource_assignments'
];

// Internal collections - accessed by Go service-operation
// These remain public for internal service communication:
// - services, servers, dockers (monitored resources)
// - *_metrics, *_data (monitoring data written by Go service)
// - *_notification_templates (read by Go service for alerts)
// - incidents, alert_configurations (managed by Go service)
// - performance_*, security_* (managed by Go service)
// - regional_service, service_group, operational_page

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
