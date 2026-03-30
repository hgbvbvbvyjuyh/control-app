import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJournalStore } from "../stores/journalStore";
import { useGoalStore } from "../stores/goalStore";
import { useToastStore } from "../stores/toastStore";

const analyticsTabs = ["Daily", "Weekly", "Monthly", "Yearly"];
const analyticsCategories = ["all", "spirituality", "finance", "health", "relation"];

export const Journal = () => {
  const { entries, load: loadJournals, add: addJournal } = useJournalStore();
  const { goals, load: loadGoals } = useGoalStore();
  const { showToast } = useToastStore();

  // Main Page Category: 1. Daily Journal | 2. Goals
  const [mainTab, setMainTab] = useState<'daily' | 'goals'>('daily');

  // Life Journal state
  const [thinking, setThinking] = useState({ learn: '', mistakes: '', did: '' });
  const [emotions, setEmotions] = useState({ feel: '', why: '', next: '' });
  const [problems, setProblems] = useState({ problems: '', solutions: '' });
  const [ideas, setIdeas] = useState('');

  // Goals Section state (Filtering)
  const [timeframe, setTimeframe] = useState("Daily");
  const [category, setCategory] = useState("all");

  // Toggle states for Life Journal sections (Default: Collapsed)
  const [openThinking, setOpenThinking] = useState(false);
  const [openEmotions, setOpenEmotions] = useState(false);
  const [openProblems, setOpenProblems] = useState(false);
  const [openIdeas, setOpenIdeas] = useState(false);

  useEffect(() => {
    loadJournals();
    loadGoals();
  }, []);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    // Reset category when timeframe changes (Optional: first item)
    setCategory("all");
  };

  const handleSaveLifeJournal = async () => {
    if (!thinking.learn && !thinking.mistakes && !thinking.did && !emotions.feel && !emotions.why && !emotions.next && !problems.problems && !problems.solutions && !ideas) {
      showToast('Please fill at least one field');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    await addJournal('daily', today, {
      thinking,
      emotions_life: emotions,
      problems_life: problems,
      ideas_life: ideas
    });
    setThinking({ learn: '', mistakes: '', did: '' });
    setEmotions({ feel: '', why: '', next: '' });
    setProblems({ problems: '', solutions: '' });
    setIdeas('');
    showToast('Life Journal saved');
  };

  // 1. DAILY JOURNAL: Life Journal Only (No Goals)
  const lifeJournalEntries = entries.filter(e => !e.goalId);

  // 2. GOALS SECTION: Filtered by timeframe and category
  const filteredGoalEntries = entries.filter(e => {
    if (!e.goalId) return false;
    const matchesTimeframe = e.type.toLowerCase() === timeframe.toLowerCase();
    const matchesCategory = category === 'all' || e.category === category;
    return matchesTimeframe && matchesCategory;
  });

  const getGoalInfo = (goalId: string) => {
    const goal = goals.find(g => String(g.id) === String(goalId));
    return goal ? { title: Object.values(goal.data)[0], type: goal.goalType } : { title: 'Unknown Goal', type: 'daily' };
  };

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col w-full max-w-5xl mx-auto pb-12 overflow-y-auto no-scrollbar">
      {/* MAIN CATEGORY SELECTION */}
      <div className="flex items-center gap-4 mb-12 shrink-0">
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMainTab('daily')}
          className={`relative px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 border overflow-hidden ${
            mainTab === 'daily' 
              ? 'bg-accent/10 border-accent text-white shadow-[0_0_20px_rgba(34,211,238,0.15)]' 
              : 'bg-secondary/5 border-secondary/10 text-gray-500 hover:border-secondary/30 hover:text-gray-300'
          }`}
        >
          {mainTab === 'daily' && (
            <motion.div
              layoutId="activeJournalTab"
              className="absolute inset-0 bg-accent/5 z-0"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">1. Daily Journal</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMainTab('goals')}
          className={`relative px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 border overflow-hidden ${
            mainTab === 'goals' 
              ? 'bg-accent/10 border-accent text-white shadow-[0_0_20px_rgba(34,211,238,0.15)]' 
              : 'bg-secondary/5 border-secondary/10 text-gray-500 hover:border-secondary/30 hover:text-gray-300'
          }`}
        >
          {mainTab === 'goals' && (
            <motion.div
              layoutId="activeJournalTab"
              className="absolute inset-0 bg-accent/5 z-0"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">2. Goals</span>
        </motion.button>
      </div>

      {mainTab === 'daily' ? (
        /* ========================= */
        /* SECTION 1: DAILY JOURNAL  */
        /* (Life Journal Only)       */
        /* ========================= */
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Life Journal</h2>
          </div>

          {/* Card Container */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 space-y-6 shadow-sm">
            {/* 1. THINKING */}
            <div className="space-y-4">
              <div 
                onClick={() => setOpenThinking(!openThinking)} 
                className="flex justify-between items-center cursor-pointer group"
              >
                <h3 className="text-sm font-semibold text-cyan-400 tracking-wide uppercase group-hover:text-cyan-300 transition-colors">
                  1. Thinking
                </h3>
                <span className="text-gray-500 text-xs transition-transform duration-200">
                  {openThinking ? "▼" : "▶"}
                </span>
              </div>
              {openThinking && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="What did I learn today?"
                    value={thinking.learn}
                    onChange={e => setThinking(prev => ({ ...prev, learn: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
                    rows={2}
                  />
                  <textarea
                    placeholder="What mistakes did I make?"
                    value={thinking.mistakes}
                    onChange={e => setThinking(prev => ({ ...prev, mistakes: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
                    rows={2}
                  />
                  <textarea
                    placeholder="What did I do today?"
                    value={thinking.did}
                    onChange={e => setThinking(prev => ({ ...prev, did: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1E293B]" />

            {/* 2. EMOTIONS */}
            <div className="space-y-4">
              <div 
                onClick={() => setOpenEmotions(!openEmotions)} 
                className="flex justify-between items-center cursor-pointer group"
              >
                <h3 className="text-sm font-semibold text-pink-400 tracking-wide uppercase group-hover:text-pink-300 transition-colors">
                  2. Emotions
                </h3>
                <span className="text-gray-500 text-xs transition-transform duration-200">
                  {openEmotions ? "▼" : "▶"}
                </span>
              </div>
              {openEmotions && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="What did I feel?"
                    value={emotions.feel}
                    onChange={e => setEmotions(prev => ({ ...prev, feel: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none transition-all"
                    rows={2}
                  />
                  <textarea
                    placeholder="Why did I feel this?"
                    value={emotions.why}
                    onChange={e => setEmotions(prev => ({ ...prev, why: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none transition-all"
                    rows={2}
                  />
                  <textarea
                    placeholder="What will I do next time?"
                    value={emotions.next}
                    onChange={e => setEmotions(prev => ({ ...prev, next: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none transition-all"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1E293B]" />

            {/* 3. PROBLEMS */}
            <div className="space-y-4">
              <div 
                onClick={() => setOpenProblems(!openProblems)} 
                className="flex justify-between items-center cursor-pointer group"
              >
                <h3 className="text-sm font-semibold text-yellow-400 tracking-wide uppercase group-hover:text-yellow-300 transition-colors">
                  3. Problems
                </h3>
                <span className="text-gray-500 text-xs transition-transform duration-200">
                  {openProblems ? "▼" : "▶"}
                </span>
              </div>
              {openProblems && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="What problems did I face?"
                    value={problems.problems}
                    onChange={e => setProblems(prev => ({ ...prev, problems: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none transition-all"
                    rows={2}
                  />
                  <textarea
                    placeholder="Possible solutions"
                    value={problems.solutions}
                    onChange={e => setProblems(prev => ({ ...prev, solutions: e.target.value }))}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none transition-all"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1E293B]" />

            {/* 4. IDEAS */}
            <div className="space-y-4">
              <div 
                onClick={() => setOpenIdeas(!openIdeas)} 
                className="flex justify-between items-center cursor-pointer group"
              >
                <h3 className="text-sm font-semibold text-green-400 tracking-wide uppercase group-hover:text-green-300 transition-colors">
                  4. Ideas
                </h3>
                <span className="text-gray-500 text-xs transition-transform duration-200">
                  {openIdeas ? "▼" : "▶"}
                </span>
              </div>
              {openIdeas && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="Any ideas or thoughts"
                    value={ideas}
                    onChange={e => setIdeas(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none transition-all"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveLifeJournal}
              className="w-full bg-accent hover:bg-accent/80 text-background font-black py-5 rounded-2xl transition-all shadow-xl shadow-accent/20 uppercase tracking-[0.2em] text-sm mt-4"
            >
              Save Life Journal
            </button>
          </div>

          {/* RECENT LIFE ENTRIES */}
          <div className="pt-10 border-t border-secondary/10">
            <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-6 opacity-40">Recent Life Reflections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lifeJournalEntries.slice(0, 4).map(e => (
                <div key={e.id} className="bg-secondary/5 border border-secondary/20 rounded-3xl p-8 hover:bg-secondary/10 transition-colors">
                  <span className="text-[10px] font-bold text-secondary uppercase mb-6 block opacity-40">{e.date}</span>
                  <div className="space-y-6">
                    {e.content.thinking && (
                      <div>
                        <h5 className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">Thinking</h5>
                        <p className="text-xs text-secondary italic leading-relaxed">{e.content.thinking.learn || e.content.thinking.mistakes || e.content.thinking.did}</p>
                      </div>
                    )}
                    {e.content.emotions_life && (
                      <div>
                        <h5 className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">Emotions</h5>
                        <p className="text-xs text-secondary italic leading-relaxed">{e.content.emotions_life.feel || e.content.emotions_life.why}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ========================= */
        /* SECTION 2: GOALS          */
        /* (Goal History & Filters)  */
        /* ========================= */
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              {/* 1. TIMEFRAME TABS (PRIMARY) */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] opacity-50">1. Timeframe</label>
                <div className="flex gap-1 border border-secondary/10 bg-secondary/5 p-1 rounded-xl w-max">
                  {analyticsTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTimeframeChange(tab)}
                      className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${timeframe === tab ? "bg-secondary/20 text-text shadow-inner" : "text-secondary hover:text-text"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. CATEGORY TABS (SECONDARY - BASED ON TIMEFRAME) */}
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] opacity-50">2. Category ({timeframe})</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {analyticsCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === cat ? "bg-accent/20 border-accent text-accent shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "bg-secondary/5 border-secondary/20 text-secondary hover:border-secondary/40"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FILTERED GOAL LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoalEntries.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 py-40 text-center border-2 border-dashed border-secondary/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-300">
                <span className="text-4xl opacity-20">🎯</span>
                <p className="text-sm italic text-secondary/40">No goal journals found for {timeframe} / {category}.<br/>Create them in the Goals section.</p>
              </div>
            ) : (
              filteredGoalEntries.map(e => {
                const info = getGoalInfo(e.goalId!);
                return <GoalCard key={e.id} entry={e} title={info.title} type={info.type} />;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================= */
/* SUB-COMPONENTS            */
/* ========================= */

function GoalCard({ entry, title, type }: { entry: any; title: string; type: string }) {
  const categoryColors: Record<string, string> = {
    spirituality: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    finance: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    health: "bg-green-500/20 text-green-400 border-green-500/30",
    relation: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };

  return (
    <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5 hover:border-secondary/40 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="w-full">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-secondary uppercase opacity-50">{entry.date}</span>
            <span className="text-[9px] font-black uppercase text-accent/60 bg-accent/5 px-2 py-0.5 rounded border border-accent/10">{type}</span>
          </div>
          <h4 className="font-bold text-sm mb-2">{title}</h4>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${categoryColors[entry.category || 'health']}`}>
            {entry.category || 'health'}
          </span>
        </div>
      </div>
      
      <div className="space-y-3 pt-3 border-t border-secondary/10">
        <div>
          <p className="text-[9px] font-bold text-secondary/40 uppercase mb-1">Did I Complete?</p>
          <p className="text-xs text-text/80">{entry.content.goals || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-secondary/40 uppercase mb-1">Mistakes</p>
          <p className="text-xs text-text/80">{entry.content.problems || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-secondary/40 uppercase mb-1">Improvement</p>
          <p className="text-xs text-text/80">{entry.content.ideas || '—'}</p>
        </div>
      </div>
    </div>
  );
}