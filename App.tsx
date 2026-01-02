
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Phase, GameState, GameLogEntry, GameEvent, SubjectKey, ExamResult, SubjectStats, GeneralStats, SUBJECT_NAMES, StoryEntry, CompetitionType, CompetitionResultData } from './types';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS } from './gameData';
import StatsPanel from './components/StatsPanel';
import ExamView from './components/ExamView';

const calculateProgress = (state: GameState) => {
  if (!state || state.totalWeeksInPhase === 0) return 100;
  return Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
};

const INITIAL_SUBJECTS: Record<SubjectKey, SubjectStats> = {
  chinese: { aptitude: 0, level: 0 },
  math: { aptitude: 0, level: 0 },
  english: { aptitude: 0, level: 0 },
  physics: { aptitude: 0, level: 0 },
  chemistry: { aptitude: 0, level: 0 },
  biology: { aptitude: 0, level: 0 },
  history: { aptitude: 0, level: 0 },
  geography: { aptitude: 0, level: 0 },
  politics: { aptitude: 0, level: 0 },
};

const INITIAL_GENERAL: GeneralStats = {
  mindset: 50,
  experience: 10,
  luck: 50,
  romance: 10,
  health: 80,
  money: 20,
  efficiency: 10
};

// --- Debug Graph Component ---

interface GraphNode {
    event: GameEvent;
    source: 'PHASE' | 'CHAINED' | 'BASE';
}

