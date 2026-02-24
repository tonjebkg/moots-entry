import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_MODE = 'dashboard';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM_EMAIL = 'test@moots.com';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;EndpointSuffix=core.windows.net';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'test';

// Mock Neon database
vi.mock('@neondatabase/serverless', () => {
  const mockDb = vi.fn().mockResolvedValue([]);
  // Support tagged template literal calls
  const handler: ProxyHandler<typeof mockDb> = {
    apply: (_target, _thisArg, args) => mockDb(...args),
    get: (target, prop) => {
      if (prop === 'mockResolvedValue') return mockDb.mockResolvedValue.bind(mockDb);
      if (prop === 'mockImplementation') return mockDb.mockImplementation.bind(mockDb);
      if (prop === 'mockReset') return mockDb.mockReset.bind(mockDb);
      if (prop === 'mock') return mockDb.mock;
      return (target as any)[prop];
    },
  };
  const proxyDb = new Proxy(mockDb, handler);
  return {
    neon: vi.fn(() => proxyDb),
    __mockDb: mockDb,
  };
});

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  })),
}));
