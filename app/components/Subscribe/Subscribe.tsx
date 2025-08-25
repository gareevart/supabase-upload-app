'use client';
import { useState } from 'react';
import { Button, Breadcrumbs, Card, Text, Label, TextInput, Skeleton, useToaster} from '@gravity-ui/uikit';
import { supabase } from '../../../lib/supabase';
import '../../components/components.css';

export const Subscribe = () => {
    const { add } = useToaster();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubscribe = async () => {
        if (!validateEmail(email)) {
            setError('Bro, this is not an email address');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Проверяем, существует ли уже подписка с таким email (проверяем оба поля)
            const { data: existingSubscription, error: checkError } = await supabase
                .from('subscribe')
                .select('id')
                .or(`mail.eq.${email},email.eq.${email}`)
                .single();

            // Если ошибка не связана с отсутствием записи, выбрасываем её
            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingSubscription) {
                // Если подписка уже существует, показываем сообщение
                add({
                    name: 'subscribe-already-exists',
                    title: 'Already Subscribed',
                    content: 'This email is already subscribed to our newsletter',
                    theme: 'info',
                    autoHiding: 5000,
                });
                setEmail('');
                return;
            }

            // Добавляем новую подписку, используя существующую структуру таблицы
            const { error: insertError } = await supabase.from('subscribe').insert([
                {
                    mail: email, // Используем поле mail (основное)
                    email: email, // Также заполняем поле email для совместимости
                    subscribe_started_date: new Date().toISOString(),
                    subscribe_status: true,
                    name: null, // Можно добавить поле для имени в форму позже
                    is_active: true,
                    subscribed_at: new Date().toISOString(),
                },
            ]);

            if (insertError) throw insertError;

            setEmail('');
            add({
                name: 'subscribe-success',
                title: 'Success',
                content: 'Check your inbox to confirm',
                theme: 'success',
                autoHiding: 5000,
            });
        } catch (err: any) {
            // Обработка ошибки дублирования почты
            if (err?.code === '23505' && err?.message?.includes('subscribe_email_unique')) {
                add({
                    name: 'subscribe-already-exists',
                    title: 'Already Subscribed',
                    content: 'This email is already subscribed to our newsletter',
                    theme: 'info',
                    autoHiding: 5000,
                });
                setEmail('');
                return;
            }

            setError('Sorry bro, please try again.');
            console.error('Subscribe Error Details:', {
                error: err,
                code: err?.code,
                message: err?.message,
                details: err?.details,
                hint: err?.hint
            });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="group-container">
        <div className="grid gap-1">
            <Text className="mt-20" variant="header-1">Subscribe</Text>
            <Text variant="body-1">Exclusive, newsletter-only content once a month. No spam, no nonsense</Text>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl">
             <TextInput 
                size="xl"
                view="clear"
                placeholder="mail@gareev.de"
                hasClear
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSubscribe();
                    }
                        }}
                endContent={<Button size="l" view="action" onClick={handleSubscribe} loading={isLoading}>Subscribe</Button>}/>                
        </div>
       
    </div>
  );
}
export default Subscribe;