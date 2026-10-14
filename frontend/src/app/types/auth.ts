type UserRoles = "DOCTOR" | "PATIENT";
type UserGender = "male" | "female" | "non-binary";

export interface LoginCredentials {
  email: string,
  password: string,
};

export interface RegistrationCredentials {
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  role: UserRoles,
  date_of_birth: string,
  gender: UserGender,
};

export interface NewDoctorCredentials {
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  license_no: string,
};

