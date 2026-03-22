import Link from 'next/link';
import Image from 'next/image';
import { getPopularTVShows, getTopRatedTVShows, getOnTheAirTVShows, getImageUrl, getGenreNameAr } from '@/lib/tmdb';
import { AdPlaceholder as AdBanner } from '@/components/AdBanner';

interface SearchParams {
    page?: string;
    sort?: string;
}

export default async function SeriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const currentPage = parseInt(params.page || '1');
    const sort = params.sort || 'popular';

    // Fetch TV shows based on sort option
    let tvData;
    switch (sort) {
        case 'top_rated':
            tvData = await getTopRatedTVShows(currentPage);
            break;
        case 'on_the_air':
            tvData = await getOnTheAirTVShows(currentPage);
            break;
        default:
            tvData = await getPopularTVShows(currentPage);
    }

    const series = tvData.results;
    const totalPages = Math.min(tvData.total_pages, 500);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-b from-purple-900/30 to-transparent pt-8 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">المسلسلات</h1>
                    <p className="text-gray-400 text-lg">اكتشف أحدث وأفضل المسلسلات العربية والأجنبية</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                {/* Filters */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        {/* Sort Options */}
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/series?sort=popular"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'popular'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                الأكثر شعبية
                            </Link>
                            <Link
                                href="/series?sort=top_rated"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'top_rated'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                الأعلى تقييماً
                            </Link>
                            <Link
                                href="/series?sort=on_the_air"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'on_the_air'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                يُعرض الآن
                            </Link>
                        </div>

                        <div className="text-gray-400 text-sm">
                            صفحة {currentPage} من {totalPages}
                        </div>
                    </div>
                </div>

                {/* Ad Banner */}
                <AdBanner size="medium" className="mb-8" />

                {/* Series Grid */}
                <div className="content-grid">
                    {series.map((show) => (
                        <Link key={show.id} href={`/watch/series/${show.id}`} className="group">
                            <div className="card relative overflow-hidden rounded-xl">
                                <div className="relative aspect-[2/3] overflow-hidden">
                                    <Image
                                        src={getImageUrl(show.poster_path)}
                                        alt={show.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-16 h-16 bg-purple-600/90 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                            <svg className="w-8 h-8 text-white mr-[-3px]" fill="currentColor" viewBox="0 0 24 24">
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
                                    <h3 className="font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                                        {show.name || show.original_name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                        <span>{show.first_air_date?.split('-')[0] || 'غير معروف'}</span>
                                        {show.genre_ids?.[0] && (
                                            <>
                                                <span>•</span>
                                                <span>{getGenreNameAr(show.genre_ids[0])}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-2 mt-12 mb-8">
                    {currentPage > 1 && (
                        <Link
                            href={`/series?sort=${sort}&page=${currentPage - 1}`}
                            className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            السابق
                        </Link>
                    )}

                    <span className="px-6 py-3 bg-purple-600 text-white rounded-lg">
                        {currentPage}
                    </span>

                    {currentPage < totalPages && (
                        <Link
                            href={`/series?sort=${sort}&page=${currentPage + 1}`}
                            className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            التالي
                        </Link>
                    )}
                </div>

                {/* Ad Banner */}
                <AdBanner size="large" className="my-12" />
            </div>
        </div>
    );
}
