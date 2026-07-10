'use client';

import { useEffect } from 'react';

/**
 * Aggressive Ad Blocker for Movie Streaming Sites
 * 
 * Techniques used:
 * 1. Popup/Pop-under blocking
 * 2. Invisible overlay removal (anti-clickjacking)
 * 3. Malicious event listener blocking
 * 4. DOM mutation observer for dynamic ads
 * 5. CSS injection for overlay neutralization
 */

// Ad-related selectors to remove/hide
const adSelectors = [
    // Common ad classes
    '.ad', '.ads', '.ad-container', '.ad-wrapper', '.advertisement',
    '.banner-ad', '.sidebar-ad', '.sponsor', '.sponsored',

    // Google Ads
    'div[id^="google_ads"]', 'div[id*="google_ad"]',
    'ins.adsbygoogle', '.adsbygoogle',

    // Ad iframes
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="adsense"]',
    'iframe[src*="adserver"]',
    'iframe[src*="popads"]',
    'iframe[src*="popcash"]',

    // Popup/overlay patterns
    '.popup-ad', '.overlay-ad', '.interstitial',
    'div[class*="popup"]', 'div[class*="modal-ad"]',

    // Ad networks
    'div[id*="taboola"]', 'div[id*="outbrain"]',
    'div[class*="taboola"]', 'div[class*="outbrain"]',

    // JW Player ads
    '.jw-ad-container', '.jw-plugin-googima',

    // Generic banner patterns
    'div[id^="ads"]', 'div[class*="banner"]',

    // Sticky/fixed ads
    '.sticky-ad', '.fixed-ad',
];

// Video player iframes to KEEP (whitelist)
const videoWhitelist = [
    'vidsrc', 'embed', 'player', 'moviesapi', '2embed',
    'autoembed', 'multiembed', 'vidcloud', 'streamtape'
];

function isVideoPlayer(element: Element): boolean {
    const src = element.getAttribute('src') || '';
    return videoWhitelist.some(domain => src.toLowerCase().includes(domain));
}

// ==========================================
// 1. POPUP KILLER - Disable window.open
// ==========================================
function blockPopups() {
    // Save original function if needed later
    const originalOpen = window.open;
    (window as typeof window & { _originalOpen: typeof window.open })._originalOpen = originalOpen;

    // Override window.open to block popups
    window.open = function (url?: string | URL, target?: string, features?: string) {
        console.log('🚫 Blocked popup:', url);
        return null;
    };

    // Also block other popup methods
    try {
        // Block showModalDialog if it exists
        if ('showModalDialog' in window) {
            (window as Window & { showModalDialog: unknown }).showModalDialog = function () {
                console.log('🚫 Blocked modal dialog');
                return null;
            };
        }
    } catch (e) {
        // Silently ignore
    }
}

