/**
 * Per-variant Android launcher art.
 *
 * Adaptive icons use a solid `backgroundColor` plate (no background image) so
 * launcher masks expose the variant color around the foreground mark.
 * Foregrounds are distinct brand marks: blueprint+Dev, blueprint, black T3.
 */
export type MobileAppVariant = "development" | "preview" | "production";

export type AndroidVariantAssets = {
  readonly androidIcon: string;
  readonly androidAdaptiveForegroundImage: string;
  readonly androidAdaptiveBackgroundColor: string;
};

export const ANDROID_VARIANT_ASSETS: Record<MobileAppVariant, AndroidVariantAssets> = {
  development: {
    androidIcon: "./assets/icon-development.png",
    androidAdaptiveForegroundImage: "./assets/android-icon-foreground-development.png",
    androidAdaptiveBackgroundColor: "#F59E0B",
  },
  preview: {
    androidIcon: "./assets/icon-preview.png",
    androidAdaptiveForegroundImage: "./assets/android-icon-foreground-preview.png",
    androidAdaptiveBackgroundColor: "#8B5CF6",
  },
  production: {
    androidIcon: "./assets/icon-production.png",
    androidAdaptiveForegroundImage: "./assets/android-icon-foreground-production.png",
    androidAdaptiveBackgroundColor: "#E6F4FE",
  },
};

/** Shared themed-icon silhouette (white on transparent). */
export const ANDROID_ADAPTIVE_MONOCHROME_IMAGE = "./assets/android-icon-monochrome.png";

export const MOBILE_APP_VARIANTS = Object.keys(ANDROID_VARIANT_ASSETS) as MobileAppVariant[];
