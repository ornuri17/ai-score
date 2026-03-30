import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export default function NavBar() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language.split('-')[0];
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <nav className="bg-[#0b0e14]/80 backdrop-blur-xl fixed top-0 w-full z-50 shadow-[0_40px_8%_rgba(236,237,246,0.08)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <a href="/" className="text-2xl font-black tracking-tighter text-[#81ecff] font-headline">
          AI-Score
        </a>
        <div className="hidden md:flex items-center space-x-8 font-headline tracking-tight font-bold">
          <a className="text-[#ecedf6]/70 hover:text-[#ecedf6] transition-colors" href="/">
            {t('nav.home')}
          </a>
          <a className="text-[#ecedf6]/70 hover:text-[#ecedf6] transition-colors" href="/how-it-works">
            {t('nav.howItWorks')}
          </a>
          <a className="text-[#ecedf6]/70 hover:text-[#ecedf6] transition-colors" href="/how-it-works#faq">
            {t('nav.faq')}
          </a>
        </div>
        <select
          onChange={handleLanguageChange}
          value={i18n.language.split('-')[0]}
          className="bg-transparent text-[#a9abb3] border border-[#45484f]/30 rounded px-3 py-1.5 text-sm font-label focus:outline-none focus:border-[#81ecff]/50"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="he">עברית</option>
          <option value="ru">Русский</option>
        </select>
      </div>
    </nav>
  );
}
