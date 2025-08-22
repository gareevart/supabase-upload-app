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
            // Проверяем, существует ли уже подписка с таким email
            const { data: existingSubscription } = await supabase
                .from('subscribe')
                .select('id')
                .eq('mail', email)
                .single();

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

            // Проверяем, существует ли уже пользователь с таким email
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                // Если пользователь существует, просто добавляем запись в таблицу subscribe
                const { error: dbError } = await supabase.from('subscribe').insert([
                    {
                        mail: email,
                        subscribe_started_date: new Date().toISOString(),
                        subscribe_status: true,
                        user_id: existingUser.id,
                    },
                ]);

                if (dbError) throw dbError;
            } else {
                // Если пользователя нет, создаем его через Auth
                const { error: authError } = await supabase.auth.signUp({
                    email: email,
                    password: crypto.randomUUID(), // Генерируем случайный пароль
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            subscribe_status: true,
                        },
                    },
                });

                if (authError) throw authError;

                // Ждем некоторое время, чтобы триггер успел создать запись в users
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Проверяем, создалась ли запись в таблице users
                const { data: newUser, error: userCheckError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (userCheckError) {
                    // Если записи нет, добавляем запись в таблицу subscribe без user_id
                    const { error: dbError } = await supabase.from('subscribe').insert([
                        {
                            mail: email,
                            subscribe_started_date: new Date().toISOString(),
                            subscribe_status: true,
                            // user_id опущен
                        },
                    ]);

                    if (dbError) throw dbError;
                } else {
                    // Если запись есть, добавляем с user_id
                    const { error: dbError } = await supabase.from('subscribe').insert([
                        {
                            mail: email,
                            subscribe_started_date: new Date().toISOString(),
                            subscribe_status: true,
                            user_id: newUser.id,
                        },
                    ]);

                    if (dbError) throw dbError;
                }
            }

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
            if (err?.code === '23505' && err?.message?.includes('subscribe_mail_key')) {
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
            console.error('Error:', err);
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