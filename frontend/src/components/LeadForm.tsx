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
      newErrors.phone = t('form.errors.phoneInvalid');
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
        <h3 className="font-bold text-lg mb-1">{t('form.successTitle')}</h3>
        <p>{t('form.successMessage')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-2xl font-bold mb-4">{t('form.cta')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-slate-700 font-semibold mb-1">{t('form.name')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder={t('form.namePlaceholder')}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">{t('form.email')}</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder={t('form.emailPlaceholder')}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">{t('form.phone')}</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
            placeholder={t('form.phonePlaceholder')}
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[48px]"
        >
          {loading ? t('form.submitting') : t('form.submit')}
        </button>
      </form>
    </div>
  );
}
