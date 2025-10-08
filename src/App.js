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
  const [activeCategory, setActiveCategory] = useState('');
  const [tempInterests, setTempInterests] = useState([]);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [showMyHistory, setShowMyHistory] = useState(null); // null أو challenge.id

  const ADMIN_EMAIL = 'yazanbrc@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

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

  useEffect(() => {
    if (user) {
      loadEntries();
      loadUserProfile();
      loadDailyChallenge();
      loadMySubmissions(); // حمّل تسليماتي أول شي
    }
  }, [user]);

  useEffect(() => {
    // كل ما تتغير التسليمات، حمّل الـ submissions للأدمن
    if (user && isAdmin) {
      loadSubmissions();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (userInterests.length > 0 && !activeCategory) {
      const categoryMap = {
        'python': 'coding',
        'sql': 'coding',
        'javascript': 'coding',
        'data-analysis': 'coding',
        'machine-learning': 'coding',
        'articles': 'reading',
        'books': 'reading',
        'videos': 'videos',
        'projects': 'projects',
        'workflows': 'workflows',
        'n8n': 'workflows',
        'erp': 'workflows',
        'bi': 'workflows'
      };
      const firstCategory = categoryMap[userInterests[0]] || userInterests[0];
      setActiveCategory(firstCategory);
    }
  }, [userInterests, activeCategory]);

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

    // حمّل الـ submissions دايماً مع التحديات
    await loadSubmissions();
  };

  const loadMySubmissions = async () => {
    if (!user) return;
    
    console.log('🔍 Loading my submissions for user:', user.id);
    
    // جيب كل تسليماتي (مش بس اليوم)
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select(`
        *,
        daily_challenges (
          id,
          title,
          date,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error loading my submissions:', error);
    } else {
      console.log('✅ My submissions loaded:', data);
      setMySubmissions(data || []);
    }
  };

  const loadSubmissions = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🔍 Loading submissions for date:', today);
    
    // أول شي نجيب التحديات
    const { data: challengesData, error: challengesError } = await supabase
      .from('daily_challenges')
      .select('id, title')
      .eq('date', today);
    
    console.log('🎯 Challenges found:', challengesData);
    if (challengesError) console.error('❌ Challenges error:', challengesError);
    
    if (!challengesData || challengesData.length === 0) {
      console.log('⚠️ No challenges for today');
      setSubmissions([]);
      return;
    }
    
    const challengeIds = challengesData.map(c => c.id);
    console.log('🆔 Challenge IDs:', challengeIds);
    
    // نجرب نجيب الـ submissions بدون joins
    const { data: rawSubmissions, error: submissionsError } = await supabase
      .from('challenge_submissions')
      .select('*')
      .in('challenge_id', challengeIds)
      .order('submitted_at', { ascending: false });
    
    console.log('📬 Raw submissions:', rawSubmissions);
    if (submissionsError) console.error('❌ Submissions error:', submissionsError);
    
    if (!rawSubmissions || rawSubmissions.length === 0) {
      console.log('⚠️ No submissions found');
      setSubmissions([]);
      return;
    }
    
    // هسا نجيب الـ profiles بشكل منفصل
    const userIds = [...new Set(rawSubmissions.map(s => s.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    
    console.log('👤 Profiles:', profilesData);
    
    // نربط البيانات يدوياً
    const enrichedSubmissions = rawSubmissions.map(sub => {
      const profile = profilesData?.find(p => p.id === sub.user_id);
      const challenge = challengesData.find(c => c.id === sub.challenge_id);
      
      return {
        ...sub,
        profiles: profile ? { email: profile.email } : null,
        daily_challenges: challenge ? { title: challenge.title, date: today } : null
      };
    });
    
    console.log('✅ Final submissions:', enrichedSubmissions);
    setSubmissions(enrichedSubmissions);
  };

  const saveInterests = async (interests) => {
    console.log('Saving interests:', interests);
    const { data, error } = await supabase
      .from('profiles')
      .update({ interests: interests })
      .eq('id', user.id)
      .select();
    
    if (error) {
      console.error('Error saving interests:', error);
      alert('❌ Error: ' + error.message);
    } else {
      console.log('Interests saved:', data);
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        setSignupSuccess(true);
        setEmail('');
        setPassword('');
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
    const newQ = { question: '', code: '', explanation: '', language: selectedLanguage };
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
    
    const interestStats = {};
    const categoryMap = {
      'python': 'coding',
      'sql': 'coding',
      'javascript': 'coding',
      'data-analysis': 'coding',
      'machine-learning': 'coding',
      'articles': 'reading',
      'books': 'reading',
      'videos': 'videos',
      'projects': 'projects',
      'workflows': 'workflows',
      'n8n': 'workflows',
      'erp': 'workflows',
      'bi': 'workflows'
    };

    userInterests.forEach(interest => {
      const category = categoryMap[interest] || interest;
      if (!interestStats[category]) {
        interestStats[category] = { count: 0, label: interest };
      }
      
      entries.forEach(entry => {
        if (!entry.content?.categories) return;
        
        const cat = entry.content.categories[category];
        if (!cat) return;
        
        if (category === 'coding' && cat.questions) {
          interestStats[category].count += cat.questions.length;
        } else if (category === 'reading') {
          interestStats[category].count += (cat.articles?.length || 0) + (cat.books?.length || 0);
        } else if (cat.items) {
          interestStats[category].count += cat.items.length;
        }
      });
    });
    
    return { total, totalWords, streak, interestStats };
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
      await loadDailyChallenge(); // هاي بتحمّل الـ submissions كمان
    }
  };

  const updateChallenge = async () => {
    if (!isAdmin || !editingChallenge) return;

    const { data, error } = await supabase
      .from('daily_challenges')
      .update({
        title: editingChallenge.title,
        description: editingChallenge.description,
        category: editingChallenge.category
      })
      .eq('id', editingChallenge.id)
      .select();

    if (error) {
      alert('❌ Error updating challenge: ' + error.message);
    } else {
      const updatedChallenges = allChallenges.map(c => 
        c.id === editingChallenge.id ? editingChallenge : c
      );
      setAllChallenges(updatedChallenges);
      if (dailyChallenge?.id === editingChallenge.id) {
        setDailyChallenge(editingChallenge);
      }
      
      setEditingChallenge(null);
      alert('✅ Challenge updated successfully!');
    }
  };

  const deleteChallenge = async (challengeId) => {
    if (!isAdmin) return;
    if (!window.confirm('⚠️ Are you sure you want to delete this challenge?')) return;

    try {
      const { error: completionsError } = await supabase
        .from('challenge_completions')
        .delete()
        .eq('challenge_id', challengeId);

      const { error: submissionsError } = await supabase
        .from('challenge_submissions')
        .delete()
        .eq('challenge_id', challengeId);

      const { error } = await supabase
        .from('daily_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        alert('❌ Delete error: ' + error.message);
        return;
      }

      const updatedChallenges = allChallenges.filter(c => c.id !== challengeId);
      setAllChallenges(updatedChallenges);
      setDailyChallenge(updatedChallenges[0] || null);
      setCompletedChallenge(false);
      
      alert('✅ Successfully deleted!');
      
      // حمّل الـ submissions من جديد
      await loadSubmissions();
      
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const submitChallengeWork = async () => {
    if (!dailyChallenge && !editingSubmission) return;
    
    if (!challengeSubmission.text && !challengeSubmission.file) {
      alert('❌ Please write something or upload a file');
      return;
    }

    setUploadingFile(true);
    
    try {
      let fileUrl = null;
      
      if (challengeSubmission.file) {
        const fileExt = challengeSubmission.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('challenge-submissions')
          .upload(fileName, challengeSubmission.file);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('challenge-submissions')
          .getPublicUrl(fileName);
        
        fileUrl = urlData.publicUrl;
      }

      // إذا عم نعدّل على تسليم موجود
      if (editingSubmission) {
        console.log('✏️ Updating submission:', editingSubmission.id);
        
        const updateData = {
          submission_text: challengeSubmission.text || '',
          submitted_at: new Date().toISOString()
        };
        
        // بس إذا في ملف جديد، حدّث الـ file_url
        if (fileUrl) {
          updateData.file_url = fileUrl;
        }
        
        const { error: updateError } = await supabase
          .from('challenge_submissions')
          .update(updateData)
          .eq('id', editingSubmission.id)
          .eq('user_id', user.id); // تأكد إنه تسليمي أنا

        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Updated successfully');
        alert('✅ Updated successfully!');
        
        // امسح الـ editing state
        setEditingSubmission(null);
        
      } else {
        // تسليم جديد
        console.log('📝 Creating new submission for challenge:', dailyChallenge.id);
        
        const { data: submissionData, error: submissionError } = await supabase
          .from('challenge_submissions')
          .insert({
            user_id: user.id,
            challenge_id: dailyChallenge.id,
            submission_text: challengeSubmission.text || '',
            file_url: fileUrl,
            submitted_at: new Date().toISOString()
          })
          .select();

        if (submissionError) {
          console.error('❌ Submission error:', submissionError);
          throw submissionError;
        }

        console.log('✅ Submission created:', submissionData);

        // سجّل إنه complete
        const { error: completionError } = await supabase
          .from('challenge_completions')
          .upsert({
            user_id: user.id,
            challenge_id: dailyChallenge.id,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,challenge_id'
          });

        if (completionError) {
          console.log('⚠️ Completion error (might already exist):', completionError);
        }

        setCompletedChallenge(true);
        alert('✅ Submitted successfully!');
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // امسح الفورم
      setChallengeSubmission({ text: '', file: null });
      setShowSubmissionForm(false);
      setEditingSubmission(null); // مهم جداً!
      
      // حدّث البيانات
      await loadMySubmissions();
      if (isAdmin) {
        await loadSubmissions();
      }
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const editMySubmission = (submission) => {
    console.log('🔧 Editing submission:', submission);
    
    // امسح أي submission form مفتوح
    setShowSubmissionForm(false);
    
    // حدد الـ submission للتعديل
    setEditingSubmission(submission);
    
    // املأ الفورم
    setChallengeSubmission({
      text: submission.submission_text || '',
      file: null
    });
    
    // أخفي الـ history
    setShowMyHistory(null);
    
    // افتح الفورم
    setTimeout(() => {
      setShowSubmissionForm(true);
    }, 100);
    
    // تأكد إنك على صفحة الـ challenges
    setView('challenges');
  };

  const deleteMySubmission = async (submissionId) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this submission?')) return;

    console.log('🗑️ Starting delete for submission:', submissionId);

    try {
      // جيب التسليم عشان نعرف الـ challenge_id
      const submission = mySubmissions.find(s => s.id === submissionId);
      console.log('📋 Found submission:', submission);
      
      if (!submission) {
        alert('❌ Submission not found in local data');
        return;
      }

      // Method 1: احذف مباشرة بدون فحص الـ completion
      console.log('🔄 Attempting direct delete...');
      
      const { data: deleteData, error: deleteError } = await supabase
        .from('challenge_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('user_id', user.id)
        .select();

      console.log('Delete result:', { data: deleteData, error: deleteError });

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        
        // طبع تفاصيل الخطأ
        console.error('Error details:', {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint
        });
        
        alert(`❌ Delete failed: ${deleteError.message}\n\nCheck console for details. You might need to update RLS policies in Supabase.`);
        return;
      }

      console.log('✅ Delete successful');
      
      // بعد الحذف، احذف الـ completion
      console.log('🔄 Deleting completion...');
      const { error: completionError } = await supabase
        .from('challenge_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('challenge_id', submission.challenge_id);
      
      if (completionError) {
        console.log('⚠️ Completion delete warning (might not exist):', completionError);
      }

      alert('✅ Deleted successfully!');
      
      // حدّث البيانات
      console.log('🔄 Reloading data...');
      await loadMySubmissions();
      if (isAdmin) {
        await loadSubmissions();
      }
      
      // إذا كان هاد آخر تسليم للـ challenge الحالي، شيل علامة completed
      const remainingForThisChallenge = mySubmissions.filter(s => 
        s.id !== submissionId && 
        s.challenge_id === submission.challenge_id
      );
      
      console.log('📊 Remaining submissions for this challenge:', remainingForThisChallenge.length);
      
      if (remainingForThisChallenge.length === 0 && dailyChallenge?.id === submission.challenge_id) {
        setCompletedChallenge(false);
      }
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      alert('❌ Unexpected error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (signupSuccess) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl inline-block mb-6">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Account Created! 🎉</h1>
            <p className="text-gray-300 text-lg mb-6">
              Please check your email to verify your account.
            </p>
            <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-200 text-sm">
                📧 Click the confirmation link in the email to activate your account
              </p>
            </div>
            <button
              onClick={() => {
                setSignupSuccess(false);
                setAuthMode('login');
              }}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3 rounded-xl font-bold text-white"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

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

  if (showOnboarding) {
    const allInterests = [
      { id: 'python', label: '🐍 Python' },
      { id: 'sql', label: '🗄️ SQL' },
      { id: 'javascript', label: '⚡ JavaScript' },
      { id: 'data-analysis', label: '📊 Data Analysis' },
      { id: 'machine-learning', label: '🤖 ML & AI' },
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
            onClick={() => {
              if (tempInterests.length > 0) {
                saveInterests(tempInterests);
              }
            }}
            disabled={tempInterests.length === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-4 rounded-xl font-bold text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-semibold">Saved! ☁️</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
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
            {/* Achievements Badge */}
            {mySubmissions.length >= 5 && (
              <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  Achievements Unlocked 🎉
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mySubmissions.length >= 5 && (
                    <div className="bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/40 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🌱</div>
                      <div className="text-white font-bold text-sm">Beginner</div>
                      <div className="text-green-300 text-xs">5+ submissions</div>
                    </div>
                  )}
                  
                  {mySubmissions.length >= 10 && (
                    <div className="bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/40 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-white font-bold text-sm">Rising Star</div>
                      <div className="text-blue-300 text-xs">10+ submissions</div>
                    </div>
                  )}
                  
                  {mySubmissions.length >= 20 && (
                    <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/40 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">🔥</div>
                      <div className="text-white font-bold text-sm">On Fire</div>
                      <div className="text-purple-300 text-xs">20+ submissions</div>
                    </div>
                  )}
                  
                  {mySubmissions.length >= 50 && (
                    <div className="bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border border-yellow-500/40 rounded-xl p-4 text-center">
                      <div className="text-3xl mb-2">👑</div>
                      <div className="text-white font-bold text-sm">Legend</div>
                      <div className="text-yellow-300 text-xs">50+ submissions</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State for first time */}
            {mySubmissions.length === 0 && allChallenges.length === 0 && (
              <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-12 text-center">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-full inline-block mb-6">
                  <Trophy className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Ready to Start Your Journey? 🚀</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Challenges will appear here. Complete them to track your progress, earn achievements, and level up your skills!
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-white font-semibold text-sm">Track Progress</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="text-white font-semibold text-sm">Earn Badges</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-3xl mb-2">💪</div>
                    <div className="text-white font-semibold text-sm">Level Up</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {allChallenges.length > 0 && !isAdmin && view !== 'challenges' && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Today's Challenges</h3>
                    <p className="text-gray-300 text-sm">{allChallenges.length} challenge(s) available</p>
                  </div>
                </div>
                <button
                  onClick={() => setView('challenges')}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 px-6 py-3 rounded-xl font-bold text-white"
                >
                  View Challenges →
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'challenges' && !isAdmin && (
          <div className="mb-6">
            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              Today's Challenges
            </h2>
            
            {allChallenges.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Challenges Yet</h3>
                <p className="text-gray-400">Check back later for today's challenges!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allChallenges.map((challenge, idx) => {
                  const mySubmissionsForThisChallenge = mySubmissions.filter(s => s.challenge_id === challenge.id);
                  const isCompleted = mySubmissionsForThisChallenge.length > 0;
                  const isFirstChallenge = idx === 0;
                  
                  return (
                    <div key={challenge.id} className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            <h3 className="text-xl font-bold text-white">
                              {allChallenges.length > 1 ? `Challenge #${idx + 1}` : "Today's Challenge"}
                            </h3>
                            <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded-full text-yellow-200">{challenge.category}</span>
                          </div>
                          <p className="text-lg text-gray-200 mb-2">{challenge.title}</p>
                          <p className="text-sm text-gray-300">{challenge.description}</p>
                        </div>
                      </div>

                      {/* Submission Counter */}
                      <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-400" />
                            <span className="text-white font-semibold">
                              Your submissions: {mySubmissionsForThisChallenge.length}
                            </span>
                          </div>
                          {mySubmissionsForThisChallenge.length > 0 && (
                            <button
                              onClick={() => setShowMyHistory(showMyHistory === challenge.id ? null : challenge.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg text-sm font-semibold text-white"
                            >
                              {showMyHistory === challenge.id ? 'Hide History' : '📜 View History'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* My Submission History */}
                      {showMyHistory === challenge.id && (
                        <div className="bg-white/10 rounded-xl p-4 mb-4">
                          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Your Submission History for this Challenge
                          </h4>
                          <div className="space-y-3">
                            {mySubmissionsForThisChallenge.map((sub) => (
                              <div key={sub.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs text-gray-400">
                                    {new Date(sub.submitted_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => editMySubmission(sub)}
                                      className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs font-semibold text-white flex items-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteMySubmission(sub.id)}
                                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs font-semibold text-white"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                                {sub.submission_text && (
                                  <p className="text-gray-200 text-sm mb-2">
                                    {sub.submission_text.length > 150 
                                      ? sub.submission_text.substring(0, 150) + '...' 
                                      : sub.submission_text}
                                  </p>
                                )}
                                {sub.file_url && (
                                  <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                                    <Download className="w-3 h-3" />
                                    View attached file
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submission Form or Status */}
                      {isCompleted && !editingSubmission && !showSubmissionForm ? (
                        <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/40 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-green-200">
                              <CheckCircle2 className="w-6 h-6" />
                              <span className="font-semibold">Completed! Great job! 🎉</span>
                            </div>
                            <button
                              onClick={() => {
                                console.log('➕ Submit Again clicked');
                                setShowSubmissionForm(true);
                                setEditingSubmission(null);
                                setChallengeSubmission({ text: '', file: null });
                              }}
                              className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                            >
                              ➕ Submit Again
                            </button>
                          </div>
                        </div>
                      ) : (showSubmissionForm && (isFirstChallenge || editingSubmission?.challenge_id === challenge.id)) || (editingSubmission && editingSubmission.challenge_id === challenge.id) ? (
                        <div className="bg-white/10 rounded-xl p-4">
                          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                            {editingSubmission ? (
                              <>
                                <Edit2 className="w-5 h-5" />
                                Edit Submission
                              </>
                            ) : (
                              <>
                                ✨ Submit Your Work
                              </>
                            )}
                          </h4>
                          
                          {editingSubmission && (
                            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-3">
                              <p className="text-blue-200 text-sm">
                                💡 You're editing your submission from {new Date(editingSubmission.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          
                          <textarea
                            value={challengeSubmission.text}
                            onChange={(e) => setChallengeSubmission({ ...challengeSubmission, text: e.target.value })}
                            placeholder="Describe what you did, share links, code, or notes..."
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-32 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-3"
                          />
                          
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              📎 Attach File (optional)
                            </label>
                            <input
                              type="file"
                              onChange={(e) => setChallengeSubmission({ ...challengeSubmission, file: e.target.files[0] })}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700"
                              accept="image/*,.pdf,.doc,.docx,.txt,.js,.py,.java,.cpp,.html,.css"
                            />
                            {challengeSubmission.file && (
                              <p className="text-green-300 text-sm mt-2">✓ {challengeSubmission.file.name}</p>
                            )}
                            {editingSubmission?.file_url && !challengeSubmission.file && (
                              <div className="mt-2">
                                <p className="text-blue-300 text-sm mb-1">📎 Current file:</p>
                                <a href={editingSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs">
                                  View current file
                                </a>
                                <p className="text-gray-400 text-xs mt-1">(Upload a new file to replace it)</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={submitChallengeWork}
                              disabled={uploadingFile}
                              className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {uploadingFile ? '⏳ Uploading...' : editingSubmission ? '💾 Save Changes' : '✅ Submit'}
                            </button>
                            <button
                              onClick={() => {
                                console.log('❌ Canceling submission form');
                                setShowSubmissionForm(false);
                                setChallengeSubmission({ text: '', file: null });
                                setEditingSubmission(null);
                              }}
                              className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-xl font-bold text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setShowSubmissionForm(true);
                            setEditingSubmission(null);
                          }}
                          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 py-3 rounded-xl font-bold text-white"
                        >
                          📝 Submit Your Work
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {allChallenges.length > 0 && isAdmin && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">📊 Today's Challenges Overview</h3>
                  <p className="text-gray-300">{allChallenges.length} challenge(s) active • {submissions.length} submission(s) received</p>
                </div>
                <button
                  onClick={loadSubmissions}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-semibold text-white"
                >
                  🔄 Refresh
                </button>
              </div>
              
              <button
                onClick={() => setView('submissions')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-xl font-bold text-white"
              >
                📬 View All Submissions ({submissions.length})
              </button>
            </div>

            {allChallenges.map((challenge, idx) => (
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
                          <h3 className="text-xl font-bold text-white">Challenge #{idx + 1}</h3>
                          <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded-full text-yellow-200">{challenge.category}</span>
                        </div>
                        <p className="text-lg text-gray-200 mb-2">{challenge.title}</p>
                        <p className="text-sm text-gray-300">{challenge.description}</p>
                      </div>
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!dailyChallenge && !isAdmin && allChallenges.length === 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-300">No challenge for today yet. Check back later!</p>
          </div>
        )}

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'entry', icon: BookOpen, label: 'Today' },
            { id: 'history', icon: Calendar, label: 'History' },
            { id: 'stats', icon: BarChart3, label: 'Stats' },
            { id: 'challenges', icon: Trophy, label: 'Challenges' },
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

        {view === 'entry' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <label className="block text-sm font-bold text-indigo-300 mb-2">Date</label>
              <input
                type="date"
                value={currentEntry.date}
                onChange={(e) => setCurrentEntry({ ...currentEntry, date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {userInterests.length > 0 ? (
                (() => {
                  const categoryMap = {
                    'python': 'coding',
                    'sql': 'coding',
                    'javascript': 'coding',
                    'data-analysis': 'coding',
                    'machine-learning': 'coding',
                    'articles': 'reading',
                    'books': 'reading',
                    'videos': 'videos',
                    'projects': 'projects',
                    'workflows': 'workflows',
                    'n8n': 'workflows',
                    'erp': 'workflows',
                    'bi': 'workflows',
                    'english': 'other' // أي حاجة ثانية تروح على Other
                  };
                  
                  // نجمع الـ categories ونتأكد إنه ما في تكرار
                  // أي interest مش موجود بالـ map، يروح تلقائياً على 'other'
                  const categories = [...new Set(userInterests.map(i => categoryMap[i] || 'other'))];
                  
                  // Other أكيد موجودة هسا، بس نتأكد
                  if (!categories.includes('other')) {
                    categories.push('other');
                  }
                  
                  const iconMap = {
                    'coding': { icon: Code, label: '💻 Coding' },
                    'reading': { icon: BookOpen, label: '📖 Reading' },
                    'videos': { icon: Play, label: '🎥 Videos' },
                    'projects': { icon: Target, label: '🎯 Projects' },
                    'workflows': { icon: Database, label: '⚙️ Workflows' },
                    'other': { icon: FileText, label: '📝 Other' }
                  };

                  // نصفّي: نعرض بس الـ categories اللي إلها icon
                  return categories
                    .filter(cat => iconMap[cat]) // بس الـ categories المعروفة
                    .map(cat => {
                      const catInfo = iconMap[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                            activeCategory === cat
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {catInfo.label}
                        </button>
                      );
                    });
                })()
              ) : (
                [
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
                ))
              )}
            </div>

            {activeCategory === 'coding' && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  Coding Practice
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-emerald-300 mb-2">Select Language:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ color: 'white' }}
                  >
                    {userInterests.some(i => ['python', 'data-analysis', 'machine-learning'].includes(i)) && 
                      <option value="python" style={{ backgroundColor: '#1e293b', color: 'white' }}>🐍 Python</option>
                    }
                    {userInterests.includes('sql') && 
                      <option value="sql" style={{ backgroundColor: '#1e293b', color: 'white' }}>🗄️ SQL</option>
                    }
                    {userInterests.includes('javascript') && 
                      <option value="javascript" style={{ backgroundColor: '#1e293b', color: 'white' }}>⚡ JavaScript</option>
                    }
                    {!userInterests.some(i => ['python', 'sql', 'javascript', 'data-analysis', 'machine-learning'].includes(i)) && (
                      <>
                        <option value="python" style={{ backgroundColor: '#1e293b', color: 'white' }}>🐍 Python</option>
                        <option value="sql" style={{ backgroundColor: '#1e293b', color: 'white' }}>🗄️ SQL</option>
                        <option value="javascript" style={{ backgroundColor: '#1e293b', color: 'white' }}>⚡ JavaScript</option>
                      </>
                    )}
                  </select>
                </div>
                
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
                <Award className="w-8 h-8 text-white/80 mb-2" />
                <div className="text-5xl font-black text-white">{Object.keys(stats.interestStats).length}</div>
                <div className="text-purple-100 font-semibold">Active Categories</div>
              </div>
            </div>

            {Object.keys(stats.interestStats).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {Object.entries(stats.interestStats).map(([category, data]) => {
                  const colors = {
                    coding: 'from-emerald-600 to-green-600',
                    reading: 'from-blue-600 to-cyan-600',
                    videos: 'from-red-600 to-pink-600',
                    projects: 'from-purple-600 to-pink-600',
                    workflows: 'from-amber-600 to-orange-600'
                  };
                  const icons = {
                    coding: Code,
                    reading: BookOpen,
                    videos: Play,
                    projects: Target,
                    workflows: Database
                  };
                  const IconComponent = icons[category] || Star;
                  
                  return (
                    <div key={category} className={`bg-gradient-to-br ${colors[category] || 'from-gray-600 to-slate-600'} rounded-2xl p-6`}>
                      <IconComponent className="w-8 h-8 text-white/80 mb-2" />
                      <div className="text-5xl font-black text-white">{data.count}</div>
                      <div className="text-white/90 font-semibold capitalize">{category} Items</div>
                    </div>
                  );
                })}
              </div>
            )}

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

        {view === 'submissions' && isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">📬 Today's Submissions</h2>
              <button 
                onClick={loadSubmissions}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-semibold text-white"
              >
                🔄 Refresh
              </button>
            </div>
            
            {submissions.length === 0 && (
              <div className="text-center py-20">
                <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">No submissions yet for today</p>
              </div>
            )}

            <div className="grid gap-4">
              {submissions.map((sub, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-lg font-bold text-indigo-300">{sub.profiles?.email || 'Unknown user'}</h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(sub.submitted_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {sub.daily_challenges?.title && (
                        <p className="text-xs text-yellow-400 mt-1">Challenge: {sub.daily_challenges.title}</p>
                      )}
                    </div>
                    <span className="text-xs bg-green-600/40 px-3 py-1 rounded-full text-green-200 font-semibold">✓ Submitted</span>
                  </div>

                  {sub.submission_text && (
                    <div className="bg-white/10 rounded-xl p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-300 mb-2">📝 Text:</p>
                      <p className="text-gray-200 whitespace-pre-wrap">{sub.submission_text}</p>
                    </div>
                  )}

                  {sub.file_url && (
                    <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-4">
                      <p className="text-sm font-semibold text-indigo-300 mb-2">📎 Attached File:</p>
                      <a 
                        href={sub.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-white font-semibold transition-all"
                      >
                        <Download className="w-4 h-4" />
                        View/Download File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}