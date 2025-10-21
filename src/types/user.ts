export interface User {
  Id: string;
  UserName: string;
  Email: string;
  FirstName: string;
  LastName: string;
  IsActive: boolean;
  CreatedByAdmin: boolean;
  PhoneNumber: string;
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateUserRequest {
  PhoneNumber: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Email: string;
  IsActive: boolean;
}
