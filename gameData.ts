
import { Phase, GameEvent, SubjectKey, GameState, Achievement, GameStatus, SUBJECT_NAMES, Difficulty, GeneralStats, Club, WeekendActivity, OIStats, OIProblem, Talent, Item } from './types';

const modifySub = (s: GameState, keys: SubjectKey[], val: number) => {
  const newSubs = { ...s.subjects };
  keys.forEach(k => {
    newSubs[k] = { ...newSubs[k], level: Math.max(0, newSubs[k].level + val) };
  });
  return newSubs;
};

// Helper for OI stats
const modifyOI = (s: GameState, changes: Partial<OIStats>) => {
    const newOI = { ...s.oiStats };
    (Object.keys(changes) as (keyof OIStats)[]).forEach(k => {
        newOI[k] = Math.max(0, newOI[k] + (changes[k] || 0));
    });
    return newOI;
};

// --- Configs ---

export const CHANGELOG_DATA = [
    { version: 'v1.0.0/稳定', date: '2026-1-3', content: ['三月七好可爱', '珂朵莉好可爱', '风堇好可爱', '广告位招租'] }
];

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, { label: string, desc: string, stats: GeneralStats, color: string }> = {
    'NORMAL': {
        label: '普通',
        desc: '体验相对轻松的高中生活。(属性大幅提升，更易获得高分)',
        color: 'bg-emerald-500',
        stats: {
            mindset: 40, // Buffed
            experience: 15,
            luck: 45,
            romance: 40,
            health: 80,
            money: 80,
            efficiency: 14 // Buffed significantly
        }
    },
    'HARD': {
        label: '困难',
        desc: '资源紧张，压力较大。',
        color: 'bg-orange-500',
        stats: {
            mindset: 35,
            experience: 10,
            luck: 40,
            romance: 10,
            health: 70,
            money: 50,
            efficiency: 10
        }
    },
    'REALITY': {
        label: '现实',
        desc: '这就是真实的人生。只有在此模式下可解锁成就。',
        color: 'bg-rose-600',
        stats: {
            mindset: 30,
            experience: 0,
            luck: 30,
            romance: 5,
            health: 60,
            money: 20,
            efficiency: 8
        }
    }
};

// --- Talents ---

export const TALENTS: Talent[] = [
    // --- Legendary (Cost 4) ---
    { id: 'genius', name: '天生我才', description: '全学科天赋+10，效率+5。', rarity: 'legendary', cost: 4,
      effect: (s) => {
          const newSubs = { ...s.subjects };
          (Object.keys(newSubs) as SubjectKey[]).forEach(k => newSubs[k].aptitude += 10);
          return { subjects: newSubs, general: { ...s.general, efficiency: s.general.efficiency + 5 } };
      }
    },
    { id: 'rich_kid', name: '家里有矿', description: '初始金钱+100。', rarity: 'legendary', cost: 4,
      effect: (s) => ({ general: { ...s.general, money: s.general.money + 100 } })
    },
    // --- Rare (Cost 2-3) ---
    { id: 'attractive', name: '万人迷', description: '初始魅力+20，恋爱事件概率UP。', rarity: 'rare', cost: 2,
      effect: (s) => ({ general: { ...s.general, romance: s.general.romance + 20 } })
    },
    { id: 'oi_nerd', name: '机房幽灵', description: 'OI各项能力初始+10，但魅力-10。', rarity: 'rare', cost: 3,
      effect: (s) => ({ 
          oiStats: modifyOI(s, { dp: 10, ds: 10, math: 10, string: 10, graph: 10, misc: 10 }),
          general: { ...s.general, romance: Math.max(0, s.general.romance - 10) }
      })
    },
    { id: 'lucky_dog', name: '锦鲤附体', description: '初始运气+30。', rarity: 'rare', cost: 2,
        effect: (s) => ({ general: { ...s.general, luck: s.general.luck + 30 } })
    },
    // --- Common (Cost 1) ---
    { id: 'healthy', name: '体育特长', description: '初始健康+20。', rarity: 'common', cost: 1,
      effect: (s) => ({ general: { ...s.general, health: s.general.health + 20 } })
    },
    { id: 'optimist', name: '乐天派', description: '初始心态+20。', rarity: 'common', cost: 1,
        effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 20 } })
    },
    { id: 'poor_student', name: '寒门学子', description: '初始金钱-50，但意志坚定（心态+10，效率+2）。', rarity: 'common', cost: 1,
        effect: (s) => ({ general: { ...s.general, money: Math.max(0, s.general.money - 50), mindset: s.general.mindset + 10, efficiency: s.general.efficiency + 2 } })
    },

    // --- Cursed (Negative Cost = Gives Points) ---
    { id: 'poverty', name: '家徒四壁', description: '初始金钱归零，且背负100元债务。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, money: -100 } })
    },
    { id: 'frail', name: '体弱多病', description: '初始健康降低，稍不注意就会生病。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, health: 20 } })
    },
    { id: 'loner', name: '孤僻', description: '初始魅力归零，很难建立人际关系。', rarity: 'cursed', cost: -1,
      effect: (s) => ({ general: { ...s.general, romance: 0 } })
    },
    { id: 'dumb', name: '笨鸟先飞', description: '效率-7，学习非常吃力。', rarity: 'cursed', cost: -3,
      effect: (s) => ({ general: { ...s.general, efficiency: Math.max(1, s.general.efficiency - 7) } })
    },
    { id: 'bad_luck', name: '非酋', description: '运气-20，喝凉水都塞牙。', rarity: 'cursed', cost: -1,
      effect: (s) => ({ general: { ...s.general, luck: Math.max(0, s.general.luck - 20) } })
    }
];