// ==========================================
// 2. OVERLAY KILLER - CSS Injection
// ==========================================
function injectAntiOverlayCSS() {
    const styleId = 'olk-ad-blocker-styles';

    // Don't inject twice
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* Hide high z-index overlays (common ad pattern) */
        div[style*="z-index: 999"],
        div[style*="z-index: 9999"],
        div[style*="z-index: 99999"],
        div[style*="z-index: 999999"],
        div[style*="z-index: 2147483647"] {
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }
        
        /* Hide overlay/popup classes */
        div[class*="overlay"]:not(.video-overlay):not(.player-overlay),
        div[class*="pop"]:not(.popper):not(.popover),
        div[class*="modal-ad"],
        div[class*="interstitial"] {
            display: none !important;
            pointer-events: none !important;
        }
        
        /* Make suspicious fixed/absolute elements non-clickable */
        body > div[style*="position: fixed"]:not([class*="player"]):not([class*="video"]):not([class*="nav"]),
        body > div[style*="position: absolute"]:not([class*="player"]):not([class*="video"]) {
            pointer-events: none !important;
        }
        
        /* PROTECT video players - ensure they work properly */
        video,
        .video-container,
        .player-container,
        iframe[src*="vidsrc"],
        iframe[src*="embed"],
        iframe[src*="player"],
        iframe[src*="moviesapi"],
        iframe[src*="2embed"],
        iframe[src*="autoembed"] {
            pointer-events: auto !important;
            z-index: 99999 !important;
            position: relative !important;
        }
        
        /* Hide blank target links that are usually ads */
        a[target="_blank"][href*="ad"],
        a[target="_blank"][href*="click"],
        a[target="_blank"][href*="track"] {
            display: none !important;
            pointer-events: none !important;
        }
    `;

    // Inject at the start for priority
    if (document.head) {
        document.head.insertBefore(style, document.head.firstChild);
    } else {
        document.documentElement.appendChild(style);
    }
}

// ==========================================
// 3. DOM CLEANER - Remove ad elements
// ==========================================
function cleanDOM() {
    adSelectors.forEach(selector => {
        try {
            const ads = document.querySelectorAll(selector);
            ads.forEach(ad => {
                // Skip video player iframes
                if (ad.tagName === 'IFRAME' && isVideoPlayer(ad)) {
                    return;
                }

                // Remove or neutralize
                const adElement = ad as HTMLElement;
                adElement.style.display = 'none';
                adElement.style.visibility = 'hidden';
                adElement.style.height = '0';
                adElement.style.width = '0';
                adElement.style.overflow = 'hidden';
                adElement.style.pointerEvents = 'none';
                adElement.style.position = 'absolute';
                adElement.style.left = '-9999px';

                // Clear content for non-iframes
                if (ad.tagName !== 'IFRAME') {
                    adElement.innerHTML = '';
                }
            });
        } catch (e) {
            // Silently ignore invalid selectors
        }
    });
}

// ==========================================
// 4. CLICK HIJACK PREVENTER
// ==========================================
function preventClickHijacking() {
    // Capture click events early
    document.addEventListener('click', function (e) {
        const target = e.target as HTMLElement;

        // Check if clicked element is suspicious
        if (target) {
            const tagName = target.tagName?.toLowerCase();
            const className = target.className?.toString() || '';
            const href = (target as HTMLAnchorElement).href || '';

            // Block clicks on suspicious elements
            if (
                className.includes('overlay') ||
                className.includes('popup') ||
                className.includes('ad-') ||
                href.includes('click.') ||
                href.includes('/ads/') ||
                href.includes('doubleclick')
            ) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 Blocked suspicious click:', tagName, className);
                return false;
            }
        }
    }, true); // Use capture phase
}

// ==========================================
// 5. MUTATION OBSERVER - Watch for new ads
// ==========================================
function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        let shouldClean = false;

        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        const className = element.className?.toString() || '';
                        const id = element.id || '';

                        // Check if it looks like an ad
                        if (
                            className.includes('ad') ||
                            className.includes('popup') ||
                            className.includes('overlay') ||
                            id.includes('ad') ||
                            id.includes('popup')
                        ) {
                            shouldClean = true;
                        }
                    }
                });
            }
        });

        if (shouldClean) {
            setTimeout(cleanDOM, 50);
        }
    });

    // Start observing
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    return observer;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function AdBlocker() {
    useEffect(() => {
        console.log('🛡️ Olk Ad Blocker initialized');

        // 1. Block popups immediately
        blockPopups();

        // 2. Inject anti-overlay CSS
        injectAntiOverlayCSS();

        // 3. Initial DOM cleanup
        cleanDOM();

        // 4. Setup click hijack prevention
        preventClickHijacking();

        // 5. Setup mutation observer
        const observer = setupMutationObserver();

        // 6. Periodic cleanup as backup
        const cleanupInterval = setInterval(cleanDOM, 2000);

        // Cleanup on unmount
        return () => {
            observer?.disconnect();
            clearInterval(cleanupInterval);
        };
    }, []);

    // This component doesn't render anything visible
    return null;
}
