/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        netflixbg: "#141414",
        netflixgray: "#e5e5e5",
        netflixred: "#E50914",
      },
    },
  },
  plugins: [],
};
