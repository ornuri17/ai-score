import Header from '../components/Header';

export default function Terms() {
  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">The tool is provided "as-is"</h2>
          <p className="text-sm leading-relaxed">
            GradeByAI is a free tool. We make no guarantees about the accuracy of scores or the completeness of analysis.
            Scores are a best-effort estimate based on publicly accessible content at the time of analysis.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Fair use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            <li>Checks are rate-limited to 50 per IP per day and 100 per domain per day.</li>
            <li>Lead form submissions are limited to 3 per IP per day.</li>
            <li>Automated scraping, abuse, or attempts to bypass rate-limits are prohibited.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">No warranty</h2>
          <p className="text-sm leading-relaxed">
            Scores are provided for informational purposes only. We are not liable for any decisions made based on GradeByAI results.
            Improving your score does not guarantee any specific outcome in AI-generated search results.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes</h2>
          <p className="text-sm leading-relaxed">
            We may update these terms at any time. Continued use of the tool after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
          <p className="text-sm">
            Questions? Email <a href="mailto:hello@gradebyai.com" className="text-blue-600 underline">hello@gradebyai.com</a>
          </p>
        </section>
      </div>

      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm">
        <a href="/" className="hover:text-white underline">← Back to GradeByAI</a>
      </footer>
    </>
  );
}
