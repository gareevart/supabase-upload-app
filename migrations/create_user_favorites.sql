-- Per-user favorite pages (canonical href + display metadata)
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    href TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT user_favorites_user_href_unique UNIQUE (user_id, href),
    CONSTRAINT user_favorites_kind_check CHECK (
        kind IN ('blog', 'broadcast', 'chat', 'gallery', 'profile', 'projects')
    )
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id_created
    ON user_favorites(user_id, created_at DESC);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" ON user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON user_favorites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON user_favorites
    FOR DELETE USING (auth.uid() = user_id);