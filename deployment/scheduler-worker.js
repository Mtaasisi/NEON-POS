/**
 * Browser-Based Scheduler Worker
 * 
 * Web Worker for executing scheduled messages in the browser
 * Runs independently in background tab
 */

let checkInterval = 60000; // Check every 1 minute
let intervalId = null;
let isRunning = false;
let supabaseConfig = null;

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START':
      start(payload);
      break;

    case 'STOP':
      stop();
      break;

    case 'SET_INTERVAL':
      setCheckInterval(payload.interval);
      break;

    case 'CHECK_NOW':
      checkAndExecuteMessages();
      break;

    case 'EXECUTE':
      executeMessage(payload.messageId);
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Start the scheduler
 */
function start(config) {
  if (isRunning) {
    postMessage({ type: 'LOG', payload: 'Scheduler already running' });
    return;
  }

  supabaseConfig = config;
  isRunning = true;

  postMessage({ type: 'LOG', payload: 'Starting Browser Scheduler...' });

  // Run immediately
  checkAndExecuteMessages();

  // Then run periodically
  intervalId = setInterval(() => {
    checkAndExecuteMessages();
  }, checkInterval);

  postMessage({ 
    type: 'STARTED', 
    payload: { 
      checkInterval,
      message: `Scheduler started (checking every ${checkInterval / 1000}s)` 
    } 
  });
}

/**
 * Stop the scheduler
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  postMessage({ type: 'STOPPED', payload: 'Scheduler stopped' });
}

/**
 * Set check interval
 */
function setCheckInterval(interval) {
  checkInterval = interval;
  if (isRunning) {
    stop();
    start(supabaseConfig);
  }
}

/**
 * Check for messages ready to execute
 */
