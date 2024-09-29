/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.[html,js]", "index.html"],
  theme: {
    extend: {},
  },
  plugins: [
      require('@tailwindcss/typography'),
      require('daisyui')
  ],
  daisyui: {
    themes: [
      {
        hpoc: {
          "primary": "#0076D3",
          "secondary": "#034485",
          "accent": "#FFD86B",
          "neutral": "#FFFFFF",
          "neutral-content": "#F3F3F3",
          "base-100": "#B0C4E0",
          "info": "#1e40af",
          "success": "#4ade80",
          "warning": "#fdba74",
          "error": "#e11d48",
        }
      },
      "light", "dark", "dracula"],
  }
}

