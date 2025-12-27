/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration: Ensure All Permissions Exist
 *
 * This migration ensures all resource:action permission combinations exist in the database.
 * It runs idempotently - only adding permissions that don't already exist.
 */

// All resources in the system
const resources = [
    'services',
    'servers',
    'users',
    'roles',
    'settings',
    'ssl_certificates',
    'alerts',
    'incidents',
    'maintenance',
    'reports',
    'security_scans',
    'performance_tests',
    'operational_pages',
    'service_groups'
];

// All actions in the system
const actions = ['view', 'create', 'update', 'delete', 'manage', 'acknowledge', 'export'];

// Helper function to generate permission description
function getPermissionDescription(resource, action) {
    const resourceLabel = resource.replace(/_/g, ' ');
    switch (action) {
        case 'view':
            return `View ${resourceLabel}`;
        case 'create':
            return `Create new ${resourceLabel}`;
        case 'update':
            return `Update existing ${resourceLabel}`;
        case 'delete':
            return `Delete ${resourceLabel}`;
        case 'manage':
            return `Full management of ${resourceLabel}`;
        case 'acknowledge':
            return `Acknowledge ${resourceLabel}`;
        case 'export':
            return `Export ${resourceLabel} data`;
        default:
            return `${action} ${resourceLabel}`;
    }
}

// Check if permission combination is valid
function isValidPermission(resource, action) {
    // acknowledge only for alerts and incidents
    if (action === 'acknowledge' && !['alerts', 'incidents'].includes(resource)) {
        return false;
    }
    // export for specific resources
    if (action === 'export' && !['reports', 'services', 'servers', 'incidents', 'alerts'].includes(resource)) {
        return false;
    }
    return true;
}

migrate((app) => {
    try {
        const permissionsCollection = app.findCollectionByNameOrId('permissions');

        // Get existing permissions
        const existingPermissions = new Set();
        try {
            const existing = app.findAllRecords(permissionsCollection);
            for (const record of existing) {
                existingPermissions.add(`${record.get('resource')}:${record.get('action')}`);
            }
        } catch (e) {
            console.log('[Permissions] No existing permissions found, will create all');
        }

        let createdCount = 0;
        let skippedCount = 0;

        // Create missing permissions
        for (const resource of resources) {
            for (const action of actions) {
                const key = `${resource}:${action}`;

                // Skip invalid combinations
                if (!isValidPermission(resource, action)) {
                    continue;
                }

                // Skip if already exists
                if (existingPermissions.has(key)) {
                    skippedCount++;
                    continue;
                }

                // Create the permission
                const record = new Record(permissionsCollection);
                record.set('resource', resource);
                record.set('action', action);
                record.set('description', getPermissionDescription(resource, action));
                app.save(record);
                createdCount++;
                console.log(`[Permissions] Created: ${key}`);
            }
        }

        console.log(`[Permissions] Created ${createdCount} new permissions, ${skippedCount} already existed`);
    } catch (e) {
        console.log('[Permissions] Error ensuring permissions:', e);
    }
}, (app) => {
    // No rollback needed - this is an idempotent migration
    console.log('[Permissions] Rollback: No action needed (idempotent migration)');
});
