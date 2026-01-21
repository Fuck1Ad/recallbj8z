
import { Challenge } from '../types';

export const WEEKLY_CHALLENGES: Challenge[] = [
    {
        id: 'c_sleep_king',
        title: '可恶啊，又打扰我睡觉',
        description: '为什么上课睡觉总被发现啊！获得【嗜睡】体质。每周必须进行至少一次“睡觉”类行为（包括周末补觉或事件中选择睡觉），否则游戏结束。但在梦中，你似乎能链接到阿卡西记录...',
        conditions: {
            initialStats: { money: 50, mindset: 20, health: 20, efficiency: 5 }
        }
    }
];
