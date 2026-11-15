export interface Profile {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    theme: string | null;
    role: string | null;
}

export interface Subscription {
    id?: string;
    subscribe_status: boolean;
    mail: string;
    user_id?: string | null;
    subscribe_started_date?: string | null;
}
