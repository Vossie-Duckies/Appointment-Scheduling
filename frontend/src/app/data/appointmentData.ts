export type Appointment = { // we use export to make it available in to the others files 
  id: string;
  patient: string;
  date: string;
  time: string;
  picUrl?: string;
};
// every appointment must have these information listed bellow that is why we craeted this export Appointment 

export const appointment  : Appointment[] = [  // "appointment here is the catual list that will store all the infromation "
  { id: 'P001', patient: 'Christ Markson',   date: '2026-01-15', time: '11:00' }, // here we create the appointment data we want to store as object
  { id: 'P002', patient: 'Toussaint Makaya', date: '2026-03-20', time: '09:00' },
  { id: 'P003', patient: 'Fred Hencho',      date: '2026-10-01', time: '15:00' },
];

