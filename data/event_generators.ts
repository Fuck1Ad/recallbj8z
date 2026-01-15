
import { GameState, GameEvent, SubjectKey, SUBJECT_NAMES, OIStats } from '../types';
import { modifySub, modifyOI } from './utils';
import { STATUSES } from './mechanics';
import { CHAINED_EVENTS } from './event_defs';

export const generateStudyEvent = (state: GameState): GameEvent => {
    const pool: SubjectKey[] = state.selectedSubjects.length > 0 
        ? ['chinese', 'math', 'english', ...state.selectedSubjects]
        : (Object.keys(SUBJECT_NAMES) as SubjectKey[]);

    const subject = pool[Math.floor(Math.random() * pool.length)];
    const subName = SUBJECT_NAMES[subject];

    return {
        id: `study_weekly_${Date.now()}`,
        title: `${subName}课的抉择`,
        description: `这节是${subName}课，老师讲的内容似乎有点催眠，或者...有点太难了？`,
        type: 'neutral',
        choices: [
            { 
                text: '认真听讲', 
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], 2 + s.general.efficiency * 0.1),
                    general: { ...s.general, mindset: s.general.mindset - 1 }
                }) 
            },
            { 
                text: '偷偷刷题', 
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], 4 + s.general.efficiency * 0.1),
                    general: { ...s.general, health: s.general.health - 2 }
                }) 
            },
            { 
                text: '补觉', 
                action: (s) => ({ 
                    general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 2, efficiency: s.general.efficiency + 1 },
                    subjects: modifySub(s, [subject], -1), 
                    sleepCount: (s.sleepCount || 0) + 1
                }) 
            }
        ]
    };
};

