/** @type {import('tailwindcss').Config} */

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}",
    "./components/**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Core Brand Colors - Inspired by your logo and brand imagery
        primary: "#030014", // Deep Night Blue - Main background, matches brand logo background
        secondary: "#1A234B", // Deep Navy Blue - Secondary backgrounds, cards, panels (from logo background shade)

        // Accent Colors - For interactive elements and highlights
        accent: "#AB8BFF", // Soft Violet - Perfect for tech features, buttons, AI route highlights
        accentWarm: "#FF9500", // Warm Amber - Inspired by street lamps, perfect for Emergency SOS, alerts, night mode indicators

        // Text Colors - For optimal readability hierarchy
        light: {
          100: "#FFFFFF", // Pure White - Primary text, icons (matches logo)
          200: "#D6C6FF", // Light Lavender - Secondary text, subtle highlights
          300: "#A8B5DB", // Muted Blue-Grey - Tertiary text, placeholders
          400: "#9CA4AB", // Medium Grey - Less prominent text
        },

        // Dark Variations - For depth and layering
        dark: {
          100: "#221F3D", // Dark Purple-Blue - Card backgrounds, elevated surfaces
          200: "#0F0D23", // Very Dark Blue - Deeper backgrounds, modals
          300: "#151312", // Charcoal - Alternative dark shade for variation
        },

        // Functional Colors - For specific app features
        danger: "#FF3B30", // Bright Red - Emergency SOS Button, critical alerts
        success: "#34C759", // Vibrant Green - Successful deliveries, confirmations
        warning: "#FF9500", // Amber Orange - Warnings, important notices (same as accentWarm)
        info: "#5AC8FA", // Bright Blue - Information, tracking status

        // Status Colors - For rider and delivery states
        active: "#30D158", // Green - Active rider, in-progress delivery
        pending: "#FF9500", // Amber - Pending requests, waiting state
        completed: "#34C759", // Green - Completed deliveries

        // Neutral Shades - For dividers, borders, subtle UI elements
        neutral: {
          100: "#3A3A3C", // Dark Grey - Borders, dividers on dark backgrounds
          200: "#48484A", // Medium Grey - Subtle UI elements
          300: "#636366", // Light Grey - Disabled states
        },
      },
    },
  },
  plugins: [],
};
