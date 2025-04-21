/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: [
            'Winky Rough',
            'ui-sans-serif',
            'system-ui',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            '"Noto Sans"',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
            '"Noto Color Emoji"',
          ],
        },
        colors: {
          primary1: '#ec5e03',
          primary2: '#f59f29',
          primary3: '#f6dcb1',
          textcolor: '#000000',
        },
        keyframes: {
          blob: {
            '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
            '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
            '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          },
        },
        animation: {
          blob: 'blob 8s infinite',
          'blob-delay': 'blob 8s infinite 2s',
        },
      },
    },
    plugins: [
      plugin(function({ addBase, theme }) {
        addBase({ html: { fontFamily: theme('fontFamily.sans') } });
      }),
      require("tailwindcss-animate"),
    ],
  }
