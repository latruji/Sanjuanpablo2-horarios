import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Instituto San Juan Pablo II - Horarios",
  description: "Aviso de cambios de horarios a porteros",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}