'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const withAuth = <P extends object>(Component: ComponentType<P>) => {
  const WithAuth = (props: P) => {
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          localStorage.setItem('user_id', user.id);
        } else {
          router.push('/auth/login');
        }
      };
      checkAuth();
    }, [router]);

    return <Component {...props} />;
  };

  return WithAuth;
};

export default withAuth;