// --- Shop Items ---

export const SHOP_ITEMS: Item[] = [
    { id: 'red_bull', name: '红牛', description: '精力充沛！效率+2，健康-1。', price: 15, icon: 'fa-bolt', 
      effect: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 2, health: s.general.health - 1, money: s.general.money - 15 } }) },
    { id: 'coffee', name: '瑞幸冰美式', description: '提神醒脑。心态+3，效率+1。', price: 20, icon: 'fa-coffee',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, efficiency: s.general.efficiency + 1, money: s.general.money - 20 } }) },
    { id: 'five_three', name: '五年高考三年模拟', description: '刷题神器。全科水平+2，心态-3。', price: 45, icon: 'fa-book',
      effect: (s) => ({ 
          subjects: modifySub(s, ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'], 2), 
          general: { ...s.general, mindset: s.general.mindset - 3, money: s.general.money - 45 } 
      }) },
    { id: 'game_skin', name: '游戏皮肤', description: '虽然不能变强，但心情变好了。心态+8。', price: 68, icon: 'fa-gamepad',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, money: s.general.money - 68 } }) },
    { id: 'flowers', name: '鲜花', description: '送给心仪的人。魅力+5，若有对象则大幅提升关系。', price: 50, icon: 'fa-fan',
      effect: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, money: s.general.money - 50, mindset: s.general.mindset + (s.romancePartner ? 5 : 0) } }) },
    { id: 'algo_book', name: '算法导论', description: '厚得可以当枕头。OI能力全面+2。', price: 80, icon: 'fa-code',
      effect: (s) => ({ oiStats: modifyOI(s, { dp: 2, ds: 2, math: 2, graph: 2, string: 2, misc: 2 }), general: { ...s.general, money: s.general.money - 80 } }) },
    { id: 'gym_card', name: '健身卡', description: '强身健体。健康+15。', price: 100, icon: 'fa-dumbbell',
      effect: (s) => ({ general: { ...s.general, health: s.general.health + 15, money: s.general.money - 100 } }) }
];

// --- Definitions ---

export const ACHIEVEMENTS: Record<string, Achievement> = {
    'first_blood': { id: 'first_blood', title: '初入八中', description: '成功开始你的高中生活。', icon: 'fa-school', rarity: 'common' },
    'nerd': { id: 'nerd', title: '卷王', description: '单科成绩达到满分。', icon: 'fa-book-reader', rarity: 'rare' },
    'romance_master': { id: 'romance_master', title: '海王', description: '魅力值达到95以上。', icon: 'fa-heart', rarity: 'legendary' },
    'oi_god': { id: 'oi_god', title: '???', description: '获得五大竞赛省一。', icon: 'fa-code', rarity: 'legendary' },
    'survival': { id: 'survival', title: '极限生存', description: '在健康低于10的情况下完成一个学期。', icon: 'fa-notes-medical', rarity: 'rare' },
    'rich': { id: 'rich', title: '小金库', description: '持有金钱超过200。', icon: 'fa-coins', rarity: 'common' },
    'in_debt': { id: 'in_debt', title: '负债累累', description: '负债超过250。', icon: 'fa-file-invoice-dollar', rarity: 'common' },
    'top_rank': { id: 'top_rank', title: '一览众山小', description: '在大型考试中获得年级第一。', icon: 'fa-crown', rarity: 'legendary' },
    'bottom_rank': { id: 'bottom_rank', title: '旷世奇才', description: '在大型考试中获得年级倒数第一。', icon: 'fa-poop', rarity: 'rare' },
    'sleep_god': { id: 'sleep_god', title: '睡神', description: '累计选择20次以上睡觉事件且获得年级前50。', icon: 'fa-bed', rarity: 'legendary' },
};

export const STATUSES: Record<string, Omit<GameStatus, 'duration'>> = {
    'focused': { id: 'focused', name: '心流', description: '你进入了极度专注的状态。', type: 'BUFF', icon: 'fa-bolt', effectDescription: '全学科效率大幅提升' },
    'anxious': { id: 'anxious', name: '焦虑', description: '对未来的担忧让你无法平静。', type: 'DEBUFF', icon: 'fa-cloud-rain', effectDescription: '每回合心态 -2' },
    'crush': { id: 'crush', name: '暗恋', description: '那个人的身影总是在脑海挥之不去。', type: 'NEUTRAL', icon: 'fa-heart', effectDescription: '效率 -2，魅力 +2' },
    'in_love': { id: 'in_love', name: '恋爱', description: '甜，太甜了。', type: 'BUFF', icon: 'fa-heartbeat', effectDescription: '每周心态 +5' },
    'exhausted': { id: 'exhausted', name: '透支', description: '你需要休息。', type: 'DEBUFF', icon: 'fa-bed', effectDescription: '健康无法自然恢复' },
    'debt': { id: 'debt', name: '负债', description: '身无分文甚至欠了外债，这让你非常焦虑。', type: 'DEBUFF', icon: 'fa-file-invoice-dollar', effectDescription: '每周心态 -5，魅力 -3' },
    'crush_pending': { id: 'crush_pending', name: '恋人未满', description: '虽然还没捅破窗户纸，但这种暧昧的感觉真好。', type: 'BUFF', icon: 'fa-comments', effectDescription: '每周运气 +2，经验 +2' }
};

