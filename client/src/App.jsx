import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import {
  Target,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Trash2,
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Loader2,
  Cloud,
  CloudRain,
  Sun,
  Clock,
  Repeat,
  Sparkles,
  Newspaper,
  ExternalLink,
  BookOpen,
  Edit,
} from 'lucide-react';
import { getDailyCards } from './tarotData';

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

// Category colors
const CATEGORY_COLORS = {
  work: 'bg-blue-100 text-blue-800 border-blue-300',
  thought: 'bg-purple-100 text-purple-800 border-purple-300',
  collaboration: 'bg-green-100 text-green-800 border-green-300',
  study: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  research: 'bg-pink-100 text-pink-800 border-pink-300',
  action: 'bg-red-100 text-red-800 border-red-300',
  habit: 'bg-orange-100 text-orange-800 border-orange-300',
};

// RAG status colors
const RAG_COLORS = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
};

function App() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, goal-detail, calendar
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [animatingTasks, setAnimatingTasks] = useState(new Set());

  // Initialize auth
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Load goals
  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setGoals([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Load stages and tasks for each goal
      const goalsWithDetails = await Promise.all(
        goalsData.map(async (goal) => {
          const { data: stages } = await supabase
            .from('stages')
            .select('*')
            .eq('goal_id', goal.id)
            .order('order_index');

          const stagesWithTasks = await Promise.all(
            (stages || []).map(async (stage) => {
              const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('stage_id', stage.id)
                .order('order_index');

              return { ...stage, tasks: tasks || [] };
            })
          );

          return { ...goal, stages: stagesWithTasks };
        })
      );

      setGoals(goalsWithDetails);

      // Auto-reset recurring tasks
      await resetRecurringTasks(goalsWithDetails);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const resetRecurringTasks = async (goals) => {
    try {
      const recurringGoal = goals.find(g => g.title.includes('Recurring Tasks'));
      if (!recurringGoal) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      for (const stage of recurringGoal.stages || []) {
        const isDaily = stage.name.toLowerCase().includes('daily');
        const isWeekly = stage.name.toLowerCase().includes('weekly');

        for (const task of stage.tasks || []) {
          if (!task.completed || !task.last_completed_date) continue;

          const lastCompleted = new Date(task.last_completed_date);
          lastCompleted.setHours(0, 0, 0, 0);
          const lastCompletedStr = lastCompleted.toISOString().split('T')[0];

          let shouldReset = false;

          if (isDaily && lastCompletedStr < todayStr) {
            // Reset daily tasks if last completed before today
            shouldReset = true;
          } else if (isWeekly) {
            // Reset weekly tasks based on day mentioned in task text
            const taskText = task.text.toLowerCase();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const taskDay = days.findIndex(day => taskText.includes(day));

            if (taskDay !== -1 && dayOfWeek === taskDay && lastCompletedStr < todayStr) {
              shouldReset = true;
            }
          }

          if (shouldReset) {
            await supabase
              .from('tasks')
              .update({ completed: false })
              .eq('id', task.id);
          }
        }
      }
    } catch (error) {
      console.error('Error resetting recurring tasks:', error);
    }
  };

  const calculateProgress = (goal) => {
    const allTasks = goal.stages?.flatMap(s => s.tasks) || [];
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.completed).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const getTaskStats = (goal) => {
    const allTasks = goal.stages?.flatMap(s => s.tasks) || [];
    const completed = allTasks.filter(t => t.completed).length;
    return { completed, total: allTasks.length };
  };

  const toggleTask = async (task, stageId) => {
    try {
      // Add task to animating set
      setAnimatingTasks(prev => new Set(prev).add(task.id));

      const newCompleted = !task.completed;
      let updates = { completed: newCompleted, updated_at: new Date().toISOString() };

      // Handle habit streak
      if (task.category === 'habit' && newCompleted) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = task.last_completed_date;

        if (lastDate) {
          const daysDiff = Math.floor((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            updates.streak = (task.streak || 0) + 1;
          } else if (daysDiff > 1) {
            updates.streak = 1;
          }
        } else {
          updates.streak = 1;
        }
        updates.last_completed_date = today;
      } else if (task.category === 'habit' && !newCompleted) {
        updates.streak = Math.max(0, (task.streak || 0) - 1);
      }

      // Optimistically update the UI immediately
      setGoals(prevGoals => prevGoals.map(goal => ({
        ...goal,
        stages: goal.stages?.map(stage => ({
          ...stage,
          tasks: stage.tasks.map(t =>
            t.id === task.id ? { ...t, ...updates } : t
          )
        }))
      })));

      // Update selected goal if it's the current one
      if (selectedGoal) {
        setSelectedGoal(prevGoal => ({
          ...prevGoal,
          stages: prevGoal.stages?.map(stage => ({
            ...stage,
            tasks: stage.tasks.map(t =>
              t.id === task.id ? { ...t, ...updates } : t
            )
          }))
        }));
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;

      // Remove task from animating set after animation completes
      setTimeout(() => {
        setAnimatingTasks(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }, 600);
    } catch (error) {
      console.error('Error toggling task:', error);
      // Revert the optimistic update and reload from database
      await loadGoals();
      // Remove from animating set on error
      setAnimatingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const deleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      await loadGoals();
      setView('dashboard');
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const updateRAGStatus = async (goalId, status) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ rag_status: status })
        .eq('id', goalId);

      if (error) throw error;
      await loadGoals();
    } catch (error) {
      console.error('Error updating RAG status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-orange-dark animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b-4 border-brand-orange-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
            >
              <img
                src="/porpoise-logo.jpg"
                alt="Purpoise"
                className="h-12 w-12 object-cover rounded-lg"
              />
              <h1 className="text-3xl font-serif font-bold text-white">
                Purpoise
              </h1>
            </button>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'dashboard'
                      ? 'bg-brand-orange-dark text-white'
                      : 'text-white hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('news')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'news'
                      ? 'bg-brand-orange-dark text-white'
                      : 'text-white hover:bg-gray-100'
                  }`}
                >
                  <Newspaper className="w-5 h-5 inline-block mr-1" />
                  News
                </button>
                <button
                  onClick={() => setView('wikipedia')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'wikipedia'
                      ? 'bg-brand-orange-dark text-white'
                      : 'text-white hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-5 h-5 inline-block mr-1" />
                  Wikipedia
                </button>
              </nav>

              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-white">
                    {user.email || 'Signed in'}
                  </span>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-white hover:bg-gray-300 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="px-4 py-2 rounded-lg font-medium bg-brand-orange-dark text-white hover:bg-opacity-90 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-8">
        {view === 'dashboard' && (
          <DashboardView
            goals={goals}
            onSelectGoal={(goal) => {
              setSelectedGoal(goal);
              setView('goal-detail');
            }}
            onNewGoal={() => setShowNewGoalModal(true)}
            calculateProgress={calculateProgress}
            getTaskStats={getTaskStats}
            toggleTask={toggleTask}
            animatingTasks={animatingTasks}
          />
        )}

        {view === 'goal-detail' && selectedGoal && (
          <GoalDetailView
            goal={selectedGoal}
            onBack={() => {
              setView('dashboard');
              setSelectedGoal(null);
            }}
            onDelete={deleteGoal}
            onUpdateRAG={updateRAGStatus}
            toggleTask={toggleTask}
            calculateProgress={calculateProgress}
            animatingTasks={animatingTasks}
            loadGoals={loadGoals}
            setSelectedGoal={setSelectedGoal}
          />
        )}

        {view === 'calendar' && (
          <CalendarView
            goals={goals}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}

        {view === 'news' && <NewsView />}

        {view === 'wikipedia' && <WikipediaView />}
      </main>

      {/* New Goal Modal */}
      {showNewGoalModal && (
        <NewGoalModal
          onClose={() => setShowNewGoalModal(false)}
          onGoalCreated={() => {
            loadGoals();
            setShowNewGoalModal(false);
          }}
          userId={user?.id}
          goals={goals}
        />
      )}
    </div>
  );
}

// Weather Widget Component
function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Southend-on-Sea, Essex, UK coordinates
        const latitude = 51.55;
        const longitude = 0.7833;

        // Fetch daily forecast (3 days to include weekend on Friday)
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=Europe/London&forecast_days=3`
        );

        setWeather(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Weather fetch error:', error);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-4 mb-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand-orange-dark" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const { daily } = weather;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  const isFriday = dayOfWeek === 5;

  // Helper to format day name
  const getDayName = (dateString, index) => {
    if (index === 0) return 'Today';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  // Calculate sunshine percentage from duration (seconds to hours, max ~12 hours of daylight)
  const getSunshinePercent = (seconds) => {
    const hours = seconds / 3600;
    return Math.min(100, Math.round((hours / 12) * 100));
  };

  // Show today + weekend on Friday, otherwise just today
  const daysToShow = isFriday ? [0, 1, 2] : [0];

  return (
    <div className="space-y-3">
      {daysToShow.map((dayIndex) => {
        const tempMax = Math.round(daily.temperature_2m_max[dayIndex]);
        const tempMin = Math.round(daily.temperature_2m_min[dayIndex]);
        const rain = daily.precipitation_sum[dayIndex];
        const sunshine = getSunshinePercent(daily.sunshine_duration[dayIndex]);
        const dayName = getDayName(daily.time[dayIndex], dayIndex);

        return (
          <div key={dayIndex} className="bg-gray-900/10 backdrop-blur-sm rounded-lg p-3 border border-brand-orange-dark/30">
            {daysToShow.length > 1 && (
              <h3 className="text-sm font-semibold text-white mb-2">{dayName}</h3>
            )}
            <div className="space-y-2">
              {/* Temperature */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-brand-orange-dark" />
                  <span className="text-xs text-brand-orange-dark">Temp</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{tempMax}°C</div>
                  <div className="text-xs text-brand-orange-dark">Low {tempMin}°C</div>
                </div>
              </div>

              {/* Sunshine */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {sunshine > 50 ? (
                    <Sun className="w-4 h-4 text-brand-orange-dark" />
                  ) : (
                    <Cloud className="w-4 h-4 text-brand-orange-dark" />
                  )}
                  <span className="text-xs text-brand-orange-dark">Sun</span>
                </div>
                <div className="text-lg font-bold text-white">{sunshine}%</div>
              </div>

              {/* Rain */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CloudRain className="w-4 h-4 text-brand-orange-dark" />
                  <span className="text-xs text-brand-orange-dark">Rain</span>
                </div>
                <div className="text-lg font-bold text-white">{rain.toFixed(1)}mm</div>
              </div>

              {/* Time (only for today) */}
              {dayIndex === 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-brand-orange-dark">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-brand-orange-dark" />
                    <span className="text-xs text-brand-orange-dark">
                      {today.getHours() < 12 ? 'Morning' : today.getHours() < 18 ? 'Afternoon' : 'Evening'}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Newspaper Carousel Component
function NewspaperCarousel() {
  const [newspapers, setNewspapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchNewspapers = async () => {
      try {
        const response = await axios.get(`${API_URL}/newspapers`);
        // Filter to only show available newspapers
        const available = (response.data.newspapers || []).filter(n => n.available && n.pdfLink);
        setNewspapers(available);
        setLoading(false);
      } catch (error) {
        console.error('Newspaper fetch error:', error);
        setLoading(false);
      }
    };

    fetchNewspapers();
  }, []);

  const nextNewspaper = () => {
    setCurrentIndex((prev) => (prev + 1) % newspapers.length);
  };

  const prevNewspaper = () => {
    setCurrentIndex((prev) => (prev - 1 + newspapers.length) % newspapers.length);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange-dark" />
        </div>
      </div>
    );
  }

  if (!newspapers.length) return null;

  const current = newspapers[currentIndex];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
      <h2 className="text-xl font-serif font-bold mb-4 flex items-center text-white">
        <Newspaper className="w-5 h-5 mr-2 text-brand-orange-dark" />
        Today's Papers
      </h2>

      <div className="relative">
        {/* Carousel navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevNewspaper}
            className="p-2 rounded-full bg-gray-900/10 hover:bg-gray-900/20 text-brand-orange-dark transition-colors"
            disabled={newspapers.length <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">{current.name}</h3>
            <p className="text-sm text-brand-orange-dark">{current.date}</p>
          </div>

          <button
            onClick={nextNewspaper}
            className="p-2 rounded-full bg-gray-900/10 hover:bg-gray-900/20 text-brand-orange-dark transition-colors"
            disabled={newspapers.length <= 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Newspaper cover */}
        <div className="bg-gray-900/5 rounded-lg p-4 mb-4">
          {current.coverImage ? (
            <img
              src={current.coverImage}
              alt={`${current.name} cover`}
              className="w-full h-auto rounded shadow-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-900/10 rounded">
              <Newspaper className="w-16 h-16 text-brand-orange-dark/50" />
            </div>
          )}
        </div>

        {/* View link */}
        {current.pdfLink && (
          <a
            href={current.pdfLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-orange-dark hover:bg-brand-orange-dark text-white font-semibold rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Latest Issue
          </a>
        )}

        {/* Carousel dots */}
        {newspapers.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {newspapers.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-brand-orange-dark' : 'bg-gray-900/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wikipedia View Component
function WikipediaView() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWikipedia = async () => {
      try {
        const response = await axios.get(`${API_URL}/wikipedia`);
        setContent(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Wikipedia fetch error:', error);
        setError('Failed to load Wikipedia content');
        setLoading(false);
      }
    };

    fetchWikipedia();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange-dark" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gray-900 rounded-lg shadow-md border-2 border-gray-700 p-8 text-center">
          <h2 className="text-2xl font-serif font-bold text-white mb-4">Unable to Load Wikipedia</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-serif font-bold text-white mb-2 flex items-center">
                <BookOpen className="w-10 h-10 mr-3 text-brand-orange-dark" />
                Wikipedia Main Page
              </h1>
              <p className="text-gray-300">The free encyclopedia that anyone can edit</p>
            </div>
            <a
              href="https://en.wikipedia.org/wiki/Main_Page"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-brand-orange-dark transition-colors font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View on Wikipedia
            </a>
          </div>
        </div>

        {/* Featured Article */}
        {content?.featuredArticle && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-gold-50 to-gray-700 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
              <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-brand-orange-dark" />
                Featured Article
              </h2>
              <div className="prose prose-lg max-w-none">
                <h3 className="text-xl font-bold text-white mb-3">
                  {content.featuredArticle.title}
                </h3>
                <div
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content.featuredArticle.content }}
                />
                {content.featuredArticle.link && (
                  <a
                    href={content.featuredArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-brand-orange-dark hover:text-brand-orange-dark font-medium"
                  >
                    Read more →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* In the News */}
        {content?.inTheNews && content.inTheNews.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-gray-700 p-6">
              <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
                <Newspaper className="w-6 h-6 mr-2 text-brand-orange-dark" />
                In the News
              </h2>
              <div className={content.newsImage ? "grid md:grid-cols-[300px_1fr] gap-6" : ""}>
                {/* Featured News Image */}
                {content.newsImage && (
                  <div className="flex-shrink-0">
                    <img
                      src={content.newsImage}
                      alt="In the news"
                      className="w-full h-auto rounded-lg shadow-md border-2 border-gray-700"
                    />
                  </div>
                )}
                {/* News Items */}
                <ul className="space-y-3">
                  {content.inTheNews.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-brand-orange-dark font-bold mr-3 mt-1">•</span>
                      <div
                        className="flex-1 text-gray-300"
                        dangerouslySetInnerHTML={{ __html: item }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Did You Know */}
        {content?.didYouKnow && content.didYouKnow.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
              <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
                <span className="text-brand-orange-dark mr-2">?</span>
                Did You Know...
              </h2>
              <ul className="space-y-3">
                {content.didYouKnow.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-brand-orange-dark font-bold mr-3 mt-1">?</span>
                    <div
                      className="flex-1 text-gray-300"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* On This Day */}
        {content?.onThisDay && content.onThisDay.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-gray-700 p-6">
              <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
                <CalendarIcon className="w-6 h-6 mr-2 text-brand-orange-dark" />
                On This Day
              </h2>
              <ul className="space-y-3">
                {content.onThisDay.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-brand-orange-dark font-bold mr-3 mt-1">•</span>
                    <div
                      className="flex-1 text-gray-300"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Full Page Link */}
        <div className="mb-8">
          <a
            href="https://en.wikipedia.org/wiki/Main_Page"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg shadow-xl border-2 border-brand-orange-dark p-8 hover:shadow-2xl hover:border-brand-orange-dark hover:-translate-y-1 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BookOpen className="w-16 h-16 text-brand-orange-dark" />
                <div>
                  <h3 className="text-2xl font-serif font-bold text-white mb-2">
                    Explore More on Wikipedia
                  </h3>
                  <p className="text-brand-orange-dark">
                    Visit the full Wikipedia Main Page for more featured content
                  </p>
                </div>
              </div>
              <ExternalLink className="w-8 h-8 text-brand-orange-dark" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// News View Component
function NewsView() {
  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trumpDump, setTrumpDump] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('all');
  const [showTrumpDump, setShowTrumpDump] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch RSS feeds and trending in parallel
        const [feedsResponse, trendingResponse] = await Promise.all([
          axios.get(`${API_URL}/news-feeds`),
          axios.get(`${API_URL}/trending`)
        ]);

        setArticles(feedsResponse.data.articles || []);
        setTrending(trendingResponse.data.trending || []);
        setTrumpDump(trendingResponse.data.trumpDump || []);
        setLoading(false);
      } catch (error) {
        console.error('News fetch error:', error);
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange-dark" />
        </div>
      </div>
    );
  }

  // Separate Trump, sports, and AI articles from regular news
  const regularArticles = articles.filter(a => !a.isTrump && !a.isSports && !a.isAI);
  const trumpArticles = articles.filter(a => a.isTrump);
  const sportsArticles = articles.filter(a => a.isSports && !a.isTrump);
  const aiArticles = articles
    .filter(a => a.isAI && !a.isTrump && !a.isSports)
    .sort((a, b) => {
      // Prioritize Anthropic/Claude articles at the top
      if (a.isAnthropic && !b.isAnthropic) return -1;
      if (!a.isAnthropic && b.isAnthropic) return 1;
      return 0; // Keep original order (by date) for same priority
    });

  // Filter articles by source (excluding Trump and sports articles)
  const filteredArticles = selectedSource === 'all'
    ? regularArticles
    : regularArticles.filter(a => a.source === selectedSource);

  // Get unique sources (from regular articles only)
  const sources = ['all', ...new Set(regularArticles.map(a => a.source))];

  // Combine Trump articles from news feeds and trending
  const allTrumpContent = [...trumpArticles, ...trumpDump];

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">Latest News</h1>
          <p className="text-gray-300">Real-time headlines from trusted sources</p>
        </div>

        {/* Source Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {sources.map(source => (
            <button
              key={source}
              onClick={() => setSelectedSource(source)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSource === source
                  ? 'bg-brand-orange-dark text-white'
                  : 'bg-gray-900 text-white border-2 border-gray-700 hover:border-brand-orange-dark'
              }`}
            >
              {source === 'all' ? 'All Sources' : source}
            </button>
          ))}
        </div>

        {/* News Headlines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredArticles.map((article, index) => (
            <a
              key={index}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 rounded-lg shadow-md border-2 border-gray-700 overflow-hidden hover:shadow-xl hover:border-brand-orange-dark hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              {/* Article Image */}
              {article.image && (
                <div className="w-full h-48 overflow-hidden bg-gray-100">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-brand-orange-dark uppercase">
                    {article.source}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(article.pubDate).toLocaleDateString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <h3 className="text-lg font-serif font-bold text-white mb-2 line-clamp-3">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                    {article.description}
                  </p>
                )}
                <div className="mt-auto flex items-center text-brand-orange-dark text-sm font-medium">
                  Read more →
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* What's Trending Section */}
        {trending.filter(item => !item.isSports && !item.isTrump).length > 0 && (
          <div className="mb-12 pt-8 border-t-2 border-gray-700">
            <div className="mb-6">
              <h2 className="text-3xl font-serif font-bold text-white mb-2">What's Trending</h2>
              <p className="text-gray-300">Popular topics from Google, Reddit & YouTube</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.filter(item => !item.isSports && !item.isTrump).map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-br from-gray-800 to-gold-50 rounded-lg shadow-md border-2 border-brand-orange-dark p-4 hover:shadow-xl hover:border-brand-orange-dark hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                      item.source === 'Google Trends' ? 'bg-blue-100 text-blue-700' :
                      item.source === 'Reddit' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.source}
                    </span>
                    {item.traffic && (
                      <span className="text-xs text-gray-400">{item.traffic}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white line-clamp-2">
                    {item.title}
                  </h3>
                  {item.subreddit && (
                    <p className="text-xs text-gray-300 mt-1">r/{item.subreddit}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI News Section - Futuristic Retro Aesthetic */}
        {aiArticles.length > 0 && (
          <div className="mb-12 pt-12 border-t-4 border-double border-brand-orange relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            {/* Section Header */}
            <div className="mb-10 relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <Sparkles className="w-12 h-12 text-brand-orange animate-pulse" />
                  <div className="absolute inset-0 blur-xl bg-brand-orange-dark opacity-30 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h2 className="text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-orange-dark via-blue-600 to-brand-orange mb-1 tracking-tight" style={{
                    textShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
                  }}>
                    NEURAL FEED
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-brand-orange-dark to-transparent" />
                    <p className="text-xs font-mono uppercase tracking-widest text-brand-orange font-bold">
                      Artificial Intelligence Transmissions
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-l from-brand-orange-dark to-transparent" />
                  </div>
                </div>
                {/* Pulse indicator */}
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-orange-dark border-2 border-brand-orange rounded-full">
                  <div className="w-2 h-2 rounded-full bg-brand-orange-dark animate-pulse" />
                  <span className="text-xs font-mono font-bold text-brand-orange">{aiArticles.length} ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
              {aiArticles.map((article, index) => (
                <a
                  key={index}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-none border-4 border-brand-orange overflow-hidden hover:border-brand-orange-dark transition-all duration-300 flex flex-col shadow-2xl hover:shadow-cyan-600/50"
                  style={{
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    animation: `slideInUp 0.6s ease-out ${index * 0.1}s backwards`
                  }}
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-orange-dark" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-orange-dark" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-orange-dark" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-orange-dark" />

                  {/* Scan line effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400 to-transparent h-full animate-scan" />
                  </div>

                  {/* Article Image with overlay */}
                  {article.image && (
                    <div className="relative w-full h-48 overflow-hidden bg-gray-900">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                      {/* Data stream overlay */}
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.5) 2px, rgba(6, 182, 212, 0.5) 4px)'
                      }} />
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm relative">
                    {/* Anthropic Priority Badge */}
                    {article.isAnthropic && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg shadow-lg z-10">
                        ★ PRIORITY
                      </div>
                    )}
                    {/* Source badge with circuit pattern */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="relative text-xs font-mono font-black uppercase tracking-wider text-brand-orange bg-brand-orange-dark/80 px-3 py-1.5 border-2 border-brand-orange backdrop-blur-sm"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                          {article.source}
                          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-shimmer" />
                        </span>
                        {article.isAnthropic && (
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-900/50 px-2 py-1 border border-amber-500 rounded">
                            CLAUDE
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-brand-orange bg-gray-800/60 px-2 py-1 border border-brand-orange">
                        {new Date(article.pubDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Title with glitch effect on hover */}
                    <h3 className="text-xl font-serif font-bold text-brand-orange mb-3 line-clamp-3 group-hover:text-brand-orange-dark transition-colors duration-300 leading-tight">
                      {article.title}
                    </h3>

                    {/* Description */}
                    {article.description && (
                      <p className="text-sm text-brand-orange/80 line-clamp-2 mb-4 leading-relaxed">
                        {article.description}
                      </p>
                    )}

                    {/* Read more with arrow */}
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-brand-orange">
                      <span className="text-xs font-mono font-bold text-brand-orange uppercase tracking-wider group-hover:text-brand-orange-dark transition-colors">
                        Access Data
                      </span>
                      <div className="w-8 h-8 flex items-center justify-center border-2 border-brand-orange group-hover:border-brand-orange-dark group-hover:bg-brand-orange-dark/20 transition-all">
                        <span className="text-brand-orange group-hover:text-brand-orange-dark text-lg font-bold group-hover:translate-x-1 transition-transform inline-block">→</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Add keyframes for animations */}
            <style>{`
              @keyframes slideInUp {
                from {
                  opacity: 0;
                  transform: translateY(30px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @keyframes scan {
                0% {
                  transform: translateY(-100%);
                }
                100% {
                  transform: translateY(200%);
                }
              }

              @keyframes shimmer {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }

              .animate-scan {
                animation: scan 2s linear infinite;
              }

              .animate-shimmer {
                animation: shimmer 3s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* Trump Dump Section */}
        {allTrumpContent.length > 0 && (
          <div className="mb-12 pt-8 border-t-2 border-gray-700">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-white mb-2">The Trump Dump</h2>
                  <p className="text-gray-300">Trump-related content quarantined for your sanity</p>
                </div>
                <button
                  onClick={() => setShowTrumpDump(!showTrumpDump)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                >
                  {showTrumpDump ? 'Hide' : `Show (${allTrumpContent.length})`}
                </button>
              </div>
            </div>

            {showTrumpDump && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {allTrumpContent.map((item, index) => (
                  <a
                    key={index}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-800 rounded-lg shadow-md border-2 border-gray-600 p-4 hover:shadow-xl hover:border-gray-500 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold bg-gray-700 text-gray-300 uppercase px-2 py-1 rounded">
                        {item.source}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Today's Papers Section */}
        <div className="mb-12 pt-8 border-t-2 border-gray-700">
          <div className="mb-6">
            <h2 className="text-3xl font-serif font-bold text-white mb-2">Today's Papers</h2>
            <p className="text-gray-300">Browse latest newspaper editions</p>
          </div>

          <a
            href="https://oceanofpdf.com/magazines-newspapers/"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl border-2 border-brand-orange-dark p-8 hover:shadow-2xl hover:border-brand-orange-dark hover:-translate-y-1 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Newspaper className="w-16 h-16 text-brand-orange-dark" />
                <div>
                  <h3 className="text-2xl font-serif font-bold text-white mb-2">
                    View All Newspaper Editions
                  </h3>
                  <p className="text-brand-orange-dark">
                    Guardian, NY Times, Washington Post, New Yorker & more
                  </p>
                </div>
              </div>
              <ExternalLink className="w-8 h-8 text-brand-orange-dark" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// Quick Tasks Inner Component (used inside Focus section)
function QuickTasksInner() {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickTasks();
  }, []);

  const fetchQuickTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_tasks')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quick tasks:', error);
      setLoading(false);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quick_tasks')
        .insert({
          user_id: user.id,
          text: newTaskText.trim(),
          completed: false,
          order_index: tasks.length,
        })
        .select()
        .single();

      if (error) throw error;
      setTasks([...tasks, data]);
      setNewTaskText('');
    } catch (error) {
      console.error('Error adding quick task:', error);
    }
  };

  const toggleTask = async (task) => {
    try {
      const { error } = await supabase
        .from('quick_tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    } catch (error) {
      console.error('Error toggling quick task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('quick_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting quick task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-brand-orange-dark" />
      </div>
    );
  }

  return (
    <>
      {/* Add new task form */}
      <form onSubmit={addTask} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a quick task..."
            className="flex-1 px-4 py-2 border-2 border-brand-orange-dark rounded-lg focus:outline-none focus:border-brand-orange-dark text-white"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-brand-orange-dark transition-colors font-medium"
          >
            Add
          </button>
        </div>
      </form>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 bg-gray-900 rounded-lg p-3 border border-brand-orange-dark hover:border-brand-orange-dark transition-colors group"
          >
            <button
              onClick={() => toggleTask(task)}
              className="flex-shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 hover:text-brand-orange-dark transition-colors" />
              )}
            </button>
            <span
              className={`flex-1 ${
                task.completed ? 'line-through text-gray-400' : 'text-white'
              }`}
            >
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="text-center text-gray-300 py-4">
          No quick tasks yet. Add one above to get started!
        </p>
      )}
    </>
  );
}

// Dashboard View Component
function DashboardView({ goals, onSelectGoal, onNewGoal, calculateProgress, getTaskStats, toggleTask, animatingTasks }) {
  const [dailyCards, setDailyCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [showTarot, setShowTarot] = useState(true);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const loadCards = async () => {
      const cards = await getDailyCards();
      setDailyCards(cards);
      setCardsLoading(false);
    };
    loadCards();

    // Update current hour every minute to handle time-based repositioning
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getWeeklyDigest = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isStartOfWeek = dayOfWeek >= 0 && dayOfWeek <= 2; // Sun-Tue

    const allTasks = goals.flatMap(g =>
      g.stages?.flatMap(s => s.tasks.map(t => ({ ...t, goalTitle: g.title, goal: g }))) || []
    );

    if (isStartOfWeek) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const upcomingTasks = allTasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd;
      });

      return {
        type: 'focus',
        tasks: upcomingTasks.slice(0, 5),
      };
    } else {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      const weekEnd = new Date(today);

      const completedTasks = allTasks.filter(t => {
        if (!t.completed || !t.updated_at) return false;
        const updatedDate = new Date(t.updated_at);
        return updatedDate >= weekStart && updatedDate <= weekEnd;
      });

      return {
        type: 'review',
        tasks: completedTasks.slice(0, 5),
      };
    }
  };

  const digest = getWeeklyDigest();

  // Get recurring tasks
  const recurringGoal = goals.find(g => g.title.includes('Recurring Tasks'));
  const dailyTasks = recurringGoal?.stages?.find(s => s.name === 'Daily Tasks')?.tasks || [];
  const weeklyTasks = recurringGoal?.stages?.find(s => s.name === 'Weekly Tasks')?.tasks || [];

  const positions = ['Past', 'Present', 'Future'];

  // Determine News Digest position based on time (before or after 11am)
  const isAfter11am = currentHour >= 11;

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Weather & News */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-4 space-y-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
            <h2 className="text-xl font-serif font-bold mb-4 flex items-center text-white">
              <Sun className="w-5 h-5 mr-2 text-brand-orange-dark" />
              Today
            </h2>
            <WeatherWidget />
          </div>
          {/* News Digest - Left sidebar after 11am */}
          {isAfter11am && <NewsDigestWidget />}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        {/* News Digest - Top of main content before 11am */}
        {!isAfter11am && <NewsDigestWidget />}

        {/* Goals Section - Front and Center */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-serif font-bold text-white">Your Goals</h2>
            <button
              onClick={onNewGoal}
              className="flex items-center space-x-2 bg-brand-orange-dark text-white px-6 py-3 rounded-lg hover:bg-brand-orange-dark transition-colors shadow-md font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>New Goal</span>
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 rounded-lg shadow-md border-2 border-gray-700">
              <Target className="w-16 h-16 text-chocolate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold mb-2 text-white">No goals yet</h3>
              <p className="text-gray-300 mb-6">
                Start your journey by creating your first goal with Purpoise
              </p>
              <button
                onClick={onNewGoal}
                className="inline-flex items-center space-x-2 bg-brand-orange-dark text-white px-8 py-4 rounded-lg hover:bg-brand-orange-dark transition-colors shadow-lg font-medium text-lg"
              >
                <Plus className="w-6 h-6" />
                <span>Add Your First Goal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map(goal => {
                const progress = calculateProgress(goal);
                const stats = getTaskStats(goal);

                return (
                  <div
                    key={goal.id}
                    onClick={() => onSelectGoal(goal)}
                    className="bg-gray-900 rounded-lg shadow-md border-2 border-gray-700 p-6 cursor-pointer hover:shadow-xl hover:border-brand-orange-dark hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-serif font-bold flex-1 text-white">
                        {goal.title}
                      </h3>
                      <div className={`w-4 h-4 rounded-full ${RAG_COLORS[goal.rag_status || 'green']}`} />
                    </div>

                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {goal.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Progress</span>
                        <span className="font-bold text-brand-orange-dark">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-900 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-full h-2 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-300">
                        {stats.completed} of {stats.total} tasks completed
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recurring Tasks Widget */}
        {goals.find(g => g.title.includes('Recurring Tasks')) && (
          <RecurringTasksWidget
            goals={goals}
            onSelectGoal={onSelectGoal}
            toggleTask={toggleTask}
            animatingTasks={animatingTasks}
          />
        )}

        {/* Focus for the Week - Compact Version */}
        <div className="bg-gradient-to-r from-gold-50 to-gray-700 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center text-white">
            {digest.type === 'focus' ? '🎯 Your Focus for the Week' : '⭐ Weekly Review'}
          </h2>

          {/* Weekly Tasks */}
          {digest.tasks.length > 0 ? (
            <div className="mb-4">
              <ul className="space-y-2">
                {digest.tasks.map((task, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-brand-orange-dark font-bold">•</span>
                    <button
                      onClick={() => onSelectGoal(task.goal)}
                      className="text-left hover:text-brand-orange-dark transition-colors"
                    >
                      <span className="font-medium text-white">{task.text}</span>
                      <span className="text-sm text-gray-300 ml-2">({task.goalTitle})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-300 mb-4">
              {digest.type === 'focus'
                ? 'No tasks due this week. Time to plan ahead!'
                : 'No tasks completed this week yet. Keep going!'}
            </p>
          )}

          {/* Quick Tasks Section */}
          <div className="pt-4 border-t-2 border-brand-orange-dark">
            <h3 className="text-xl font-serif font-bold mb-4 flex items-center text-white">
              <CheckCircle2 className="w-5 h-5 mr-2 text-brand-orange-dark" />
              Quick Tasks
            </h3>

            <QuickTasksInner />
          </div>
        </div>
      </div>

      {/* Tarot Sidebar */}
      {!cardsLoading && dailyCards.length > 0 && showTarot && (
        <div className="w-96 flex-shrink-0">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-bold flex items-center text-white">
                <Sparkles className="w-5 h-5 mr-2 text-brand-orange-dark" />
                Daily Tarot
              </h2>
              <button
                onClick={() => setShowTarot(false)}
                className="p-1 hover:bg-gray-900/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-brand-orange-dark" />
              </button>
            </div>
            <p className="text-xs text-brand-orange-dark mb-4">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="space-y-3 mb-4">
              {dailyCards.map((card, index) => (
                <div key={index} className="bg-gray-900/10 backdrop-blur-sm rounded-lg p-3 border border-brand-orange-dark/30">
                  <div className="flex gap-3 mb-2">
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-16 h-24 object-contain rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="text-3xl">🎴</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-brand-orange-dark mb-1">{positions[index]}</p>
                      <p className="text-sm font-bold text-white">{card.name}</p>
                      {card.suit && <p className="text-xs text-brand-orange-dark">{card.suit}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View Detailed Interpretation Link */}
            <a
              href="https://sidhe.netlify.app/daily"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-center text-sm text-brand-orange-dark hover:text-brand-orange-dark underline"
            >
              View Detailed Interpretations →
            </a>

            <p className="text-xs text-brand-orange-dark/70 mt-3 text-center">
              Celtic Seasonal Tarot from Sídhe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// News Digest Widget Component
function NewsDigestWidget() {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        const response = await axios.get(`${API_URL}/news-feeds?source=bbc`);
        // The API returns 'articles' not 'items'
        if (response.data && response.data.articles && Array.isArray(response.data.articles)) {
          setHeadlines(response.data.articles.slice(0, 5));
        } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
          // Fallback to 'items' for backward compatibility
          setHeadlines(response.data.items.slice(0, 5));
        } else {
          console.error('Unexpected response structure:', response.data);
          setError(true);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchHeadlines();
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-serif font-bold flex items-center text-white">
          <Newspaper className="w-5 h-5 mr-2 text-brand-orange-dark" />
          News Digest
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-brand-orange-dark" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-sm text-gray-500">
          Unable to load news
        </div>
      ) : headlines.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">
          No headlines available
        </div>
      ) : (
        <div className="space-y-2">
          {headlines.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 rounded-full bg-brand-orange-dark mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-300 group-hover:text-brand-orange-dark transition-colors line-clamp-2">
                  {item.title}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Recurring Tasks Widget Component
function RecurringTasksWidget({ goals, onSelectGoal, toggleTask, animatingTasks }) {
  const recurringGoal = goals.find(g => g.title.includes('Recurring Tasks'));
  if (!recurringGoal) return null;

  const dailyStage = recurringGoal?.stages?.find(s => s.name === 'Daily Tasks');
  const weeklyStage = recurringGoal?.stages?.find(s => s.name === 'Weekly Tasks');
  const dailyTasks = dailyStage?.tasks || [];
  const weeklyTasks = weeklyStage?.tasks || [];

  const completedDaily = dailyTasks.filter(t => t.completed).length;
  const completedWeekly = weeklyTasks.filter(t => t.completed).length;

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-bold flex items-center text-white">
          <Repeat className="w-6 h-6 mr-2 text-brand-orange-dark" />
          Recurring Tasks
        </h2>
        <button
          onClick={() => onSelectGoal(recurringGoal)}
          className="text-sm px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
        >
          Manage
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xl flex items-center text-white">
              <Sun className="w-5 h-5 mr-2 text-orange-500" />
              Daily Tasks
            </h3>
            <span className="text-sm font-semibold text-gray-300">
              {completedDaily}/{dailyTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {dailyTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No daily tasks yet</p>
            ) : (
              dailyTasks.map((task, idx) => {
                const isAnimating = animatingTasks.has(task.id);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleTask(task, dailyStage.id)}
                    className={`w-full flex items-center space-x-3 p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-all text-left ${
                      isAnimating ? 'scale-105 ring-2 ring-brand-orange-dark ring-opacity-50' : ''
                    }`}
                    style={{
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                    }}
                  >
                    <div className={isAnimating ? 'animate-bounce' : ''}>
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-brand-orange-dark flex-shrink-0" />
                      )}
                    </div>
                    <span className={task.completed ? 'line-through text-gray-400' : 'text-white'}>
                      {task.text}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Weekly Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xl flex items-center text-white">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />
              Weekly Tasks
            </h3>
            <span className="text-sm font-semibold text-gray-300">
              {completedWeekly}/{weeklyTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {weeklyTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No weekly tasks yet</p>
            ) : (
              weeklyTasks.map((task, idx) => {
                const isAnimating = animatingTasks.has(task.id);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleTask(task, weeklyStage.id)}
                    className={`w-full flex items-center space-x-3 p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-all text-left ${
                      isAnimating ? 'scale-105 ring-2 ring-brand-orange-dark ring-opacity-50' : ''
                    }`}
                    style={{
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                    }}
                  >
                    <div className={isAnimating ? 'animate-bounce' : ''}>
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-brand-orange-dark flex-shrink-0" />
                      )}
                    </div>
                    <span className={task.completed ? 'line-through text-gray-400' : 'text-white'}>
                      {task.text}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Goal Detail View Component
function GoalDetailView({ goal, onBack, onDelete, onUpdateRAG, toggleTask, calculateProgress, animatingTasks, loadGoals, setSelectedGoal }) {
  const progress = calculateProgress(goal);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description);
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('goals')
        .update({
          title: editTitle,
          description: editDescription,
        })
        .eq('id', goal.id);

      if (error) throw error;

      // Reload goals to get the updated data
      await loadGoals();

      // Update the selected goal with new values
      setSelectedGoal(prev => ({
        ...prev,
        title: editTitle,
        description: editDescription,
      }));

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-4xl font-serif font-bold border-2 border-brand-orange-dark rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vintage-orange"
          />
        ) : (
          <h1 className="text-4xl font-serif font-bold flex-1">{goal.title}</h1>
        )}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit goal"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Goal Info Card */}
      <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className="w-full text-gray-700 mb-6 border-2 border-brand-orange-dark rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vintage-orange"
          />
        ) : (
          <p className="text-gray-300 mb-6">{goal.description}</p>
        )}

        {isEditing && (
          <div className="flex space-x-3 mb-6">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-brand-orange-dark">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-brand-orange-dark rounded-full h-3 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center space-x-4 pt-4 border-t">
            <span className="font-medium">RAG Status:</span>
            <div className="flex space-x-2">
              {['green', 'amber', 'red'].map(status => (
                <button
                  key={status}
                  onClick={() => onUpdateRAG(goal.id, status)}
                  className={`w-8 h-8 rounded-full ${RAG_COLORS[status]} ${
                    goal.rag_status === status ? 'ring-4 ring-dark-brown ring-opacity-30' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stages and Tasks */}
      <div className="space-y-6">
        {goal.stages?.map((stage, stageIdx) => (
          <div key={stage.id} className="bg-gray-900 rounded-lg shadow-md border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-serif font-bold mb-4">
              Stage {stageIdx + 1}: {stage.name}
            </h2>
            <div className="space-y-3">
              {stage.tasks?.map(task => {
                const isAnimating = animatingTasks.has(task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task, stage.id)}
                    className={`w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-all text-left ${
                      isAnimating ? 'scale-105 ring-2 ring-vintage-orange ring-opacity-50' : ''
                    }`}
                    style={{
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                    }}
                  >
                    <div className={`mt-1 flex-shrink-0 ${isAnimating ? 'animate-bounce' : ''}`}>
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-brand-orange-dark" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`${task.completed ? 'line-through text-gray-400' : ''}`}>
                        {task.text}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded border ${CATEGORY_COLORS[task.category]}`}>
                          {task.category}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(task.due_date).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        {task.category === 'habit' && task.streak > 0 && (
                          <span className="text-xs font-bold text-brand-orange-dark">
                            🔥 {task.streak} day streak
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Calendar View Component
function CalendarView({ goals, currentDate, setCurrentDate }) {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const allTasks = goals.flatMap(g =>
      g.stages?.flatMap(s =>
        s.tasks
          .filter(t => t.due_date === dateStr)
          .map(t => ({ ...t, goalTitle: g.title }))
      ) || []
    );
    return allTasks;
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border-2 border-brand-orange-dark p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-serif font-bold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center font-bold text-sm py-2 text-gray-600">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const date = new Date(year, month, day);
          const tasks = getTasksForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div
              key={day}
              className={`aspect-square border-2 rounded-lg p-2 ${
                isToday ? 'border-brand-orange-dark bg-orange-50' : 'border-gray-200'
              }`}
            >
              <div className={`text-sm font-bold mb-1 ${isToday ? 'text-brand-orange-dark' : ''}`}>
                {day}
              </div>
              <div className="space-y-1">
                {tasks.slice(0, 2).map((task, taskIdx) => (
                  <div
                    key={taskIdx}
                    className={`text-xs p-1 rounded truncate ${CATEGORY_COLORS[task.category]}`}
                    title={`${task.goalTitle}: ${task.text}`}
                  >
                    {task.text}
                  </div>
                ))}
                {tasks.length > 2 && (
                  <div className="text-xs text-gray-500">+{tasks.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// New Goal Modal Component
function NewGoalModal({ onClose, onGoalCreated, userId, goals }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useState(null)[0];

  useEffect(() => {
    // Initial greeting
    const greeting = goals && goals.length > 0
      ? "Hello! I'm Purpoise, your goal-setting assistant. I can see you have some existing goals. Would you like to create a new goal or modify an existing one?"
      : "Hello! I'm Purpoise, your goal-setting assistant. What goal would you like to work towards?";

    setMessages([
      {
        role: 'assistant',
        content: greeting,
      },
    ]);
  }, [goals]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        messages: newMessages,
        goals: goals || [],
      });

      const data = response.data;

      if (data.isFinal) {
        if (data.action === 'create') {
          // Create new goal
          await createGoal(data.plan);
          onGoalCreated();
        } else if (data.action === 'update') {
          // Update existing goal
          await updateGoal(data.goalTitle, data.updates);
          onGoalCreated();
        } else {
          // Backward compatibility - if no action specified, assume create
          await createGoal(data.plan);
          onGoalCreated();
        }
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.question }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (plan) => {
    try {
      // Insert goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: plan.title,
          description: plan.description,
          rag_status: 'green',
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Insert stages and tasks
      for (let i = 0; i < plan.stages.length; i++) {
        const stageData = plan.stages[i];

        const { data: stage, error: stageError } = await supabase
          .from('stages')
          .insert({
            goal_id: goal.id,
            name: stageData.name,
            order_index: i,
          })
          .select()
          .single();

        if (stageError) throw stageError;

        // Insert tasks for this stage
        const tasksToInsert = stageData.tasks.map((task, j) => ({
          stage_id: stage.id,
          text: task.text,
          category: task.category,
          completed: task.completed || false,
          due_date: task.dueDate || null,
          order_index: j,
          streak: 0,
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  };

  const updateGoal = async (goalTitle, updates) => {
    try {
      // Find the goal by title
      const goal = goals.find(g => g.title === goalTitle);
      if (!goal) {
        throw new Error(`Goal not found: ${goalTitle}`);
      }

      // Update goal metadata if provided
      if (updates.title || updates.description) {
        const { error } = await supabase
          .from('goals')
          .update({
            ...(updates.title && { title: updates.title }),
            ...(updates.description && { description: updates.description }),
          })
          .eq('id', goal.id);
        if (error) throw error;
      }

      // Add new tasks
      if (updates.addTasks && updates.addTasks.length > 0) {
        for (const taskUpdate of updates.addTasks) {
          const stage = goal.stages[taskUpdate.stageIndex];
          if (!stage) continue;

          const { error } = await supabase
            .from('tasks')
            .insert({
              stage_id: stage.id,
              text: taskUpdate.task.text,
              category: taskUpdate.task.category,
              completed: false,
              due_date: taskUpdate.task.dueDate || null,
              order_index: stage.tasks.length,
              streak: 0,
            });
          if (error) throw error;
        }
      }

      // Remove tasks
      if (updates.removeTasks && updates.removeTasks.length > 0) {
        for (const removal of updates.removeTasks) {
          const stage = goal.stages[removal.stageIndex];
          if (!stage) continue;
          const task = stage.tasks[removal.taskIndex];
          if (!task) continue;

          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', task.id);
          if (error) throw error;
        }
      }

      // Update existing tasks
      if (updates.updateTasks && updates.updateTasks.length > 0) {
        for (const taskUpdate of updates.updateTasks) {
          const stage = goal.stages[taskUpdate.stageIndex];
          if (!stage) continue;
          const task = stage.tasks[taskUpdate.taskIndex];
          if (!task) continue;

          const { error } = await supabase
            .from('tasks')
            .update({
              ...(taskUpdate.updates.text && { text: taskUpdate.updates.text }),
              ...(taskUpdate.updates.category && { category: taskUpdate.updates.category }),
              ...(taskUpdate.updates.completed !== undefined && { completed: taskUpdate.updates.completed }),
              ...(taskUpdate.updates.dueDate && { due_date: taskUpdate.updates.dueDate }),
            })
            .eq('id', task.id);
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-brand-orange-dark">
          <div className="flex items-center space-x-3">
            <img
              src="/porpoise-logo.jpg"
              alt="Purpoise"
              className="h-10 w-10 object-cover rounded-lg"
            />
            <h2 className="text-2xl font-serif font-bold">Create New Goal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => {
            // Try to parse as JSON for better formatting
            let isJSON = false;
            let parsedContent = null;
            try {
              parsedContent = JSON.parse(msg.content);
              isJSON = true;
            } catch (e) {
              // Not JSON, display as regular text
            }

            return (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-brand-orange-dark text-white'
                      : 'bg-gray-100 text-white'
                  }`}
                >
                  {isJSON ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                      {JSON.stringify(parsedContent, null, 2)}
                    </pre>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-orange-dark" />
              </div>
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={(el) => { if (el) el.scrollIntoView({ behavior: 'smooth' }); }} />
        </div>

        {/* Input */}
        <div className="p-6 border-t">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your response..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand-orange-dark"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-brand-orange-dark text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
