import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Commerce Signals — Connect Canada',
  description: 'Evidence-backed ecommerce opportunities for SureWerx Connect Canada.',
  openGraph: {
    title: 'Commerce Signals — Connect Canada',
    description: 'Evidence-backed ecommerce opportunities for SureWerx Connect Canada.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Commerce Signals — Connect Canada',
    description: 'Evidence-backed ecommerce opportunities for SureWerx Connect Canada.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
