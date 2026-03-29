import React, { useState } from "react";

const tabs = ["Daily", "Weekly", "Monthly", "Yearly"];

export const Journal = () => {
  const [activeTab, setActiveTab] = useState("Daily");

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col w-full max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <h1 className="text-3xl font-bold">Journal</h1>
        <button className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all">
          + New Entry
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border border-secondary/10 bg-secondary/5 mb-6 shrink-0 p-1 rounded-xl w-max">
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

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 min-h-0">
        {activeTab === "Daily" && <DailyJournal />}
        {activeTab !== "Daily" && (
          <div className="flex items-center justify-center h-full text-secondary text-sm">
            No entries yet.
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