// --- Club Data ---

export const CLUBS: Club[] = [
    {
        id: 'rap', name: '说唱社', icon: 'fa-microphone', description: 'Real Talk, Real Life.', effectDescription: '魅力++, 英语+, 经验+',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 2 }, subjects: modifySub(s, ['english'], 1) })
    },
    {
        id: 'dance', name: '街舞社', icon: 'fa-child', description: '挥洒汗水，舞动青春。', effectDescription: '健康++, 魅力++, 心态+',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 3, romance: s.general.romance + 3, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'social_science', name: '社会科学研学社', icon: 'fa-globe', description: '研究社会问题，关注人类命运。', effectDescription: '政治++, 历史++, 经验+',
        action: (s) => ({ subjects: modifySub(s, ['politics', 'history'], 2), general: { ...s.general, experience: s.general.experience + 2 } })
    },
    {
        id: 'mun', name: '模拟联合国', icon: 'fa-handshake', description: '西装革履，纵横捭阖。', effectDescription: '英语++, 政治+, 魅力+',
        action: (s) => ({ subjects: modifySub(s, ['english', 'politics'], 2), general: { ...s.general, romance: s.general.romance + 2 } })
    },
    {
        id: 'touhou', name: '东方Project社', icon: 'fa-torii-gate', description: '此生无悔入东方，来世愿生幻想乡。', effectDescription: '心态++, 运气+, 认识同好',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, luck: s.general.luck + 1 } })
    },
    {
        id: 'astronomy', name: '南斗天文社', icon: 'fa-star', description: '仰望星空，脚踏实地。', effectDescription: '物理++, 地理+, 心态+',
        action: (s) => ({ subjects: modifySub(s, ['physics', 'geography'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'math_research', name: '大数研究社', icon: 'fa-calculator', description: '探索数学的奥秘。', effectDescription: '数学+++, 逻辑+',
        action: (s) => ({ subjects: modifySub(s, ['math'], 4) })
    },
    {
        id: 'ttrpg', name: '跑团社', icon: 'fa-dice-d20', description: '在龙与地下城的世界里冒险。', effectDescription: '运气++, 心态++, 经验+',
        action: (s) => ({ general: { ...s.general, luck: s.general.luck + 3, mindset: s.general.mindset + 3, experience: s.general.experience + 1 } })
    },
    {
        id: 'literature', name: '文学社', icon: 'fa-feather-alt', description: '以文会友，激扬文字。', effectDescription: '语文++, 历史+, 心态+',
        action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'otaku', name: '御宅社', icon: 'fa-gamepad', description: '二次元的避风港。', effectDescription: '心态+++, 宅属性+',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health - 1 } })
    },
    {
        id: 'anime', name: '动漫社', icon: 'fa-tv', description: '一起补番，一起吐槽。', effectDescription: '心态++, 魅力+',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, romance: s.general.romance + 1 } })
    }
];

// --- Weekend Activities ---

