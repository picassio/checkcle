/// <reference path="../pb_data/types.d.ts" />
/**
 * RBAC Migration: Seed Roles and Permissions
 *
 * This migration creates:
 * 1. 5 predefined system roles
 * 2. All permission combinations
 * 3. Maps default permissions to each role
 */

// Define system roles
const systemRoles = [
    {
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access to monitoring data and dashboards',
        is_system: true,
        priority: 10
    },
    {
        name: 'operator',
        display_name: 'Operator',
        description: 'View access plus ability to acknowledge alerts and incidents',
        is_system: true,
        priority: 20
    },
    {
        name: 'service_manager',
        display_name: 'Service Manager',
        description: 'Manage assigned services and servers',
        is_system: true,
        priority: 30
    },
    {
        name: 'admin',
        display_name: 'Admin',
        description: 'Full management access except user and role administration',
        is_system: true,
        priority: 40
    },
    {
        name: 'superadmin',
        display_name: 'Super Admin',
        description: 'Full system access including user and role management',
        is_system: true,
        priority: 100
    }
];

// Define all resources
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

// Define all actions
const actions = ['view', 'create', 'update', 'delete', 'manage', 'acknowledge', 'export'];

// Define which permissions each role gets
// Format: { resource: [actions] }
const rolePermissions = {
    viewer: {
        services: ['view'],
        servers: ['view'],
        ssl_certificates: ['view'],
        alerts: ['view'],
        incidents: ['view'],
        maintenance: ['view'],
        reports: ['view', 'export'],
        security_scans: ['view'],
        performance_tests: ['view'],
        operational_pages: ['view'],
        service_groups: ['view']
    },
    operator: {
        services: ['view'],
        servers: ['view'],
        ssl_certificates: ['view'],
        alerts: ['view', 'acknowledge'],
        incidents: ['view', 'acknowledge', 'update'],
        maintenance: ['view', 'create', 'update'],
        reports: ['view', 'export'],
        security_scans: ['view'],
        performance_tests: ['view'],
        operational_pages: ['view'],
        service_groups: ['view']
    },
    service_manager: {
        services: ['view', 'create', 'update', 'manage'],
        servers: ['view', 'create', 'update', 'manage'],
        ssl_certificates: ['view', 'create', 'update', 'manage'],
        alerts: ['view', 'acknowledge', 'create', 'update'],
        incidents: ['view', 'acknowledge', 'create', 'update'],
        maintenance: ['view', 'create', 'update', 'delete'],
        reports: ['view', 'export'],
        security_scans: ['view', 'create', 'update', 'manage'],
        performance_tests: ['view', 'create', 'update', 'manage'],
        operational_pages: ['view', 'update'],
        service_groups: ['view', 'create', 'update']
    },
    admin: {
        services: ['view', 'create', 'update', 'delete', 'manage'],
        servers: ['view', 'create', 'update', 'delete', 'manage'],
        ssl_certificates: ['view', 'create', 'update', 'delete', 'manage'],
        alerts: ['view', 'acknowledge', 'create', 'update', 'delete', 'manage'],
        incidents: ['view', 'acknowledge', 'create', 'update', 'delete', 'manage'],
        maintenance: ['view', 'create', 'update', 'delete', 'manage'],
        reports: ['view', 'create', 'export'],
        security_scans: ['view', 'create', 'update', 'delete', 'manage'],
        performance_tests: ['view', 'create', 'update', 'delete', 'manage'],
        operational_pages: ['view', 'create', 'update', 'delete', 'manage'],
        service_groups: ['view', 'create', 'update', 'delete', 'manage'],
        settings: ['view', 'update']
    },
    superadmin: {
        services: ['view', 'create', 'update', 'delete', 'manage'],
        servers: ['view', 'create', 'update', 'delete', 'manage'],
        users: ['view', 'create', 'update', 'delete', 'manage'],
        roles: ['view', 'create', 'update', 'delete', 'manage'],
        settings: ['view', 'create', 'update', 'delete', 'manage'],
        ssl_certificates: ['view', 'create', 'update', 'delete', 'manage'],
        alerts: ['view', 'acknowledge', 'create', 'update', 'delete', 'manage'],
        incidents: ['view', 'acknowledge', 'create', 'update', 'delete', 'manage'],
        maintenance: ['view', 'create', 'update', 'delete', 'manage'],
        reports: ['view', 'create', 'update', 'delete', 'export', 'manage'],
        security_scans: ['view', 'create', 'update', 'delete', 'manage'],
        performance_tests: ['view', 'create', 'update', 'delete', 'manage'],
        operational_pages: ['view', 'create', 'update', 'delete', 'manage'],
        service_groups: ['view', 'create', 'update', 'delete', 'manage']
    }
};

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

