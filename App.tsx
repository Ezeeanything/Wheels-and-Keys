
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import { Activity, Submission, ActivityCategory } from './types';
import { getPayrollPeriod, formatDate, isDeadlineApproaching } from './utils/dateUtils';
import { 
  optimizeActivityDescription, 
  suggestCategory, 
  generatePeriodSubmissionSummary 
} from './services/geminiService';
import { mockBackend } from './services/mockBackend';
import { 
  Plus, 
  Trash2, 
  Send, 
  Sparkles, 
  Loader2, 
  Search,
  ChevronDown,
  Filter,
  CheckCircle,
  Clock,
  Car,
  Key,
  HelpCircle,
  FileText,
  ClipboardList,
  Settings,
  Calendar,
  Zap,
  RefreshCw,
  Info,
  Download,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { jsPDF } from 'jspdf';

const CATEGORIES: ActivityCategory[] = ['Maintenance', 'Customer Service', 'Locksmith', 'Transport', 'Admin', 'Other'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);

  // Form states
  const [newTask, setNewTask] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState<ActivityCategory>('Maintenance');
  const [newHours, setNewHours] = useState(1);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const currentPeriod = useMemo(() => getPayrollPeriod(), []);
  
  const isSubmissionDay = useMemo(() => {
    const day = new Date().getDate();
    return day === 14 || day === 29;
  }, []);

  // Initial Load
  useEffect(() => {
    const savedActivities = localStorage.getItem('wk_activities');
    const savedSubmissions = localStorage.getItem('wk_submissions');
    if (savedActivities) setActivities(JSON.parse(savedActivities));
    if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
  }, []);

  // Automated "Backend" Sync
  useEffect(() => {
    localStorage.setItem('wk_activities', JSON.stringify(activities));
    
    // Simulate automated cloud sync every change
    const performSync = async () => {
      setSyncing(true);
      await mockBackend.syncActivities(activities);
      setSyncing(false);
    };
    
    const timeout = setTimeout(performSync, 1000);
    return () => clearTimeout(timeout);
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('wk_submissions', JSON.stringify(submissions));
  }, [submissions]);

  const currentPeriodActivities = useMemo(() => activities.filter(a => {
    const d = new Date(a.date);
    return !a.submitted && d >= currentPeriod.start && d <= currentPeriod.end;
  }), [activities, currentPeriod]);

  const totalHours = currentPeriodActivities.reduce((acc, curr) => acc + curr.durationHours, 0);

  const handleAddActivity = () => {
    if (!newTask) return;
    const activity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      date: newDate,
      category: newCat,
      task: newTask,
      description: newDesc,
      durationHours: Number(newHours),
      submitted: false
    };
    setActivities([activity, ...activities]);
    setNewTask('');
    setNewDesc('');
  };

  const handleSuggestCategory = async () => {
    if (!newTask) return;
    setSuggestingCategory(true);
    const suggested = await suggestCategory(newTask);
    setNewCat(suggested);
    setSuggestingCategory(false);
  };

  const handleOptimizeDescription = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    setOptimizingId(id);
    const optimized = await optimizeActivityDescription(activity.task, activity.description);
    setActivities(activities.map(a => a.id === id ? { ...a, description: optimized } : a));
    setOptimizingId(null);
  };

  const handleDownloadReport = async (acts: Activity[], label: string) => {
    if (acts.length === 0) return;
    setLoading(true);
    try {
      const summary = await generatePeriodSubmissionSummary(acts);
      const doc = new jsPDF();
      
      // Professional Header Design
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("WHEELS & KEYS", 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("helvetica", "normal");
      doc.text("STAFF PERFORMANCE & ACTIVITY REPORT", 20, 28);
      
      // Period Information
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTING PERIOD:", 20, 55);
      doc.setFont("helvetica", "normal");
      doc.text(label, 70, 55);
      
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL HOURS LOGGED:", 20, 62);
      doc.setFont("helvetica", "normal");
      const total = acts.reduce((acc, curr) => acc + curr.durationHours, 0);
      doc.text(`${total.toFixed(1)} Hours`, 70, 62);
      
      doc.setFont("helvetica", "bold");
      doc.text("GENERATED ON:", 20, 69);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleString(), 70, 69);
      
      // AI Executive Summary
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(20, 78, 170, 35, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text("AI EXECUTIVE SUMMARY", 25, 86);
      
      doc.setFont("helvetica", "italic");
      doc.setTextColor(71, 85, 105); // slate-600
      const splitSummary = doc.splitTextToSize(summary, 160);
      doc.text(splitSummary, 25, 93);
      
      // Activity Table Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("DETAILED ACTIVITY LOG", 20, 130);
      doc.line(20, 132, 190, 132);
      
      let y = 142;
      acts.forEach((a, i) => {
        // Page break logic
        if (y > 270) {
          doc.addPage();
          y = 25;
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(`${i + 1}. ${a.task.toUpperCase()}`, 20, y);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`${a.date} | ${a.durationHours}h`, 190, y, { align: 'right' });
        
        y += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105); // slate-600
        const details = a.description || "No specific details logged.";
        const splitDetails = doc.splitTextToSize(details, 160);
        doc.text(splitDetails, 25, y);
        
        y += (splitDetails.length * 4) + 8;
        
        // Separator
        doc.setDrawColor(241, 245, 249);
        doc.line(25, y - 4, 190, y - 4);
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Wheels & Keys Internal Personnel Document - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      }

      doc.save(`WK_Report_${label.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPeriod = async () => {
    if (currentPeriodActivities.length === 0) return;
    
    setLoading(true);
    const submissionId = Math.random().toString(36).substr(2, 9);
    const newSubmission: Submission = {
      id: submissionId,
      periodStart: currentPeriod.start.toISOString(),
      periodEnd: currentPeriod.end.toISOString(),
      submittedAt: new Date().toISOString(),
      totalHours: totalHours,
      activityCount: currentPeriodActivities.length,
      activities: currentPeriodActivities,
      status: 'Pending'
    };

    const result = await mockBackend.submitPayroll(newSubmission);
    
    if (result.success) {
      setSubmissions([newSubmission, ...submissions]);
      setActivities(activities.map(a => {
        if (currentPeriodActivities.find(cpa => cpa.id === a.id)) {
          return { ...a, submitted: true, submissionId };
        }
        return a;
      }));
      setLoading(false);
      setActiveTab('history');
    }
  };

  const deleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    currentPeriodActivities.forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + a.durationHours;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [currentPeriodActivities]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Staff Dashboard</h2>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Current Period: <span className="font-semibold text-blue-600">{currentPeriod.label}</span></span>
            {syncing && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                <RefreshCw size={10} className="animate-spin" /> Cloud Sync
              </span>
            )}
          </div>
        </div>
      </div>

      <StatsCards 
        totalHours={totalHours} 
        activityCount={currentPeriodActivities.length}
        deadline={formatDate(currentPeriod.deadline)}
        isUrgent={isDeadlineApproaching(currentPeriod.deadline)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="text-blue-500" size={20} />
            Period Activity Breakdown
          </h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <FileText size={48} strokeWidth={1} />
                <p>No hours logged this period</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
               Automation Hub <Zap className="text-amber-400 fill-amber-400" size={20} />
            </h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Official reports are generated in PDF format. Submit your logs on the <span className="text-white font-medium">14th or 29th</span> for automated payroll processing.
            </p>
            <div className="grid grid-cols-1 gap-3">
               <button 
                onClick={() => handleDownloadReport(currentPeriodActivities, currentPeriod.label)}
                disabled={currentPeriodActivities.length === 0 || loading}
                className={`w-full font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isSubmissionDay 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isSubmissionDay ? 'Download Final PDF Report' : 'Download Draft PDF'}
              </button>
               <button 
                onClick={() => setActiveTab('logs')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Quick Log Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
          <div className="flex items-center gap-2 text-slate-500">
             <Info size={14} className="text-blue-500" />
             <p className="text-sm">Compile and submit your logs by the <strong>14th</strong> and <strong>29th</strong>.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
            onClick={() => handleDownloadReport(currentPeriodActivities, currentPeriod.label)}
            disabled={currentPeriodActivities.length === 0 || loading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            Download PDF
          </button>
          <button 
            onClick={handleSubmitPeriod}
            disabled={currentPeriodActivities.length === 0 || loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            Submit Period Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="text-blue-500" size={20} />
              Add Activity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g. Master Key Setup"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  />
                  <button 
                    onClick={handleSuggestCategory}
                    disabled={!newTask || suggestingCategory}
                    className="absolute right-3 top-2.5 text-blue-500 hover:text-blue-700 disabled:opacity-30"
                  >
                    {suggestingCategory ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as ActivityCategory)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hours</label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  rows={4}
                  placeholder="What exactly did you do?..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <button 
                onClick={handleAddActivity}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-slate-800">Current Period ({currentPeriodActivities.length})</h3>
          </div>

          {currentPeriodActivities.length === 0 ? (
            <div className="bg-white rounded-2xl p-20 text-center border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
              <ClipboardList size={48} className="text-slate-200" />
              <div className="max-w-xs">
                <p className="font-bold text-slate-400 text-lg mb-2">No activities yet</p>
                <p className="text-sm text-slate-300">Log your daily tasks here to prepare for your bi-monthly submission.</p>
              </div>
            </div>
          ) : (
            currentPeriodActivities.map((act) => (
              <div key={act.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${
                      act.category === 'Locksmith' ? 'bg-amber-100 text-amber-600' :
                      act.category === 'Transport' ? 'bg-blue-100 text-blue-600' :
                      act.category === 'Maintenance' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {act.category === 'Locksmith' ? <Key size={20} /> :
                       act.category === 'Transport' ? <Car size={20} /> :
                       act.category === 'Maintenance' ? <Settings size={20} /> :
                       <HelpCircle size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{act.task}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2 mt-0.5">
                        <Calendar size={12} /> {formatDate(act.date)} • <Clock size={12} /> {act.durationHours} hours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOptimizeDescription(act.id)}
                      disabled={optimizingId === act.id}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {optimizingId === act.id ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    </button>
                    <button 
                      onClick={() => deleteActivity(act.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-4 text-sm text-slate-600 leading-relaxed border border-slate-200/50 italic">
                  {act.description || 'No description provided.'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Submission History</h2>
          <p className="text-slate-500">Access and download your previous bi-monthly reports in PDF.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 flex flex-col items-center gap-4">
            <History size={48} className="text-slate-200" />
            <p className="text-slate-400 font-medium">No submission history found.</p>
          </div>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {formatDate(sub.periodStart)} - {formatDate(sub.periodEnd)}
                    </h3>
                    <p className="text-sm text-slate-500">Submitted {formatDate(sub.submittedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Hours</p>
                    <p className="font-bold text-slate-800 text-xl">{sub.totalHours}h</p>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-xs font-bold inline-flex items-center gap-2 ${
                    sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    <CheckCircle size={14} />
                    {sub.status}
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col md:flex-row gap-8">
                 <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Sparkles size={12} className="text-blue-500" /> AI Executive Summary
                    </h4>
                    <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50 text-slate-700 text-sm leading-relaxed italic">
                       Professional period completed with {sub.activityCount} recorded tasks. Major contributions in {sub.activities[0]?.category || 'Operations'}.
                    </div>
                 </div>
                 <div className="md:w-64 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Report Actions</h4>
                    <button 
                      onClick={() => handleDownloadReport(sub.activities, `${formatDate(sub.periodStart)} - ${formatDate(sub.periodEnd)}`)}
                      className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-blue-200 transition-all flex items-center justify-between"
                    >
                       Download PDF Report <Download size={16} className="text-blue-500" />
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between">
                       View Detailed Log <ChevronDown size={16} className="text-slate-400" />
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'logs' && renderLogs()}
      {activeTab === 'history' && renderHistory()}
    </Layout>
  );
};

export default App;