export const WEEKEND_ACTIVITIES: WeekendActivity[] = [
    {
        id: 'w_shop', name: '约朋友逛街', icon: 'fa-shopping-bag', type: 'SOCIAL',
        description: '消费30元，大幅提升心情和魅力。',
        resultText: '你和朋友在西单逛了一下午，虽然钱包瘪了，但心情好多了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 3, money: s.general.money - 30 } })
    },
    {
        id: 'w_library', name: '上图书馆', icon: 'fa-book', type: 'STUDY',
        description: '提升学习效率，巩固语数外基础。',
        resultText: '八中图书馆的氛围很好，你感觉学习效率提升了。',
        action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 2 }, subjects: modifySub(s, ['chinese', 'english', 'math'], 1) })
    },
    {
        id: 'w_read', name: '看课外书', icon: 'fa-book-open', type: 'REST',
        description: '阅读是心灵的避风港。提升心态和经验。',
        resultText: '你沉浸在书中的世界，暂时忘却了烦恼。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 2 } })
    },
    {
        id: 'w_review', name: '复习功课', icon: 'fa-pencil-alt', type: 'STUDY',
        description: '针对选科进行复习，但会消耗心态。',
        resultText: '你复习了一下午功课，感觉掌握得更扎实了，就是有点累。',
        action: (s) => ({ subjects: modifySub(s, s.selectedSubjects.length > 0 ? s.selectedSubjects : ['math', 'physics'], 2), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_sleep', name: '补觉', icon: 'fa-bed', type: 'REST',
        description: '恢复大量健康和少量心态。累计次数可解锁成就。',
        resultText: '这一觉睡得天昏地暗，醒来时已经是黄昏了。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 8, mindset: s.general.mindset + 2 }, sleepCount: (s.sleepCount || 0) + 1 })
    },
    {
        id: 'w_game_late', name: '熬夜打游戏', icon: 'fa-moon', type: 'REST',
        description: '大幅提升心态，但损害健康和效率。',
        resultText: '赢了一晚上，爽！但是第二天早上头痛欲裂。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, health: s.general.health - 5, efficiency: s.general.efficiency - 2 } })
    },
    {
        id: 'w_game', name: '打游戏', icon: 'fa-gamepad', type: 'REST',
        description: '适度游戏益脑。提升心态，微降效率。',
        resultText: '玩了几把游戏，放松了一下紧绷的神经。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 1 } })
    },
    {
        id: 'w_video', name: '刷视频', icon: 'fa-play-circle', type: 'REST',
        description: '杀时间利器。提升少量心态，大幅降低效率。',
        resultText: '刷视频停不下来，回过神来已经过去两个小时了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, efficiency: s.general.efficiency - 3 } }) // High efficiency penalty
    },
    {
        id: 'w_chat', name: '和朋友聊天', icon: 'fa-comments', type: 'SOCIAL',
        description: '提升心态和魅力。',
        resultText: '和朋友聊了很多八卦，心情变好了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, romance: s.general.romance + 2 } })
    },
    {
        id: 'w_zhihu', name: '刷知乎', icon: 'fa-question-circle', type: 'REST',
        description: '谢邀，人在美国，刚下飞机。提升经验。',
        resultText: '你在知乎上学到了很多奇怪的知识。',
        action: (s) => ({ general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 } })
    },
    {
        id: 'w_park', name: '去公园/爬山', icon: 'fa-tree', type: 'REST',
        description: '拥抱大自然。平衡提升健康和心态。',
        resultText: '呼吸着新鲜空气，你感觉身心舒畅。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 5 } })
    },
    // Romance Exclusive (Visible only when has partner)
    {
        id: 'w_date_call', name: '煲电话粥', icon: 'fa-phone-alt', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '听听TA的声音。提升魅力和心态。',
        resultText: (s) => `你和${s.romancePartner}聊了很久，感觉彼此的心更近了。`,
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 4, mindset: s.general.mindset + 5 } })
    },
    {
        id: 'w_date_game', name: '一起打游戏', icon: 'fa-gamepad', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '带TA上分（或者掉分）。提升魅力和经验。',
        resultText: (s) => `虽然配合有些失误，但你和${s.romancePartner}玩得很开心。`,
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 3 } })
    },
    {
        id: 'w_date_flex', name: '发朋友圈', icon: 'fa-camera', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '秀恩爱。大幅提升魅力，可能招来嫉妒。',
        resultText: '你的朋友圈收获了大量的点赞和柠檬。',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 6, luck: s.general.luck - 1 } })
    },
    // OI Exclusive
    {
        id: 'w_luogu', name: '刷洛谷', icon: 'fa-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升OI综合能力和经验。',
        resultText: 'AC了几道绿题，感觉自己变强了。',
        action: (s) => ({ oiStats: modifyOI(s, { dp: 1, ds: 1, misc: 1 }), general: { ...s.general, experience: s.general.experience + 2 } })
    },
    {
        id: 'w_cf', name: '打 Codeforces', icon: 'fa-laptop-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升思维和图论能力，但可能会掉Rating影响心态。',
        resultText: '打了一场 Div.2，思维得到了锻炼。',
        action: (s) => ({ oiStats: modifyOI(s, { math: 2, misc: 2, graph: 1 }), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_atc', name: '打 AtCoder', icon: 'fa-keyboard', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升数学和思维能力。',
        resultText: 'AtCoder 的题目总是那么有趣且富有挑战性。',
        action: (s) => ({ oiStats: modifyOI(s, { math: 3, misc: 1 }), general: { ...s.general, mindset: s.general.mindset - 1 } })
    },
    {
        id: 'w_oi_wiki', name: '看 OI-Wiki', icon: 'fa-book-atlas', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '全面提升OI基础知识。',
        resultText: '你学习了几个新的算法模板。',
        action: (s) => ({ oiStats: modifyOI(s, { string: 1, graph: 1, math: 1, dp: 1, ds: 1 }), general: { ...s.general, experience: s.general.experience + 3 } })
    },
    {
        id: 'w_water_oi', name: '水OI群', icon: 'fa-water', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '恢复心态，了解OI圈八卦。',
        resultText: '群友个个都是人才，说话又好听。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 1 } })
    }
];

// --- OI Problem Pool ---
export const OI_PROBLEMS: OIProblem[] = [
    { name: "book", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "sort", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "sequence", level: 2, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 0, misc: 2 } },
    { name: "tree", level: 2, difficulty: { dp: 0, ds: 2, math: 0, string: 0, graph: 2, misc: 2 } },
    { name: "path", level: 3, difficulty: { dp: 2, ds: 2, math: 0, string: 0, graph: 3, misc: 1 } },
    { name: "game", level: 4, difficulty: { dp: 2, ds: 1, math: 2, string: 0, graph: 1, misc: 3 } },
    { name: "string", level: 5, difficulty: { dp: 0, ds: 0, math: 0, string: 5, graph: 0, misc: 2 } },
    { name: "network", level: 6, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 6, misc: 4 } },
    { name: "structure", level: 7, difficulty: { dp: 0, ds: 5, math: 0, string: 0, graph: 0, misc: 5 } },
    { name: "dp_opt", level: 8, difficulty: { dp: 8, ds: 3, math: 2, string: 0, graph: 0, misc: 4 } },
    { name: "poly", level: 9, difficulty: { dp: 0, ds: 0, math: 9, string: 0, graph: 0, misc: 5 } },
    { name: "adhoc_hard", level: 10, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 10 } }
];

// --- Helper to Generate Dynamic Events ---

