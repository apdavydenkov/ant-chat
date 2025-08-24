import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Check if current user has specific permission
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { permission } = req.query;
    
    if (!permission || typeof permission !== 'string') {
      return res.status(400).json({ error: 'Permission parameter is required' });
    }

    const hasPermission = await db.hasPermission(req.userId!, permission as any);
    res.json({ hasPermission });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;