
import { createClient } from '@supabase/supabase-js'

// 修正：这是 API URL，格式通常为 https://<project_id>.supabase.co
const supabaseUrl = 'https://qmgfcirrgwzcmmyjnecn.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZ2ZjaXJyZ3d6Y21teWpuZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzY2NzQsImV4cCI6MjA4MzYxMjY3NH0.CU4roI0pWPHARNydPu_EeUBoz7G2dtxhw9InUFSBZ80';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface LeaderboardEntry {
    id: string;
    player_name: string;
    score: number;
    challenge_id: string | null;
    difficulty: string;
    created_at: string;
    details: {
        title: string;
        rank: string;
    };
}

export const uploadScore = async (entry: Omit<LeaderboardEntry, 'id' | 'created_at'>) => {
    return await supabase.from('leaderboard').insert([entry]);
};

export const getLeaderboard = async (challengeId: string | null = null, limit = 50) => {
    let query = supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

    if (challengeId) {
        query = query.eq('challenge_id', challengeId);
    } else {
        // 如果没有指定 challengeId，我们假设是获取主线排行榜
        // 也可以选择 query.is('challenge_id', null) 只看普通模式
        // 这里为了热闹一点，暂时不强制过滤 null，或者你可以根据需求修改
    }

    return await query;
};
