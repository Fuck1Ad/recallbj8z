
import React from 'react';
import { GameState, SUBJECT_NAMES, SubjectKey } from '../types';

interface StatsPanelProps {
  state: GameState;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 space-y-6 h-full border border-slate-200 overflow-y-auto custom-scroll flex flex-col">
      {/* 状态概览 */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <i className="fas fa-user-circle"></i> 个人档案
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <StatMini icon="fa-brain" label="心态" value={state.general.mindset} color="text-blue-500" />
          <StatMini icon="fa-book-open" label="经验" value={state.general.experience} color="text-amber-500" />
          <StatMini icon="fa-heart" label="魅力" value={state.general.romance} color="text-rose-500" />
          <StatMini icon="fa-medkit" label="健康" value={state.general.health} color="text-emerald-500" />
          <StatMini icon="fa-coins" label="金钱" value={state.general.money} color="text-yellow-600" />
          <StatMini icon="fa-clover" label="运气" value={state.general.luck} color="text-purple-500" />
        </div>
      </div>

      {/* 学业背景 */}
      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-indigo-800">班级: {state.className || '待分班'}</span>
          <span className="text-xs font-bold text-indigo-800">效率: {state.general.efficiency}</span>
        </div>
        <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, state.general.efficiency * 5)}%` }}></div>
        </div>
      </div>

      {/* 学科属性 */}
      <div className="flex-1">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <i className="fas fa-graduation-cap"></i> 学术能力
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(state.subjects) as SubjectKey[]).map(key => (
            <div key={key} className="group">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-700">{SUBJECT_NAMES[key]}</span>
                <span className="text-slate-400">天赋 {state.subjects[key].aptitude} | 水平 {state.subjects[key].level.toFixed(1)}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-700" 
                  style={{ width: `${Math.min(100, state.subjects[key].level)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatMini = ({ icon, label, value, color }: { icon: string, label: string, value: number, color: string }) => (
  <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors">
    <i className={`fas ${icon} ${color} text-sm mb-1`}></i>
    <span className="text-[10px] text-slate-500">{label}</span>
    <span className="text-xs font-bold text-slate-800">{value.toFixed(0)}</span>
  </div>
);

export default StatsPanel;
