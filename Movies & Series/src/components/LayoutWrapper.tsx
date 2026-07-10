'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AdBlocker from './AdBlocker';

// Pages where navbar and footer should be hidden
const authPages = ['/auth/login', '/auth/register', '/pending', '/rejected'];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isValidSession, setIsValidSession] = useState(true);

    // Check if current page is an auth page
    const isAuthPage = authPages.some(page => pathname?.startsWith(page));

    // Check session validity for non-auth pages
    useEffect(() => {
        if (isAuthPage) return;

        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/check-session');
                const data = await res.json();

                if (!data.valid) {
                    // Session is invalid - redirect to login
                    setIsValidSession(false);
                    router.push('/auth/login');
                }
            } catch (error) {
                console.error('Session check failed:', error);
            }
        };

        checkSession();

        // Check session every 30 seconds
        const interval = setInterval(checkSession, 30000);
        return () => clearInterval(interval);
    }, [pathname, isAuthPage, router]);

    if (isAuthPage) {
        // Hide navbar and footer on auth pages
        return (
            <main className="flex-1">
                {children}
            </main>
        );
    }

    // Show navbar and footer on all other pages
    return (
        <>
            <AdBlocker />
            <Navbar />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </>
    );
}

