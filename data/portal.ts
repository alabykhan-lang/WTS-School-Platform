export type PortalServiceStatus = "available" | "in-development" | "coming-soon";

export type PortalService = {
  title: string;
  description: string;
  status: PortalServiceStatus;
  href?: string;
};

export type PortalGroup = {
  id: string;
  label: string;
  title: string;
  description: string;
  services: PortalService[];
};

export const portalGroups: PortalGroup[] = [
  {
    id: "parents-students",
    label: "01 · Parents and Students",
    title: "Parents and Students",
    description: "Future family services will make verified school information easier to find without exposing private student records on the public website.",
    services: [
      { title: "Results and report cards", description: "A secure results and report-card access pathway is being prepared for verified families.", status: "in-development" },
      { title: "Attendance information", description: "Read-only attendance information for approved parents and guardians is in preparation.", status: "in-development" },
      { title: "School notifications", description: "Official notices will be delivered through approved contact and consent arrangements.", status: "coming-soon" },
      { title: "Student profile and records", description: "Private student details and academic records will remain protected until an authorised family service is ready.", status: "coming-soon" },
    ],
  },
  {
    id: "teachers-staff",
    label: "02 · Teachers and Staff",
    title: "Teachers and Staff",
    description: "Staff services will be opened only through school-approved access. Availability does not grant access automatically.",
    services: [
      { title: "Attendance management", description: "The existing attendance workspace supports authorised staff and management attendance work.", status: "available", href: "https://wts-attendance-system.vercel.app" },
      { title: "My staff profile", description: "Authorised staff can use the existing self-service profile workspace assigned through the Central Registry.", status: "available", href: "https://wts-central-registry.vercel.app/staff" },
      { title: "Class and subject access", description: "A dedicated teaching workspace is being planned for assigned classes and subjects.", status: "in-development" },
      { title: "Score entry, student records and communication", description: "Secure score-entry, student-record and communication access will follow verified role and subject assignments.", status: "coming-soon" },
    ],
  },
  {
    id: "school-management",
    label: "03 · School Management",
    title: "School Management",
    description: "Management services are protected specialist systems. They open separately and require school-approved access.",
    services: [
      { title: "Central Registry", description: "Manage student, guardian, admissions and staff identity records in the existing registry.", status: "available", href: "https://wts-central-registry.vercel.app" },
      { title: "Admissions and student records", description: "The Central Registry currently provides the protected management workspace for these records.", status: "available", href: "https://wts-central-registry.vercel.app" },
      { title: "Staff management", description: "The Central Registry currently provides the protected management workspace for staff identity and access records.", status: "available", href: "https://wts-central-registry.vercel.app" },
      { title: "Attendance monitoring", description: "Monitor student and staff attendance, credentials, devices and reports in the existing attendance system.", status: "available", href: "https://wts-attendance-system.vercel.app" },
      { title: "Notification management", description: "Manage verified contacts, templates, drafts and delivery status in the existing notification system.", status: "available", href: "https://wts-notification-system.vercel.app" },
      { title: "Results administration and system reports", description: "The future unified management pathway will be added only after its access and data boundaries are confirmed.", status: "in-development" },
    ],
  },
];

export const portalStatusLabels: Record<PortalServiceStatus, string> = {
  available: "Available",
  "in-development": "In development",
  "coming-soon": "Coming soon",
};
