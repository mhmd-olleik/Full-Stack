'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const pathname = usePathname();
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setSearchQuery('');
        }
    };

    const isActive = (path: string) => pathname === path;

    // Hide navbar on admin pages
    if (pathname?.startsWith('/admin')) {
        return null;
    }

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="Olk Logo"
                            width={40}
                            height={40}
                            className="rounded-lg"
                        />
                        <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                            Olk
                        </span>
                    </Link>

                    {/* Navigation - visible on all screens */}
                    <div className="flex items-center gap-3 md:gap-6">
                        <Link
                            href="/"
                            className={`transition-colors text-sm md:text-base ${isActive('/') ? 'text-red-500 font-semibold' : 'text-white hover:text-red-400'
                                }`}
                        >
                            الرئيسية
                        </Link>
                        <Link
                            href="/movies"
                            className={`transition-colors text-sm md:text-base ${isActive('/movies') ? 'text-red-500 font-semibold' : 'text-white hover:text-red-400'
                                }`}
                        >
                            الأفلام
                        </Link>
                        <Link
                            href="/series"
                            className={`transition-colors text-sm md:text-base ${isActive('/series') ? 'text-red-500 font-semibold' : 'text-white hover:text-red-400'
                                }`}
                        >
                            المسلسلات
                        </Link>
                    </div>

                    {/* Right Side: Search */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div ref={searchRef} className="relative">
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`p-2.5 rounded-full transition-all duration-300 ${isSearchOpen ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>

                            {/* Search Dropdown */}
                            {isSearchOpen && (
                                <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden animate-fadeIn">
                                    <form onSubmit={handleSearch} className="p-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="ابحث عن فيلم أو مسلسل..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                                className="w-full bg-gray-800/80 border border-gray-600 rounded-xl py-3 px-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                            />
                                            <button
                                                type="submit"
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-gray-500 text-xs mt-2 text-center">اضغط Enter للبحث</p>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
