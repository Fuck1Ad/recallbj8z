
import { Phase, GameEvent, SubjectKey, GameState } from './types';

const modifySub = (s: GameState, keys: SubjectKey[], val: number) => {
  const newSubs = { ...s.subjects };
  keys.forEach(k => {
    newSubs[k] = { ...newSubs[k], level: Math.max(0, newSubs[k].level + val) };
  });
  return newSubs;
};

// Chained events (Triggered by choices, not randomly)
// Exporting this so the visualizer can find them
export const CHAINED_EVENTS: Record<string, GameEvent> = {
    'sum_confess_success': {
        id: 'sum_confess_success',
        title: '表白成功',
        description: '对方竟然答应了！你们约定在高中互相鼓励，共同进步。',
        type: 'positive',
        choices: [{ text: '太棒了', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 20, romance: s.general.romance + 20 }, romancePartner: '初中同学' }) }]
    },
    'sum_confess_fail': {
        id: 'sum_confess_fail',
        title: '被发好人卡',
        description: '“你是个好人，但我现在只想好好学习。”',
        type: 'negative',
        choices: [{ text: '心碎满地', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 20 } }) }]
    },
    'sum_gaming_caught': {
        id: 'sum_gaming_caught',
        title: '被抓包',
        description: '你的房门突然被推开，父母一脸怒容地看着还在发光的屏幕。“几点了还在玩？！”',
        type: 'negative',
        choices: [{ text: '挨骂', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15 }, isGrounded: true }) }]
    },
    'mil_star_performance': {
        id: 'mil_star_performance',
        title: '军训标兵',
        description: '教官在全连队面前表扬了你的内务整理水平。',
        type: 'positive',
        choices: [{ text: '倍感光荣', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 5 } }) }]
    }
};

export const BASE_EVENTS: Record<string, GameEvent> = {
  'sick': {
    id: 'sick',
    title: '身心俱疲',
    description: '你靠在课桌上，感觉世界在旋转。医生建议你立即回家休养。',
    type: 'negative',
    choices: [{ 
        text: '撑不住了', 
        action: (s) => ({ 
            isSick: true, 
            general: { ...s.general, mindset: s.general.mindset - 5, health: s.general.health - 5 } 
        }) 
    }]
  },
  'exam_fail_talk': {
      id: 'exam_fail_talk',
      title: '班主任的凝视',
      description: '“看看你这门课的分数。”班主任把成绩单拍在桌子上，“连及格线（60%）都不到。你是来八中度假的吗？”',
      type: 'negative',
      choices: [
          { 
              text: '痛定思痛', 
              action: (s) => ({ 
                  general: { ...s.general, mindset: s.general.mindset - 10, efficiency: s.general.efficiency + 3 } 
              }) 
          },
          { 
              text: '低头认错', 
              action: (s) => ({ 
                  general: { ...s.general, mindset: s.general.mindset - 5 } 
              }) 
          }
      ]
  }
};

