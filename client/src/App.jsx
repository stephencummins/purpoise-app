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
} from 'lucide-react';

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
          redirectTo: window.location.origin
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
    } catch (error) {
      console.error('Error loading goals:', error);
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

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
      await loadGoals();
    } catch (error) {
      console.error('Error toggling task:', error);
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-vintage-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-dark-brown">
      {/* Header */}
      <header className="bg-white border-b-4 border-vintage-orange shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/porpoise-logo.jpg"
                alt="Purpoise"
                className="h-12 w-12 object-cover rounded-lg"
              />
              <h1 className="text-3xl font-serif font-bold text-dark-brown">
                Purpoise
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'dashboard'
                      ? 'bg-vintage-orange text-white'
                      : 'text-dark-brown hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'calendar'
                      ? 'bg-vintage-orange text-white'
                      : 'text-dark-brown hover:bg-gray-100'
                  }`}
                >
                  <CalendarIcon className="w-5 h-5 inline-block mr-1" />
                  Calendar
                </button>
              </nav>

              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-dark-brown">
                    {user.email || 'Signed in'}
                  </span>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-dark-brown hover:bg-gray-300 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="px-4 py-2 rounded-lg font-medium bg-vintage-orange text-white hover:bg-opacity-90 transition-colors flex items-center space-x-2"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          />
        )}

        {view === 'calendar' && (
          <CalendarView
            goals={goals}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}
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

// Dashboard View Component
function DashboardView({ goals, onSelectGoal, onNewGoal, calculateProgress, getTaskStats }) {
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

  return (
    <div className="space-y-8">
      {/* Weekly Digest */}
      <div className="bg-white rounded-lg shadow-lg border-2 border-vintage-orange p-6">
        <h2 className="text-2xl font-serif font-bold mb-4">
          {digest.type === 'focus' ? '🎯 Your Focus for the Week' : '⭐ Weekly Review'}
        </h2>
        {digest.tasks.length > 0 ? (
          <ul className="space-y-2">
            {digest.tasks.map((task, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-vintage-orange font-bold">•</span>
                <button
                  onClick={() => onSelectGoal(task.goal)}
                  className="text-left hover:text-vintage-orange transition-colors"
                >
                  <span className="font-medium">{task.text}</span>
                  <span className="text-sm text-gray-600 ml-2">({task.goalTitle})</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">
            {digest.type === 'focus'
              ? 'No tasks due this week. Time to plan ahead!'
              : 'No tasks completed this week yet. Keep going!'}
          </p>
        )}
      </div>

      {/* Goals Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold">Your Goals</h2>
          <button
            onClick={onNewGoal}
            className="flex items-center space-x-2 bg-vintage-orange text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Goal</span>
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-serif font-bold mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">
              Start your journey by creating your first goal with Purpoise
            </p>
            <button
              onClick={onNewGoal}
              className="inline-flex items-center space-x-2 bg-vintage-orange text-white px-8 py-4 rounded-lg hover:bg-orange-600 transition-colors shadow-lg font-medium text-lg"
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
                  className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-serif font-bold flex-1">
                      {goal.title}
                    </h3>
                    <div className={`w-4 h-4 rounded-full ${RAG_COLORS[goal.rag_status || 'green']}`} />
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {goal.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-bold text-vintage-orange">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-vintage-orange rounded-full h-2 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      {stats.completed} of {stats.total} tasks completed
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Goal Detail View Component
function GoalDetailView({ goal, onBack, onDelete, onUpdateRAG, toggleTask, calculateProgress }) {
  const progress = calculateProgress(goal);

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
        <h1 className="text-4xl font-serif font-bold flex-1">{goal.title}</h1>
      </div>

      {/* Goal Info Card */}
      <div className="bg-white rounded-lg shadow-lg border-2 border-vintage-orange p-6">
        <p className="text-gray-700 mb-6">{goal.description}</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-vintage-orange">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-vintage-orange rounded-full h-3 transition-all duration-300"
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
          <div key={stage.id} className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-serif font-bold mb-4">
              Stage {stageIdx + 1}: {stage.name}
            </h2>
            <div className="space-y-3">
              {stage.tasks?.map(task => (
                <div
                  key={task.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <button
                    onClick={() => toggleTask(task, stage.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
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
                        <span className="text-xs font-bold text-vintage-orange">
                          🔥 {task.streak} day streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
    <div className="bg-white rounded-lg shadow-lg border-2 border-vintage-orange p-6">
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
                isToday ? 'border-vintage-orange bg-orange-50' : 'border-gray-200'
              }`}
            >
              <div className={`text-sm font-bold mb-1 ${isToday ? 'text-vintage-orange' : ''}`}>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-vintage-orange">
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
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-vintage-orange text-white'
                    : 'bg-gray-100 text-dark-brown'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-vintage-orange" />
              </div>
            </div>
          )}
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
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-vintage-orange"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-vintage-orange text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
