import { useTranslation } from 'react-i18next';

export default function Header() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <header className="bg-slate-900 text-white py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="/" className="text-2xl font-bold text-white no-underline">
          AIScore
        </a>
        <select
          onChange={handleLanguageChange}
          value={i18n.language.split('-')[0]}
          className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-blue-400"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>
    </header>
  );
}
