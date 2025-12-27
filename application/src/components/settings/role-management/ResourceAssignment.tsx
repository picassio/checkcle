/**
 * ResourceAssignment Component
 *
 * Redesigned with expandable accordion cards, inline access level editing,
 * and permission source summaries. Only shows regular users (not superadmins).
 */

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Trash2,
  Search,
  RefreshCw,
  User,
  Globe,
  Server,
  ShieldCheck,
  Zap,
  Lock,
  FolderTree,
  Eye,
  Settings2,
  Package,
  ChevronRight,
  Shield,
  Info,
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { Role, ResourceAssignment as ResourceAssignmentType, permissionService } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';
import { ResourceAssignmentDialog } from './ResourceAssignmentDialog';

// Resource type configuration
const RESOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; shortLabel: string; icon: React.ElementType; color: string; bgColor: string; borderColor: string }
> = {
  services: {
    label: 'Uptime Monitors',
    shortLabel: 'Uptime',
    icon: Globe,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
  },
  servers: {
    label: 'Servers',
    shortLabel: 'Server',
    icon: Server,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
  },
  ssl_certificates: {
    label: 'SSL Certificates',
    shortLabel: 'SSL',
    icon: Lock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  security_scans: {
    label: 'Security Scans',
    shortLabel: 'Security',
    icon: ShieldCheck,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800/50',
  },
  performance_tests: {
    label: 'Performance Tests',
    shortLabel: 'Perf',
    icon: Zap,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    borderColor: 'border-violet-200 dark:border-violet-800/50',
  },
  service_groups: {
    label: 'Service Groups',
    shortLabel: 'Groups',
    icon: FolderTree,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderColor: 'border-cyan-200 dark:border-cyan-800/50',
  },
};

// Resource type to permission resource mapping
const RESOURCE_TYPE_TO_PERMISSION: Record<string, string> = {
  services: 'services',
  servers: 'servers',
  ssl_certificates: 'ssl_certificates',
  security_scans: 'security_scans',
  performance_tests: 'performance_tests',
  service_groups: 'service_groups',
};

interface ResourceAssignmentProps {
  roles: Role[];
  onRefresh: () => void;
}

interface ExtendedResourceAssignment extends ResourceAssignmentType {
  resourceName?: string;
}

interface UserRole {
  id: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
}

interface RolePermission {
  resource: string;
  action: string;
}

interface UserWithResources {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  collection: string;
  assignments: ExtendedResourceAssignment[];
  userRole?: UserRole;
  rolePermissions: RolePermission[];
}

export function ResourceAssignment({ roles, onRefresh }: ResourceAssignmentProps) {
  const [users, setUsers] = useState<UserWithResources[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithResources | null>(null);
  const [updatingAccessLevel, setUpdatingAccessLevel] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersWithResources();
  }, []);

  const loadUsersWithResources = async () => {
    try {
      setLoading(true);

      // Load regular users only (exclude superadmins - they have full access)
      const regularUsers = await pb.collection('users').getFullList({
        sort: 'email',
      });

      // Load user roles with expanded role data
      const userRoles = await pb.collection('user_roles').getFullList({
        expand: 'role_id',
      });

      // Load role permissions for each role
      const rolePermissionsMap = new Map<string, RolePermission[]>();
      const uniqueRoleIds = [...new Set(userRoles.map((ur: any) => ur.role_id))];

      for (const roleId of uniqueRoleIds) {
        try {
          const rolePerms = await pb.collection('role_permissions').getFullList({
            filter: `role_id = '${roleId}'`,
            expand: 'permission_id',
          });

          const permissions: RolePermission[] = rolePerms.map((rp: any) => ({
            resource: rp.expand?.permission_id?.resource || '',
            action: rp.expand?.permission_id?.action || '',
          })).filter((p: RolePermission) => p.resource && p.action);

          rolePermissionsMap.set(roleId, permissions);
        } catch (e) {
          console.error(`Failed to load permissions for role ${roleId}:`, e);
        }
      }

      // Load all resource assignments
      const assignments = await pb.collection('resource_assignments').getFullList();

      // Load resource names for display
      const resourceNames = new Map<string, string>();
      const resourcesByType = new Map<string, Set<string>>();

      for (const assignment of assignments) {
        const a = assignment as any;
        if (!resourcesByType.has(a.resource_type)) {
          resourcesByType.set(a.resource_type, new Set());
        }
        resourcesByType.get(a.resource_type)!.add(a.resource_id);
      }

      // Fetch resource names
      for (const [resourceType, resourceIds] of resourcesByType) {
        const config = RESOURCE_TYPE_CONFIG[resourceType];
        if (!config) continue;

        const collectionName = resourceType === 'service_groups' ? 'service_group' : resourceType;

        try {
          const filter = Array.from(resourceIds)
            .map((id) => `id='${id}'`)
            .join(' || ');

          const resources = await pb.collection(collectionName).getFullList({
            filter,
          });

          for (const resource of resources) {
            const r = resource as any;
            const name = r.name || r.domain || r.host || r.target_url || r.url || r.id;
            resourceNames.set(`${resourceType}:${r.id}`, name);
          }
        } catch (e) {
          console.error(`Failed to load ${resourceType} names:`, e);
        }
      }

      // Build user list with resources (regular users only)
      const usersWithResources: UserWithResources[] = [];

      for (const user of regularUsers) {
        // Find user's role
        const userRoleRecord = userRoles.find(
          (ur: any) => ur.user_id === user.id && ur.user_collection === 'users'
        ) as any;

        const userRole: UserRole | undefined = userRoleRecord ? {
          id: userRoleRecord.id,
          role_id: userRoleRecord.role_id,
          role_name: userRoleRecord.expand?.role_id?.name || 'Unknown',
          role_display_name: userRoleRecord.expand?.role_id?.display_name || 'Unknown Role',
        } : undefined;

        // Get role permissions
        const rolePermissions = userRole
          ? (rolePermissionsMap.get(userRole.role_id) || [])
          : [];

        const userAssignments = assignments
          .filter((a: any) => a.user_id === user.id && a.user_collection === 'users')
          .map((a: any) => ({
            id: a.id,
            user_id: a.user_id,
            user_collection: a.user_collection,
            resource_type: a.resource_type,
            resource_id: a.resource_id,
            access_level: a.access_level as 'view' | 'manage',
            resourceName: resourceNames.get(`${a.resource_type}:${a.resource_id}`),
          }));

        usersWithResources.push({
          id: user.id,
          email: user.email,
          name: (user as any).full_name || (user as any).name,
          avatar: (user as any).avatar,
          collection: 'users',
          assignments: userAssignments,
          userRole,
          rolePermissions,
        });
      }

      setUsers(usersWithResources);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users and resource assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await permissionService.removeResourceAssignment(assignmentId);
      toast({
        title: 'Success',
        description: 'Resource assignment removed',
      });
      loadUsersWithResources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAccessLevel = async (assignmentId: string, newLevel: 'view' | 'manage') => {
    try {
      setUpdatingAccessLevel(assignmentId);
      await permissionService.updateResourceAccessLevel(assignmentId, newLevel);
      toast({
        title: 'Success',
        description: `Access level updated to ${newLevel}`,
      });
      loadUsersWithResources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update access level',
        variant: 'destructive',
      });
    } finally {
      setUpdatingAccessLevel(null);
    }
  };

  const handleOpenDialog = (user: UserWithResources) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadUsersWithResources();
  };

  // Filter users based on search and resource type filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      filterType === 'all' ||
      user.assignments.some((a) => a.resource_type === filterType);

    return matchesSearch && matchesType;
  });

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  // Get quick stats for a user's assignments
  const getQuickStats = (assignments: ExtendedResourceAssignment[]) => {
    const stats: { type: string; count: number; viewCount: number; manageCount: number }[] = [];
    const grouped = new Map<string, { view: number; manage: number }>();

    for (const a of assignments) {
      if (!grouped.has(a.resource_type)) {
        grouped.set(a.resource_type, { view: 0, manage: 0 });
      }
      const g = grouped.get(a.resource_type)!;
      if (a.access_level === 'manage') {
        g.manage++;
      } else {
        g.view++;
      }
    }

    for (const [type, counts] of grouped) {
      stats.push({
        type,
        count: counts.view + counts.manage,
        viewCount: counts.view,
        manageCount: counts.manage,
      });
    }

    return stats;
  };

  // Get role-level permission for a resource type
  const getRolePermissionLevel = (rolePermissions: RolePermission[], resourceType: string): 'manage' | 'view' | null => {
    const permResource = RESOURCE_TYPE_TO_PERMISSION[resourceType];
    if (!permResource) return null;

    const hasManage = rolePermissions.some(p => p.resource === permResource && p.action === 'manage');
    const hasView = rolePermissions.some(p => p.resource === permResource && p.action === 'view');

    if (hasManage) return 'manage';
    if (hasView) return 'view';
    return null;
  };

  // Group assignments by resource type for the expanded view
  const groupAssignmentsByType = (assignments: ExtendedResourceAssignment[]) => {
    const grouped = new Map<string, ExtendedResourceAssignment[]>();

    for (const a of assignments) {
      if (!grouped.has(a.resource_type)) {
        grouped.set(a.resource_type, []);
      }
      grouped.get(a.resource_type)!.push(a);
    }

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Assign specific resources to users for granular access control. Superadmins are not shown as they have full access to all resources.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px] h-10">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>All Resources</span>
                  </div>
                </SelectItem>
                {Object.entries(RESOURCE_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={loadUsersWithResources}
              className="shrink-0 h-10 w-10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Cards with Accordion */}
        {filteredUsers.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No users found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? 'Try adjusting your search terms' : 'No regular users in the system yet'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {filteredUsers.map((user) => {
              const stats = getQuickStats(user.assignments);
              const groupedAssignments = groupAssignmentsByType(user.assignments);

              return (
                <AccordionItem
                  key={user.id}
                  value={user.id}
                  className="border rounded-lg bg-card overflow-hidden data-[state=open]:ring-1 data-[state=open]:ring-primary/20 transition-all"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors [&>svg]:hidden">
                    <div className="flex items-center justify-between w-full gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0 border">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                            {getInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <div className="font-medium truncate">
                            {user.name || user.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                            {user.name && <span>{user.email}</span>}
                            {user.userRole && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                <Shield className="h-2.5 w-2.5 mr-1" />
                                {user.userRole.role_display_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quick Stats */}
                        <div className="hidden sm:flex items-center gap-1.5">
                          {stats.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">No resources</span>
                          ) : (
                            stats.slice(0, 3).map((stat) => {
                              const config = RESOURCE_TYPE_CONFIG[stat.type];
                              if (!config) return null;
                              const Icon = config.icon;
                              return (
                                <Tooltip key={stat.type}>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={`${config.bgColor} ${config.borderColor} text-xs gap-1 cursor-default`}
                                    >
                                      <Icon className={`h-3 w-3 ${config.color}`} />
                                      <span>{stat.count}</span>
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{config.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {stat.viewCount > 0 && `${stat.viewCount} view`}
                                      {stat.viewCount > 0 && stat.manageCount > 0 && ', '}
                                      {stat.manageCount > 0 && `${stat.manageCount} manage`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })
                          )}
                          {stats.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{stats.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Assign Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(user);
                          }}
                          className="h-8 gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Assign</span>
                        </Button>

                        {/* Expand Indicator */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      {/* Permission Source Summary */}
                      {user.userRole && user.rolePermissions.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Role Permissions</span>
                            <Badge variant="secondary" className="text-xs">
                              {user.userRole.role_display_name}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(RESOURCE_TYPE_CONFIG).map(([type, config]) => {
                              const roleLevel = getRolePermissionLevel(user.rolePermissions, type);
                              if (!roleLevel) return null;

                              const Icon = config.icon;
                              const hasOverrides = user.assignments.some(
                                a => a.resource_type === type && a.access_level === 'manage' && roleLevel === 'view'
                              );

                              return (
                                <div
                                  key={type}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${config.bgColor} ${config.borderColor} border`}
                                >
                                  <Icon className={`h-3 w-3 ${config.color}`} />
                                  <span className="font-medium">{config.shortLabel}</span>
                                  <span className="text-muted-foreground">
                                    {roleLevel}
                                  </span>
                                  {hasOverrides && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge className="h-4 px-1 text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
                                          +
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Some resources have elevated access</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Assigned Resources */}
                      {user.assignments.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No resources assigned yet</p>
                          <p className="text-xs mt-1">Click "Assign" to add resource access</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Array.from(groupedAssignments).map(([resourceType, typeAssignments]) => {
                            const config = RESOURCE_TYPE_CONFIG[resourceType];
                            if (!config) return null;

                            const Icon = config.icon;
                            const roleLevel = getRolePermissionLevel(user.rolePermissions, resourceType);

                            return (
                              <div key={resourceType} className="space-y-2">
                                {/* Resource Type Header */}
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded ${config.bgColor}`}>
                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                  </div>
                                  <span className="text-sm font-medium">{config.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({typeAssignments.length})
                                  </span>
                                </div>

                                {/* Resources Table */}
                                <div className={`rounded-lg border ${config.borderColor} overflow-hidden`}>
                                  <table className="w-full text-sm">
                                    <thead className={`${config.bgColor}`}>
                                      <tr>
                                        <th className="text-left px-3 py-2 font-medium">Resource</th>
                                        <th className="text-left px-3 py-2 font-medium w-[140px]">Access Level</th>
                                        <th className="text-left px-3 py-2 font-medium w-[100px]">Source</th>
                                        <th className="w-[50px]"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-card">
                                      {typeAssignments.map((assignment) => {
                                        const effectiveLevel = roleLevel === 'manage' ? 'manage' : assignment.access_level;
                                        const isElevated = assignment.access_level === 'manage' && roleLevel === 'view';

                                        return (
                                          <tr
                                            key={assignment.id}
                                            className="border-t border-border/50 hover:bg-muted/30 transition-colors"
                                          >
                                            <td className="px-3 py-2">
                                              <span className="font-medium">
                                                {assignment.resourceName || assignment.resource_id.slice(0, 12)}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <Select
                                                value={assignment.access_level}
                                                onValueChange={(value: 'view' | 'manage') =>
                                                  handleUpdateAccessLevel(assignment.id, value)
                                                }
                                                disabled={updatingAccessLevel === assignment.id}
                                              >
                                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="view">
                                                    <div className="flex items-center gap-1.5">
                                                      <Eye className="h-3 w-3 text-blue-500" />
                                                      <span>View</span>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem value="manage">
                                                    <div className="flex items-center gap-1.5">
                                                      <Settings2 className="h-3 w-3 text-amber-500" />
                                                      <span>Manage</span>
                                                    </div>
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </td>
                                            <td className="px-3 py-2">
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${
                                                      isElevated
                                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                                        : ''
                                                    }`}
                                                  >
                                                    {isElevated ? 'Override' : 'Assigned'}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  {isElevated ? (
                                                    <p>Resource has higher access than role default</p>
                                                  ) : (
                                                    <p>Access from resource assignment</p>
                                                  )}
                                                </TooltipContent>
                                              </Tooltip>
                                            </td>
                                            <td className="px-3 py-2">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Assignment Dialog */}
        {selectedUser && (
          <ResourceAssignmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            userId={selectedUser.id}
            userCollection={selectedUser.collection}
            userName={selectedUser.name || selectedUser.email}
            existingAssignments={selectedUser.assignments}
            onSuccess={handleDialogSuccess}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
