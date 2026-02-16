
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Music, 
  Settings as SettingsIcon, 
  Moon, 
  Sun,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  ChevronDown,
  Hash,
  Users,
  UserPlus,
  Mic,
  Settings2,
  Tv,
  Cloud,
  RefreshCw,
  LogOut,
  Shield,
  Eye,
  Key as KeyIcon,
  // Added missing icon import
  Smartphone
} from 'lucide-react';
import { ViewType, Song, Schedule, AppState, Key } from './types';
import { SAMPLE_SONGS, ALL_KEYS } from './constants';
import { fetchDailyVerse } from './services/geminiService';
import { isChordLine, getTransposedContent } from './utils/chordUtils';
import { dataService } from './services/dataService';

const ROLES = ["Worship Leader", "Lead Guitar", "Acoustic Guitar", "Bass Guitar", "Keyboard", "Back up Singers", "Audio", "Media"];
const INSTRUMENTS = [
  { name: "Lyrics", icon: <Mic className="w-4 h-4" /> },
  { name: "Lead Guitar", icon: <Music className="w-4 h-4" /> },
  { name: "Bass Guitar", icon: <Music className="w-4 h-4" /> },
  { name: "Keyboard", icon: <Settings2 className="w-4 h-4" /> }
];

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verse, setVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetKey, setTargetKey] = useState<Key | null>(null);
  const [useNashville, setUseNashville] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePart, setActivePart] = useState<string>("Lyrics");
  const [newMemberName, setNewMemberName] = useState('');
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [newSong, setNewSong] = useState<Partial<Song>>({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} });
  const [newSchedule, setNewSchedule] = useState({ name: '', date: '', songIds: [] as string[] });

  useEffect(() => {
    const init = async () => {
      const defaultState: AppState = {
        songs: SAMPLE_SONGS,
        schedules: [],
        members: ["John Doe", "Jane Smith"],
        theme: 'light',
        currentView: 'dashboard',
        user: null
      };
      const loaded = await dataService.loadInitialState(defaultState);
      setState(loaded);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (state) {
      dataService.saveState(state);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    }
  }, [state]);

  useEffect(() => { fetchDailyVerse().then(setVerse); }, []);

  const isAdmin = state?.user?.role === 'Admin';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    
    if (authMode === 'signin') {
      const { user, error } = await dataService.signIn(email, password);
      if (error) {
        setAuthError(error);
        setIsLoading(false);
      } else {
        setState(prev => prev ? ({ ...prev, user, currentView: 'dashboard' }) : null);
        setIsLoading(false);
      }
    } else {
      const { error } = await dataService.signUp(email, password, 'Admin'); // First users usually want to be Admin for setup, or use Viewer default
      if (error) {
        setAuthError(error);
        setIsLoading(false);
      } else {
        alert('Account created! Please check your email for confirmation if required, then sign in.');
        setAuthMode('signin');
        setIsLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    await dataService.signOut();
    setState(prev => prev ? ({ ...prev, user: null, currentView: 'login' }) : null);
    window.location.reload();
  };

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">Syncing ChordMaster...</p>
      </div>
    );
  }

  // Mandatory Login Screen if not authenticated
  if (!state.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="bg-blue-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 dark:shadow-none"><Music className="text-white w-8 h-8" /></div>
            <h1 className="text-3xl font-black tracking-tight">ChordMaster Pro</h1>
            <p className="text-gray-400 text-sm font-medium mt-2">{authMode === 'signin' ? 'Welcome back to the set' : 'Join the global worship team'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
              <input required type="email" placeholder="email@church.com" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {authError && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-500 text-xs font-bold animate-pulse">{authError}</div>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-[0.98]">
              {authMode === 'signin' ? 'Launch Dashboard' : 'Create Access'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-xs text-gray-400 font-black uppercase tracking-widest hover:text-blue-500 transition-colors">
              {authMode === 'signin' ? "Need a new account?" : "Back to Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navigate = (view: ViewType, payload?: { songId?: string; scheduleId?: string }) => {
    setState(prev => prev ? ({ ...prev, currentView: view, selectedSongId: payload?.songId, selectedScheduleId: payload?.scheduleId }) : null);
    if (view === 'view-song') {
      const song = state.songs.find(s => s.id === payload?.songId);
      if (song) { setTargetKey(song.originalKey); setUseNashville(false); setActivePart("Lyrics"); }
    }
    setIsEditing(false);
  };

  const currentSong = state.songs.find(s => s.id === state.selectedSongId);
  const currentSchedule = state.schedules.find(s => s.id === state.selectedScheduleId);
  const filteredSongs = state.songs.filter(song => song.title.toLowerCase().includes(searchQuery.toLowerCase()) || song.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div><h1 className="text-4xl font-black tracking-tight">Worship Hub</h1><p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
        <div className="hidden md:flex items-center gap-4 bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}><Shield className="w-4 h-4" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Access Level</p><p className="font-black text-sm">{state.user?.role}</p></div>
        </div>
      </header>

      <div className="relative overflow-hidden rounded-[2.5rem] h-72 flex items-center justify-center text-center p-12 bg-cover bg-center shadow-2xl transition-transform hover:scale-[1.01] duration-500" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1459749411177-042180ce673b?q=80&w=2070&auto=format&fit=crop')` }}>
        <div className="max-w-3xl">
          {verse ? (<><p className="text-2xl md:text-3xl font-medium text-white italic mb-6 leading-relaxed">"{verse.verse}"</p><p className="text-white/70 font-black uppercase tracking-[0.3em] text-xs">— {verse.reference}</p></>) : (<div className="animate-pulse flex flex-col items-center"><div className="h-8 w-80 bg-white/20 rounded-full mb-6"></div><div className="h-4 w-40 bg-white/20 rounded-full"></div></div>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black">Active Setlists</h2><button onClick={() => navigate('schedules')} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Full Planner</button></div>
          <div className="space-y-4">
            {state.schedules.slice(0, 3).map(sch => (
              <button key={sch.id} onClick={() => navigate('view-schedule', { scheduleId: sch.id })} className="w-full flex items-center justify-between p-6 rounded-3xl hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all text-left hover:border-blue-200">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Calendar className="w-6 h-6" /></div>
                   <div><h3 className="font-black text-lg">{sch.name}</h3><p className="text-sm text-gray-400 font-bold">{new Date(sch.date).toLocaleDateString()}</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
            {state.schedules.length === 0 && <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200"><p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No schedules projected.</p></div>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Users className="w-6 h-6 text-blue-500" /> Team</h2>
          <div className="space-y-6">
            {isAdmin && (
              <div className="flex gap-3">
                <input type="text" placeholder="Member name..." className="flex-1 bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (() => { if (!newMemberName.trim()) return; setState(prev => prev ? ({ ...prev, members: [...prev.members, newMemberName.trim()] }) : null); setNewMemberName(''); })()} />
                <button onClick={() => { if (!newMemberName.trim()) return; setState(prev => prev ? ({ ...prev, members: [...prev.members, newMemberName.trim()] }) : null); setNewMemberName(''); }} className="bg-blue-600 text-white p-3.5 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-transform active:scale-90"><UserPlus className="w-5 h-5" /></button>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {state.members.map(member => (
                <div key={member} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <span className="font-black text-sm">{member}</span>
                  {isAdmin && <button onClick={() => confirm('Remove from team?') && setState(prev => prev ? ({ ...prev, members: prev.members.filter(m => m !== member) }) : null)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSongs = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h1 className="text-4xl font-black tracking-tight">Song Repertoire</h1><p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Manage global worship catalog</p></div>
        {isAdmin && (
          <button onClick={() => { setIsEditing(false); setNewSong({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} }); document.getElementById('song-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black flex items-center space-x-3 shadow-2xl shadow-blue-200 dark:shadow-none transition-all active:scale-95"><Plus className="w-6 h-6" /><span>New Song Entry</span></button>
        )}
      </div>
      <div className="relative group shadow-sm"><Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 transition-colors group-focus-within:text-blue-500" /><input type="text" placeholder="Search by title, artist, or tag..." className="w-full bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-3xl pl-16 pr-6 py-5 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSongs.map(song => (
          <div key={song.id} className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden" onClick={() => navigate('view-song', { songId: song.id })}>
            <div className="flex justify-between items-start z-10 relative">
              <div className="flex-1"><h3 className="text-xl font-black group-hover:text-blue-600 transition-colors leading-tight mb-1">{song.title}</h3><p className="text-sm text-gray-400 font-black uppercase tracking-widest mb-6">{song.artist}</p><div className="flex items-center gap-2"><div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">Key: {song.originalKey}</div></div></div>
              {isAdmin && (
                <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setNewSong(song); setIsEditing(true); document.getElementById('song-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="p-3 bg-gray-50 dark:bg-gray-700 hover:text-blue-500 rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => confirm('Delete song?') && setState(prev => prev ? ({ ...prev, songs: prev.songs.filter(s => s.id !== song.id) }) : null)} className="p-3 bg-gray-50 dark:bg-gray-700 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"><Music className="w-32 h-32" /></div>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div id="song-form" className="mt-20 bg-white dark:bg-gray-800 p-12 rounded-[3rem] border border-gray-100 dark:border-gray-700 max-w-5xl mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4 mb-10"><div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white"><Edit className="w-6 h-6" /></div><h2 className="text-3xl font-black">{isEditing ? 'Modify Catalog Item' : 'Register Global Entry'}</h2></div>
          <form onSubmit={(e) => { e.preventDefault(); if (!newSong.title || !newSong.content) return; const song: Song = { id: isEditing ? (state.selectedSongId || '') : Math.random().toString(36).substr(2, 9), title: newSong.title!, artist: newSong.artist || 'Unknown', originalKey: (newSong.originalKey as Key) || 'C', content: newSong.content!, instrumentParts: newSong.instrumentParts || {}, createdAt: Date.now() }; setState(prev => prev ? ({ ...prev, songs: isEditing ? prev.songs.map(s => s.id === song.id ? song : s) : [...prev.songs, song], currentView: 'songs' }) : null); setNewSong({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} }); setIsEditing(false); }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-1 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Official Title</label><input required type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Original Artist</label><input type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Foundation Key</label><select className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-black cursor-pointer" value={newSong.originalKey} onChange={e => setNewSong({...newSong, originalKey: e.target.value as Key})}>{ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Chords & Lyrical Content</label><span className="text-[10px] text-gray-400 font-bold italic">Standard formatting required</span></div>
                <textarea required rows={14} className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-3xl px-8 py-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-mono text-sm leading-relaxed" placeholder="G           C\nAmazing grace..." value={newSong.content} onChange={e => setNewSong({...newSong, content: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              {isEditing && <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 text-gray-400 font-black uppercase tracking-widest text-xs">Discard Changes</button>}
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-[1.5rem] font-black shadow-2xl shadow-blue-100 dark:shadow-none transition-all active:scale-95">
                {isEditing ? 'Sync Updates' : 'Publish Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderViewSong = () => {
    if (!currentSong) return null;
    const displayKey = useNashville ? '#' : (targetKey || currentSong.originalKey);
    const transposed = getTransposedContent(currentSong.content, currentSong.originalKey, targetKey || currentSong.originalKey, useNashville);
    const scheduleSongs = currentSchedule?.songIds || [];
    const currentIndex = scheduleSongs.indexOf(currentSong.id);
    const currentInstructions = activePart === "Lyrics" ? transposed : (currentSong.instrumentParts?.[activePart] || "");

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
        <header className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center space-x-6">
            <button onClick={() => navigate(currentSchedule ? 'view-schedule' : 'songs', { scheduleId: currentSchedule?.id })} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-[1.5rem] transition-all shadow-sm border border-gray-100 dark:border-gray-700 active:scale-90"><ChevronLeft className="w-7 h-7" /></button>
            <div><h1 className="text-3xl font-black tracking-tight">{currentSong.title}</h1><p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">{currentSong.artist}</p></div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="relative group">
                <button className="bg-white dark:bg-gray-800 border-2 border-blue-600 text-blue-600 dark:text-blue-400 px-8 py-4 rounded-2xl font-black flex items-center space-x-4 hover:scale-105 transition-all shadow-xl shadow-blue-50 dark:shadow-none"><KeyIcon className="w-5 h-5" /><span className="text-xl">{displayKey}</span><ChevronDown className="w-5 h-5" /></button>
                <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] shadow-2xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all p-6 grid grid-cols-4 gap-3 border-t-4 border-t-blue-600">
                  {ALL_KEYS.map(k => (<button key={k} onClick={() => { setTargetKey(k); setUseNashville(false); }} className={`p-4 rounded-xl text-xs font-black transition-all ${targetKey === k && !useNashville ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{k}</button>))}
                  <button onClick={() => setUseNashville(!useNashville)} className={`col-span-4 mt-4 p-4 rounded-xl text-lg font-black transition-all flex items-center justify-center space-x-3 ${useNashville ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-50 dark:bg-gray-700'}`}><Hash className="w-6 h-6" /> <span>Nashville #</span></button>
                </div>
             </div>
             {isAdmin && <button onClick={() => { setIsEditing(true); setNewSong(currentSong); navigate('songs'); }} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-400 transition-colors"><Edit className="w-6 h-6" /></button>}
          </div>
        </header>
        <div className="flex gap-4 mb-6 overflow-x-auto pb-4 shrink-0 no-scrollbar">
           {INSTRUMENTS.map(inst => (<button key={inst.name} onClick={() => setActivePart(inst.name)} className={`flex items-center space-x-3 px-8 py-4 rounded-[1.5rem] font-black whitespace-nowrap transition-all border-2 ${activePart === inst.name ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-200' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-100 dark:border-gray-700'}`}>{inst.icon}<span>{inst.name}</span></button>))}
        </div>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-[3.5rem] p-12 md:p-20 shadow-inner border border-gray-100 dark:border-gray-700 relative group/paper">
           {activePart === "Lyrics" ? (
             <pre className="font-mono text-xl md:text-2xl leading-[2.4] whitespace-pre-wrap select-text">{transposed.split('\n').map((line, i) => (<div key={i} className={isChordLine(line) ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-gray-900 dark:text-gray-100 font-medium'}>{line || ' '}</div>))}</pre>
           ) : (
             <div className="h-full flex flex-col">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="font-black uppercase tracking-[0.4em] text-blue-500 text-sm">{activePart} Instructions</h3>
                 {!isAdmin && <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-full"><Eye className="w-4 h-4 text-gray-400" /><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Read Only Mode</span></div>}
               </div>
               <textarea readOnly={!isAdmin} className={`flex-1 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-12 font-mono text-xl leading-relaxed outline-none resize-none transition-all ${isAdmin ? 'focus:ring-8 focus:ring-blue-500/5' : 'cursor-not-allowed opacity-70'}`} placeholder={isAdmin ? `Add specific instruction cues for ${activePart}...` : `No cues recorded for ${activePart}`} value={currentInstructions} onChange={e => {
                 if (!isAdmin) return;
                 const content = e.target.value;
                 setState(prev => prev ? ({ ...prev, songs: prev.songs.map(s => s.id === currentSong.id ? { ...s, instrumentParts: { ...s.instrumentParts, [activePart]: content } } : s) }) : null);
               }} />
             </div>
           )}
           <div className="absolute top-10 right-10 opacity-0 group-hover/paper:opacity-30 transition-opacity"><Music className="w-16 h-16 text-gray-300" /></div>
        </div>
        {currentSchedule && (<footer className="mt-8 p-6 bg-gray-900 text-white rounded-[2.5rem] flex items-center justify-between shrink-0 shadow-2xl"><button disabled={currentIndex === 0} onClick={() => navigate('view-song', { songId: scheduleSongs[currentIndex - 1], scheduleId: currentSchedule.id })} className={`flex items-center space-x-4 px-8 py-4 rounded-2xl transition-all ${currentIndex === 0 ? 'opacity-20' : 'hover:bg-gray-800 active:scale-90'}`}><ChevronLeft className="w-6 h-6" /><span className="font-black text-sm uppercase tracking-widest">Back</span></button><div className="hidden md:block text-center"><p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">{currentSchedule.name}</p><div className="flex items-center gap-3 justify-center"><div className="h-px w-8 bg-gray-800"></div><p className="font-black text-base uppercase">Song {currentIndex + 1} of {scheduleSongs.length}</p><div className="h-px w-8 bg-gray-800"></div></div></div><button disabled={currentIndex === scheduleSongs.length - 1} onClick={() => navigate('view-song', { songId: scheduleSongs[currentIndex + 1], scheduleId: currentSchedule.id })} className={`flex items-center space-x-4 px-8 py-4 rounded-2xl transition-all ${currentIndex === scheduleSongs.length - 1 ? 'opacity-20' : 'hover:bg-gray-800 active:scale-90'}`}><span className="font-black text-sm uppercase tracking-widest">Forward</span><ChevronRight className="w-6 h-6" /></button></footer>)}
      </div>
    );
  };

  const renderSchedules = () => (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center"><div><h1 className="text-4xl font-black tracking-tight">Setlist Planner</h1><p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Design the flow of worship</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 h-fit shadow-sm">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Settings2 className="w-6 h-6 text-blue-500" /> Designer</h2>
          {!isAdmin ? (
            <div className="p-10 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 text-center"><Smartphone className="w-12 h-12 text-gray-200 mx-auto mb-6" /><p className="text-sm text-gray-400 font-bold uppercase tracking-widest leading-loose">Access Restricted.<br/>Only Admins can<br/>plan new events.</p></div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!newSchedule.name || !newSchedule.date) return; const schedule: Schedule = { id: Math.random().toString(36).substr(2, 9), ...newSchedule, assignments: {} }; setState(prev => prev ? ({ ...prev, schedules: [...prev.schedules, schedule], currentView: 'schedules' }) : null); setNewSchedule({ name: '', date: '', songIds: [] }); }} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Title</label><input required type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={newSchedule.name} onChange={e => setNewSchedule({...newSchedule, name: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Date</label><input required type="date" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={newSchedule.date} onChange={e => setNewSchedule({...newSchedule, date: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Set Selection</label><div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-3xl p-4 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">{state.songs.map(song => (<label key={song.id} className="flex items-center space-x-4 p-4 hover:bg-white dark:hover:bg-gray-800 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-blue-100"><input type="checkbox" className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-300" checked={newSchedule.songIds.includes(song.id)} onChange={(e) => { const ids = e.target.checked ? [...newSchedule.songIds, song.id] : newSchedule.songIds.filter(id => id !== song.id); setNewSchedule({...newSchedule, songIds: ids}); }} /><span className="text-sm font-black">{song.title}</span></label>))}</div></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-2xl shadow-blue-100 dark:shadow-none transition-all active:scale-95">Lock in Schedule</button>
            </form>
          )}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black mb-6">Master Setlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.schedules.map(sch => (
              <div key={sch.id} className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all cursor-pointer group hover:border-blue-200" onClick={() => navigate('view-schedule', { scheduleId: sch.id })}>
                <div className="flex justify-between items-start mb-8"><div><h3 className="text-2xl font-black group-hover:text-blue-600 transition-colors">{sch.name}</h3><p className="text-sm text-blue-500 font-black uppercase tracking-widest mt-1">{new Date(sch.date).toLocaleDateString()}</p></div><Calendar className="w-8 h-8 text-gray-100 dark:text-gray-700 group-hover:text-blue-100 transition-colors" /></div>
                <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-700"><span className="text-xs text-gray-400 font-black uppercase tracking-widest">{sch.songIds.length} Songs Loaded</span><button className="text-xs font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Explore &rarr;</button></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderViewSchedule = () => {
    if (!currentSchedule) return null;
    const schSongs = currentSchedule.songIds.map(id => state.songs.find(s => s.id === id)).filter(Boolean) as Song[];
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <header className="flex items-center space-x-6"><button onClick={() => navigate('schedules')} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm active:scale-90"><ChevronLeft className="w-6 h-6" /></button><div><h1 className="text-4xl font-black tracking-tight">{currentSchedule.name}</h1><p className="text-blue-500 font-black uppercase tracking-[0.2em] text-xs mt-1">{new Date(currentSchedule.date).toLocaleDateString()}</p></div></header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700">
               <h2 className="text-2xl font-black mb-8 flex items-center gap-4"><Music className="w-7 h-7 text-blue-500" /> Rehearsal Flow</h2>
               <div className="space-y-4">
                 {schSongs.map((song, idx) => (
                   <div key={song.id} onClick={() => navigate('view-song', { songId: song.id, scheduleId: currentSchedule.id })} className="flex items-center justify-between p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500/20 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all group">
                     <div className="flex items-center space-x-6">
                       <span className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl text-base font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">{idx + 1}</span>
                       <div><h3 className="font-black text-lg group-hover:text-blue-600 transition-colors">{song.title}</h3><p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{song.artist}</p></div>
                     </div>
                     <div className="flex items-center space-x-4"><span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-100/50">Key: {song.originalKey}</span><ChevronRight className="w-5 h-5 text-gray-300" /></div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-10">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700">
               <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Users className="w-6 h-6 text-indigo-500" /> Roster</h2>
               <div className="space-y-6">
                 {ROLES.map(role => (
                   <div key={role} className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{role}</label>
                     <select disabled={!isAdmin} className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none disabled:opacity-50" value={currentSchedule.assignments?.[role] || ""} onChange={e => {
                        if (!isAdmin) return;
                        const member = e.target.value;
                        setState(prev => prev ? ({ ...prev, schedules: prev.schedules.map(s => s.id === currentSchedule.id ? { ...s, assignments: { ...s.assignments, [role]: member } } : s) }) : null);
                     }}>
                       <option value="">— Unassigned —</option>
                       {state.members.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                   </div>
                 ))}
               </div>
            </div>
            <button onClick={() => navigate('view-song', { songId: schSongs[0]?.id, scheduleId: currentSchedule.id })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-200 dark:shadow-none flex items-center justify-center space-x-4 transition-transform hover:scale-[1.03] active:scale-95"><Tv className="w-8 h-8" /><span className="text-lg">Launch Practice Console</span></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 selection:bg-blue-100 selection:text-blue-900">
      <aside className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-10 z-50 flex flex-col hidden lg:flex">
        <div className="flex items-center space-x-5 mb-16 px-2">
          <div className="bg-blue-600 p-4 rounded-[1.25rem] shadow-xl shadow-blue-100 dark:shadow-none"><Music className="w-7 h-7 text-white" /></div>
          <span className="text-2xl font-black tracking-tighter">ChordMaster</span>
        </div>
        <nav className="space-y-3 flex-1">
          <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={state.currentView === 'dashboard'} onClick={() => navigate('dashboard')} />
          <SidebarItem icon={<Calendar className="w-5 h-5" />} label="Schedules" active={state.currentView === 'schedules' || state.currentView === 'view-schedule'} onClick={() => navigate('schedules')} />
          <SidebarItem icon={<Music className="w-5 h-5" />} label="Song List" active={state.currentView === 'songs' || state.currentView === 'view-song'} onClick={() => navigate('songs')} />
          <SidebarItem icon={<SettingsIcon className="w-5 h-5" />} label="Settings" active={state.currentView === 'settings'} onClick={() => navigate('settings')} />
        </nav>
        
        <div className="mt-auto space-y-8">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg">{state.user?.email.substring(0, 1).toUpperCase()}</div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{state.user?.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Shield className={`w-3 h-3 ${isAdmin ? 'text-green-500' : 'text-blue-500'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-green-500' : 'text-blue-500'}`}>{state.user?.role}</p>
                </div>
              </div>
            </div>
            <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-3 mt-4 py-3.5 bg-white dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 border border-gray-100 dark:border-gray-700 transition-all active:scale-95"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Cloud Status</span>
            <span className="flex items-center text-green-500 text-[10px] font-black uppercase gap-2 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 p-8 md:p-16 pb-28 lg:pb-16 max-w-screen-2xl mx-auto w-full">
        {state.currentView === 'dashboard' && renderDashboard()}
        {state.currentView === 'songs' && renderSongs()}
        {state.currentView === 'schedules' && renderSchedules()}
        {state.currentView === 'view-song' && renderViewSong()}
        {state.currentView === 'view-schedule' && renderViewSchedule()}
        {state.currentView === 'settings' && (
           <div className="max-w-3xl space-y-12 animate-in slide-in-from-bottom-8 duration-500">
            <h1 className="text-5xl font-black tracking-tight">Preferences</h1>
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="p-12 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-colors">
                <div className="flex items-center space-x-8"><div className="p-5 bg-gray-100 dark:bg-gray-700 rounded-3xl">{state.theme === 'light' ? <Sun className="w-8 h-8 text-orange-500" /> : <Moon className="w-8 h-8 text-blue-400" />}</div><div><p className="text-xl font-black">Visual Experience</p><p className="text-sm text-gray-400 font-medium mt-1">Switch between light and dark atmosphere</p></div></div>
                <button onClick={() => setState(prev => prev ? ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }) : null)} className="w-20 h-12 bg-gray-100 dark:bg-gray-700 rounded-full relative p-1.5 transition-colors"><div className={`w-9 h-9 bg-white dark:bg-blue-500 rounded-full shadow-2xl transition-transform transform ${state.theme === 'dark' ? 'translate-x-8' : ''}`} /></button>
              </div>
              <div className="p-12 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-colors">
                <div className="flex items-center space-x-8"><div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-3xl"><Shield className="w-8 h-8 text-blue-600" /></div><div><p className="text-xl font-black">Global Access Control</p><p className="text-sm text-gray-400 font-medium mt-1">Current Role: <span className="text-blue-600 font-black">{state.user?.role}</span></p></div></div>
                {isAdmin && <span className="text-[10px] font-black text-green-500 uppercase tracking-widest px-4 py-2 bg-green-50 rounded-full">Elevated Privileges</span>}
              </div>
            </div>
            <div className="flex justify-center"><button onClick={handleSignOut} className="flex items-center gap-3 px-10 py-5 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-colors uppercase tracking-[0.2em] text-xs"><LogOut className="w-4 h-4" /> Finalize Session</button></div>
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-700 flex justify-around p-5 lg:hidden z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('dashboard')} className={`p-4 rounded-[1.25rem] transition-all active:scale-90 ${state.currentView === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><LayoutDashboard /></button>
        <button onClick={() => navigate('schedules')} className={`p-4 rounded-[1.25rem] transition-all active:scale-90 ${state.currentView === 'schedules' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><Calendar /></button>
        <button onClick={() => navigate('songs')} className={`p-4 rounded-[1.25rem] transition-all active:scale-90 ${state.currentView === 'songs' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><Music /></button>
        <button onClick={() => navigate('settings')} className={`p-4 rounded-[1.25rem] transition-all active:scale-90 ${state.currentView === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><SettingsIcon /></button>
      </nav>
    </div>
  );
};

export default App;
