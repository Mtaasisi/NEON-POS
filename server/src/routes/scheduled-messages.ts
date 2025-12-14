/**
 * Scheduled Messages API Routes
 * 
 * Endpoints for managing scheduled bulk messages (SMS & WhatsApp)
 */

import { Router, Request, Response } from 'express';
import { getScheduler } from '../services/scheduledMessagesService';

const router = Router();

// Middleware to get Supabase credentials from environment
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration not found');
  }
  
  return { supabaseUrl, supabaseKey };
};

/**
 * GET /api/scheduled-messages
 * Get all scheduled messages for a user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = req.query.user_id as string;
    const status = req.query.status as string;
    const messageType = req.query.message_type as string;

    let query = supabase
      .from('scheduled_bulk_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (messageType) {
      query = query.eq('message_type', messageType);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduled-messages/:id
 * Get a specific scheduled message
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = req.params;

    const { data, error } = await supabase
      .from('scheduled_bulk_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages
 * Create a new scheduled message
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      user_id,
      name,
      message_type,
      message_content,
      recipients,
      scheduled_for,
      schedule_type,
      execution_mode,
      settings,
      media_url,
      media_type,
      view_once,
      recurrence_pattern,
      recurrence_end_date,
      timezone,
      auto_execute,
      branch_id
    } = req.body;

    // Validation
    if (!user_id || !name || !message_type || !message_content || !recipients || !scheduled_for) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, name, message_type, message_content, recipients, scheduled_for' 
      });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients must be a non-empty array' });
    }

    // Calculate next execution for recurring messages
    const nextExecutionAt = schedule_type !== 'once' ? scheduled_for : null;

    const messageData = {
      user_id,
      created_by: user_id,
      branch_id,
      name,
      message_type,
      message_content,
      recipients,
      total_recipients: recipients.length,
      schedule_type: schedule_type || 'once',
      scheduled_for,
      timezone: timezone || 'Africa/Dar_es_Salaam',
      recurrence_pattern,
      recurrence_end_date,
      execution_mode: execution_mode || 'server',
      auto_execute: auto_execute !== false,
      settings: settings || {
        use_personalization: true,
        random_delay: true,
        min_delay: 3000,
        max_delay: 8000,
        use_presence: true,
        batch_size: 50
      },
      status: 'scheduled',
      next_execution_at: nextExecutionAt,
      media_url,
      media_type,
      view_once: view_once || false,
      progress: {
        current: 0,
        total: recipients.length,
        success: 0,
        failed: 0,
        pending: recipients.length
      }
    };

    const { data, error } = await supabase
      .from('scheduled_bulk_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      message: 'Scheduled message created successfully',
      data 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/scheduled-messages/:id
 * Update a scheduled message
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.created_at;
    delete updates.execution_count;

    const { data, error } = await supabase
      .from('scheduled_bulk_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      message: 'Scheduled message updated successfully',
      data 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/scheduled-messages/:id
 * Delete a scheduled message
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = req.params;

    const { error } = await supabase
      .from('scheduled_bulk_messages')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      message: 'Scheduled message deleted successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/:id/execute
 * Manually execute a scheduled message now
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const scheduler = getScheduler(supabaseUrl, supabaseKey);

    const { id } = req.params;

    const result = await scheduler.executeById(id);

    res.json({ 
      success: true, 
      message: 'Message executed successfully',
      result 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/:id/pause
 * Pause a scheduled message
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const scheduler = getScheduler(supabaseUrl, supabaseKey);

    const { id } = req.params;

    await scheduler.pauseMessage(id);

    res.json({ 
      success: true, 
      message: 'Message paused successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/:id/resume
 * Resume a paused message
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const scheduler = getScheduler(supabaseUrl, supabaseKey);

    const { id } = req.params;

    await scheduler.resumeMessage(id);

    res.json({ 
      success: true, 
      message: 'Message resumed successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/:id/cancel
 * Cancel a scheduled message
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const scheduler = getScheduler(supabaseUrl, supabaseKey);

    const { id } = req.params;

    await scheduler.cancelMessage(id);

    res.json({ 
      success: true, 
      message: 'Message cancelled successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduled-messages/:id/executions
 * Get execution history for a message
 */
router.get('/:id/executions', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = req.params;

    const { data, error } = await supabase
      .from('scheduled_message_executions')
      .select('*')
      .eq('scheduled_message_id', id)
      .order('executed_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduled-messages/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const scheduler = getScheduler(supabaseUrl, supabaseKey);

    const status = scheduler.getStatus();

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/templates
 * Create a message template
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('bulk_message_templates')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduled-messages/templates
 * Get message templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = req.query.user_id as string;
    const messageType = req.query.message_type as string;

    let query = supabase
      .from('bulk_message_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (messageType) {
      query = query.or(`message_type.eq.${messageType},message_type.eq.both`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scheduled-messages/recipient-lists
 * Create a recipient list
 */
router.post('/recipient-lists', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const listData = {
      ...req.body,
      total_recipients: req.body.recipients?.length || 0
    };

    const { data, error } = await supabase
      .from('message_recipient_lists')
      .insert(listData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduled-messages/recipient-lists
 * Get recipient lists
 */
router.get('/recipient-lists', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = req.query.user_id as string;

    let query = supabase
      .from('message_recipient_lists')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

