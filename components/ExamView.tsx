
import React, { useState, useEffect } from 'react';
import { GameState, ExamResult, SubjectKey, SUBJECT_NAMES, Phase } from '../types';

interface ExamViewProps {
  title: string;
  state: GameState;
  onFinish: (result: ExamResult) => void;
}

const ExamView: React.FC<ExamViewProps> = ({ title, state, onFinish }) => {
  const [examStep, setExamStep] = useState(0);
  const [examLogs, setExamLogs] = useState<string[]>([]);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Determine which subjects to test based on phase
  const getSubjectsToTest = (): SubjectKey[] => {
    if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
      // For competition, we use 'math' as a proxy for algorithmic ability
      return ['math'];
    }
    if (state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.FINAL_EXAM) {
      if (state.selectedSubjects.length === 3) {
          return ['chinese', 'math', 'english', ...state.selectedSubjects];
      }
      return ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'];
    }
    return Object.keys(state.subjects) as SubjectKey[];
  };

  const subjectsToTest = getSubjectsToTest();

  useEffect(() => {
    if (examStep < subjectsToTest.length) {
      const subject = subjectsToTest[examStep];
      const isMainSubject = ['chinese', 'math', 'english'].includes(subject);
      const maxScore = isMainSubject ? 150 : 100;

      const timer = setTimeout(() => {
        const stats = state.subjects[subject];
        
        // 难度调整：降低非竞赛考试的难度
        // 假设 level 范围随时间增长，初期较低。我们需要在 Week 10 左右让普通水平玩家拿到 75% 分数
        // 之前的公式是 base = stats.level.
        // 新公式：混合 aptitude (天赋) 和 level (后天努力)
        // Score % = (Aptitude * 0.4 + Level * 2.5) / 100 * MaxScore * RandomVariation
        // 例：Apt 80, Level 15 -> (32 + 37.5) = 69.5% * Max
        // 加上 Luck 和 Mindset 修正
        
        let basePercentage = (stats.aptitude * 0.4 + stats.level * 2.5) / 100;
        
        // 竞赛考试保持高难度
        if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
            basePercentage = (stats.level * 3) / 100; // 主要看练度
        } else {
             // 普通考试保底机制
             basePercentage = Math.max(0.4, basePercentage); 
        }

        const luckFactor = (state.general.luck - 50) / 500; // +/- 0.1
        const mindsetFactor = (state.general.mindset - 50) / 500; // +/- 0.1
        const randomVar = 0.9 + Math.random() * 0.2; // 0.9 - 1.1

        let finalPercentage = (basePercentage + luckFactor + mindsetFactor) * randomVar;
        finalPercentage = Math.min(1.0, Math.max(0, finalPercentage));
        
        const score = Math.floor(finalPercentage * maxScore);
        
        const isComp = state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM;
        const logMsg = isComp 
            ? `题目 ${examStep + 1} 完成，得分 ${score}`
            : `${SUBJECT_NAMES[subject]} 考试结束，得分 ${score}/${maxScore}。`;

        setCurrentScores(prev => ({ ...prev, [subject]: score }));
        setExamLogs(prev => [...prev, logMsg]);
        setExamStep(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (!isFinished) {
      setIsFinished(true);
      const total = Object.values(currentScores).reduce((a: number, b: number) => a + b, 0);
      
      let comment = "继续努力。";
      if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
          if (total >= 90) comment = "神乎其技，你就是机房的传说！";
          else if (total >= 60) comment = "发挥稳定，应该能拿奖。";
          else comment = "技不如人，甘拜下风。";
      } else {
          // 普通考试评价
          const maxTotal = subjectsToTest.reduce((acc, s) => acc + (['chinese', 'math', 'english'].includes(s) ? 150 : 100), 0);
          const ratio = total / maxTotal;
          if (ratio > 0.85) comment = "傲视群雄，你是八中的明日之星！";
          else if (ratio > 0.75) comment = "表现稳健，保持在这个梯队。";
          else if (ratio > 0.6) comment = "中规中矩，还有提升空间。";
          else comment = "基础不牢，地动山摇。";
      }

      onFinish({
        title,
        scores: currentScores,
        totalScore: total,
        comment
      });
    }
  }, [examStep, state, currentScores, isFinished, onFinish, title]);

  return (
    <div className="bg-slate-900 rounded-3xl p-8 text-white h-full flex flex-col shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <i className="fas fa-file-signature text-indigo-400"></i>
          {title}
        </h2>
        <div className="px-4 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-mono">
          STATUS: IN_PROGRESS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 font-mono text-sm custom-scroll pr-4">
        {examLogs.map((log, i) => (
          <div key={i} className="flex gap-4 items-start animate-fadeIn">
            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-indigo-300">{log}</span>
          </div>
        ))}
        {examStep < subjectsToTest.length && (
          <div className="flex gap-4 items-center">
            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-white">
              {state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM ? '正在攻克算法题...' : `正在进行 ${SUBJECT_NAMES[subjectsToTest[examStep]]} 考试...`}
            </span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-4">
        {subjectsToTest.map((sub, idx) => (
          <div key={sub} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase">
                {state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM ? `PROBLEM ${idx + 1}` : SUBJECT_NAMES[sub]}
            </div>
            <div className="text-xl font-bold text-indigo-400">{currentScores[sub] || '--'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamView;
