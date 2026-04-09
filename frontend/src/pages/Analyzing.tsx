export default function Analyzing({ url }: { url: string }) {
  return (
    <main className="flex-grow pt-24 pb-12 px-6 relative overflow-hidden min-h-screen"
      style={{
        backgroundImage: `radial-gradient(at 0% 0%, rgba(129, 236, 255, 0.05) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(166, 140, 255, 0.05) 0px, transparent 50%)`,
      }}
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#a68cff]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#81ecff]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[600px]">
        {/* Neural orb */}
        <div className="relative mb-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border border-[#81ecff]/10 rounded-full animate-ping opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-80 h-80 border border-[#a68cff]/5 rounded-full animate-pulse opacity-10" />
          </div>
          <div
            className="relative z-10 w-48 h-48 rounded-full bg-[#22262f] flex items-center justify-center border border-[#45484f]/20 overflow-hidden"
            style={{ boxShadow: '0 0 80px 20px rgba(129, 236, 255, 0.15)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#81ecff]/20 via-transparent to-[#a68cff]/20" />
            <div className="text-center z-20">
              <span
                className="material-symbols-outlined text-5xl text-[#81ecff] animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
              <div className="font-label text-[10px] tracking-[0.2em] uppercase text-[#a9abb3] mt-2">Active Node</div>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#81ecff] to-transparent blur-[2px] opacity-50 animate-bounce" />
          </div>
        </div>

        {/* Status */}
        <div className="w-full max-w-2xl text-center space-y-8">
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Analyzing Digital Friendliness
            </h1>
            <p className="font-body text-[#a9abb3] max-w-lg mx-auto leading-relaxed">
              Decrypting metadata architecture and semantic hierarchies for LLM compatibility.
            </p>
          </div>

          {/* Progress grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="md:col-span-2 bg-[#10131a] p-6 rounded-xl border border-[#45484f]/10 shadow-xl">
              <div className="flex justify-between items-end mb-4">
                <div className="space-y-1">
                  <span className="font-label text-xs text-[#81ecff] font-bold tracking-widest">SYSTEM STATUS</span>
                  <div className="text-lg font-headline font-bold">Comprehensive Scan</div>
                </div>
                <div className="font-label text-2xl font-bold text-[#81ecff]">—</div>
              </div>
              <div className="h-2 w-full bg-[#22262f] rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-[#81ecff] to-[#a68cff] animate-pulse" />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { done: true, text: 'Scanning robots.txt...' },
                  { done: true, text: 'Analyzing JSON-LD structure...' },
                  { done: false, text: 'Evaluating semantic HTML...' },
                ].map(({ done, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm">
                    <span
                      className={`material-symbols-outlined text-lg ${done ? 'text-[#81ecff]' : 'text-[#81ecff]/40 animate-pulse'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {done ? 'check_circle' : 'radio_button_checked'}
                    </span>
                    <span className="font-body text-[#ecedf6]">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-[#161a21] p-5 rounded-xl border border-[#45484f]/10">
                <div className="font-label text-[10px] text-[#a9abb3] tracking-widest uppercase mb-1">Compute Load</div>
                <div className="text-xl font-headline font-bold text-[#a68cff]">Optimal</div>
              </div>
              <div className="bg-[#161a21] p-5 rounded-xl border border-[#45484f]/10 flex-grow relative overflow-hidden">
                <div className="relative z-10">
                  <div className="font-label text-[10px] text-[#a9abb3] tracking-widest uppercase mb-1">Current URL</div>
                  <div className="text-sm font-label truncate text-[#ecedf6]/80">{url}</div>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-5 text-[#ecedf6]">
                  <span className="material-symbols-outlined text-6xl">database</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer console */}
          <div className="bg-black/50 p-4 rounded-lg font-label text-[11px] text-[#a9abb3] flex justify-between items-center border border-[#45484f]/5">
            <div className="flex gap-4">
              <span>NODE_ID: 8842-AX</span>
              <span className="text-[#81ecff]/50">PARSING_BUFFER: OK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#81ecff] animate-pulse" />
              <span>REALTIME STREAM</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
