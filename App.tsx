
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronDown,
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
  History,
  Target,
  AlertCircle,
  TrendingUp,
  Save
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Form states - Comprehensive Reporting
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTask, setNewTask] = useState('');
  const [newCat, setNewCat] = useState<ActivityCategory>('Maintenance');
  const [newHours, setNewHours] = useState(1);
  const [formData, setFormData] = useState({
    accomplishments: '',
    positiveImpact: '',
    challenges: '',
    overcomingChallenges: '',
    futurePlans: '',
    achievementStrategy: '',
    achievementTimeframe: '',
    companyBenefit: ''
  });

  // Ref to track current form state for auto-save without dependency loops
  const formStateRef = useRef({ newDate, newTask, newCat, newHours, formData });
  
  useEffect(() => {
    formStateRef.current = { newDate, newTask, newCat, newHours, formData };
  }, [newDate, newTask, newCat, newHours, formData]);

  const currentPeriod = useMemo(() => getPayrollPeriod(), []);
  
  const isSubmissionDay = useMemo(() => {
    const day = new Date().getDate();
    return day === 14 || day === 29;
  }, []);

  // Initial Load & Draft Restoration
  useEffect(() => {
    const savedActivities = localStorage.getItem('wk_activities');
    const savedSubmissions = localStorage.getItem('wk_submissions');
    const savedDraft = localStorage.getItem('wk_form_draft');

    if (savedActivities) setActivities(JSON.parse(savedActivities));
    if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setNewDate(draft.newDate || new Date().toISOString().split('T')[0]);
        setNewTask(draft.newTask || '');
        setNewCat(draft.newCat || 'Maintenance');
        setNewHours(draft.newHours || 1);
        setFormData(draft.formData || {
          accomplishments: '', positiveImpact: '', challenges: '', 
          overcomingChallenges: '', futurePlans: '', achievementStrategy: '', 
          achievementTimeframe: '', companyBenefit: ''
        });
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, []);

  // Auto-save logic (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const state = formStateRef.current;
      // Only save if there's actually some content to save
      if (state.newTask || state.formData.accomplishments) {
        localStorage.setItem('wk_form_draft', JSON.stringify(state));
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('wk_activities', JSON.stringify(activities));
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
    if (!newTask || !formData.accomplishments) return;
    const activity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      date: newDate,
      category: newCat,
      task: newTask,
      ...formData,
      durationHours: Number(newHours),
      submitted: false
    };
    setActivities([activity, ...activities]);
    
    // Reset form and clear draft
    setNewTask('');
    setFormData({
      accomplishments: '',
      positiveImpact: '',
      challenges: '',
      overcomingChallenges: '',
      futurePlans: '',
      achievementStrategy: '',
      achievementTimeframe: '',
      companyBenefit: ''
    });
    localStorage.removeItem('wk_form_draft');
    setLastSaved(null);
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
    const optimized = await optimizeActivityDescription(activity);
    setActivities(activities.map(a => a.id === id ? { ...a, ...optimized } as Activity : a));
    setOptimizingId(null);
  };

  const handleDownloadReport = async (acts: Activity[], label: string) => {
    if (acts.length === 0) return;
    setLoading(true);
    try {
      const summary = await generatePeriodSubmissionSummary(acts);
      const doc = new jsPDF();
      
      // Professional Header Design
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("WHEELS & KEYS", 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); 
      doc.text("EXECUTIVE PERFORMANCE & STRATEGIC REPORT", 20, 34);
      
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PERIOD:", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(label, 60, 60);
      
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL TIME:", 20, 66);
      doc.setFont("helvetica", "normal");
      doc.text(`${acts.reduce((acc, curr) => acc + curr.durationHours, 0).toFixed(1)} Hours`, 60, 66);
      
      doc.setFont("helvetica", "bold");
      doc.text("EXPORT DATE:", 20, 72);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleString(), 60, 72);
      
      // AI Executive Summary
      doc.setFillColor(248, 250, 252); 
      doc.setDrawColor(37, 99, 235);
      doc.roundedRect(20, 82, 170, 38, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("STRATEGIC SUMMARY", 25, 90);
      
      doc.setFont("helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      const splitSummary = doc.splitTextToSize(summary, 160);
      doc.text(splitSummary, 25, 97);
      
      let y = 135;
      acts.forEach((a, i) => {
        if (y > 240) { doc.addPage(); y = 25; }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${i + 1}. ${a.task.toUpperCase()}`, 20, y);
        
        y += 8;
        doc.setFontSize(9);
        
        // Section: Achievements
        doc.setFont("helvetica", "bold"); doc.text("ACCOMPLISHMENTS & IMPACT:", 25, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const accText = doc.splitTextToSize(`${a.accomplishments} - Impact: ${a.positiveImpact}`, 170);
        doc.text(accText, 30, y);
        y += (accText.length * 4.5) + 4;

        // Section: Challenges
        doc.setFont("helvetica", "bold"); doc.text("CHALLENGES & RESOLUTION:", 25, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const chalText = doc.splitTextToSize(`${a.challenges} - Resolution: ${a.overcomingChallenges}`, 170);
        doc.text(chalText, 30, y);
        y += (chalText.length * 4.5) + 4;

        // Section: Future
        doc.setFont("helvetica", "bold"); doc.text("FUTURE INITIATIVES & STRATEGY:", 25, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const futText = doc.splitTextToSize(`${a.futurePlans} (${a.achievementTimeframe}) - Strategy: ${a.achievementStrategy}`, 170);
        doc.text(futText, 30, y);
        y += (futText.length * 4.5) + 4;

        // Section: Company Benefit
        doc.setFont("helvetica", "bold"); doc.text("COMPANY BENEFIT:", 25, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const benText = doc.splitTextToSize(a.companyBenefit, 170);
        doc.text(benText, 30, y);
        y += (benText.length * 4.5) + 8;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(20, y - 4, 190, y - 4);
      });
      
      doc.save(`WK_Report_${label.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF.");
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
      setActivities(activities.map(a => currentPeriodActivities.find(cpa => cpa.id === a.id) ? { ...a, submitted: true, submissionId } : a));
      setLoading(false);
      setActiveTab('history');
    }
  };

  const deleteActivity = (id: string) => setActivities(activities.filter(a => a.id !== id));

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    currentPeriodActivities.forEach(a => counts[a.category] = (counts[a.category] || 0) + a.durationHours);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [currentPeriodActivities]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Staff Dashboard</h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span>Cycle: <span className="font-semibold text-blue-600">{currentPeriod.label}</span></span>
            {syncing && <span className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse"><RefreshCw size={10} className="animate-spin" /> Syncing</span>}
          </div>
        </div>
      </div>
      <StatsCards totalHours={totalHours} activityCount={currentPeriodActivities.length} deadline={formatDate(currentPeriod.deadline)} isUrgent={isDeadlineApproaching(currentPeriod.deadline)} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-blue-500" size={20} /> Period Allocation</h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} /><Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>{categoryData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2"><FileText size={48} strokeWidth={1} /><p>No logs found</p></div>}
          </div>
        </div>
        <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Strategic Hub <Zap className="text-amber-400 fill-amber-400" size={20} /></h3>
            <p className="text-slate-400 mb-6 text-sm">Your reports now include deep impact analysis, challenge mitigation, and future planning. Download your high-fidelity PDF on the 14th/29th.</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => handleDownloadReport(currentPeriodActivities, currentPeriod.label)} disabled={currentPeriodActivities.length === 0 || loading} className={`w-full font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isSubmissionDay ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 'bg-white/10 text-white hover:bg-white/20'}`}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{isSubmissionDay ? 'Download Final PDF' : 'Download Draft PDF'}</button>
              <button onClick={() => setActiveTab('logs')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"><Plus size={18} /> Detailed Activity Entry</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Info size={14} className="text-blue-500" /><span>Complete all strategic fields for accurate reporting.</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleDownloadReport(currentPeriodActivities, currentPeriod.label)} disabled={currentPeriodActivities.length === 0 || loading} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm text-sm">{loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} PDF Export</button>
          <button onClick={handleSubmitPeriod} disabled={currentPeriodActivities.length === 0 || loading} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20 text-sm">{loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Submit Period</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="text-blue-500" size={20} /> New Report Entry</h3>
              {lastSaved && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full animate-pulse">
                  <Save size={10} className="text-emerald-500" /> Draft saved at {lastSaved}
                </div>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Date</label><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Category</label><select value={newCat} onChange={(e) => setNewCat(e.target.value as ActivityCategory)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Primary Task</label><div className="relative"><input type="text" placeholder="e.g. Server Migration" value={newTask} onChange={(e) => setNewTask(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-8" /><button onClick={handleSuggestCategory} disabled={!newTask || suggestingCategory} className="absolute right-2 top-2 text-blue-500">{suggestingCategory ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}</button></div></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Hours</label><input type="number" step="0.5" value={newHours} onChange={(e) => setNewHours(Number(e.target.value))} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>

              {/* Structured Fields */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-emerald-500" /><span className="text-xs font-bold text-slate-700">ACHIEVEMENTS & IMPACT</span></div>
                <textarea placeholder="Things you did/handled..." value={formData.accomplishments} onChange={e => setFormData({...formData, accomplishments: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                <textarea placeholder="Positive impact of these actions..." value={formData.positiveImpact} onChange={e => setFormData({...formData, positiveImpact: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                
                <div className="flex items-center gap-2 mb-2"><AlertCircle size={14} className="text-amber-500" /><span className="text-xs font-bold text-slate-700">CHALLENGES</span></div>
                <textarea placeholder="Challenges faced..." value={formData.challenges} onChange={e => setFormData({...formData, challenges: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                <textarea placeholder="How did you overcome them?" value={formData.overcomingChallenges} onChange={e => setFormData({...formData, overcomingChallenges: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                
                <div className="flex items-center gap-2 mb-2"><Target size={14} className="text-blue-500" /><span className="text-xs font-bold text-slate-700">FUTURE PLANNING</span></div>
                <textarea placeholder="Initiatives you're looking into..." value={formData.futurePlans} onChange={e => setFormData({...formData, futurePlans: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                <textarea placeholder="Strategy to achieve these..." value={formData.achievementStrategy} onChange={e => setFormData({...formData, achievementStrategy: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Timeframe (e.g. Q4)" value={formData.achievementTimeframe} onChange={e => setFormData({...formData, achievementTimeframe: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input placeholder="Company Benefit" value={formData.companyBenefit} onChange={e => setFormData({...formData, companyBenefit: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button onClick={handleAddActivity} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">Log Entry</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2"><h3 className="font-bold text-slate-800">Current Cycle Reports ({currentPeriodActivities.length})</h3></div>
          {currentPeriodActivities.length === 0 ? (
            <div className="bg-white rounded-2xl p-20 text-center border-2 border-dashed border-slate-200 flex flex-col items-center gap-4"><ClipboardList size={48} className="text-slate-200" /><div className="max-w-xs"><p className="font-bold text-slate-400 text-lg mb-2">No reports recorded</p><p className="text-sm text-slate-300">Enter your achievements and future initiatives to populate the cycle log.</p></div></div>
          ) : currentPeriodActivities.map((act) => (
            <div key={act.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className={`p-3 rounded-xl ${act.category === 'Locksmith' ? 'bg-amber-100 text-amber-600' : act.category === 'Transport' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {act.category === 'Locksmith' ? <Key size={20} /> : act.category === 'Transport' ? <Car size={20} /> : <Settings size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{act.task}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mt-0.5"><Calendar size={12} /> {act.date} • <Clock size={12} /> {act.durationHours}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOptimizeDescription(act.id)} disabled={optimizingId === act.id} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">{optimizingId === act.id ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}</button>
                  <button onClick={() => deleteActivity(act.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="space-y-4 text-xs text-slate-600 border-t border-slate-50 pt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="font-bold text-slate-900 mb-1">Impact:</p><p className="italic">{act.positiveImpact || '---'}</p></div>
                  <div><p className="font-bold text-slate-900 mb-1">Benefit:</p><p>{act.companyBenefit || '---'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="font-bold text-slate-900 mb-1">Future Focus:</p><p>{act.futurePlans || '---'}</p></div>
                  <div><p className="font-bold text-slate-900 mb-1">Target:</p><p>{act.achievementTimeframe || '---'}</p></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Submission History</h2><p className="text-slate-500">Access previous strategic performance reports in PDF.</p></div></div>
      <div className="grid grid-cols-1 gap-6">
        {submissions.length === 0 ? <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 flex flex-col items-center gap-4"><History size={48} className="text-slate-200" /><p className="text-slate-400 font-medium">No submission history found.</p></div> : submissions.map((sub) => (
          <div key={sub.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600"><Calendar size={24} /></div><div><h3 className="font-bold text-slate-800 text-lg">{formatDate(sub.periodStart)} - {formatDate(sub.periodEnd)}</h3><p className="text-sm text-slate-500">Finalized {formatDate(sub.submittedAt)}</p></div></div>
              <div className="flex items-center gap-6"><div className="text-center"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Hours</p><p className="font-bold text-slate-800 text-xl">{sub.totalHours}h</p></div><div className="px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-2"><CheckCircle size={14} />{sub.status}</div></div>
            </div>
            <div className="p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><TrendingUp size={12} className="text-blue-500" /> Strategic Outcome</h4><p className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50 text-slate-700 text-sm leading-relaxed italic">Period marked by focus on organizational growth and overcoming operational hurdles across {sub.activityCount} key initiatives.</p></div>
              <div className="md:w-64"><button onClick={() => handleDownloadReport(sub.activities, `${formatDate(sub.periodStart)} - ${formatDate(sub.periodEnd)}`)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-blue-200 transition-all flex items-center justify-between shadow-sm">Download PDF <Download size={16} className="text-blue-500" /></button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return <Layout activeTab={activeTab} setActiveTab={setActiveTab}>{activeTab === 'dashboard' && renderDashboard()}{activeTab === 'logs' && renderLogs()}{activeTab === 'history' && renderHistory()}</Layout>;
};

export default App;