export const generateStudyEvent = (state: GameState): GameEvent => {
    // Pick a random subject from selected or main subjects
    const pool: SubjectKey[] = ['chinese', 'math', 'english', ...state.selectedSubjects];
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
    // --- Dynamic Date Event (If Partner Exists) ---
    if (state.romancePartner && Math.random() < 0.25) { 
        const dateLocations = ['西单', '北海公园', '电影院', '国家图书馆', '什刹海'];
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
            description: '北京下雪了，操场上一片白茫茫。',
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
            description: '几个要好的同学提议周末去西单大悦城聚餐。',
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
        // --- NEW MONEY EVENTS ---
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
                    text: '帮TA刷一下',
                    action: (st) => ({
                        general: { ...st.general, money: st.general.money + 10, romance: st.general.romance + 1 },
                        log: [...st.log, { message: "同学非常感激，转了你红包还多给了点。", type: 'success', timestamp: Date.now() }]
                    })
                },
                { text: '假装没看见', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 1 } }) }
            ]
        })
    ];

    // Card loss logic integrated into random selection probability
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
    
    // Lucky money drop (Rare)
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

// --- Fixed Events ---

export const SCIENCE_FESTIVAL_EVENT: GameEvent = {
    id: 'evt_sci_fest',
    title: '科技节',
    description: '一年一度的科技节开始了，全校停课一天。操场上摆满了各个社团和班级的展台。',
    type: 'positive',
    triggerType: 'FIXED',
    choices: [
        { 
            text: '参观展览', 
            action: (s) => ({ 
                general: { ...s.general, experience: s.general.experience + 10, mindset: s.general.mindset + 5 },
                log: [...s.log, { message: "你参观了科技节展览，大开眼界。", type: 'success', timestamp: Date.now() }]
            }) 
        },
        { 
            text: '在教室自习', 
            action: (s) => ({ 
                subjects: modifySub(s, ['math', 'physics'], 3),
                general: { ...s.general, mindset: s.general.mindset - 5 }
            }) 
        }
    ]
};

export const NEW_YEAR_GALA_EVENT: GameEvent = {
    id: 'evt_new_year',
    title: '元旦联欢会',
    description: '新年的钟声即将敲响，班级里正如火如荼地举办元旦联欢会。',
    type: 'positive',
    triggerType: 'FIXED',
    choices: [
        { 
            text: '欣赏节目', 
            nextEventId: 'evt_red_packet', // CHAIN TO RED PACKET
            action: (s) => ({ 
                general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 2 },
                 log: [...s.log, { message: "你度过了一个愉快的下午。", type: 'success', timestamp: Date.now() }]
            }) 
        },
        { 
            text: '趁乱刷题', 
            nextEventId: 'evt_red_packet', // CHAIN TO RED PACKET
            action: (s) => ({ 
                subjects: modifySub(s, ['english', 'chinese'], 3),
                general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 5 }
            }) 
        }
    ]
};

// --- Base Events (Reusable) ---

export const BASE_EVENTS: Record<string, GameEvent> = {
    'debt_collection': {
        id: 'debt_collection',
        title: '债主上门',
        description: '因为你的负债过高，几个高大的学生拦住了你的去路...',
        type: 'negative',
        choices: [
            { 
                text: '还钱 (金钱归零)', 
                action: (s) => ({ 
                    general: { ...s.general, money: 0, mindset: s.general.mindset - 20 },
                    log: [...s.log, { message: "你被迫还清了所有债务（虽然本来就是负的）。", type: 'warning', timestamp: Date.now() }]
                }) 
            },
            { 
                text: '逃跑', 
                action: (s) => ({ 
                    general: { ...s.general, health: s.general.health - 20, mindset: s.general.mindset - 10 },
                    log: [...s.log, { message: "你没跑掉，被揍了一顿。", type: 'error', timestamp: Date.now() }]
                }) 
            }
        ]
    },
    'exam_fail_talk': {
        id: 'exam_fail_talk',
        title: '考后谈话',
        description: '因为考试成绩太差，班主任找你谈话。',
        type: 'negative',
        choices: [
            { 
                text: '虚心接受', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset + 5 } 
                }) 
            },
            { 
                text: '左耳进右耳出', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset - 2 } 
                }) 
            }
        ]
    }
};

export const CHAINED_EVENTS: Record<string, GameEvent> = {
    'sum_confess_success': {
        id: 'sum_confess_success',
        title: '表白成功',
        description: '对方竟然答应了！你们约定在高中互相鼓励，共同进步。',
        type: 'positive',
        choices: [{ text: '太棒了', action: (s) => ({ 
            general: { ...s.general, mindset: s.general.mindset + 20, romance: s.general.romance + 20 }, 
            romancePartner: 'TA',
            activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 10 }] 
        }) }]
    },
    'sum_confess_fail': {
        id: 'sum_confess_fail',
        title: '被发好人卡',
        description: '“你是个好人，但我现在只想好好学习。”',
        type: 'negative',
        choices: [{ text: '心碎满地', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 20 } }) }]
    },
    'mil_star_performance': {
        id: 'mil_star_performance',
        title: '军训标兵',
        description: '教官在全连队面前表扬了你。',
        type: 'positive',
        choices: [{ text: '倍感光荣', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 5 } }) }]
    },
    // New Chained Event: Red Packet
    'evt_red_packet': {
        id: 'evt_red_packet',
        title: '新年红包',
        description: '过年了，亲戚们最关心的果然还是期中考试的成绩...',
        type: 'positive',
        choices: [{
            text: '收下红包',
            action: (s) => {
                let amount = 20;
                let msg = "成绩平平，长辈勉励了几句。";
                // High efficiency or high experience implies good grades or good impression
                if (s.general.efficiency >= 25 || s.general.experience >= 60) {
                    amount = 80;
                    msg = "因为表现优异，在这个寒冬你收获颇丰！";
                } else if (s.general.efficiency >= 15) {
                    amount = 50;
                    msg = "表现尚可，拿到了标准的压岁钱。";
                }
                return {
                    general: { ...s.general, money: s.general.money + amount, mindset: s.general.mindset + 5 },
                    log: [...s.log, { message: `【新年】${msg} 金钱+${amount}`, type: 'success', timestamp: Date.now() }]
                };
            }
        }]
    }
};

