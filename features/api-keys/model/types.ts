export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  permissions: unknown;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NewApiKey = ApiKey & {
  key?: string;
};
