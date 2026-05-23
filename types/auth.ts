export interface Branch {
  id: number;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  roles: string[];
  branches: Branch[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
