'use client';

import Image from 'next/image';
import Link from 'next/link';

interface ContentCardProps {
    id: string;
    title: string;
    titleAr?: string;
    poster: string;
    type: 'movie' | 'series';
    year: number;
    rating: number;
    category?: string;
}

export default function ContentCard({
    id,
    title,
    titleAr,
    poster,
    type,
    year,
    rating,
    category,
}: ContentCardProps) {
    return (
        <Link href={`/watch/${id}`} className="group">
            <div className="card relative overflow-hidden rounded-xl">
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden">
                    <Image
                        src={poster || '/placeholder-poster.jpg'}
                        alt={titleAr || title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white mr-[-3px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Rating Badge */}
                    {rating > 0 && (
                        <div className="absolute top-2 right-2 rating-badge">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {rating.toFixed(1)}
                        </div>
                    )}

                    {/* Type Badge */}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${type === 'movie' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}>
                        {type === 'movie' ? 'فيلم' : 'مسلسل'}
                    </div>
                </div>

                {/* Info */}
                <div className="p-3">
                    <h3 className="font-bold text-white truncate group-hover:text-red-400 transition-colors">
                        {titleAr || title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <span>{year}</span>
                        {category && (
                            <>
                                <span>•</span>
                                <span>{category}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
