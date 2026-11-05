import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

interface FaqItem {
  q: string;
  a: string;
}

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <div className="mb-14">
      <h2 className="font-display text-xl font-bold text-[#81ecff] mb-6 uppercase tracking-widest text-xs">{title}</h2>
      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div key={item.q} className="bg-[#1c2028] rounded-2xl p-6">
            <h3 className="font-display font-semibold text-[#ecedf6] mb-3 text-base leading-snug">{item.q}</h3>
            <p className="text-[#a9abb3] text-sm leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTION_KEYS = ['discovery', 'concepts', 'diagnosis', 'technical', 'scores', 'about'] as const;

export default function FAQ() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

  const sections = SECTION_KEYS.map((key) => ({ key, label: t(`faqPage.sections.${key}`) }));
  const itemsFor = (key: string) => (t(`faqPage.${key}`, { returnObjects: true }) as FaqItem[] | undefined) ?? [];
  const allItems = sections.flatMap((section) => itemsFor(section.key));

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GradeByAI', item: 'https://www.gradebyai.com' },
      { '@type': 'ListItem', position: 2, name: t('faqPage.title'), item: 'https://www.gradebyai.com/faq' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: allItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />

      {/* Hero */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[#a68cff] font-label text-xs tracking-widest mb-4 uppercase">{t('faqPage.badge')}</p>
          <h1 className="font-display text-5xl font-bold text-[#ecedf6] mb-4">{t('faqPage.heading')}</h1>
          <p className="text-[#a9abb3] text-lg">{t('faqPage.subtitle')}</p>
        </div>
      </section>

      {/* Questions by section */}
      <section className="bg-[#10131a] py-20">
        <div className="max-w-3xl mx-auto px-6">
          {sections.map((section) => (
            <FaqSection key={section.key} title={section.label} items={itemsFor(section.key)} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-4xl font-bold text-[#ecedf6] mb-8">{t('faqPage.ctaTitle')}</h2>
          <a href="/" className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 inline-block no-underline">
            {t('faqPage.ctaButton')}
          </a>
        </div>
      </section>

      <footer className="bg-[#10131a] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">
            © {new Date().getFullYear()} GradeByAI. {t('faqPage.footerRights')}
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              {t('faqPage.privacy')}
            </a>
            <a href="/terms" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              {t('faqPage.terms')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
