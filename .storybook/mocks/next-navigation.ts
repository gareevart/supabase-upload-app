export function useRouter() {
  return {
    push: () => undefined,
    replace: () => undefined,
    prefetch: async () => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
  };
}

export function usePathname() {
  return '/blog';
}

export function useSearchParams() {
  return new URLSearchParams();
}
