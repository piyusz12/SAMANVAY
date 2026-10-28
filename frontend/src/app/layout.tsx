import type { Metadata } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAMANVAY — AICTE Integrated Complaint Monitoring Dashboard',
  description:
    'Strategic cross-bureau coordination and monitoring platform for technical institutions across AICTE bureaus and cells.',
  manifest: '/manifest.json',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='10' fill='%231E3A8A'/><circle cx='24' cy='24' r='18' stroke='%23F59E0B' stroke-width='1.5' fill='none'/><rect x='19.5' y='4.5' width='2.8' height='1.6' fill='%23FF9933'/><rect x='22.6' y='4.5' width='2.8' height='1.6' fill='%23FFFFFF'/><rect x='25.7' y='4.5' width='2.8' height='1.6' fill='%23138808'/><path d='M24 7.5L25.8 11.5H22.2L24 7.5Z' fill='%23F59E0B'/><rect x='23.2' y='11.5' width='1.6' height='24' fill='%23F59E0B'/><path d='M16 37.5H32V35.5H16V37.5Z' fill='%23F59E0B'/><rect x='9.5' y='14.5' width='29' height='2.2' rx='1.1' fill='%23FFFFFF'/><circle cx='24' cy='15.6' r='3.6' fill='%231E3A8A' stroke='%23F59E0B' stroke-width='1.4'/><line x1='12' y1='16.5' x2='8' y2='24.5' stroke='%23FFFFFF' stroke-width='0.9'/><line x1='12' y1='16.5' x2='16' y2='24.5' stroke='%23FFFFFF' stroke-width='0.9'/><path d='M7 24.5C7 27.3 9.2 29.5 12 29.5C14.8 29.5 17 27.3 17 24.5H7Z' fill='%23F59E0B'/><line x1='36' y1='16.5' x2='32' y2='24.5' stroke='%23FFFFFF' stroke-width='0.9'/><line x1='36' y1='16.5' x2='40' y2='24.5' stroke='%23FFFFFF' stroke-width='0.9'/><path d='M31 24.5C31 27.3 33.2 29.5 36 29.5C38.8 29.5 41 27.3 41 24.5H31Z' fill='%23F59E0B'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var urlParams = new URLSearchParams(window.location.search);
                  var queryTheme = urlParams.get('theme');
                  var saved = queryTheme || localStorage.getItem('samanvay-theme');
                  if (saved === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
