
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phase, GameState, GameEvent, SubjectKey, ExamResult, SubjectStats, GeneralStats, SUBJECT_NAMES, CompetitionResultData, Achievement, GameStatus, Difficulty, Club, ClubId, WeekendActivity, OIStats, GameLogEntry, Talent, Item } from './types';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, ACHIEVEMENTS, generateStudyEvent, generateRandomFlavorEvent, SCIENCE_FESTIVAL_EVENT, NEW_YEAR_GALA_EVENT, STATUSES, DIFFICULTY_PRESETS, CHANGELOG_DATA, CLUBS, WEEKEND_ACTIVITIES, TALENTS, SHOP_ITEMS } from './gameData';
import StatsPanel from './components/StatsPanel';
import ExamView from './components/ExamView';

// --- Constants & Helpers ---

const calculateProgress = (state: GameState) => {
  if (!state || state.totalWeeksInPhase === 0) return 0;
  return Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
};

// FACTORY FUNCTIONS (To ensure deep copies on reset)
const getInitialSubjects = (): Record<SubjectKey, SubjectStats> => ({
  chinese: { aptitude: 0, level: 0 },
  math: { aptitude: 0, level: 0 },
  english: { aptitude: 0, level: 0 },
  physics: { aptitude: 0, level: 0 },
  chemistry: { aptitude: 0, level: 0 },
  biology: { aptitude: 0, level: 0 },
  history: { aptitude: 0, level: 0 },
  geography: { aptitude: 0, level: 0 },
  politics: { aptitude: 0, level: 0 },
});

const getInitialGeneral = (): GeneralStats => ({
  mindset: 50,
  experience: 10,
  luck: 50,
  romance: 10,
  health: 80,
  money: 20,
  efficiency: 10
});

const getInitialOIStats = (): OIStats => ({
    dp: 0,
    ds: 0,
    math: 0,
    string: 0,
    graph: 0,
    misc: 0
});

const getInitialGameState = (): GameState => ({
    isPlaying: false,
    eventQueue: [],
    phase: Phase.INIT,
    week: 0,
    totalWeeksInPhase: 0,
    subjects: getInitialSubjects(),
    general: getInitialGeneral(),
    oiStats: getInitialOIStats(),
    selectedSubjects: [],
    competition: 'None',
    club: null,
    romancePartner: null,
    className: '待分班',
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
    debugMode: false,
    activeStatuses: [],
    unlockedAchievements: [],
    achievementPopup: null,
    difficulty: 'NORMAL',
    isWeekend: false,
    weekendActionPoints: 0,
    weekendProcessed: false,
    sleepCount: 0,
    talents: [],
    inventory: []
});

