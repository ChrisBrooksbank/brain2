import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import BackupProvider from '@/components/BackupProvider';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Brain2',
    description: 'Quick capture notes with AI tagging',
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
        <html lang="en" className="bg-neutral-950">
            <body
                className={`${geistSans.variable} bg-neutral-950 text-white antialiased h-dvh flex flex-col`}
            >
                <BackupProvider />
                <main className="flex-1 overflow-y-auto scroll-smooth">{children}</main>
                <BottomNav />
            </body>
        </html>
    );
}
