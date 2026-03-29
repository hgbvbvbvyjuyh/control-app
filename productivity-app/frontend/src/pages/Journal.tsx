
import React, { useState, useEffect } from "react";
import { useJournalStore } from "../stores/journalStore";

const tabs = ["Daily", "Weekly", "Monthly", "Yearly"];
const categories = ["all", "spirituality", "finance", "health", "relation"];

export const Journal = () => {
  const [activeTab, setActiveTab] = useState("Daily");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { entries, load } = useJournalStore();

  useEffect(() => {
    load();
  }, []);

  const filteredEntries = entries.filter((e) => {
    const matchesTab = e.type.toLowerCase() === activeTab.toLowerCase();
    const matchesCategory =
      selectedCategory === "all" || e.category === selectedCategory;
    return matchesTab && matchesCategory;
  });

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col w-full max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <h1 className="text-3xl font-bold">Journal</h1>
        <button className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all">
          + New Entry
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-6 shrink-0">
        {/* TABS */}
        <div className="flex gap-2 border border-secondary/10 bg-secondary/5 p-1 rounded-xl w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-secondary/20 text-text shadow-sm"
                  : "text-secondary hover:text-text hover:bg-secondary/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* CATEGORY FILTERS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                selectedCategory === cat
                  ? "bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "bg-secondary/5 border-secondary/20 text-secondary hover:border-secondary/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 min-h-0">
        {filteredEntries.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">
                      {entry.date}
                    </span>
                    {entry.category && (
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded leading-none ${
                          entry.category === "spirituality"
                            ? "bg-blue-500/20 text-blue-400"
                            : entry.category === "finance"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : entry.category === "relation"
                            ? "bg-pink-500/20 text-pink-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {entry.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {entry.content.goals && (
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                        Goals
                      </h4>
                      <p className="text-sm text-text/80 leading-relaxed">
                        {entry.content.goals}
                      </p>
                    </div>
                  )}
                  {entry.content.problems && (
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                        Mistakes / Problems
                      </h4>
                      <p className="text-sm text-text/80 leading-relaxed">
                        {entry.content.problems}
                      </p>
                    </div>
                  )}
                  {entry.content.ideas && (
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                        Improvements / Ideas
                      </h4>
                      <p className="text-sm text-text/80 leading-relaxed">
                        {entry.content.ideas}
                      </p>
                    </div>
                  )}
                  {entry.content.reflection && (
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                        Reflection
                      </h4>
                      <p className="text-sm text-text/80 leading-relaxed">
                        {entry.content.reflection}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "Daily" && filteredEntries.length === 0 && selectedCategory === "all" ? (
          <DailyJournal />
        ) : (
          <div className="flex items-center justify-center h-64 text-secondary text-sm italic">
            No entries found for this category and timeframe.
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================= */
/* DAILY JOURNAL COMPONENT   */
/* ========================= */

function DailyJournal() {
  return (
    <div className="flex flex-col gap-6">
      <Section title="🎯 Goals">
        <Question label="Did I complete my goals?" />
        <Question label="Why / why not?" />
        <Question label="How can I improve?" />
      </Section>

      <Section title="🧠 Thinking & Reflection">
        <Question label="What did I learn today?" />
        <Question label="What mistakes did I make?" />
        <Question label="What did I do today?" />
      </Section>

      <Section title="💭 Emotions & Mental State">
        <Question label="Where did I get emotional and why?" />
        <Question label="What did I do?" />
        <Question label="Best logical response next time?" />
      </Section>

      <Section title="🚧 Problems">
        <Question label="What problems did I face?" />
        <Question label="What are the solutions?" />
      </Section>

      <Section title="💡 Ideas & Insights">
        <Question label="Write any ideas or insights..." />
      </Section>
    </div>
  );
}

/* ========================= */
/* REUSABLE COMPONENTS       */
/* ========================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-sm font-bold text-accent uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Question({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-secondary">{label}</label>
      <textarea
        className="w-full bg-background border border-secondary/30 rounded-xl p-3 text-sm text-text focus:outline-none focus:border-accent resize-none transition-shadow"
        rows={3}
      />
    </div>
  );
}
