// components/LeadGenSelector.tsx
'use client';

import { useState } from 'react';

export function LeadGenSelector() {
  const [selection, setSelection] = useState<'personal' | 'fleet' | null>(null);

  return (
    <section className="bg-brand-black py-16 px-4 border-t border-gunmetal">
      <div className="max-w-5xl mx-auto">
        <span className="text-safety-orange font-bold text-xs uppercase tracking-[0.2em] block mb-3">Start Your Build</span>
        <h2 className="text-machined-silver font-display text-4xl md:text-5xl font-black uppercase mb-8">
          Select Your Project Pathway
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Pathway */}
          <button
            onClick={() => setSelection('personal')}
            className={`group relative overflow-hidden border p-8 rounded-industrial text-left transition-all duration-300 ${
              selection === 'personal' ? 'border-safety-orange bg-safety-orange/5' : 'border-machined-silver/20 hover:border-safety-orange/50'
            }`}
          >
            <span className="text-safety-orange font-bold text-xs uppercase tracking-widest block mb-2">Retail & Personal</span>
            <h3 className="text-machined-silver font-display text-2xl mb-3">Personal Vehicle</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Truck & SUV protection, towing, and premium accessories tailored to your daily workflow.</p>
            <div className="mt-6 flex items-center text-safety-orange font-bold text-sm uppercase tracking-wide">
              Build Quote
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
          </button>

          {/* Fleet Pathway */}
          <button
            onClick={() => setSelection('fleet')}
            className={`group relative overflow-hidden border p-8 rounded-industrial text-left transition-all duration-300 ${
              selection === 'fleet' ? 'border-fleet-blue bg-fleet-blue/5' : 'border-machined-silver/20 hover:border-fleet-blue/50'
            }`}
          >
            <span className="text-fleet-blue font-bold text-xs uppercase tracking-widest block mb-2">Commercial & B2B</span>
            <h3 className="text-machined-silver font-display text-2xl mb-3">Fleet & Industrial</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Repeatable specs, asset documentation, blast mitigation, and rollout coordination.</p>
            <div className="mt-6 flex items-center text-fleet-blue font-bold text-sm uppercase tracking-wide">
              Project Brief
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
