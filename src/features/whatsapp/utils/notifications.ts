/**
 * Enhanced Real-time Notifications
 * Better progress updates with milestones and analytics
 */

export interface NotificationConfig {
  milestones: number[]; // Percentage milestones (e.g., [25, 50, 75])
  enableSounds: boolean;
  enableDesktop: boolean;
  enableEmail: boolean;
  emailRecipient?: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  milestones: [25, 50, 75, 90],
  enableSounds: true,
  enableDesktop: true,
  enableEmail: false
};

let lastMilestone = 0;

/**
 * Check and send milestone notifications
 */
export function checkMilestones(
  current: number,
  total: number,
  config: NotificationConfig = DEFAULT_CONFIG
): void {
  if (total === 0) return;
  
  const percentage = Math.floor((current / total) * 100);
  
  // Check each milestone
  for (const milestone of config.milestones) {
    if (percentage >= milestone && lastMilestone < milestone) {
      sendMilestoneNotification(milestone, current, total, config);
      lastMilestone = milestone;
      break;
    }
  }
}

/**
 * Send milestone notification
 */
function sendMilestoneNotification(
  milestone: number,
  current: number,
  total: number,
  config: NotificationConfig
): void {
  const message = `${milestone}% Complete: ${current}/${total} messages sent`;
  
  // Desktop notification
  if (config.enableDesktop && Notification.permission === 'granted') {
    new Notification(`Campaign Progress - ${milestone}%`, {
      body: message,
      icon: '/favicon.ico',
      tag: `campaign-${milestone}`,
      requireInteraction: false
    });
  }
  
  // Sound notification
  if (config.enableSounds) {
    playMilestoneSound(milestone);
  }
  
  console.log(`🎯 Milestone reached: ${milestone}% - ${message}`);
}

/**
 * Play sound for milestone
 */
function playMilestoneSound(milestone: number): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sound for different milestones
    const frequency = 400 + (milestone / 10) * 50; // Higher pitch for higher milestones
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silently fail if audio not supported
  }
}

/**
 * Send completion summary
 */
export function sendCompletionSummary(
  success: number,
  failed: number,
  total: number,
  duration: number,
  config: NotificationConfig = DEFAULT_CONFIG
): void {
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
  const message = `Campaign Complete!\n${success} sent, ${failed} failed (${successRate}% success)\nDuration: ${formatDuration(duration)}`;
  
  if (config.enableDesktop && Notification.permission === 'granted') {
    new Notification('Campaign Complete! 🎉', {
      body: message,
      icon: '/favicon.ico',
      tag: 'campaign-complete',
      requireInteraction: true
    });
  }
  
  if (config.enableSounds) {
    playCompletionSound(successRate);
  }
}

/**
 * Play completion sound based on success rate
 */
function playCompletionSound(successRate: number): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Success sound (higher pitch for better success rates)
    const frequency = successRate > 80 ? 600 : successRate > 50 ? 500 : 400;
    
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency + (i * 50);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }, i * 150);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Format duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Reset milestone tracking
 */
export function resetMilestones(): void {
  lastMilestone = 0;
}
