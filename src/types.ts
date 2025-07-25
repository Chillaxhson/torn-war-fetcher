export interface Member {
    id: string;
    name: string;
    level: number;
    status: {
        description: string;
        state: string;
        until: number;
    };
    notes?: string;
    hidden?: boolean;
} 