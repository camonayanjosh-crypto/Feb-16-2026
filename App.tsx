
import React, { useState, useEffect, useMemo } from 'react';
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
  CloudOff,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { ViewType, Song, Schedule, AppState, Key } from './types';
import { SAMPLE_SONGS, ALL_KEYS } from './constants';
import { fetchDailyVerse } from './services/geminiService';
import { isChordLine, getTransposedContent } from './utils/chordUtils';
import { dataService, SyncConfig } from './services/dataService';

const ROLES = [
  "Worship Leader",
  "Lead Guitar",
  "Acoustic Guitar",
  "Bass Guitar",
  "Keyboard",
  "Back up Singers",
  "Audio",
  "Media"
];

const INSTRUMENTS = [
  { name: "Lyrics", icon: <Mic className="w-4 h-4" /> },
  { name: "Lead Guitar", icon: <Music className="w-4 h-4" /> },
  { name: "Bass Guitar", icon: <Music className="w-4 h-4" /> },
  { name: "Keyboard", icon: <Settings2 className="w-4 h-4" /> }
];

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
  >
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
  const [copied, setCopied] = useState(false);
  
  // Sync UI state
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(
    dataService.getConfig() || { url: '', key: '', workspaceId: Math.random().toString(36).substr(2, 12) }
  );

  const [newSong, setNewSong] = useState<Partial<Song>>({
    title: '',
    artist: '',
    originalKey: 'C',
    content: '',
    instrumentParts: {}
  });

  const [newSchedule, setNewSchedule] = useState({ name: '', date: '', songIds: [] as string[] });

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const defaultState: AppState = {
        songs: SAMPLE_SONGS,
        schedules: [],
        members: ["John Doe", "Jane Smith"],
        theme: 'light',
        currentView: 'dashboard'
      };
      const loaded = await dataService.loadInitialState(defaultState);
      setState(loaded);
      setIsLoading(false);
    };
    init();
  }, []);

  // Sync state to cloud/local whenever it changes
  useEffect(() => {
    if (state) {
      dataService.saveState(state);
      
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('bg-gray-900', 'text-white');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.add('bg-gray-50', 'text-gray-900');
      }
    }
  }, [state]);

  useEffect(() => {
    const loadVerse = async () => {
      const data = await fetchDailyVerse();
      setVerse(data);
    };
    loadVerse();
  }, []);

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing your workspace...</p>
        </div>
      </div>
    );
  }

  const navigate = (view: ViewType, payload?: { songId?: string; scheduleId?: string }) => {
    setState(prev => prev ? ({ 
      ...prev, 
      currentView: view, 
      selectedSongId: payload?.songId, 
      selectedScheduleId: payload?.scheduleId 
    }) : null);
    if (view === 'view-song') {
      const song = state.songs.find(s => s.id === payload?.songId);
      if (song) {
        setTargetKey(song.originalKey);
        setUseNashville(false);
        setActivePart("Lyrics");
      }
    }
    setIsEditing(false);
  };

  const currentSong = state.songs.find(s => s.id === state.selectedSongId);
  const currentSchedule = state.schedules.find(s => s.id === state.selectedScheduleId);

  const filteredSongs = state.songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    if (state.members.includes(newMemberName.trim())) return;
    setState(prev => prev ? ({ ...prev, members: [...prev.members, newMemberName.trim()] }) : null);
    setNewMemberName('');
  };

  const handleUpdateAssignment = (role: string, member: string) => {
    if (!state.selectedScheduleId) return;
    setState(prev => prev ? ({
      ...prev,
      schedules: prev.schedules.map(s => 
        s.id === state.selectedScheduleId 
          ? { ...s, assignments: { ...s.assignments, [role]: member } } 
          : s
      )
    }) : null);
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title || !newSong.content) return;

    const song: Song = {
      id: isEditing ? (state.selectedSongId || '') : Math.random().toString(36).substr(2, 9),
      title: newSong.title!,
      artist: newSong.artist || 'Unknown Artist',
      originalKey: (newSong.originalKey as Key) || 'C',
      content: newSong.content!,
      instrumentParts: newSong.instrumentParts || {},
      createdAt: Date.now()
    };

    setState(prev => {
      if (!prev) return null;
      const updatedSongs = isEditing 
        ? prev.songs.map(s => s.id === song.id ? song : s)
        : [...prev.songs, song];
      return { ...prev, songs: updatedSongs, currentView: 'songs' };
    });
    
    setNewSong({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} });
    setIsEditing(false);
  };

  const updateInstrumentPart = (instrument: string, content: string) => {
    if (!currentSong) return;
    setState(prev => prev ? ({
      ...prev,
      songs: prev.songs.map(s => 
        s.id === currentSong.id 
          ? { ...s, instrumentParts: { ...s.instrumentParts, [instrument]: content } } 
          : s
      )
    }) : null);
  };

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveConfig(syncConfig);
    window.location.reload(); // Refresh to trigger re-init with new client
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(syncConfig.workspaceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Views... (Existing view renderers logic kept as-is, just adjusting for state being nullable)

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      <div 
        className="relative overflow-hidden rounded-2xl h-64 flex items-center justify-center text-center p-8 bg-cover bg-center shadow-xl group"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://picsum.photos/seed/nature/1200/400?nature')` }}
      >
        <div className="max-w-2xl">
          {verse ? (
            <>
              <p className="text-xl md:text-2xl font-medium text-white italic mb-4">"{verse.verse}"</p>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm">— {verse.reference}</p>
            </>
          ) : (
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-6 w-64 bg-white/20 rounded mb-4"></div>
              <div className="h-4 w-32 bg-white/20 rounded"></div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Schedules</h2>
            <button onClick={() => navigate('schedules')} className="text-blue-600 hover:text-blue-700 font-medium text-sm">View All</button>
          </div>
          <div className="space-y-4">
            {state.schedules.slice(-3).reverse().map(sch => (
              <button key={sch.id} onClick={() => navigate('view-schedule', { scheduleId: sch.id })} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-600 transition-all text-left">
                <div><h3 className="font-bold">{sch.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(sch.date).toLocaleDateString()}</p></div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
            {state.schedules.length === 0 && <p className="text-center py-8 text-gray-400 italic">No schedules found.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Users className="w-5 h-5" /> Team Roster</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="text" placeholder="New member..." className="flex-1 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMember()} />
              <button onClick={handleAddMember} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700"><UserPlus className="w-5 h-5" /></button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {state.members.map(member => (
                <div key={member} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                  <span className="font-medium text-sm">{member}</span>
                  <button onClick={() => setState(prev => prev ? ({ ...prev, members: prev.members.filter(m => m !== member) }) : null)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSongs = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Song Library</h1><p className="text-gray-500 dark:text-gray-400">Manage all your song chords and keys</p></div>
        <button onClick={() => { setIsEditing(false); setNewSong({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} }); const form = document.getElementById('song-form'); form?.scrollIntoView({ behavior: 'smooth' }); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-blue-200 dark:shadow-none"><Plus className="w-5 h-5" /><span>Add New Song</span></button>
      </div>
      <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search by title or artist..." className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map(song => (
          <div key={song.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div onClick={() => navigate('view-song', { songId: song.id })} className="cursor-pointer flex-1"><h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{song.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{song.artist}</p><span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold uppercase tracking-wider">Key: {song.originalKey}</span></div>
              <div className="flex space-x-1">
                <button onClick={() => { setNewSong(song); setIsEditing(true); const form = document.getElementById('song-form'); form?.scrollIntoView({ behavior: 'smooth' }); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setState(prev => prev ? ({ ...prev, songs: prev.songs.filter(s => s.id !== song.id) }) : null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Song Form Component... */}
      <div id="song-form" className="mt-12 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Song' : 'Add New Song'}</h2>
        <form onSubmit={handleAddSong} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-tighter">Title</label><input required type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} /></div>
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-tighter">Artist</label><input type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} /></div>
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-tighter">Original Key</label><select className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newSong.originalKey} onChange={e => setNewSong({...newSong, originalKey: e.target.value as Key})}>{ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-tighter">Song Content (Chords & Lyrics)</label>
              <textarea required rows={10} placeholder="Chords & Lyrics here..." className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" value={newSong.content} onChange={e => setNewSong({...newSong, content: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            {isEditing && <button type="button" onClick={() => { setIsEditing(false); setNewSong({ title: '', artist: '', originalKey: 'C', content: '', instrumentParts: {} }); }} className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-700">Cancel</button>}
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg">{isEditing ? 'Update Song' : 'Create Song'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSchedules = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-bold">Schedules</h1><p className="text-gray-500 dark:text-gray-400">Plan your sets</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
          <h2 className="text-xl font-bold mb-6">Create New Schedule</h2>
          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div><label className="block text-sm font-bold mb-1 uppercase tracking-tighter">Event Name</label><input required type="text" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newSchedule.name} onChange={e => setNewSchedule({...newSchedule, name: e.target.value})} /></div>
            <div><label className="block text-sm font-bold mb-1 uppercase tracking-tighter">Date</label><input required type="date" className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newSchedule.date} onChange={e => setNewSchedule({...newSchedule, date: e.target.value})} /></div>
            <div>
              <label className="block text-sm font-bold mb-1 uppercase tracking-tighter">Songs</label>
              <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl p-2 space-y-1">
                {state.songs.map(song => (
                  <label key={song.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" checked={newSchedule.songIds.includes(song.id)} onChange={(e) => {
                      const ids = e.target.checked ? [...newSchedule.songIds, song.id] : newSchedule.songIds.filter(id => id !== song.id);
                      setNewSchedule({...newSchedule, songIds: ids});
                    }} />
                    <span className="text-sm font-medium">{song.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg">Add Schedule</button>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.schedules.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(sch => (
              <div key={sch.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-lg font-bold">{sch.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{new Date(sch.date).toLocaleDateString()}</p></div>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <button onClick={() => navigate('view-schedule', { scheduleId: sch.id })} className="text-sm font-bold text-blue-600 hover:underline">Manage Set</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.name || !newSchedule.date) return;
    const schedule: Schedule = { id: Math.random().toString(36).substr(2, 9), ...newSchedule, assignments: {} };
    setState(prev => prev ? ({ ...prev, schedules: [...prev.schedules, schedule], currentView: 'schedules' }) : null);
    setNewSchedule({ name: '', date: '', songIds: [] });
  };

  const renderViewSong = () => {
    if (!currentSong) return null;
    const displayKey = useNashville ? '#' : (targetKey || currentSong.originalKey);
    const transposed = getTransposedContent(currentSong.content, currentSong.originalKey, targetKey || currentSong.originalKey, useNashville);
    const scheduleSongs = currentSchedule?.songIds || [];
    const currentIndex = scheduleSongs.indexOf(currentSong.id);
    const hasNext = currentIndex < scheduleSongs.length - 1;
    const hasPrev = currentIndex > 0;
    const currentInstructions = activePart === "Lyrics" ? transposed : (currentSong.instrumentParts?.[activePart] || "");

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] animate-in zoom-in-95 duration-300">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate(currentSchedule ? 'view-schedule' : 'songs', { scheduleId: currentSchedule?.id })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><ChevronLeft className="w-6 h-6" /></button>
            <div><h1 className="text-2xl font-extrabold">{currentSong.title}</h1><p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-widest">{currentSong.artist}</p></div>
          </div>
          <div className="flex items-center space-x-3">
             <div className="relative group">
                <button className="bg-white dark:bg-gray-800 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-5 py-2.5 rounded-2xl font-black flex items-center space-x-3 shadow-lg shadow-blue-50 dark:shadow-none hover:scale-105 transition-all"><span className="text-lg">Key: {displayKey}</span><ChevronDown className="w-5 h-5" /></button>
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all p-3 grid grid-cols-4 gap-2">
                  {ALL_KEYS.map(k => (<button key={k} onClick={() => { setTargetKey(k); setUseNashville(false); }} className={`p-3 rounded-xl text-sm font-black transition-all ${targetKey === k && !useNashville ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{k}</button>))}
                  <button onClick={() => setUseNashville(!useNashville)} className={`col-span-4 mt-2 p-3 rounded-xl text-lg font-black transition-all flex items-center justify-center space-x-2 ${useNashville ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'}`}><Hash className="w-5 h-5" /> <span># System</span></button>
                </div>
             </div>
             <button onClick={() => { setIsEditing(true); setNewSong(currentSong); navigate('songs'); }} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 p-2.5 rounded-xl transition-colors"><Edit className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="flex gap-4 mb-4 overflow-x-auto pb-2 shrink-0">
           {INSTRUMENTS.map(inst => (<button key={inst.name} onClick={() => setActivePart(inst.name)} className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${activePart === inst.name ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'}`}>{inst.icon}<span>{inst.name}</span></button>))}
        </div>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-700 relative">
           {activePart === "Lyrics" ? (<pre className="font-mono text-lg leading-loose whitespace-pre-wrap select-text">{transposed.split('\n').map((line, i) => (<div key={i} className={isChordLine(line) ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-gray-100'}>{line || ' '}</div>))}</pre>) : (<div className="h-full flex flex-col"><div className="flex justify-between items-center mb-4"><h3 className="font-black uppercase tracking-widest text-indigo-500 text-sm">{activePart} Instructions</h3><p className="text-xs text-gray-400 font-medium italic">Changes auto-save for this instrument</p></div><textarea className="flex-1 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-6 font-mono text-lg leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder={`Instructions for ${activePart}...`} value={currentInstructions} onChange={e => updateInstrumentPart(activePart, e.target.value)} /></div>)}
        </div>
        {currentSchedule && (<footer className="mt-6 p-4 bg-gray-900 text-white rounded-2xl flex items-center justify-between shrink-0 shadow-lg"><button disabled={!hasPrev} onClick={() => navigate('view-song', { songId: scheduleSongs[currentIndex - 1], scheduleId: currentSchedule.id })} className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${!hasPrev ? 'opacity-30' : 'hover:bg-gray-800'}`}><ChevronLeft className="w-5 h-5" /><span className="font-bold">Previous Song</span></button><div className="hidden md:block"><span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Setlist: {currentSchedule.name} ({currentIndex + 1}/{scheduleSongs.length})</span></div><button disabled={!hasNext} onClick={() => navigate('view-song', { songId: scheduleSongs[currentIndex + 1], scheduleId: currentSchedule.id })} className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${!hasNext ? 'opacity-30' : 'hover:bg-gray-800'}`}><span className="font-bold">Next Song</span><ChevronRight className="w-5 h-5" /></button></footer>)}
      </div>
    );
  };

  const renderViewSchedule = () => {
    if (!currentSchedule) return null;
    const schSongs = currentSchedule.songIds.map(id => state.songs.find(s => s.id === id)).filter(Boolean) as Song[];
    return (
      <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
        <header className="flex items-center space-x-4"><button onClick={() => navigate('schedules')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"><ChevronLeft className="w-6 h-6" /></button><div><h1 className="text-3xl font-extrabold">{currentSchedule.name}</h1><p className="text-gray-500 dark:text-gray-400 font-medium">{new Date(currentSchedule.date).toLocaleDateString()}</p></div></header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8"><div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"><h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Music className="w-5 h-5 text-blue-500" /> Setlist</h2><div className="space-y-3">{schSongs.map((song, idx) => (<div key={song.id} onClick={() => navigate('view-song', { songId: song.id, scheduleId: currentSchedule.id })} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all group"><div className="flex items-center space-x-4"><span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold text-gray-500">{idx + 1}</span><div><h3 className="font-bold group-hover:text-blue-600 transition-colors">{song.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{song.artist}</p></div></div><div className="flex items-center space-x-3"><span className="text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Key: {song.originalKey}</span><ChevronRight className="w-5 h-5 text-gray-400" /></div></div>))}</div></div></div>
          <div className="lg:col-span-1 space-y-6"><div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"><h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Personnel</h2><div className="space-y-4">{ROLES.map(role => (<div key={role}><label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{role}</label><select className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={currentSchedule.assignments?.[role] || ""} onChange={e => handleUpdateAssignment(role, e.target.value)}><option value="">-- Assign Member --</option>{state.members.map(m => <option key={m} value={m}>{m}</option>)}</select></div>))}</div></div><button onClick={() => navigate('view-song', { songId: schSongs[0]?.id, scheduleId: currentSchedule.id })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 transition-transform hover:scale-[1.02]"><Tv className="w-6 h-6" /><span>Launch Practice Mode</span></button></div>
        </div>
      </div>
    );
  };

  const isCloudEnabled = syncConfig.url && syncConfig.key;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-6 z-50 flex flex-col hidden lg:flex">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-xl"><Music className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-black tracking-tighter">ChordMaster</span>
        </div>
        <nav className="space-y-2 flex-1">
          <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={state.currentView === 'dashboard'} onClick={() => navigate('dashboard')} />
          <SidebarItem icon={<Calendar className="w-5 h-5" />} label="Schedules" active={state.currentView === 'schedules' || state.currentView === 'view-schedule'} onClick={() => navigate('schedules')} />
          <SidebarItem icon={<Music className="w-5 h-5" />} label="Song List" active={state.currentView === 'songs' || state.currentView === 'view-song'} onClick={() => navigate('songs')} />
          <SidebarItem icon={<SettingsIcon className="w-5 h-5" />} label="Settings" active={state.currentView === 'settings'} onClick={() => navigate('settings')} />
        </nav>
        
        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sync Status</span>
            {isCloudEnabled ? (
              <span className="flex items-center text-green-500 text-[10px] font-bold uppercase gap-1"><Cloud className="w-3 h-3" /> Online</span>
            ) : (
              <span className="flex items-center text-gray-400 text-[10px] font-bold uppercase gap-1"><CloudOff className="w-3 h-3" /> Local</span>
            )}
          </div>
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Workspace</p>
              <p className="text-[10px] text-gray-400 font-medium truncate">{syncConfig.workspaceId}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-6 md:p-10 pb-20 lg:pb-10">
        {state.currentView === 'dashboard' && renderDashboard()}
        {state.currentView === 'songs' && renderSongs()}
        {state.currentView === 'schedules' && renderSchedules()}
        {state.currentView === 'settings' && (
          <div className="max-w-2xl animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            
            {/* Theme & Reset */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4"><div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">{state.theme === 'light' ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-blue-400" />}</div><div><p className="font-bold">Display Mode</p><p className="text-sm text-gray-500 dark:text-gray-400">Light or dark theme</p></div></div>
                <button onClick={() => setState(prev => prev ? ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }) : null)} className="w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full relative p-1"><div className={`w-6 h-6 bg-white dark:bg-blue-500 rounded-full shadow-sm transition-transform transform ${state.theme === 'dark' ? 'translate-x-6' : ''}`} /></button>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4"><div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"><Trash2 className="w-6 h-6 text-red-500" /></div><div><p className="font-bold">Clear All Data</p><p className="text-sm text-gray-500 dark:text-gray-400">Reset to factory settings</p></div></div>
                <button onClick={() => { if (confirm('Delete everything?')) { localStorage.clear(); window.location.reload(); } }} className="px-4 py-2 border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50">Reset</button>
              </div>
            </div>

            {/* Cloud Sync Setup */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-500" /> Cloud Synchronization</h2>
                  <p className="text-sm text-gray-500">Sync songs and sets across your phone and laptop using Supabase.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Current Workspace ID</span>
                    <button onClick={handleCopyId} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors text-blue-600">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="font-mono font-bold text-lg select-all text-blue-900 dark:text-blue-200">{syncConfig.workspaceId}</p>
                </div>

                <form onSubmit={handleSaveSyncConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Supabase URL</label>
                      <input 
                        type="text" 
                        placeholder="https://xyz.supabase.co" 
                        className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={syncConfig.url}
                        onChange={e => setSyncConfig({...syncConfig, url: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Anon Key</label>
                      <input 
                        type="password" 
                        placeholder="eyJhb..." 
                        className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={syncConfig.key}
                        onChange={e => setSyncConfig({...syncConfig, key: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Workspace ID (Enter to join existing)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={syncConfig.workspaceId}
                      onChange={e => setSyncConfig({...syncConfig, workspaceId: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-100 dark:shadow-none">
                    Save & Initialize Sync
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {state.currentView === 'view-song' && renderViewSong()}
        {state.currentView === 'view-schedule' && renderViewSchedule()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-around p-3 lg:hidden z-50 shadow-2xl">
        <button onClick={() => navigate('dashboard')} className={`p-2 rounded-xl ${state.currentView === 'dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}><LayoutDashboard className="w-6 h-6" /></button>
        <button onClick={() => navigate('schedules')} className={`p-2 rounded-xl ${state.currentView === 'schedules' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}><Calendar className="w-6 h-6" /></button>
        <button onClick={() => navigate('songs')} className={`p-2 rounded-xl ${state.currentView === 'songs' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}><Music className="w-6 h-6" /></button>
        <button onClick={() => navigate('settings')} className={`p-2 rounded-xl ${state.currentView === 'settings' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}><SettingsIcon className="w-6 h-6" /></button>
      </nav>
    </div>
  );
};

export default App;
