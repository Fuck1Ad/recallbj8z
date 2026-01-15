
import React, { useState } from 'react';

interface RealityGuideModalProps {
    onClose: () => void;
}

const RealityGuideModal: React.FC<RealityGuideModalProps> = ({ onClose }) => {
    const [tab, setTab] = useState<'STATS' | 'MECHANICS' | 'EXAMS'>('STATS');

    return (
        <div className="absolute inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-book-reader text-indigo-600"></i> 现实模式生存手册
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setTab('STATS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'STATS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        状态映射
                    </button>
                    <button onClick={() => setTab('MECHANICS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'MECHANICS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        认知偏差
                    </button>
                    <button onClick={() => setTab('EXAMS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'EXAMS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        考试机制
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scroll text-sm text-slate-700 leading-relaxed">
                    
                    {tab === 'STATS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">五维属性 (0-100+)</h3>
                                <p className="text-xs text-slate-500 mb-2">适用于：心态、经验、魅力、健康、运气</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>糟糕透顶</span> <span>&lt; 20</span></div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded border border-orange-100 flex justify-between"><span>不太妙</span> <span>20 - 39</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>平平无奇</span> <span>40 - 59</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between"><span>感觉良好</span> <span>60 - 79</span></div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex justify-between"><span>充满自信</span> <span>80 - 99</span></div>
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded border border-amber-100 flex justify-between font-bold"><span>超凡脱俗</span> <span>&ge; 100</span></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">学习效率 (状态)</h3>
                                <p className="text-xs text-slate-500 mb-2">普通模式下基础值为14，范围约 -5 ~ 25</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>极度涣散</span> <span>&lt; 0</span></div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded border border-orange-100 flex justify-between"><span>心不在焉</span> <span>0 - 5</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>普普通通</span> <span>5 - 10</span></div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex justify-between"><span>专注</span> <span>10 - 15</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between"><span>高效</span> <span>15 - 20</span></div>
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded border border-amber-100 flex justify-between font-bold"><span>心流</span> <span>&ge; 20</span></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">学科掌握 (Level)</h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>一窍不通</span> <span>&lt; 10</span></div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded border border-orange-100 flex justify-between"><span>略懂皮毛</span> <span>10 - 24</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>马马虎虎</span> <span>25 - 44</span></div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex justify-between"><span>渐入佳境</span> <span>45 - 64</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between"><span>得心应手</span> <span>65 - 84</span></div>
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded border border-amber-100 flex justify-between font-bold"><span>登峰造极</span> <span>&ge; 85</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'MECHANICS' && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="font-bold text-indigo-700 mb-2">基本公式</h4>
                                <p className="font-mono text-xs bg-white p-2 rounded border border-slate-200 mb-2">
                                    感知值 = 真实值 + 认知偏差 + 随机波动
                                </p>
                                <p className="text-xs text-slate-500">你在面板上看到的文字描述是基于“感知值”而非“真实值”生成的。</p>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">1. 认知偏差 (Cognitive Bias)</h4>
                                <p className="mb-2">你的<span className="font-bold text-indigo-600">心态</span>决定了你如何看待自己：</p>
                                <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                                    <li>心态 = 50：认知准确。</li>
                                    <li>心态 &lt; 50：<span className="text-rose-600 font-bold">冒充者综合症</span>。你会低估自己的能力，觉得“我不行”。</li>
                                    <li>心态 &gt; 50：<span className="text-emerald-600 font-bold">达克效应</span>。你会高估自己的能力，觉得“我无敌了”。</li>
                                    <li>对于学科，<span className="font-bold">天赋</span>越高，也越容易产生盲目自信。</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">2. 随机波动 (Noise)</h4>
                                <p className="mb-2">你的<span className="font-bold text-amber-600">经验</span>决定了你对自己认知的稳定性：</p>
                                <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                                    <li>经验越低，你对自己的判断越不稳定，今天觉得“行”，明天觉得“不行”。</li>
                                    <li>经验越高，波动越小，你对自己的定位越清晰。</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {tab === 'EXAMS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2">排名计算机制</h3>
                                <p className="mb-4">八中每次大考（期中、期末）约有 633 名学生参加。排名基于正态分布模型模拟。</p>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-xs">平均水平</div>
                                            <div className="text-xs text-slate-500">全校平均分约为试卷满分的 68%。</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-xs">标准差</div>
                                            <div className="text-xs text-slate-500">约为满分的 15%。这意味着大部分人的分数集中在平均分上下。</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-xs">你的排名</div>
                                            <div className="text-xs text-slate-500">系统根据你的总分计算 Z-Score，然后推算出你在 633 人中的百分位排名。</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-xs">
                                <span className="font-bold block mb-1"><i className="fas fa-lightbulb"></i> 提示：</span>
                                想要拿第一名，你的总分通常需要接近满分（&ge; 98%）。
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RealityGuideModal;
