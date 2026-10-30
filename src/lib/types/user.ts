export interface UserRole {
  id: string;
  name: string;
  description?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: UserRole[];
  createdAt: string;
}

export interface UserDetails extends User {
  permissions: string[];
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  roleIds?: string[];
}

export interface UserPageResponse {
  content: User[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
