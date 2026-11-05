import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-label text-xs tracking-widest uppercase text-on-surface-variant">404</p>
        <h1 className="mt-4 text-3xl md:text-4xl font-headline font-bold text-[#ecedf6]">{t('notFound.title')}</h1>
        <p className="mt-4 max-w-md text-on-surface-variant">{t('notFound.body')}</p>
        <Link to="/" className="mt-8 inline-block bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] px-10 py-3.5 rounded-lg font-headline font-bold text-base">
          {t('notFound.home')}
        </Link>
      </main>
    </>
  );
}
