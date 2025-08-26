import { Router } from 'express';
import { db } from '../db/mockdb.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

// Get messages by channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const messages = await db.getMessagesByChannelId(req.params.channelId);
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages (admin function)
router.get('/', requireAuth, requirePermission('view_users_all'), async (req, res) => {
  try {
    const messages = await db.getAllMessages();
    res.json({ messages });
  } catch (error) {
    console.error('Get all messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create message
router.post('/', requireAuth, async (req, res) => {
  try {
    const { channelId, content } = req.body;
    
    if (!channelId || !content) {
      return res.status(400).json({ error: 'Channel ID and content are required' });
    }
    
    // Validate content
    if (typeof content !== 'string' || content.length < 1 || content.length > 2000) {
      return res.status(400).json({ error: 'Content must be a string between 1 and 2000 characters' });
    }
    
    // Validate channelId format
    if (typeof channelId !== 'string') {
      return res.status(400).json({ error: 'Channel ID must be a string' });
    }

    // Check if user has permission to send messages
    const canSend = await db.hasPermission(req.userId!, 'send_messages');
    if (!canSend) {
      return res.status(403).json({ error: 'Permission to send messages required' });
    }

    // Check if channel exists and is not read-only
    const channel = await db.getChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    if (channel.isReadOnly) {
      return res.status(403).json({ error: 'Channel is read-only' });
    }

    const message = await db.createMessage({ 
      channelId, 
      userId: req.userId!, 
      username: req.user!.username, 
      content 
    });
    res.json({ message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update message
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { content, isPinned } = req.body;
    
    // Validate content if provided
    if (content !== undefined) {
      if (typeof content !== 'string' || content.length < 1 || content.length > 2000) {
        return res.status(400).json({ error: 'Content must be a string between 1 and 2000 characters' });
      }
    }
    
    // Check if trying to pin/unpin message
    if (isPinned !== undefined) {
      const hasPermission = await db.hasPermission(req.userId!, 'pin_messages');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission to pin messages required' });
      }
    }
    
    // For content editing, check if user owns the message or has edit rights
    if (content !== undefined) {
      const existingMessage = await db.getAllMessages().then(messages => 
        messages.find(m => m.id === req.params.id)
      );
      if (!existingMessage) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      const isOwner = existingMessage.userId === req.userId;
      const hasEditSelf = await db.hasPermission(req.userId!, 'edit_messages_self');
      const hasEditAll = await db.hasPermission(req.userId!, 'edit_messages_all');
      
      if (!hasEditAll && !(isOwner && hasEditSelf)) {
        return res.status(403).json({ error: 'Permission to edit messages required' });
      }
    }
    
    const message = await db.updateMessage(req.params.id, { content, isPinned });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check if user has permission to delete messages or owns the message
    const existingMessage = await db.getAllMessages().then(messages => 
      messages.find(m => m.id === req.params.id)
    );
    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const isOwner = existingMessage.userId === req.userId;
    const hasDeleteSelf = await db.hasPermission(req.userId!, 'delete_messages_self');
    const hasDeleteAll = await db.hasPermission(req.userId!, 'delete_messages_all');
    
    if (!hasDeleteAll && !(isOwner && hasDeleteSelf)) {
      return res.status(403).json({ error: 'Permission to delete messages required' });
    }
    
    const success = await db.deleteMessage(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;