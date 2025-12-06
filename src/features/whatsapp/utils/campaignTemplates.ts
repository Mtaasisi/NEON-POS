/**
 * Campaign Templates Utility
 * Save and load campaign configurations for reuse
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  message: string;
  messageType: string;
  settings: {
    usePersonalization: boolean;
    randomDelay: boolean;
    minDelay: number;
    maxDelay: number;
    usePresence: boolean;
    batchSize: number;
    batchDelay: number;
    maxPerHour: number;
    dailyLimit: number;
    skipRecentlyContacted: boolean;
    respectQuietHours: boolean;
    useInvisibleChars: boolean;
    useEmojiVariation: boolean;
    varyMessageLength: boolean;
    viewOnce?: boolean;
    pollQuestion?: string;
    pollOptions?: string[];
    allowMultiSelect?: boolean;
  };
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

const TEMPLATES_STORAGE_KEY = 'whatsapp_campaign_templates';

/**
 * Get all saved templates
 * Returns templates sorted by most recently used, then by creation date
 */
export function getAllTemplates(): CampaignTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!stored) {
      console.log('📋 No templates found in storage');
      return [];
    }
    
    const templates: CampaignTemplate[] = JSON.parse(stored);
    
    // Sort templates: most used first, then by last used date, then by creation date
    const sorted = templates.sort((a, b) => {
      // First sort by use count (descending)
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount;
      }
      // Then by last used date (most recent first)
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;
      // Finally by creation date (most recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    console.log(`✅ Loaded ${sorted.length} template(s) from storage`);
    return sorted;
  } catch (error) {
    console.error('❌ Error loading templates:', error);
    return [];
  }
}

/**
 * Save a new template
 */
export function saveTemplate(template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'useCount'>): string {
  const templates = getAllTemplates();
  const newTemplate: CampaignTemplate = {
    ...template,
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    useCount: 0
  };
  
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  return newTemplate.id;
}

/**
 * Update an existing template
 */
export function updateTemplate(id: string, updates: Partial<CampaignTemplate>): boolean {
  const templates = getAllTemplates();
  const index = templates.findIndex(t => t.id === id);
  
  if (index === -1) return false;
  
  templates[index] = { ...templates[index], ...updates };
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  return true;
}

/**
 * Delete a template
 */
export function deleteTemplate(id: string): boolean {
  const templates = getAllTemplates();
  const filtered = templates.filter(t => t.id !== id);
  
  if (filtered.length === templates.length) return false;
  
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): CampaignTemplate | null {
  const templates = getAllTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Increment use count when template is used
 */
export function incrementTemplateUse(id: string): void {
  const template = getTemplate(id);
  if (!template) return;
  
  updateTemplate(id, {
    useCount: template.useCount + 1,
    lastUsed: new Date().toISOString()
  });
}

/**
 * Get template statistics
 */
export function getTemplateStats() {
  const templates = getAllTemplates();
  return {
    total: templates.length,
    totalUses: templates.reduce((sum, t) => sum + t.useCount, 0),
    mostUsed: templates.length > 0 ? templates[0] : null,
    recentlyUsed: templates.filter(t => t.lastUsed).sort((a, b) => 
      new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
    ).slice(0, 5),
    byType: templates.reduce((acc, t) => {
      acc[t.messageType] = (acc[t.messageType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}
