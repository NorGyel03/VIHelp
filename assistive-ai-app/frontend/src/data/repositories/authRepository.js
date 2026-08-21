import apiClient from '../api/apiClient';

export const registerApi = async (data) => {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
};

/** Login with email OR phone number (sent as `identifier`). */
export const loginApi = async (identifier, password) => {
  const res = await apiClient.post('/auth/login', { identifier, password });
  return res.data;
};

export const logoutApi = async () => {
  await apiClient.post('/auth/logout');
};

export const getProfileApi = async () => {
  const res = await apiClient.get('/user/profile');
  return res.data;
};

export const updateProfileApi = async (data) => {
  const res = await apiClient.put('/user/profile', data);
  return res.data;
};

export const changePasswordApi = async (currentPassword, newPassword) => {
  const res = await apiClient.put('/user/password', { currentPassword, newPassword });
  return res.data;
};

/** Request a 6-digit OTP for password reset. Returns { otp } in dev mode. */
export const forgotPasswordApi = async (email) => {
  const res = await apiClient.post('/auth/forgot-password', { email });
  return res.data;
};

/** Verify OTP and set a new password. */
export const resetPasswordApi = async (email, otp, newPassword) => {
  const res = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
  return res.data;
};

/** Change the current user's email (requires current password). */
export const updateEmailApi = async (newEmail, currentPassword) => {
  const res = await apiClient.put('/user/email', { newEmail, currentPassword });
  return res.data;
};
