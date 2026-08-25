import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "Aurora meal planning" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
