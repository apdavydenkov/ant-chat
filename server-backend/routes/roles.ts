import { Router } from 'express';
import { db, Permission } from '../db/mockdb.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

// Get system-protected roles dynamically from database
const getSystemProtectedRoles = async () => {
  const allRoles = await db.getAllRoles();
  return allRoles.filter(role => ['admin', 'user', 'blocked'].includes(role.name)).map(role => role.name);
};

const router = Router();

// Get all roles
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const roles = await db.getAllRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get role by ID
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = await db.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create role
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists
    const existingRole = await db.getRoleByName(name);
    if (existingRole) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    // Validate permissions - use all possible permissions from type
    const validPermissions: Permission[] = [
      'pin_messages', 'delete_messages', 'create_channels', 
      'delete_channels', 'pin_channels', 'block_users', 'send_messages', 'account_access'
    ];
    
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p as Permission));
      if (invalidPerms.length > 0) {
        return res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
      }
    }

    const role = await db.createRole({ name, permissions: permissions ?? [] });
    res.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add permission to role
router.post('/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { permission } = req.body;
    
    if (!permission) {
      return res.status(400).json({ error: 'Permission is required' });
    }

    const validPermissions: Permission[] = [
      'pin_messages', 'delete_messages', 'create_channels', 
      'delete_channels', 'pin_channels', 'block_users', 'send_messages', 'account_access'
    ];

    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission' });
    }

    const role = await db.addPermissionToRole(req.params.id, permission);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ role });
  } catch (error) {
    console.error('Add permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove permission from role
router.delete('/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { permission } = req.body;
    
    if (!permission) {
      return res.status(400).json({ error: 'Permission is required' });
    }

    const role = await db.removePermissionFromRole(req.params.id, permission);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ role });
  } catch (error) {
    console.error('Remove permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update role
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const roleId = req.params.id;
    
    // Check if role exists and prevent updating system roles
    const existingRole = await db.getRoleById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const protectedRoles = await getSystemProtectedRoles();
    if (protectedRoles.includes(existingRole.name)) {
      return res.status(400).json({ error: 'Cannot update system-protected roles' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if new name already exists (excluding current role)
    const existingWithName = await db.getRoleByName(name);
    if (existingWithName && existingWithName.id !== roleId) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    
    const role = await db.updateRole(roleId, { name });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete role
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const roleId = req.params.id;
    
    // Check if role exists and prevent deleting system roles
    const role = await db.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const protectedRoles = await getSystemProtectedRoles();
    if (protectedRoles.includes(role.name)) {
      return res.status(400).json({ error: 'Cannot delete system-protected roles' });
    }
    
    const success = await db.deleteRole(roleId);
    if (!success) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user permissions
router.get('/user/:userId/permissions', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Users can view their own permissions, users with block_users permission can view any user's permissions
    if (req.userId !== targetUserId) {
      const hasAdminPermission = await db.hasPermission(req.userId!, 'block_users');
      if (!hasAdminPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const permissions = await db.getUserPermissions(targetUserId);
    res.json({ permissions });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's role details
router.get('/user/:userId/role', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const role = await db.getRoleByName(user.role);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ role });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;