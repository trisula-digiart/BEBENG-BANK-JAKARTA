import React from "react";
import "@/app/globals.css";

export const metadata = {
  title: "Bank Daily Unit Reporting",
  description: "Internal banking daily reporting application for unit monitoring and consolidation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}