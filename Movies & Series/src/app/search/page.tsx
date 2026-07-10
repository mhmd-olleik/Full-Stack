import Link from 'next/link';
import Image from 'next/image';
import { searchMovies, searchTVShows, getImageUrl, getGenreNameAr } from '@/lib/tmdb';
import { AdPlaceholder as AdBanner } from '@/components/AdBanner';

interface SearchParams {
    q?: string;
    page?: string;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q || '';
    const currentPage = parseInt(params.page || '1');

    if (!query) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <svg className="w-24 h-24 text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h1 className="text-3xl font-bold text-white mb-4">ابحث عن أفلام ومسلسلات</h1>
                    <p className="text-gray-400">استخدم شريط البحث في الأعلى للعثور على ما تريد مشاهدته</p>
                </div>
            </div>
        );
    }

    // Fetch results
    const [moviesData, tvData] = await Promise.all([
        searchMovies(query, currentPage),
        searchTVShows(query, currentPage),
    ]);

    const movies = moviesData.results;
    const series = tvData.results;
    const totalResults = moviesData.total_results + tvData.total_results;

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        نتائج البحث: "{query}"
                    </h1>
                    <p className="text-gray-400">تم العثور على {totalResults} نتيجة</p>
                </div>

                {/* Ad Banner */}
                <AdBanner size="medium" className="mb-8" />

                {/* Movies Section */}
                {movies.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1 h-8 bg-blue-600 rounded-full"></span>
                            الأفلام ({moviesData.total_results})
                        </h2>
                        <div className="content-grid">
                            {movies.slice(0, 12).map((movie) => (
                                <Link key={movie.id} href={`/watch/movie/${movie.id}`} className="group">
                                    <div className="card relative overflow-hidden rounded-xl">
                                        <div className="relative aspect-[2/3] overflow-hidden">
                                            <Image
                                                src={getImageUrl(movie.poster_path)}
                                                alt={movie.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                sizes="(max-width: 768px) 50vw, 20vw"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {movie.vote_average > 0 && (
                                                <div className="absolute top-2 right-2 rating-badge">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    {movie.vote_average.toFixed(1)}
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold bg-blue-600">
                                                فيلم
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-white truncate group-hover:text-red-400">
                                                {movie.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                                <span>{movie.release_date?.split('-')[0] || 'غير معروف'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Series Section */}
                {series.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1 h-8 bg-purple-600 rounded-full"></span>
                            المسلسلات ({tvData.total_results})
                        </h2>
                        <div className="content-grid">
                            {series.slice(0, 12).map((show) => (
                                <Link key={show.id} href={`/watch/series/${show.id}`} className="group">
                                    <div className="card relative overflow-hidden rounded-xl">
                                        <div className="relative aspect-[2/3] overflow-hidden">
                                            <Image
                                                src={getImageUrl(show.poster_path)}
                                                alt={show.name}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                sizes="(max-width: 768px) 50vw, 20vw"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-14 h-14 bg-purple-600/90 rounded-full flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {show.vote_average > 0 && (
                                                <div className="absolute top-2 right-2 rating-badge">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    {show.vote_average.toFixed(1)}
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold bg-purple-600">
                                                مسلسل
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-white truncate group-hover:text-purple-400">
                                                {show.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                                <span>{show.first_air_date?.split('-')[0] || 'غير معروف'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* No Results */}
                {movies.length === 0 && series.length === 0 && (
                    <div className="text-center py-16">
                        <svg className="w-24 h-24 text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-white mb-2">لا توجد نتائج</h2>
                        <p className="text-gray-400">لم نتمكن من العثور على نتائج لـ "{query}"</p>
                        <Link href="/" className="btn-primary mt-6 inline-block">
                            العودة للرئيسية
                        </Link>
                    </div>
                )}

                {/* Ad Banner */}
                <AdBanner size="large" className="mt-12" />
            </div>
        </div>
    );
}
