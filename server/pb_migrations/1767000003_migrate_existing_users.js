/// <reference path="../pb_data/types.d.ts" />
/**
 * RBAC Migration: Migrate Existing Users
 *
 * This migration assigns RBAC roles to existing users:
 * - _superusers -> superadmin role
 * - users -> admin role (default for existing users)
 */

migrate((app) => {
    console.log('[RBAC] Migrating existing users to RBAC system...');

    const rolesCollection = app.findCollectionByNameOrId('roles');
    const userRolesCollection = app.findCollectionByNameOrId('user_roles');

    // Find role records
    let superadminRole = null;
    let adminRole = null;

    try {
        const roles = app.findAllRecords(rolesCollection);
        for (const role of roles) {
            if (role.get('name') === 'superadmin') {
                superadminRole = role;
            } else if (role.get('name') === 'admin') {
                adminRole = role;
            }
        }
    } catch (e) {
        console.error('[RBAC] Failed to find roles:', e?.message);
        return;
    }

    if (!superadminRole) {
        console.error('[RBAC] superadmin role not found. Run seed migration first.');
        return;
    }

    if (!adminRole) {
        console.error('[RBAC] admin role not found. Run seed migration first.');
        return;
    }

    // Migrate _superusers
    let superuserCount = 0;
    try {
        const superusersCollection = app.findCollectionByNameOrId('_superusers');
        const superusers = app.findAllRecords(superusersCollection);

        for (const superuser of superusers) {
            // Check if role assignment already exists
            try {
                const existing = app.findFirstRecordByFilter(userRolesCollection,
                    `user_id = '${superuser.id}' && user_collection = '_superusers' && role_id = '${superadminRole.id}'`
                );
                if (existing) {
                    console.log(`[RBAC] Superuser ${superuser.id} already has superadmin role, skipping`);
                    continue;
                }
            } catch (e) {
                // No existing assignment, proceed
            }

            const assignment = new Record(userRolesCollection);
            assignment.set('user_id', superuser.id);
            assignment.set('user_collection', '_superusers');
            assignment.set('role_id', superadminRole.id);
            assignment.set('assigned_by', 'system_migration');
            app.save(assignment);
            superuserCount++;
        }
        console.log(`[RBAC] Assigned superadmin role to ${superuserCount} superusers`);
    } catch (e) {
        console.warn('[RBAC] No _superusers to migrate or error:', e?.message);
    }

    // Migrate regular users
    let userCount = 0;
    try {
        const usersCollection = app.findCollectionByNameOrId('users');
        const users = app.findAllRecords(usersCollection);

        for (const user of users) {
            // Check if role assignment already exists
            try {
                const existing = app.findFirstRecordByFilter(userRolesCollection,
                    `user_id = '${user.id}' && user_collection = 'users' && role_id = '${adminRole.id}'`
                );
                if (existing) {
                    console.log(`[RBAC] User ${user.id} already has admin role, skipping`);
                    continue;
                }
            } catch (e) {
                // No existing assignment, proceed
            }

            const assignment = new Record(userRolesCollection);
            assignment.set('user_id', user.id);
            assignment.set('user_collection', 'users');
            assignment.set('role_id', adminRole.id);
            assignment.set('assigned_by', 'system_migration');
            app.save(assignment);
            userCount++;
        }
        console.log(`[RBAC] Assigned admin role to ${userCount} regular users`);
    } catch (e) {
        console.warn('[RBAC] No users to migrate or error:', e?.message);
    }

    console.log(`[RBAC] Migration complete. Total: ${superuserCount} superadmins, ${userCount} admins`);
}, (app) => {
    // Rollback: Remove role assignments created by this migration
    console.log('[RBAC] Rolling back user role assignments...');

    try {
        const userRolesCollection = app.findCollectionByNameOrId('user_roles');

        // Find and delete assignments made by system_migration
        const migrationAssignments = app.findAllRecords(userRolesCollection, {
            filter: "assigned_by = 'system_migration'"
        });

        let deletedCount = 0;
        for (const assignment of migrationAssignments) {
            app.delete(assignment);
            deletedCount++;
        }

        console.log(`[RBAC] Deleted ${deletedCount} migration-created role assignments`);
    } catch (e) {
        console.warn('[RBAC] Rollback error:', e?.message);
    }

    console.log('[RBAC] Rollback completed');
});
