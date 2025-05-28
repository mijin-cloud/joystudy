/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // src 폴더 내의 모든 js, jsx, ts, tsx 파일을 스캔
    "./public/index.html",       // public/index.html 파일도 스캔
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}