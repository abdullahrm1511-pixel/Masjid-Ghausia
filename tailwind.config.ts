import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gbc: {
          blue: "#1483d6",
          gold: "#f0c08d",
          green: "#0f766e",
          ink: "#0b1b33",
          surface: "#f6f8fb",
          border: "#dbe3ee"
        }
      }
    }
  },
  plugins: []
};

export default config;
