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

export interface AvailableSlots {
  slot_id: number,
  doctor_id: number,
  slot_date: string,
  start_time: string,
  end_time: string,
  status: string,
};

export interface AppointmenSlots {
  slot_id: number,
  reason: string,
};

// ---- profile (GET /account/profile/) -----------------------------------------

export interface Profile {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  photo: string | null;            // "data:image/jpeg;base64,..." or null when there is none
  gender?: string | null;          // patients only
  date_of_birth?: string | null;   // patients only, "YYYY-MM-DD"
  license_no?: string | null;      // doctors only
}

// The parts of an expo-image-picker result that the upload needs.
export interface PhotoAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

// ---- doctor schedule (GET /api/appointments/doctor/slots/ etc.) --------------
// Dates are "YYYY-MM-DD" and times "HH:MM:SS" in clinic time, as the API sends them.

export type SlotStatus = "AVAILABLE" | "BOOKED" | "BLOCKED";

export interface DoctorSlot {
  slot_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  on_time_off: boolean;   // the day is in the doctor's time off, so patients can't see it
  can_delete: boolean;    // false when booked or a (cancelled) appointment is on record
  appointment: {
    appointment_id: number;
    patient_name: string;
    reason: string;
    status: string;
  } | null;
}

export interface TimeOffPeriod {
  time_off_id: number;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface BookedDuringTimeOff {
  appointment_id: number;
  patient_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

export interface TimeOff extends TimeOffPeriod {
  booked_appointments: BookedDuringTimeOff[];
}

export interface DoctorSchedule {
  from: string;
  to: string;
  slots: DoctorSlot[];
  time_off: TimeOffPeriod[];
}

export interface NewSlot {
  slot_date: string;
  start_time: string;   // "HH:MM"
  end_time: string;
}

export interface WeeklyHours {
  weekdays: number[];     // Monday = 0 ... Sunday = 6
  start_time: string;     // "HH:MM"
  end_time: string;
  slot_minutes?: number;  // only used when adding
  start_date: string;
  weeks: number;
}

export interface ScheduleChangeResult {
  message: string;
  created?: number;
  removed?: number;
  kept?: number;
}

export interface NewTimeOff {
  start_date: string;
  end_date: string;
  reason: string;
}

export interface AddTimeOffResult {
  message: string;
  time_off: TimeOff;
}

// ---- notifications (GET /api/notifications/) ---------------------------------

export interface AppNotification {
  notification_id: number;
  message: string;
  is_read: boolean;
  sent_at: string;  // ISO date-time
  appointment: {
    appointment_id: number;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: string;
    with_name: string;  // the other person: "Dr. ..." for patients, the patient's name for doctors
  };
}

export interface NotificationInbox {
  unread_count: number;
  results: AppNotification[];
}