migrate((app) => {
    const rolesCollection = app.findCollectionByNameOrId('roles');
    const permissionsCollection = app.findCollectionByNameOrId('permissions');
    const rolePermissionsCollection = app.findCollectionByNameOrId('role_permissions');

    // Maps to store created records
    const roleRecords = {};
    const permissionRecords = {};

    // 1. Create system roles
    console.log('[RBAC] Creating system roles...');
    for (const roleData of systemRoles) {
        const record = new Record(rolesCollection);
        record.set('name', roleData.name);
        record.set('display_name', roleData.display_name);
        record.set('description', roleData.description);
        record.set('is_system', roleData.is_system);
        record.set('priority', roleData.priority);
        app.save(record);
        roleRecords[roleData.name] = record;
        console.log(`[RBAC] Created role: ${roleData.display_name}`);
    }

    // 2. Create permissions (resource:action pairs)
    console.log('[RBAC] Creating permissions...');
    for (const resource of resources) {
        for (const action of actions) {
            // Skip invalid combinations
            if (action === 'acknowledge' && !['alerts', 'incidents'].includes(resource)) {
                continue;
            }
            if (action === 'export' && !['reports', 'services', 'servers', 'incidents', 'alerts'].includes(resource)) {
                continue;
            }

            const record = new Record(permissionsCollection);
            record.set('resource', resource);
            record.set('action', action);
            record.set('description', getPermissionDescription(resource, action));
            app.save(record);

            const key = `${resource}:${action}`;
            permissionRecords[key] = record;
        }
    }
    console.log(`[RBAC] Created ${Object.keys(permissionRecords).length} permissions`);

    // 3. Assign permissions to roles
    console.log('[RBAC] Assigning permissions to roles...');
    let assignmentCount = 0;

    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
        const roleRecord = roleRecords[roleName];
        if (!roleRecord) {
            console.warn(`[RBAC] Role not found: ${roleName}`);
            continue;
        }

        for (const [resource, actionsList] of Object.entries(permissions)) {
            for (const action of actionsList) {
                const permKey = `${resource}:${action}`;
                const permRecord = permissionRecords[permKey];

                if (!permRecord) {
                    console.warn(`[RBAC] Permission not found: ${permKey}`);
                    continue;
                }

                const assignment = new Record(rolePermissionsCollection);
                assignment.set('role_id', roleRecord.id);
                assignment.set('permission_id', permRecord.id);
                app.save(assignment);
                assignmentCount++;
            }
        }
        console.log(`[RBAC] Assigned permissions to role: ${roleName}`);
    }

    console.log(`[RBAC] Created ${assignmentCount} role-permission assignments`);
    console.log('[RBAC] Seeding completed successfully');
}, (app) => {
    // Rollback: Delete all seeded data
    console.log('[RBAC] Rolling back seeded data...');

    // Delete role_permissions first (due to foreign keys)
    try {
        const rolePermissionsCollection = app.findCollectionByNameOrId('role_permissions');
        const rpRecords = app.findAllRecords(rolePermissionsCollection);
        for (const record of rpRecords) {
            app.delete(record);
        }
        console.log('[RBAC] Deleted role_permissions records');
    } catch (e) {
        console.warn('[RBAC] Skip role_permissions rollback:', e?.message);
    }

    // Delete permissions
    try {
        const permissionsCollection = app.findCollectionByNameOrId('permissions');
        const permRecords = app.findAllRecords(permissionsCollection);
        for (const record of permRecords) {
            app.delete(record);
        }
        console.log('[RBAC] Deleted permissions records');
    } catch (e) {
        console.warn('[RBAC] Skip permissions rollback:', e?.message);
    }

    // Delete roles
    try {
        const rolesCollection = app.findCollectionByNameOrId('roles');
        const roleRecords = app.findAllRecords(rolesCollection);
        for (const record of roleRecords) {
            app.delete(record);
        }
        console.log('[RBAC] Deleted roles records');
    } catch (e) {
        console.warn('[RBAC] Skip roles rollback:', e?.message);
    }

    console.log('[RBAC] Rollback completed');
});
