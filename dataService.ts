
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { AppState, UserProfile, UserRole } from '../types';

const LOCAL_STORAGE_KEY = 'chordmaster_state_v3';

// Access variables via process.env as per prompt instructions but using VITE_ prefix as requested
const supabaseUrl = (process.env as any).VITE_SUPABASE_URL;
const supabaseKey = (process.env as any).VITE_SUPABASE_ANON_KEY;

class DataService {
  private client: SupabaseClient | null = null;
  private currentUser: UserProfile | null = null;

  constructor() {
    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn("Supabase credentials missing. VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment.");
    }
  }

  isCloudEnabled(): boolean {
    return !!this.client;
  }

  async signUp(email: string, password: string, role: UserRole = 'Viewer'): Promise<{ error: any }> {
    if (!this.client) return { error: 'Supabase not configured' };
    
    const { data: authData, error: authError } = await this.client.auth.signUp({ email, password });
    if (authError) return { error: authError.message };

    if (authData.user) {
      // Create profile entry. In a production app, this would ideally be a database trigger.
      const { error: profileError } = await this.client
        .from('profiles')
        .insert([{ id: authData.user.id, email, role }]);
      
      if (profileError) return { error: profileError.message };
    }
    
    return { error: null };
  }

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null, error: any }> {
    if (!this.client) return { user: null, error: 'Supabase not configured' };

    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({ email, password });
    if (authError) return { user: null, error: authError.message };

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      // Fallback for missing profile
      this.currentUser = { id: authData.user.id, email: authData.user.email || '', role: 'Viewer' };
    } else {
      this.currentUser = profile as UserProfile;
    }

    return { user: this.currentUser, error: null };
  }

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
      this.currentUser = null;
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!this.client) return null;
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return null;

    const { data: profile } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return { id: user.id, email: user.email || '', role: 'Viewer' };
    return profile as UserProfile;
  }

  async loadInitialState(defaultState: AppState): Promise<AppState> {
    const user = await this.getCurrentUser();
    this.currentUser = user;

    if (this.client && user) {
      try {
        const { data } = await this.client
          .from('app_data')
          .select('state')
          .eq('workspace_id', 'global_workspace')
          .maybeSingle();

        if (data?.state) {
          // Merge remote state with current user
          return { ...data.state, user };
        }
      } catch (e) {
        console.error('Cloud load failed', e);
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localState = saved ? JSON.parse(saved) : defaultState;
    return { ...localState, user };
  }

  async saveState(state: AppState) {
    // Local cache always
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    // Cloud sync ONLY if user is Admin and client exists
    if (this.client && this.currentUser?.role === 'Admin') {
      try {
        // Strip user object from saved state to avoid cyclic issues or sensitive data leakage
        const { user, ...stateToSave } = state; 
        await this.client
          .from('app_data')
          .upsert({
            workspace_id: 'global_workspace',
            state: stateToSave,
            updated_at: new Date().toISOString()
          });
      } catch (e) {
        console.error('Cloud save failed (Permissions?)', e);
      }
    }
  }
}

export const dataService = new DataService();
