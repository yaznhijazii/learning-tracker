import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yxeoxxocqbgzitwbcgoj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZW94eG9jcWJneml0d2JjZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzIzOTIsImV4cCI6MjA3NTE0ODM5Mn0.qU0IYrFhgRFpK4ycQe4L7wHy_AwiRogb0fYfLYeBY8k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


// ============================================
// src/App.js - COMPLETE VERSION
// ============================================
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Calendar, BookOpen, Code, Database, Lightbulb, Languages, FolderOpen, Download, BarChart3, TrendingUp, Target, CheckCircle2, Flame, Award, Zap, Clock, Star, LogIn, LogOut, User, Edit2 } from 'lucide-react';

export default function LearningTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    article: { title: '', url: '', notes: '' },
    pythonCode: '',
    sqlCode: '',
    wisdom: { text: '', source: '' },
    englishWords: [],
    miniProject: { name: '', progress: '', status: '' }
  });
  const [newWord, setNewWord] = useState({ word: '', meaning: '' });
  const [view, setView] = useState('entry');
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

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

  // Load entries when user logs in
  useEffect(() => {
    if (user) {
      loadEntries();
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
      const formatted = data.map(entry => ({
        date: entry.date,
        article: entry.article || { title: '', url: '', notes: '' },
        pythonCode: entry.python_code || '',
        sqlCode: entry.sql_code || '',
        wisdom: entry.wisdom || { text: '', source: '' },
        englishWords: entry.english_words || [],
        miniProject: entry.mini_project || { name: '', progress: '', status: '' }
      }));
      setEntries(formatted);
    }
  };

  const loadEntryForDate = async (date) => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (data) {
      setCurrentEntry({
        date: data.date,
        article: data.article || { title: '', url: '', notes: '' },
        pythonCode: data.python_code || '',
        sqlCode: data.sql_code || '',
        wisdom: data.wisdom || { text: '', source: '' },
        englishWords: data.english_words || [],
        miniProject: data.mini_project || { name: '', progress: '', status: '' }
      });
    } else {
      // No entry for this date, reset form
      setCurrentEntry({
        date: date,
        article: { title: '', url: '', notes: '' },
        pythonCode: '',
        sqlCode: '',
        wisdom: { text: '', source: '' },
        englishWords: [],
        miniProject: { name: '', progress: '', status: '' }
      });
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
      article: currentEntry.article,
      python_code: currentEntry.pythonCode,
      sql_code: currentEntry.sqlCode,
      wisdom: currentEntry.wisdom,
      english_words: currentEntry.englishWords,
      mini_project: currentEntry.miniProject,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('entries')
      .upsert(entryData, { onConflict: 'user_id,date' });

    if (error) {
      console.error('Error saving entry:', error);
      alert('❌ Error saving entry: ' + error.message);
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

  const exportWeeklyReport = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
    
    let report = `📊 WEEKLY LEARNING REPORT\n`;
    report += `📅 ${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}\n\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    weekEntries.forEach(entry => {
      report += `📆 ${entry.date}\n`;
      report += `\n📖 Article: ${entry.article.title || 'N/A'}\n`;
      if (entry.article.url) report += `   ${entry.article.url}\n`;
      report += `🐍 Python: ${entry.pythonCode ? '✅' : '⏭️'}\n`;
      report += `🗄️ SQL: ${entry.sqlCode ? '✅' : '⏭️'}\n`;
      report += `💡 Wisdom: ${entry.wisdom.text || 'N/A'}\n`;
      report += `🔤 Words: ${entry.englishWords.length}\n`;
      report += `🎯 Project: ${entry.miniProject.name || 'N/A'}\n\n`;
      report += `${'-'.repeat(50)}\n\n`;
    });
    
    report += `\n📊 STATISTICS:\n`;
    report += `✅ Days: ${weekEntries.length}/7\n`;
    report += `📚 Articles: ${weekEntries.filter(e => e.article.title).length}\n`;
    report += `🐍 Python: ${weekEntries.filter(e => e.pythonCode).length}\n`;
    report += `🗄️ SQL: ${weekEntries.filter(e => e.sqlCode).length}\n`;
    report += `🔤 Words: ${weekEntries.reduce((sum, e) => sum + e.englishWords.length, 0)}\n`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-report-${today.toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const getStats = () => {
    const total = entries.length;
    const articlesRead = entries.filter(e => e.article.title).length;
    const pythonDone = entries.filter(e => e.pythonCode).length;
    const sqlDone = entries.filter(e => e.sqlCode).length;
    const totalWords = entries.reduce((sum, e) => sum + e.englishWords.length, 0);
    
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
    
    return { total, articlesRead, pythonDone, sqlDone, totalWords, streak };
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

  const stats = getStats();

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-semibold">Saved to Cloud! ☁️</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl">
                <Target className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white">Daily Learning Tracker</h1>
                <p className="text-indigo-200 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {stats.streak > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-red-600 px-6 py-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Flame className="w-8 h-8 text-white" />
                    <div className="text-white">
                      <div className="text-3xl font-black">{stats.streak}</div>
                      <div className="text-xs font-semibold">STREAK</div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 px-4 py-2 rounded-xl flex items-center gap-2 text-white font-semibold transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setView('entry')}
            className={`group relative px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
              view === 'entry'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/50 scale-105'
                : 'bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Today's Log
          </button>
          
          <button
            onClick={() => setView('history')}
            className={`group relative px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
              view === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/50 scale-105'
                : 'bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-5 h-5" />
            History
          </button>
          
          <button
            onClick={() => setView('stats')}
            className={`group relative px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
              view === 'stats'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/50 scale-105'
                : 'bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
        </div>

        {/* Entry View */}
        {view === 'entry' && (
          <div className="space-y-6">
            {/* Date Selector */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Calendar className="w-4 h-4" />
                Date (Select any date to edit)
              </label>
              <input
                type="date"
                value={currentEntry.date}
                onChange={(e) => setCurrentEntry({ ...currentEntry, date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Article Section */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                Article of the Day
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Article title..."
                  value={currentEntry.article.title}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    article: { ...currentEntry.article, title: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={currentEntry.article.url}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    article: { ...currentEntry.article, url: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <textarea
                  placeholder="Key takeaways and notes..."
                  value={currentEntry.article.notes}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    article: { ...currentEntry.article, notes: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-28 resize-none"
                />
              </div>
            </div>

            {/* Python Code Section */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl">
                  <Code className="w-6 h-6" />
                </div>
                Python Code
              </h3>
              <textarea
                placeholder="# Write your Python code here..."
                value={currentEntry.pythonCode}
                onChange={(e) => setCurrentEntry({ ...currentEntry, pythonCode: e.target.value })}
                className="w-full bg-slate-950/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-40 resize-none font-mono text-sm"
              />
            </div>

            {/* SQL Code Section */}
            <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                SQL Queries
              </h3>
              <textarea
                placeholder="-- Write your SQL queries here..."
                value={currentEntry.sqlCode}
                onChange={(e) => setCurrentEntry({ ...currentEntry, sqlCode: e.target.value })}
                className="w-full bg-slate-950/50 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all h-40 resize-none font-mono text-sm"
              />
            </div>

            {/* Wisdom Section */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-2 rounded-xl">
                  <Lightbulb className="w-6 h-6" />
                </div>
                Daily Wisdom
              </h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Quote, lesson, or insight..."
                  value={currentEntry.wisdom.text}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    wisdom: { ...currentEntry.wisdom, text: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all h-24 resize-none"
                />
                <input
                  type="text"
                  placeholder="Source (book, person, etc.)"
                  value={currentEntry.wisdom.source}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    wisdom: { ...currentEntry.wisdom, source: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                />
              </div>
            </div>

            {/* English Words Section */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-xl">
                  <Languages className="w-6 h-6" />
                </div>
                English Vocabulary
              </h3>
              <div className="flex gap-3 mb-5">
                <input
                  type="text"
                  placeholder="Word"
                  value={newWord.word}
                  onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <input
                  type="text"
                  placeholder="Meaning"
                  value={newWord.meaning}
                  onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <button
                  onClick={addWord}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {currentEntry.englishWords.map((word, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 group hover:bg-white/15 transition-all">
                    <div className="flex items-center gap-4">
                      <Star className="w-5 h-5 text-purple-400" />
                      <div>
                        <span className="font-bold text-purple-300 text-lg">{word.word}</span>
                        <span className="text-gray-400 mx-3">→</span>
                        <span className="text-gray-200">{word.meaning}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeWord(i)}
                      className="text-red-400 hover:text-red-300 font-bold opacity-0 group-hover:opacity-100 transition-all text-xl px-3"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Project Section */}
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-black mb-5 flex items-center gap-3 text-white">
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-2 rounded-xl">
                  <FolderOpen className="w-6 h-6" />
                </div>
                Mini Project
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Project name"
                  value={currentEntry.miniProject.name}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    miniProject: { ...currentEntry.miniProject, name: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
                <textarea
                  placeholder="Today's progress..."
                  value={currentEntry.miniProject.progress}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    miniProject: { ...currentEntry.miniProject, progress: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all h-28 resize-none"
                />
                <select
                  value={currentEntry.miniProject.status}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    miniProject: { ...currentEntry.miniProject, status: e.target.value }
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                >
                  <option value="" className="bg-slate-900">Select status</option>
                  <option value="planning" className="bg-slate-900">📋 Planning</option>
                  <option value="started" className="bg-slate-900">🚀 Started</option>
                  <option value="in-progress" className="bg-slate-900">⚡ In Progress</option>
                  <option value="completed" className="bg-slate-900">✅ Completed</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveEntry}
              className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 py-5 rounded-2xl font-black text-xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-white group"
            >
              <CheckCircle2 className="w-7 h-7 group-hover:rotate-12 transition-transform" />
              Save Progress
              <Zap className="w-7 h-7 group-hover:scale-125 transition-transform" />
            </button>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <Clock className="w-8 h-8" />
                Learning History
              </h2>
              <button
                onClick={exportWeeklyReport}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-5 h-5" />
                Weekly Report
              </button>
            </div>
            
            {entries.map((entry, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-indigo-300">
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="flex gap-2 flex-wrap items-center">
                    {entry.article.title && <span className="text-xs bg-blue-600/80 px-3 py-1 rounded-full font-semibold">📖 Article</span>}
                    {entry.pythonCode && <span className="text-xs bg-emerald-600/80 px-3 py-1 rounded-full font-semibold">🐍 Python</span>}
                    {entry.sqlCode && <span className="text-xs bg-orange-600/80 px-3 py-1 rounded-full font-semibold">🗄️ SQL</span>}
                    {entry.englishWords.length > 0 && <span className="text-xs bg-purple-600/80 px-3 py-1 rounded-full font-semibold">🔤 +{entry.englishWords.length}</span>}
                    <button
                      onClick={() => editEntry(entry.date)}
                      className="text-xs bg-indigo-600/80 hover:bg-indigo-700 px-3 py-1 rounded-full font-semibold flex items-center gap-1 transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
                
                {entry.article.title && (
                  <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="font-semibold text-blue-200 mb-1">📖 {entry.article.title}</p>
                    {entry.article.url && (
                      <a href={entry.article.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline break-all">
                        {entry.article.url}
                      </a>
                    )}
                    {entry.article.notes && <p className="text-gray-300 text-sm mt-2">{entry.article.notes}</p>}
                  </div>
                )}
                
                {entry.miniProject.name && (
                  <div className="mb-3 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                    <p className="font-semibold text-rose-200 mb-1">🎯 {entry.miniProject.name}</p>
                    <p className="text-gray-300 text-sm">{entry.miniProject.progress}</p>
                    {entry.miniProject.status && (
                      <span className="inline-block mt-2 text-xs bg-rose-600/60 px-2 py-1 rounded font-semibold">{entry.miniProject.status}</span>
                    )}
                  </div>
                )}
                
                {entry.wisdom.text && (
                  <div className="mb-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-yellow-200 italic">💡 "{entry.wisdom.text}"</p>
                    {entry.wisdom.source && <p className="text-gray-400 text-sm mt-1">— {entry.wisdom.source}</p>}
                  </div>
                )}
                
                {entry.englishWords.length > 0 && (
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="font-semibold text-purple-200 mb-2">🔤 Vocabulary ({entry.englishWords.length} words)</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.englishWords.map((word, idx) => (
                        <span key={idx} className="text-xs bg-purple-600/40 px-3 py-1 rounded-full text-purple-100">
                          {word.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {entries.length === 0 && (
              <div className="text-center py-20">
                <Calendar className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-xl font-semibold">No entries yet. Start logging your learning journey!</p>
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-white">
              <TrendingUp className="w-8 h-8" />
              Performance Analytics
            </h2>
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <Award className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.total}</div>
                <div className="text-indigo-100 font-semibold">Days Logged</div>
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <Flame className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.streak}</div>
                <div className="text-orange-100 font-semibold">Current Streak</div>
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <BookOpen className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.articlesRead}</div>
                <div className="text-blue-100 font-semibold">Articles Read</div>
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <Code className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.pythonDone}</div>
                <div className="text-emerald-100 font-semibold">Python Exercises</div>
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <Database className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.sqlDone}</div>
                <div className="text-amber-100 font-semibold">SQL Exercises</div>
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <Languages className="w-8 h-8 text-white/80 mb-3" />
                <div className="text-5xl font-black mb-2 text-white">{stats.totalWords}</div>
                <div className="text-purple-100 font-semibold">Words Learned</div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6">60-Day Challenge Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 font-semibold">Overall Progress</span>
                    <span className="text-white font-bold">{Math.round((stats.total / 60) * 100)}%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.total / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 font-semibold">Python Completion</span>
                    <span className="text-white font-bold">{Math.round((stats.pythonDone / 60) * 100)}%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.pythonDone / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 font-semibold">SQL Completion</span>
                    <span className="text-white font-bold">{Math.round((stats.sqlDone / 60) * 100)}%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.sqlDone / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <Download className="w-6 h-6" />
                Export Your Data
              </h3>
              <p className="text-gray-300 mb-4">Download your learning data for backup or analysis</p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={exportToJSON}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export as JSON
                </button>
                <button
                  onClick={exportWeeklyReport}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                  Weekly Report
                </button>
              </div>
            </div>

            {/* Achievements */}
            {stats.total > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Achievements Unlocked
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.total >= 1 && (
                    <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🎯</div>
                      <div className="text-white font-bold text-sm">First Step</div>
                    </div>
                  )}
                  {stats.streak >= 3 && (
                    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🔥</div>
                      <div className="text-white font-bold text-sm">3-Day Streak</div>
                    </div>
                  )}
                  {stats.streak >= 7 && (
                    <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-white font-bold text-sm">Week Warrior</div>
                    </div>
                  )}
                  {stats.totalWords >= 50 && (
                    <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">📚</div>
                      <div className="text-white font-bold text-sm">Wordsmith</div>
                    </div>
                  )}
                  {stats.pythonDone >= 10 && (
                    <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🐍</div>
                      <div className="text-white font-bold text-sm">Python Pro</div>
                    </div>
                  )}
                  {stats.sqlDone >= 10 && (
                    <div className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🗄️</div>
                      <div className="text-white font-bold text-sm">SQL Master</div>
                    </div>
                  )}
                  {stats.total >= 30 && (
                    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🏆</div>
                      <div className="text-white font-bold text-sm">30-Day Hero</div>
                    </div>
                  )}
                  {stats.total >= 60 && (
                    <div className="bg-gradient-to-br from-pink-600/20 to-rose-600/20 border border-pink-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">👑</div>
                      <div className="text-white font-bold text-sm">Legend</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}