// VidSrc Embed URLs
// These services provide video embedding for movies and TV shows using TMDB IDs

const VIDSRC_BASE = 'https://vidsrc.xyz/embed';
const VIDSRC_TO = 'https://vidsrc.to/embed';
const EMBED_SU = 'https://embed.su/embed';

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
            name: 'السيرفر 1',
            url: `${VIDSRC_BASE}/movie/${tmdbId}`,
        },
        {
            name: 'السيرفر 2',
            url: `${VIDSRC_TO}/movie/${tmdbId}`,
        },
        {
            name: 'السيرفر 3',
            url: `${EMBED_SU}/movie/${tmdbId}`,
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
            name: 'السيرفر 1',
            url: `${VIDSRC_BASE}/tv/${tmdbId}/${season}/${episode}`,
        },
        {
            name: 'السيرفر 2',
            url: `${VIDSRC_TO}/tv/${tmdbId}/${season}/${episode}`,
        },
        {
            name: 'السيرفر 3',
            url: `${EMBED_SU}/tv/${tmdbId}/${season}/${episode}`,
        },
    ];
}

/**
 * Get the primary video embed URL for a movie
 */
export function getMoviePrimaryEmbed(tmdbId: number): string {
    return `${VIDSRC_BASE}/movie/${tmdbId}`;
}

/**
 * Get the primary video embed URL for a TV episode
 */
export function getTVPrimaryEmbed(tmdbId: number, season = 1, episode = 1): string {
    return `${VIDSRC_BASE}/tv/${tmdbId}/${season}/${episode}`;
}
