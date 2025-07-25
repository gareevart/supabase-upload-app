-- Создание таблицы тегов
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3b82f6', -- hex цвет для визуального отображения
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы изображений
CREATE TABLE IF NOT EXISTS public.images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    public_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, file_name)
);

-- Создание связующей таблицы изображений и тегов (many-to-many)
CREATE TABLE IF NOT EXISTS public.image_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(image_id, tag_id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON public.image_tags(image_id);
CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON public.image_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON public.images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Настройка RLS (Row Level Security)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_tags ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы tags (теги доступны всем для чтения, создавать могут только авторизованные)
CREATE POLICY "Tags are viewable by everyone" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON public.tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update tags they created" ON public.tags
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Политики для таблицы images (пользователи видят только свои изображения)
CREATE POLICY "Users can view own images" ON public.images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для таблицы image_tags (доступ через связанные изображения)
CREATE POLICY "Users can view tags for own images" ON public.image_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.images 
            WHERE images.id = image_tags.image_id 
            AND images.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add tags to own images" ON public.image_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.images 
            WHERE images.id = image_tags.image_id 
            AND images.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove tags from own images" ON public.image_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.images 
            WHERE images.id = image_tags.image_id 
            AND images.user_id = auth.uid()
        )
    );

-- Вставка базовых тегов
INSERT INTO public.tags (name, color) VALUES 
    ('природа', '#22c55e'),
    ('портрет', '#f59e0b'),
    ('архитектура', '#6366f1'),
    ('еда', '#ef4444'),
    ('животные', '#8b5cf6'),
    ('путешествия', '#06b6d4'),
    ('спорт', '#f97316'),
    ('искусство', '#ec4899'),
    ('технологии', '#64748b'),
    ('семья', '#84cc16')
ON CONFLICT (name) DO NOTHING;
