/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix regional_service collection rules
 *
 * The regional_service collection is used internally by the service-operation
 * microservice and needs to allow unauthenticated access since the Go service
 * doesn't authenticate with PocketBase.
 */

migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId('regional_service');
        if (collection) {
            // Allow public access for internal service operations
            collection.listRule = "";
            collection.viewRule = "";
            collection.createRule = "";
            collection.updateRule = "";
            collection.deleteRule = "";

            app.save(collection);
            console.log('[Fix] Restored public access for regional_service collection');
        }
    } catch (e) {
        console.log('[Fix] Could not update regional_service: ' + e.message);
    }
}, (app) => {
    // Revert: Set back to authenticated access
    const authRequiredRule = "@request.auth.id != ''";
    try {
        const collection = app.findCollectionByNameOrId('regional_service');
        if (collection) {
            collection.listRule = authRequiredRule;
            collection.viewRule = authRequiredRule;
            collection.createRule = authRequiredRule;
            collection.updateRule = authRequiredRule;
            collection.deleteRule = authRequiredRule;

            app.save(collection);
        }
    } catch (e) {
        // Skip
    }
});
