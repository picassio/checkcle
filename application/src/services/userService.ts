import { pb } from "@/lib/pocketbase";

export interface User {
  id: string;
  created: string;
  updated: string;
  username: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  full_name?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
  status?: string; // Added this field to support the backend status
}

// Security: Get current user's role for RBAC checks
const getCurrentUserRole = (): string | null => {
  const model = pb.authStore.model;
  if (!model) return null;

  // Check if user is from _superusers collection
  if (pb.authStore.record?.collectionName === '_superusers' ||
      pb.authStore.record?.collectionId === 'pbc_3142635823') {
    return 'superadmin';
  }

  return model.role || 'admin';
};

// Security: Check if current user is superadmin
const isSuperAdmin = (): boolean => {
  return getCurrentUserRole() === 'superadmin';
};

// Security: Check if current user can perform user management operations
const canManageUsers = (): boolean => {
  // Only superadmins can manage other users
  return isSuperAdmin();
};

// Security: Check if user is modifying their own record
const isOwnRecord = (id: string): boolean => {
  return pb.authStore.model?.id === id;
};

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  full_name?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
  emailVisibility?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  emailVisibility?: boolean;
  full_name?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
}

// Helper function to convert PocketBase record to User type
const convertToUserType = (record: any, role: string = "admin"): User => {
  return {
    id: record.id,
    created: record.created,
    updated: record.updated,
    username: record.username,
    email: record.email,
    emailVisibility: record.emailVisibility,
    verified: record.verified,
    full_name: record.full_name,
    avatar: record.avatar,
    role: role,
    isActive: record.isActive,
    status: record.status,
  };
};

