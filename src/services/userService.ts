import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: string;
  schoolId?: string;
}

export interface UpdateUserDTO {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  schoolId?: string;
}

const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserDTO): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserDTO): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};

export default userService;
