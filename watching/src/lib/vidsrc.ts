// Video Embed Sources
// Using verified working & ad-free embed providers (updated March 2026)

// Primary - vidlink.pro (fastest, no ads, customizable, huge library)
const VIDLINK = 'https://vidlink.pro';

// VidSrc - official new embed domains (announced on vidsrc.me)
const VIDSRC_EMBED = 'https://vsembed.ru/embed';
const VIDSRC_EMBED_ALT = 'https://vidsrc-embed.ru/embed';

// Backup
const TWO_EMBED = 'https://www.2embed.cc/embed';

export interface VideoSource {
    name: string;
    url: string;
}

/**
 * Get video embed URLs for a movie
 * @param tmdbId - TMDB movie ID
 * @returns Array of video sources
 */
export function getMovieEmbedUrls(tmdbId: number): VideoSource[] {
    return [
        {
            name: 'السيرفر 1 ⭐',
            url: `${VIDLINK}/movie/${tmdbId}`,
        },
        {
            name: 'السيرفر 2',
            url: `${VIDSRC_EMBED}/movie?tmdb=${tmdbId}`,
        },
        {
            name: 'السيرفر 3',
            url: `${VIDSRC_EMBED_ALT}/movie?tmdb=${tmdbId}`,
        },
        {
            name: 'السيرفر 4',
            url: `${TWO_EMBED}/${tmdbId}`,
        },
    ];
}

/**
 * Get video embed URLs for a TV show episode
 * @param tmdbId - TMDB TV show ID
 * @param season - Season number (default: 1)
 * @param episode - Episode number (default: 1)
 * @returns Array of video sources
 */
export function getTVEmbedUrls(tmdbId: number, season = 1, episode = 1): VideoSource[] {
    return [
        {
            name: 'السيرفر 1 ⭐',
            url: `${VIDLINK}/tv/${tmdbId}/${season}/${episode}`,
        },
        {
            name: 'السيرفر 2',
            url: `${VIDSRC_EMBED}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
        },
        {
            name: 'السيرفر 3',
            url: `${VIDSRC_EMBED_ALT}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
        },
        {
            name: 'السيرفر 4',
            url: `${TWO_EMBED}/${tmdbId}/${season}/${episode}`,
        },
    ];
}

/**
 * Get the primary video embed URL for a movie
 */
export function getMoviePrimaryEmbed(tmdbId: number): string {
    return `${VIDLINK}/movie/${tmdbId}`;
}

/**
 * Get the primary video embed URL for a TV episode
 */
export function getTVPrimaryEmbed(tmdbId: number, season = 1, episode = 1): string {
    return `${VIDLINK}/tv/${tmdbId}/${season}/${episode}`;
}
