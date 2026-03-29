
import React, { useState, useEffect } from "react";
import { useJournalStore } from "../stores/journalStore";
import { useGoalStore } from "../stores/goalStore";
import { useToastStore } from "../stores/toastStore";
import { motion } from "framer-motion";

const analyticsTabs = ["Daily", "Weekly", "Monthly", "Yearly"];
const analyticsCategories = ["all", "spirituality", "finance", "health", "relation"];

export const Journal = () => {
  const { entries, load: loadJournals, add: addJournal } = useJournalStore();
  const { goals, load: loadGoals } = useGoalStore();
  const { showToast } = useToastStore();

  // Life Journal state
  const [thinking, setThinking] = useState({ learn: '', mistakes: '', did: '' });
  const [emotions, setEmotions] = useState({ feel: '', why: '', next: '' });
  const [problems, setProblems] = useState({ problems: '', solutions: '' });
  const [ideas, setIdeas] = useState('');

  // Analytics state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("Daily");
  const [analyticsCategory, setAnalyticsCategory] = useState("all");

  useEffect(() => {
    loadJournals();
    loadGoals();
  }, []);

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

  // Filter for Daily Goal Journals (A2)
  const dailyGoalJournals = entries.filter(e => e.type === 'daily' && e.goalId);

  // Filter for Analytics (B)
  const analyticsGoalJournals = entries.filter(e => {
    if (!e.goalId) return false;
    const matchesTimeframe = e.type.toLowerCase() === analyticsTimeframe.toLowerCase();
    const matchesCategory = analyticsCategory === 'all' || e.category === analyticsCategory;
    return matchesTimeframe && matchesCategory;
  });

  const getGoalTitle = (goalId: string) => {
    const goal = goals.find(g => String(g.id) === String(goalId));
    return goal ? Object.values(goal.data)[0] : 'Unknown Goal';
  };

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col w-full max-w-5xl mx-auto pb-12 overflow-y-auto no-scrollbar">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-2 tracking-tight">Journal</h1>
        <p className="text-secondary/60 text-sm">Main Life Journal and Daily Goal summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT: DAILY JOURNAL (MAIN) */}
        <div className="lg:col-span-2 space-y-10">
          {/* A1. LIFE JOURNAL */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🧠</span>
              <h2 className="text-xl font-bold">Daily Life Journal</h2>
            </div>
            
            <div className="space-y-6">
              <Section title="Thinking & Reflection">
                <Question 
                  label="What did I learn today?" 
                  value={thinking.learn} 
                  onChange={v => setThinking(prev => ({ ...prev, learn: v }))} 
                />
                <Question 
                  label="What mistakes did I make?" 
                  value={thinking.mistakes} 
                  onChange={v => setThinking(prev => ({ ...prev, mistakes: v }))} 
                />
                <Question 
                  label="What did I do today?" 
                  value={thinking.did} 
                  onChange={v => setThinking(prev => ({ ...prev, did: v }))} 
                />
              </Section>

              <Section title="Emotions & Mental State">
                <Question 
                  label="What did I feel?" 
                  value={emotions.feel} 
                  onChange={v => setEmotions(prev => ({ ...prev, feel: v }))} 
                />
                <Question 
                  label="Why did I feel this?" 
                  value={emotions.why} 
                  onChange={v => setEmotions(prev => ({ ...prev, why: v }))} 
                />
                <Question 
                  label="What will I do next time?" 
                  value={emotions.next} 
                  onChange={v => setEmotions(prev => ({ ...prev, next: v }))} 
                />
              </Section>

              <Section title="Problems">
                <Question 
                  label="What problems did I face?" 
                  value={problems.problems} 
                  onChange={v => setProblems(prev => ({ ...prev, problems: v }))} 
                />
                <Question 
                  label="Possible solutions" 
                  value={problems.solutions} 
                  onChange={v => setProblems(prev => ({ ...prev, solutions: v }))} 
                />
              </Section>

              <Section title="Ideas & Insights">
                <Question 
                  label="Any ideas or thoughts?" 
                  value={ideas} 
                  onChange={setIdeas} 
                />
              </Section>

              <button 
                onClick={handleSaveLifeJournal}
                className="w-full bg-accent hover:bg-accent/80 text-background font-bold py-3 rounded-2xl transition-all shadow-lg shadow-accent/20"
              >
                Save Daily Life Journal
              </button>
            </div>
          </section>

          {/* PREVIOUS LIFE ENTRIES */}
          <section>
            <h3 className="text-sm font-black text-secondary uppercase tracking-[0.2em] mb-4 opacity-50">Recent Life Entries</h3>
            <div className="space-y-4">
              {entries.filter(e => !e.goalId).slice(0, 5).map(e => (
                <div key={e.id} className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6">
                  <span className="text-[10px] font-bold text-secondary uppercase mb-4 block opacity-50">{e.date}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {e.content.thinking && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-accent uppercase">Thinking</h4>
                        <p className="text-xs text-secondary italic">Learned: {e.content.thinking.learn || '—'}</p>
                        <p className="text-xs text-secondary italic">Mistakes: {e.content.thinking.mistakes || '—'}</p>
                        <p className="text-xs text-secondary italic">Activity: {e.content.thinking.did || '—'}</p>
                      </div>
                    )}
                    {e.content.emotions_life && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-accent uppercase">Emotions</h4>
                        <p className="text-xs text-secondary italic">Feel: {e.content.emotions_life.feel || '—'}</p>
                        <p className="text-xs text-secondary italic">Why: {e.content.emotions_life.why || '—'}</p>
                        <p className="text-xs text-secondary italic">Next: {e.content.emotions_life.next || '—'}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT: DAILY GOALS (A2) */}
        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🎯</span>
              <h2 className="text-xl font-bold">Daily Goal Journals</h2>
            </div>
            
            <div className="space-y-4">
              {dailyGoalJournals.length === 0 ? (
                <div className="bg-secondary/5 border border-secondary/20 border-dashed rounded-2xl p-8 text-center">
                  <p className="text-secondary text-xs italic">No daily goal entries yet.</p>
                </div>
              ) : (
                dailyGoalJournals.map(e => (
                  <GoalCard 
                    key={e.id} 
                    entry={e} 
                    title={getGoalTitle(e.goalId!)} 
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* B. GOALS ANALYTICS SECTION */}
      <div className="mt-20 pt-12 border-t border-secondary/10">
        <div className="mb-10">
          <h2 className="text-3xl font-black mb-2 tracking-tight">Goals Analytics</h2>
          <p className="text-secondary/60 text-sm">View and filter all historical goal performance journals.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Timeframe Tabs */}
          <div className="flex gap-1 border border-secondary/10 bg-secondary/5 p-1 rounded-xl w-max">
            {analyticsTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setAnalyticsTimeframe(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsTimeframe === tab
                    ? "bg-secondary/20 text-text shadow-sm"
                    : "text-secondary hover:text-text hover:bg-secondary/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {analyticsCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setAnalyticsCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  analyticsCategory === cat
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-secondary/5 border-secondary/20 text-secondary hover:border-secondary/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsGoalJournals.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 py-20 text-center opacity-40">
              <p className="text-sm italic">No entries found for this filter.</p>
            </div>
          ) : (
            analyticsGoalJournals.map(e => (
              <GoalCard 
                key={e.id} 
                entry={e} 
                title={getGoalTitle(e.goalId!)} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ========================= */
/* SUB-COMPONENTS            */
/* ========================= */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 flex flex-col gap-5">
      <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] leading-none">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Question({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-secondary/70">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-secondary/30 rounded-xl p-3 text-sm text-text focus:outline-none focus:border-accent resize-none transition-all placeholder:text-secondary/20"
        rows={2}
      />
    </div>
  );
}

function GoalCard({ entry, title }: { entry: any; title: string }) {
  const categoryColors: Record<string, string> = {
    spirituality: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    finance: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    health: "bg-green-500/20 text-green-400 border-green-500/30",
    relation: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };

  return (
    <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5 hover:border-secondary/40 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold text-secondary uppercase mb-1 block opacity-50">{entry.date}</span>
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
