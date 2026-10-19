import "./globals.css";

export const metadata = {
  title: "Settlement Agent | Find and review eligible claims",
  description: "Explore verified class action settlements, check potential eligibility, and prepare claims with explicit consent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
