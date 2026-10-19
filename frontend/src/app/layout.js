import "./globals.css";

export const metadata = {
  title: "BEAST Family First",
  description: "Family support intake and case coordination",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
