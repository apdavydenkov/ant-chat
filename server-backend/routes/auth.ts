import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

// Login/Register
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || typeof username !== 'string' || username.length < 1 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be a string between 1 and 50 characters' });
    }
    
    // Sanitize username - only allow alphanumeric, underscore, dash
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscore, and dash' });
    }

    // Check if user exists
    let user = await db.getUserByUsername(username);
    
    // If user doesn't exist, create new user
    if (!user) {
      user = await db.createUser({ username });
    } else {
      // Проверяем доступ к аккаунту через роли
      const hasAccess = await db.hasPermission(user.id, 'account_access');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Доступ к аккаунту запрещен. Обратитесь к администратору.' });
      }
      
      // Update last active
      user = await db.updateUser(user.id, { lastActive: new Date() });
    }

    res.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/user/:id', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId!;
    
    // Check permissions: view_users_self for own profile OR view_users_all for others
    if (targetUserId === currentUserId) {
      const canViewSelf = await db.hasPermission(currentUserId, 'view_users_self');
      if (!canViewSelf) {
        return res.status(403).json({ error: 'Permission to view own profile required' });
      }
    } else {
      const canViewAll = await db.hasPermission(currentUserId, 'view_users_all');
      if (!canViewAll) {
        return res.status(403).json({ error: 'Permission to view other users required' });
      }
    }
    
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', requireAuth, requirePermission('view_users_all'), async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/users', requireAuth, requirePermission('create_users'), async (req, res) => {
  try {
    const { username, role, bio } = req.body;
    
    if (!username || typeof username !== 'string' || username.length < 1 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be a string between 1 and 50 characters' });
    }
    
    // Sanitize username
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscore, and dash' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = await db.createUser({ username, role, bio });
    res.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/user/:id', requireAuth, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const targetUserId = req.params.id;
    
    // Only allow users to edit their own profile, or users with edit_users_all permission to edit any profile
    if (req.userId !== targetUserId) {
      const hasEditAllPermission = await db.hasPermission(req.userId!, 'edit_users_all');
      if (!hasEditAllPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Sanitize and validate inputs
    const updateData: any = {};
    
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be a string with max 500 characters' });
      }
      // Remove HTML tags and dangerous characters
      updateData.bio = bio.replace(/<[^>]*>/g, '').replace(/[<>'"&]/g, '');
    }
    
    
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 200) {
        return res.status(400).json({ error: 'Avatar must be a string with max 200 characters' });
      }
      updateData.avatar = avatar;
    }
    
    
    const user = await db.updateUser(targetUserId, updateData);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (separate endpoint for role changes)
router.put('/user/:id/role', requireAuth, requirePermission('change_roles'), async (req, res) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;
    
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'Role is required and must be a string' });
    }
    
    // Validate that role exists in the system
    const existingRole = await db.getRoleByName(role);
    if (!existingRole) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
    
    // Get target user to check if they exist and aren't admin
    const targetUser = await db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Protect admin users from role changes
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Cannot change role of admin users' });
    }
    
    const user = await db.updateUser(targetUserId, { role });
    res.json({ user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/user/:id', requireAuth, requirePermission('delete_users'), async (req, res) => {
  try {
    // Check if target user exists and get their role
    const targetUser = await db.getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Protect admin users from deletion
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    const success = await db.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;