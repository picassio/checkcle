/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration: Fix users collection rules to allow superadmin management
 *
 * Problem: The users collection had rules that only allowed self-access,
 * preventing superadmins from managing (viewing, updating, deleting) other users.
 *
 * Solution: Update rules to allow both self-access AND superadmin access.
 */

// Rule allowing self-access OR superadmin access
const superadminOrSelfRule = "id = @request.auth.id || @request.auth.collectionName = '_superusers'";

migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId('users');
        if (collection) {
            // Update rules to allow superadmins to manage all users
            collection.listRule = superadminOrSelfRule;
            collection.viewRule = superadminOrSelfRule;
            collection.updateRule = superadminOrSelfRule;
            collection.deleteRule = superadminOrSelfRule;
            // createRule remains empty (public registration allowed)

            app.save(collection);
            console.log('[Users] Updated collection rules to allow superadmin management');
        }
    } catch (e) {
        console.log('[Users] Error updating collection rules:', e);
    }
}, (app) => {
    // Revert: Set rules back to self-only access
    try {
        const collection = app.findCollectionByNameOrId('users');
        if (collection) {
            collection.listRule = "id = @request.auth.id";
            collection.viewRule = "id = @request.auth.id";
            collection.updateRule = "id = @request.auth.id";
            collection.deleteRule = "id = @request.auth.id";

            app.save(collection);
            console.log('[Users] Reverted collection rules to self-only access');
        }
    } catch (e) {
        console.log('[Users] Error reverting collection rules:', e);
    }
});
