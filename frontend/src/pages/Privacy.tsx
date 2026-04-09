import Header from '../components/Header';

export default function Privacy() {
  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            <li><strong>Domain + score</strong> — when you check a website, we store the domain and score. This is cached for 7 days so repeat checks are instant.</li>
            <li><strong>IP address (hashed)</strong> — stored as a one-way hash for rate-limiting. We cannot reverse it to identify you.</li>
            <li><strong>Name, email, phone</strong> — only if you submit the lead form. Used to send your AEO action plan and follow up with you.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">How we use your data</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            <li>Delivering your score and analysis</li>
            <li>Sending your AEO action plan by email</li>
            <li>Following up with personalised recommendations</li>
            <li>Preventing abuse via rate-limiting</li>
          </ul>
          <p className="text-sm mt-3">We do not sell your data to third parties.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Retention</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            <li>Domain scores are cached for 7 days, then overwritten on next check.</li>
            <li>Lead data (name, email, phone) is retained for 12 months.</li>
            <li>You may request deletion at any time.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Your rights</h2>
          <p className="text-sm leading-relaxed">
            You may request access to, correction of, or deletion of your personal data at any time.
            Email us at <a href="mailto:privacy@gradebyai.com" className="text-blue-600 underline">privacy@gradebyai.com</a> and we'll respond within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Cookies</h2>
          <p className="text-sm leading-relaxed">
            We store your language preference in <code className="bg-slate-100 px-1 rounded">localStorage</code>. No tracking cookies are used.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
          <p className="text-sm">
            Questions? Email <a href="mailto:privacy@gradebyai.com" className="text-blue-600 underline">privacy@gradebyai.com</a>
          </p>
        </section>
      </div>

      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm">
        <a href="/" className="hover:text-white underline">← Back to GradeByAI</a>
      </footer>
    </>
  );
}
