export interface IClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  username?: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
}