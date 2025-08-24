import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

// Get all channels
router.get('/', async (req, res) => {
  try {
    const channels = await db.getAllChannels();
    res.json({ channels });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create channel
router.post('/', requireAuth, requirePermission('create_channels'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const channel = await db.createChannel({ 
      name, 
      createdBy: req.userId!, 
      description 
    });
    res.json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update channel  
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, isPinned, description, isReadOnly } = req.body;
    
    // Check permissions for pinning
    if (isPinned !== undefined) {
      const hasPermission = await db.hasPermission(req.userId!, 'pin_channels');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission to pin channels required' });
      }
    }
    
    const channel = await db.updateChannel(req.params.id, { name, isPinned, description, isReadOnly });
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete channel
router.delete('/:id', requireAuth, requirePermission('delete_channels'), async (req, res) => {
  try {
    const success = await db.deleteChannel(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;