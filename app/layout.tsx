import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import BackupProvider from '@/components/BackupProvider';
import FontSizeProvider from '@/components/FontSizeProvider';
import ThemeProvider from '@/components/ThemeProvider';
import OfflineIndicator from '@/components/OfflineIndicator';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Brain2',
    description: 'Quick capture notes with AI tagging',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Brain2',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="bg-base">
            <body
                className={`${geistSans.variable} bg-base text-primary antialiased h-dvh flex flex-col`}
            >
                <BackupProvider />
                <FontSizeProvider />
                <ThemeProvider />
                <OfflineIndicator />
                <main className="flex-1 overflow-y-auto scroll-smooth">{children}</main>
                <BottomNav />
            </body>
        </html>
    );
}