export const generateRandomFlavorEvent = (state: GameState): GameEvent => {
    if (state.romancePartner && Math.random() < 0.25) { 
        const dateLocations = ['西单', '北海公园', '电影院', '图书馆', '什刹海'];
        const loc = dateLocations[Math.floor(Math.random() * dateLocations.length)];
        return {
            id: `evt_date_${Date.now()}`,
            title: '甜蜜约会',
            description: `周末到了，${state.romancePartner}约你去${loc}逛逛。`,
            type: 'positive',
            choices: [
                { 
                    text: '欣然前往', 
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, romance: st.general.romance + 5, mindset: st.general.mindset + 10 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 2 }]
                    }) 
                },
                { 
                    text: '我要学习', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset - 5, romance: st.general.romance - 5 } 
                    }) 
                }
            ]
        };
    }

    const events: ((s: GameState) => GameEvent)[] = [
        (s) => ({
            id: 'evt_rain',
            title: '突如其来的雨',
            description: '放学时，天空突然下起了倾盆大雨。',
            type: 'neutral',
            choices: [
                ...(s.romancePartner ? [{
                    text: `和${s.romancePartner}共撑一把伞`,
                    action: (st: GameState) => ({
                        general: { ...st.general, romance: st.general.romance + 5, mindset: st.general.mindset + 10 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 2 }]
                    })
                }] : []),
                { text: '冒雨跑回去', action: (st) => ({ general: { ...st.general, health: st.general.health - 10, mindset: st.general.mindset - 5 } }) },
                { text: '在便利店买把伞', action: (st) => ({ general: { ...st.general, money: st.general.money - 20 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_homework',
            title: '作业如山',
            description: '今天的作业量异常的大，各科老师仿佛商量好了一样。',
            type: 'negative',
            choices: [
                { text: '熬夜写完', action: (st) => ({ general: { ...st.general, health: st.general.health - 15, efficiency: st.general.efficiency - 2 }, subjects: modifySub(st, ['math', 'english'], 3) }) },
                { text: '抄作业', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 5, luck: st.general.luck - 5 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_snow',
            title: '瑞雪兆丰年',
            description: '外面下雪了，操场上一片白茫茫。',
            type: 'positive',
            choices: [
                 ...(s.romancePartner ? [{
                    text: `和${s.romancePartner}在雪中漫步`,
                    action: (st: GameState) => ({
                        general: { ...st.general, romance: st.general.romance + 10, mindset: st.general.mindset + 15 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 3 }]
                    })
                }] : []),
                { text: '打雪仗！', action: (st) => ({ general: { ...st.general, health: st.general.health + 5, mindset: st.general.mindset + 10 } }) },
                { text: '太冷了，回班', action: (st) => ({ general: { ...st.general, health: st.general.health - 2 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_break_time',
            title: '难得的休息',
            description: '有一节自习课，老师还没来。你打算怎么打发时间？',
            type: 'neutral',
            choices: [
                { 
                    text: '刷B站', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset + 5, efficiency: st.general.efficiency - 1 } 
                    }) 
                },
                { 
                    text: '趴着休息', 
                    action: (st) => ({ 
                        general: { ...st.general, health: st.general.health + 3 }, 
                        sleepCount: (st.sleepCount || 0) + 1 
                    }) 
                },
                { 
                    text: '和周围同学聊天', 
                    action: (st) => ({ 
                        general: { ...st.general, romance: st.general.romance + 3, experience: st.general.experience + 2 } 
                    }) 
                }
            ]
        }),
        (s) => ({
            id: 'evt_dinner',
            title: '周末聚餐',
            description: '几个要好的同学提议周末去西单聚餐。',
            type: 'positive',
            choices: [
                { 
                    text: 'AA制走起 (-30金钱)', 
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, mindset: st.general.mindset + 10, romance: st.general.romance + 5 } 
                    }) 
                },
                { 
                    text: '囊中羞涩，不去了', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset - 2 } 
                    }) 
                }
            ]
        }),
        (s) => ({
            id: 'evt_homework_service',
            title: '代写作业',
            description: '隔壁班的同学想花钱找人代写数学作业。',
            type: 'neutral',
            choices: [
                {
                    text: '接单 (+20金钱)',
                    action: (st) => {
                         const caught = Math.random() < 0.4;
                         if (caught) {
                             return {
                                 general: { ...st.general, mindset: st.general.mindset - 10, efficiency: st.general.efficiency - 2 },
                                 log: [...st.log, { message: "惨！被老师发现了，钱没挣到还挨了顿骂。", type: 'error', timestamp: Date.now() }]
                             }
                         }
                         return { general: { ...st.general, money: st.general.money + 20, efficiency: st.general.efficiency - 1 } }
                    }
                },
                { text: '严词拒绝', action: (st) => ({ general: { ...st.general, mindset: st.general.mindset + 2 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_help_card',
            title: '忘带饭卡',
            description: '排队打饭时，前面的同学发现忘带饭卡了，正尴尬地四处张望。',
            type: 'neutral',
            choices: [
                {
                    text: '帮刷一下',
                    action: (st) => ({
                        general: { ...st.general, money: st.general.money + 10, romance: st.general.romance + 1 },
                        log: [...st.log, { message: "同学非常感激，转了你红包还多给了点。", type: 'success', timestamp: Date.now() }]
                    })
                },
                { text: '假装没看见', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 1 } }) }
            ]
        })
    ];

    if (Math.random() < 0.05) {
        return {
            id: 'evt_lost_card',
            title: '饭卡去哪了',
            description: '中午去食堂打饭时，你摸遍了口袋也没找到饭卡。',
            type: 'negative',
            choices: [
                { text: '借同学的刷', action: (st) => ({ general: { ...st.general, romance: st.general.romance + 2, money: st.general.money - 15 } }) },
                { text: '补办一张', action: (st) => ({ general: { ...st.general, money: st.general.money - 50, mindset: st.general.mindset - 5 } }) }
            ]
        }
    }
    
    if (state.general.luck > 60 && Math.random() < 0.05) {
        return {
            id: 'evt_pickup_money',
            title: '意外之财',
            description: '你在操场的草坪上发现了一张50元纸币，周围没有人。',
            type: 'positive',
            choices: [
                {
                    text: '捡起来 (+50金钱)',
                    action: (st) => ({
                        general: { ...st.general, money: st.general.money + 50, luck: st.general.luck - 5 },
                        log: [...st.log, { message: "运气消耗了一点，但钱包鼓了。", type: 'success', timestamp: Date.now() }]
                    })
                }
            ]
        }
    }

    const picker = events[Math.floor(Math.random() * events.length)];
    return { ...picker(state), id: `flavor_${Date.now()}` };
};

export const generateSummerLifeEvent = (state: GameState): GameEvent => {
    const leisureEvent: GameEvent = {
        id: `sum_leisure_${Date.now()}`,
        title: '暑期休闲时光',
        description: '（并非）漫长的暑假，除了学习，适当的放松也是必要的。今天你打算做什么？',
        type: 'positive',
        choices: [
            {
                text: '刷B站',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 2 },
                    log: [...s.log, { message: "在B站刷了一下午视频，心情舒畅，但感觉脑子变慢了。", type: 'info', timestamp: Date.now() }]
                })
            },
            {
                text: '【数据删除】，启动！',
                action: (s) => {
                    const isLucky = Math.random() < 0.1;
                    return {
                        general: { ...s.general, mindset: s.general.mindset + 3, money: s.general.money - 30, luck: s.general.luck + (isLucky ? 10 : 2) },
                        log: [...s.log, { message: isLucky ? "十连双金！运气爆棚！" : "吃满大保底...但至少出货了。", type: isLucky ? 'success' : 'info', timestamp: Date.now() }]
                    }
                }
            },
            {
                text: '玩Minecraft ',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 8 },
                    log: [...s.log, { message: "你还记得，曾经陪你一起玩的朋友们吗？", type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '预习新学期内容',
                action: (s) => ({
                    subjects: modifySub(s, ['math', 'physics', 'chemistry'], 2),
                    general: { ...s.general, mindset: s.general.mindset - 2, efficiency: s.general.efficiency + 1 },
                    log: [...s.log, { message: "好难啊啊啊啊。", type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    };

    const studyEvents: GameEvent[] = [
        {
            id: 'sum_library_encounter',
            title: '上图书馆！',
            description: '一大早去图书馆，发现门口已经排起了长龙。你费尽九牛二虎之力抢到了一个靠窗的位置。',
            type: 'neutral',
            choices: [
                {
                    text: '死磕数学物理',
                    action: (s) => ({
                        subjects: modifySub(s, ['math', 'physics'], 5),
                        general: { ...s.general, efficiency: s.general.efficiency + 2, health: s.general.health - 2 },
                        log: [...s.log, { message: "我就说上图书馆能加效率吧！", type: 'success', timestamp: Date.now() }]
                    })
                },
                {
                    text: '这本小说好好看！',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset + 4, experience: s.general.experience + 3 }
                    })
                }
            ]
        },
        {
            id: 'sum_online_course',
            title: '这是啥？',
            description: '家长给你报了一个（据说很贵）的线上衔接班，据说主讲老师是【数据删除】的名师。',
            type: 'neutral',
            choices: [
                {
                    text: '认真听讲 ',
                    action: (s) => ({
                        general: { ...s.general,  efficiency: s.general.efficiency + 3 },
                        subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 4),
                        log: [...s.log, { message: "名师果然有一套，你感觉任督二脉被打通了。", type: 'success', timestamp: Date.now() }]
                    })
                },
                {
                    text: '挂机玩手机',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset + 5,efficiency: s.general.efficiency -1 },
                        log: [...s.log, { message: "好好玩。", type: 'warning', timestamp: Date.now() }]
                    })
                }
            ]
        },
        {
            id: 'sum_mistakes_review',
            title: '整理初中错题本',
            description: '翻开积灰的错题本，你决定在高中开始前彻底消灭知识盲区。',
            type: 'positive',
            choices: [
                {
                    text: '温故而知新',
                    action: (s) => ({
                        subjects: modifySub(s, ['math', 'physics', 'chemistry'], 3),
                        general: { ...s.general, efficiency: s.general.efficiency + 2 },
                        log: [...s.log, { message: "基础夯实了，你对分班考试更有信心了。", type: 'success', timestamp: Date.now() }]
                    })
                }
            ]
        }
    ];

    if (Math.random() < 0.5) return leisureEvent;
    return studyEvents[Math.floor(Math.random() * studyEvents.length)];
};

