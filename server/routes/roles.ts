import { Router } from 'express';
import { db } from '../db/mongodb.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

// No need for separate function - roles now have type field

const router = Router();

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await db.getAllRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get role by ID
router.get('/:id', async (req, res) => {
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
router.post('/', requireAuth, requirePermission('create_roles'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists
    const existingRole = await db.getRoleByName(name);
    if (existingRole) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const allPermissions = await db.getAllPermissions();
      const validPermissionIds = allPermissions.map(p => p.id);
      const invalidPerms = permissions.filter((p: string) => !validPermissionIds.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({ error: `Invalid permission IDs: ${invalidPerms.join(', ')}` });
      }
    }

    const role = await db.createRole({ name, description, permissions });
    res.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// This endpoint is removed - use PUT /:id to update role permissions

// This endpoint is removed - use PUT /:id to update role permissions

// Update role
router.put('/:id', requireAuth, requirePermission('edit_roles'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const roleId = req.params.id;
    
    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const allPermissions = await db.getAllPermissions();
      const validPermissionIds = allPermissions.map(p => p.id);
      const invalidPerms = permissions.filter((p: string) => !validPermissionIds.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({ error: `Invalid permission IDs: ${invalidPerms.join(', ')}` });
      }
    }

    // Check if new name already exists (excluding current role)
    if (name) {
      const existingWithName = await db.getRoleByName(name);
      if (existingWithName && existingWithName.id !== roleId) {
        return res.status(409).json({ error: 'Role name already exists' });
      }
    }
    
    const role = await db.updateRole(roleId, { name, description, permissions });
    if (!role) {
      return res.status(404).json({ error: 'Role not found or update failed' });
    }
    
    res.json({ role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete role
router.delete('/:id', requireAuth, requirePermission('delete_roles'), async (req, res) => {
  try {
    const success = await db.deleteRole(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Role not found or cannot be deleted' });
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
    
    // Users can view their own permissions, users with view_users_all permission can view any user's permissions
    if (req.userId !== targetUserId) {
      const hasViewAllPermission = await db.hasPermission(req.userId!, 'view_users_all');
      if (!hasViewAllPermission) {
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