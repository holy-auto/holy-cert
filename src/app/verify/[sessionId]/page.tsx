import type { Metadata } from 'next';
import VerifyClient from './VerifyClient';

export const metadata: Metadata = {
  title: '署名検証 | Ledra',
  description: '電子署名の有効性を検証します。',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function VerifyPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <VerifyClient sessionId={sessionId} />;
}
