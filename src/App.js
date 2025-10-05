import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Calendar, BookOpen, Code, Database, Lightbulb, Languages, FolderOpen, Download, BarChart3, TrendingUp, Target, CheckCircle2, Flame, Award, Zap, Clock, Star, LogIn, LogOut, User, Edit2, Trophy, Play, FileText } from 'lucide-react';

export default function LearningTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    categories: {
      coding: { questions: [], notes: '' },
      reading: { articles: [], books: [], notes: '' },
      videos: { items: [], notes: '' },
      projects: { items: [], notes: '' },
      workflows: { items: [], notes: '' },
      other: { items: [], notes: '' }
    },
    englishWords: [],
    dailyReflection: ''
  });
  const [newWord, setNewWord] = useState({ word: '', meaning: '' });
  const [view, setView] = useState('entry');
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userInterests, setUserInterests] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [completedChallenge, setCompletedChallenge] = useState(false);
  const [activeCategory, setActiveCategory] = useState('coding');
  const [tempInterests, setTempInterests] = useState([]);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'coding'
  });
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [allChallenges, setAllChallenges] = useState([]);
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [challengeSubmission, setChallengeSubmission] = useState({ text: '', file: null });
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  // Admin email that can create challenges
  const ADMIN_EMAIL = 'yazanbrc@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      loadEntries();
      loadUserProfile();
      loadDailyChallenge();
    }
  }, [user]);

  // Load entry for selected date
  useEffect(() => {
    if (user && currentEntry.date) {
      loadEntryForDate(currentEntry.date);
    }
  }, [currentEntry.date, user]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading entries:', error);
    } else {
      setEntries(data || []);
    }
  };

  const loadEntryForDate = async (date) => {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (data && data.content) {
      setCurrentEntry({
        date: data.date,
        categories: data.content.categories || currentEntry.categories,
        englishWords: data.content.englishWords || [],
        dailyReflection: data.content.dailyReflection || ''
      });
    } else {
      setCurrentEntry({
        date: date,
        categories: {
          coding: { questions: [], notes: '' },
          reading: { articles: [], books: [], notes: '' },
          videos: { items: [], notes: '' },
          projects: { items: [], notes: '' },
          workflows: { items: [], notes: '' },
          other: { items: [], notes: '' }
        },
        englishWords: [],
        dailyReflection: ''
      });
    }
  };

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('interests')
      .eq('id', user.id)
      .single();
    
    if (data && data.interests && data.interests.length > 0) {
      setUserInterests(data.interests);
    } else {
      setShowOnboarding(true);
    }
  };

  const loadDailyChallenge = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false });
    
    setAllChallenges(data || []);
    setDailyChallenge(data?.[0] || null);

    if (data?.[0]) {
      const { data: completionData } = await supabase
        .from('challenge_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', data[0].id)
        .single();
      
      setCompletedChallenge(!!completionData);
    }

    if (isAdmin) {
      loadSubmissions();
    }
  };

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from('challenge_submissions')
      .select('*, profiles(email)')
      .order('submitted_at', { ascending: false });
    
    setSubmissions(data || []);
  };

  const saveInterests = async (interests) => {
    const { error } = await supabase
      .from('profiles')
      .update({ interests: interests })
      .eq('id', user.id);
    
    if (!error) {
      setUserInterests(interests);
      setShowOnboarding(false);
    }
  };

  const markChallengeComplete = async () => {
    if (!dailyChallenge) return;

    const { error } = await supabase
      .from('challenge_completions')
      .insert({
        user_id: user.id,
        challenge_id: dailyChallenge.id,
        completed_at: new Date().toISOString()
      });

    if (!error) {
      setCompletedChallenge(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const createChallenge = async () => {
    if (!isAdmin) {
      alert('⛔ Only admin can create challenges');
      return;
    }

    if (!newChallenge.title || !newChallenge.description) {
      alert('❌ Please fill all fields');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('daily_challenges')
      .insert({
        date: today,
        title: newChallenge.title,
        description: newChallenge.description,
        category: newChallenge.category,
        created_by: user.id
      });

    if (error) {
      alert('❌ Error creating challenge: ' + error.message);
    } else {
      alert('✅ Challenge created successfully!');
      setNewChallenge({ title: '', description: '', category: 'coding' });
      setShowCreateChallenge(false);
      loadDailyChallenge();
    }
  };

  const updateChallenge = async () => {
    if (!isAdmin || !editingChallenge) return;

    const { error } = await supabase
      .from('daily_challenges')
      .update({
        title: editingChallenge.title,
        description: editingChallenge.description,
        category: editingChallenge.category
      })
      .eq('id', editingChallenge.id);

    if (error) {
      alert('❌ Error updating challenge: ' + error.message);
    } else {
      alert('✅ Challenge updated!');
      setEditingChallenge(null);
      loadDailyChallenge();
    }
  };

  const deleteChallenge = async (challengeId) => {
    if (!isAdmin) return;
    if (!window.confirm('⚠️ Are you sure you want to delete this challenge? This will also delete all completions and submissions.')) return;

    try {
      // First, delete all completions for this challenge
      const { error: completionsError } = await supabase
        .from('challenge_completions')
        .delete()
        .eq('challenge_id', challengeId);

      if (completionsError) {
        console.error('Error deleting completions:', completionsError);
      }

      // Then delete all submissions for this challenge
      const { error: submissionsError } = await supabase
        .from('challenge_submissions')
        .delete()
        .eq('challenge_id', challengeId);

      if (submissionsError) {
        console.error('Error deleting submissions:', submissionsError);
      }

      // Finally, delete the challenge itself
      const { error } = await supabase
        .from('daily_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        alert('❌ Error deleting challenge: ' + error.message);
      } else {
        // Remove from local state immediately
        const updatedChallenges = allChallenges.filter(c => c.id !== challengeId);
        setAllChallenges(updatedChallenges);
        setDailyChallenge(updatedChallenges[0] || null);
        setCompletedChallenge(false);
        
        alert('✅ Challenge and all related data deleted!');
        
        // Reload to ensure sync with database
        setTimeout(() => loadDailyChallenge(), 500);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const submitChallengeWork = async () => {
    if (!dailyChallenge || !challengeSubmission.text) {
      alert('❌ Please write something about your work');
      return;
    }

    const { error } = await supabase
      .from('challenge_submissions')
      .insert({
        user_id: user.id,
        challenge_id: dailyChallenge.id,
        submission_text: challengeSubmission.text,
        submitted_at: new Date().toISOString()
      });

    if (error) {
      alert('❌ Error submitting: ' + error.message);
    } else {
      alert('✅ Submitted successfully!');
      setChallengeSubmission({ text: '', file: null });
      setShowSubmissionForm(false);
      markChallengeComplete();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('✅ Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEntries([]);
  };

  const saveEntry = async () => {
    if (!user) return;

    const entryData = {
      user_id: user.id,
      date: currentEntry.date,
      content: {
        categories: currentEntry.categories,
        englishWords: currentEntry.englishWords,
        dailyReflection: currentEntry.dailyReflection
      },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('entries')
      .upsert(entryData, { onConflict: 'user_id,date' });

    if (error) {
      console.error('Error saving entry:', error);
      alert('❌ Error: ' + error.message);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      loadEntries();
    }
  };

  const addWord = () => {
    if (newWord.word && newWord.meaning) {
      setCurrentEntry({
        ...currentEntry,
        englishWords: [...currentEntry.englishWords, newWord]
      });
      setNewWord({ word: '', meaning: '' });
    }
  };

  const removeWord = (index) => {
    const updated = currentEntry.englishWords.filter((_, i) => i !== index);
    setCurrentEntry({ ...currentEntry, englishWords: updated });
  };

  const addCodingQuestion = () => {
    const newQ = { question: '', code: '', explanation: '' };
    const updated = { ...currentEntry };
    updated.categories.coding.questions.push(newQ);
    setCurrentEntry(updated);
  };

  const updateCodingQuestion = (index, field, value) => {
    const updated = { ...currentEntry };
    updated.categories.coding.questions[index][field] = value;
    setCurrentEntry(updated);
  };

  const removeCodingQuestion = (index) => {
    const updated = { ...currentEntry };
    updated.categories.coding.questions.splice(index, 1);
    setCurrentEntry(updated);
  };

  const addItem = (category, field) => {
    const newItem = { title: '', url: '', notes: '' };
    const updated = { ...currentEntry };
    if (!updated.categories[category][field]) {
      updated.categories[category][field] = [];
    }
    updated.categories[category][field].push(newItem);
    setCurrentEntry(updated);
  };

  const updateItem = (category, field, index, key, value) => {
    const updated = { ...currentEntry };
    updated.categories[category][field][index][key] = value;
    setCurrentEntry(updated);
  };

  const removeItem = (category, field, index) => {
    const updated = { ...currentEntry };
    updated.categories[category][field].splice(index, 1);
    setCurrentEntry(updated);
  };

  const editEntry = (date) => {
    setCurrentEntry({ ...currentEntry, date: date });
    setView('entry');
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learning-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getStats = () => {
    const total = entries.length;
    const totalWords = entries.reduce((sum, e) => sum + (e.content?.englishWords?.length || 0), 0);
    
    const sortedDates = entries.map(e => new Date(e.date)).sort((a, b) => b - a);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      expected.setHours(0, 0, 0, 0);
      
      const entryDate = new Date(sortedDates[i]);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return { total, totalWords, streak };
  };

  // Login Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl inline-block mb-4">
              <Target className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Daily Learning Tracker</h1>
            <p className="text-gray-400">Track your journey, build your future</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding Screen
  if (showOnboarding) {
    const allInterests = [
      { id: 'python', label: '🐍 Python' },
      { id: 'sql', label: '🗄️ SQL' },
      { id: 'javascript', label: '⚡ JavaScript' },
      { id: 'data-analysis', label: '📊 Data Analysis' },
      { id: 'machine-learning', label: '🤖 ML & AI' },
      { id: 'english', label: '🔤 English' },
      { id: 'articles', label: '📖 Articles' },
      { id: 'books', label: '📚 Books' },
      { id: 'projects', label: '🎯 Projects' },
      { id: 'workflows', label: '⚙️ Workflows' },
      { id: 'n8n', label: '🔗 n8n' },
      { id: 'erp', label: '💼 ERP Systems' },
      { id: 'bi', label: '📈 BI Tools' },
      { id: 'videos', label: '🎥 Videos' },
    ];

    const toggleInterest = (id) => {
      if (tempInterests.includes(id)) {
        setTempInterests(tempInterests.filter(i => i !== id));
      } else {
        setTempInterests([...tempInterests, id]);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-3xl w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl inline-block mb-4">
              <Target className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Welcome! 👋</h1>
            <p className="text-gray-300 text-lg">What are you interested in learning?</p>
            <p className="text-gray-400 text-sm mt-2">Select all that apply</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {allInterests.map(interest => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  tempInterests.includes(interest.id)
                    ? 'bg-indigo-600 text-white scale-105 shadow-lg'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {interest.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => saveInterests(tempInterests)}
            disabled={tempInterests.length === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-4 rounded-xl font-bold text-white text-lg disabled:opacity-50"
          >
            {tempInterests.length === 0 ? 'Select at least one' : `Continue (${tempInterests.length})`}
          </button>

          <button
            onClick={() => setShowOnboarding(false)}
            className="w-full mt-3 text-gray-400 hover:text-gray-300 text-sm"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  const stats = getStats();

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-semibold">Saved! ☁️</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Learning Tracker</h1>
                <p className="text-indigo-200 text-sm">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {stats.streak > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-red-600 px-4 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Flame className="w-6 h-6 text-white" />
                    <div className="text-white">
                      <div className="text-2xl font-black">{stats.streak}</div>
                      <div className="text-xs">STREAK</div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 px-4 py-2 rounded-xl flex items-center gap-2 text-white font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Daily Challenge Banner */}
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowCreateChallenge(!showCreateChallenge)}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              {showCreateChallenge ? 'Cancel' : '🎯 Create Today\'s Challenge (Admin)'}
            </button>

            {showCreateChallenge && (
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6 mt-4">
                <h3 className="text-xl font-bold text-white mb-4">Create New Challenge</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                    <select
                      value={newChallenge.category}
                      onChange={(e) => setNewChallenge({ ...newChallenge, category: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      style={{ color: 'white' }}
                    >
                      <option value="coding" style={{ backgroundColor: '#1e293b', color: 'white' }}>💻 Coding</option>
                      <option value="reading" style={{ backgroundColor: '#1e293b', color: 'white' }}>📖 Reading</option>
                      <option value="videos" style={{ backgroundColor: '#1e293b', color: 'white' }}>🎥 Videos</option>
                      <option value="projects" style={{ backgroundColor: '#1e293b', color: 'white' }}>🎯 Projects</option>
                      <option value="english" style={{ backgroundColor: '#1e293b', color: 'white' }}>🔤 English</option>
                      <option value="general" style={{ backgroundColor: '#1e293b', color: 'white' }}>✨ General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Challenge Title</label>
                    <input
                      type="text"
                      value={newChallenge.title}
                      onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                      placeholder="e.g., Learn 5 new SQL commands"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                    <textarea
                      value={newChallenge.description}
                      onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                      placeholder="Describe the challenge..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-24 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <button
                    onClick={createChallenge}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 py-3 rounded-xl font-bold text-white"
                  >
                    ✅ Create Challenge
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Challenges for Today */}
        {allChallenges.length > 0 && (
          <div className="mb-6">
            {isAdmin && allChallenges.length > 1 && (
              <button
                onClick={() => setShowAllChallenges(!showAllChallenges)}
                className="mb-3 text-yellow-400 hover:text-yellow-300 text-sm font-semibold"
              >
                {showAllChallenges ? '▼' : '►'} {allChallenges.length} challenges for today
              </button>
            )}

            {(showAllChallenges || allChallenges.length === 1) && allChallenges.map((challenge, idx) => (
              <div key={challenge.id} className={`bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6 ${idx > 0 ? 'mt-4' : ''}`}>
                {editingChallenge?.id === challenge.id ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">✏️ Editing Challenge</h3>
                    <select
                      value={editingChallenge.category}
                      onChange={(e) => setEditingChallenge({ ...editingChallenge, category: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      style={{ color: 'white' }}
                    >
                      <option value="coding" style={{ backgroundColor: '#1e293b', color: 'white' }}>💻 Coding</option>
                      <option value="reading" style={{ backgroundColor: '#1e293b', color: 'white' }}>📖 Reading</option>
                      <option value="videos" style={{ backgroundColor: '#1e293b', color: 'white' }}>🎥 Videos</option>
                      <option value="projects" style={{ backgroundColor: '#1e293b', color: 'white' }}>🎯 Projects</option>
                      <option value="english" style={{ backgroundColor: '#1e293b', color: 'white' }}>🔤 English</option>
                      <option value="general" style={{ backgroundColor: '#1e293b', color: 'white' }}>✨ General</option>
                    </select>
                    <input
                      type="text"
                      value={editingChallenge.title}
                      onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <textarea
                      value={editingChallenge.description}
                      onChange={(e) => setEditingChallenge({ ...editingChallenge, description: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-24 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={updateChallenge} className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold text-white">💾 Save</button>
                      <button onClick={() => setEditingChallenge(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-6 h-6 text-yellow-400" />
                          <h3 className="text-xl font-bold text-white">Today's Challenge {allChallenges.length > 1 && `#${idx + 1}`}</h3>
                          <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded-full text-yellow-200">{challenge.category}</span>
                        </div>
                        <p className="text-lg text-gray-200 mb-2">{challenge.title}</p>
                        <p className="text-sm text-gray-300">{challenge.description}</p>
                      </div>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditingChallenge(challenge)}
                              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-bold text-white text-sm"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteChallenge(challenge.id)}
                              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold text-white text-sm"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {!isAdmin && idx === 0 && (
                          <button
                            onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                            className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-xl font-bold text-white whitespace-nowrap"
                          >
                            📝 Submit Work
                          </button>
                        )}
                      </div>
                    </div>

                    {showSubmissionForm && idx === 0 && !isAdmin && (
                      <div className="mt-4 bg-white/10 rounded-xl p-4">
                        <h4 className="text-white font-bold mb-3">Submit Your Work</h4>
                        <textarea
                          value={challengeSubmission.text}
                          onChange={(e) => setChallengeSubmission({ ...challengeSubmission, text: e.target.value })}
                          placeholder="Describe what you did, share links, code, or notes..."
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-32 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={submitChallengeWork}
                            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl font-bold text-white"
                          >
                            ✅ Submit
                          </button>
                          <button
                            onClick={() => setShowSubmissionForm(false)}
                            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-xl font-bold text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {dailyChallenge && !completedChallenge && (
          <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Today's Challenge</h3>
                  <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded-full text-yellow-200">{dailyChallenge.category}</span>
                </div>
                <p className="text-lg text-gray-200 mb-2">{dailyChallenge.title}</p>
                <p className="text-sm text-gray-300">{dailyChallenge.description}</p>
              </div>
              <button
                onClick={markChallengeComplete}
                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-xl font-bold text-white whitespace-nowrap"
              >
                Mark Complete
              </button>
            </div>
          </div>
        )}

        {completedChallenge && dailyChallenge && (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 text-green-200">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-semibold">Challenge completed! 🎉</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'entry', icon: BookOpen, label: 'Today' },
            { id: 'history', icon: Calendar, label: 'History' },
            { id: 'stats', icon: BarChart3, label: 'Stats' },
            ...(isAdmin ? [{ id: 'submissions', icon: FileText, label: '📬 Submissions' }] : [])
          ].map(nav => (
            <button
              key={nav.id}
              onClick={() => setView(nav.id)}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                view === nav.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <nav.icon className="w-5 h-5" />
              {nav.label}
            </button>
          ))}
        </div>

        {/* Entry View */}
        {view === 'entry' && (
          <div className="space-y-6">
            {/* Date Selector */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <label className="block text-sm font-bold text-indigo-300 mb-2">Date</label>
              <input
                type="date"
                value={currentEntry.date}
                onChange={(e) => setCurrentEntry({ ...currentEntry, date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'coding', label: '💻 Coding', icon: Code },
                { id: 'reading', label: '📖 Reading', icon: BookOpen },
                { id: 'videos', label: '🎥 Videos', icon: Play },
                { id: 'projects', label: '🎯 Projects', icon: Target },
                { id: 'workflows', label: '⚙️ Workflows', icon: Database },
                { id: 'other', label: '📝 Other', icon: FileText }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Coding Category */}
            {activeCategory === 'coding' && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  Coding Practice
                </h3>
                
                {currentEntry.categories.coding.questions.map((q, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-emerald-300 font-bold">Question #{i + 1}</span>
                      <button
                        onClick={() => removeCodingQuestion(i)}
                        className="text-red-400 hover:text-red-300 text-xl"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      placeholder="Question or problem..."
                      value={q.question}
                      onChange={(e) => updateCodingQuestion(i, 'question', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <textarea
                      placeholder="// Your code solution..."
                      value={q.code}
                      onChange={(e) => updateCodingQuestion(i, 'code', e.target.value)}
                      className="w-full bg-slate-950/50 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 font-mono text-sm mb-3 h-32 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <textarea
                      placeholder="Explanation or notes..."
                      value={q.explanation}
                      onChange={(e) => updateCodingQuestion(i, 'explanation', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}

                <button
                  onClick={addCodingQuestion}
                  className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border-2 border-dashed border-emerald-500/50 rounded-xl py-3 text-emerald-300 font-semibold"
                >
                  + Add Question
                </button>

                <textarea
                  placeholder="General notes about today's coding..."
                  value={currentEntry.categories.coding.notes}
                  onChange={(e) => {
                    const updated = { ...currentEntry };
                    updated.categories.coding.notes = e.target.value;
                    setCurrentEntry(updated);
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white mt-4 h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Reading Category */}
            {activeCategory === 'reading' && (
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Reading & Articles
                </h3>
                
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-blue-300 mb-3">📰 Articles</h4>
                  {currentEntry.categories.reading.articles?.map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-300 font-semibold text-sm">Article #{i + 1}</span>
                        <button onClick={() => removeItem('reading', 'articles', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                      </div>
                      <input
                        placeholder="Article title..."
                        value={item.title}
                        onChange={(e) => updateItem('reading', 'articles', i, 'title', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        placeholder="URL..."
                        value={item.url}
                        onChange={(e) => updateItem('reading', 'articles', i, 'url', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        placeholder="Key takeaways..."
                        value={item.notes}
                        onChange={(e) => updateItem('reading', 'articles', i, 'notes', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <button onClick={() => addItem('reading', 'articles')} className="w-full bg-blue-600/20 hover:bg-blue-600/30 border-2 border-dashed border-blue-500/50 rounded-xl py-2 text-blue-300 font-semibold">+ Add Article</button>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-blue-300 mb-3">📚 Books</h4>
                  {currentEntry.categories.reading.books?.map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-300 font-semibold text-sm">Book #{i + 1}</span>
                        <button onClick={() => removeItem('reading', 'books', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                      </div>
                      <input
                        placeholder="Book title & chapter..."
                        value={item.title}
                        onChange={(e) => updateItem('reading', 'books', i, 'title', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        placeholder="Notes & insights..."
                        value={item.notes}
                        onChange={(e) => updateItem('reading', 'books', i, 'notes', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <button onClick={() => addItem('reading', 'books')} className="w-full bg-blue-600/20 hover:bg-blue-600/30 border-2 border-dashed border-blue-500/50 rounded-xl py-2 text-blue-300 font-semibold">+ Add Book</button>
                </div>
              </div>
            )}

            {/* Videos Category */}
            {activeCategory === 'videos' && (
              <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <Play className="w-6 h-6" />
                  Video Courses & Tutorials
                </h3>
                
                {currentEntry.categories.videos.items?.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-red-300 font-semibold text-sm">Video #{i + 1}</span>
                      <button onClick={() => removeItem('videos', 'items', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                    </div>
                    <input
                      placeholder="Video/Course title..."
                      value={item.title}
                      onChange={(e) => updateItem('videos', 'items', i, 'title', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      placeholder="URL..."
                      value={item.url}
                      onChange={(e) => updateItem('videos', 'items', i, 'url', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <textarea
                      placeholder="What did you learn..."
                      value={item.notes}
                      onChange={(e) => updateItem('videos', 'items', i, 'notes', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))}
                <button onClick={() => addItem('videos', 'items')} className="w-full bg-red-600/20 hover:bg-red-600/30 border-2 border-dashed border-red-500/50 rounded-xl py-2 text-red-300 font-semibold">+ Add Video</button>
              </div>
            )}

            {/* Projects Category */}
            {activeCategory === 'projects' && (
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Projects & Practice
                </h3>
                
                {currentEntry.categories.projects.items?.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-purple-300 font-semibold text-sm">Project #{i + 1}</span>
                      <button onClick={() => removeItem('projects', 'items', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                    </div>
                    <input
                      placeholder="Project name..."
                      value={item.title}
                      onChange={(e) => updateItem('projects', 'items', i, 'title', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <textarea
                      placeholder="Today's progress..."
                      value={item.notes}
                      onChange={(e) => updateItem('projects', 'items', i, 'notes', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
                <button onClick={() => addItem('projects', 'items')} className="w-full bg-purple-600/20 hover:bg-purple-600/30 border-2 border-dashed border-purple-500/50 rounded-xl py-2 text-purple-300 font-semibold">+ Add Project</button>
              </div>
            )}

            {/* Workflows Category */}
            {activeCategory === 'workflows' && (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <Database className="w-6 h-6" />
                  Workflows & Automation
                </h3>
                
                {currentEntry.categories.workflows.items?.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-amber-300 font-semibold text-sm">Workflow #{i + 1}</span>
                      <button onClick={() => removeItem('workflows', 'items', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                    </div>
                    <input
                      placeholder="Workflow/automation name (n8n, ERP, etc)..."
                      value={item.title}
                      onChange={(e) => updateItem('workflows', 'items', i, 'title', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <textarea
                      placeholder="What you learned or built..."
                      value={item.notes}
                      onChange={(e) => updateItem('workflows', 'items', i, 'notes', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-24 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                ))}
                <button onClick={() => addItem('workflows', 'items')} className="w-full bg-amber-600/20 hover:bg-amber-600/30 border-2 border-dashed border-amber-500/50 rounded-xl py-2 text-amber-300 font-semibold">+ Add Workflow</button>
              </div>
            )}

            {/* Other Category */}
            {activeCategory === 'other' && (
              <div className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 backdrop-blur-xl border border-slate-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Other Learning
                </h3>
                
                {currentEntry.categories.other.items?.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-300 font-semibold text-sm">Item #{i + 1}</span>
                      <button onClick={() => removeItem('other', 'items', i)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                    </div>
                    <input
                      placeholder="Title..."
                      value={item.title}
                      onChange={(e) => updateItem('other', 'items', i, 'title', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                    <textarea
                      placeholder="Notes..."
                      value={item.notes}
                      onChange={(e) => updateItem('other', 'items', i, 'notes', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                ))}
                <button onClick={() => addItem('other', 'items')} className="w-full bg-slate-600/20 hover:bg-slate-600/30 border-2 border-dashed border-slate-500/50 rounded-xl py-2 text-slate-300 font-semibold">+ Add Item</button>
              </div>
            )}

            {/* English Words (Always visible) */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6">
              <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                <Languages className="w-6 h-6" />
                English Vocabulary
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Word"
                  value={newWord.word}
                  onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Meaning"
                  value={newWord.meaning}
                  onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={addWord} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold">Add</button>
              </div>
              <div className="space-y-2">
                {currentEntry.englishWords.map((word, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/10 p-3 rounded-xl group hover:bg-white/15">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-indigo-300">{word.word}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-200">{word.meaning}</span>
                    </div>
                    <button onClick={() => removeWord(i)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 text-xl">×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Reflection */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                <Lightbulb className="w-6 h-6" />
                Daily Reflection
              </h3>
              <textarea
                placeholder="What did you learn today? Any insights or thoughts..."
                value={currentEntry.dailyReflection}
                onChange={(e) => setCurrentEntry({ ...currentEntry, dailyReflection: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-32 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={saveEntry}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 py-5 rounded-2xl font-black text-xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-white"
            >
              <CheckCircle2 className="w-7 h-7" />
              Save Progress
              <Zap className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-black text-white">Learning History</h2>
              <button onClick={exportToJSON} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
            
            {entries.map((entry, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-indigo-300">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <button onClick={() => editEntry(entry.date)} className="bg-indigo-600/80 hover:bg-indigo-700 px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                {entry.content?.englishWords?.length > 0 && (
                  <div className="text-gray-300 text-sm">🔤 {entry.content.englishWords.length} words learned</div>
                )}
                {entry.content?.dailyReflection && (
                  <p className="text-gray-400 text-sm mt-2 italic">"{entry.content.dailyReflection.substring(0, 100)}..."</p>
                )}
              </div>
            ))}

            {entries.length === 0 && (
              <div className="text-center py-20">
                <Calendar className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">No entries yet. Start logging!</p>
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-white mb-6">Performance Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6">
                <Award className="w-8 h-8 text-white/80 mb-2" />
                <div className="text-5xl font-black text-white">{stats.total}</div>
                <div className="text-indigo-100 font-semibold">Days Logged</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-6">
                <Flame className="w-8 h-8 text-white/80 mb-2" />
                <div className="text-5xl font-black text-white">{stats.streak}</div>
                <div className="text-orange-100 font-semibold">Current Streak</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6">
                <Languages className="w-8 h-8 text-white/80 mb-2" />
                <div className="text-5xl font-black text-white">{stats.totalWords}</div>
                <div className="text-purple-100 font-semibold">Words Learned</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Your Interests</h3>
              <div className="flex flex-wrap gap-2">
                {userInterests.map(interest => (
                  <span key={interest} className="bg-indigo-600/40 px-4 py-2 rounded-full text-white font-semibold">{interest}</span>
                ))}
                {userInterests.length === 0 && <p className="text-gray-400">No interests selected yet</p>}
              </div>
              <button onClick={() => setShowOnboarding(true)} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-semibold">Update Interests</button>
            </div>
          </div>
        )}

        {/* Submissions View (Admin Only) */}
        {view === 'submissions' && isAdmin && (
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white mb-6">📬 Challenge Submissions</h2>
            
            {submissions.length === 0 && (
              <div className="text-center py-20">
                <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">No submissions yet</p>
              </div>
            )}

            {submissions.map((sub, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-300">{sub.profiles?.email || 'Unknown user'}</h3>
                    <p className="text-sm text-gray-400">{new Date(sub.submitted_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs bg-green-600/40 px-3 py-1 rounded-full text-green-200">Submitted</span>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-gray-200 whitespace-pre-wrap">{sub.submission_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}