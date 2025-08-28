import { Router } from 'express';
import { db } from '../db/mongodb.js';
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
    
    // Broadcast channel creation via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('channel-created', channel);
    }
    
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
    
    // Get channel info to check ownership
    const channel = await db.getChannelById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check permissions for basic editing
    if (name !== undefined || description !== undefined) {
      const isOwner = channel.createdBy === req.userId;
      const hasEditSelf = await db.hasPermission(req.userId!, 'edit_channels_self');
      const hasEditAll = await db.hasPermission(req.userId!, 'edit_channels_all');
      
      if (!hasEditAll && !(isOwner && hasEditSelf)) {
        return res.status(403).json({ error: 'Permission to edit channels required' });
      }
    }
    
    // Check permissions for pinning
    if (isPinned !== undefined) {
      const hasPermission = await db.hasPermission(req.userId!, 'pin_channels');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission to pin channels required' });
      }
    }
    
    // Check permissions for read-only mode
    if (isReadOnly !== undefined) {
      const isOwner = channel.createdBy === req.userId;
      const hasCloseSelf = await db.hasPermission(req.userId!, 'close_channels_self');
      const hasCloseAll = await db.hasPermission(req.userId!, 'close_channels_all');
      
      if (!hasCloseAll && !(isOwner && hasCloseSelf)) {
        return res.status(403).json({ error: 'Permission to set channel read-only required' });
      }
    }
    
    const updatedChannel = await db.updateChannel(req.params.id, { name, isPinned, description, isReadOnly });
    
    // Broadcast channel update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('channel-updated', updatedChannel);
    }
    
    res.json({ channel: updatedChannel });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete channel
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Get channel info to check ownership
    const channel = await db.getChannelById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check permissions
    const isOwner = channel.createdBy === req.userId;
    const hasDeleteSelf = await db.hasPermission(req.userId!, 'delete_channels_self');
    const hasDeleteAll = await db.hasPermission(req.userId!, 'delete_channels_all');
    
    if (!hasDeleteAll && !(isOwner && hasDeleteSelf)) {
      return res.status(403).json({ error: 'Permission to delete channels required' });
    }
    
    const success = await db.deleteChannel(req.params.id);
    
    // Broadcast channel deletion via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('channel-deleted', { channelId: req.params.id });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;