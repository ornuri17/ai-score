import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function NavBar() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lang = i18n.language.split('-')[0];
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/how-it-works', label: t('nav.howItWorks') },
    { href: '/how-it-works#faq', label: t('nav.faq') },
  ];

  return (
    <div ref={navRef} className="fixed top-0 w-full z-50">
      <nav className="bg-[#0b0e14]/80 backdrop-blur-xl shadow-[0_40px_8%_rgba(236,237,246,0.08)]">
        <div className="flex justify-between items-center px-6 md:px-8 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <a href="/" className="text-2xl font-black tracking-tighter text-[#81ecff] font-headline">
            GradeByAI
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center space-x-8 font-headline tracking-tight font-bold">
            {navLinks.map((link) => (
              <a
                key={link.href}
                className="text-[#ecedf6]/70 hover:text-[#ecedf6] transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop language selector + mobile hamburger */}
          <div className="flex items-center gap-3">
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

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden text-[#81ecff] p-1"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span className="material-symbols-outlined">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0b0e14] border-t border-[#45484f]/20 shadow-2xl">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[#ecedf6]/70 hover:text-[#ecedf6] font-headline font-bold py-3 border-b border-[#45484f]/10 last:border-0 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