const INITIAL_GENERAL_CONST = getInitialGeneral(); // Keep for UI reference in custom mode

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'HOME' | 'TALENTS' | 'GAME'>('HOME');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [customStats, setCustomStats] = useState<GeneralStats>(getInitialGeneral());
  const [showChangelog, setShowChangelog] = useState(false);
  const [showClubSelection, setShowClubSelection] = useState(false); // UI State for club modal
  const [showShop, setShowShop] = useState(false); // UI State for shop
  
  // Game State
  const [state, setState] = useState<GameState>(getInitialGameState());
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Talent Selection State
  const [availableTalents, setAvailableTalents] = useState<Talent[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);
  const [talentPoints, setTalentPoints] = useState(3); // Initial Points, user starts with 3


  // New State for Weekend Activity Result Modal
  const [weekendResult, setWeekendResult] = useState<{
      activity: WeekendActivity;
      diff: string[];
      resultText: string;
      newState: GameState;
  } | null>(null);


  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Load Achievements
  useEffect(() => {
      const saved = localStorage.getItem('bz_sim_achievements');
      if (saved) {
          setState(prev => ({ ...prev, unlockedAchievements: JSON.parse(saved) }));
      }
  }, []);

  const unlockAchievement = useCallback((id: string) => {
      setState(prev => {
          // Achievement Lock for Difficulty
          if (prev.difficulty !== 'REALITY') return prev;

          if (prev.unlockedAchievements.includes(id)) return prev;
          const newUnlocked = [...prev.unlockedAchievements, id];
          localStorage.setItem('bz_sim_achievements', JSON.stringify(newUnlocked));
          const ach = ACHIEVEMENTS[id];
          return {
              ...prev,
              unlockedAchievements: newUnlocked,
              achievementPopup: ach || null,
              log: [...prev.log, { message: `【成就解锁】${ach?.title || id}`, type: 'success', timestamp: Date.now() }]
          };
      });
      setTimeout(() => {
          setState(prev => ({ ...prev, achievementPopup: null }));
      }, 3000);
  }, []);

  // --- Core Game Loop: Time Flow ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    // IMPORTANT: Stop timer if it's weekend, showing popup, or event active
    if (state.isPlaying && !state.currentEvent && state.eventQueue.length === 0 && !state.popupCompetitionResult && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL && !state.isWeekend && !weekendResult) {
        interval = setInterval(() => {
            processWeekStep();
        }, 1500); // 1.5s per week
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.currentEvent, state.eventQueue, state.popupCompetitionResult, state.phase, state.isWeekend, weekendResult]);

  // --- Core Game Loop: Queue Processing ---
  useEffect(() => {
      if (!state.currentEvent && state.eventQueue.length > 0 && !state.popupCompetitionResult && !state.isWeekend && !weekendResult) {
          const nextEvent = state.eventQueue[0];
          setState(prev => ({
              ...prev,
              currentEvent: nextEvent,
              eventQueue: prev.eventQueue.slice(1),
              isPlaying: false // Pause for event
          }));
      }
  }, [state.eventQueue, state.currentEvent, state.popupCompetitionResult, state.isWeekend, weekendResult]);


  const prepareGame = () => {
      // 1. Reset UI
      setWeekendResult(null);
      setShowClubSelection(false);
      
      // 2. Roll Random Talents
      // Ensure we get a mix of good and bad
      const pool = [...TALENTS];
      const buffs = pool.filter(t => t.cost > 0).sort(() => 0.5 - Math.random()).slice(0, 5); // 5 Positives
      const debuffs = pool.filter(t => t.cost < 0).sort(() => 0.5 - Math.random()).slice(0, 4); // 4 Negatives
      
      const mixed = [...buffs, ...debuffs].sort(() => 0.5 - Math.random()); // Shuffle

      setAvailableTalents(mixed);
      setSelectedTalents([]);
      
      // Points based on difficulty
      let initialPoints = 3;
      if (selectedDifficulty === 'HARD') initialPoints = 1;
      if (selectedDifficulty === 'REALITY') initialPoints = 0;
      
      setTalentPoints(initialPoints); 

      setView('TALENTS');
  }

  const startGame = () => {
    // GENERATE FRESH STATE
    const rolledSubjects = getInitialSubjects();
    (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
      rolledSubjects[k] = {
        aptitude: Math.floor(Math.random() * 40 + 60),
        level: Math.floor(Math.random() * 10 + 5)
      };
      
      // Difficulty Balance: Buff Normal mode subjects
      if (selectedDifficulty === 'NORMAL') {
          rolledSubjects[k].aptitude += 15; // Higher aptitude means easier scaling
          rolledSubjects[k].level += 5;     // Higher base level
      }
    });

    let initialGeneral = getInitialGeneral();
    let initialStatuses: GameStatus[] = [];

    // Apply Difficulty Logic
    if (selectedDifficulty === 'CUSTOM') {
        initialGeneral = { ...customStats };
    } else {
        initialGeneral = { ...DIFFICULTY_PRESETS[selectedDifficulty].stats };
    }

    // Apply Reality Debuffs
    if (selectedDifficulty === 'REALITY') {
        initialStatuses.push({ ...STATUSES['anxious'], duration: 4 });
        initialStatuses.push({ ...STATUSES['debt'], duration: 2 }); // Initial debt pressure
    }

    // Initialize fresh state to avoid pollution
    let tempState: GameState = {
        ...getInitialGameState(),
        subjects: rolledSubjects,
        general: initialGeneral,
        activeStatuses: initialStatuses,
        talents: selectedTalents,
        oiStats: getInitialOIStats(),
        romancePartner: null // Explicitly clear partner
    };

    // Apply Talent Effects
    selectedTalents.forEach(t => {
        if (t.effect) {
             const updates = t.effect(tempState);
             // Manually merge because Typescript partials can be shallow
             if(updates.general) tempState.general = { ...tempState.general, ...updates.general };
             if(updates.subjects) tempState.subjects = { ...tempState.subjects, ...updates.subjects }; 
             if(updates.oiStats) tempState.oiStats = { ...tempState.oiStats, ...updates.oiStats };
        }
    });


    const firstEvent = PHASE_EVENTS[Phase.SUMMER].find(e => e.id === 'sum_goal_selection');
    
    // Final State Initialization
    setState(prev => ({
      ...tempState, // Use modified fresh state
      unlockedAchievements: prev.unlockedAchievements, // Persist achievements from previous session
      
      // New Game Setup
      phase: Phase.SUMMER,
      week: 1,
      totalWeeksInPhase: 5,
      
      currentEvent: firstEvent || null,
      triggeredEvents: firstEvent ? [firstEvent.id] : [],
      log: [{ message: "北京八中模拟器启动。", type: 'success', timestamp: Date.now() }],
      
      className: '待分班',
      club: null,
      romancePartner: null, // Double check
      competition: 'None',
      
      difficulty: selectedDifficulty,
      isPlaying: false,
      eventQueue: [],
      weekendProcessed: false,
      sleepCount: 0
    }));
    
    setView('GAME');
    setTimeout(() => unlockAchievement('first_blood'), 100);
  };

  const handleTalentToggle = (talent: Talent) => {
      const isSelected = selectedTalents.find(t => t.id === talent.id);
      
      if (isSelected) {
          // Deselect: Refund/Remove cost
          setTalentPoints(prev => prev + talent.cost);
          setSelectedTalents(prev => prev.filter(t => t.id !== talent.id));
      } else {
          // Select: Check if we can select (limit max talents if we want, or just points)
          // Let's limit to max 5 talents total for UI sanity, but points are the main constraint
          if (selectedTalents.length >= 5) {
              // Optional: Provide feedback like "Too many talents"
              return;
          }
          
          setTalentPoints(prev => prev - talent.cost);
          setSelectedTalents(prev => [...prev, talent]);
      }
  };

  const endGame = () => {
      setWeekendResult(null); // Clear any pending weekend actions
      setState(prev => ({ ...prev, phase: Phase.WITHDRAWAL, isPlaying: false, currentEvent: null }));
  };

  const processWeekStep = () => {
      setState(prev => {
          // --- Critical Failure Check (Priority 1) ---
          if (prev.general.health <= 0 || prev.general.mindset <= 0) {
              return { 
                  ...prev, 
                  phase: Phase.WITHDRAWAL, 
                  isPlaying: false,
                  currentEvent: null, 
                  eventQueue: [], 
                  log: [...prev.log, { message: "你的身心状态已达极限，被迫休学...", type: 'error', timestamp: Date.now() }]
              };
          }
          
          if (prev.general.money >= 200) unlockAchievement('rich');
          if (prev.general.money <= -250) unlockAchievement('in_debt');
          if (prev.general.health < 10 && prev.phase === Phase.SEMESTER_1) unlockAchievement('survival');
          if (prev.general.romance >= 95) unlockAchievement('romance_master');

          // Logic to Determine Next State
          let nextPhase = prev.phase;
          let nextWeek = prev.week + 1;
          let nextTotal = prev.totalWeeksInPhase;
          let eventsToAdd: GameEvent[] = [];
          let forcePause = false;
          let triggerClubSelection = false;

          // Temporary state accumulators to avoid mutation
          let nextGeneral = { ...prev.general };
          let nextSubjects = { ...prev.subjects };
          let nextOIStats = { ...prev.oiStats };
          let newLogs: GameLogEntry[] = [];

          // --- Phase Transition Logic ---
          if (prev.phase === Phase.SUMMER && prev.week >= 5) { 
              // UPDATE: Set Military duration to 2 weeks
              nextPhase = Phase.MILITARY; nextWeek = 1; nextTotal = 2; 
          } else if (prev.phase === Phase.MILITARY && prev.week >= 2) { 
              // UPDATE: Check for week 2 completion
              nextPhase = Phase.SELECTION; nextWeek = 0; forcePause = true;
          } else if (prev.phase === Phase.SEMESTER_1) {
              // Club Selection Trigger (Week 2)
              if (prev.week === 2 && !prev.club) triggerClubSelection = true;

              if (prev.competition === 'OI' && prev.week === 10) { nextPhase = Phase.CSP_EXAM; forcePause = true; }
              else if (prev.week === 11) { nextPhase = Phase.MIDTERM_EXAM; forcePause = true; } 
              else if (prev.competition === 'OI' && prev.week === 18) { nextPhase = Phase.NOIP_EXAM; forcePause = true; }
              else if (prev.week >= 21) { nextPhase = Phase.FINAL_EXAM; nextWeek = 0; forcePause = true; }
          }

          if (triggerClubSelection) {
              setShowClubSelection(true);
              forcePause = true;
          }

          // If Phase Changed due to exams/selection, stop timer and return
          if (nextPhase !== prev.phase || triggerClubSelection) {
              return {
                  ...prev,
                  phase: nextPhase,
                  week: nextWeek,
                  totalWeeksInPhase: nextTotal,
                  isPlaying: false
              };
          }

          // --- WEEKEND LOGIC CHECK ---
          // Before processing the new week, check if we need to pause for Weekend
          // Only in Semester 1 (for now), and ONLY if we haven't processed weekend for this week yet
          if (prev.phase === Phase.SEMESTER_1 && !prev.isWeekend && !prev.weekendProcessed && prev.week > 0) {
               // Calculate available Action Points
               let ap = 2; // Base AP
               
               // OI Deduction
               if (prev.competition === 'OI') {
                   ap -= 1;
                   newLogs.push({ message: "【周末】你参加了半天竞赛课，OI能力略微提升。", type: 'info', timestamp: Date.now() });
                   // Passive OI Stat gain
                   nextOIStats.misc += 0.5;
               }

               // Club Deduction (Every 4 weeks: 4, 8, 12, 16, 20)
               if (prev.club && prev.club !== 'none' && prev.week % 4 === 0) {
                   ap -= 1;
                   const clubData = CLUBS.find(c => c.id === prev.club);
                   if (clubData) {
                       newLogs.push({ message: `【周末】你参加了${clubData.name}的活动。`, type: 'info', timestamp: Date.now() });
                       const updates = clubData.action(prev);
                       if (updates.general) nextGeneral = { ...nextGeneral, ...updates.general };
                       if (updates.subjects) nextSubjects = { ...nextSubjects, ...updates.subjects }; // Shallow merge fix needed if partial
                   }
               }
               
               // If AP > 0, pause for weekend interaction
               if (ap > 0) {
                   return {
                       ...prev,
                       general: nextGeneral,
                       subjects: nextSubjects,
                       oiStats: nextOIStats,
                       isWeekend: true,
                       weekendActionPoints: ap,
                       isPlaying: false,
                       log: [...prev.log, ...newLogs, { message: "周末到了，你有一些自由支配的时间。", type: 'info', timestamp: Date.now() }]
                   };
               } else {
                   // No AP left, auto-skip weekend but show logs
                   newLogs.push({ message: "这个周末行程排满了，你没有自由活动时间。", type: 'warning', timestamp: Date.now() });
                   // Fall through to process end of week and increment, implicitly "processing" the weekend
               }
          }

          // --- Weekly Logic (Same Phase) ---

          // 1. Decay & Status Effects
          let activeStatuses = prev.activeStatuses.map(s => ({ ...s, duration: s.duration - 1 })).filter(s => s.duration > 0);
          
          // Money Allowance
          nextGeneral.health = Math.max(0, nextGeneral.health - 0.8);
          nextGeneral.money += 2;

          // Debt Event Logic (Random Trigger)
          if (nextGeneral.money < 0) {
             if (!activeStatuses.find(s => s.id === 'debt')) {
                 activeStatuses.push({ ...STATUSES['debt'], duration: 1 });
             } else {
                 activeStatuses = activeStatuses.map(s => s.id === 'debt' ? { ...s, duration: 1 } : s);
             }
             
             // UPDATE: Simple probability check for Debt Collection
             if (Math.random() < 0.3) { // 30% chance each week while in debt
                 eventsToAdd.unshift(BASE_EVENTS['debt_collection']);
             }
          } else {
             activeStatuses = activeStatuses.filter(s => s.id !== 'debt');
          }

          // Crush Pending & Crush Status Logic
          if (nextGeneral.romance >= 25 && !prev.romancePartner) {
              if (Math.random() < 0.2 && !activeStatuses.find(s => s.id === 'crush_pending') && !activeStatuses.find(s => s.id === 'crush')) {
                   activeStatuses.push({ ...STATUSES['crush_pending'], duration: 3 });
              }
              // TRIGGER FOR REAL CRUSH
              if (nextGeneral.romance >= 35 && Math.random() < 0.15 && !activeStatuses.find(s => s.id === 'crush')) {
                  activeStatuses.push({ ...STATUSES['crush'], duration: 4 });
                  newLogs.push({ message: "你发现自己似乎喜欢上了某个人...", type: 'event', timestamp: Date.now() });
              }
          }

          // Focused & Exhausted Logic
          // Exhausted: Health < 30
          if (nextGeneral.health < 30 && !activeStatuses.find(s => s.id === 'exhausted')) {
              if (Math.random() < 0.4) {
                 activeStatuses.push({ ...STATUSES['exhausted'], duration: 3 });
                 newLogs.push({ message: "身体亮起了红灯，你进入了【透支】状态。", type: 'warning', timestamp: Date.now() });
              }
          }
          // Focused: Efficiency > 15 & Mindset > 70
          if (nextGeneral.efficiency > 15 && nextGeneral.mindset > 70 && !activeStatuses.find(s => s.id === 'focused')) {
               if (Math.random() < 0.15) {
                   activeStatuses.push({ ...STATUSES['focused'], duration: 2 });
                   newLogs.push({ message: "状态极佳，你进入了【心流】状态。", type: 'success', timestamp: Date.now() });
               }
          }

          // Apply Status Effects
          activeStatuses.forEach(s => {
              if (s.id === 'anxious') nextGeneral.mindset -= 2;
              if (s.id === 'exhausted') nextGeneral.health -= 2;
              if (s.id === 'focused') nextGeneral.efficiency += 2;
              if (s.id === 'in_love') nextGeneral.mindset += 5;
              if (s.id === 'debt') { nextGeneral.mindset -= 5; nextGeneral.romance -= 3; }
              if (s.id === 'crush_pending') { nextGeneral.luck += 2; nextGeneral.experience += 2; }
              if (s.id === 'crush') { nextGeneral.efficiency -= 2; nextGeneral.romance += 2; }
          });

          // 2. Generate Events for this week
          
          // A. Study Event (Always happens in Semester 1)
          if (nextPhase === Phase.SEMESTER_1) {
              eventsToAdd.push(generateStudyEvent(prev));
              
              // B. Random Flavor Event
              eventsToAdd.push(generateRandomFlavorEvent(prev));

              // C. Fixed Events
              if (nextWeek === 15) eventsToAdd.push(SCIENCE_FESTIVAL_EVENT);
              if (nextWeek === 19) {
                  let gala = { ...NEW_YEAR_GALA_EVENT };
                  if (prev.romancePartner) {
                      gala.choices = [
                          { 
                            text: `和${prev.romancePartner}溜出去逛街`, 
                            action: (s) => ({ 
                                general: { ...s.general, romance: s.general.romance + 30, mindset: s.general.mindset + 20, money: s.general.money - 50 },
                                activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 5 }] 
                            }) 
                          },
                          ...(gala.choices || [])
                      ];
                  }
                  eventsToAdd.push(gala);
              }
          }
          
          // D. Phase specific random events (Summer/Military)
          const phaseEvents = PHASE_EVENTS[nextPhase] || [];
          const eligible = phaseEvents.filter(e => e.triggerType !== 'FIXED' && (!e.once || !prev.triggeredEvents.includes(e.id)) && (!e.condition || e.condition(prev)));
          
          let eventProb = 0.4;
          if (nextPhase === Phase.SUMMER) {
              eventProb = 0.8; 
          }
          // GUARANTEE EVENT IN MILITARY (It's short)
          if (nextPhase === Phase.MILITARY) {
              eventProb = 1.0;
          }

          if (eligible.length > 0 && Math.random() < eventProb) {
              eventsToAdd.push(eligible[Math.floor(Math.random() * eligible.length)]);
          }

          return {
            ...prev,
            phase: nextPhase, 
            week: nextWeek, 
            totalWeeksInPhase: nextTotal,
            general: nextGeneral,
            subjects: nextSubjects,
            oiStats: nextOIStats,
            activeStatuses,
            eventQueue: [...prev.eventQueue, ...eventsToAdd],
            log: [...prev.log, ...newLogs, { message: `Week ${nextWeek}`, type: 'info', timestamp: Date.now() }],
            weekendProcessed: false // Reset flag for the new week
          };
      });
  };

  const handleChoice = (choice: any) => {
    setState(prev => {
      const updates = choice.action(prev);
      const diff: string[] = [];
      if (updates.general) {
          const newG = updates.general as GeneralStats;
          const oldG = prev.general;
          if (Math.floor(newG.mindset) !== Math.floor(oldG.mindset)) diff.push(`心态 ${newG.mindset - oldG.mindset > 0 ? '+' : ''}${Math.floor(newG.mindset - oldG.mindset)}`);
          if (Math.floor(newG.health) !== Math.floor(oldG.health)) diff.push(`健康 ${newG.health - oldG.health > 0 ? '+' : ''}${Math.floor(newG.health - oldG.health)}`);
          if (Math.floor(newG.money) !== Math.floor(oldG.money)) diff.push(`金钱 ${newG.money - oldG.money > 0 ? '+' : ''}${Math.floor(newG.money - oldG.money)}`);
          if (Math.floor(newG.romance) !== Math.floor(oldG.romance)) diff.push(`魅力 ${newG.romance - oldG.romance > 0 ? '+' : ''}${Math.floor(newG.romance - oldG.romance)}`);
      }
      if (updates.oiStats) diff.push("OI能力提升");
      if (updates.subjects) diff.push("学科能力变动");
      if (updates.activeStatuses) diff.push("状态更新");
      if (updates.sleepCount) diff.push("睡觉次数+1");
      if (diff.length === 0) diff.push("无明显变化");

      return { 
          ...prev, 
          ...updates, 
          eventResult: { choice, diff }, 
          history: [{ 
              week: prev.week, 
              phase: prev.phase, 
              eventTitle: prev.currentEvent?.title || '', 
              choiceText: choice.text, 
              resultSummary: diff.join(' | '), 
              timestamp: Date.now() 
          }, ...prev.history] 
      };
    });
  };

  const handleEventConfirm = () => {
    setState(s => {
        let nextEvent: GameEvent | null = null;
        if (s.eventResult?.choice.nextEventId) {
             const allEvents = [...Object.values(PHASE_EVENTS).flat(), ...Object.values(CHAINED_EVENTS), ...Object.values(BASE_EVENTS)];
             nextEvent = allEvents.find(e => e.id === s.eventResult?.choice.nextEventId) || null;
        }
        if (s.chainedEvent) nextEvent = s.chainedEvent;

        if (nextEvent) {
             return { ...s, currentEvent: nextEvent, chainedEvent: null, eventResult: null, triggeredEvents: [...s.triggeredEvents, nextEvent.id] };
        }
        
        return { ...s, currentEvent: null, eventResult: null, isPlaying: true };
    });
  };

  const handleClubSelect = (clubId: ClubId) => {
      setState(prev => ({
          ...prev,
          club: clubId,
          isPlaying: true, // Resume
          log: [...prev.log, { message: `你加入了${CLUBS.find(c => c.id === clubId)?.name || '无社团'}。`, type: 'success', timestamp: Date.now() }]
      }));
      setShowClubSelection(false);
  };

  const handleShopPurchase = (item: Item) => {
      setState(prev => {
          if (prev.general.money < item.price) {
              return prev;
          }
          const updates = item.effect(prev);
          const nextGeneral = { ...prev.general, ...updates.general };
          
          return {
              ...prev,
              ...updates,
              general: nextGeneral,
              inventory: [...prev.inventory, item.id],
              log: [...prev.log, { message: `购买了${item.name}，消费${item.price}元。`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  const handleWeekendActivityClick = (activity: WeekendActivity) => {
      const updates = activity.action(state);
      const newState = {
          ...state,
          ...updates,
          general: { ...state.general, ...(updates.general || {}) },
          sleepCount: (state.sleepCount || 0) + (updates.sleepCount as number || 0),
      };
      if (updates.subjects) newState.subjects = { ...state.subjects, ...updates.subjects };
      if (updates.oiStats) newState.oiStats = { ...state.oiStats, ...updates.oiStats };

      const diff: string[] = [];
      const newG = newState.general;
      const oldG = state.general;
      if (Math.floor(newG.mindset) !== Math.floor(oldG.mindset)) diff.push(`心态 ${newG.mindset - oldG.mindset > 0 ? '+' : ''}${Math.floor(newG.mindset - oldG.mindset)}`);
      if (Math.floor(newG.health) !== Math.floor(oldG.health)) diff.push(`健康 ${newG.health - oldG.health > 0 ? '+' : ''}${Math.floor(newG.health - oldG.health)}`);
      if (Math.floor(newG.money) !== Math.floor(oldG.money)) diff.push(`金钱 ${newG.money - oldG.money > 0 ? '+' : ''}${Math.floor(newG.money - oldG.money)}`);
      if (Math.floor(newG.romance) !== Math.floor(oldG.romance)) diff.push(`魅力 ${newG.romance - oldG.romance > 0 ? '+' : ''}${Math.floor(newG.romance - oldG.romance)}`);
      if (Math.floor(newG.experience) !== Math.floor(oldG.experience)) diff.push(`经验 ${newG.experience - oldG.experience > 0 ? '+' : ''}${Math.floor(newG.experience - oldG.experience)}`);
      if (updates.oiStats) diff.push("OI能力提升");
      if (updates.subjects) diff.push("学科能力变动");
      if (updates.activeStatuses) diff.push("状态更新");
      
      const resultText = typeof activity.resultText === 'function' ? activity.resultText(state) : activity.resultText;

      setWeekendResult({
          activity,
          diff,
          resultText,
          newState
      });
  };

  const confirmWeekendActivity = () => {
      if (!weekendResult) return;
      
      setState(prev => {
          const nextAP = prev.weekendActionPoints - 1;
          const isFinished = nextAP <= 0;
          
          return {
              ...weekendResult.newState,
              weekendActionPoints: nextAP,
              isWeekend: !isFinished,
              isPlaying: isFinished,
              weekendProcessed: isFinished,
              log: [...prev.log, { message: `周末活动：${weekendResult.activity.name}`, type: 'info' as const, timestamp: Date.now() }]
          };
      });
      setWeekendResult(null);
  };

  const handleExamFinish = (result: ExamResult) => {
      setState(prev => {
          let nextPhase = prev.phase;
          let className = prev.className;
          let efficiencyMod = 0;
          let popupResult: CompetitionResultData | null = null;
          let triggeredEvent = prev.currentEvent;
          let logMsg = '';
          let nextTotalWeeks = prev.totalWeeksInPhase;

          let rank = 0;
          let totalStudents = 633; 

          const subjectsTaken = Object.keys(result.scores);
          let maxPossible = 0;
          if (prev.phase === Phase.CSP_EXAM || prev.phase === Phase.NOIP_EXAM) {
              maxPossible = 400; 
          } else {
             maxPossible = subjectsTaken.reduce((acc, sub) => {
                return acc + (['chinese', 'math', 'english'].includes(sub) ? 150 : 100);
             }, 0);
          }

          if (result.totalScore >= maxPossible) {
              rank = 1; 
          } else {
              const ratio = maxPossible > 0 ? result.totalScore / maxPossible : 0;
              const mean = 0.68;
              const stdDev = 0.15;
              const z = (ratio - mean) / stdDev;
              const percentile = 1 / (1 + Math.exp(-1.702 * z));
              rank = Math.max(1, Math.floor(totalStudents * (1 - percentile)) + 1);
          }
          
          if (rank === 1) unlockAchievement('top_rank');
          if (rank > totalStudents * 0.98) unlockAchievement('bottom_rank');
          if (prev.sleepCount >= 20 && rank <= 50) unlockAchievement('sleep_god');

          let perfectScore = false;
          Object.entries(result.scores).forEach(([sub, score]) => {
              const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
              if (score >= max) perfectScore = true;
          });
          if (perfectScore) unlockAchievement('nerd');

          let hasFailed = false;
          Object.entries(result.scores).forEach(([sub, score]) => {
              const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
              if (score / max <= 0.6) hasFailed = true;
          });
          if (hasFailed) triggeredEvent = BASE_EVENTS['exam_fail_talk'];

          if (prev.phase === Phase.PLACEMENT_EXAM) {
              if (result.totalScore > 540) { className = "一类实验班"; efficiencyMod = 4; }
              else if (result.totalScore > 480) { className = "二类实验班"; efficiencyMod = 2; }
              else { className = "普通班"; }
              nextPhase = Phase.SEMESTER_1;
              nextTotalWeeks = 21;
              logMsg = `分班考试结束，你被分配到了【${className}】。`;

          } else if (prev.phase === Phase.MIDTERM_EXAM) {
              nextPhase = Phase.SUBJECT_RESELECTION;
              logMsg = "期中考试结束，请重新审视你的选科。";
          } else if (prev.phase === Phase.CSP_EXAM) {
              const award = result.totalScore >= 170 ? "一等奖" : result.totalScore >= 140 ? "二等奖" : "三等奖";
              popupResult = { title: "CSP-J/S 2026", score: result.totalScore, award };
              return { ...prev, popupCompetitionResult: popupResult, examResult: result };
          } else if (prev.phase === Phase.NOIP_EXAM) {
              const award = result.totalScore >= 144 ? "省一等奖" : result.totalScore >= 112 ? "省二等奖" : "省三等奖";
              popupResult = { title: "NOIP 2026", score: result.totalScore, award };
              if (award === "省一等奖") unlockAchievement('oi_god');
              return { ...prev, popupCompetitionResult: popupResult, examResult: result };
          } else if (prev.phase === Phase.FINAL_EXAM) {
              nextPhase = Phase.ENDING;
          }

          return {
              ...prev,
              className,
              general: { ...prev.general, efficiency: prev.general.efficiency + efficiencyMod },
              phase: nextPhase,
              totalWeeksInPhase: nextTotalWeeks,
              examResult: { ...result, rank, totalStudents },
              currentEvent: triggeredEvent,
              log: [...prev.log, { message: logMsg || `${prev.phase} 结束。`, type: 'info', timestamp: Date.now() }]
          };
      });
  };

  const closeCompetitionPopup = () => {
      setState(prev => {
          if (!prev.popupCompetitionResult) return prev;
          const newHistory = [...prev.competitionResults, prev.popupCompetitionResult];
          return {
              ...prev,
              popupCompetitionResult: null,
              competitionResults: newHistory,
              phase: Phase.SEMESTER_1,
              isPlaying: true, // Resume play after popup
              log: [...prev.log, { message: "竞赛征程告一段落。", type: 'success', timestamp: Date.now() }]
          };
      });
  };
  
  const getExamTitle = () => {
      switch(state.phase) {
          case Phase.PLACEMENT_EXAM: return "分班考试";
          case Phase.MIDTERM_EXAM: return "期中考试";
          case Phase.CSP_EXAM: return "CSP-J/S 2026";
          case Phase.NOIP_EXAM: return "NOIP 2026";
          case Phase.FINAL_EXAM: return "期末考试";
          default: return "考试";
      }
  };

  const getEndingAnalysis = () => {
      const { general, examResult, activeStatuses, sleepCount, competitionResults, competition, unlockedAchievements } = state;
      let title = "普通高中生";
      let rank = "B";
      let comment = "你的高中生活波澜不惊。";
      let score = 0;

      score += general.mindset + general.health + general.experience + general.luck + general.romance + general.efficiency * 5;
      score += unlockedAchievements.length * 50;

      if (state.phase === Phase.WITHDRAWAL) {
          rank = "F";
          title = "遗憾离场";
          comment = "虽然这次不得不停下脚步，但健康永远是第一位的。养好身体，未来还有无限可能。";
      } else {
          if (competition === 'OI') {
             const noip = competitionResults.find(r => r.title.includes('NOIP'));
             if (noip && noip.award.includes('一等奖')) {
                 rank = "SSS";
                 title = "OI大神";
                 comment = "你在信息学竞赛中展现了惊人的天赋！";
                 score += 1000;
             } else if (noip && noip.award.includes('二等奖')) {
                 rank = "A";
                 title = "竞赛强手";
                 comment = "虽然离省一仅一步之遥，但你的实力已经超越了绝大多数人。";
                 score += 500;
             }
          }

          if (examResult?.rank && examResult.rank <= 3) {
              rank = "SSS";
              title = "全能卷王";
              comment = `期末考年级第 ${examResult.rank} 名！你是八中当之无愧的传说，老师口中的“那个学生”。`;
              score += 1000;
          } else if (examResult?.rank && examResult.rank <= 50) {
              if (rank !== "SSS") {
                  rank = "S";
                  title = "名校预备";
                  comment = "成绩优异，只要保持下去，985高校稳稳的。";
                  score += 600;
              }
          }

          if (general.romance > 90 && state.romancePartner) {
              title = "现充赢家";
              comment = `不仅成绩不错，还收获了与 ${state.romancePartner} 的甜蜜爱情，真是让人嫉妒啊。`;
              score += 300;
          } else if (general.money < -100) {
              title = "负债累累";
              comment = "虽然学业完成了，但你的经济状况令人担忧...";
          } else if (sleepCount > 20) {
              title = "八中睡神";
              comment = `一个学期睡了 ${sleepCount} 次，竟然还能顺利结业，这也是一种天赋。`;
          }
      }
      
      return { rank, title, comment, score };
  };

  const endingData = (state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) ? getEndingAnalysis() : null;

  // --- HOME VIEW ---
  if (view === 'HOME') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-10 font-sans relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden">
                 <div className="absolute top-10 left-10 text-9xl font-black rotate-12">8</div>
                 <div className="absolute bottom-10 right-10 text-9xl font-black -rotate-12">OI</div>
             </div>

             {/* Header */}
             <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 md:mb-8 transform -rotate-6 z-10">
                <i className="fas fa-school text-white text-4xl md:text-5xl"></i>
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-2 md:mb-4 tracking-tighter z-10 text-center">八中重开模拟器</h1>
             <p className="text-slate-400 mb-8 md:mb-10 text-lg md:text-xl font-medium z-10">Made by lg37</p>

             {/* Difficulty Selection */}
             <div className="w-full max-w-4xl z-10 mb-8">
                 <h3 className="text-center text-slate-500 font-bold mb-4 uppercase tracking-widest text-sm">选择你的开局难度</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                     {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS['NORMAL']][]).map(([key, config]) => (
                         <button key={key} onClick={() => setSelectedDifficulty(key)}
                             className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 group ${selectedDifficulty === key ? 'border-indigo-600 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50 hover:bg-white hover:shadow-md'}`}
                         >
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${config.color} shadow-md`}>
                                 {key === 'REALITY' ? <i className="fas fa-skull"></i> : key === 'HARD' ? <i className="fas fa-exclamation"></i> : <i className="fas fa-coffee"></i>}
                             </div>
                             <div className="font-black text-slate-800">{config.label}</div>
                             <div className="text-[10px] text-slate-500 leading-tight">{config.desc}</div>
                         </button>
                     ))}
                     <button onClick={() => setSelectedDifficulty('CUSTOM')}
                         className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 group ${selectedDifficulty === 'CUSTOM' ? 'border-indigo-600 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50 hover:bg-white hover:shadow-md'}`}
                     >
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold shadow-md"><i className="fas fa-sliders-h"></i></div>
                          <div className="font-black text-slate-800">自定义</div>
                          <div className="text-[10px] text-slate-500 leading-tight">我是神，由于我太强了，所以我要自定义属性</div>
                     </button>
                 </div>
             </div>

             {/* Custom Stats Editor */}
             {selectedDifficulty === 'CUSTOM' && (
                 <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-lg border border-slate-100 z-10 mb-8 animate-fadeIn">
                     <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fas fa-pen"></i> 配置初始属性</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(Object.keys(INITIAL_GENERAL_CONST) as (keyof GeneralStats)[]).map(key => (
                             <div key={key}>
                                 <label className="text-xs font-bold text-slate-400 uppercase flex justify-between mb-1">
                                     <span>{key}</span>
                                     <span className="text-indigo-600">{customStats[key]}</span>
                                 </label>
                                 <input type="range" min="0" max="100" value={customStats[key]} onChange={(e) => setCustomStats(prev => ({...prev, [key]: parseInt(e.target.value)}))} 
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                 />
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* Warnings & Start */}
             <div className="z-10 flex flex-col items-center gap-4">
                {selectedDifficulty !== 'REALITY' && (
                    <div className="text-amber-600 text-xs font-bold bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
                        <i className="fas fa-exclamation-triangle mr-2"></i>注意：仅在【现实】难度下可解锁成就
                    </div>
                )}
                
                <div className="flex gap-4">
                    <button onClick={() => setShowChangelog(true)} className="bg-white text-slate-500 px-6 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i className="fas fa-history"></i> <span className="hidden md:inline">更新日志</span>
                    </button>
                    <button onClick={prepareGame} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-105 flex items-center gap-3">
                        <i className="fas fa-play"></i> 开启模拟
                    </button>
                </div>
             </div>

             {/* Changelog Modal */}
             {showChangelog && (
                 <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowChangelog(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">更新日志</h2>
                             <button onClick={() => setShowChangelog(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">
                             {CHANGELOG_DATA.map((log, i) => (
                                 <div key={i}>
                                     <div className="flex items-baseline gap-2 mb-2">
                                         <span className="text-lg font-bold text-indigo-600">{log.version}</span>
                                         <span className="text-xs text-slate-400 font-mono">{log.date}</span>
                                     </div>
                                     <ul className="list-disc list-inside space-y-1">
                                         {log.content.map((item, idx) => (
                                             <li key={idx} className="text-sm text-slate-600">{item}</li>
                                         ))}
                                     </ul>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             )}
          </div>
      );
  }

  // --- TALENT SELECTION VIEW ---
  if (view === 'TALENTS') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 md:p-10 font-sans relative">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">天赋抉择</h2>
              <div className="flex items-center gap-4 mb-8 bg-slate-800 px-6 py-3 rounded-full border border-slate-700">
                  <span className="text-slate-400 font-bold">剩余点数</span>
                  <span className={`text-2xl font-black ${talentPoints >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{talentPoints}</span>
                  <span className="text-xs text-slate-500 border-l border-slate-600 pl-4 ml-2">选择负面天赋以获取更多点数</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl w-full mb-8 overflow-y-auto max-h-[60vh] p-2 custom-scroll">
                  {availableTalents.map(talent => {
                      const isSelected = selectedTalents.some(t => t.id === talent.id);
                      return (
                        <button 
                            key={talent.id} 
                            onClick={() => handleTalentToggle(talent)}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 h-44 relative overflow-hidden group text-left ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg transform scale-105 z-10' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <div className="flex justify-between w-full items-start">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${talent.rarity === 'cursed' ? 'bg-rose-900 text-rose-300' : 'bg-slate-700 text-slate-400'}`}>
                                    {talent.rarity}
                                </span>
                                <span className={`text-xs font-black px-2 py-1 rounded-full ${talent.cost > 0 ? 'bg-slate-900 text-red-400' : 'bg-emerald-900 text-emerald-400'}`}>
                                    {talent.cost > 0 ? `-${talent.cost}` : `+${Math.abs(talent.cost)}`}
                                </span>
                            </div>
                            
                            <h3 className="text-base md:text-lg font-bold mt-1 leading-tight">{talent.name}</h3>
                            <p className={`text-xs leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{talent.description}</p>
                            
                            {isSelected && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                    <i className="fas fa-check text-[10px]"></i>
                                </div>
                            )}
                        </button>
                      );
                  })}
              </div>

              <div className="flex gap-4 z-20 bg-slate-900/90 backdrop-blur p-4 rounded-2xl border border-slate-800">
                  <button onClick={() => setView('HOME')} className="text-slate-500 font-bold hover:text-white transition-colors px-4">返回</button>
                  <button 
                    onClick={startGame} 
                    disabled={talentPoints < 0}
                    className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                      {talentPoints < 0 ? '点数不足' : '入学吧。'} 
                      {talentPoints >= 0 && <i className="fas fa-arrow-right"></i>}
                  </button>
              </div>
          </div>
      )
  }

  // --- GAME VIEW ---
  return (
    <div className="h-[100dvh] bg-slate-100 flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-hidden font-sans text-slate-900 relative">
      {/* Toast */}
      {state.achievementPopup && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fadeIn border border-slate-700">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 text-xl shadow-lg border-2 border-white"><i className={`fas ${state.achievementPopup.icon}`}></i></div>
              <div>
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Achievement Unlocked</div>
                  <div className="font-black text-lg">{state.achievementPopup.title}</div>
              </div>
          </div>
      )}

      {/* Sidebar: Stacked on mobile, Side on desktop */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2 md:gap-4 max-h-[30vh] md:max-h-full overflow-y-auto md:overflow-visible">
          <StatsPanel state={state} />
          <div className="hidden md:grid grid-cols-2 gap-2">
            <button onClick={() => setShowShop(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600">
                 <i className="fas fa-store text-emerald-500 mb-1"></i><span className="text-xs">小卖部</span>
            </button>
            <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600">
              <i className="fas fa-archive text-indigo-500 mb-1"></i><span className="text-xs">历程</span>
            </button>
            <button onClick={() => setShowAchievements(true)} className="col-span-2 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600 relative">
                 <i className="fas fa-trophy text-yellow-500 mb-1"></i><span className="text-xs">成就</span>
                 <span className="absolute top-2 right-2 bg-slate-100 text-[9px] px-1.5 rounded-full">{state.unlockedAchievements.length}</span>
            </button>
            <button onClick={endGame} className="col-span-2 bg-rose-100 hover:bg-rose-200 p-2 rounded-xl text-xs font-bold text-rose-600 transition-colors">提前退休（结束游戏）</button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-2 md:gap-4 relative h-full overflow-hidden">
        {/* Mobile-only Controls Toolbar */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1 flex-shrink-0">
             <button onClick={() => setShowShop(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-store text-emerald-500 mr-1"></i>小卖部</button>
             <button onClick={() => setShowAchievements(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-trophy text-yellow-500 mr-1"></i>成就</button>
             <button onClick={() => setShowHistory(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-archive text-indigo-500 mr-1"></i>历程</button>
             <button onClick={endGame} className="flex-shrink-0 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 shadow-sm">结束</button>
        </div>

        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3 flex-shrink-0 z-20 relative">
               <div className="flex items-center justify-between">
                   {/* UPDATE: Removed overflow-hidden to allow tooltips to show */}
                   <div className="flex flex-col gap-1 w-full mr-4">
                       <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight truncate">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${state.isSick ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span> {state.phase} 
                        </h2>
                        {/* Status Bar: Added flex-wrap to prevent layout break */}
                        <div className="flex gap-2 items-center flex-wrap">
                            {state.activeStatuses.length > 0 ? state.activeStatuses.map(s => (
                                <div key={s.id} className={`group relative flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold shadow-sm cursor-help ${s.type === 'BUFF' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.type === 'DEBUFF' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <i className={`fas ${s.icon}`}></i> {s.name} ({s.duration}w)
                                    {/* Tooltip: Increased z-index to 60 */}
                                    <div className="absolute top-full left-0 mt-1 w-48 p-3 bg-slate-800 text-white rounded-xl shadow-2xl z-[60] hidden group-hover:block text-xs font-normal pointer-events-none">
                                        <div className="font-bold mb-1 text-amber-300">{s.name}</div>
                                        <div className="mb-2 leading-tight">{s.description}</div>
                                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700">效果: {s.effectDescription}</div>
                                    </div>
                                </div>
                            )) : <span className="text-[10px] text-slate-300 font-medium italic">无特殊状态</span>}
                            {/* Talents in Header */}
                            {state.talents.map(t => (
                                <div key={t.id} className="group relative flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold shadow-sm cursor-help bg-purple-50 border-purple-200 text-purple-700">
                                     <i className="fas fa-star"></i> {t.name}
                                     <div className="absolute top-full left-0 mt-1 w-48 p-3 bg-slate-800 text-white rounded-xl shadow-2xl z-[60] hidden group-hover:block text-xs font-normal pointer-events-none">
                                        <div className="font-bold mb-1 text-amber-300">{t.name}</div>
                                        <div className="mb-2 leading-tight">{t.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                   </div>
                   
                   {/* Play/Pause Control */}
                   <button 
                      onClick={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))} 
                      disabled={!!state.currentEvent || state.isWeekend || !!weekendResult}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-all ${state.currentEvent || state.isWeekend || weekendResult ? 'bg-slate-100 text-slate-300' : state.isPlaying ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                   >
                      <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                   </button>
               </div>
               <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${calculateProgress(state)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">Week {state.week}/{state.totalWeeksInPhase || '-'}</span>
               </div>
        </header>

        {/* Log Area */}
        <div className="flex-1 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 overflow-y-auto custom-scroll space-y-3 relative">
             {state.log.map((l, i) => (
                <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-300'}`}>
                   <p className="text-sm font-medium">{l.message}</p>
                </div>
             ))}
             <div ref={logEndRef} />
        </div>

        {/* Weekend Modal (Moved OUTSIDE the scrollable log area) */}
        {state.isWeekend && !weekendResult && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
               <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto custom-scroll">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-slate-800"><i className="fas fa-coffee text-amber-500 mr-2"></i>周末自由活动</h2>
                      <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold text-xs">
                          剩余行动点: {state.weekendActionPoints}
                      </div>
                  </div>
                  <p className="text-slate-500 mb-6">难得的周末，你想怎么度过？</p>
                  <div className="space-y-3">
                     {[...WEEKEND_ACTIVITIES].sort((a, b) => {
                         // Sort LOVE and OI to top
                         const aPriority = (a.type === 'LOVE' || a.type === 'OI') ? 1 : 0;
                         const bPriority = (b.type === 'LOVE' || b.type === 'OI') ? 1 : 0;
                         return bPriority - aPriority;
                     }).map(activity => {
                         if (activity.condition && !activity.condition(state)) return null;
                         return (
                             <button key={activity.id} onClick={() => handleWeekendActivityClick(activity)}
                                 className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all group flex justify-between items-center"
                             >
                                 <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0 ${activity.type === 'OI' ? 'bg-indigo-500 group-hover:bg-white group-hover:text-indigo-600' : activity.type === 'LOVE' ? 'bg-rose-500 group-hover:bg-white group-hover:text-rose-600' : 'bg-slate-400 group-hover:bg-white group-hover:text-slate-600'}`}>
                                        <i className={`fas ${activity.icon}`}></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base">{activity.name}</span>
                                        <span className="text-[10px] opacity-60 font-normal">{activity.description}</span>
                                    </div>
                                 </div>
                                 <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all"></i>
                             </button>
                         )
                     })}
                  </div>
               </div>
            </div>
        )}

        {/* Weekend Result Modal (Moved OUTSIDE the scrollable log area) */}
        {weekendResult && (
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-fadeIn">
                 <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-t-8 border-indigo-500">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-white shadow-lg ${weekendResult.activity.type === 'OI' ? 'bg-indigo-500' : weekendResult.activity.type === 'LOVE' ? 'bg-rose-500' : 'bg-amber-400'}`}>
                         <i className={`fas ${weekendResult.activity.icon}`}></i>
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 mb-2">{weekendResult.activity.name}</h3>
                     <p className="text-slate-600 mb-6 leading-relaxed text-lg">{weekendResult.resultText}</p>
                     
                     {weekendResult.diff.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                           {weekendResult.diff.map((d, i) => (
                             <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : d.includes('-') ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{d}</span>
                           ))}
                        </div>
                     )}

                     <button onClick={confirmWeekendActivity} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl transition-all">
                         确定
                     </button>
                 </div>
             </div>
        )}

        {/* Club Selection Modal */}
        {showClubSelection && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                 <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                     <h2 className="text-3xl font-black text-center mb-2">百团大战</h2>
                     <p className="text-center text-slate-500 mb-6">社团活动将占用你每四周的一个周末行动点。</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scroll p-2">
                         {CLUBS.map(club => (
                             <button key={club.id} onClick={() => handleClubSelect(club.id)}
                                 className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex flex-col gap-2 group"
                             >
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                         <i className={`fas ${club.icon}`}></i>
                                     </div>
                                     <span className="font-bold text-lg text-slate-800">{club.name}</span>
                                 </div>
                                 <p className="text-xs text-slate-500 leading-relaxed">{club.description}</p>
                                 <div className="mt-auto pt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit group-hover:bg-white">
                                     {club.effectDescription}
                                 </div>
                             </button>
                         ))}
                         <button onClick={() => handleClubSelect('none')} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-400 hover:bg-slate-50 transition-all text-left flex flex-col justify-center items-center gap-2 text-slate-400">
                             <span className="font-bold">不参加社团</span>
                             <span className="text-xs">以此换取更多的自由时间</span>
                         </button>
                     </div>
                 </div>
             </div>
        )}

        {/* Shop Modal */}
        {showShop && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowShop(false)}>
                 <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-6">
                         <div>
                            <h2 className="text-2xl font-black text-slate-800">八中小卖部</h2>
                            <p className="text-sm text-slate-500">持有金钱: <span className="text-yellow-600 font-bold">{state.general.money}</span></p>
                         </div>
                         <button onClick={() => setShowShop(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scroll p-1">
                         {SHOP_ITEMS.map(item => (
                             <button 
                                key={item.id} 
                                onClick={() => handleShopPurchase(item)}
                                disabled={state.general.money < item.price}
                                className="p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                     <i className={`fas ${item.icon} text-xl`}></i>
                                 </div>
                                 <div className="flex-1">
                                     <div className="flex justify-between items-center">
                                         <span className="font-bold text-slate-800">{item.name}</span>
                                         <span className="text-sm font-bold text-yellow-600">{item.price} G</span>
                                     </div>
                                     <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                                 </div>
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
        )}

        {/* Event Modal Overlay */}
        {state.currentEvent && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 z-20 animate-fadeIn">
               <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-slate-200 max-h-[85vh] overflow-y-auto custom-scroll">
                  {!state.eventResult ? (
                    <>
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-xl md:text-2xl font-black text-slate-800">{state.currentEvent.title}</h2>
                          {state.eventQueue.length > 0 && <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">+{state.eventQueue.length} 更多</span>}
                      </div>
                      {/* FIXED: Handle dynamic description text */}
                      <p className="text-slate-600 mb-8 text-base md:text-lg leading-relaxed">
                          {typeof state.currentEvent.description === 'function' 
                            ? state.currentEvent.description(state) 
                            : state.currentEvent.description}
                      </p>
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
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"><i className="fas fa-check"></i></div>
                      <h2 className="text-xl font-black text-slate-800 mb-2 italic">"{state.eventResult.choice.text}"</h2>
                      {state.eventResult.diff.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-8 mt-4">
                           {state.eventResult.diff.map((d, i) => (
                             <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : d.includes('-') ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{d}</span>
                           ))}
                        </div>
                      )}
                      <button onClick={handleEventConfirm} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl">
                           {(state.chainedEvent || state.eventResult.choice.nextEventId) ? '继续...' : '确认结果'}
                      </button>
                    </div>
                  )}
               </div>
            </div>
        )}
        
        {/* Exams / Selection / Endings */}
        {(state.phase === Phase.SELECTION || state.phase === Phase.SUBJECT_RESELECTION) && (
            <div className="absolute inset-0 bg-white/95 z-30 p-4 md:p-10 flex flex-col items-center justify-center rounded-2xl">
               <h2 className="text-3xl font-black mb-4">高一选科</h2>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10 w-full max-w-lg">
                  {(['physics', 'chemistry', 'biology', 'history', 'geography', 'politics'] as SubjectKey[]).map(s => (
                    <button key={s} onClick={() => setState(prev => ({ ...prev, selectedSubjects: prev.selectedSubjects.includes(s) ? prev.selectedSubjects.filter(x => x !== s) : (prev.selectedSubjects.length < 3 ? [...prev.selectedSubjects, s] : prev.selectedSubjects) }))}
                      className={`p-4 rounded-2xl border-2 transition-all font-bold ${state.selectedSubjects.includes(s) ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                      {SUBJECT_NAMES[s]}
                    </button>
                  ))}
               </div>
               <button disabled={state.selectedSubjects.length !== 3} onClick={() => setState(prev => ({ ...prev, phase: prev.phase === Phase.SELECTION ? Phase.PLACEMENT_EXAM : Phase.SEMESTER_1 }))} className="bg-indigo-600 disabled:bg-slate-200 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl">确认选择</button>
            </div>
        )}
        
        {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) && (
             <div className="absolute inset-0 z-40 rounded-2xl overflow-hidden">
                 <ExamView 
                    title={getExamTitle()} 
                    state={state} 
                    onFinish={handleExamFinish} 
                 />
             </div>
        )}

        {/* Final Settlement Overlay - IMPROVED UI */}
        {(state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) && endingData && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md text-slate-800 flex flex-col items-center justify-center p-4 md:p-6 animate-fadeIn overflow-y-auto">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border-4 border-slate-800 relative shrink-0">
                    
                    {/* Rank Stamp */}
                    <div className="absolute top-0 right-0 z-20 pointer-events-none transform translate-x-1/4 -translate-y-1/4 md:translate-x-0 md:-translate-y-0 md:top-6 md:right-6">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-8 border-red-600 flex items-center justify-center rotate-12 opacity-80 animate-pulse bg-white/10 backdrop-blur-sm shadow-xl">
                            <span className="text-6xl md:text-8xl font-black text-red-600 tracking-tighter">{endingData.rank}</span>
                        </div>
                    </div>

                    {/* Left Column: Stats & Profile */}
                    <div className="flex-1 p-8 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                         <div className="flex items-center gap-4 mb-8">
                             <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl shadow-lg flex-shrink-0">
                                <i className="fas fa-user-graduate"></i>
                             </div>
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">八中生涯档案</div>
                                 <h2 className="text-3xl font-black text-slate-900 leading-tight">{endingData.title}</h2>
                                 <div className="text-sm font-bold text-indigo-600 mt-1">{state.className}</div>
                             </div>
                         </div>
                         
                         <p className="text-slate-600 italic mb-8 border-l-4 border-indigo-200 pl-4 py-1">
                             "{endingData.comment}"
                         </p>

                         {/* Stats Grid */}
                         <div className="space-y-4">
                             <h3 className="font-black text-slate-400 uppercase text-xs">综合能力评估</h3>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                 {/* Simple Stat Bars */}
                                 {[
                                     { label: '心态', val: state.general.mindset, max: 100, color: 'bg-blue-500' },
                                     { label: '健康', val: state.general.health, max: 100, color: 'bg-emerald-500' },
                                     { label: '效率', val: state.general.efficiency * 5, max: 100, color: 'bg-purple-500' },
                                     { label: '魅力', val: state.general.romance, max: 100, color: 'bg-rose-500' },
                                     { label: 'OI实力', val: (state.oiStats.dp + state.oiStats.ds + state.oiStats.math + state.oiStats.string + state.oiStats.graph + state.oiStats.misc) * 5, max: 100, color: 'bg-indigo-500' },
                                     { label: '财富', val: Math.max(0, Math.min(100, state.general.money / 5)), max: 100, color: 'bg-yellow-500' },
                                 ].map((stat, i) => (
                                     <div key={i} className="flex flex-col gap-1">
                                         <div className="flex justify-between text-xs font-bold text-slate-600">
                                             <span>{stat.label}</span>
                                             <span>{stat.val > 100 ? 'MAX' : Math.floor(stat.val)}</span>
                                         </div>
                                         <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                             <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${Math.min(100, stat.val)}%` }}></div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>

                    {/* Right Column: Highlights & Achievements */}
                    <div className="flex-1 p-8 flex flex-col bg-white">
                        {state.talents.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-black text-slate-400 uppercase text-xs mb-3">天赋</h3>
                                <div className="flex flex-wrap gap-2">
                                    {state.talents.map(t => (
                                        <div key={t.id} className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 border border-slate-200">
                                            {t.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-black text-slate-400 uppercase text-xs mb-4">学期高光时刻</h3>
                            <div className="space-y-4 relative">
                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                                {state.history.slice(0, 4).map((h, i) => (
                                    <div key={i} className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-white border-4 border-indigo-500 flex-shrink-0 z-10"></div>
                                        <div>
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase">{h.phase}</div>
                                            <div className="text-sm font-bold text-slate-800">{h.eventTitle}</div>
                                            <div className="text-xs text-slate-500">{h.resultSummary}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                             <div className="flex justify-between items-end mb-4">
                                 <div>
                                     <div className="text-xs font-bold text-slate-400 uppercase">本局成就</div>
                                     <div className="text-2xl font-black text-slate-800">{state.unlockedAchievements.length} 个</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs font-bold text-slate-400 uppercase">最终得分</div>
                                     <div className="text-4xl font-black text-indigo-600">{Math.floor(endingData.score)}</div>
                                 </div>
                             </div>
                             
                             <div className="flex gap-3">
                                 <button onClick={() => setView('HOME')} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                                     <i className="fas fa-redo-alt"></i> 再来一年
                                 </button>
                                 <button onClick={() => setShowHistory(true)} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                                     <i className="fas fa-history"></i>
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {state.popupCompetitionResult && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn p-4">
                <div className="bg-white rounded-[40px] p-8 md:p-12 text-center max-w-lg w-full shadow-2xl relative border-4 border-yellow-400">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"><i className="fas fa-trophy text-white text-4xl"></i></div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-6 mb-2">{state.popupCompetitionResult.title}</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{state.popupCompetitionResult.score} pts</div>
                        <div className="text-2xl font-bold text-yellow-600">{state.popupCompetitionResult.award}</div>
                    </div>
                    <button onClick={closeCompetitionPopup} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl w-full">收入囊中</button>
                </div>
             </div>
        )}

        {showAchievements && (
             <div className="absolute inset-0 z-[60] flex justify-center items-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4" onClick={() => setShowAchievements(false)}>
                <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-4xl w-full h-3/4 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                         <div>
                            <h2 className="text-3xl font-black text-slate-800">成就墙</h2>
                            {state.difficulty !== 'REALITY' && <p className="text-xs text-rose-500 font-bold mt-1">当前难度无法解锁新成就</p>}
                         </div>
                         <button onClick={() => setShowAchievements(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(ACHIEVEMENTS).map(ach => (
                            <div key={ach.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${state.unlockedAchievements.includes(ach.id) ? 'bg-indigo-50 border-indigo-200' : 'opacity-50 grayscale'}`}>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow flex-shrink-0"><i className={`fas ${ach.icon} text-indigo-500`}></i></div>
                                <div><h4 className="font-bold text-sm md:text-base">{ach.title}</h4><p className="text-[10px] md:text-xs text-slate-500">{ach.description}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {showHistory && (
             <div className="absolute inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setShowHistory(false)}>
                <div className="w-full md:w-96 bg-white h-full shadow-2xl p-6 md:p-8 flex flex-col animate-slideInRight" onClick={e => e.stopPropagation()}>
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
      </main>
    </div>
  );
};

export default App;
