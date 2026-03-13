export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black font-sans text-white">
      <main className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-400 text-2xl font-bold text-white">
            C
          </div>
          <span className="text-3xl font-bold tracking-wide">CARTRUST</span>
        </div>

        <p className="max-w-md text-center text-base leading-7 text-zinc-400">
          WEB施工証明書SaaS &mdash;
          車両の施工証明書をデジタルで発行・管理するプラットフォーム
        </p>

        <div className="flex gap-4">
          <a
            href="/login"
            className="flex h-12 w-44 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            管理者ログイン
          </a>
          <a
            href="/insurer/login"
            className="flex h-12 w-44 items-center justify-center rounded-full border border-zinc-600 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-400 hover:text-white"
          >
            保険会社ログイン
          </a>
        </div>

        <a
          href="/CARTRUST_進捗報告_20260312.pdf"
          download
          className="mt-4 flex h-10 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          進捗報告PDFをダウンロード
        </a>

        <p className="mt-8 text-xs text-zinc-600">HOLY-CERT v1.0</p>
      </main>
    </div>
  );
}
