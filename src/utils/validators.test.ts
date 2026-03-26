import { isValidUrl, extractDomain, normalizeUrl } from './validators';

describe('isValidUrl', () => {
  describe('valid URLs', () => {
    it('accepts valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('accepts https URL with path', () => {
      expect(isValidUrl('https://www.example.com/some/path')).toBe(true);
    });

    it('accepts https URL with subdomain', () => {
      expect(isValidUrl('https://blog.example.com')).toBe(true);
    });

    it('accepts URL with port', () => {
      expect(isValidUrl('https://example.com:8443')).toBe(true);
    });
  });

  describe('invalid protocols', () => {
    it('rejects ftp URL', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('rejects file URL', () => {
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects javascript scheme', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data URI', () => {
      expect(isValidUrl('data:text/html,<h1>test</h1>')).toBe(false);
    });

    it('rejects invalid/malformed URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('SSRF protection — localhost and private IPs', () => {
    it('rejects localhost', () => {
      expect(isValidUrl('http://localhost')).toBe(false);
    });

    it('rejects localhost with port', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(false);
    });

    it('rejects 127.0.0.1', () => {
      expect(isValidUrl('http://127.0.0.1')).toBe(false);
    });

    it('rejects 127.x.x.x range', () => {
      expect(isValidUrl('http://127.255.255.255')).toBe(false);
    });

    it('rejects 10.x private IP', () => {
      expect(isValidUrl('http://10.0.0.1')).toBe(false);
    });

    it('rejects 10.255.255.255', () => {
      expect(isValidUrl('http://10.255.255.255')).toBe(false);
    });

    it('rejects 192.168.x.x private IP', () => {
      expect(isValidUrl('http://192.168.1.1')).toBe(false);
    });

    it('rejects 172.16.x.x private IP', () => {
      expect(isValidUrl('http://172.16.0.1')).toBe(false);
    });

    it('rejects 172.31.x.x private IP', () => {
      expect(isValidUrl('http://172.31.255.255')).toBe(false);
    });

    it('accepts 172.15.x.x (not in private range)', () => {
      expect(isValidUrl('http://172.15.0.1')).toBe(true);
    });

    it('accepts 172.32.x.x (not in private range)', () => {
      expect(isValidUrl('http://172.32.0.1')).toBe(true);
    });
  });
});

describe('extractDomain', () => {
  it('strips www. and lowercases', () => {
    expect(extractDomain('https://www.Example.com/page')).toBe('example.com');
  });

  it('handles URL without www', () => {
    expect(extractDomain('https://example.com')).toBe('example.com');
  });

  it('strips path', () => {
    expect(extractDomain('https://example.com/some/deep/path')).toBe('example.com');
  });

  it('strips query string', () => {
    expect(extractDomain('https://example.com?foo=bar')).toBe('example.com');
  });

  it('strips trailing slash', () => {
    expect(extractDomain('https://example.com/')).toBe('example.com');
  });

  it('handles uppercase URL', () => {
    expect(extractDomain('HTTPS://WWW.EXAMPLE.COM/')).toBe('example.com');
  });

  it('handles subdomain', () => {
    expect(extractDomain('https://blog.example.com/post')).toBe('blog.example.com');
  });

  it('handles http protocol', () => {
    expect(extractDomain('http://www.example.com')).toBe('example.com');
  });
});

describe('normalizeUrl', () => {
  it('normalizes HTTP to HTTPS', () => {
    expect(normalizeUrl('HTTP://Example.com/')).toBe('https://example.com');
  });

  it('lowercases hostname', () => {
    expect(normalizeUrl('https://Example.COM')).toBe('https://example.com');
  });

  it('strips trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('forces https for http', () => {
    expect(normalizeUrl('http://example.com')).toBe('https://example.com');
  });

  it('handles already normalized URL', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('strips path from URL', () => {
    expect(normalizeUrl('https://example.com/some/path')).toBe('https://example.com');
  });
});
