import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitLead } from '../services/api';
import { validatePhone } from '../services/phoneValidator';

interface Props {
  checkId: string;
}

export default function LeadForm({ checkId }: Props) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.errors.nameRequired');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = t('form.errors.emailInvalid');
    }

    const phoneResult = validatePhone(formData.phone);
    if (!phoneResult.valid) {
      newErrors.phone = 'Invalid phone number — try +1 followed by your number';
    }

    if (!privacyAccepted) {
      newErrors.privacy = 'Please accept the Privacy Policy to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const phoneResult = validatePhone(formData.phone);
      await submitLead({
        check_id: checkId,
        name: formData.name,
        email: formData.email,
        phone: phoneResult.formatted || formData.phone,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setErrors({ form: t('form.errors.rateLimit') });
      } else {
        setErrors({ form: t('form.errors.submitFailed') });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-lg mb-1">Got it! We'll be in touch.</h3>
        <p className="text-sm">Check your inbox — your full report is on its way.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-2xl font-bold mb-1">{t('form.cta')}</h3>
      <p className="text-slate-500 text-sm mb-4">Get a personalised AEO roadmap from our team — free.</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-sm">
            {errors.form}
          </div>
        )}

        <div>
          <label htmlFor="lead-name" className="block text-slate-700 font-semibold mb-1">{t('form.name')}</label>
          <input
            id="lead-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={loading}
            style={{ fontSize: '16px' }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder={t('form.namePlaceholder')}
          />
          {errors.name && <p role="alert" className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="lead-email" className="block text-slate-700 font-semibold mb-1">{t('form.email')}</label>
          <input
            id="lead-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={loading}
            style={{ fontSize: '16px' }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder={t('form.emailPlaceholder')}
          />
          {errors.email && <p role="alert" className="text-sm mt-1 text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="lead-phone" className="block text-slate-700 font-semibold mb-1">{t('form.phone')}</label>
          <input
            id="lead-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={loading}
            style={{ fontSize: '16px' }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder="e.g. +1 555 123 4567"
          />
          {errors.phone && <p role="alert" className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div className="flex items-start gap-3">
          <input
            id="lead-privacy"
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="lead-privacy" className="text-sm text-slate-600">
            I agree to the{' '}
            <a href="/privacy" target="_blank" className="text-blue-600 underline hover:text-blue-800">
              Privacy Policy
            </a>
            . We'll use your details to send your AEO action plan.
          </label>
        </div>
        {errors.privacy && <p role="alert" className="text-red-600 text-sm -mt-2">{errors.privacy}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[48px]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t('form.submitting')}
            </span>
          ) : (
            t('form.submit')
          )}
        </button>
      </form>
    </div>
  );
}
