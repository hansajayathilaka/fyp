/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
			lightBackGround: "#ffffff",
			darkBackGround: "#000000",
			darkGray: "#374151",
			secondary: "#25aef3",
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	},
	screens: {
		sm: '640px',
		md: '768px',
		lg: '1024px',
		xl: '1280px',
		'2xl': '1536px',
	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
