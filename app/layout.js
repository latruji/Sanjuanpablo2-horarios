import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'Porter\u00eda y Horarios | Instituto San Juan Pablo II',
  description: 'Avisos de entradas tarde, salidas anticipadas y salidas educativas para porter\u00eda.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}