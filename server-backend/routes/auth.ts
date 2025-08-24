import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';

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
router.get('/user/:id', async (req, res) => {
  try {
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

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, role, bio, email } = req.body;
    
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

    const user = await db.createUser({ username, role, bio, email });
    res.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/user/:id', requireAuth, async (req, res) => {
  try {
    const { bio, email, avatar, isBlocked, role } = req.body;
    const targetUserId = req.params.id;
    
    // Only allow users to edit their own profile, or users with block_users permission to edit any profile
    if (req.userId !== targetUserId) {
      const hasAdminPermission = await db.hasPermission(req.userId, 'block_users');
      if (!hasAdminPermission) {
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
    
    if (email !== undefined) {
      if (typeof email !== 'string' || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return res.status(400).json({ error: 'Email must be a valid email address' });
      }
      updateData.email = email;
    }
    
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 200) {
        return res.status(400).json({ error: 'Avatar must be a string with max 200 characters' });
      }
      updateData.avatar = avatar;
    }
    
    // Only users with block_users permission can change roles
    const canChangeRoles = await db.hasPermission(req.userId, 'block_users');
    if (canChangeRoles) {
      if (role !== undefined) {
        // Validate that role exists in the system
        const existingRole = await db.getRoleByName(role);
        if (!existingRole) {
          return res.status(400).json({ error: 'Invalid role specified' });
        }
        updateData.role = role;
      }
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

// Delete user (admin only)
router.delete('/user/:id', requireAuth, requirePermission('block_users'), async (req, res) => {
  try {
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