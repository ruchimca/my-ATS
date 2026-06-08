import "./globals.css";

export const metadata = {
  title: "my-ATS",
  description: "A personal Applicant Tracking System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