async function checkAndExecuteMessages() {
  if (!supabaseConfig) {
    postMessage({ type: 'ERROR', payload: 'Supabase config not set' });
    return;
  }

  try {
    postMessage({ type: 'LOG', payload: 'Checking for scheduled messages...' });

    // Fetch messages ready for execution (browser mode only)
    const response = await fetch(
      `${supabaseConfig.supabaseUrl}/rest/v1/scheduled_bulk_messages?` +
      `execution_mode=eq.browser&` +
      `auto_execute=eq.true&` +
      `status=in.(pending,scheduled)&` +
      `scheduled_for=lte.${new Date().toISOString()}&` +
      `order=scheduled_for.asc`,
      {
        headers: {
          'apikey': supabaseConfig.supabaseKey,
          'Authorization': `Bearer ${supabaseConfig.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const messages = await response.json();

    if (!messages || messages.length === 0) {
      postMessage({ type: 'LOG', payload: 'No messages ready for execution' });
      return;
    }

    postMessage({ 
      type: 'LOG', 
      payload: `Found ${messages.length} message(s) ready for execution` 
    });

    // Execute each message
    for (const message of messages) {
      await executeMessage(message.id, message);
    }
  } catch (error) {
    postMessage({ 
      type: 'ERROR', 
      payload: `Error checking messages: ${error.message}` 
    });
  }
}

/**
 * Execute a single scheduled message
 */
async function executeMessage(messageId, messageData = null) {
  if (!supabaseConfig) {
    postMessage({ type: 'ERROR', payload: 'Supabase config not set' });
    return;
  }

  try {
    postMessage({ 
      type: 'EXECUTION_STARTED', 
      payload: { messageId } 
    });

    // Fetch message data if not provided
    let message = messageData;
    if (!message) {
      const response = await fetch(
        `${supabaseConfig.supabaseUrl}/rest/v1/scheduled_bulk_messages?id=eq.${messageId}`,
        {
          headers: {
            'apikey': supabaseConfig.supabaseKey,
            'Authorization': `Bearer ${supabaseConfig.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch message: ${response.status}`);
      }

      const messages = await response.json();
      if (!messages || messages.length === 0) {
        throw new Error('Message not found');
      }
      message = messages[0];
    }

    postMessage({ 
      type: 'LOG', 
      payload: `Executing: ${message.name} (${message.message_type})` 
    });

    // Update status to running
    await updateMessage(messageId, {
      status: 'running',
      started_at: new Date().toISOString()
    });

    // Execute based on message type
    let result;
    if (message.message_type === 'sms') {
      result = await executeSMS(message);
    } else {
      result = await executeWhatsApp(message);
    }

    // Calculate next execution time for recurring messages
    const nextExecution = calculateNextExecution(message);

    // Update message status
    const finalStatus = result.success 
      ? (nextExecution ? 'scheduled' : 'completed')
      : 'failed';

    await updateMessage(messageId, {
      status: finalStatus,
      last_executed_at: new Date().toISOString(),
      next_execution_at: nextExecution,
      execution_count: message.execution_count + 1,
      progress: {
        current: message.total_recipients,
        total: message.total_recipients,
        success: result.sent,
        failed: result.failed,
        pending: 0
      },
      failed_recipients: result.errors,
      completed_at: nextExecution ? undefined : new Date().toISOString()
    });

    // Log execution history
    await logExecution(messageId, {
      executed_at: new Date().toISOString(),
      total_sent: message.total_recipients,
      success_count: result.sent,
      failed_count: result.failed,
      status: result.failed === 0 ? 'success' : (result.sent > 0 ? 'partial' : 'failed'),
      failed_recipients: result.errors,
      executed_by: 'browser'
    });

    postMessage({ 
      type: 'EXECUTION_COMPLETED', 
      payload: { 
        messageId,
        result,
        nextExecution
      } 
    });
  } catch (error) {
    postMessage({ 
      type: 'EXECUTION_FAILED', 
      payload: { 
        messageId, 
        error: error.message 
      } 
    });

    // Update message with error
    await updateMessage(messageId, {
      status: 'failed',
      error_message: error.message,
      last_error_at: new Date().toISOString()
    });
  }
}

/**
 * Execute SMS bulk send
 */
async function executeSMS(message) {
  const result = {
    success: true,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    postMessage({ type: 'LOG', payload: 'Executing SMS bulk send...' });

    // Send to each recipient
    for (const recipient of message.recipients) {
      try {
        // Personalize message
        const personalizedMessage = message.message_content
          .replace(/\{name\}/gi, recipient.name)
          .replace(/\{phone\}/gi, recipient.phone)
          .replace(/\{date\}/gi, new Date().toLocaleDateString())
          .replace(/\{time\}/gi, new Date().toLocaleTimeString());

        // Call SMS service via API
        const response = await fetch('/api/sms-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: recipient.phone,
            message: personalizedMessage
          })
        });

        const sendResult = await response.json();

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push({
            phone: recipient.phone,
            error: sendResult.error || 'Unknown error'
          });
        }

        // Small delay to avoid rate limiting
        await delay(message.settings?.min_delay || 1000);
      } catch (error) {
        result.failed++;
        result.errors.push({
          phone: recipient.phone,
          error: error.message
        });
      }
    }

    result.success = result.sent > 0;
    return result;
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: message.total_recipients,
      errors: [{ phone: 'system', error: error.message }]
    };
  }
}

/**
 * Execute WhatsApp bulk send
 */
async function executeWhatsApp(message) {
  const result = {
    success: true,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    postMessage({ type: 'LOG', payload: 'Executing WhatsApp bulk send...' });

    const settings = message.settings || {};
    const minDelay = settings.min_delay || 3000;
    const maxDelay = settings.max_delay || 8000;
    const randomDelay = settings.random_delay !== false;

    // Send to each recipient
    for (let i = 0; i < message.recipients.length; i++) {
      const recipient = message.recipients[i];
      
      try {
        // Personalize message
        const personalizedMessage = message.message_content
          .replace(/\{name\}/gi, recipient.name)
          .replace(/\{phone\}/gi, recipient.phone)
          .replace(/\{date\}/gi, new Date().toLocaleDateString())
          .replace(/\{time\}/gi, new Date().toLocaleTimeString());

        postMessage({ 
          type: 'PROGRESS', 
          payload: { 
            current: i + 1, 
            total: message.recipients.length,
            recipient: recipient.name 
          } 
        });

        // Prepare request body
        const requestBody = {
          phone: recipient.phone,
          message: personalizedMessage
        };

        if (message.media_url) {
          requestBody.media_url = message.media_url;
          requestBody.message_type = message.media_type;
          requestBody.caption = personalizedMessage;
          if (message.view_once) {
            requestBody.viewOnce = true;
          }
        }

        // Call WhatsApp service via API (you'll need to create this endpoint)
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const sendResult = await response.json();

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push({
            phone: recipient.phone,
            error: sendResult.error || 'Unknown error'
          });
        }

        // Random delay between messages (anti-ban)
        if (i < message.recipients.length - 1) {
          const delayMs = randomDelay
            ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
            : minDelay;
          await delay(delayMs);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          phone: recipient.phone,
          error: error.message
        });
      }
    }

    result.success = result.sent > 0;
    return result;
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: message.total_recipients,
      errors: [{ phone: 'system', error: error.message }]
    };
  }
}

/**
 * Calculate next execution time for recurring messages
 */
function calculateNextExecution(message) {
  if (message.schedule_type === 'once') {
    return null;
  }

  const baseTime = new Date(message.scheduled_for);
  let nextTime;

  switch (message.schedule_type) {
    case 'recurring_daily':
      nextTime = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      break;

    case 'recurring_weekly':
      nextTime = new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;

    case 'recurring_monthly':
      nextTime = new Date(baseTime);
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;

    case 'recurring_custom':
      if (message.recurrence_pattern?.interval) {
        const intervalMs = parseInterval(message.recurrence_pattern.interval);
        nextTime = new Date(baseTime.getTime() + intervalMs);
      } else {
        return null;
      }
      break;

    default:
      return null;
  }

  // Check if we've reached the end date
  if (message.recurrence_end_date) {
    const endDate = new Date(message.recurrence_end_date);
    if (nextTime > endDate) {
      return null;
    }
  }

  return nextTime.toISOString();
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(interval) {
  const match = interval.match(/^(\d+)\s*(day|days|hour|hours|minute|minutes)$/i);
  if (!match) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'minute':
    case 'minutes':
      return value * 60 * 1000;
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'day':
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown interval unit: ${unit}`);
  }
}

/**
 * Update message in database
 */
async function updateMessage(messageId, updates) {
  if (!supabaseConfig) {
    throw new Error('Supabase config not set');
  }

  const response = await fetch(
    `${supabaseConfig.supabaseUrl}/rest/v1/scheduled_bulk_messages?id=eq.${messageId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseConfig.supabaseKey,
        'Authorization': `Bearer ${supabaseConfig.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update message: ${response.status}`);
  }
}

/**
 * Log execution in database
 */
async function logExecution(messageId, data) {
  if (!supabaseConfig) {
    throw new Error('Supabase config not set');
  }

  const response = await fetch(
    `${supabaseConfig.supabaseUrl}/rest/v1/scheduled_message_executions`,
    {
      method: 'POST',
      headers: {
        'apikey': supabaseConfig.supabaseKey,
        'Authorization': `Bearer ${supabaseConfig.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        scheduled_message_id: messageId,
        ...data
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to log execution: ${response.status}`);
  }
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Notify that worker is ready
postMessage({ type: 'READY', payload: 'Scheduler worker initialized' });

