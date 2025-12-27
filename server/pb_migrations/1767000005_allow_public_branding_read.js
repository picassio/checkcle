/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration: Allow public read access to data_settings for branding
 *
 * Problem: The data_settings collection requires authentication, but the Login page
 * needs to fetch branding settings (loginLogoUrl, appName, etc.) before the user logs in.
 *
 * Solution: Allow public read (list/view) access to data_settings while keeping
 * create/update/delete restricted to authenticated users.
 */

migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId('data_settings');
        if (collection) {
            // Allow public read access for branding on login page
            collection.listRule = "";  // Public read
            collection.viewRule = "";  // Public read
            // Keep create/update/delete restricted to authenticated users
            collection.createRule = "@request.auth.id != ''";
            collection.updateRule = "@request.auth.id != ''";
            collection.deleteRule = "@request.auth.id != ''";

            app.save(collection);
            console.log('[Branding] Updated data_settings to allow public read access');
        }
    } catch (e) {
        console.log('[Branding] Error updating data_settings rules:', e);
    }
}, (app) => {
    // Revert: Set all rules back to require authentication
    try {
        const collection = app.findCollectionByNameOrId('data_settings');
        if (collection) {
            const authRequiredRule = "@request.auth.id != ''";
            collection.listRule = authRequiredRule;
            collection.viewRule = authRequiredRule;
            collection.createRule = authRequiredRule;
            collection.updateRule = authRequiredRule;
            collection.deleteRule = authRequiredRule;

            app.save(collection);
            console.log('[Branding] Reverted data_settings to require authentication');
        }
    } catch (e) {
        console.log('[Branding] Error reverting data_settings rules:', e);
    }
});
