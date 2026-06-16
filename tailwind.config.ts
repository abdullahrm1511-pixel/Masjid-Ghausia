import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gbc: {
          emerald: "#047857",
          stone: "#f5f5f4",
          slate: "#334155"
        }
      }
    }
  },
  plugins: []
};

export default config;
