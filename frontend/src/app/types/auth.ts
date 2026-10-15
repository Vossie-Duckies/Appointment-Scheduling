export type UserRoles = "DOCTOR" | "PATIENT";
export type UserGender = "male" | "female" | "prefer not say";

export interface LoginCredentials {
  email: string,
  password: string,
};

export interface RegistrationCredentials {
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  role: string,
  date_of_birth: string,
  gender: string,
};

export interface NewDoctorCredentials {
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  license_no: string,
};

