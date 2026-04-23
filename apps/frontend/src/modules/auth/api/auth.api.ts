import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types';
import { loginMock, registerMock } from '../../../shared/mocks/auth.mock';

export const authApi = {
  login(payload: LoginPayload): Promise<AuthSession> {
    return loginMock(payload);
  },

  register(payload: RegisterPayload): Promise<AuthUser> {
    return registerMock(payload);
  },
};