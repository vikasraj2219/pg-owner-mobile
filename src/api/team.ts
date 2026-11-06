import { apiClient } from './client';
import { ApiResponse, ITeamMember, UpdateTeamMemberPayload } from '../types/api';

/**
 * Fetch all team members within the organization
 */
export const getTeamMembersApi = async (): Promise<ITeamMember[]> => {
  const response = await apiClient.get<ApiResponse<ITeamMember[]>>('/team/members');
  return response.data.data;
};

/**
 * Invite or create a manager/staff team member
 */
export const createTeamMemberApi = async (payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'manager' | 'staff';
  assignedProperties?: string[];
}): Promise<ITeamMember> => {
  const response = await apiClient.post<ApiResponse<ITeamMember>>('/team/members', payload);
  return response.data.data;
};

/**
 * Update role, status, credentials or assigned properties
 */
export const updateTeamMemberApi = async (
  id: string,
  payload: UpdateTeamMemberPayload,
): Promise<ITeamMember> => {
  const response = await apiClient.put<ApiResponse<ITeamMember>>(`/team/members/${id}`, payload);
  return response.data.data;
};

/**
 * Remove a team member
 */
export const removeTeamMemberApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/team/members/${id}`);
};
