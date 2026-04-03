import type { Metadata } from 'next';
import SignatureClient from './SignatureClient';

export const metadata: Metadata = {
  title: '電子署名 | Ledra',
  description: '施工証明書の内容を確認し、電子署名を行ってください。',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SignaturePage({ params }: PageProps) {
  const { token } = await params;
  return <SignatureClient token={token} />;
}