export const userService = {
  /**
   * Helper to get user's role from user_roles collection
   */
  async getUserRole(userId: string, userCollection: string): Promise<string | null> {
    try {
      const userRoles = await pb.collection('user_roles').getFirstListItem(
        `user_id="${userId}" && user_collection="${userCollection}"`,
        { expand: 'role_id' }
      );
      return userRoles.expand?.role_id?.name || null;
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<User[] | null> {
    try {
      // Security: Only allow user listing if user has appropriate permissions
      // Backend PocketBase rules provide the authoritative check
      if (!pb.authStore.isValid) {
        throw new Error("Authentication required");
      }

      // Get both regular users and superadmins
      const regularUsers = await pb.collection('users').getList(1, 50, {
        sort: 'created',
      });

      let superadminUsers: any = [];
      try {
        // Try to get superadmin users if exists
        // This will only succeed if current user has permission
        superadminUsers = await pb.collection('_superusers').getList(1, 50, {
          sort: 'created',
        });
      } catch {
        // User doesn't have access to superadmin list, which is fine
      }

      // Fetch all user_roles in one query for efficiency
      let userRolesMap: Map<string, string> = new Map();
      try {
        const allUserRoles = await pb.collection('user_roles').getFullList({
          expand: 'role_id',
        });
        allUserRoles.forEach((ur: any) => {
          const roleName = ur.expand?.role_id?.name;
          if (roleName) {
            userRolesMap.set(ur.user_id, roleName);
          }
        });
      } catch {
        // Failed to fetch user_roles, continue with defaults
      }

      // Combine both user types with their RBAC roles
      const allUsers = [
        ...regularUsers.items.map((user: any) =>
          convertToUserType(user, userRolesMap.get(user.id) || "viewer")
        ),
        ...superadminUsers.items.map((user: any) =>
          convertToUserType(user, userRolesMap.get(user.id) || "superadmin")
        )
      ];

      return allUsers;
    } catch {
      return null;
    }
  },
  
  async getUser(id: string): Promise<User | null> {
    try {
      // Try fetching from regular users first
      try {
        const user = await pb.collection('users').getOne(id);
        const role = await this.getUserRole(id, 'users');
        return convertToUserType(user, role || "viewer");
      } catch {
        // User not found in regular users, trying superadmin collection
      }

      // If not found, try in superadmins
      try {
        const user = await pb.collection('_superusers').getOne(id);
        const role = await this.getUserRole(id, '_superusers');
        return convertToUserType(user, role || "superadmin");
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  },
  
  async updateUser(id: string, data: UpdateUserData): Promise<User | null> {
    try {
      // Security: Verify user is authenticated
      if (!pb.authStore.isValid) {
        throw new Error("Authentication required");
      }

      // Security: Check permissions - users can update themselves, superadmins can update anyone
      const isUpdatingSelf = isOwnRecord(id);
      if (!isUpdatingSelf && !canManageUsers()) {
        throw new Error("Insufficient permissions to update other users");
      }

      // Create a clean update object - remove undefined and empty string values
      const cleanData: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        // Skip undefined values and empty strings for non-required fields
        if (value !== undefined && !(typeof value === 'string' && value.trim() === '')) {
          cleanData[key] = value;
        }
      });

      // If there's nothing to update, return the current user
      if (Object.keys(cleanData).length === 0) {
        const currentUser = await this.getUser(id);
        return currentUser;
      }

      // Special handling for role changes between admin and superadmin
      const roleChange = cleanData.role !== undefined;
      const targetRole = roleChange ? cleanData.role : null;

      // Security: Only superadmins can change roles
      if (roleChange && !isSuperAdmin()) {
        throw new Error("Only superadmins can change user roles");
      }

      // Security: Prevent non-superadmins from promoting to superadmin
      if (targetRole === 'superadmin' && !isSuperAdmin()) {
        throw new Error("Only superadmins can promote users to superadmin");
      }
      
      // Remove role from regular update if it's being changed
      if (roleChange) {
        delete cleanData.role;
      }

      // Handle email updates with proper error handling
      const hasEmailChange = cleanData.email !== undefined;
      const emailToUpdate = hasEmailChange ? cleanData.email : null;
      
      let updatedUser: User | null = null;
      
      // First, determine if this is currently a regular user or superadmin
      let isCurrentlySuperadmin = false;
      try {
        await pb.collection('_superusers').getOne(id);
        isCurrentlySuperadmin = true;
      } catch (error) {
        // Not in superadmin collection
      }
      
      // If we're changing the role and need to move the user between collections
      if (roleChange && ((isCurrentlySuperadmin && targetRole !== "superadmin") || 
                         (!isCurrentlySuperadmin && targetRole === "superadmin"))) {
        // Get the full user data before changing collections
        const currentUser = await this.getUser(id);
        if (!currentUser) {
          throw new Error("User not found during role change");
        }
        
        // Prepare user data for transfer
        const transferData = {
          username: currentUser.username,
          email: currentUser.email,
          emailVisibility: currentUser.emailVisibility || true,
          full_name: currentUser.full_name || "",
          avatar: currentUser.avatar || "",
          isActive: currentUser.isActive !== false,
          ...cleanData
        };
        
        try {
          if (targetRole === "superadmin") {
            // Create in superadmin collection
            const newSuperUser = await pb.collection('_superusers').create(transferData);
            // Delete RBAC roles from old user
            await this.removeAllRbacRoles(id, 'users');
            // Delete from regular users
            await pb.collection('users').delete(id);
            // Assign new RBAC role
            await this.assignRbacRole(newSuperUser.id, '_superusers', targetRole);
            updatedUser = convertToUserType(newSuperUser, "superadmin");
          } else {
            // Create in regular users collection
            const newRegularUser = await pb.collection('users').create(transferData);
            // Delete RBAC roles from old user
            await this.removeAllRbacRoles(id, '_superusers');
            // Delete from superadmin
            await pb.collection('_superusers').delete(id);
            // Assign new RBAC role
            await this.assignRbacRole(newRegularUser.id, 'users', targetRole);
            updatedUser = convertToUserType(newRegularUser, targetRole);
          }
          console.log("User transferred between collections due to role change");

        } catch (error) {
          console.error("Failed to transfer user between collections:", error);
          throw new Error("Failed to change user role: " + (error instanceof Error ? error.message : "Unknown error"));
        }
      } else {
        // Regular update without changing collections
        const collection = isCurrentlySuperadmin ? '_superusers' : 'users';

        if (Object.keys(cleanData).length > 0) {
          try {
            const updatedRecord = await pb.collection(collection).update(id, cleanData);
            updatedUser = convertToUserType(updatedRecord, targetRole || (isCurrentlySuperadmin ? "superadmin" : "admin"));

            // If email was updated successfully, show success message
            if (hasEmailChange) {
              console.log("Email updated successfully to:", emailToUpdate);
            }

          } catch (error) {
            // Provide more specific error messages for email issues
            if (hasEmailChange && error instanceof Error) {
              if (error.message.includes("email")) {
                throw new Error("Email update failed. The email address may already be in use or invalid.");
              }
            }

            throw error;
          }
        } else {
          // If no fields to update, get the current user
          updatedUser = await this.getUser(id);
        }

        // If role changed within same collection, sync RBAC role
        if (roleChange && targetRole) {
          try {
            await this.updateRbacRole(id, collection, targetRole);
            console.log("RBAC role updated to:", targetRole);
          } catch (roleError) {
            console.error("Failed to sync RBAC role:", roleError);
          }
        }
      }
      
      return updatedUser;
    } catch (error) {
    //  console.error("Failed to update user:", error);
      throw error; // Re-throw to handle in the component
    }
  },
  
  async deleteUser(id: string): Promise<boolean> {
    try {
      // Security: Verify user is authenticated
      if (!pb.authStore.isValid) {
        throw new Error("Authentication required");
      }

      // Security: Only superadmins can delete users (and not themselves)
      if (!canManageUsers()) {
        throw new Error("Only superadmins can delete users");
      }

      // Security: Prevent users from deleting themselves
      if (isOwnRecord(id)) {
        throw new Error("Cannot delete your own account");
      }

      // Try to delete from regular users first
      try {
        await pb.collection('users').delete(id);
        return true;
      } catch {
        // User not found in regular users, try superadmin collection
      }

      // If not found, try deleting from superadmin collection
      try {
        await pb.collection('_superusers').delete(id);
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  },

  async createUser(data: CreateUserData): Promise<User | null> {
    try {
      // Security: Verify user is authenticated
      if (!pb.authStore.isValid) {
        throw new Error("Authentication required");
      }

      // Security: Only superadmins can create new users
      if (!canManageUsers()) {
        throw new Error("Only superadmins can create new users");
      }

      // Security: Only superadmins can create other superadmins
      if (data.role === 'superadmin' && !isSuperAdmin()) {
        throw new Error("Only superadmins can create superadmin accounts");
      }

      // Create a clean data object without avatar field if it's a URL
      // PocketBase requires actual file uploads for avatar, not URLs
      const cleanData = { ...data };

      // Remove avatar if it's a URL (we'll handle this differently in the future)
      if (cleanData.avatar && typeof cleanData.avatar === 'string') {
        // Check if it's an external URL (not a file reference)
        if (cleanData.avatar.startsWith('http') ||
            cleanData.avatar.startsWith('/upload/') ||
            cleanData.avatar.includes('api.dicebear.com')) {
          delete cleanData.avatar;
        }
      }

      // Determine which collection to use based on the role
      // Only 'superadmin' role goes to _superusers, all others go to 'users'
      const isSuperAdminUser = cleanData.role === "superadmin";
      const collection = isSuperAdminUser ? '_superusers' : 'users';

      // Store the role name for RBAC assignment
      const roleName = cleanData.role;

      // Create the user in the appropriate collection
      const result = await pb.collection(collection).create(cleanData);

      // Auto-assign the RBAC role to the new user
      try {
        await this.assignRbacRole(result.id, collection, roleName || 'viewer');
      } catch (roleError) {
        // Log but don't fail user creation if role assignment fails
        console.error("Failed to auto-assign RBAC role:", roleError);
      }

      return convertToUserType(result, roleName || "admin");
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  },

  /**
   * Assign an RBAC role to a user
   * Creates a record in the user_roles collection
   */
  async assignRbacRole(userId: string, userCollection: string, roleName: string): Promise<void> {
    try {
      // Get the role record by name
      const roleRecord = await pb.collection('roles').getFirstListItem(`name="${roleName}"`);

      if (!roleRecord) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Check if user already has this role assigned
      try {
        const existingAssignment = await pb.collection('user_roles').getFirstListItem(
          `user_id="${userId}" && user_collection="${userCollection}" && role_id="${roleRecord.id}"`
        );
        // Role already assigned, skip
        if (existingAssignment) {
          return;
        }
      } catch {
        // No existing assignment, proceed to create
      }

      // Create the user_roles record
      await pb.collection('user_roles').create({
        user_id: userId,
        user_collection: userCollection,
        role_id: roleRecord.id,
        assigned_by: pb.authStore.model?.id,
      });
    } catch (error) {
      console.error("Failed to assign RBAC role:", error);
      throw error;
    }
  },

  /**
   * Remove all RBAC role assignments for a user
   */
  async removeAllRbacRoles(userId: string, userCollection: string): Promise<void> {
    try {
      const assignments = await pb.collection('user_roles').getFullList({
        filter: `user_id="${userId}" && user_collection="${userCollection}"`,
      });

      for (const assignment of assignments) {
        await pb.collection('user_roles').delete(assignment.id);
      }
    } catch (error) {
      console.error("Failed to remove RBAC roles:", error);
    }
  },

  /**
   * Update RBAC role for a user (remove old, assign new)
   */
  async updateRbacRole(userId: string, userCollection: string, newRoleName: string): Promise<void> {
    await this.removeAllRbacRoles(userId, userCollection);
    await this.assignRbacRole(userId, userCollection, newRoleName);
  }
};