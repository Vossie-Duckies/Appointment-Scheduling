import { LoginCredentials, RegistrationCredentials, NewDoctorCredentials, AvailableSlots, AppointmenSlots } from "../types/auth";
import * as SecureStore from "expo-secure-store";

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
    throw new Error(errorData.detail || 'Unable to login');
  }
  return response.json();

}

export async function loginPatient(credentials: LoginCredentials): Promise<LoginCredentials> {
  //const token = await SecureStore.getItemAsync('patient_token');
  const response = await fetch(`${BASE_API_URL}/account/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      //'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(credentials),
  });


  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Invalid Credentials');
  }

  const data = await response.json();
  const token = data.access;


  if (token) {
    await SecureStore.setItemAsync("patient_token", token);
    console.log("Token Successfully Saved");
  }

  return data
}

export async function getAvailableSlots(): Promise<AvailableSlots[]> {
  const token = await SecureStore.getItemAsync('patient_token');

  console.log("Retrived token for slots request: ", token ? "Token exists" : "Token is null");

  const response = await fetch(`${BASE_API_URL}/api/appointments/slots/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });


  if (!response.ok) {
    const htmlErrorText = await response.clone().text();
    console.log("SERVER HTML ERROR: ", htmlErrorText);

    const errorData = await response.json();
    throw new Error(errorData.detail || 'Invalid Data was retrived');
  }
  return response.json();
}

export async function postPatientAppointment(data: AppointmenSlots): Promise<any>{
  const token = await SecureStore.getItemAsync('patient_token');

  console.log("Retrived token for slots request: ", token ? "Token exists" : "Token is null");

  const response = await fetch(`${BASE_API_URL}/api/appointments/book/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Invalid Appointment was sent');
  }
  return response.json();
}

export async function getPastAppointments(): Promise<any> {
  const token = await SecureStore.getItemAsync('patient_token');

  console.log("Retrieved token for slots request: ", token ? "Token exists" : "Token is null");

  const response = await fetch(`${BASE_API_URL}/api/appointments/my/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Unable to retrieve relevant data')
  }
  return response.json();
}

export async function getDoctorAppointments() {
  const token = await SecureStore.getItemAsync('patient_token');

  console.log("Retrieved token for slots request: ", token ? "Token exists" : "Token is null");

  const response = await fetch(`${BASE_API_URL}/api/appointments/doctor/appointments/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Unable to retrieve relevant data');
  }
  return response.json();
}
