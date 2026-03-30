import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    { number: '01', numberColor: 'text-[#81ecff]', title: t('howItWorks.step1Title'), description: t('howItWorks.step1Desc'), pts: t('howItWorks.step1Pts') },
    { number: '02', numberColor: 'text-[#a68cff]', title: t('howItWorks.step2Title'), description: t('howItWorks.step2Desc'), pts: t('howItWorks.step2Pts') },
    { number: '03', numberColor: 'text-[#ff6c95]', title: t('howItWorks.step3Title'), description: t('howItWorks.step3Desc'), pts: t('howItWorks.step3Pts') },
    { number: '04', numberColor: 'text-[#81ecff]', title: t('howItWorks.step4Title'), description: t('howItWorks.step4Desc'), pts: t('howItWorks.step4Pts') },
  ];

  const tiers = [
    { range: t('howItWorks.tier1Range'), label: t('howItWorks.tier1Label'), description: t('howItWorks.tier1Desc'), accentColor: 'text-[#81ecff]', borderColor: 'border-[#81ecff]/20' },
    { range: t('howItWorks.tier2Range'), label: t('howItWorks.tier2Label'), description: t('howItWorks.tier2Desc'), accentColor: 'text-[#a68cff]', borderColor: 'border-[#a68cff]/20' },
    { range: t('howItWorks.tier3Range'), label: t('howItWorks.tier3Label'), description: t('howItWorks.tier3Desc'), accentColor: 'text-[#ff6c95]', borderColor: 'border-[#ff6c95]/20' },
  ];

  const faqs = [
    { q: t('howItWorks.faq1Q'), a: t('howItWorks.faq1A') },
    { q: t('howItWorks.faq2Q'), a: t('howItWorks.faq2A') },
    { q: t('howItWorks.faq3Q'), a: t('howItWorks.faq3A') },
    { q: t('howItWorks.faq4Q'), a: t('howItWorks.faq4A') },
    { q: t('howItWorks.faq5Q'), a: t('howItWorks.faq5A') },
    { q: t('howItWorks.faq6Q'), a: t('howItWorks.faq6A') },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <Header />

      {/* Hero */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[#a68cff] font-label text-xs tracking-widest mb-4 uppercase">
            {t('howItWorks.badge')}
          </p>
          <h1 className="font-display text-5xl font-bold text-[#ecedf6] mb-4">
            {t('howItWorks.title')}
          </h1>
          <p className="text-[#a9abb3] text-lg">
            {t('howItWorks.subtitle')}
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[#10131a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-[#1c2028] rounded-2xl p-8">
                <span className={`font-display text-4xl font-bold ${step.numberColor}`}>
                  {step.number}
                </span>
                <h3 className="font-display font-bold text-xl text-[#ecedf6] mt-4 mb-3">
                  {step.title}
                </h3>
                <p className="text-[#a9abb3] text-sm mb-4">{step.description}</p>
                <span className="bg-[#591adc]/30 text-[#a68cff] rounded-full px-3 py-1 text-xs font-label">
                  {step.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score Visualization */}
      <section className="bg-[#0b0e14] py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#a68cff] font-label text-xs tracking-widest uppercase mb-4">
              {t('howItWorks.scoreBadge')}
            </p>
            <h2 className="font-display text-4xl font-bold text-[#ecedf6]">
              {t('howItWorks.scoreTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.range}
                className={`bg-[#1c2028] rounded-2xl p-6 border ${tier.borderColor}`}
              >
                <p className={`font-display text-3xl font-bold ${tier.accentColor} mb-2`}>
                  {tier.range}
                </p>
                <h3 className={`font-display font-semibold text-lg ${tier.accentColor} mb-3`}>
                  {tier.label}
                </h3>
                <p className="text-[#a9abb3] text-sm">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#10131a] py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="font-label text-xs tracking-widest text-[#a68cff] uppercase mb-4">
              {t('howItWorks.faqBadge')}
            </p>
            <h2 className="font-display text-4xl text-[#ecedf6] font-bold">{t('howItWorks.faqTitle')}</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-display font-semibold text-[#ecedf6] mb-2">{faq.q}</h3>
                <p className="text-[#a9abb3] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-4xl font-bold text-[#ecedf6] mb-8">
            {t('howItWorks.ctaTitle')}
          </h2>
          <a
            href="/"
            className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 inline-block no-underline"
          >
            {t('howItWorks.ctaButton')}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#10131a] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">
            &copy; {new Date().getFullYear()} AIScore. {t('howItWorks.footerRights')}
          </p>
          <div className="flex gap-6">
            <a
              href="/privacy"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              {t('howItWorks.privacy')}
            </a>
            <a
              href="/terms"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              {t('howItWorks.terms')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
