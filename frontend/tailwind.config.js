module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      ringColor: {
        'brand': '#4f46e5', // indigo-600 as brand color
      },
      ringOffsetWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [
    // Custom plugin for focus-visible styles
    function({ addBase }) {
      addBase({
        // Ensure focus-visible is used by default, not focus
        '*:focus:not(:focus-visible)': {
          outline: 'none',
        },
      });
    },
  ],
}
