import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

// Get all permissions
router.get('/', requireAuth, requirePermission('view_roles'), async (req, res) => {
  try {
    const permissions = await db.getAllPermissions();
    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new permission
router.post('/', requireAuth, requirePermission('manage_permissions'), async (req, res) => {
  try {
    const { name, description, category, isBasic } = req.body;
    
    if (!name || !description || !category) {
      return res.status(400).json({ error: 'Name, description, and category are required' });
    }

    // Check if permission name already exists
    const existingPermission = await db.getPermissionByName(name);
    if (existingPermission) {
      return res.status(409).json({ error: 'Permission name already exists' });
    }

    // Validate category
    const validCategories = ['system', 'messages', 'channels', 'users', 'roles', 'admin'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const permission = await db.createPermission({ name, description, category, isBasic });
    res.json({ permission });
  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update permission
router.put('/:id', requireAuth, requirePermission('manage_permissions'), async (req, res) => {
  try {
    const { name, description, category, isBasic } = req.body;
    
    // Validate category if provided
    if (category) {
      const validCategories = ['system', 'messages', 'channels', 'users', 'roles', 'admin'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }

    // Check if new name already exists (excluding current permission)
    if (name) {
      const existingPermission = await db.getPermissionByName(name);
      if (existingPermission && existingPermission.id !== req.params.id) {
        return res.status(409).json({ error: 'Permission name already exists' });
      }
    }

    const permission = await db.updatePermission(req.params.id, { name, description, category, isBasic });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({ permission });
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete permission
router.delete('/:id', requireAuth, requirePermission('manage_permissions'), async (req, res) => {
  try {
    const success = await db.deletePermission(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if current user has specific permission
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { permission } = req.query;
    
    if (!permission || typeof permission !== 'string') {
      return res.status(400).json({ error: 'Permission parameter is required' });
    }

    const hasPermission = await db.hasPermission(req.userId!, permission);
    res.json({ hasPermission });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;