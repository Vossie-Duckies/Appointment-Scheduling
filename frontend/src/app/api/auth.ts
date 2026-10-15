import { LoginCredentials, RegistrationCredentials, NewDoctorCredentials } from "../types/auth";

const BASE_API_URL = "http://13.246.11.197";

export async function registerPatient(credentials: RegistrationCredentials): Promise<RegistrationCredentials> {
  console.log(credentials);
  const response = await fetch(`${BASE_API_URL}/account/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorText = await response.text();
    console.log(errorText);
    throw new Error(errorData.detail || 'Unable to login');
  }
  return response.json();
}

export async function loginPatient(credentials: LoginCredentials): Promise<LoginCredentials> {
  const response = await fetch(`${BASE_API_URL}/account/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Invalid Credentials');
  }
  return response.json();
}
