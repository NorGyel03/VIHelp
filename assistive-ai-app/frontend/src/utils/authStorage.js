import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerApi,
  loginApi,
  logoutApi,
  updateProfileApi,
} from '../data/repositories/authRepository';

// Maps backend snake_case fields → camelCase for the rest of the app
const mapUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name || '',
  middleName: u.middle_name || '',
  lastName: u.last_name || '',
  phone: u.phone || '',
  occupation: u.occupation || '',
  dob: u.date_of_birth || '',
  address: u.address || '',
  profileImage: u.profile_image_url || null,
  createdAt: u.created_at,
});

const saveSession = async (token, user) => {
  await AsyncStorage.multiSet([
    ['auth_token', token],
    ['user', JSON.stringify(user)],
    ['isLoggedIn', 'true'],
  ]);
};

export const registerUser = async (userData) => {
  const result = await registerApi(userData);
  const user = mapUser(result.user);
  await saveSession(result.token, user);
  return user;
};

/** Login accepts an email address OR a phone number as `identifier`. */
export const loginUser = async (identifier, password) => {
  const result = await loginApi(identifier, password);
  const user = mapUser(result.user);
  await saveSession(result.token, user);
  return user;
};

export const logoutUser = async () => {
  try {
    await logoutApi();
  } catch {}
  await AsyncStorage.multiRemove(['auth_token', 'user', 'isLoggedIn']);
};

export const getUser = async () => {
  const data = await AsyncStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export const checkLoggedIn = async () => {
  const [[, token], [, loggedIn]] = await AsyncStorage.multiGet([
    'auth_token',
    'isLoggedIn',
  ]);
  return !!(token && loggedIn === 'true');
};

export const updateUser = async (updates) => {
  const result = await updateProfileApi(updates);
  const user = mapUser(result.user);
  await AsyncStorage.setItem('user', JSON.stringify(user));
  return user;
};
