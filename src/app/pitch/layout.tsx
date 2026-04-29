export const metadata = {
  robots: { index: false, follow: false },
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; background: #060a12; }
        }
      `}</style>
      {children}
    </>
  );
}
