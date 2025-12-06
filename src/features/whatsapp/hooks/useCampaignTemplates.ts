/**
 * Campaign Templates Hook
 * Provides easy access to campaign templates from anywhere in the app
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllTemplates,
  getTemplate,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUse,
  type CampaignTemplate
} from '../utils/campaignTemplates';

export function useCampaignTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    try {
      const loaded = getAllTemplates();
      setTemplates(loaded);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const createTemplate = useCallback((template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'useCount'>) => {
    try {
      const id = saveTemplate(template);
      loadTemplates();
      return id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }, [loadTemplates]);

  const updateTemplateById = useCallback((id: string, updates: Partial<CampaignTemplate>) => {
    try {
      const success = updateTemplate(id, updates);
      if (success) {
        loadTemplates();
      }
      return success;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }, [loadTemplates]);

  const removeTemplate = useCallback((id: string) => {
    try {
      const success = deleteTemplate(id);
      if (success) {
        loadTemplates();
      }
      return success;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }, [loadTemplates]);

  const useTemplate = useCallback((id: string) => {
    try {
      incrementTemplateUse(id);
      const template = getTemplate(id);
      return template;
    } catch (error) {
      console.error('Error using template:', error);
      return null;
    }
  }, []);

  const getTemplateById = useCallback((id: string) => {
    return getTemplate(id);
  }, []);

  return {
    templates,
    loading,
    loadTemplates,
    createTemplate,
    updateTemplate: updateTemplateById,
    deleteTemplate: removeTemplate,
    useTemplate,
    getTemplate: getTemplateById
  };
}
