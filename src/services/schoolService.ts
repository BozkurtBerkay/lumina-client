import api from './api';

export interface School {
  id: string;
  name: string;
  city: string | null;
}

const schoolService = {
  getAllSchools: async (): Promise<School[]> => {
    const response = await api.get('/schools');
    return response.data;
  },
};

export default schoolService;
