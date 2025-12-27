/// <reference path="../pb_data/types.d.ts" />
/**
 * RBAC Migration: Create Role-Based Access Control Collections
 *
 * This migration creates 6 collections for the RBAC system:
 * 1. roles - Predefined and custom roles
 * 2. permissions - Permission definitions (resource:action pairs)
 * 3. role_permissions - Junction table linking roles to permissions
 * 4. user_roles - Assigns roles to users
 * 5. user_permissions - Per-user permission overrides
 * 6. resource_assignments - Resource-level access control
 */

migrate((app) => {
    // Authentication rule - only superadmins can manage RBAC
    const superadminRule = "@request.auth.collectionName = '_superusers'";
    const authRule = "@request.auth.id != ''";

    // 1. Create 'roles' collection
    const rolesCollection = new Collection({
        "id": "pbc_roles",
        "name": "roles",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule + " && is_system = false",
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_role_name",
                "max": 50,
                "min": 1,
                "name": "name",
                "pattern": "^[a-z_]+$",
                "presentable": true,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_display_name",
                "max": 100,
                "min": 1,
                "name": "display_name",
                "pattern": "",
                "presentable": true,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_description",
                "max": 500,
                "min": 0,
                "name": "description",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "bool_is_system",
                "name": "is_system",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "hidden": false,
                "id": "number_priority",
                "max": 1000,
                "min": 0,
                "name": "priority",
                "onlyInt": true,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX idx_roles_name ON roles (name)"
        ]
    });
    app.save(rolesCollection);
    console.log('[RBAC] Created roles collection');

    // 2. Create 'permissions' collection
    const permissionsCollection = new Collection({
        "id": "pbc_permissions",
        "name": "permissions",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule,
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select_resource",
                "maxSelect": 1,
                "name": "resource",
                "presentable": true,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "services",
                    "servers",
                    "users",
                    "roles",
                    "settings",
                    "ssl_certificates",
                    "alerts",
                    "incidents",
                    "maintenance",
                    "reports",
                    "security_scans",
                    "performance_tests",
                    "operational_pages",
                    "service_groups"
                ]
            },
            {
                "hidden": false,
                "id": "select_action",
                "maxSelect": 1,
                "name": "action",
                "presentable": true,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "view",
                    "create",
                    "update",
                    "delete",
                    "manage",
                    "acknowledge",
                    "export"
                ]
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_perm_description",
                "max": 500,
                "min": 0,
                "name": "description",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX idx_permissions_resource_action ON permissions (resource, action)"
        ]
    });
    app.save(permissionsCollection);
    console.log('[RBAC] Created permissions collection');

    // 3. Create 'role_permissions' junction collection
    const rolePermissionsCollection = new Collection({
        "id": "pbc_role_permissions",
        "name": "role_permissions",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule,
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "cascadeDelete": true,
                "collectionId": "pbc_roles",
                "hidden": false,
                "id": "relation_role_id",
                "maxSelect": 1,
                "minSelect": 1,
                "name": "role_id",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "cascadeDelete": true,
                "collectionId": "pbc_permissions",
                "hidden": false,
                "id": "relation_permission_id",
                "maxSelect": 1,
                "minSelect": 1,
                "name": "permission_id",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX idx_role_permissions_unique ON role_permissions (role_id, permission_id)"
        ]
    });
    app.save(rolePermissionsCollection);
    console.log('[RBAC] Created role_permissions collection');

    // 4. Create 'user_roles' collection
    const userRolesCollection = new Collection({
        "id": "pbc_user_roles",
        "name": "user_roles",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule,
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_user_id",
                "max": 50,
                "min": 1,
                "name": "user_id",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select_user_collection",
                "maxSelect": 1,
                "name": "user_collection",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "users",
                    "_superusers"
                ]
            },
            {
                "cascadeDelete": true,
                "collectionId": "pbc_roles",
                "hidden": false,
                "id": "relation_role_id",
                "maxSelect": 1,
                "minSelect": 1,
                "name": "role_id",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_assigned_by",
                "max": 50,
                "min": 0,
                "name": "assigned_by",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE INDEX idx_user_roles_user ON user_roles (user_id, user_collection)",
            "CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles (user_id, user_collection, role_id)"
        ]
    });
    app.save(userRolesCollection);
    console.log('[RBAC] Created user_roles collection');

    // 5. Create 'user_permissions' collection (per-user overrides)
    const userPermissionsCollection = new Collection({
        "id": "pbc_user_permissions",
        "name": "user_permissions",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule,
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_user_id",
                "max": 50,
                "min": 1,
                "name": "user_id",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select_user_collection",
                "maxSelect": 1,
                "name": "user_collection",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "users",
                    "_superusers"
                ]
            },
            {
                "cascadeDelete": true,
                "collectionId": "pbc_permissions",
                "hidden": false,
                "id": "relation_permission_id",
                "maxSelect": 1,
                "minSelect": 1,
                "name": "permission_id",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "bool_granted",
                "name": "granted",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_assigned_by",
                "max": 50,
                "min": 0,
                "name": "assigned_by",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE INDEX idx_user_permissions_user ON user_permissions (user_id, user_collection)",
            "CREATE UNIQUE INDEX idx_user_permissions_unique ON user_permissions (user_id, user_collection, permission_id)"
        ]
    });
    app.save(userPermissionsCollection);
    console.log('[RBAC] Created user_permissions collection');

    // 6. Create 'resource_assignments' collection
    const resourceAssignmentsCollection = new Collection({
        "id": "pbc_resource_assignments",
        "name": "resource_assignments",
        "type": "base",
        "listRule": authRule,
        "viewRule": authRule,
        "createRule": superadminRule,
        "updateRule": superadminRule,
        "deleteRule": superadminRule,
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_user_id",
                "max": 50,
                "min": 1,
                "name": "user_id",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select_user_collection",
                "maxSelect": 1,
                "name": "user_collection",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "users",
                    "_superusers"
                ]
            },
            {
                "hidden": false,
                "id": "select_resource_type",
                "maxSelect": 1,
                "name": "resource_type",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "services",
                    "servers",
                    "ssl_certificates",
                    "security_scans",
                    "performance_tests",
                    "service_groups"
                ]
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_resource_id",
                "max": 50,
                "min": 1,
                "name": "resource_id",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select_access_level",
                "maxSelect": 1,
                "name": "access_level",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "view",
                    "manage"
                ]
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text_assigned_by",
                "max": 50,
                "min": 0,
                "name": "assigned_by",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE INDEX idx_resource_assignments_user ON resource_assignments (user_id, user_collection)",
            "CREATE INDEX idx_resource_assignments_resource ON resource_assignments (resource_type, resource_id)",
            "CREATE UNIQUE INDEX idx_resource_assignments_unique ON resource_assignments (user_id, user_collection, resource_type, resource_id)"
        ]
    });
    app.save(resourceAssignmentsCollection);
    console.log('[RBAC] Created resource_assignments collection');

    console.log('[RBAC] All RBAC collections created successfully');
}, (app) => {
    // Rollback: Delete all RBAC collections
    const collections = [
        'resource_assignments',
        'user_permissions',
        'user_roles',
        'role_permissions',
        'permissions',
        'roles'
    ];

    for (const collectionName of collections) {
        try {
            const collection = app.findCollectionByNameOrId(collectionName);
            app.delete(collection);
            console.log(`[RBAC] Deleted ${collectionName} collection`);
        } catch (e) {
            console.warn(`[RBAC] Skip rollback (${collectionName}):`, e?.message);
        }
    }

    console.log('[RBAC] Rollback completed');
});
