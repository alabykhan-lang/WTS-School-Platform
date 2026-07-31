export type StaffCategory = "leadership" | "administration" | "teaching" | "support";

export type StaffMember = {
  id: string;
  fullName: string;
  role: string;
  category: StaffCategory;
  photo: string | null;
  displayOrder: number;
  active: boolean;
  showPublicly: boolean;
};

export const staffCategoryDetails: Record<StaffCategory, { title: string; description: string }> = {
  leadership: {
    title: "Proprietor and School Leadership",
    description: "The leaders guiding the school’s direction, learning culture and day-to-day care.",
  },
  administration: {
    title: "Administrative and Management Staff",
    description: "The team supporting the school’s administrative and financial operations.",
  },
  teaching: {
    title: "Teaching Staff",
    description: "Committed educators supporting learners across the school journey.",
  },
  support: {
    title: "Non-Teaching and Support Staff",
    description: "The colleagues who help keep the school community welcoming and well supported.",
  },
};

// Temporary local source for the public directory. It contains only details approved for public display.
// Future source: a secure, read-only WTS Central Registry API. It must require both an active
// employment status and an explicit public-visibility permission before an entry is returned.
export const staff: StaffMember[] = [
  { id: "azeez-akintunde-bamidele", fullName: "Azeez Akintunde Bamidele", role: "Principal", category: "leadership", photo: "/images/staff/azeez-akintunde-bamidele.webp", displayOrder: 10, active: true, showPublicly: true },
  { id: "alabi-m-o", fullName: "Mr. Alabi M. O.", role: "Vice-Principal", category: "leadership", photo: "/images/staff/alabi-m-o.webp", displayOrder: 20, active: true, showPublicly: true },
  { id: "qudus-k-a", fullName: "Mr. Qudus K. A.", role: "Director of Primary School Affairs", category: "leadership", photo: "/images/staff/qudus-k-a.webp", displayOrder: 30, active: true, showPublicly: true },
  { id: "alabi-b-o", fullName: "Mrs. Alabi B. O.", role: "Headmistress", category: "leadership", photo: "/images/staff/alabi-b-o.webp", displayOrder: 40, active: true, showPublicly: true },
  { id: "omotosho-s-o", fullName: "Mrs. Omotosho S. O.", role: "Assistant Headmistress", category: "leadership", photo: "/images/staff/omotosho-s-o.webp", displayOrder: 50, active: true, showPublicly: true },

  { id: "yusuf-t-a", fullName: "Yusuf T. A.", role: "Bursar", category: "administration", photo: "/images/staff/yusuf-t-a.webp", displayOrder: 10, active: true, showPublicly: true },

  { id: "olasunkanmi-ubaidat-adeola", fullName: "Miss. Olasunkanmi Ubaidat Adeola", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/olasunkanmi-ubaidat-adeola.webp", displayOrder: 10, active: true, showPublicly: true },
  { id: "jimoh-r-t", fullName: "Miss. Jimoh R. T.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/jimoh-r-t.webp", displayOrder: 20, active: true, showPublicly: true },
  { id: "oyelami-r-o", fullName: "Miss. Oyelami R. O.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/oyelami-r-o.webp", displayOrder: 30, active: true, showPublicly: true },
  { id: "adegoke-ibraheem", fullName: "Mr. Adegoke Ibraheem", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/adegoke-ibraheem.webp", displayOrder: 40, active: true, showPublicly: true },
  { id: "akintaro-oluwabunmi-abosede", fullName: "Akintaro Oluwabunmi Abosede", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/akintaro-oluwabunmi-abosede.webp", displayOrder: 50, active: true, showPublicly: true },
  { id: "raji-a-f", fullName: "Miss. Raji A. F.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/raji-a-f.webp", displayOrder: 60, active: true, showPublicly: true },
  { id: "adegboyega-n-a", fullName: "Miss. Adegboyega N. A.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/adegboyega-n-a.webp", displayOrder: 70, active: true, showPublicly: true },
  { id: "azeez-a-a", fullName: "Miss. Azeez A. A.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/azeez-a-a.webp", displayOrder: 80, active: true, showPublicly: true },
  { id: "oyewumi-r-a", fullName: "Mrs. Oyewumi R. A.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/oyewumi-r-a.webp", displayOrder: 90, active: true, showPublicly: true },
  { id: "ajayi-taiwo", fullName: "Mrs. Ajayi Taiwo", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/ajayi-taiwo.webp", displayOrder: 100, active: true, showPublicly: true },
  { id: "akintaro-b-a", fullName: "Mrs. Akintaro B. A.", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/akintaro-b-a.webp", displayOrder: 110, active: true, showPublicly: true },
  { id: "alonge-shola", fullName: "Alonge Shola", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/alonge-shola.webp", displayOrder: 120, active: true, showPublicly: true },
  { id: "omotokese", fullName: "Mrs. Omotokese", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/omotokese.webp", displayOrder: 130, active: true, showPublicly: true },
  { id: "adeleke-faizat-titilade", fullName: "Adeleke Faizat Titilade", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/adeleke-faizat-titilade.webp", displayOrder: 140, active: true, showPublicly: true },
  { id: "suleiman-rofiat-abisola", fullName: "Suleiman Rofiat Abisola", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/suleiman-rofiat-abisola.webp", displayOrder: 150, active: true, showPublicly: true },
  { id: "akinwale-abigeal-adedoyin", fullName: "Mrs. Akinwale Abigeal Adedoyin", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/akinwale-abigeal-adedoyin.webp", displayOrder: 160, active: true, showPublicly: true },
  { id: "ajayi-olamide-rhoda", fullName: "Ajayi Olamide Rhoda", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/ajayi-olamide-rhoda.webp", displayOrder: 170, active: true, showPublicly: true },
  { id: "adegoke-fatiu", fullName: "Mr. Adegoke Fatiu", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/adegoke-fatiu.webp", displayOrder: 180, active: true, showPublicly: true },
  { id: "hammed-abdulafeez-ishola", fullName: "Mr. Hammed Abdulafeez Ishola", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/hammed-abdulafeez-ishola.webp", displayOrder: 190, active: true, showPublicly: true },
  { id: "atanda-toheeb-oyetunji", fullName: "Mr. Atanda Toheeb Oyetunji", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/atanda-toheeb-oyetunji.webp", displayOrder: 200, active: true, showPublicly: true },
  { id: "issa-adam-abiodun", fullName: "Mr. Issa Adam Abiodun", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/issa-adam-abiodun.webp", displayOrder: 210, active: true, showPublicly: true },
  { id: "azeez-fawaz", fullName: "Mr. Azeez Fawaz", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/azeez-fawaz.webp", displayOrder: 220, active: true, showPublicly: true },
  { id: "adigun-fridaos-fikayo", fullName: "Miss. Adigun Fridaos Fikayo", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/adigun-fridaos-fikayo.webp", displayOrder: 230, active: true, showPublicly: true },
  { id: "oyegbade-peace", fullName: "Miss. Oyegbade Peace", role: "Full-Time Teaching Staff", category: "teaching", photo: "/images/staff/oyegbade-peace.webp", displayOrder: 240, active: true, showPublicly: true },
  { id: "adetunji-s-a", fullName: "Elder Adetunji S. A.", role: "Part-Time Teaching Staff", category: "teaching", photo: "/images/staff/adetunji-s-a.webp", displayOrder: 250, active: true, showPublicly: true },
  { id: "alli-isiaka-akanni", fullName: "Mr. Alli Isiaka Akanni", role: "Part-Time Teaching Staff", category: "teaching", photo: "/images/staff/alli-isiaka-akanni.webp", displayOrder: 260, active: true, showPublicly: true },
  { id: "adeoye-kabiru-adeniran", fullName: "Mr. Adeoye Kabiru Adeniran", role: "Part-Time Teaching Staff", category: "teaching", photo: "/images/staff/adeoye-kabiru-adeniran.webp", displayOrder: 270, active: true, showPublicly: true },
  { id: "azeez-ismail-o", fullName: "Mr. Azeez Ismail O.", role: "Part-Time Teaching Staff", category: "teaching", photo: "/images/staff/azeez-ismail-o.webp", displayOrder: 280, active: true, showPublicly: true },

  { id: "hamsat-p-i", fullName: "Mrs. Hamsat P. I.", role: "Non-Academic Staff", category: "support", photo: "/images/staff/hamsat-p-i.webp", displayOrder: 10, active: true, showPublicly: true },
  { id: "oyelami-taofeek", fullName: "Mr. Oyelami Taofeek", role: "Non-Academic Staff", category: "support", photo: "/images/staff/oyelami-taofeek.webp", displayOrder: 20, active: true, showPublicly: true },
];

export const publicStaff = staff
  .filter((member) => member.active && member.showPublicly)
  .sort((first, second) => first.displayOrder - second.displayOrder);

export function getPublicStaffByCategory(category: StaffCategory) {
  return publicStaff.filter((member) => member.category === category);
}
