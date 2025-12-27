/**
 * ResourceAssignment Component
 *
 * Displays users with their assigned resources and allows superadmins
 * to assign specific resources (services, servers, etc.) to users.
 * Responsive design with table on desktop and cards on mobile.
 */

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  X,
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
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { Role, ResourceAssignment as ResourceAssignmentType, permissionService } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';
import { ResourceAssignmentDialog } from './ResourceAssignmentDialog';

// Resource type configuration
const RESOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; shortLabel: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  services: {
    label: 'Uptime Monitors',
    shortLabel: 'Uptime',
    icon: Globe,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  servers: {
    label: 'Servers',
    shortLabel: 'Server',
    icon: Server,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  },
  ssl_certificates: {
    label: 'SSL Certificates',
    shortLabel: 'SSL',
    icon: Lock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  security_scans: {
    label: 'Security Scans',
    shortLabel: 'Security',
    icon: ShieldCheck,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
  },
  performance_tests: {
    label: 'Performance Tests',
    shortLabel: 'Perf',
    icon: Zap,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
  },
  service_groups: {
    label: 'Service Groups',
    shortLabel: 'Groups',
    icon: FolderTree,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800',
  },
};

interface ResourceAssignmentProps {
  roles: Role[];
  onRefresh: () => void;
}

interface ExtendedResourceAssignment extends ResourceAssignmentType {
  resourceName?: string;
}

interface UserWithResources {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  collection: string;
  assignments: ExtendedResourceAssignment[];
}

export function ResourceAssignment({ roles, onRefresh }: ResourceAssignmentProps) {
  const [users, setUsers] = useState<UserWithResources[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithResources | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersWithResources();
  }, []);

  const loadUsersWithResources = async () => {
    try {
      setLoading(true);

      // Load regular users
      const regularUsers = await pb.collection('users').getFullList({
        sort: 'email',
      });

      // Load superusers
      let superusers: any[] = [];
      try {
        superusers = await pb.collection('_superusers').getFullList({
          sort: 'email',
        });
      } catch (e) {
        // Superusers collection may not be accessible
      }

      // Load all resource assignments
      const assignments = await pb.collection('resource_assignments').getFullList();

      // Load resource names for display
      const resourceNames = new Map<string, string>();

      // Collect unique resource types and IDs
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

        // Map resource type to collection name
        const collectionName =
          resourceType === 'service_groups' ? 'service_group' : resourceType;

        try {
          const filter = Array.from(resourceIds)
            .map((id) => `id='${id}'`)
            .join(' || ');

          const resources = await pb.collection(collectionName).getFullList({
            filter,
          });

          for (const resource of resources) {
            const r = resource as any;
            const name =
              r.name || r.domain || r.host || r.target_url || r.url || r.id;
            resourceNames.set(`${resourceType}:${r.id}`, name);
          }
        } catch (e) {
          console.error(`Failed to load ${resourceType} names:`, e);
        }
      }

      // Build user list with resources
      const usersWithResources: UserWithResources[] = [];

      // Process regular users
      for (const user of regularUsers) {
        const userAssignments = assignments
          .filter(
            (a: any) => a.user_id === user.id && a.user_collection === 'users'
          )
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
        });
      }

      // Process superusers
      for (const user of superusers) {
        const userAssignments = assignments
          .filter(
            (a: any) =>
              a.user_id === user.id && a.user_collection === '_superusers'
          )
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
          name: user.full_name || user.name,
          avatar: user.avatar,
          collection: '_superusers',
          assignments: userAssignments,
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

  const handleOpenDialog = (user: UserWithResources) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadUsersWithResources();
  };

  // Filter users based on search and resource type filter
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase());

    // Resource type filter
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]">
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
                          <span className="hidden sm:inline">{config.label}</span>
                          <span className="sm:hidden">{config.shortLabel}</span>
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
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[250px]">User</TableHead>
                <TableHead>Assigned Resources</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={`${user.collection}-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {user.name || user.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            {user.email}
                            {user.collection === '_superusers' && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Super
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {user.assignments.length === 0 ? (
                          <span className="text-sm text-muted-foreground italic">
                            No resources assigned
                          </span>
                        ) : (
                          user.assignments.map((assignment) => {
                            const config =
                              RESOURCE_TYPE_CONFIG[assignment.resource_type];
                            if (!config) return null;

                            const Icon = config.icon;
                            const isManage = assignment.access_level === 'manage';

                            return (
                              <Tooltip key={assignment.id}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`
                                      ${config.bgColor} border
                                      flex items-center gap-1 pr-1 cursor-default
                                      transition-colors hover:opacity-80
                                    `}
                                  >
                                    <Icon className={`h-3 w-3 ${config.color}`} />
                                    <span className="max-w-[100px] truncate text-xs">
                                      {assignment.resourceName ||
                                        assignment.resource_id.slice(0, 8)}
                                    </span>
                                    {isManage ? (
                                      <Settings2 className="h-3 w-3 text-amber-500 ml-0.5" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-blue-500 ml-0.5" />
                                    )}
                                    <button
                                      onClick={() =>
                                        handleRemoveAssignment(assignment.id)
                                      }
                                      className="ml-0.5 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="font-medium">
                                    {assignment.resourceName || assignment.resource_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {config.label} • {isManage ? 'Manage' : 'View'} access
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(user)}
                        className="h-8"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-card">
              <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={`${user.collection}-${user.id}`}
                className="border rounded-lg p-4 space-y-3 bg-card"
              >
                {/* User Info */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {user.name || user.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        {user.email}
                        {user.collection === '_superusers' && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Super
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(user)}
                    className="shrink-0 h-9 w-9 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Assignments */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {user.assignments.length === 0 ? (
                    <span className="text-sm text-muted-foreground italic">
                      No resources assigned
                    </span>
                  ) : (
                    user.assignments.map((assignment) => {
                      const config =
                        RESOURCE_TYPE_CONFIG[assignment.resource_type];
                      if (!config) return null;

                      const Icon = config.icon;
                      const isManage = assignment.access_level === 'manage';

                      return (
                        <Badge
                          key={assignment.id}
                          variant="outline"
                          className={`
                            ${config.bgColor} border
                            flex items-center gap-1 pr-1 text-xs
                          `}
                        >
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          <span className="max-w-[70px] truncate">
                            {assignment.resourceName ||
                              assignment.resource_id.slice(0, 8)}
                          </span>
                          {isManage ? (
                            <Settings2 className="h-3 w-3 text-amber-500 ml-0.5" />
                          ) : (
                            <Eye className="h-3 w-3 text-blue-500 ml-0.5" />
                          )}
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="ml-0.5 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>

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
