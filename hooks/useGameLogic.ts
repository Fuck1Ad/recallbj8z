
import { useState, useEffect, useCallback } from 'react';
import { GameState, Phase, SubjectKey, SubjectStats, GeneralStats, GameEvent, ExamResult, CompetitionResultData, Difficulty, ClubId, WeekendActivity, OIStats, GameLogEntry, Talent, Item, GameStatus } from '../types';
import { DIFFICULTY_PRESETS, MECHANICS_CONFIG } from '../data/constants';
import { TALENTS, ACHIEVEMENTS, STATUSES, CLUBS } from '../data/mechanics';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, generateStudyEvent, generateRandomFlavorEvent, SCIENCE_FESTIVAL_EVENT, NEW_YEAR_GALA_EVENT } from '../data/events';
import { modifyOI } from '../data/utils';

// --- Constants & Helpers ---

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
    initialGeneral: getInitialGeneral(), // Initialize
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
    midtermRank: null,
    competitionResults: [],
    popupCompetitionResult: null,
    popupExamResult: null, 
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
    rejectionCount: 0,
    talents: [],
    inventory: [],
    theme: 'light'
});

export const useGameLogic = () => {
    const [state, setState] = useState<GameState>(getInitialGameState());
    
    // UI State managed here to keep logic close to state changes
    const [weekendResult, setWeekendResult] = useState<{
        activity: WeekendActivity;
        diff: string[];
        resultText: string;
        newState: GameState;
    } | null>(null);

    // --- Achievements ---
    useEffect(() => {
        const saved = localStorage.getItem('bz_sim_achievements');
        if (saved) {
            setState(prev => ({ ...prev, unlockedAchievements: JSON.parse(saved) }));
        }
    }, []);

    const unlockAchievement = useCallback((id: string) => {
        setState(prev => {
            if (prev.difficulty !== 'REALITY') return prev;
            if (prev.unlockedAchievements.includes(id)) return prev;
            
            const newUnlocked = [...prev.unlockedAchievements, id];
            localStorage.setItem('bz_sim_achievements', JSON.stringify(newUnlocked));
            const ach = ACHIEVEMENTS[id];
            
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
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

    // --- Event Queue Processor ---
    useEffect(() => {
        if (!state.currentEvent && state.eventQueue.length > 0 && !weekendResult && !state.popupCompetitionResult && !state.popupExamResult) {
            setState(prev => {
                if (prev.currentEvent || prev.eventQueue.length === 0) return prev;
                
                const [nextEvent, ...rest] = prev.eventQueue;
                return {
                    ...prev,
                    currentEvent: nextEvent,
                    eventQueue: rest,
                    isPlaying: false, 
                    triggeredEvents: [...prev.triggeredEvents, nextEvent.id]
                };
            });
        }
    }, [state.currentEvent, state.eventQueue.length, weekendResult, state.popupCompetitionResult, state.popupExamResult]);


    // --- Core Loop ---
    const processWeekStep = useCallback(() => {
        setState(prev => {
            // Critical Failure Check
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
            if (prev.general.romance >= 250) unlockAchievement('romance_master');
            if (prev.rejectionCount >= 5) unlockAchievement('nice_person');

            let nextPhase = prev.phase;
            let nextWeek = prev.week + 1;
            let nextTotal = prev.totalWeeksInPhase;
            let eventsToAdd: GameEvent[] = [];
            let forcePause = false;
            let triggerClubSelection = false;

            // --- Apply Mechanics: Decay & Regression (Homeostasis) ---
            let nextGeneral = { ...prev.general };
            let nextSubjects = { ...prev.subjects };

            // 1. General Stats Regression (excluding Money)
            // Moves towards initialGeneral by a percentage of the difference
            (['mindset', 'experience', 'luck', 'romance', 'health'] as (keyof GeneralStats)[]).forEach(k => {
                 const diff = nextGeneral[k] - prev.initialGeneral[k];
                 // If positive (buffed), it decays. If negative (debuffed), it recovers (slowly heals).
                 const change = diff * MECHANICS_CONFIG.GENERAL_REGRESSION_RATE;
                 nextGeneral[k] -= change;
            });

            // 2. Efficiency Regression (Stronger decay)
            const effDiff = nextGeneral.efficiency - prev.initialGeneral.efficiency;
            nextGeneral.efficiency -= effDiff * MECHANICS_CONFIG.EFFICIENCY_REGRESSION_RATE;

            // 3. Subject Decay (Forgetting Curve)
            (Object.keys(nextSubjects) as SubjectKey[]).forEach(k => {
                if (nextSubjects[k].level > 0) {
                     nextSubjects[k] = { ...nextSubjects[k], level: nextSubjects[k].level * (1 - MECHANICS_CONFIG.SUBJECT_DECAY_RATE) };
                }
            });
            // ---------------------------------------------------------

            let nextOIStats = { ...prev.oiStats };
            let newLogs: GameLogEntry[] = [];

            // Phase Transitions
            if (prev.phase === Phase.SUMMER && prev.week >= 5) { 
                nextPhase = Phase.MILITARY; nextWeek = 1; nextTotal = 2; 
            } else if (prev.phase === Phase.MILITARY && prev.week >= 2) { 
                nextPhase = Phase.SELECTION; nextWeek = 0; forcePause = true;
            } else if (prev.phase === Phase.SEMESTER_1) {
                if (prev.week === 2 && !prev.club) triggerClubSelection = true;
                if (prev.competition === 'OI' && prev.week === 10) { nextPhase = Phase.CSP_EXAM; forcePause = true; }
                else if (prev.week === 11) { nextPhase = Phase.MIDTERM_EXAM; forcePause = true; } 
                else if (prev.competition === 'OI' && prev.week === 18) { nextPhase = Phase.NOIP_EXAM; forcePause = true; }
                else if (prev.week >= 21) { nextPhase = Phase.FINAL_EXAM; nextWeek = 0; forcePause = true; }
            }

            if (triggerClubSelection || nextPhase !== prev.phase) {
                return {
                    ...prev,
                    phase: nextPhase,
                    week: nextWeek,
                    totalWeeksInPhase: nextTotal,
                    isPlaying: false
                };
            }

            // Weekend Check
            if (prev.phase === Phase.SEMESTER_1 && !prev.isWeekend && !prev.weekendProcessed && prev.week > 0) {
                 let ap = 2; 
                 if (prev.competition === 'OI') {
                     ap -= 1;
                     newLogs.push({ message: "【周末】你参加了半天竞赛课，OI能力略微提升。", type: 'info', timestamp: Date.now() });
                     nextOIStats.misc += 0.5;
                 }

                 if (prev.club && prev.club !== 'none' && prev.week % 4 === 0) {
                     ap -= 1;
                     const clubData = CLUBS.find(c => c.id === prev.club);
                     if (clubData) {
                         newLogs.push({ message: `【周末】你参加了${clubData.name}的活动。`, type: 'info', timestamp: Date.now() });
                         const updates = clubData.action(prev);
                         if (updates.general) nextGeneral = { ...nextGeneral, ...updates.general };
                         if (updates.subjects) nextSubjects = { ...nextSubjects, ...updates.subjects }; 
                     }
                 }
                 
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
                     newLogs.push({ message: "这个周末行程排满了，你没有自由活动时间。", type: 'warning', timestamp: Date.now() });
                 }
            }

            // Regular Week Processing
            let activeStatuses = prev.activeStatuses.map(s => ({ ...s, duration: s.duration - 1 })).filter(s => s.duration > 0);
            
            nextGeneral.health = Math.max(0, nextGeneral.health - 0.8);
            nextGeneral.money += 2;

            if (nextGeneral.money < 0) {
                if (!activeStatuses.find(s => s.id === 'debt')) activeStatuses.push({ ...STATUSES['debt'], duration: 1 });
                else activeStatuses = activeStatuses.map(s => s.id === 'debt' ? { ...s, duration: 1 } : s);
                if (Math.random() < 0.3) eventsToAdd.unshift(BASE_EVENTS['debt_collection']);
            } else {
                activeStatuses = activeStatuses.filter(s => s.id !== 'debt');
            }

            if (nextGeneral.romance >= 25 && !prev.romancePartner) {
                if (Math.random() < 0.2 && !activeStatuses.find(s => s.id === 'crush_pending') && !activeStatuses.find(s => s.id === 'crush')) activeStatuses.push({ ...STATUSES['crush_pending'], duration: 3 });
                if (nextGeneral.romance >= 35 && Math.random() < 0.15 && !activeStatuses.find(s => s.id === 'crush')) {
                    activeStatuses.push({ ...STATUSES['crush'], duration: 4 });
                    newLogs.push({ message: "你发现自己似乎喜欢上了某个人...", type: 'event', timestamp: Date.now() });
                }
            }

            if (nextGeneral.health < 30 && !activeStatuses.find(s => s.id === 'exhausted')) {
                if (Math.random() < 0.4) {
                   activeStatuses.push({ ...STATUSES['exhausted'], duration: 3 });
                   newLogs.push({ message: "身体亮起了红灯，你进入了【透支】状态。", type: 'warning', timestamp: Date.now() });
                }
            }
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

            // Generate Events
            if (nextPhase === Phase.SEMESTER_1) {
                eventsToAdd.push(generateStudyEvent(prev));
                eventsToAdd.push(generateRandomFlavorEvent(prev));
                if (nextWeek === 15) eventsToAdd.push(SCIENCE_FESTIVAL_EVENT);
                if (nextWeek === 19) {
                    let gala = { ...NEW_YEAR_GALA_EVENT };
                    if (prev.romancePartner) {
                        // @ts-ignore
                        gala.choices = [{ text: `和${prev.romancePartner}溜出去逛街`, action: (s) => ({ general: { ...s.general, romance: s.general.romance + 30, mindset: s.general.mindset + 20, money: s.general.money - 50 }, activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 5 }] }) }, ...(gala.choices || [])];
                    }
                    eventsToAdd.push(gala);
                }
            }
            
            const phaseEvents = PHASE_EVENTS[nextPhase] || [];
            const eligible = phaseEvents.filter(e => e.triggerType !== 'FIXED' && (!e.once || !prev.triggeredEvents.includes(e.id)) && (!e.condition || e.condition(prev)));
            const fixedWeekEvents = phaseEvents.filter(e => e.triggerType === 'FIXED' && e.fixedWeek === nextWeek);
            eventsToAdd.push(...fixedWeekEvents);
            
            let eventProb = 0.4;
            if (nextPhase === Phase.SUMMER) eventProb = 0.8; 
            if (nextPhase === Phase.MILITARY) eventProb = 1.0;

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
              weekendProcessed: false
            };
        });
    }, [unlockAchievement]);

    // --- Action Handlers ---

    const startGame = (difficulty: Difficulty, customStats: GeneralStats, selectedTalents: Talent[]) => {
        const rolledSubjects = getInitialSubjects();
        (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
            rolledSubjects[k] = {
                aptitude: Math.floor(Math.random() * 40 + 60),
                level: Math.floor(Math.random() * 10 + 5)
            };
            if (difficulty === 'NORMAL') {
                rolledSubjects[k].aptitude += 15;
                rolledSubjects[k].level += 5;
            }
        });

        let initialGeneral = difficulty === 'CUSTOM' ? { ...customStats } : { ...DIFFICULTY_PRESETS[difficulty].stats };
        let initialStatuses: GameStatus[] = [];
        if (difficulty === 'REALITY') {
            initialStatuses.push({ ...STATUSES['anxious'], duration: 4 });
            initialStatuses.push({ ...STATUSES['debt'], duration: 2 });
        }

        let tempState: GameState = {
            ...getInitialGameState(),
            subjects: rolledSubjects,
            general: initialGeneral,
            initialGeneral: { ...initialGeneral }, // Snap shot for regression baseline
            activeStatuses: initialStatuses,
            talents: selectedTalents,
            oiStats: getInitialOIStats(),
            romancePartner: null
        };

        selectedTalents.forEach(t => {
            if (t.effect) {
                const updates = t.effect(tempState);
                if(updates.general) tempState.general = { ...tempState.general, ...updates.general };
                if(updates.subjects) tempState.subjects = { ...tempState.subjects, ...updates.subjects }; 
                if(updates.oiStats) tempState.oiStats = { ...tempState.oiStats, ...updates.oiStats };
            }
        });

        // After talent application, update the baseline if we want talents to be permanent baseline buffs
        // OR keep baseline as original to make talents act as a "head start" that regresses.
        // DECISION: Update baseline so talents are permanent buffs.
        tempState.initialGeneral = { ...tempState.general };

        const firstEvent = PHASE_EVENTS[Phase.SUMMER].find(e => e.id === 'sum_goal_selection');
        setState(prev => ({
            ...tempState,
            unlockedAchievements: prev.unlockedAchievements,
            phase: Phase.SUMMER,
            week: 1,
            totalWeeksInPhase: 5,
            currentEvent: firstEvent || null,
            triggeredEvents: firstEvent ? [firstEvent.id] : [],
            log: [{ message: "北京八中模拟器启动。", type: 'success', timestamp: Date.now() }],
            difficulty,
            isPlaying: false
        }));
        setTimeout(() => unlockAchievement('first_blood'), 100);
    };

    const handleChoice = (choice: any, callback?: (diffs: string[]) => void) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setState(prev => {
            const updates = choice.action(prev);
            const tempState = { ...prev, ...updates };
            if (updates.general) tempState.general = { ...prev.general, ...updates.general };
            
            const diffs: string[] = []; 
            if (callback) callback(diffs); 

            return { 
                ...tempState,
                eventResult: { choice, diff: diffs }, 
                history: [{ 
                    week: prev.week, phase: prev.phase, eventTitle: prev.currentEvent?.title || '', choiceText: choice.text, 
                    resultSummary: '...', timestamp: Date.now() 
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
            
            // If there's a chained event, trigger it immediately
            if (nextEvent) {
                return { 
                    ...s, 
                    currentEvent: nextEvent, 
                    chainedEvent: null, 
                    eventResult: null, 
                    triggeredEvents: [...s.triggeredEvents, nextEvent.id],
                    isPlaying: false
                };
            }
            
            // Otherwise, return to map. The useEffect hook will pick up the next event from queue if any.
            return { ...s, currentEvent: null, eventResult: null, isPlaying: true };
        });
    };

    const handleClubSelect = (clubId: ClubId) => {
        setState(prev => ({
            ...prev,
            club: clubId,
            isPlaying: true,
            log: [...prev.log, { message: `你加入了${CLUBS.find(c => c.id === clubId)?.name || '无社团'}。`, type: 'success', timestamp: Date.now() }]
        }));
    };

    const handleShopPurchase = (item: Item, onSuccess: () => void) => {
        setState(prev => {
            if (prev.general.money < item.price) return prev;
            onSuccess();
            const updates = item.effect(prev);
            return {
                ...prev, ...updates,
                general: { ...prev.general, ...updates.general },
                inventory: [...prev.inventory, item.id],
                log: [...prev.log, { message: `购买了${item.name}，消费${item.price}元。`, type: 'success', timestamp: Date.now() }]
            };
        });
    };

    const handleWeekendActivityClick = (activity: WeekendActivity, callback: (diffs: string[]) => void) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const updates = activity.action(state);
        const newState = { ...state, ...updates, general: { ...state.general, ...(updates.general || {}) } };
        if (updates.subjects) newState.subjects = { ...state.subjects, ...updates.subjects };
        if (updates.oiStats) newState.oiStats = { ...state.oiStats, ...updates.oiStats };
        
        const diffs: string[] = [];
        
        setWeekendResult({ activity, diff: diffs, resultText: typeof activity.resultText === 'function' ? activity.resultText(state) : activity.resultText, newState });
        callback(diffs);
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
                log: [...prev.log, { message: `周末活动：${weekendResult.activity.name}`, type: 'info', timestamp: Date.now() }]
            };
        });
        setWeekendResult(null);
    };

    const closeExamResult = () => {
        setState(prev => {
            if (!prev.popupExamResult) return prev;
            const nextPhase = prev.popupExamResult.nextPhase || prev.phase;
            return {
                ...prev,
                popupExamResult: null,
                phase: nextPhase,
                isPlaying: true, // Resume logic
            };
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
            let nextTotalWeeks = prev.totalWeeksInPhase;
            let midtermRank = prev.midtermRank;
  
            let rank = 0;
            let totalStudents = 633; 
  
            const subjectsTaken = Object.keys(result.scores);
            let maxPossible = 0;
            const isOI = prev.phase === Phase.CSP_EXAM || prev.phase === Phase.NOIP_EXAM;

            if (isOI) {
                maxPossible = 400;
            } else {
                 maxPossible = subjectsTaken.reduce((acc, sub) => acc + (['chinese', 'math', 'english'].includes(sub) ? 150 : 100), 0);
            }
  
            // Rank Calculation Fix
            if (result.totalScore >= maxPossible) { 
                rank = 1; 
            } else {
                // Adjust Mean and StdDev based on game difficulty and time
                // Average student usually gets 65-75% of max score.
                const meanRatio = 0.68;
                const stdDevRatio = 0.12; // Wider spread
                
                const meanScore = maxPossible * meanRatio;
                const stdDev = maxPossible * stdDevRatio;
                
                // Z-score calculation
                const z = (result.totalScore - meanScore) / stdDev;
                
                // Cumulative Distribution Function approx
                const percentile = 0.5 * (1 + Math.tanh(z * 0.8)); // Simplified erf
                
                rank = Math.max(1, Math.floor(totalStudents * (1 - percentile)) + 1);
            }
            
            if (rank === 1) unlockAchievement('top_rank');
            if (rank > totalStudents * 0.98) unlockAchievement('bottom_rank');
            if (prev.sleepCount >= 20 && rank <= 50) unlockAchievement('sleep_god');
            
            // Check perfect scores
            let perfectScore = false;
            Object.entries(result.scores).forEach(([sub, score]) => {
                const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
                if (!isOI && score >= max) perfectScore = true;
            });
            if (perfectScore) unlockAchievement('nerd');

            // Phase Logic
            if (prev.phase === Phase.PLACEMENT_EXAM) {
                if (result.totalScore > 540) { className = "一类实验班"; efficiencyMod = 4; }
                else if (result.totalScore > 480) { className = "二类实验班"; efficiencyMod = 2; }
                else { className = "普通班"; }
                nextPhase = Phase.SEMESTER_1; nextTotalWeeks = 21;
                logMsg = `分班考试结束，你被分配到了【${className}】。`;
            } else if (prev.phase === Phase.MIDTERM_EXAM) {
                nextPhase = Phase.SUBJECT_RESELECTION; midtermRank = rank;
                logMsg = `期中考试结束，年级排名: ${rank}。请重新审视你的选科。`;
            } else if (prev.phase === Phase.CSP_EXAM) {
                const award = result.totalScore >= 170 ? "一等奖" : result.totalScore >= 140 ? "二等奖" : "三等奖";
                popupResult = { title: "CSP-J/S 2026", score: result.totalScore, award };
                return { ...prev, popupCompetitionResult: popupResult, examResult: { ...result, rank, totalStudents } };
            } else if (prev.phase === Phase.NOIP_EXAM) {
                const award = result.totalScore >= 144 ? "省一等奖" : result.totalScore >= 112 ? "省二等奖" : "省三等奖";
                popupResult = { title: "NOIP 2026", score: result.totalScore, award };
                if (award === "省一等奖") unlockAchievement('oi_god');
                return { ...prev, popupCompetitionResult: popupResult, examResult: { ...result, rank, totalStudents } };
            } else if (prev.phase === Phase.FINAL_EXAM) {
                nextPhase = Phase.ENDING;
            }
  
            // Pause for Normal Exams (Placement, Midterm, Final)
            const pauseForExam = prev.phase === Phase.PLACEMENT_EXAM || prev.phase === Phase.MIDTERM_EXAM || prev.phase === Phase.FINAL_EXAM;

            return {
                ...prev, 
                className: className || prev.className,
                general: { ...prev.general, efficiency: prev.general.efficiency + efficiencyMod },
                totalWeeksInPhase: nextTotalWeeks,
                examResult: { ...result, rank, totalStudents }, 
                midtermRank, 
                currentEvent: triggeredEvent,
                log: [...prev.log, { message: logMsg || `${prev.phase} 结束。`, type: 'info', timestamp: Date.now() }],
                // If standard exam, set popup result and pause. If logic handles phase transition immediately, we store it for later.
                popupExamResult: pauseForExam ? { ...result, rank, totalStudents, nextPhase } : null,
                phase: pauseForExam ? prev.phase : nextPhase, // Don't advance phase if pausing
                isPlaying: !pauseForExam // Stop playing if pausing
            };
        });
    };

    return {
        state, setState,
        weekendResult, setWeekendResult,
        processWeekStep, startGame, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
        handleWeekendActivityClick, confirmWeekendActivity, handleExamFinish, unlockAchievement, closeExamResult
    };
};