export const PHASE_EVENTS: Record<string, GameEvent[]> = {
  [Phase.SUMMER]: [
    {
        id: 'sum_goal_selection',
        title: '暑假的抉择',
        description: '在正式开始高中生活前，你需要决定这五周的主攻方向。',
        type: 'neutral',
        once: true,
        choices: [
            { 
              text: '踏上OI之路 (开启信息学竞赛)', 
              action: (s) => ({ 
                competition: 'OI', 
                log: [...s.log, { message: "你选择了OI竞赛。注意：这将带来额外的CSP与NOIP考试挑战！", type: 'warning', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 10 } 
              }) 
            },
            { 
              text: '专注课内综合', 
              action: (s) => ({ 
                competition: 'None', 
                general: { ...s.general, efficiency: s.general.efficiency + 2 } 
              }) 
            }
        ]
    },
    {
        id: 'sum_oi_basics',
        title: '机房的初见',
        description: '你第一次踏进八中的机房，这里的环境比你想象中还要专业。',
        condition: (s) => s.competition === 'OI',
        type: 'positive',
        once: true,
        choices: [{ text: '开始配置环境', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 5 }, subjects: modifySub(s, ['math'], 2) }) }]
    },
    {
        id: 'sum_preview',
        title: '预习压力',
        description: '辅导班的老师告诉你，八中的节奏很快。',
        type: 'neutral',
        choices: [
            { text: '疯狂刷题', action: (s) => ({ subjects: modifySub(s, ['math', 'physics'], 5), general: { ...s.general, experience: s.general.experience + 10, health: s.general.health - 10 } }) },
            { text: '慢慢来看', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 'sum_summer_camp',
        title: '夏令营的邀请',
        description: '你收到了一封来自知名高校科学夏令营的邮件。',
        type: 'positive',
        once: true,
        choices: [
            { text: '报名参加 (-10金钱)', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 15, money: s.general.money - 10 } }) },
            { text: '太贵了', action: (s) => ({ general: { ...s.general, money: s.general.money + 5 } }) }
        ]
    },
    {
        id: 'sum_reunion',
        title: '初中聚会',
        description: '曾经的同学们聚在一起，有人欢喜有人愁。你看到了那个熟悉的身影。',
        type: 'neutral',
        once: true,
        choices: [
            { 
                text: '趁机表白！', 
                action: (s) => {
                    const success = Math.random() < 0.4;
                    return { chainedEvent: success ? CHAINED_EVENTS['sum_confess_success'] : CHAINED_EVENTS['sum_confess_fail'] };
                }
            },
            { text: '畅谈理想', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10 } }) },
            { text: '默默干饭', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 } }) }
        ]
    },
    {
        id: 'sum_gaming_night',
        title: '通宵游戏',
        description: '漫漫长夜，几个好友拉你上线开黑。',
        type: 'neutral',
        choices: [
            { 
                text: '战个痛快', 
                action: (s) => {
                    const caught = Math.random() < 0.3;
                    if (caught) return { chainedEvent: CHAINED_EVENTS['sum_gaming_caught'] };
                    return { general: { ...s.general, mindset: s.general.mindset + 15, health: s.general.health - 10 } };
                }
            },
            { text: '养生要紧', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 } }) },
            { text: '只玩一把', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 'sum_family_trip',
        title: '家庭出游',
        description: '父母计划去郊区玩两天，放松一下中考后的神经。',
        type: 'positive',
        choices: [
            { text: '欣然前往', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 5 } }) },
            { text: '在家宅着', action: (s) => ({ subjects: modifySub(s, ['english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) },
            { text: '带书去读', action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 4), general: { ...s.general, mindset: s.general.mindset - 5 } }) }
        ]
    },
    {
        id: 'sum_senior_notes',
        title: '学长笔记',
        description: '你在二手书店淘到了几本上一届八中大神的笔记。',
        type: 'positive',
        choices: [
            { text: '如获至宝', action: (s) => ({ subjects: modifySub(s, ['math', 'physics', 'chemistry'], 5), general: { ...s.general, money: s.general.money - 5 } }) },
            { text: '看不懂', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 2 } }) },
            { text: '转手卖掉', action: (s) => ({ general: { ...s.general, money: s.general.money + 10 } }) }
        ]
    },
    {
        id: 'sum_stationery',
        title: '文具采购',
        description: '为了迎接高中生活，你去买了新的无印良品文具。',
        type: 'neutral',
        choices: [
            { text: '买买买', action: (s) => ({ general: { ...s.general, money: s.general.money - 15, efficiency: s.general.efficiency + 2 } }) },
            { text: '实用为主', action: (s) => ({ general: { ...s.general, money: s.general.money - 5 } }) },
            { text: '旧的还能用', action: (s) => ({ general: { ...s.general, money: s.general.money + 5 } }) }
        ]
    },
    {
        id: 'sum_last_carnival',
        title: '最后狂欢',
        description: '暑假的最后一周，空气中弥漫着即将开学的焦虑与兴奋。',
        type: 'neutral',
        once: true,
        choices: [
            { text: '调整作息', action: (s) => ({ general: { ...s.general, health: s.general.health + 10, efficiency: s.general.efficiency + 5 } }) },
            { text: '狂补作业', action: (s) => ({ subjects: modifySub(s, ['chinese', 'math', 'english'], 5), general: { ...s.general, mindset: s.general.mindset - 15 } }) },
            { text: '继续玩乐', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience - 5 } }) }
        ]
    }
  ],
  [Phase.MILITARY]: [
    {
        id: 'mil_blanket',
        title: '叠军被',
        description: '教官要求把被子叠成“豆腐块”。你看着软趴趴的被子发愁。',
        type: 'neutral',
        choices: [
            { 
                text: '精益求精', 
                action: (s) => {
                    const perfect = Math.random() < 0.5;
                    if (perfect) return { chainedEvent: CHAINED_EVENTS['mil_star_performance'] };
                    return { general: { ...s.general, efficiency: s.general.efficiency + 3, mindset: s.general.mindset - 5 } };
                }
            },
            { text: '差不多得了', action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency - 1, mindset: s.general.mindset + 5 } }) },
            { text: '请教室友', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 2 } }) }
        ]
    },
    {
        id: 'mil_night_talk',
        title: '深夜卧谈',
        description: '熄灯了，但是大家都睡不着，开始聊起了天。',
        type: 'positive',
        choices: [
            { text: '聊理想', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 5 } }) },
            { text: '聊八卦', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5 } }) },
            { text: '赶紧睡觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 } }) }
        ]
    },
    {
        id: 'mil_canteen',
        title: '食堂抢饭',
        description: '训练了一上午，大家都饿疯了。开饭哨声一响，千军万马冲向食堂。',
        type: 'neutral',
        choices: [
            { text: '百米冲刺', action: (s) => ({ general: { ...s.general, health: s.general.health + 2, mindset: s.general.mindset + 5 } }) },
            { text: '慢慢排队', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 } }) },
            { text: '帮同学带饭', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 8, health: s.general.health - 2 } }) }
        ]
    },
    {
        id: 'mil_shooting',
        title: '打靶训练',
        description: '终于摸到了真枪！虽然每人只有五发子弹。',
        type: 'positive',
        once: true,
        choices: [
            { text: '屏息凝神', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 10, luck: s.general.luck + 5 } }) },
            { text: '太紧张了', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 2 } }) }
        ]
    }
  ],
  [Phase.SEMESTER_1]: [
    // --- OI 竞赛支线 ---
    {
        id: 'oi_after_school',
        title: '课后加练',
        description: '下午四点，大部分同学都回家了，你却走向了机房。',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        choices: [
            { text: '刷掉一道黑题', action: (s) => ({ subjects: modifySub(s, ['math'], 10), general: { ...s.general, health: s.general.health - 8, experience: s.general.experience + 20 } }) },
            { text: '整理学习笔记', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 10 } }) }
        ]
    },
    {
        id: 'oi_bug_hell',
        title: '调不出的Bug',
        description: '你的代码在本地跑得飞起，提交上去全是红色。你已经盯着屏幕两个小时了。',
        condition: (s) => s.competition === 'OI',
        type: 'negative',
        choices: [
            { text: '再改一遍', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15, experience: s.general.experience + 5, health: s.general.health - 5 } }) },
            { text: '求助学长', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, experience: s.general.experience + 8 } }) }
        ]
    },
    {
        id: 'oi_mock_win',
        title: '模拟赛AK',
        description: '今天的校内模拟赛，你居然全场第一个AK（全部通过）。',
        condition: (s) => s.competition === 'OI',
        type: 'positive',
        choices: [{ text: '信心爆棚', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 30, luck: s.general.luck + 10 } }) }]
    },
    {
        id: 'oi_temple_visit',
        title: '赛前迷信',
        description: 'CSP考试前，你打算换一个绿色的壁纸，甚至想去孔庙拜拜。',
        condition: (s) => s.competition === 'OI',
        once: true,
        type: 'neutral',
        choices: [{ text: '求个好运', action: (s) => ({ general: { ...s.general, luck: s.general.luck + 15, money: s.general.money - 5 } }) }]
    },
    // --- 学习与生活 ---
    {
        id: 's1_library',
        title: '图书馆的宁静',
        description: '八中图书馆是寻找灵感的好地方。',
        type: 'positive',
        choices: [{ text: '高效自修', action: (s) => ({ subjects: modifySub(s, ['chinese', 'english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) }]
    },
    {
        id: 's1_teacher_talk',
        title: '班主任的谈话',
        description: '班主任把你叫到办公室，询问最近的学习状态。',
        type: 'neutral',
        choices: [
            { text: '虚心请教', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency + 2 } }) },
            { text: '沉默不语', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 } }) }
        ]
    },
    {
        id: 's1_first_snow',
        title: '初雪',
        description: '窗外飘起了北京的第一场雪，金融街变得银装素裹。',
        type: 'positive',
        once: true,
        choices: [{ text: '欣赏雪景', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 5 } }) }]
    }
  ]
};
