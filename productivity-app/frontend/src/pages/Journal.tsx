import React, { useState, useEffect } from "react";
import { useJournalStore } from "../stores/journalStore";
import { useGoalStore } from "../stores/goalStore";
import { useToastStore } from "../stores/toastStore";

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

  const getGoalInfo = (goalId: string) => {
    const goal = goals.find(g => String(g.id) === String(goalId));
    return goal ? { title: Object.values(goal.data)[0], type: goal.goalType } : { title: 'Unknown Goal', type: 'daily' };
  };

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col w-full max-w-5xl mx-auto pb-12 overflow-y-auto no-scrollbar">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-2 tracking-tight">Journal</h1>
        <p className="text-secondary/60 text-sm">Main Life Journal and Goal summaries.</p>
      </div>

      <div className="space-y-16">
        {/* (A) 📘 DAILY JOURNAL (MAIN) */}
        <section className="space-y-10">
          <div className="border-b border-secondary/10 pb-4">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <span className="text-3xl">📘</span> (A) DAILY JOURNAL
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* A1. 🧠 LIFE JOURNAL (MANUAL INPUT) */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🧠</span>
                <h3 className="text-lg font-bold">A1. Life Journal</h3>
              </div>
              
              <div className="space-y-6">
                <Section title="1. Thinking">
                  <Question 
                    label="What did I learn?" 
                    value={thinking.learn} 
                    onChange={v => setThinking(prev => ({ ...prev, learn: v }))} 
                  />
                  <Question 
                    label="Mistakes?" 
                    value={thinking.mistakes} 
                    onChange={v => setThinking(prev => ({ ...prev, mistakes: v }))} 
                  />
                  <Question 
                    label="What I did?" 
                    value={thinking.did} 
                    onChange={v => setThinking(prev => ({ ...prev, did: v }))} 
                  />
                </Section>

                <Section title="2. Emotions">
                  <Question 
                    label="What did I feel?" 
                    value={emotions.feel} 
                    onChange={v => setEmotions(prev => ({ ...prev, feel: v }))} 
                  />
                  <Question 
                    label="Why?" 
                    value={emotions.why} 
                    onChange={v => setEmotions(prev => ({ ...prev, why: v }))} 
                  />
                  <Question 
                    label="Next time?" 
                    value={emotions.next} 
                    onChange={v => setEmotions(prev => ({ ...prev, next: v }))} 
                  />
                </Section>

                <Section title="3. Problems">
                  <Question 
                    label="Problems" 
                    value={problems.problems} 
                    onChange={v => setProblems(prev => ({ ...prev, problems: v }))} 
                  />
                  <Question 
                    label="Solutions" 
                    value={problems.solutions} 
                    onChange={v => setProblems(prev => ({ ...prev, solutions: v }))} 
                  />
                </Section>

                <Section title="4. Ideas">
                  <Question 
                    label="Thoughts / ideas" 
                    value={ideas} 
                    onChange={setIdeas} 
                  />
                </Section>

                <button 
                  onClick={handleSaveLifeJournal}
                  className="w-full bg-accent hover:bg-accent/80 text-background font-bold py-4 rounded-2xl transition-all shadow-lg shadow-accent/20 text-sm uppercase tracking-widest"
                >
                  Save Daily Life Journal
                </button>
              </div>

              {/* RECENT LIFE ENTRIES */}
              <div className="pt-8">
                <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4 opacity-50">Recent Life Entries</h4>
                <div className="space-y-4">
                  {entries.filter(e => !e.goalId).slice(0, 3).map(e => (
                    <div key={e.id} className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6">
                      <span className="text-[10px] font-bold text-secondary uppercase mb-4 block opacity-50">{e.date}</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {e.content.thinking && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-accent uppercase">Thinking</h5>
                            <p className="text-xs text-secondary italic">Learned: {e.content.thinking.learn || '—'}</p>
                            <p className="text-xs text-secondary italic">Mistakes: {e.content.thinking.mistakes || '—'}</p>
                            <p className="text-xs text-secondary italic">Did: {e.content.thinking.did || '—'}</p>
                          </div>
                        )}
                        {e.content.emotions_life && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-accent uppercase">Emotions</h5>
                            <p className="text-xs text-secondary italic">Feel: {e.content.emotions_life.feel || '—'}</p>
                            <p className="text-xs text-secondary italic">Why: {e.content.emotions_life.why || '—'}</p>
                            <p className="text-xs text-secondary italic">Next: {e.content.emotions_life.next || '—'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* A2. 🎯 GOALS JOURNAL (AUTO ATTACHED) */}
            <div className="space-y-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-lg font-bold">A2. Daily Goals Journal</h3>
              </div>
              
              <div className="space-y-4">
                {dailyGoalJournals.length === 0 ? (
                  <div className="bg-secondary/5 border border-secondary/20 border-dashed rounded-2xl p-10 text-center">
                    <p className="text-secondary text-xs italic">No daily goal entries yet.<br/>(Saved from Goals Page)</p>
                  </div>
                ) : (
                  dailyGoalJournals.map(e => {
                    const info = getGoalInfo(e.goalId!);
                    return (
                      <GoalCard 
                        key={e.id} 
                        entry={e} 
                        title={info.title}
                        type={info.type}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* (B) 📊 GOALS ANALYTICS SECTION */}
        <section className="mt-20 pt-12 border-t border-secondary/10 space-y-10">
          <div className="border-b border-secondary/10 pb-4">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <span className="text-3xl">📊</span> (B) GOALS ANALYTICS
            </h2>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* 🕒 TIMEFRAME TABS (LOCAL ONLY) */}
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

              {/* 🧩 CATEGORY FILTER */}
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

            {/* 📊 GOAL JOURNAL LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsGoalJournals.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 py-20 text-center opacity-40">
                  <p className="text-sm italic">No entries found for this filter.</p>
                </div>
              ) : (
                analyticsGoalJournals.map(e => {
                  const info = getGoalInfo(e.goalId!);
                  return (
                    <GoalCard 
                      key={e.id} 
                      entry={e} 
                      title={info.title}
                      type={info.type}
                    />
                  );
                })
              )}
            </div>
          </div>
        </section>
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