/**
 * Mobile app redirect utilities
 * Handles deep linking to iOS/Android apps or web fallback
 */

// TODO: Update these with actual app store URLs when available
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/moots/idXXXXXXXX';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.moots.app';

// TODO: Update these with actual deep link schemes when available
const IOS_DEEP_LINK_SCHEME = 'moots://';
const ANDROID_DEEP_LINK_SCHEME = 'moots://';

/**
 * Get redirect URL for mobile app or web
 * @param eventId - Event ID to pass to the app
 * @param joinRequestId - Join request ID (optional)
 * @param userAgent - User agent string from request headers
 * @returns URL to redirect to (app store, deep link, or web)
 */
export function getMobileRedirectUrl(
  eventId: number,
  joinRequestId: number | null,
  userAgent: string
): string {
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  // Build query params
  const params = new URLSearchParams({
    event_id: eventId.toString(),
  });

  if (joinRequestId) {
    params.append('join_request_id', joinRequestId.toString());
  }

  // iOS: Try deep link first, fall back to App Store
  if (isIOS) {
    // TODO: Once deep linking is set up, return deep link URL
    // return `${IOS_DEEP_LINK_SCHEME}event/${eventId}?${params}`;
    return `${IOS_APP_STORE_URL}?${params}`;
  }

  // Android: Try deep link first, fall back to Play Store
  if (isAndroid) {
    // TODO: Once deep linking is set up, return deep link URL
    // return `${ANDROID_DEEP_LINK_SCHEME}event/${eventId}?${params}`;
    return `${ANDROID_PLAY_STORE_URL}&${params}`;
  }

  // Desktop/other: Redirect to web event page
  return `/events/${eventId}`;
}

/**
 * Check if request is from a mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(userAgent);
}

/**
 * Get platform name from user agent
 */
export function getPlatform(userAgent: string): 'ios' | 'android' | 'web' {
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return 'ios';
  }
  if (/Android/.test(userAgent)) {
    return 'android';
  }
  return 'web';
}

/**
 * Build deep link URL for event
 * @param eventId - Event ID
 * @param platform - Platform to build link for
 * @returns Deep link URL or null if platform doesn't support deep linking
 */
export function buildDeepLink(
  eventId: number,
  platform: 'ios' | 'android' | 'web'
): string | null {
  switch (platform) {
    case 'ios':
      // TODO: Update with actual deep link scheme
      return `${IOS_DEEP_LINK_SCHEME}event/${eventId}`;
    case 'android':
      // TODO: Update with actual deep link scheme
      return `${ANDROID_DEEP_LINK_SCHEME}event/${eventId}`;
    case 'web':
      return `/events/${eventId}`;
    default:
      return null;
  }
}
