import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string | undefined;

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  ctoStatus: string;
  createdAt: string;
  check: { domain: string; score: number };
}

export default function Admin() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLeads = async (key: string) => {
    if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
      setError('Invalid secret.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/leads`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json() as { leads: Lead[] };
      setLeads(data.leads);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    const res = await fetch(`${API_BASE}/api/admin/leads?format=csv`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1c2028] rounded-2xl p-8 border border-[#45484f]/20">
          <div className="text-lg font-bold text-[#81ecff] font-headline mb-6">Admin Access</div>
          <form onSubmit={(e) => { e.preventDefault(); fetchLeads(secret); }} className="space-y-4">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter admin secret"
              className="w-full bg-[#22262f] text-[#ecedf6] placeholder-[#a9abb3] rounded-lg px-4 py-3 border-0 outline-none focus:ring-2 focus:ring-[#81ecff]/30"
              style={{ fontSize: '16px' }}
            />
            {error && <p className="text-[#ff6c95] text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !secret}
              className="w-full bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] font-bold rounded-lg py-3 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Access'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-lg font-bold text-[#81ecff] font-headline">Admin - Leads</div>
            <div className="text-[#a9abb3] text-sm mt-1">{leads.length} total</div>
          </div>
          <button
            onClick={downloadCsv}
            className="bg-[#22262f] border border-[#45484f]/30 text-[#ecedf6] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#282c36] transition-colors"
          >
            Download CSV
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="text-[#a9abb3] text-center py-20">No leads yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#45484f]/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1c2028] text-[#a9abb3] text-left">
                  {['Name', 'Email', 'Phone', 'Company', 'Domain', 'Score', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 font-label text-xs tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} className={`border-t border-[#45484f]/10 ${i % 2 === 0 ? 'bg-[#0f1318]' : 'bg-[#0b0e14]'}`}>
                    <td className="px-4 py-3 text-[#ecedf6]">{lead.name}</td>
                    <td className="px-4 py-3 text-[#81ecff]">
                      <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                    </td>
                    <td className="px-4 py-3 text-[#a9abb3]">{lead.phone || '-'}</td>
                    <td className="px-4 py-3 text-[#a9abb3]">{lead.company || '-'}</td>
                    <td className="px-4 py-3 text-[#a9abb3]">{lead.check.domain}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${lead.check.score >= 80 ? 'text-[#81ecff]' : lead.check.score >= 50 ? 'text-[#a68cff]' : 'text-[#ff6c95]'}`}>
                        {lead.check.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#a9abb3]">{lead.ctoStatus}</td>
                    <td className="px-4 py-3 text-[#a9abb3]">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
