export const metadata = {
  title: "Settlement Agent",
  description: "Find settlements you may qualify for and understand what you need to claim them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f7f5", color: "#111" }}>
        {children}
      </body>
    </html>
  );
}
