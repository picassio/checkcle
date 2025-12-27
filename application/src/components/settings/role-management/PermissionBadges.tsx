/**
 * PermissionBadges Component
 *
 * Displays permission badges for a role.
 */

import { Badge } from '@/components/ui/badge';
import { Permission } from '@/services/permissionService';

interface PermissionBadgesProps {
  permissions: Permission[];
  maxDisplay?: number;
}

export function PermissionBadges({ permissions, maxDisplay = 5 }: PermissionBadgesProps) {
  const displayed = permissions.slice(0, maxDisplay);
  const remaining = permissions.length - maxDisplay;

  if (permissions.length === 0) {
    return <span className="text-muted-foreground text-sm">No permissions</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((perm) => (
        <Badge key={perm.id} variant="outline" className="text-xs">
          {perm.resource}:{perm.action}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
