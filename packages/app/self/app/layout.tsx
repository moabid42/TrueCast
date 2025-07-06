import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	weight: "100 900",
});
const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	weight: "100 900",
});

export const metadata: Metadata = {
	title: "TrueCase - Trusted News Platform",
	description: "A decentralized news platform with identity verification and fact-checking",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<AuthProvider>
					<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
						<Navigation />
						<main className="container mx-auto px-4 py-8">
							{children}
						</main>
					</div>
				</AuthProvider>
			</body>
		</html>
	);
}
