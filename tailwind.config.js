/** @type {import('tailwindcss').Config} */

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}",
    "./components/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class", 
  theme: {
    extend: {
      colors: {
        // Core Brand Colors - Dark Mode (Default)
        primary: {
          DEFAULT: "#030014", // Deep Night Blue - Main background
          light: "#FFFFFF", // White - Light mode background
        },
        secondary: {
          DEFAULT: "#1A234B", // Deep Navy Blue - Dark mode secondary
          light: "#F5F5F7", // Light Grey - Light mode secondary
        },

        // Accent Colors - Same for both modes
        accent: "#AB8BFF", // Soft Violet - Interactive elements
        accentWarm: "#FF9500", // Warm Amber - Alerts, SOS

        // Text Colors - Dark Mode (Default)
        light: {
          100: {
            DEFAULT: "#FFFFFF", // Pure White - Dark mode primary text
            light: "#000000", // Black - Light mode primary text
          },
          200: {
            DEFAULT: "#D6C6FF", // Light Lavender - Dark mode secondary text
            light: "#6E6E73", // Dark Grey - Light mode secondary text
          },
          300: {
            DEFAULT: "#A8B5DB", // Muted Blue-Grey - Dark mode tertiary text
            light: "#8E8E93", // Medium Grey - Light mode tertiary text
          },
          400: {
            DEFAULT: "#9CA4AB", // Medium Grey - Dark mode less prominent text
            light: "#AEAEB2", // Light Grey - Light mode less prominent text
          },
        },

        // Dark Variations - For depth and layering
        dark: {
          100: {
            DEFAULT: "#221F3D", // Dark Purple-Blue - Dark mode cards
            light: "#FFFFFF", // White - Light mode cards
          },
          200: {
            DEFAULT: "#0F0D23", // Very Dark Blue - Dark mode deeper backgrounds
            light: "#F2F2F7", // Very Light Grey - Light mode deeper backgrounds
          },
          300: {
            DEFAULT: "#151312", // Charcoal - Dark mode alternative shade
            light: "#E5E5EA", // Light Grey - Light mode alternative shade
          },
        },

        // Functional Colors - Same for both modes
        danger: "#FF3B30",
        success: "#34C759",
        warning: "#FF9500",
        info: "#5AC8FA",

        // Status Colors - Same for both modes
        active: "#30D158",
        pending: "#FF9500",
        completed: "#34C759",

        // Neutral Shades - Adapts to theme
        neutral: {
          100: {
            DEFAULT: "#3A3A3C", // Dark Grey - Dark mode borders
            light: "#C7C7CC", // Light Grey - Light mode borders
          },
          200: {
            DEFAULT: "#48484A", // Medium Grey - Dark mode subtle UI
            light: "#AEAEB2", // Medium Grey - Light mode subtle UI
          },
          300: {
            DEFAULT: "#636366", // Light Grey - Dark mode disabled
            light: "#8E8E93", // Dark Grey - Light mode disabled
          },
        },
      },
    },
  },
  plugins: [],
};
