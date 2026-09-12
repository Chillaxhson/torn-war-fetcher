export interface MemberLastAction {
    status: 'Online' | 'Idle' | 'Offline' | string;
    timestamp?: number;
    relative: string;
}

export interface MemberStatus {
    description: string;
    details?: string;
    state: string;
    color?: string;
    until: number;
}

export interface MemberElimination {
    teamId: number | null;
    teamName: string;
    bsEstimate: number | null;
    attacks?: number;
}

export interface Member {
    id: string;
    name: string;
    level: number;
    days_in_faction?: number;
    position?: string;
    status: MemberStatus;
    last_action?: MemberLastAction;
    elimination?: MemberElimination;
    notes?: string;
    hidden?: boolean;
    notify?: boolean;
}

export interface UserProfile {
    id: number;
    name: string;
    level: number;
    factionId: number | null;
    factionName: string | null;
    battleStats: {
        strength: number;
        speed: number;
        defense: number;
        dexterity: number;
        total: number;
    } | null;
    elimination: {
        teamId: number;
        team: string;
        bsEstimate?: number;
        attacks?: number;
        attackRank?: number;
        attackRankOf?: number;
    } | null;
}

export interface EliminationTeam {
    id: number;
    name: string;
    color: string;
    eliminated: boolean;
    lives: number;
    score: number;
    participants?: number;
    ours?: boolean;
}

// Fair fight formula constants & calculation
export const FF_K = 8 / 3;

export function calculateFairFight(targetStats: number | null | undefined, userStats: number | null | undefined): {
    fairFight: number | null;
    ratio: number | null;
    difficulty: string;
    color: string;
    textColor: string;
} {
    if (!targetStats || !userStats || userStats <= 0 || targetStats < 0) {
        return {
            fairFight: null,
            ratio: null,
            difficulty: 'No estimate',
            color: '#6b7280',
            textColor: '#9ca3af'
        };
    }

    const ratio = targetStats / userStats;
    const fairFight = 1 + FF_K * Math.sqrt(ratio);

    let difficulty = 'Easy';
    let color = '#34e817';
    let textColor = '#56d57b';

    if (fairFight <= 2.0) {
        difficulty = 'Easy';
        color = '#1788e8';
        textColor = '#5ab3fd';
    } else if (fairFight <= 3.5) {
        difficulty = 'Moderate';
        color = '#34e817';
        textColor = '#56d57b';
    } else if (fairFight <= 4.5) {
        difficulty = 'Difficult';
        color = '#e8a117';
        textColor = '#f0bb3b';
    } else {
        difficulty = 'Extreme';
        color = '#e81734';
        textColor = '#fa6863';
    }

    return {
        fairFight,
        ratio,
        difficulty,
        color,
        textColor
    };
}
