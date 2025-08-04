import { Inter, Roboto, Open_Sans, Source_Sans_3 } from 'next/font/google';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';

import "./globals.css";
import AuthHeader from "../components/AuthHeader";
import AuthProvider from "../components/AuthProvider";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const roboto = Roboto({ 
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto'
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans'
});
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans'
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} ${openSans.variable} ${sourceSans.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <AuthHeader />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