const DebugGraphView: React.FC<{ 
    events: typeof PHASE_EVENTS, 
    chained: typeof CHAINED_EVENTS, 
    base: typeof BASE_EVENTS,
    onSelect: (e: GameEvent) => void 
}> = ({ events, chained, base, onSelect }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Build Graph Data
    const graphData = useMemo(() => {
        const nodes: Record<string, GraphNode> = {};
        const links: Record<string, Array<{ choiceIndex: number, choiceText: string, targetId: string }>> = {};
        const backlinks: Record<string, string[]> = {};

        // 1. Collect all nodes
        Object.values(events).flat().forEach(e => nodes[e.id] = { event: e, source: 'PHASE' });
        Object.values(chained).forEach(e => nodes[e.id] = { event: e, source: 'CHAINED' });
        Object.values(base).forEach(e => nodes[e.id] = { event: e, source: 'BASE' });

        // 2. Build Links (Heuristic: Run actions to see if they return chainedEvents)
        const dummyState = { 
            general: INITIAL_GENERAL, subjects: INITIAL_SUBJECTS, 
            phase: Phase.SUMMER, week: 1, totalWeeksInPhase: 1, selectedSubjects: [], 
            competition: 'None', romancePartner: null, className: '', log: [], 
            currentEvent: null, chainedEvent: null, eventResult: null, history: [], 
            examResult: null, competitionResults: [], popupCompetitionResult: null, 
            triggeredEvents: [], isSick: false, isGrounded: false, debugMode: true 
        } as unknown as GameState;

        Object.values(nodes).forEach(({ event }) => {
            if (!event.choices) return;
            event.choices.forEach((choice, idx) => {
                // Heuristic: Run 10 times to catch probabilistic branches
                const targets = new Set<string>();
                for(let i=0; i<10; i++) {
                    try {
                        const result = choice.action(dummyState);
                        if (result.chainedEvent) {
                            targets.add(result.chainedEvent.id);
                        }
                    } catch(e) {}
                }
                
                targets.forEach(targetId => {
                    if (!links[event.id]) links[event.id] = [];
                    links[event.id].push({ choiceIndex: idx, choiceText: choice.text, targetId });
                    
                    if (!backlinks[targetId]) backlinks[targetId] = [];
                    if (!backlinks[targetId].includes(event.id)) backlinks[targetId].push(event.id);
                });
            });
        });

        return { nodes, links, backlinks };
    }, [events, chained, base]);

    const activeNode = selectedId ? graphData.nodes[selectedId] : null;

    // Default select first event if nothing selected
    useEffect(() => {
        if (!selectedId) {
            const first = Object.keys(graphData.nodes)[0];
            if (first) setSelectedId(first);
        }
    }, [graphData, selectedId]);

    if (!activeNode) return <div>Loading Graph...</div>;

    const parents = graphData.backlinks[selectedId!] || [];
    const children = activeNode.event.choices?.map((c, i) => {
        const link = graphData.links[selectedId!]?.find(l => l.choiceIndex === i);
        return { choice: c, targetId: link?.targetId };
    }) || [];

    return (
        <div className="flex h-full gap-8 p-4 items-center justify-center bg-slate-50 relative overflow-hidden">
             {/* Lines Layer (Simple SVG for visual connection) */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                 <defs>
                     <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                         <path d="M0,0 L0,6 L9,3 z" fill="#cbd5e1" />
                     </marker>
                 </defs>
                 {/* No complex lines for now, using column layout implies flow */}
             </svg>

             {/* Parents Column */}
             <div className="flex flex-col gap-4 w-64 items-end z-10">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase w-full text-right mb-2">Sources</h4>
                 {parents.length === 0 ? <div className="text-slate-300 text-sm italic text-right">No chained sources (Random Event)</div> : 
                    parents.map(pid => {
                        const pNode = graphData.nodes[pid];
                        return (
                            <div key={pid} onClick={() => setSelectedId(pid)} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-400 cursor-pointer w-full text-right transition-all hover:translate-x-1">
                                <div className="text-[9px] text-slate-400 font-mono">{pNode.source}</div>
                                <div className="font-bold text-slate-700">{pNode.event.title}</div>
                            </div>
                        );
                    })
                 }
             </div>

             {/* Center Node */}
             <div className="w-80 z-20 shrink-0">
                 <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl scale-110 ring-4 ring-indigo-100">
                     <div className="flex justify-between items-start mb-4">
                        <span className="text-xs bg-indigo-500 px-2 py-1 rounded text-indigo-100 font-mono">{activeNode.source}</span>
                        <span className="text-[10px] font-mono opacity-50">{activeNode.event.id}</span>
                     </div>
                     <h2 className="text-2xl font-black mb-2">{activeNode.event.title}</h2>
                     <p className="text-indigo-100 text-sm leading-relaxed mb-6">{activeNode.event.description}</p>
                     <button onClick={() => onSelect(activeNode.event)} className="w-full py-2 bg-white text-indigo-600 font-bold rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
                        Test This Event
                     </button>
                 </div>
             </div>

             {/* Children Column */}
             <div className="flex flex-col gap-4 w-64 items-start z-10">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase w-full text-left mb-2">Outcomes</h4>
                 {children.map((child, idx) => (
                     <div key={idx} className="w-full relative group">
                         {/* Connection Line */}
                         <div className="absolute top-1/2 -left-8 w-8 h-0.5 bg-slate-200"></div>
                         
                         <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm w-full text-left relative overflow-hidden">
                             <div className="text-xs font-bold text-slate-800 mb-1">"{child.choice.text}"</div>
                             {child.targetId ? (
                                 <div onClick={() => setSelectedId(child.targetId!)} className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors">
                                     <i className="fas fa-link text-xs"></i>
                                     <span className="text-xs font-bold truncate">{graphData.nodes[child.targetId].event.title}</span>
                                 </div>
                             ) : (
                                 <div className="mt-1 text-[10px] text-slate-400">Ends chain or affects stats</div>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};


const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    phase: Phase.INIT,
    week: 0,
    totalWeeksInPhase: 0,
    subjects: INITIAL_SUBJECTS,
    general: INITIAL_GENERAL,
    selectedSubjects: [],
    competition: 'None',
    romancePartner: null,
    className: '',
    log: [],
    currentEvent: null,
    chainedEvent: null,
    eventResult: null,
    history: [],
    examResult: null,
    competitionResults: [],
    popupCompetitionResult: null,
    triggeredEvents: [],
    isSick: false,
    isGrounded: false,
    debugMode: false
  });

  const [showHistory, setShowHistory] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTab, setDebugTab] = useState<'LIST' | 'FLOW'>('LIST');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  const startGame = () => {
    const rolledSubjects = { ...INITIAL_SUBJECTS };
    (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
      rolledSubjects[k] = {
        aptitude: Math.floor(Math.random() * 40 + 60),
        level: Math.floor(Math.random() * 10 + 5)
      };
    });

    const rolledGeneral: GeneralStats = {
      mindset: Math.floor(Math.random() * 40 + 30),
      experience: Math.floor(Math.random() * 10 + 5),
      luck: Math.floor(Math.random() * 60 + 20),
      romance: Math.floor(Math.random() * 30 + 10),
      health: Math.floor(Math.random() * 30 + 70),
      money: Math.floor(Math.random() * 50 + 10),
      efficiency: 10
    };

    const firstEvent = PHASE_EVENTS[Phase.SUMMER].find(e => e.id === 'sum_goal_selection');

    setState(prev => ({
      ...prev,
      phase: Phase.SUMMER,
      week: 1,
      totalWeeksInPhase: 5,
      subjects: rolledSubjects,
      general: rolledGeneral,
      log: [{ message: "北京八中模拟器启动。加油，八中人！", type: 'success', timestamp: Date.now() }],
      currentEvent: firstEvent || null,
      triggeredEvents: firstEvent ? [firstEvent.id] : []
    }));
  };

  const nextStep = () => {
    setState(prev => {
      if (prev.phase === Phase.ENDING || prev.phase === Phase.WITHDRAWAL) return prev;
      if (prev.general.health <= 0 || prev.general.mindset <= 0) {
        return { ...prev, phase: Phase.WITHDRAWAL, log: [...prev.log, { message: "你的身体或精神已经透支到极限...", type: 'error', timestamp: Date.now() }] };
      }

      let nextPhase = prev.phase;
      let nextWeek = prev.week + 1;
      let nextTotal = prev.totalWeeksInPhase;

      if (prev.isSick) {
        return { 
          ...prev, 
          isSick: false, 
          general: { ...prev.general, health: prev.general.health + 20 },
          log: [...prev.log, { message: "病假归来，你落后了一些进度。", type: 'warning', timestamp: Date.now() }] 
        };
      }

      // 阶段逻辑
      if (prev.phase === Phase.SUMMER && prev.week >= 5) { nextPhase = Phase.MILITARY; nextWeek = 1; nextTotal = 1; }
      else if (prev.phase === Phase.MILITARY && prev.week >= 1) { nextPhase = Phase.SELECTION; nextWeek = 0; }
      else if (prev.phase === Phase.SEMESTER_1) {
          if (prev.competition === 'OI' && prev.week === 10) { nextPhase = Phase.CSP_EXAM; }
          else if (prev.week === 11) { nextPhase = Phase.MIDTERM_EXAM; } 
          else if (prev.competition === 'OI' && prev.week === 18) { nextPhase = Phase.NOIP_EXAM; }
          else if (prev.week >= 21) { nextPhase = Phase.FINAL_EXAM; nextWeek = 0; }
      }

      const updatedGeneral = { ...prev.general, health: Math.max(0, prev.general.health - 0.8) };
      const newSubs = { ...prev.subjects };
      (Object.keys(newSubs) as SubjectKey[]).forEach(k => {
        newSubs[k].level += (newSubs[k].aptitude / 100) * (prev.general.efficiency / 10) * 1.5;
      });

      const allEvents = PHASE_EVENTS[nextPhase] || [];
      const eligibleEvents = allEvents.filter(e => {
          if (e.once && prev.triggeredEvents.includes(e.id)) return false;
          return !e.condition || e.condition(prev);
      });

      // 提高事件触发概率到 0.9，确保存档丰富
      const randomEvent = (eligibleEvents.length > 0 && Math.random() < 0.9) 
        ? eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)] 
        : null;

      const newTriggeredEvents = randomEvent ? [...prev.triggeredEvents, randomEvent.id] : prev.triggeredEvents;

      if (!randomEvent && prev.general.health < 25 && Math.random() < 0.3) {
        return { ...prev, currentEvent: BASE_EVENTS['sick'] };
      }

      return {
        ...prev,
        phase: nextPhase,
        week: nextWeek,
        totalWeeksInPhase: nextTotal,
        subjects: newSubs,
        general: updatedGeneral,
        currentEvent: randomEvent,
        triggeredEvents: newTriggeredEvents,
        log: [...prev.log, { message: `第 ${nextWeek} 周开始了。`, type: 'info', timestamp: Date.now() }]
      };
    });
  };

  const handleChoice = (choice: any) => {
    setState(prev => {
      const updates = choice.action(prev);
      const diff: string[] = [];
      
      if (updates.general) {
        const g = updates.general as GeneralStats;
        const compare = (key: keyof GeneralStats, name: string) => {
           const d = (g[key] ?? prev.general[key]) - prev.general[key];
           if (d !== 0) diff.push(`${name} ${d > 0 ? '+' : ''}${d.toFixed(0)}`);
        };
        compare('mindset', '心态'); compare('health', '健康'); compare('romance', '情感');
        compare('experience', '经验'); compare('money', '金钱');
      }

      const newHistory: StoryEntry = {
        week: prev.week, phase: prev.phase,
        eventTitle: prev.currentEvent?.title || '未知',
        choiceText: choice.text, resultSummary: diff.join(' | ') || '数值稳定',
        timestamp: Date.now()
      };

      return {
        ...prev, ...updates,
        eventResult: { choice, diff },
        history: [newHistory, ...prev.history],
      };
    });
  };

  const handleEventConfirm = () => {
      setState(s => {
          // 如果有连锁事件，立刻触发连锁事件，不清除 eventResult 之外的状态
          if (s.chainedEvent) {
              return {
                  ...s,
                  currentEvent: s.chainedEvent,
                  chainedEvent: null, // clear chain
                  eventResult: null, // clear result to show new event
                  triggeredEvents: [...s.triggeredEvents, s.chainedEvent.id]
              };
          }
          // 否则回到主界面
          return { ...s, currentEvent: null, eventResult: null };
      });
  };

  const handleExamFinish = (result: ExamResult) => {
    setState(prev => {
      let nextPhase = prev.phase;
      let className = prev.className;
      let efficiencyMod = 0;
      let popupResult: CompetitionResultData | null = null;
      let triggeredEvent = prev.currentEvent;
      let logMsg = '';

      // 低分检测
      let hasFailed = false;
      Object.entries(result.scores).forEach(([sub, score]) => {
          const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
          if (score / max <= 0.6) hasFailed = true;
      });
      if (hasFailed) {
          triggeredEvent = BASE_EVENTS['exam_fail_talk'];
      }

      if (prev.phase === Phase.PLACEMENT_EXAM) {
          if (result.totalScore > 540) { className = "素质班"; efficiencyMod = 4; }
          else if (result.totalScore > 480) { className = "实验班"; efficiencyMod = 2; }
          else { className = "普通班"; }
          nextPhase = Phase.SEMESTER_1;
      } else if (prev.phase === Phase.MIDTERM_EXAM) {
          // 期中排名逻辑 (假定满分 750)
          const maxTotal = 750;
          const ratio = result.totalScore / maxTotal;
          // 排名公式: 1 + 632 * (1 - ratio)^1.5 (非线性，高分段人少)
          const rank = Math.floor(1 + 632 * Math.pow(1 - Math.min(1, ratio), 1.5));
          result.rank = rank;
          
          logMsg = `期中考试结束。年级排名: ${rank} / 633。`;
          // 排名Buff
          if (rank <= 50) { 
              prev.general.mindset += 20; prev.general.romance += 10; 
              logMsg += " 跻身年级第一梯队，意气风发！";
          } else if (rank <= 200) {
              prev.general.mindset += 5;
              logMsg += " 成绩尚可，稳步前行。";
          } else {
              prev.general.mindset -= 10;
              logMsg += " 排名靠后，感受到了巨大的压力。";
          }

          nextPhase = Phase.SUBJECT_RESELECTION; // 期中后改选
      } else if (prev.phase === Phase.CSP_EXAM) {
          const award = result.totalScore >= 80 ? "一等奖" : result.totalScore >= 50 ? "二等奖" : "三等奖";
          popupResult = { title: "CSP-J/S 2024", score: result.totalScore, award };
          return { ...prev, popupCompetitionResult: popupResult, examResult: result };
      } else if (prev.phase === Phase.NOIP_EXAM) {
          const award = result.totalScore >= 85 ? "省一等奖" : result.totalScore >= 65 ? "省二等奖" : "省三等奖";
          popupResult = { title: "NOIP 2024", score: result.totalScore, award };
          return { ...prev, popupCompetitionResult: popupResult, examResult: result };
      } else if (prev.phase === Phase.FINAL_EXAM) { 
          nextPhase = Phase.ENDING; 
          const maxTotal = 750;
          const ratio = result.totalScore / maxTotal;
          const rank = Math.floor(1 + 632 * Math.pow(1 - Math.min(1, ratio), 1.5));
          result.rank = rank;
      }

      return {
        ...prev, className,
        general: { ...prev.general, efficiency: prev.general.efficiency + efficiencyMod },
        phase: nextPhase,
        totalWeeksInPhase: nextPhase === Phase.SEMESTER_1 ? 21 : prev.totalWeeksInPhase,
        examResult: result,
        currentEvent: triggeredEvent, // 插入谈话事件
        log: logMsg ? [...prev.log, { message: logMsg, type: 'info', timestamp: Date.now() }] : prev.log
      };
    });
  };

  const closeCompetitionPopup = () => {
      setState(prev => {
          if (!prev.popupCompetitionResult) return prev;
          const newHistory = [...prev.competitionResults, prev.popupCompetitionResult];
          const logMsg = `${prev.popupCompetitionResult.title} 结束，获得 ${prev.popupCompetitionResult.award} (得分: ${prev.popupCompetitionResult.score})`;
          
          return {
              ...prev,
              popupCompetitionResult: null,
              competitionResults: newHistory,
              phase: Phase.SEMESTER_1,
              totalWeeksInPhase: 21,
              log: [...prev.log, { message: logMsg, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  return (
    <div className="h-screen bg-slate-100 flex p-4 gap-4 overflow-hidden font-sans text-slate-900">
      {/* 侧边栏：属性面板与工具 */}
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
        {state.phase !== Phase.INIT && (
          <>
            <StatsPanel state={state} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold">
                <i className="fas fa-archive text-indigo-500 mb-1"></i>
                <span className="text-xs">历程</span>
              </button>
              <button onClick={() => setShowDebug(true)} className="bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-sm hover:bg-slate-700 transition-all flex flex-col items-center justify-center font-bold text-white">
                <i className="fas fa-bug text-yellow-400 mb-1"></i>
                <span className="text-xs">调试</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col gap-4 relative">
        {state.phase === Phase.INIT ? (
          <div className="flex-1 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-10 border border-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setState(s => ({...s, debugMode: !s.debugMode}))} className={`px-3 py-1 rounded-full text-[10px] font-bold ${state.debugMode ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>DEBUG {state.debugMode ? 'ON' : 'OFF'}</button>
             </div>
             <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform -rotate-6">
                <i className="fas fa-school text-white text-5xl"></i>
             </div>
             <h1 className="text-6xl font-black text-slate-800 mb-4 tracking-tighter">八中重开模拟器</h1>
             <p className="text-slate-400 mb-10 text-xl font-medium">重回金融街19号，续写你的青春</p>
             <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-5 rounded-3xl font-black text-2xl shadow-2xl transition-all hover:scale-105">
                开启模拟
             </button>
          </div>
        ) : (
          <>
            <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
               <div className="flex-1">
                  <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight">
                    <span className={`w-2 h-2 rounded-full ${state.isSick ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                    {state.phase} {state.competition === 'OI' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full ml-2">OIer</span>}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${calculateProgress(state)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Week {state.week}/{state.totalWeeksInPhase || '-'}</span>
                  </div>
               </div>
               <button disabled={!!state.currentEvent} onClick={nextStep} className={`px-8 py-2 rounded-xl font-bold transition-all shadow-lg ${state.currentEvent ? 'bg-slate-50 text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {state.currentEvent ? '请选择' : '推进时间轴'}
               </button>
            </header>

            {/* 日志与事件层 */}
            <div className="flex-1 overflow-hidden relative flex flex-col gap-4">
               <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 overflow-y-auto custom-scroll space-y-3">
                  {state.log.map((l, i) => (
                    <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-300'}`}>
                       <p className="text-sm font-medium">{l.message}</p>
                    </div>
                  ))}
                  <div ref={logEndRef} />
               </div>

               {state.currentEvent && (
                 <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-8 z-10 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-xl w-full border border-slate-200">
                       {!state.eventResult ? (
                         <>
                           <h2 className="text-2xl font-black text-slate-800 mb-4">{state.currentEvent.title}</h2>
                           <p className="text-slate-600 mb-8 text-lg leading-relaxed">{state.currentEvent.description}</p>
                           <div className="space-y-3">
                              {state.currentEvent.choices?.map((c, i) => (
                                <button key={i} onClick={() => handleChoice(c)} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all font-bold group flex justify-between items-center">
                                   {c.text}
                                   <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all"></i>
                                </button>
                              ))}
                           </div>
                         </>
                       ) : (
                         <div className="text-center py-4">
                           <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                              <i className="fas fa-check"></i>
                           </div>
                           <h2 className="text-xl font-black text-slate-800 mb-2 italic">"{state.eventResult.choice.text}"</h2>
                           {state.eventResult.diff.length > 0 && (
                             <div className="flex flex-wrap justify-center gap-2 mb-8 mt-4">
                                {state.eventResult.diff.map((d, i) => (
                                  <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {d}
                                  </span>
                                ))}
                             </div>
                           )}
                           <button onClick={handleEventConfirm} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl">
                                {state.chainedEvent ? '继续...' : '确认结果'}
                           </button>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {/* 竞赛结果结算弹窗 */}
               {state.popupCompetitionResult && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-[40px] p-12 text-center max-w-lg shadow-2xl relative border-4 border-yellow-400">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                            <i className="fas fa-trophy text-white text-4xl"></i>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mt-6 mb-2">{state.popupCompetitionResult.title}</h3>
                        <p className="text-slate-400 text-lg mb-8 uppercase tracking-widest font-bold">Competition Result</p>
                        
                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                            <div className="text-4xl font-black text-indigo-600 mb-2">{state.popupCompetitionResult.score} <span className="text-sm text-slate-400 font-normal">pts</span></div>
                            <div className="text-2xl font-bold text-yellow-600">{state.popupCompetitionResult.award}</div>
                        </div>

                        <button onClick={closeCompetitionPopup} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl transition-transform active:scale-95">
                            收入囊中
                        </button>
                    </div>
                 </div>
               )}

               {/* 历程回溯面板 */}
               {showHistory && (
                 <div className="absolute inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setShowHistory(false)}>
                    <div className="w-96 bg-white h-full shadow-2xl p-8 flex flex-col animate-slideInRight" onClick={e => e.stopPropagation()}>
                       <div className="flex justify-between items-center mb-8 border-b pb-4">
                          <h2 className="text-2xl font-black text-slate-800 tracking-tight">故事线存档</h2>
                          <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-800 text-xl"><i className="fas fa-times"></i></button>
                       </div>
                       <div className="flex-1 overflow-y-auto custom-scroll space-y-6">
                          {state.history.length === 0 ? <div className="text-slate-300 text-center py-20 italic">尚未开启故事...</div> : 
                            state.history.map((h, i) => (
                              <div key={i} className="relative pl-6 border-l-2 border-indigo-100">
                                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
                                 <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{h.phase} | Week {h.week}</div>
                                 <h4 className="font-black text-slate-800 mt-1">{h.eventTitle}</h4>
                                 <p className="text-xs text-slate-600 mt-1">决策：{h.choiceText}</p>
                                 <div className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-50 p-2 rounded-lg">{h.resultSummary}</div>
                              </div>
                            ))}
                       </div>
                    </div>
                 </div>
               )}

               {/* 调试编辑器面板 */}
               {showDebug && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowDebug(false)}>
                    <div className="w-[90%] h-[90%] bg-white rounded-[40px] shadow-2xl p-6 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                       <div className="flex justify-between items-center mb-6 px-4">
                          <div className="flex items-center gap-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                                <i className="fas fa-tools text-yellow-500"></i> 事件调试器
                                </h2>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setDebugTab('LIST')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${debugTab === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>列表视图</button>
                                <button onClick={() => setDebugTab('FLOW')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${debugTab === 'FLOW' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>流程视图</button>
                            </div>
                          </div>
                          <button onClick={() => setShowDebug(false)} className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"><i className="fas fa-times text-xl"></i></button>
                       </div>
                       
                       <div className="flex-1 overflow-hidden relative border-t border-slate-100">
                           {debugTab === 'LIST' ? (
                               <div className="h-full overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                                    {(Object.keys(PHASE_EVENTS) as Phase[]).map(p => (
                                        <div key={p} className="space-y-4">
                                        <h3 className="sticky top-0 bg-white/95 backdrop-blur py-2 text-indigo-600 font-black border-b border-indigo-100 z-10 flex items-center justify-between">
                                            {p} <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full">{PHASE_EVENTS[p].length} EVENTS</span>
                                        </h3>
                                        {PHASE_EVENTS[p].map(e => (
                                            <div key={e.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => { setState(s => ({...s, currentEvent: e})); setShowDebug(false); }}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-mono text-slate-400">ID: {e.id}</span>
                                                    <div className="flex gap-2">
                                                    {e.once && <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-100 text-purple-600">ONCE</span>}
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${e.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : e.type === 'negative' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{e.type}</span>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{e.title}</h4>
                                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{e.description}</p>
                                            </div>
                                        ))}
                                        </div>
                                    ))}
                               </div>
                           ) : (
                               <DebugGraphView 
                                  events={PHASE_EVENTS} 
                                  chained={CHAINED_EVENTS} 
                                  base={BASE_EVENTS}
                                  onSelect={(e) => { setState(s => ({...s, currentEvent: e})); setShowDebug(false); }} 
                               />
                           )}
                       </div>
                    </div>
                 </div>
               )}

               {/* 选科与改选界面 */}
               {(state.phase === Phase.SELECTION || state.phase === Phase.SUBJECT_RESELECTION) && (
                 <div className="absolute inset-0 bg-white rounded-3xl z-20 p-10 flex flex-col items-center justify-center">
                    <h2 className="text-3xl font-black mb-4">{state.phase === Phase.SELECTION ? "高一选科" : "期中改选"}</h2>
                    <p className="text-slate-400 mb-10">{state.phase === Phase.SELECTION ? "选择你的三门等级考科目，这将决定你的最终高考组合。" : "期中考试后，你有一次重新审视自己选择的机会。"}</p>
                    <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
                       {(['physics', 'chemistry', 'biology', 'history', 'geography', 'politics'] as SubjectKey[]).map(s => (
                         <button key={s} onClick={() => setState(prev => ({ ...prev, selectedSubjects: prev.selectedSubjects.includes(s) ? prev.selectedSubjects.filter(x => x !== s) : (prev.selectedSubjects.length < 3 ? [...prev.selectedSubjects, s] : prev.selectedSubjects) }))}
                           className={`p-4 rounded-2xl border-2 transition-all font-bold ${state.selectedSubjects.includes(s) ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                           {SUBJECT_NAMES[s]}
                         </button>
                       ))}
                    </div>
                    <button disabled={state.selectedSubjects.length !== 3} onClick={() => setState(prev => ({ ...prev, phase: prev.phase === Phase.SELECTION ? Phase.PLACEMENT_EXAM : Phase.SEMESTER_1, log: prev.phase === Phase.SUBJECT_RESELECTION ? [...prev.log, {message: "选科已更新。", type:'success', timestamp: Date.now()}] : prev.log }))} className="bg-indigo-600 disabled:bg-slate-200 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl">
                      确认为：{state.selectedSubjects.map(s => SUBJECT_NAMES[s]).join('、')}
                    </button>
                 </div>
               )}

               {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) && (
                  <div className="absolute inset-0 z-30">
                    <ExamView 
                        title={
                            state.phase === Phase.PLACEMENT_EXAM ? "高一分班考" : 
                            state.phase === Phase.CSP_EXAM ? "CSP 2024" : 
                            state.phase === Phase.NOIP_EXAM ? "NOIP 2024" : 
                            state.phase === Phase.MIDTERM_EXAM ? "高一上期中考试" : "期末考试"
                        } 
                        state={state} 
                        onFinish={handleExamFinish} 
                    />
                  </div>
               )}

               {state.phase === Phase.ENDING && (
                 <div className="absolute inset-0 bg-slate-900 rounded-3xl z-40 p-12 text-white flex flex-col items-center justify-center overflow-y-auto custom-scroll animate-fadeIn">
                    <h2 className="text-5xl font-black mb-12 tracking-tighter text-indigo-400">第一学期总结</h2>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[30px] w-full max-w-3xl shadow-2xl">
                       <p className="text-2xl mb-10 italic opacity-95 text-center leading-relaxed font-light">"{state.examResult?.comment}"</p>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <SummaryItem label="班级" value={state.className} icon="fa-school" />
                          <SummaryItem label="期末排名" value={`${state.examResult?.rank || '-'} / 633`} icon="fa-chart-bar" />
                          <SummaryItem label="情感羁绊" value={state.romancePartner ? "双宿双飞" : "孤身一人"} icon="fa-heart" />
                          <SummaryItem label="竞赛奖项" value={state.competitionResults.length > 0 ? `${state.competitionResults.length}项` : "无"} icon="fa-trophy" />
                       </div>
                       {state.competitionResults.length > 0 && (
                           <div className="mt-8 pt-8 border-t border-white/10">
                               <div className="text-xs font-bold opacity-50 uppercase tracking-widest mb-4">Honor List</div>
                               <div className="space-y-2">
                                   {state.competitionResults.map((r, i) => (
                                       <div key={i} className="flex justify-between items-center text-sm">
                                           <span>{r.title}</span>
                                           <span className="text-yellow-400 font-bold">{r.award}</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-12 bg-indigo-600 text-white px-16 py-4 rounded-3xl font-black text-xl hover:scale-105 transition-all">再次重开</button>
                 </div>
               )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const SummaryItem = ({ label, value, icon }: { label: string, value: any, icon: string }) => (
    <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
        <i className={`fas ${icon} text-indigo-400 mb-2`}></i>
        <div className="text-[10px] font-black opacity-40 uppercase mb-1">{label}</div>
        <div className="text-xl font-black">{value}</div>
    </div>
);

export default App;
