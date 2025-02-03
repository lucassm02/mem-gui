module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Adicione cores personalizadas se necessário
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
      transitionProperty: {
        colors: 'background-color, border-color, color, fill, stroke',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