export const generateOIEvent = (state: GameState): GameEvent => {
    if (Math.random() < 0.3) {
        return {
            id: `evt_codeforces_${Date.now()}`,
            title: 'Codeforces Round',
            description: '今晚有一场 Codeforces Div.1+2，你要打吗？',
            type: 'neutral',
            choices: [
                {
                    text: '打！冲Rating！',
                    action: (s) => {
                        const performance = Math.random() * (s.oiStats.misc + s.oiStats.math + 20);
                        const isGood = performance > 30;
                        return {
                            oiStats: modifyOI(s, { misc: isGood ? 2 : 1, math: 1 }),
                            general: { ...s.general, mindset: s.general.mindset + (isGood ? 5 : -5), health: s.general.health - 2 },
                            log: [...s.log, { message: isGood ? "上分了！爽！" : "这什么逆天出题人，再也不打【数据删除】Round了，-220", type: isGood ? 'success' : 'warning', timestamp: Date.now() }]
                        };
                    }
                },
                {
                    text: '算了吧，睡觉',
                    action: (s) => ({
                        general: { ...s.general, health: s.general.health + 2 }
                    })
                }
            ]
        };
    }

    const algoTypes: (keyof OIStats)[] = ['dp', 'ds', 'graph', 'string', 'math'];
    const type1 = algoTypes[Math.floor(Math.random() * algoTypes.length)];
    let type2 = algoTypes[Math.floor(Math.random() * algoTypes.length)];
    while (type2 === type1) type2 = algoTypes[Math.floor(Math.random() * algoTypes.length)];

    return {
        id: `evt_luogu_${Date.now()}`,
        title: '你再一次点开了洛谷',
        description: '看着熟悉的界面，你决定...',
        type: 'neutral',
        choices: [
            {
                text: '去灌水区对线',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience - 1 },
                    log: [...s.log, { message: "你在灌水区和人辩论了三百回合，赢了，但没完全赢。等等，灌水区是不是没了，那刚才和我对线的是……？", type: 'info', timestamp: Date.now() }]
                })
            },
            {
                text: `学习【${type1.toUpperCase()}】`,
                action: (s) => ({
                    oiStats: modifyOI(s, { [type1]: 3 }),
                    general: { ...s.general, experience: s.general.experience + 1 },
                    log: [...s.log, { message: `你看了一下午${type1}的博客，感觉变强了。`, type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: `学习【${type2.toUpperCase()}】`,
                action: (s) => ({
                    oiStats: modifyOI(s, { [type2]: 3 }),
                    general: { ...s.general, experience: s.general.experience + 1 },
                    log: [...s.log, { message: `你看了一下午${type2}的博客，感觉变强了。`, type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '随机跳题',
                action: (s) => {
                    const r = Math.random();
                    let msg = "";
                    let bonus: Partial<OIStats> = {};
                    if (r < 0.2) { msg = "跳到了一道水题，秒了。"; bonus = { misc: 1 }; }
                    else if (r < 0.6) { msg = "跳到了一道经典好题，收获颇丰。"; bonus = { dp: 1, ds: 1, misc: 1 }; }
                    else { msg = "呃啊啊啊出题人怎么这么毒瘤，心态崩了。"; bonus = { misc: 0.5 }; }
                    
                    return {
                        oiStats: modifyOI(s, bonus),
                        general: { ...s.general, mindset: s.general.mindset + (r > 0.6 ? -2 : 1) },
                        log: [...s.log, { message: msg, type: 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    };
};
