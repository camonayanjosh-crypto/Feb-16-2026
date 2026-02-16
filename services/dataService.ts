
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { AppState } from '../types';

const LOCAL_STORAGE_KEY = 'chordmaster_state_v2';

export interface SyncConfig {
  url: string;
  key: string;
  workspaceId: string;
}

class DataService {
  private client: SupabaseClient | null = null;
  private config: SyncConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const saved = localStorage.getItem('chordmaster_sync_config');
    if (saved) {
      this.config = JSON.parse(saved);
      if (this.config && this.config.url && this.config.key) {
        this.client = createClient(this.config.url, this.config.key);
      }
    }
  }

  saveConfig(config: SyncConfig) {
    localStorage.setItem('chordmaster_sync_config', JSON.stringify(config));
    this.config = config;
    if (config.url && config.key) {
      this.client = createClient(config.url, config.key);
    } else {
      this.client = null;
    }
  }

  getConfig(): SyncConfig | null {
    return this.config;
  }

  async loadInitialState(defaultState: AppState): Promise<AppState> {
    // 1. Try cloud
    if (this.client && this.config?.workspaceId) {
      try {
        const { data, error } = await this.client
          .from('app_data')
          .select('state')
          .eq('workspace_id', this.config.workspaceId)
          .single();

        if (data && data.state) {
          console.log('Successfully loaded state from Cloud');
          return data.state as AppState;
        }
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows'
          console.error('Cloud load error:', error);
        }
      } catch (e) {
        console.error('Failed to fetch from cloud:', e);
      }
    }

    // 2. Fallback to LocalStorage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      console.log('Loaded state from LocalStorage');
      return JSON.parse(saved);
    }

    return defaultState;
  }

  async saveState(state: AppState) {
    // Always save to local storage as a quick cache/backup
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    // Try cloud upsert
    if (this.client && this.config?.workspaceId) {
      try {
        const { error } = await this.client
          .from('app_data')
          .upsert({
            workspace_id: this.config.workspaceId,
            state: state,
            updated_at: new Date().toISOString()
          });

        if (error) console.error('Cloud save error:', error);
      } catch (e) {
        console.error('Cloud save failed:', e);
      }
    }
  }
}

export const dataService = new DataService();
