import { isBotBlocked, parseXRobotsTag } from '../src/services/robots';

const PAGE = 'https://example.com/blog/post';

describe('isBotBlocked (robots.txt, RFC 9309)', () => {
  it('blocks a bot listed in a grouped User-agent block', () => {
    const txt = 'User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n';
    expect(isBotBlocked(txt, PAGE, 'GPTBot')).toBe(true);
    expect(isBotBlocked(txt, PAGE, 'ClaudeBot')).toBe(true);
    expect(isBotBlocked(txt, PAGE, 'PerplexityBot')).toBe(false);
  });

  it('lets a more specific Allow override a broad Disallow', () => {
    const txt = 'User-agent: GPTBot\nDisallow: /\nAllow: /blog/\n';
    expect(isBotBlocked(txt, PAGE, 'GPTBot')).toBe(false);
    expect(isBotBlocked(txt, 'https://example.com/pricing', 'GPTBot')).toBe(true);
  });

  it('applies path-level disallows, not only "Disallow: /"', () => {
    const txt = 'User-agent: *\nDisallow: /blog\n';
    expect(isBotBlocked(txt, PAGE, 'GPTBot')).toBe(true);
    expect(isBotBlocked(txt, 'https://example.com/', 'GPTBot')).toBe(false);
  });

  it('supports * and $ wildcards', () => {
    const txt = 'User-agent: *\nDisallow: /*.pdf$\nDisallow: /*/private/\n';
    expect(isBotBlocked(txt, 'https://example.com/files/report.pdf', 'GPTBot')).toBe(true);
    expect(isBotBlocked(txt, 'https://example.com/files/report.pdf?x=1', 'GPTBot')).toBe(false);
    expect(isBotBlocked(txt, 'https://example.com/a/private/b', 'GPTBot')).toBe(true);
  });

  it('prefers the bot-specific group over the * group', () => {
    const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /\n';
    expect(isBotBlocked(txt, PAGE, 'GPTBot')).toBe(false);
    expect(isBotBlocked(txt, PAGE, 'ClaudeBot')).toBe(true);
  });

  it('treats an empty Disallow as allow-all', () => {
    expect(isBotBlocked('User-agent: *\nDisallow:\n', PAGE, 'GPTBot')).toBe(false);
  });
});

describe('parseXRobotsTag', () => {
  it('reads global directives', () => {
    expect(parseXRobotsTag('noindex, nofollow')).toEqual({ noindex: true, nofollow: true });
    expect(parseXRobotsTag('none')).toEqual({ noindex: true, nofollow: true });
    expect(parseXRobotsTag('index, follow')).toEqual({ noindex: false, nofollow: false });
    expect(parseXRobotsTag(undefined)).toEqual({ noindex: false, nofollow: false });
  });

  it('ignores directives scoped to other crawlers', () => {
    expect(parseXRobotsTag('googlebot: noindex')).toEqual({ noindex: false, nofollow: false });
  });

  it('applies directives scoped to a scored AI crawler', () => {
    expect(parseXRobotsTag('GPTBot: noindex')).toEqual({ noindex: true, nofollow: false });
    expect(parseXRobotsTag('otherbot: noindex, gptbot: nofollow')).toEqual({ noindex: false, nofollow: true });
  });

  it('does not mistake value directives for crawler names', () => {
    expect(parseXRobotsTag('max-snippet: 20, noindex')).toEqual({ noindex: true, nofollow: false });
  });
});
