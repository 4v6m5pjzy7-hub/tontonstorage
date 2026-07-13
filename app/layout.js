import './globals.css';

export const metadata = {
  title: 'TonTon Storage',
  description: 'TonTon Trailer Rentals - Storage Division',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          {/* Drop the logo at public/logo.png; falls back to text if missing. */}
          <img src="/logo.png" alt="" onError={undefined} />
          <div>
            <div className="name">TonTon Trailer Rentals LLC</div>
            <div className="tag">STORAGE DIVISION</div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