// --- Phase Events ---

export const PHASE_EVENTS: Record<Phase, GameEvent[]> = {
    [Phase.INIT]: [],
    [Phase.SUMMER]: [
        {
            id: 'sum_goal_selection',
            title: '暑假的抉择',
            description: '在正式开始高中生活前，你需要决定这五周的主攻方向。',
            type: 'neutral',
            once: true,
            triggerType: 'FIXED',
            fixedWeek: 1,
            choices: [
                { 
                  text: '信息竞赛(OI)', 
                  action: (s) => ({ 
                    competition: 'OI', 
                    log: [...s.log, { message: "你选择了信息竞赛(OI)。注意：这条线会丧失很多普通事件，且周末自由时间减少", type: 'warning', timestamp: Date.now() }],
                    general: { ...s.general, experience: s.general.experience + 10 },
                    oiStats: { ...s.oiStats, misc: 5 }
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
            id: 'sum_city_walk',
            title: '漫步京城',
            description: '去学校周边转转，顺便买件衣服发个朋友圈。',
            type: 'positive',
            choices: [
                { 
                    text: '拍照打卡 (-2金钱)', 
                    action: (s) => ({ 
                        general: { ...s.general, money: s.general.money - 2, experience: s.general.experience + 2, romance: s.general.romance + 1 } 
                    }) 
                },
                 { 
                    text: 'Citywalk', 
                    action: (s) => {
                        const rand = Math.random();
                        if (rand < 0.2) return { general: { ...s.general, romance: s.general.romance + 1, experience: s.general.experience + 2, mindset: s.general.mindset + 1 } };
                        return { general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience + 1 } };
                    }
                }
            ]
        },
        {
            id: 'sum_water_group',
            title: '新生群潜水',
            description: '你加入了2028届八中新生群。群里消息99+，有人在爆照，有人在装弱，似乎还有学长学姐。',
            type: 'neutral',
            choices: [
                { text: '膜拜大佬', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 0.5, experience: s.general.experience + 2, mindset: s.general.mindset - 2 } }) },
                { text: '龙王喷水', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 2, mindset: s.general.mindset + 3, experience: s.general.experience - 1 } }) },
                { text: '潜水观察', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 1 } }) }
            ]
        },
        {
            id: 'sum_preview',
            title: '预习衔接课程',
            description: '你翻开了崭新的高中教材。看着厚厚的《必修一》，你决定...',
            type: 'neutral',
            choices: [
                { text: '报名衔接班 (-5金钱)', action: (s) => ({ subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 2), general: { ...s.general, money: s.general.money - 5, experience: s.general.experience + 4, mindset: s.general.mindset - 1 } }) },
                { text: '在家自学', action: (s) => {
                     if (s.general.efficiency > 11) {
                         return { subjects: modifySub(s, ['math', 'physics'], 2), general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 2 } };
                     } else {
                         return { general: { ...s.general, efficiency: s.general.efficiency - 1, mindset: s.general.mindset - 2, experience: s.general.experience + 1 }, log: [...s.log, { message: "效率太低，看着书睡着了...", type: 'warning', timestamp: Date.now() }], sleepCount: (s.sleepCount || 0) + 1 };
                     }
                }},
                { text: '看B站网课', action: (s) => {
                     if (Math.random() < 0.7) return { subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english', 'biology', 'history', 'geography', 'politics'], 0.5), general: { ...s.general, experience: s.general.experience + 1 } };
                     return { general: { ...s.general, efficiency: s.general.efficiency - 2, mindset: s.general.mindset + 1 }, log: [...s.log, { message: "看着看着点开了游戏视频...", type: 'warning', timestamp: Date.now() }] };
                }}
            ]
        },
        {
            id: 'sum_math_bridge',
            title: '暑期数学衔接班',
            description: '老师正在讲授高一函数的预备知识，这对于高中数学至关重要。',
            type: 'neutral',
            choices: [
                { text: '全神贯注', action: (s) => ({ subjects: modifySub(s, ['math'], 8), general: { ...s.general, mindset: s.general.mindset - 3 } }) },
                { text: '随便听听', action: (s) => ({ subjects: modifySub(s, ['math'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } }) }
            ]
        },
        {
            id: 'sum_english_camp',
            title: '英语集训',
            description: '为了适应高中的词汇量，你参加了为期一周的英语集训。',
            type: 'neutral',
            choices: [
                { text: '狂背单词', action: (s) => ({ subjects: modifySub(s, ['english'], 8), general: { ...s.general, health: s.general.health - 2 } }) },
                { text: '看美剧练习', action: (s) => ({ subjects: modifySub(s, ['english'], 4), general: { ...s.general, mindset: s.general.mindset + 5 } }) }
            ]
        },
        {
            id: 'sum_physics_intro',
            title: '物理前沿讲座',
            description: '你被拉去听一场科普讲座。',
            type: 'positive',
            choices: [
                { text: '这也太酷了', action: (s) => ({ subjects: modifySub(s, ['physics'], 6), general: { ...s.general, experience: s.general.experience + 5 } }) },
                { text: '听睡着了', action: (s) => ({ general: { ...s.general, health: s.general.health + 3 }, sleepCount: (s.sleepCount || 0) + 1 }) }
            ]
        },
        {
            id: 'sum_oi_basics',
            title: '机房的初见',
            description: '你第一次踏进八中的机房，这里的设备，呃，能用。',
            condition: (s) => s.competition === 'OI',
            type: 'positive',
            once: true,
            triggerType: 'CONDITIONAL',
            choices: [{ text: '开始配置环境', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 5 }, subjects: modifySub(s, ['math'], 2) }) }]
        },
        {
            id: 'sum_summer_camp',
            title: '夏令营的邀请',
            description: '你收到了一封夏令营的邮件。',
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
            id: 'sum_family_trip',
            title: '家庭出游',
            description: '父母计划去郊区玩两天，放松一下中考后的神经。',
            type: 'positive',
            choices: [
                { text: '欣然前往', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 5 } }) },
                { text: '在家宅着', action: (s) => ({ subjects: modifySub(s, ['english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) },
                { text: '带书去读', action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 4), general: { ...s.general, mindset: s.general.mindset - 5 } }) }
            ]
        }
    ],
    [Phase.MILITARY]: [
        {
            id: 'mil_start',
            title: '军训开始',
            description: '烈日当空，为期一周的军训开始了。教官看起来很严厉。',
            type: 'neutral',
            once: true,
            triggerType: 'FIXED',
            choices: [{ text: '坚持就是胜利', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset - 5 } }) }]
        },
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
                { text: '赶紧睡觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 }, sleepCount: (s.sleepCount || 0) + 1 }) }
            ]
        },
        {
            id: 'mil_sing',
            title: '拉歌环节',
            description: '晚上休息时，各个班级开始拉歌。',
            type: 'positive',
            choices: [
                { text: '大声吼出来', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 2 } }) },
                { text: '默默鼓掌', action: (s) => ({ general: { ...s.general, health: s.general.health + 1 } }) }
            ]
        }
    ],
    [Phase.SEMESTER_1]: [
        {
            id: 'evt_confession_generic',
            title: '心动的信号',
            description: '在校园的走廊里，你又遇到了那个让你心动的人。今天的阳光正好，氛围也不错。',
            condition: (s) => !s.romancePartner && s.general.romance >= 20,
            triggerType: 'CONDITIONAL',
            type: 'positive',
            choices: [
                { 
                    text: '勇敢表白！', 
                    action: (s) => {
                        const success = Math.random() < (0.3 + (s.general.romance - 20) * 0.02 + (s.general.luck - 50) * 0.01);
                        return { chainedEvent: success ? CHAINED_EVENTS['sum_confess_success'] : CHAINED_EVENTS['sum_confess_fail'] };
                    }
                },
                { text: '再等等...', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 2 } }) }
            ]
        },
        {
            id: 'evt_first_date',
            title: '初次约会',
            description: '你们决定这周末去西单逛逛。这是你们确立关系后的第一次正式约会。',
            condition: (s) => !!s.romancePartner && s.general.romance > 30,
            triggerType: 'CONDITIONAL',
            once: true,
            type: 'positive',
            choices: [
                { 
                    text: '精心准备', 
                    action: (s) => {
                        const success = Math.random() < 0.7;
                        if (success) {
                            return {
                                general: { ...s.general, mindset: s.general.mindset + 25, romance: s.general.romance + 15, money: s.general.money - 40 },
                                activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 8 }],
                                log: [...s.log, { message: "约会非常完美！你们的关系更进一步。", type: 'success', timestamp: Date.now() }]
                            };
                        } else {
                            return {
                                general: { ...s.general, mindset: s.general.mindset - 10, money: s.general.money - 40 },
                                 log: [...s.log, { message: "约会中出了一些小尴尬，不过没关系。", type: 'info', timestamp: Date.now() }]
                            };
                        }
                    }
                }
            ]
        },
        {
            id: 'evt_fight',
            title: '争吵',
            description: (s: GameState) => `你和${s.romancePartner || '父母'}发生了一些不愉快，气氛降到了冰点。`,
            condition: (s) => !!s.romancePartner || Math.random() < 0.5,
            triggerType: 'RANDOM',
            type: 'negative',
            choices: [
                { 
                    text: '主动道歉', 
                    action: (s) => ({ 
                        general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance + 2 },
                        log: [...s.log, { message: "退一步海阔天空。", type: 'info', timestamp: Date.now() }]
                    }) 
                },
                { 
                    text: '冷战', 
                    action: (s) => ({ 
                        general: { ...s.general, mindset: s.general.mindset - 10, romance: s.general.romance - 5 },
                        activeStatuses: [...s.activeStatuses, { ...STATUSES['anxious'], duration: 2 }] 
                    }) 
                }
            ]
        },
        {
            id: 'evt_betrayal',
            title: '背叛',
            description: '你发现TA最近总是躲着你回消息，直到你看到了不该看到的一幕。',
            condition: (s) => !!s.romancePartner && s.general.romance < 35,
            triggerType: 'RANDOM',
            once: true,
            type: 'negative',
            choices: [
                { 
                    text: '分手！', 
                    action: (s) => ({ 
                        romancePartner: null,
                        general: { ...s.general, mindset: s.general.mindset - 40, health: s.general.health - 10 },
                        activeStatuses: s.activeStatuses.filter(st => st.id !== 'in_love'),
                        log: [...s.log, { message: "这段感情画上了句号。", type: 'error', timestamp: Date.now() }]
                    }) 
                }
            ]
        },
        {
            id: 'evt_oi_steal_learn',
            title: '卷王时刻',
            description: '在其他人摸鱼摆烂的时候，你却在偷偷学习。这样的学习方式也许会带来一些效果？',
            condition: (s) => s.competition === 'OI',
            type: 'neutral',
            triggerType: 'RANDOM',
            choices: [
                { text: '偷学动态规划', action: (s) => ({ oiStats: modifyOI(s, { dp: 1 }), general: { ...s.general, experience: s.general.experience + 1 } }) },
                { text: '偷学被嘲讽', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
                { text: '不卷了，休息', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 1 }, sleepCount: (s.sleepCount || 0) + 1 }) }
            ]
        },
        {
            id: 'evt_oi_gaming',
            title: '机房隔膜',
            description: '竞赛生的快乐来源之一，当然是打隔膜(Generals/Majsoul)。你和你的朋友们一起在机房打隔膜。',
            condition: (s) => s.competition === 'OI',
            type: 'neutral',
            triggerType: 'RANDOM',
            choices: [
                { text: '大杀四方', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience - 1 } }) },
                { text: '被虐了', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
                { text: '被教练抓包', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 }, isGrounded: true }) }
            ]
        },
        {
            id: 'evt_oi_anxiety',
            title: '精神内耗',
            description: '长期的高压生活，你总会陷入焦虑。一次次的挫折后，你开始怀疑自己是否真的适合 OI。',
            condition: (s) => s.competition === 'OI' && s.general.mindset < 70,
            type: 'negative',
            triggerType: 'RANDOM',
            choices: [
                { text: '思考人生意义', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
                { text: '选择遗忘', action: (s) => ({ general: { ...s.general, experience: Math.max(0, s.general.experience - 2) }, log: [...s.log, { message: "你选择性遗忘了一些痛苦的算法...", type: 'info', timestamp: Date.now() }] }) }
            ]
        },
        {
            id: 'oi_after_school',
            title: '课后加练',
            description: '你咋又去机房了？？？。',
            condition: (s) => s.competition === 'OI',
            type: 'neutral',
            triggerType: 'CONDITIONAL',
            choices: [
                { 
                    text: '切一道难题', 
                    action: (s) => ({ 
                        oiStats: modifyOI(s, { ds: 1, math: 1 }), 
                        general: { ...s.general, health: s.general.health - 8, experience: s.general.experience + 5 },
                        activeStatuses: Math.random() < 0.3 ? [...s.activeStatuses, { ...STATUSES['focused'], duration: 2 }] : s.activeStatuses
                    }) 
                },
                { text: '整理学习笔记', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 10 }, oiStats: modifyOI(s, { misc: 1 }) }) }
            ]
        },
        {
            id: 'oi_bug_hell',
            title: '调不出的Bug',
            description: '你的代码在本地跑得飞起，提交上去全是红色。你已经盯着屏幕两个小时了。',
            condition: (s) => s.competition === 'OI',
            type: 'negative',
            triggerType: 'RANDOM',
            choices: [
                { text: '再改一遍', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15, experience: s.general.experience + 5, health: s.general.health - 5 }, oiStats: modifyOI(s, { misc: 1 }) }) },
                { text: '求助学长', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, experience: s.general.experience + 8 }, oiStats: modifyOI(s, { misc: 1 }) }) }
            ]
        },
        {
            id: 'oi_mock_win',
            title: '模拟赛AK',
            description: '今天的校内模拟赛，你居然全场第一个AK（全部通过）。',
            condition: (s) => s.competition === 'OI',
            type: 'positive',
            triggerType: 'RANDOM',
            choices: [{ text: '信心爆棚', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 30, luck: s.general.luck + 10 } }) }]
        },
        {
            id: 'oi_temple_visit',
            title: '赛前迷信',
            description: 'CSP考试前，你打算换一个绿色的壁纸，甚至想去孔庙拜拜。',
            condition: (s) => s.competition === 'OI' && s.week < 10,
            once: true,
            type: 'neutral',
            triggerType: 'RANDOM',
            choices: [{ text: '求个好运', action: (s) => ({ general: { ...s.general, luck: s.general.luck + 15, money: s.general.money - 5 } }) }]
        },
        {
            id: 's1_library',
            title: '图书馆的宁静',
            description: '八中图书馆是寻找灵感的好地方。',
            type: 'positive',
            triggerType: 'RANDOM',
            choices: [{ text: '高效自修', action: (s) => ({ subjects: modifySub(s, ['chinese', 'english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) }]
        },
        {
            id: 's1_teacher_talk',
            title: '班主任的谈话',
            description: '班主任把你叫到办公室，询问最近的学习状态。',
            type: 'neutral',
            triggerType: 'RANDOM',
            choices: [
                { text: '虚心请教', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency + 2 } }) },
                { text: '沉默不语', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 } }) }
            ]
        }
    ],
    [Phase.SELECTION]: [],
    [Phase.PLACEMENT_EXAM]: [],
    [Phase.MIDTERM_EXAM]: [],
    [Phase.SUBJECT_RESELECTION]: [],
    [Phase.CSP_EXAM]: [],
    [Phase.NOIP_EXAM]: [],
    [Phase.FINAL_EXAM]: [],
    [Phase.ENDING]: [],
    [Phase.WITHDRAWAL]: []
};
