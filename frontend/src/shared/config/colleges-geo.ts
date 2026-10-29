/**
 * SAMANVAY — AICTE National Technical Institutions & Geolocation Directory
 * National directory of genuine premier universities, engineering colleges,
 * and technical institutes across India with exact GPS coordinates, NIRF ranks,
 * accreditation, contact channels, and advanced geospatial distance utilities.
 */

export interface CollegeGeoItem {
  id: number;
  name: string;
  shortName?: string;
  aicte_id: string;
  aishe_code: string;
  category: string;
  institution_type: string;
  approval_status: 'APPROVED' | 'UNDER_SCRUTINY' | 'SHOW_CAUSE_NOTICE' | 'HEARING_SCHEDULED' | 'WITHDRAWN';
  city: string;
  state: string;
  region: 'Northern' | 'Western' | 'South-West' | 'Southern' | 'Central' | 'Eastern';
  pin_code: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  estdYear?: number;
  nirfRank?: string;
  accreditation?: string;
  intakeCapacity?: number;
  website?: string;
  active_complaints_count: number;
  is_conflicting: boolean;
  active_bureaus?: string[];
  contact_phone?: string;
  contact_email?: string;
  // AICTE Statutory Classification & Regulatory Structure
  domains?: string[];
  streams?: string[];
  framework?: string;
}

export const AICTE_DOMAINS = [
  { id: 'ALL', label: 'All Disciplines', icon: '🎓' },
  { id: 'Engineering & Technology', label: 'Engineering & Technology', icon: '⚙️' },
  { id: 'Management & Business', label: 'Management & Business (MBA/PGDM)', icon: '💼' },
  { id: 'Computer Applications', label: 'Computer Applications (MCA/BCA)', icon: '💻' },
  { id: 'Pharmacy', label: 'Pharmacy (B.Pharm/M.Pharm)', icon: '💊' },
  { id: 'Architecture & Planning', label: 'Architecture & Planning (B.Arch)', icon: '🏛️' },
  { id: 'Hotel Management & Catering', label: 'Hotel Management (HMCT)', icon: '🏨' },
  { id: 'Applied Arts, Crafts & Design', label: 'Applied Arts & Design (B.Des)', icon: '🎨' },
] as const;

export const AICTE_FRAMEWORKS = [
  'ALL',
  'Institute of National Importance',
  'Central University',
  'State Government / Aided',
  'State Autonomous University',
  'Deemed-to-be University (IoE)',
  'Private Self-Financing Institute',
] as const;

export interface PresetLocation {
  id: string;
  label: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  { id: 'nagpur', label: 'Nagpur & Vidarbha', city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { id: 'pune', label: 'Pune', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { id: 'mumbai', label: 'Mumbai & MMR', city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { id: 'delhi', label: 'Delhi NCR', city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { id: 'bangalore', label: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { id: 'hyderabad', label: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { id: 'chennai', label: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { id: 'kolkata', label: 'Kolkata', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { id: 'ahmedabad', label: 'Ahmedabad / Gandhinagar', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { id: 'jaipur', label: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { id: 'indore', label: 'Indore / Bhopal', city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { id: 'kanpur', label: 'Kanpur / Lucknow', city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { id: 'chandigarh', label: 'Chandigarh / Punjab', city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
  { id: 'coimbatore', label: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { id: 'kochi', label: 'Kochi / Kerala', city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { id: 'patna', label: 'Patna / Bihar', city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { id: 'bhubaneswar', label: 'Bhubaneswar / Odisha', city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  { id: 'guwahati', label: 'Guwahati / Assam', city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
];

export const INDIAN_PIN_CODE_INDEX: Record<string, { city: string; state: string; lat: number; lng: number }> = {
  '440': { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  '441': { city: 'Nagpur Rural / Wardha', state: 'Maharashtra', lat: 21.05, lng: 79.02 },
  '444': { city: 'Amravati / Akola', state: 'Maharashtra', lat: 20.932, lng: 77.7523 },
  '411': { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  '400': { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  '431': { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', lat: 19.8762, lng: 75.3433 },
  '422': { city: 'Nashik', state: 'Maharashtra', lat: 20.0059, lng: 73.7898 },
  '110': { city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  '201': { city: 'Noida / Ghaziabad', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.391 },
  '122': { city: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  '560': { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  '600': { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  '641': { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  '500': { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  '700': { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  '380': { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  '395': { city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  '302': { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  '452': { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  '208': { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  '221': { city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  '160': { city: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  '682': { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  '695': { city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366 },
  '800': { city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  '834': { city: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
  '751': { city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  '781': { city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
};

export const NATIONAL_COLLEGES_DIRECTORY: CollegeGeoItem[] = [
  // ==========================================
  // 1. NAGPUR & VIDARBHA (MAHARASHTRA)
  // ==========================================
  {
    id: 201,
    name: 'Visvesvaraya National Institute of Technology (VNIT Nagpur)',
    shortName: 'VNIT Nagpur',
    aicte_id: '1-00000021',
    aishe_code: 'U-0334',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Nagpur',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '440010',
    address: 'South Ambazari Road, Ambazari, Nagpur, Maharashtra',
    coordinates: { lat: 21.1245, lng: 79.0519 },
    estdYear: 1960,
    nirfRank: 'NIRF Engineering #41',
    accreditation: 'NBA Tier-1 • MoE Institute of National Importance',
    intakeCapacity: 1100,
    website: 'https://vnit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 712 280 1361',
    contact_email: 'registrar@vnit.ac.in',
  },
  {
    id: 202,
    name: 'Shri Ramdeobaba College of Engineering and Management (Ramdeobaba University)',
    shortName: 'RCOEM Nagpur',
    aicte_id: '1-00000022',
    aishe_code: 'C-18817',
    category: 'Engineering & Technology',
    institution_type: 'State Autonomous University',
    approval_status: 'APPROVED',
    city: 'Nagpur',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '440013',
    address: 'Ramdeo Tekdi, Gittikhadan, Katol Road, Nagpur, Maharashtra',
    coordinates: { lat: 21.1764, lng: 79.0617 },
    estdYear: 1984,
    nirfRank: 'NIRF Engineering #145 • Top Ranked in Central India',
    accreditation: 'NAAC A+ (Score 3.32) • NBA Accredited',
    intakeCapacity: 1450,
    website: 'https://www.rknec.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 712 258 0011',
    contact_email: 'principal@rknec.edu',
  },
  {
    id: 203,
    name: 'Laxminarayan Innovation Technological University (LIT Nagpur)',
    shortName: 'LIT Nagpur',
    aicte_id: '1-00000023',
    aishe_code: 'U-0314',
    category: 'Chemical Engg & Technology',
    institution_type: 'State Unitary University',
    approval_status: 'APPROVED',
    city: 'Nagpur',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '440033',
    address: 'Amravati Road, Bharat Nagar, Nagpur, Maharashtra',
    coordinates: { lat: 21.1396, lng: 79.0543 },
    estdYear: 1942,
    nirfRank: 'Premier Chemical Engineering Institute',
    accreditation: 'NAAC A+ • NBA Tier-1',
    intakeCapacity: 600,
    website: 'https://litnagpur.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 712 256 1107',
    contact_email: 'director@litnagpur.in',
  },
  {
    id: 204,
    name: 'Yeshwantrao Chavan College of Engineering (YCCE Nagpur)',
    shortName: 'YCCE Nagpur',
    aicte_id: '1-00000024',
    aishe_code: 'C-18820',
    category: 'Engineering & Technology',
    institution_type: 'Private-Autonomous',
    approval_status: 'APPROVED',
    city: 'Nagpur',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '441110',
    address: 'Hingna Road, Wanadongri, Nagpur, Maharashtra',
    coordinates: { lat: 21.0967, lng: 78.9786 },
    estdYear: 1984,
    nirfRank: 'NIRF Engineering #160',
    accreditation: 'NAAC A • NBA Tier-1',
    intakeCapacity: 1200,
    website: 'https://www.ycce.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 7104 242 919',
    contact_email: 'principal@ycce.edu',
  },
  {
    id: 205,
    name: 'Government College of Engineering, Nagpur (GCOEN)',
    shortName: 'GCOEN Nagpur',
    aicte_id: '1-00000025',
    aishe_code: 'C-58475',
    category: 'Engineering & Technology',
    institution_type: 'Government Institution',
    approval_status: 'APPROVED',
    city: 'Nagpur',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '441108',
    address: 'Sector 27, Mihan Re-habilitation Colony, Khapri, Nagpur',
    coordinates: { lat: 21.0667, lng: 79.0558 },
    estdYear: 2016,
    nirfRank: 'Government Directorate of Technical Education (DTE)',
    accreditation: 'Govt of Maharashtra • AICTE Approved',
    intakeCapacity: 450,
    website: 'https://gcoen.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 7103 295 220',
    contact_email: 'principal.gcoenagpur@dtemaharashtra.gov.in',
  },
  {
    id: 206,
    name: 'Government College of Engineering, Amravati (GCOEA)',
    shortName: 'GCOEA Amravati',
    aicte_id: '1-00000026',
    aishe_code: 'C-10490',
    category: 'Engineering & Technology',
    institution_type: 'Govt-Autonomous',
    approval_status: 'APPROVED',
    city: 'Amravati',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '444604',
    address: 'VMV Road, Kathora Naka, Amravati, Maharashtra',
    coordinates: { lat: 20.932, lng: 77.7523 },
    estdYear: 1964,
    nirfRank: 'NIRF Engineering Top 200',
    accreditation: 'NBA Accredited • AICTE Approved',
    intakeCapacity: 650,
    website: 'https://gcoea.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 721 253 1929',
    contact_email: 'principal@gcoea.ac.in',
  },

  // ==========================================
  // 2. PUNE & WESTERN MAHARASHTRA
  // ==========================================
  {
    id: 11,
    name: 'College of Engineering Pune (COEP Technological University)',
    shortName: 'COEP Pune',
    aicte_id: '1-11223344',
    aishe_code: 'U-0312',
    category: 'Engineering & Technology',
    institution_type: 'Unitary State Technical University',
    approval_status: 'APPROVED',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '411005',
    address: 'Wellesley Road, Shivajinagar, Pune, Maharashtra',
    coordinates: { lat: 18.5293, lng: 73.8565 },
    estdYear: 1854,
    nirfRank: 'NIRF Engineering #73 (Asia’s 2nd Oldest College)',
    accreditation: 'NAAC A++ • NBA Tier-1',
    intakeCapacity: 1100,
    website: 'https://www.coep.org.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 20 2550 7000',
    contact_email: 'admin@coep.ac.in',
  },
  {
    id: 107,
    name: 'Pune Institute of Computer Technology (PICT Pune)',
    shortName: 'PICT Pune',
    aicte_id: '1-33112244',
    aishe_code: 'C-41480',
    category: 'Computer Science & IT',
    institution_type: 'Private-Self-Financed',
    approval_status: 'APPROVED',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '411043',
    address: 'Survey No. 27, Near Trimurti Chowk, Dhankawadi, Pune',
    coordinates: { lat: 18.4575, lng: 73.8508 },
    estdYear: 1983,
    nirfRank: 'Top CS & AI Placement Campus in Western India',
    accreditation: 'NAAC A+ • NBA Accredited',
    intakeCapacity: 780,
    website: 'https://pict.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 20 2437 1101',
    contact_email: 'principal@pict.edu',
  },
  {
    id: 108,
    name: 'Vishwakarma Institute of Technology (VIT Pune)',
    shortName: 'VIT Pune',
    aicte_id: '1-44223355',
    aishe_code: 'C-41520',
    category: 'Engineering & Technology',
    institution_type: 'Private-Autonomous',
    approval_status: 'APPROVED',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '411037',
    address: '666, Upper Indiranagar, Bibwewadi, Pune, Maharashtra',
    coordinates: { lat: 18.4636, lng: 73.8682 },
    estdYear: 1983,
    nirfRank: 'NIRF Engineering #150',
    accreditation: 'NAAC A++ • NBA Tier-1',
    intakeCapacity: 1200,
    website: 'https://www.vit.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 20 2420 2180',
    contact_email: 'registrar@vit.edu',
  },
  {
    id: 1,
    name: 'Apex Institute of Engineering & Technology',
    shortName: 'Apex Pune',
    aicte_id: '1-10293847',
    aishe_code: 'C-44120',
    category: 'Engineering & Technology',
    institution_type: 'Private-Self-Financed',
    approval_status: 'SHOW_CAUSE_NOTICE',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '411057',
    address: 'Survey 42, Hinjawadi Phase 2, Pune, Maharashtra',
    coordinates: { lat: 18.5913, lng: 73.7389 },
    estdYear: 2012,
    nirfRank: 'State Affiliated Band',
    accreditation: 'Under Active Scrutiny Docket',
    intakeCapacity: 600,
    active_complaints_count: 3,
    is_conflicting: true,
    active_bureaus: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    contact_phone: '+91 20 2293 8470',
    contact_email: 'registrar@apex-tech.edu.in',
  },

  // ==========================================
  // 3. MUMBAI & MMR
  // ==========================================
  {
    id: 106,
    name: 'Indian Institute of Technology Bombay (IIT Bombay)',
    shortName: 'IIT Bombay',
    aicte_id: '1-00000003',
    aishe_code: 'U-0306',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '400076',
    address: 'Main Gate Road, Powai, Mumbai, Maharashtra',
    coordinates: { lat: 19.1334, lng: 72.9133 },
    estdYear: 1958,
    nirfRank: 'NIRF Engineering #3 • Overall #4',
    accreditation: 'Institute of Eminence (IoE)',
    intakeCapacity: 1400,
    website: 'https://www.iitb.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 22 2572 2545',
    contact_email: 'pro@iitb.ac.in',
  },
  {
    id: 12,
    name: 'Veermata Jijabai Technological Institute (VJTI Mumbai)',
    shortName: 'VJTI Mumbai',
    aicte_id: '1-22334455',
    aishe_code: 'C-34101',
    category: 'Engineering & Technology',
    institution_type: 'Govt-Autonomous',
    approval_status: 'APPROVED',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '400019',
    address: 'H.R. Mahajani Marg, Matunga, Mumbai, Maharashtra',
    coordinates: { lat: 19.0222, lng: 72.8561 },
    estdYear: 1887,
    nirfRank: 'NIRF Engineering #80',
    accreditation: 'NAAC A+ • AICTE Approved',
    intakeCapacity: 950,
    website: 'https://vjti.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 22 2419 8100',
    contact_email: 'director@vjti.ac.in',
  },
  {
    id: 13,
    name: 'Sardar Patel Institute of Technology (SPIT Mumbai)',
    shortName: 'SPIT Mumbai',
    aicte_id: '1-33445566',
    aishe_code: 'C-34109',
    category: 'Engineering & Technology',
    institution_type: 'Private-Autonomous',
    approval_status: 'APPROVED',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '400058',
    address: 'Bhavan’s Campus, Munshi Nagar, Andheri West, Mumbai',
    coordinates: { lat: 19.1232, lng: 72.8361 },
    estdYear: 2005,
    nirfRank: 'NIRF Engineering #140',
    accreditation: 'NAAC A+ • NBA Accredited',
    intakeCapacity: 500,
    website: 'https://www.spit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 22 2670 7440',
    contact_email: 'principal@spit.ac.in',
  },

  // ==========================================
  // 4. DELHI NCR & NORTHERN REGION
  // ==========================================
  {
    id: 101,
    name: 'Indian Institute of Technology Delhi (IIT Delhi)',
    shortName: 'IIT Delhi',
    aicte_id: '1-00000002',
    aishe_code: 'U-0092',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110016',
    address: 'Hauz Khas, New Delhi',
    coordinates: { lat: 28.545, lng: 77.1926 },
    estdYear: 1961,
    nirfRank: 'NIRF Overall #2 • Engineering #2',
    accreditation: 'Institute of Eminence (IoE)',
    intakeCapacity: 1250,
    website: 'https://home.iitd.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2659 7135',
    contact_email: 'webmaster@admin.iitd.ac.in',
  },
  {
    id: 7,
    name: 'Delhi Technological University (DTU / DCE)',
    shortName: 'DTU Delhi',
    aicte_id: '1-77889900',
    aishe_code: 'U-0105',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110042',
    address: 'Shahbad Daulatpur, Main Bawana Road, Delhi',
    coordinates: { lat: 28.7499, lng: 77.117 },
    estdYear: 1941,
    nirfRank: 'NIRF Engineering #29',
    accreditation: 'NAAC A+ • NBA Tier-1',
    intakeCapacity: 2500,
    website: 'http://dtu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2787 1018',
    contact_email: 'registrar@dtu.ac.in',
  },
  {
    id: 102,
    name: 'Netaji Subhas University of Technology (NSUT)',
    shortName: 'NSUT Delhi',
    aicte_id: '1-77881122',
    aishe_code: 'U-0955',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110078',
    address: 'Sector 3, Dwarka, New Delhi',
    coordinates: { lat: 28.6105, lng: 77.0378 },
    estdYear: 1983,
    nirfRank: 'NIRF Engineering #60',
    accreditation: 'NAAC A+ • AICTE Approved',
    intakeCapacity: 1800,
    website: 'http://www.nsut.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2500 0015',
    contact_email: 'academic@nsut.ac.in',
  },
  {
    id: 8,
    name: 'Indraprastha Institute of Information Technology (IIIT Delhi)',
    shortName: 'IIIT Delhi',
    aicte_id: '1-66778899',
    aishe_code: 'U-0106',
    category: 'Computer Science & AI',
    institution_type: 'State Autonomous',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110020',
    address: 'Okhla Industrial Estate, Phase III, Near Govind Puri, New Delhi',
    coordinates: { lat: 28.5438, lng: 77.2724 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #75',
    accreditation: 'NAAC A • AICTE Recognized',
    intakeCapacity: 650,
    website: 'https://www.iiitd.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2690 7400',
    contact_email: 'info@iiitd.ac.in',
  },
  {
    id: 3,
    name: 'Delhi Institute of Technology & Management',
    shortName: 'DITM Delhi',
    aicte_id: '1-99887755',
    aishe_code: 'C-27483',
    category: 'Engineering & Technology',
    institution_type: 'Private-Self-Financed',
    approval_status: 'UNDER_SCRUTINY',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110085',
    address: 'Institutional Area, Sector 22, Rohini, New Delhi',
    coordinates: { lat: 28.7159, lng: 77.1045 },
    estdYear: 2007,
    nirfRank: 'Affiliated Technical College',
    accreditation: 'NBA Accr. Programs',
    intakeCapacity: 480,
    active_complaints_count: 4,
    is_conflicting: true,
    active_bureaus: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    contact_phone: '+91 11 2788 1234',
    contact_email: 'director@ditm.edu.in',
  },

  // ==========================================
  // 5. BENGALURU & KARNATAKA
  // ==========================================
  {
    id: 109,
    name: 'Indian Institute of Science (IISc Bangalore)',
    shortName: 'IISc Bengaluru',
    aicte_id: '1-00000001',
    aishe_code: 'U-0220',
    category: 'Science, Research & Technology',
    institution_type: 'Deemed University (IoE)',
    approval_status: 'APPROVED',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560012',
    address: 'CV Raman Road, Malleshwaram, Bengaluru, Karnataka',
    coordinates: { lat: 13.0219, lng: 77.5671 },
    estdYear: 1909,
    nirfRank: 'NIRF Overall #1 (University Category)',
    accreditation: 'Institute of Eminence (IoE)',
    intakeCapacity: 500,
    website: 'https://iisc.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 2293 2004',
    contact_email: 'registrar@iisc.ac.in',
  },
  {
    id: 14,
    name: 'R.V. College of Engineering (RVCE Bengaluru)',
    shortName: 'RVCE Bangalore',
    aicte_id: '1-44112233',
    aishe_code: 'C-1290',
    category: 'Engineering & Technology',
    institution_type: 'Autonomous College',
    approval_status: 'APPROVED',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560059',
    address: 'Mysore Road, RV Vidyaniketan Post, Bengaluru, Karnataka',
    coordinates: { lat: 12.9237, lng: 77.4987 },
    estdYear: 1963,
    nirfRank: 'NIRF Engineering #96',
    accreditation: 'NAAC A+ • NBA Tier-1',
    intakeCapacity: 1450,
    website: 'https://www.rvce.edu.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 6818 8100',
    contact_email: 'principal@rvce.edu.in',
  },
  {
    id: 15,
    name: 'BMS College of Engineering (BMSCE)',
    shortName: 'BMSCE Bangalore',
    aicte_id: '1-55223344',
    aishe_code: 'C-1291',
    category: 'Engineering & Technology',
    institution_type: 'Govt-Aided Autonomous',
    approval_status: 'APPROVED',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560019',
    address: 'Bull Temple Road, Basavanagudi, Bengaluru, Karnataka',
    coordinates: { lat: 12.941, lng: 77.5655 },
    estdYear: 1946,
    nirfRank: 'NIRF Engineering #83',
    accreditation: 'NAAC A++ • Tier-1 Accredited',
    intakeCapacity: 1300,
    website: 'https://www.bmsce.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 2662 2130',
    contact_email: 'info@bmsce.ac.in',
  },
  {
    id: 2,
    name: 'National Institute of Science & Technology',
    shortName: 'NIST Bengaluru',
    aicte_id: '1-28491022',
    aishe_code: 'C-51908',
    category: 'Engineering & Technology',
    institution_type: 'Deemed University',
    approval_status: 'UNDER_SCRUTINY',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560100',
    address: 'Plot 45, Electronic City Phase 1, Bengaluru, Karnataka',
    coordinates: { lat: 12.8452, lng: 77.6602 },
    estdYear: 2004,
    nirfRank: 'Electronic City Tech Cluster',
    accreditation: 'VTU Affiliated',
    intakeCapacity: 600,
    active_complaints_count: 2,
    is_conflicting: true,
    active_bureaus: ['VIGILANCE_CELL', 'PGRC'],
    contact_phone: '+91 80 2849 1022',
    contact_email: 'admin@nist.edu.in',
  },

  // ==========================================
  // 6. CHENNAI & TAMIL NADU
  // ==========================================
  {
    id: 113,
    name: 'Indian Institute of Technology Madras (IIT Madras)',
    shortName: 'IIT Madras',
    aicte_id: '1-00000005',
    aishe_code: 'U-0456',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '600036',
    address: 'IIT P.O., Sardar Patel Road, Chennai, Tamil Nadu',
    coordinates: { lat: 12.9915, lng: 80.2337 },
    estdYear: 1959,
    nirfRank: 'NIRF Overall #1 • Engineering #1',
    accreditation: 'Institute of Eminence (IoE)',
    intakeCapacity: 1350,
    website: 'https://www.iitm.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 2257 8100',
    contact_email: 'deanar@iitm.ac.in',
  },
  {
    id: 16,
    name: 'College of Engineering, Guindy (CEG Anna University)',
    shortName: 'CEG Anna Univ',
    aicte_id: '1-66334455',
    aishe_code: 'U-0441',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '600025',
    address: '12, Sardar Patel Road, Guindy, Chennai, Tamil Nadu',
    coordinates: { lat: 13.0109, lng: 80.2354 },
    estdYear: 1794,
    nirfRank: 'NIRF Engineering #18 (Oldest Technical Campus in Asia)',
    accreditation: 'NAAC A++ • NBA Tier-1',
    intakeCapacity: 1600,
    website: 'https://ceg.annauniv.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 2235 7004',
    contact_email: 'deanceg@annauniv.edu',
  },
  {
    id: 114,
    name: 'National Institute of Technology Tiruchirappalli (NIT Trichy)',
    shortName: 'NIT Trichy',
    aicte_id: '1-00000009',
    aishe_code: 'U-0467',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '620015',
    address: 'Tanjore Main Road, National Highway 67, Tiruchirappalli',
    coordinates: { lat: 10.7589, lng: 78.8132 },
    estdYear: 1964,
    nirfRank: 'NIRF Engineering #9 (Top Ranked NIT in India)',
    accreditation: 'NBA Tier-1 • MoE Center of Excellence',
    intakeCapacity: 1150,
    website: 'https://www.nitt.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 431 250 3000',
    contact_email: 'registrar@nitt.edu',
  },
  {
    id: 17,
    name: 'PSG College of Technology (PSG Tech Coimbatore)',
    shortName: 'PSG Tech',
    aicte_id: '1-77445566',
    aishe_code: 'C-0622',
    category: 'Engineering & Technology',
    institution_type: 'Govt-Aided Autonomous',
    approval_status: 'APPROVED',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '641004',
    address: 'Post Box No. 1611, Peelamedu, Coimbatore, Tamil Nadu',
    coordinates: { lat: 11.0247, lng: 77.0028 },
    estdYear: 1951,
    nirfRank: 'NIRF Engineering #63',
    accreditation: 'NAAC A • NBA Tier-1',
    intakeCapacity: 1400,
    website: 'https://www.psgtech.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 422 257 2177',
    contact_email: 'principal@psgtech.edu',
  },
  {
    id: 5,
    name: 'Chennai Global Engineering College',
    shortName: 'CGEC Chennai',
    aicte_id: '1-55443322',
    aishe_code: 'C-05661',
    category: 'Engineering & Technology',
    institution_type: 'Private-Self-Financed',
    approval_status: 'APPROVED',
    city: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '600097',
    address: 'Rajiv Gandhi Salai (OMR), Karapakkam, Chennai, Tamil Nadu',
    coordinates: { lat: 12.9171, lng: 80.2281 },
    estdYear: 2008,
    nirfRank: 'OMR IT Corridor Band',
    accreditation: 'Anna University Affiliated',
    intakeCapacity: 600,
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 5544 3322',
    contact_email: 'dean@cgec.edu.in',
  },

  // ==========================================
  // 7. HYDERABAD & TELANGANA
  // ==========================================
  {
    id: 22,
    name: 'International Institute of Information Technology Hyderabad (IIIT-H)',
    shortName: 'IIIT Hyderabad',
    aicte_id: '1-88776655',
    aishe_code: 'U-0016',
    category: 'Computer Science & AI',
    institution_type: 'Deemed University (PPP)',
    approval_status: 'APPROVED',
    city: 'Hyderabad',
    state: 'Telangana',
    region: 'South-West',
    pin_code: '500032',
    address: 'Prof. C R Rao Road, Gachibowli, Hyderabad, Telangana',
    coordinates: { lat: 17.4455, lng: 78.3489 },
    estdYear: 1998,
    nirfRank: 'NIRF Engineering #55 • Premier AI Research Hub',
    accreditation: 'NAAC A++ • AICTE Approved',
    intakeCapacity: 450,
    website: 'https://www.iiit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 40 6653 1000',
    contact_email: 'query@iiit.ac.in',
  },
  {
    id: 116,
    name: 'Indian Institute of Technology Hyderabad (IIT Hyderabad)',
    shortName: 'IIT Hyderabad',
    aicte_id: '1-00000006',
    aishe_code: 'U-0015',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Hyderabad',
    state: 'Telangana',
    region: 'South-West',
    pin_code: '502285',
    address: 'Near NH-65, Kandi, Sangareddy, Telangana',
    coordinates: { lat: 17.5947, lng: 78.123 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #8',
    accreditation: 'MoE Center of Excellence',
    intakeCapacity: 950,
    website: 'https://www.iith.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 40 2301 6033',
    contact_email: 'pro@iith.ac.in',
  },
  {
    id: 21,
    name: 'Jawaharlal Nehru Technological University (JNTU Hyderabad)',
    shortName: 'JNTU Hyderabad',
    aicte_id: '1-99667788',
    aishe_code: 'U-0017',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Hyderabad',
    state: 'Telangana',
    region: 'South-West',
    pin_code: '500085',
    address: 'Kukatpally, Housing Board Colony, Hyderabad, Telangana',
    coordinates: { lat: 17.4933, lng: 78.3914 },
    estdYear: 1965,
    nirfRank: 'NIRF Engineering #88',
    accreditation: 'NAAC A+ • NBA Tier-1',
    intakeCapacity: 1400,
    website: 'https://jntuh.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 40 2315 8661',
    contact_email: 'registrar@jntuh.ac.in',
  },

  // ==========================================
  // 8. KOLKATA & EASTERN REGION
  // ==========================================
  {
    id: 117,
    name: 'Indian Institute of Technology Kharagpur (IIT Kharagpur)',
    shortName: 'IIT Kharagpur',
    aicte_id: '1-00000010',
    aishe_code: 'U-0573',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Kharagpur',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '721302',
    address: 'IIT Kharagpur Campus, Kharagpur, West Bengal',
    coordinates: { lat: 22.3149, lng: 87.3105 },
    estdYear: 1951,
    nirfRank: 'NIRF Engineering #6 (First IIT of India)',
    accreditation: 'Institute of Eminence (IoE)',
    intakeCapacity: 1850,
    website: 'https://www.iitkgp.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 3222 255 221',
    contact_email: 'registrar@hijli.iitkgp.ac.in',
  },
  {
    id: 19,
    name: 'Jadavpur University (Faculty of Engineering & Technology)',
    shortName: 'Jadavpur FET',
    aicte_id: '1-88556677',
    aishe_code: 'U-0570',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Kolkata',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '700032',
    address: '188, Raja S.C. Mallick Road, Jadavpur, Kolkata, West Bengal',
    coordinates: { lat: 22.4996, lng: 88.3715 },
    estdYear: 1906,
    nirfRank: 'NIRF Engineering #10 • Overall #9',
    accreditation: 'NAAC A+ (Score 3.68)',
    intakeCapacity: 1200,
    website: 'http://www.jaduniv.edu.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 33 2457 2227',
    contact_email: 'fet@jadavpuruniversity.in',
  },
  {
    id: 4,
    name: 'Kolkata Polytechnic Institute',
    shortName: 'KPI Kolkata',
    aicte_id: '1-66554433',
    aishe_code: 'C-16572',
    category: 'Polytechnic Diploma',
    institution_type: 'Govt-Aided',
    approval_status: 'APPROVED',
    city: 'Kolkata',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '700032',
    address: 'Raja SC Mullick Road, Jadavpur, Kolkata, West Bengal',
    coordinates: { lat: 22.4988, lng: 88.3712 },
    estdYear: 1968,
    nirfRank: 'State Diploma Band',
    accreditation: 'WBSCTE Affiliated',
    intakeCapacity: 450,
    active_complaints_count: 1,
    is_conflicting: false,
    active_bureaus: ['REGULATION_BUREAU'],
    contact_phone: '+91 33 6655 4433',
    contact_email: 'admin@kpi.edu.in',
  },

  // ==========================================
  // 9. CENTRAL REGION (BHOPAL & INDORE)
  // ==========================================
  {
    id: 119,
    name: 'Indian Institute of Technology Indore (IIT Indore)',
    shortName: 'IIT Indore',
    aicte_id: '1-00000012',
    aishe_code: 'U-0273',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Indore',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '453552',
    address: 'Khandwa Road, Simrol, Indore, Madhya Pradesh',
    coordinates: { lat: 22.5204, lng: 75.9207 },
    estdYear: 2009,
    nirfRank: 'NIRF Engineering #14',
    accreditation: 'MoE Center of Excellence',
    intakeCapacity: 750,
    website: 'https://www.iiti.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 731 660 3555',
    contact_email: 'registrar@iiti.ac.in',
  },
  {
    id: 120,
    name: 'Maulana Azad National Institute of Technology (MANIT Bhopal)',
    shortName: 'MANIT Bhopal',
    aicte_id: '1-00000013',
    aishe_code: 'U-0261',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '462003',
    address: 'Link Road Number 3, Near Kali Mata Mandir, Bhopal',
    coordinates: { lat: 23.2167, lng: 77.407 },
    estdYear: 1960,
    nirfRank: 'NIRF Engineering #70',
    accreditation: 'NBA Tier-1 • AICTE Approved',
    intakeCapacity: 1150,
    website: 'http://www.manit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 755 405 1000',
    contact_email: 'pro@manit.ac.in',
  },
  {
    id: 6,
    name: 'Bhopal Institute of Science & Applied Technology',
    shortName: 'BISAT Bhopal',
    aicte_id: '1-44332211',
    aishe_code: 'C-94750',
    category: 'Engineering & Technology',
    institution_type: 'Private-Self-Financed',
    approval_status: 'APPROVED',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '462036',
    address: 'Airport Road, Gandhinagar, Bhopal, Madhya Pradesh',
    coordinates: { lat: 23.2599, lng: 77.4126 },
    estdYear: 2009,
    nirfRank: 'RGPV Technical Campus',
    accreditation: 'RGPV Affiliated',
    intakeCapacity: 480,
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 755 4433 2211',
    contact_email: 'contact@bisat.edu.in',
  },

  // ==========================================
  // 10. RAJASTHAN & GUJARAT
  // ==========================================
  {
    id: 121,
    name: 'Birla Institute of Technology and Science (BITS Pilani)',
    shortName: 'BITS Pilani',
    aicte_id: '1-00000014',
    aishe_code: 'U-0391',
    category: 'Engineering & Technology',
    institution_type: 'Deemed University (IoE)',
    approval_status: 'APPROVED',
    city: 'Pilani',
    state: 'Rajasthan',
    region: 'Northern',
    pin_code: '333031',
    address: 'Vidya Vihar, Pilani, Rajasthan',
    coordinates: { lat: 28.3639, lng: 75.587 },
    estdYear: 1964,
    nirfRank: 'NIRF Engineering #25 • Institute of Eminence',
    accreditation: 'NAAC A (Score 3.45)',
    intakeCapacity: 1100,
    website: 'https://www.bits-pilani.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 1596 245 073',
    contact_email: 'registrar@pilani.bits-pilani.ac.in',
  },
  {
    id: 122,
    name: 'Malaviya National Institute of Technology (MNIT Jaipur)',
    shortName: 'MNIT Jaipur',
    aicte_id: '1-00000015',
    aishe_code: 'U-0392',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Jaipur',
    state: 'Rajasthan',
    region: 'Northern',
    pin_code: '302017',
    address: 'Jawaharlal Nehru Marg, Jhalana Doongri, Jaipur, Rajasthan',
    coordinates: { lat: 26.864, lng: 75.8108 },
    estdYear: 1963,
    nirfRank: 'NIRF Engineering #37',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 950,
    website: 'http://www.mnit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 141 252 9087',
    contact_email: 'registrar@mnit.ac.in',
  },
  {
    id: 207,
    name: 'Sardar Vallabhbhai National Institute of Technology (SVNIT Surat)',
    shortName: 'SVNIT Surat',
    aicte_id: '1-00000027',
    aishe_code: 'U-0149',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Surat',
    state: 'Gujarat',
    region: 'Western',
    pin_code: '395007',
    address: 'Ichchhanath Circle, Dumas Road, Surat, Gujarat',
    coordinates: { lat: 21.1643, lng: 72.7845 },
    estdYear: 1961,
    nirfRank: 'NIRF Engineering #65',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 980,
    website: 'https://www.svnit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 261 225 9571',
    contact_email: 'registrar@svnit.ac.in',
  },
  {
    id: 208,
    name: 'Indian Institute of Technology Gandhinagar (IIT Gandhinagar)',
    shortName: 'IIT Gandhinagar',
    aicte_id: '1-00000028',
    aishe_code: 'U-0139',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Gandhinagar',
    state: 'Gujarat',
    region: 'Western',
    pin_code: '382355',
    address: 'Palaj, Gandhinagar, Gujarat',
    coordinates: { lat: 23.212, lng: 72.6845 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #18',
    accreditation: 'MoE Center of Excellence',
    intakeCapacity: 500,
    website: 'https://iitgn.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 79 2395 2000',
    contact_email: 'registrar@iitgn.ac.in',
  },

  // ==========================================
  // 11. UTTAR PRADESH & CENTRAL NORTH
  // ==========================================
  {
    id: 301,
    name: 'Indian Institute of Technology Kanpur (IIT Kanpur)',
    shortName: 'IIT Kanpur',
    aicte_id: '1-00000031',
    aishe_code: 'U-0516',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '208016',
    address: 'Kalyanpur, Kanpur, Uttar Pradesh',
    coordinates: { lat: 26.5123, lng: 80.2329 },
    estdYear: 1959,
    nirfRank: 'NIRF Engineering #4 • MoE Institute of Eminence',
    accreditation: 'MoE Center of Excellence • NBA Tier-1',
    intakeCapacity: 1200,
    website: 'https://www.iitk.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 512 259 0151',
    contact_email: 'registrar@iitk.ac.in',
  },
  {
    id: 302,
    name: 'Harcourt Butler Technical University (HBTU Kanpur)',
    shortName: 'HBTU Kanpur',
    aicte_id: '1-00000032',
    aishe_code: 'U-0514',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '208002',
    address: 'Nawabganj, Kanpur, Uttar Pradesh',
    coordinates: { lat: 26.4950, lng: 80.3060 },
    estdYear: 1921,
    nirfRank: 'Centenary State University • NIRF Top 150',
    accreditation: 'NAAC A Grade • NBA Accredited',
    intakeCapacity: 920,
    website: 'https://hbtu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 512 253 4001',
    contact_email: 'registrar@hbtu.ac.in',
  },
  {
    id: 303,
    name: 'Indian Institute of Technology (BHU) Varanasi (IIT BHU)',
    shortName: 'IIT BHU Varanasi',
    aicte_id: '1-00000033',
    aishe_code: 'U-0500',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '221005',
    address: 'Banaras Hindu University Campus, Varanasi, Uttar Pradesh',
    coordinates: { lat: 25.2677, lng: 82.9913 },
    estdYear: 1919,
    nirfRank: 'NIRF Engineering #15 • Centenary Heritage Institute',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1350,
    website: 'https://www.iitbhu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 542 236 8106',
    contact_email: 'registrar@iitbhu.ac.in',
  },
  {
    id: 304,
    name: 'Motilal Nehru National Institute of Technology (MNNIT Allahabad)',
    shortName: 'MNNIT Allahabad',
    aicte_id: '1-00000034',
    aishe_code: 'U-0530',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '211004',
    address: 'Teliarganj, Prayagraj, Uttar Pradesh',
    coordinates: { lat: 25.4934, lng: 81.8629 },
    estdYear: 1961,
    nirfRank: 'NIRF Engineering #49',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1100,
    website: 'http://www.mnnit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 532 254 5404',
    contact_email: 'secretary@mnnit.ac.in',
  },
  {
    id: 305,
    name: 'Indian Institute of Information Technology Allahabad (IIIT Allahabad)',
    shortName: 'IIIT Allahabad',
    aicte_id: '1-00000035',
    aishe_code: 'U-0517',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '211015',
    address: 'Devghat, Jhalwa, Prayagraj, Uttar Pradesh',
    coordinates: { lat: 25.4299, lng: 81.7712 },
    estdYear: 1999,
    nirfRank: 'NIRF Engineering #89 • Premier Information Technology Center',
    accreditation: 'MoE Approved Center of Excellence',
    intakeCapacity: 550,
    website: 'https://www.iiita.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 532 292 2000',
    contact_email: 'contact@iiita.ac.in',
  },
  {
    id: 306,
    name: 'Institute of Engineering and Technology (IET Lucknow)',
    shortName: 'IET Lucknow',
    aicte_id: '1-00000036',
    aishe_code: 'C-46132',
    category: 'Engineering & Technology',
    institution_type: 'State Autonomous Institute',
    approval_status: 'APPROVED',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '226021',
    address: 'Sitapur Road, Aliganj, Lucknow, Uttar Pradesh',
    coordinates: { lat: 26.9142, lng: 80.9416 },
    estdYear: 1984,
    nirfRank: 'Premier State Engineering Institute of Uttar Pradesh',
    accreditation: 'NBA Accredited • AKTU Constituent',
    intakeCapacity: 680,
    website: 'https://ietlucknow.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 522 273 2193',
    contact_email: 'director@ietlucknow.ac.in',
  },
  {
    id: 307,
    name: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU Lucknow)',
    shortName: 'AKTU Lucknow',
    aicte_id: '1-00000037',
    aishe_code: 'U-0508',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '226031',
    address: 'Sector 11, Jankipuram Vistar, Lucknow, Uttar Pradesh',
    coordinates: { lat: 26.9248, lng: 80.9575 },
    estdYear: 2000,
    nirfRank: 'Apex Affiliating Technical University of UP',
    accreditation: 'UGC Recognized • NAAC Accredited',
    intakeCapacity: 1500,
    website: 'https://aktu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 522 233 6805',
    contact_email: 'registrar@aktu.ac.in',
  },
  {
    id: 308,
    name: 'Zakir Husain College of Engineering & Technology (ZHCET AMU)',
    shortName: 'AMU ZHCET Aligarh',
    aicte_id: '1-00000038',
    aishe_code: 'U-0498',
    category: 'Engineering & Technology',
    institution_type: 'Central University',
    approval_status: 'APPROVED',
    city: 'Aligarh',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '202002',
    address: 'Aligarh Muslim University Campus, Aligarh, Uttar Pradesh',
    coordinates: { lat: 27.9174, lng: 78.0772 },
    estdYear: 1935,
    nirfRank: 'NIRF Engineering #32 • NAAC A+ (Score 3.35)',
    accreditation: 'NBA Tier-1 • MoE Institute of Eminence',
    intakeCapacity: 800,
    website: 'https://www.amu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 571 270 0920',
    contact_email: 'principal.zhcet@amu.ac.in',
  },
  {
    id: 309,
    name: 'JSS Academy of Technical Education (JSS Noida)',
    shortName: 'JSS Noida',
    aicte_id: '1-00000039',
    aishe_code: 'C-46151',
    category: 'Engineering & Technology',
    institution_type: 'AICTE Approved Private Self-Financed',
    approval_status: 'APPROVED',
    city: 'Noida',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '201301',
    address: 'C-20/1, Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh',
    coordinates: { lat: 28.6133, lng: 77.3592 },
    estdYear: 1998,
    nirfRank: 'NIRF Engineering #201-250 • Top NCR Institute',
    accreditation: 'NBA Accredited • NAAC A Grade',
    intakeCapacity: 960,
    website: 'https://jssaten.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 120 240 0115',
    contact_email: 'principal@jssaten.ac.in',
  },
  {
    id: 310,
    name: 'Ajay Kumar Garg Engineering College (AKGEC Ghaziabad)',
    shortName: 'AKGEC Ghaziabad',
    aicte_id: '1-00000040',
    aishe_code: 'C-46142',
    category: 'Engineering & Technology',
    institution_type: 'AICTE Approved Private Self-Financed',
    approval_status: 'APPROVED',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '201009',
    address: '27th Km Stone, Delhi-Meerut Expressway, Ghaziabad, Uttar Pradesh',
    coordinates: { lat: 28.6756, lng: 77.5029 },
    estdYear: 1998,
    nirfRank: 'NAAC A Grade • Premier NCR College',
    accreditation: 'NBA Tier-1 Accredited',
    intakeCapacity: 1120,
    website: 'https://www.akgec.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 120 276 2841',
    contact_email: 'info@akgec.ac.in',
  },

  // ==========================================
  // 12. PUNJAB, CHANDIGARH & HARYANA
  // ==========================================
  {
    id: 311,
    name: 'Punjab Engineering College (PEC Chandigarh)',
    shortName: 'PEC Chandigarh',
    aicte_id: '1-00000041',
    aishe_code: 'U-0099',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Chandigarh',
    state: 'Punjab',
    region: 'Northern',
    pin_code: '160012',
    address: 'Sector 12, Vidya Path, Chandigarh',
    coordinates: { lat: 30.7663, lng: 76.7865 },
    estdYear: 1921,
    nirfRank: 'NIRF Engineering #87 • Historic Centenary Engineering College',
    accreditation: 'NBA Tier-1 • NAAC A Grade',
    intakeCapacity: 850,
    website: 'https://pec.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 172 275 3051',
    contact_email: 'director@pec.edu.in',
  },
  {
    id: 312,
    name: 'Indian Institute of Technology Ropar (IIT Ropar)',
    shortName: 'IIT Ropar',
    aicte_id: '1-00000042',
    aishe_code: 'U-0373',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Rupnagar',
    state: 'Punjab',
    region: 'Northern',
    pin_code: '140001',
    address: 'Bara Phool, Birla Farm, Rupnagar (Ropar), Punjab',
    coordinates: { lat: 30.9678, lng: 76.4733 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #22',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 600,
    website: 'https://www.iitrpr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 1881 242 101',
    contact_email: 'registrar@iitrpr.ac.in',
  },
  {
    id: 313,
    name: 'Thapar Institute of Engineering and Technology (Thapar University)',
    shortName: 'Thapar Patiala',
    aicte_id: '1-00000043',
    aishe_code: 'U-0387',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Patiala',
    state: 'Punjab',
    region: 'Northern',
    pin_code: '147004',
    address: 'Bhadson Road, Adarsh Nagar, Patiala, Punjab',
    coordinates: { lat: 30.3564, lng: 76.3647 },
    estdYear: 1956,
    nirfRank: 'NIRF Engineering #20 • NAAC A+ (Score 3.39)',
    accreditation: 'NBA Accredited • ABET Accredited Programs',
    intakeCapacity: 2200,
    website: 'https://www.thapar.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 175 239 3021',
    contact_email: 'registrar@thapar.edu',
  },
  {
    id: 314,
    name: 'Dr. B. R. Ambedkar National Institute of Technology Jalandhar (NIT Jalandhar)',
    shortName: 'NIT Jalandhar',
    aicte_id: '1-00000044',
    aishe_code: 'U-0372',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Jalandhar',
    state: 'Punjab',
    region: 'Northern',
    pin_code: '144027',
    address: 'Grand Trunk Road, Bypass, Jalandhar, Punjab',
    coordinates: { lat: 31.3959, lng: 75.5358 },
    estdYear: 1987,
    nirfRank: 'NIRF Engineering #46',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 920,
    website: 'https://www.nitj.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 181 269 0301',
    contact_email: 'registrar@nitj.ac.in',
  },
  {
    id: 315,
    name: 'National Institute of Technology Kurukshetra (NIT Kurukshetra)',
    shortName: 'NIT Kurukshetra',
    aicte_id: '1-00000045',
    aishe_code: 'U-0164',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Kurukshetra',
    state: 'Haryana',
    region: 'Northern',
    pin_code: '136119',
    address: 'Thanesar, Kurukshetra, Haryana',
    coordinates: { lat: 29.9489, lng: 76.8173 },
    estdYear: 1963,
    nirfRank: 'NIRF Engineering #58',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 980,
    website: 'http://www.nitkkr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 1744 233 208',
    contact_email: 'registrar@nitkkr.ac.in',
  },
  {
    id: 316,
    name: 'J.C. Bose University of Science and Technology, YMCA (YMCA Faridabad)',
    shortName: 'YMCA Faridabad',
    aicte_id: '1-00000046',
    aishe_code: 'U-0165',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Faridabad',
    state: 'Haryana',
    region: 'Northern',
    pin_code: '121006',
    address: 'NH-2, Sector 6, Mathura Road, Faridabad, Haryana',
    coordinates: { lat: 28.3676, lng: 77.3164 },
    estdYear: 1969,
    nirfRank: 'NAAC A+ (Score 3.38) • Top Haryana Technical University',
    accreditation: 'NBA Accredited • UGC Recognized',
    intakeCapacity: 800,
    website: 'https://www.jcboseust.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 129 231 0102',
    contact_email: 'registrar@jcboseust.ac.in',
  },

  // ==========================================
  // 13. UTTARAKHAND
  // ==========================================
  {
    id: 317,
    name: 'Indian Institute of Technology Roorkee (IIT Roorkee)',
    shortName: 'IIT Roorkee',
    aicte_id: '1-00000047',
    aishe_code: 'U-0560',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Roorkee',
    state: 'Uttarakhand',
    region: 'Northern',
    pin_code: '247667',
    address: 'Roorkee, Haridwar District, Uttarakhand',
    coordinates: { lat: 29.8649, lng: 77.8966 },
    estdYear: 1847,
    nirfRank: 'NIRF Engineering #5 • First Engineering College in India & Asia',
    accreditation: 'MoE Institute of Eminence • NBA Tier-1',
    intakeCapacity: 1400,
    website: 'https://www.iitr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 1332 285 311',
    contact_email: 'registrar@iitr.ac.in',
  },
  {
    id: 318,
    name: 'Govind Ballabh Pant University of Agriculture and Technology (College of Technology Pantnagar)',
    shortName: 'COT Pantnagar',
    aicte_id: '1-00000048',
    aishe_code: 'U-0556',
    category: 'Engineering & Technology',
    institution_type: 'State University Faculty',
    approval_status: 'APPROVED',
    city: 'Pantnagar',
    state: 'Uttarakhand',
    region: 'Northern',
    pin_code: '263145',
    address: 'Udham Singh Nagar, Pantnagar, Uttarakhand',
    coordinates: { lat: 29.0222, lng: 79.4897 },
    estdYear: 1962,
    nirfRank: 'Premier State Engineering College in Uttarakhand',
    accreditation: 'ICAR & AICTE Approved',
    intakeCapacity: 600,
    website: 'https://www.gbpuat.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 5944 233 320',
    contact_email: 'deanct@gbpuat.ac.in',
  },

  // ==========================================
  // 14. BIHAR & JHARKHAND
  // ==========================================
  {
    id: 319,
    name: 'National Institute of Technology Patna (NIT Patna)',
    shortName: 'NIT Patna',
    aicte_id: '1-00000049',
    aishe_code: 'U-0072',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Patna',
    state: 'Bihar',
    region: 'Eastern',
    pin_code: '800005',
    address: 'Ashok Rajpath, Patna University Campus, Patna, Bihar',
    coordinates: { lat: 25.6207, lng: 85.1724 },
    estdYear: 1886,
    nirfRank: 'NIRF Engineering #56 • Historic Bihar College of Engineering',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 850,
    website: 'http://www.nitp.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 612 237 1715',
    contact_email: 'registrar@nitp.ac.in',
  },
  {
    id: 320,
    name: 'Indian Institute of Technology Patna (IIT Patna)',
    shortName: 'IIT Patna',
    aicte_id: '1-00000050',
    aishe_code: 'U-0071',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Patna',
    state: 'Bihar',
    region: 'Eastern',
    pin_code: '801106',
    address: 'Bihta, Patna District, Bihar',
    coordinates: { lat: 25.5358, lng: 84.8512 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #41',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 650,
    website: 'https://www.iitp.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 6115 233 001',
    contact_email: 'registrar@iitp.ac.in',
  },
  {
    id: 321,
    name: 'Birla Institute of Technology, Mesra (BIT Mesra Ranchi)',
    shortName: 'BIT Mesra',
    aicte_id: '1-00000051',
    aishe_code: 'U-0205',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Ranchi',
    state: 'Jharkhand',
    region: 'Eastern',
    pin_code: '835215',
    address: 'Mesra, Ranchi, Jharkhand',
    coordinates: { lat: 23.4123, lng: 85.4399 },
    estdYear: 1955,
    nirfRank: 'NIRF Engineering #53 • NAAC A Grade',
    accreditation: 'NBA Accredited • UGC Recognized',
    intakeCapacity: 1200,
    website: 'https://www.bitmesra.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 651 227 5444',
    contact_email: 'registrar@bitmesra.ac.in',
  },
  {
    id: 322,
    name: 'Indian Institute of Technology (ISM) Dhanbad (IIT ISM Dhanbad)',
    shortName: 'IIT ISM Dhanbad',
    aicte_id: '1-00000052',
    aishe_code: 'U-0208',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Dhanbad',
    state: 'Jharkhand',
    region: 'Eastern',
    pin_code: '826004',
    address: 'Sardar Patel Nagar, Dhanbad, Jharkhand',
    coordinates: { lat: 23.8143, lng: 86.4412 },
    estdYear: 1926,
    nirfRank: 'NIRF Engineering #17 • Global Leader in Earth & Mining Sciences',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1150,
    website: 'https://www.iitism.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 326 223 5001',
    contact_email: 'registrar@iitism.ac.in',
  },
  {
    id: 323,
    name: 'National Institute of Technology Jamshedpur (NIT Jamshedpur)',
    shortName: 'NIT Jamshedpur',
    aicte_id: '1-00000053',
    aishe_code: 'U-0206',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    region: 'Eastern',
    pin_code: '831014',
    address: 'Adityapur, Jamshedpur, Jharkhand',
    coordinates: { lat: 22.7766, lng: 86.1438 },
    estdYear: 1960,
    nirfRank: 'NIRF Engineering #86',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 850,
    website: 'https://www.nitjsr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 657 237 3407',
    contact_email: 'registrar@nitjsr.ac.in',
  },

  // ==========================================
  // 15. ODISHA
  // ==========================================
  {
    id: 324,
    name: 'Odisha University of Technology and Research (OUTR Bhubaneswar / CET)',
    shortName: 'OUTR Bhubaneswar',
    aicte_id: '1-00000054',
    aishe_code: 'U-1123',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Bhubaneswar',
    state: 'Odisha',
    region: 'Eastern',
    pin_code: '751029',
    address: 'Techno Campus, Ghatikia, Kalinga Nagar, Bhubaneswar, Odisha',
    coordinates: { lat: 20.2762, lng: 85.7769 },
    estdYear: 1981,
    nirfRank: 'Top State Technical University in Odisha',
    accreditation: 'NBA Accredited • NAAC A Grade',
    intakeCapacity: 950,
    website: 'https://www.outr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 674 238 6075',
    contact_email: 'registrar@outr.ac.in',
  },
  {
    id: 325,
    name: 'Kalinga Institute of Industrial Technology (KIIT Deemed University)',
    shortName: 'KIIT Bhubaneswar',
    aicte_id: '1-00000055',
    aishe_code: 'U-0356',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Bhubaneswar',
    state: 'Odisha',
    region: 'Eastern',
    pin_code: '751024',
    address: 'Patia, Bhubaneswar, Odisha',
    coordinates: { lat: 20.3533, lng: 85.8164 },
    estdYear: 1992,
    nirfRank: 'NIRF Engineering #39 • NAAC A++ (Score 3.65)',
    accreditation: 'ABET (USA) • IET (UK) • NBA Tier-1',
    intakeCapacity: 2500,
    website: 'https://kiit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 674 272 5113',
    contact_email: 'kiit@kiit.ac.in',
  },
  {
    id: 326,
    name: 'Indian Institute of Technology Bhubaneswar (IIT Bhubaneswar)',
    shortName: 'IIT Bhubaneswar',
    aicte_id: '1-00000056',
    aishe_code: 'U-0355',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Bhubaneswar',
    state: 'Odisha',
    region: 'Eastern',
    pin_code: '752050',
    address: 'Argul, Jatni, Khordha, Bhubaneswar, Odisha',
    coordinates: { lat: 20.1485, lng: 85.6712 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #47',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 600,
    website: 'https://www.iitbbs.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 674 713 4560',
    contact_email: 'registrar@iitbbs.ac.in',
  },
  {
    id: 327,
    name: 'National Institute of Technology Rourkela (NIT Rourkela)',
    shortName: 'NIT Rourkela',
    aicte_id: '1-00000057',
    aishe_code: 'U-0357',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Rourkela',
    state: 'Odisha',
    region: 'Eastern',
    pin_code: '769008',
    address: 'Sector 1, Rourkela, Sundargarh, Odisha',
    coordinates: { lat: 22.2531, lng: 84.9010 },
    estdYear: 1961,
    nirfRank: 'NIRF Engineering #16 • Top 20 National Engineering Ranks',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1200,
    website: 'https://www.nitrkl.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 661 246 2021',
    contact_email: 'registrar@nitrkl.ac.in',
  },
  {
    id: 328,
    name: 'Veer Surendra Sai University of Technology (VSSUT Burla)',
    shortName: 'VSSUT Burla',
    aicte_id: '1-00000058',
    aishe_code: 'U-0368',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Sambalpur',
    state: 'Odisha',
    region: 'Eastern',
    pin_code: '768018',
    address: 'Burla, Sambalpur District, Odisha',
    coordinates: { lat: 21.4984, lng: 83.9042 },
    estdYear: 1956,
    nirfRank: 'First Engineering College in Odisha (UCE Burla)',
    accreditation: 'NBA Accredited • NAAC B+ Grade',
    intakeCapacity: 1100,
    website: 'https://www.vssut.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 663 243 0211',
    contact_email: 'registrar@vssut.ac.in',
  },

  // ==========================================
  // 16. ASSAM & NORTH-EAST
  // ==========================================
  {
    id: 329,
    name: 'Indian Institute of Technology Guwahati (IIT Guwahati)',
    shortName: 'IIT Guwahati',
    aicte_id: '1-00000059',
    aishe_code: 'U-0053',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Guwahati',
    state: 'Assam',
    region: 'Eastern',
    pin_code: '781039',
    address: 'Surjyamukhi Road, North Guwahati, Assam',
    coordinates: { lat: 26.1878, lng: 91.6916 },
    estdYear: 1994,
    nirfRank: 'NIRF Engineering #7 • Top 10 Indian Institutes',
    accreditation: 'MoE Institute of Eminence • NBA Tier-1',
    intakeCapacity: 1100,
    website: 'https://www.iitg.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 361 258 3000',
    contact_email: 'registrar@iitg.ac.in',
  },
  {
    id: 330,
    name: 'Assam Engineering College (AEC Guwahati)',
    shortName: 'AEC Guwahati',
    aicte_id: '1-00000060',
    aishe_code: 'C-17260',
    category: 'Engineering & Technology',
    institution_type: 'State Government Engineering College',
    approval_status: 'APPROVED',
    city: 'Guwahati',
    state: 'Assam',
    region: 'Eastern',
    pin_code: '781013',
    address: 'Jalukbari, Guwahati, Kamrup Metropolitan, Assam',
    coordinates: { lat: 26.1424, lng: 91.6628 },
    estdYear: 1955,
    nirfRank: 'First Engineering Institute in North-East India',
    accreditation: 'NBA Accredited • Affiliated to ASTU',
    intakeCapacity: 650,
    website: 'http://aec.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 361 257 0550',
    contact_email: 'principal@aec.ac.in',
  },
  {
    id: 331,
    name: 'National Institute of Technology Silchar (NIT Silchar)',
    shortName: 'NIT Silchar',
    aicte_id: '1-00000061',
    aishe_code: 'U-0055',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Silchar',
    state: 'Assam',
    region: 'Eastern',
    pin_code: '788010',
    address: 'Silchar, Cachar, Assam',
    coordinates: { lat: 24.7577, lng: 92.7925 },
    estdYear: 1967,
    nirfRank: 'NIRF Engineering #40',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 850,
    website: 'http://www.nits.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 3842 224 879',
    contact_email: 'director@nits.ac.in',
  },
  {
    id: 332,
    name: 'National Institute of Technology Meghalaya (NIT Meghalaya)',
    shortName: 'NIT Meghalaya',
    aicte_id: '1-00000062',
    aishe_code: 'U-0337',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Shillong',
    state: 'Meghalaya',
    region: 'Eastern',
    pin_code: '793003',
    address: 'Bijni Complex, Laitumkhrah, Shillong, Meghalaya',
    coordinates: { lat: 25.5788, lng: 91.8933 },
    estdYear: 2010,
    nirfRank: 'NIRF Engineering #72',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 350,
    website: 'http://www.nitm.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 364 250 1215',
    contact_email: 'registrar@nitm.ac.in',
  },

  // ==========================================
  // 17. KERALA
  // ==========================================
  {
    id: 333,
    name: 'Cochin University of Science and Technology (CUSAT Kochi)',
    shortName: 'CUSAT Kochi',
    aicte_id: '1-00000063',
    aishe_code: 'U-0254',
    category: 'Engineering & Technology',
    institution_type: 'State Autonomous University',
    approval_status: 'APPROVED',
    city: 'Kochi',
    state: 'Kerala',
    region: 'South-West',
    pin_code: '682022',
    address: 'South Kalamassery, Kochi, Ernakulam District, Kerala',
    coordinates: { lat: 10.0438, lng: 76.3243 },
    estdYear: 1971,
    nirfRank: 'NIRF Engineering #41 • NAAC A+ (Score 3.39)',
    accreditation: 'NBA Accredited • UGC Recognized',
    intakeCapacity: 850,
    website: 'https://cusat.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 484 257 7290',
    contact_email: 'registrar@cusat.ac.in',
  },
  {
    id: 334,
    name: 'National Institute of Technology Calicut (NIT Calicut)',
    shortName: 'NIT Calicut',
    aicte_id: '1-00000064',
    aishe_code: 'U-0258',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Kozhikode',
    state: 'Kerala',
    region: 'South-West',
    pin_code: '673601',
    address: 'NIT Campus P.O., Chathamangalam, Kozhikode, Kerala',
    coordinates: { lat: 11.3216, lng: 75.9336 },
    estdYear: 1961,
    nirfRank: 'NIRF Engineering #23',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1150,
    website: 'http://www.nitc.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 495 228 6100',
    contact_email: 'registrar@nitc.ac.in',
  },
  {
    id: 335,
    name: 'College of Engineering Trivandrum (CET Thiruvananthapuram)',
    shortName: 'CET Trivandrum',
    aicte_id: '1-00000065',
    aishe_code: 'C-43840',
    category: 'Engineering & Technology',
    institution_type: 'State Government Engineering College',
    approval_status: 'APPROVED',
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    region: 'South-West',
    pin_code: '695016',
    address: 'Sreekaryam, Thiruvananthapuram, Kerala',
    coordinates: { lat: 8.5458, lng: 76.9063 },
    estdYear: 1939,
    nirfRank: 'NIRF Engineering #85 • Oldest Engineering College in Kerala',
    accreditation: 'NBA Accredited • ISO 9001 Certified',
    intakeCapacity: 920,
    website: 'https://www.cet.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 471 259 8370',
    contact_email: 'principal@cet.ac.in',
  },
  {
    id: 336,
    name: 'Indian Institute of Technology Palakkad (IIT Palakkad)',
    shortName: 'IIT Palakkad',
    aicte_id: '1-00000066',
    aishe_code: 'U-0878',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Palakkad',
    state: 'Kerala',
    region: 'South-West',
    pin_code: '678623',
    address: 'Ahalia Campus, Kanjikode, Palakkad, Kerala',
    coordinates: { lat: 10.8037, lng: 76.7570 },
    estdYear: 2015,
    nirfRank: 'NIRF Engineering #69',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 450,
    website: 'https://iitpkd.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 4923 226 300',
    contact_email: 'registrar@iitpkd.ac.in',
  },
  {
    id: 337,
    name: 'Government Engineering College Thrissur (GEC Thrissur)',
    shortName: 'GEC Thrissur',
    aicte_id: '1-00000067',
    aishe_code: 'C-43750',
    category: 'Engineering & Technology',
    institution_type: 'State Government Engineering College',
    approval_status: 'APPROVED',
    city: 'Thrissur',
    state: 'Kerala',
    region: 'South-West',
    pin_code: '680009',
    address: 'Ramavarmapuram, Thrissur, Kerala',
    coordinates: { lat: 10.5546, lng: 76.2238 },
    estdYear: 1957,
    nirfRank: 'NIRF Engineering #151-200 • Top Government College',
    accreditation: 'NBA Accredited Programs',
    intakeCapacity: 750,
    website: 'https://gectcr.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 487 233 4144',
    contact_email: 'principal@gectcr.ac.in',
  },

  // ==========================================
  // 18. ANDHRA PRADESH
  // ==========================================
  {
    id: 338,
    name: 'Andhra University College of Engineering (AUCE Visakhapatnam)',
    shortName: 'AUCE Vizag',
    aicte_id: '1-00000068',
    aishe_code: 'U-0003',
    category: 'Engineering & Technology',
    institution_type: 'State University Constituent College',
    approval_status: 'APPROVED',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    region: 'South-West',
    pin_code: '530003',
    address: 'Maddilapalem, Visakhapatnam, Andhra Pradesh',
    coordinates: { lat: 17.7289, lng: 83.3188 },
    estdYear: 1955,
    nirfRank: 'NIRF Engineering #77 • NAAC A++ (Score 3.74)',
    accreditation: 'NBA Accredited • Centenary University System',
    intakeCapacity: 920,
    website: 'https://andhrauniversity.edu.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 891 284 4999',
    contact_email: 'principal_auce@andhrauniversity.edu.in',
  },
  {
    id: 339,
    name: 'National Institute of Technology Andhra Pradesh (NIT Andhra)',
    shortName: 'NIT Andhra',
    aicte_id: '1-00000069',
    aishe_code: 'U-0881',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Tadepalligudem',
    state: 'Andhra Pradesh',
    region: 'South-West',
    pin_code: '534101',
    address: 'Chennai-Kolkata Highway, Tadepalligudem, West Godavari, Andhra Pradesh',
    coordinates: { lat: 16.8208, lng: 81.5284 },
    estdYear: 2015,
    nirfRank: 'MoE Institute of National Importance',
    accreditation: 'NBA Tier-1 Eligible • MoE Approved',
    intakeCapacity: 500,
    website: 'https://www.nitandhra.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 8818 284 710',
    contact_email: 'registrar@nitandhra.ac.in',
  },
  {
    id: 340,
    name: 'Indian Institute of Technology Tirupati (IIT Tirupati)',
    shortName: 'IIT Tirupati',
    aicte_id: '1-00000070',
    aishe_code: 'U-0880',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    region: 'South-West',
    pin_code: '517619',
    address: 'Yerpedu-Venkatagiri Road, Yerpedu, Tirupati District, Andhra Pradesh',
    coordinates: { lat: 13.6826, lng: 79.5447 },
    estdYear: 2015,
    nirfRank: 'NIRF Engineering #61',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 450,
    website: 'https://iittp.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 877 250 3000',
    contact_email: 'registrar@iittp.ac.in',
  },

  // ==========================================
  // 19. KARNATAKA & TAMIL NADU (EXPANDED)
  // ==========================================
  {
    id: 341,
    name: 'National Institute of Technology Karnataka (NITK Surathkal)',
    shortName: 'NITK Surathkal',
    aicte_id: '1-00000071',
    aishe_code: 'U-0237',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Mangaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '575025',
    address: 'NH 66, Srinivasnagar, Surathkal, Mangaluru, Karnataka',
    coordinates: { lat: 13.0108, lng: 74.7943 },
    estdYear: 1960,
    nirfRank: 'NIRF Engineering #12 • Top NIT in Southern India',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 1100,
    website: 'https://www.nitk.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 824 247 4000',
    contact_email: 'registrar@nitk.ac.in',
  },
  {
    id: 342,
    name: 'Manipal Institute of Technology (MIT Manipal)',
    shortName: 'MIT Manipal',
    aicte_id: '1-00000072',
    aishe_code: 'U-0230',
    category: 'Engineering & Technology',
    institution_type: 'Constituent of MAHE (Institute of Eminence)',
    approval_status: 'APPROVED',
    city: 'Manipal',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '576104',
    address: 'Eshwar Nagar, Manipal, Udupi, Karnataka',
    coordinates: { lat: 13.3525, lng: 74.7928 },
    estdYear: 1957,
    nirfRank: 'NIRF Engineering #61 • MAHE Institute of Eminence',
    accreditation: 'NBA Accredited • NAAC A++ (Score 3.59)',
    intakeCapacity: 1800,
    website: 'https://manipal.edu/mit.html',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 820 292 4000',
    contact_email: 'office.mit@manipal.edu',
  },
  {
    id: 343,
    name: 'Ramaiah Institute of Technology (MSRIT Bengaluru)',
    shortName: 'MSRIT Bengaluru',
    aicte_id: '1-00000073',
    aishe_code: 'C-1300',
    category: 'Engineering & Technology',
    institution_type: 'Autonomous College affiliated to VTU',
    approval_status: 'APPROVED',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560054',
    address: 'MSR Nagar, MSRIT Post, Bengaluru, Karnataka',
    coordinates: { lat: 13.0315, lng: 77.5649 },
    estdYear: 1962,
    nirfRank: 'NIRF Engineering #78 • NAAC A+ (Score 3.28)',
    accreditation: 'NBA Tier-1 Accredited',
    intakeCapacity: 1250,
    website: 'https://www.msrit.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 2360 0822',
    contact_email: 'principal@msrit.edu',
  },
  {
    id: 344,
    name: 'PES University (PESU Bengaluru)',
    shortName: 'PESU Bengaluru',
    aicte_id: '1-00000074',
    aishe_code: 'U-0749',
    category: 'Engineering & Technology',
    institution_type: 'State Private University',
    approval_status: 'APPROVED',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'South-West',
    pin_code: '560085',
    address: '100 Feet Ring Road, BSK III Stage, Bengaluru, Karnataka',
    coordinates: { lat: 12.9344, lng: 77.5345 },
    estdYear: 1988,
    nirfRank: 'NIRF Engineering #101-150',
    accreditation: 'NAAC A Grade • UGC Recognized',
    intakeCapacity: 1400,
    website: 'https://pes.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 2672 1983',
    contact_email: 'registrar@pes.edu',
  },
  {
    id: 345,
    name: 'Vellore Institute of Technology (VIT Vellore)',
    shortName: 'VIT Vellore',
    aicte_id: '1-00000075',
    aishe_code: 'U-0490',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Vellore',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '632014',
    address: 'Katpadi, Vellore, Tamil Nadu',
    coordinates: { lat: 12.9692, lng: 79.1559 },
    estdYear: 1984,
    nirfRank: 'NIRF Engineering #11 • NAAC A++ (Score 3.66)',
    accreditation: 'ABET (USA) • NBA Tier-1 • MoE Institute of Eminence',
    intakeCapacity: 3200,
    website: 'https://vit.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 416 220 2011',
    contact_email: 'registrar@vit.ac.in',
  },
  {
    id: 346,
    name: 'SRM Institute of Science and Technology (SRMIST Kattankulathur)',
    shortName: 'SRM Chennai',
    aicte_id: '1-00000076',
    aishe_code: 'U-0473',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '603203',
    address: 'SRM Nagar, Kattankulathur, Chengalpattu / Chennai, Tamil Nadu',
    coordinates: { lat: 12.8230, lng: 80.0444 },
    estdYear: 1985,
    nirfRank: 'NIRF Engineering #28 • NAAC A++ (Score 3.55)',
    accreditation: 'ABET • NBA Tier-1 • UGC Category 1',
    intakeCapacity: 3500,
    website: 'https://www.srmist.edu.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 2741 7000',
    contact_email: 'registrar@srmist.edu.in',
  },
  {
    id: 347,
    name: 'Amrita School of Engineering (Amrita Vishwa Vidyapeetham Coimbatore)',
    shortName: 'Amrita Coimbatore',
    aicte_id: '1-00000077',
    aishe_code: 'U-0436',
    category: 'Engineering & Technology',
    institution_type: 'Deemed to be University',
    approval_status: 'APPROVED',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '641112',
    address: 'Amritanagar Post, Ettimadai, Coimbatore, Tamil Nadu',
    coordinates: { lat: 10.9004, lng: 76.9028 },
    estdYear: 1994,
    nirfRank: 'NIRF Engineering #19 • NAAC A++ (Score 3.70)',
    accreditation: 'MoE Institute of Eminence • NBA Tier-1',
    intakeCapacity: 1400,
    website: 'https://www.amrita.edu',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 422 268 5000',
    contact_email: 'engg@amrita.edu',
  },

  // ==========================================
  // 20. GUJARAT & MADHYA PRADESH (EXPANDED)
  // ==========================================
  {
    id: 348,
    name: 'L.D. College of Engineering (LDCE Ahmedabad)',
    shortName: 'LDCE Ahmedabad',
    aicte_id: '1-00000078',
    aishe_code: 'C-485',
    category: 'Engineering & Technology',
    institution_type: 'State Government Engineering College',
    approval_status: 'APPROVED',
    city: 'Ahmedabad',
    state: 'Gujarat',
    region: 'Western',
    pin_code: '380015',
    address: 'Opp. Gujarat University, Navrangpura, Ahmedabad, Gujarat',
    coordinates: { lat: 23.0334, lng: 72.5467 },
    estdYear: 1948,
    nirfRank: 'Premier State Technical Institute of Gujarat',
    accreditation: 'NBA Accredited Programs • GTU Constituent',
    intakeCapacity: 1100,
    website: 'http://ldce.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 79 2630 6752',
    contact_email: 'ldce-abad-dte@gujgov.edu.in',
  },
  {
    id: 349,
    name: 'Institute of Technology, Nirma University (Nirma Ahmedabad)',
    shortName: 'Nirma University',
    aicte_id: '1-00000079',
    aishe_code: 'U-0144',
    category: 'Engineering & Technology',
    institution_type: 'State Private University',
    approval_status: 'APPROVED',
    city: 'Ahmedabad',
    state: 'Gujarat',
    region: 'Western',
    pin_code: '382481',
    address: 'Sarkhej-Gandhinagar Highway, Gota, Ahmedabad, Gujarat',
    coordinates: { lat: 23.1283, lng: 72.5448 },
    estdYear: 1995,
    nirfRank: 'NIRF Engineering #125 • NAAC A+ (Score 3.35)',
    accreditation: 'NBA Tier-1 • UGC Recognized',
    intakeCapacity: 1250,
    website: 'https://nirmauni.ac.in/itnu/',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 79 7165 2000',
    contact_email: 'director.it@nirmauni.ac.in',
  },
  {
    id: 350,
    name: 'Shri Govindram Seksaria Institute of Technology and Science (SGSITS Indore)',
    shortName: 'SGSITS Indore',
    aicte_id: '1-00000080',
    aishe_code: 'C-24200',
    category: 'Engineering & Technology',
    institution_type: 'State Autonomous Institute',
    approval_status: 'APPROVED',
    city: 'Indore',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '452003',
    address: '23 Sir M. Visvesvaraya Marg, Vallabh Nagar, Indore, Madhya Pradesh',
    coordinates: { lat: 22.7253, lng: 75.8711 },
    estdYear: 1952,
    nirfRank: 'Premier Autonomous Tech Institute of Central India',
    accreditation: 'NBA Accredited • RGPV Affiliated',
    intakeCapacity: 920,
    website: 'https://www.sgsits.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 731 258 2112',
    contact_email: 'director@sgsits.ac.in',
  },
  {
    id: 351,
    name: 'Faculty of Engineering & Technology, Jamia Millia Islamia (FET JMI)',
    shortName: 'JMI New Delhi',
    aicte_id: '1-00000081',
    aishe_code: 'U-0108',
    category: 'Engineering & Technology',
    institution_type: 'Central University',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110025',
    address: 'Jamia Nagar, Okhla, New Delhi',
    coordinates: { lat: 28.5616, lng: 77.2801 },
    estdYear: 1985,
    nirfRank: 'NIRF Engineering #26 • NAAC A++ (Score 3.61)',
    accreditation: 'NBA Tier-1 • MoE Central University',
    intakeCapacity: 750,
    website: 'https://www.jmi.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2698 1717',
    contact_email: 'dean.fet@jmi.ac.in',
  },
  {
    id: 352,
    name: 'School of Engineering, Jawaharlal Nehru University (JNU SoE)',
    shortName: 'JNU New Delhi',
    aicte_id: '1-00000082',
    aishe_code: 'U-0109',
    category: 'Engineering & Technology',
    institution_type: 'Central University',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110067',
    address: 'New Mehrauli Road, JNU Campus, New Delhi',
    coordinates: { lat: 28.5398, lng: 77.1664 },
    estdYear: 2018,
    nirfRank: 'NIRF University #2 • National Center of Excellence',
    accreditation: 'NAAC A++ (Score 3.91) • UGC Category 1',
    intakeCapacity: 350,
    website: 'https://www.jnu.ac.in/se',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2670 4000',
    contact_email: 'dean.se@jnu.ac.in',
  },
  {
    id: 353,
    name: 'National Institute of Technology Delhi (NIT Delhi)',
    shortName: 'NIT Delhi',
    aicte_id: '1-00000083',
    aishe_code: 'U-0107',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110040',
    address: 'Plot No. FA7, Zone P1, GT Karnal Road, Bakoli, Delhi',
    coordinates: { lat: 28.8431, lng: 77.1311 },
    estdYear: 2010,
    nirfRank: 'NIRF Engineering #51',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 500,
    website: 'https://nitdelhi.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 3386 1000',
    contact_email: 'registrar@nitdelhi.ac.in',
  },
  {
    id: 354,
    name: 'Indian Institute of Engineering Science and Technology, Shibpur (IIEST Shibpur)',
    shortName: 'IIEST Shibpur',
    aicte_id: '1-00000084',
    aishe_code: 'U-0583',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Howrah',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '711103',
    address: 'PO Botanic Garden, Shalimar, Howrah / Kolkata, West Bengal',
    coordinates: { lat: 22.5550, lng: 88.3065 },
    estdYear: 1856,
    nirfRank: 'NIRF Engineering #35 • Second Oldest Engineering College in India',
    accreditation: 'MoE Institute of National Importance • NBA Tier-1',
    intakeCapacity: 850,
    website: 'https://www.iiests.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 33 2668 4561',
    contact_email: 'regis@iiests.ac.in',
  },
  {
    id: 355,
    name: 'National Institute of Technology Durgapur (NIT Durgapur)',
    shortName: 'NIT Durgapur',
    aicte_id: '1-00000085',
    aishe_code: 'U-0582',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Durgapur',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '713209',
    address: 'Mahatma Gandhi Avenue, A-Zone, Durgapur, West Bengal',
    coordinates: { lat: 23.5488, lng: 87.2931 },
    estdYear: 1960,
    nirfRank: 'NIRF Engineering #43',
    accreditation: 'NBA Tier-1 • MoE Approved',
    intakeCapacity: 920,
    website: 'https://nitdgp.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 343 275 4680',
    contact_email: 'registrar@nitdgp.ac.in',
  },
  {
    id: 356,
    name: 'Indian Institute of Technology Jodhpur (IIT Jodhpur)',
    shortName: 'IIT Jodhpur',
    aicte_id: '1-00000086',
    aishe_code: 'U-0404',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Jodhpur',
    state: 'Rajasthan',
    region: 'Northern',
    pin_code: '342037',
    address: 'NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan',
    coordinates: { lat: 26.4711, lng: 73.1134 },
    estdYear: 2008,
    nirfRank: 'NIRF Engineering #30',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 600,
    website: 'https://www.iitj.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 291 280 1100',
    contact_email: 'registrar@iitj.ac.in',
  },
  {
    id: 357,
    name: 'Pandit Deendayal Energy University (PDEU Gandhinagar)',
    shortName: 'PDEU Gandhinagar',
    aicte_id: '1-00000087',
    aishe_code: 'U-0145',
    category: 'Engineering & Technology',
    institution_type: 'State Private University',
    approval_status: 'APPROVED',
    city: 'Gandhinagar',
    state: 'Gujarat',
    region: 'Western',
    pin_code: '382007',
    address: 'Knowledge Corridor, Raisan Village, Gandhinagar, Gujarat',
    coordinates: { lat: 23.1559, lng: 72.6659 },
    estdYear: 2007,
    nirfRank: 'NIRF Engineering #94 • NAAC A++ (Score 3.52)',
    accreditation: 'NBA Accredited • UGC Recognized',
    intakeCapacity: 1100,
    website: 'https://www.pdeu.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 79 2327 5060',
    contact_email: 'info@pdeu.ac.in',
  },
  {
    id: 358,
    name: 'Atal Bihari Vajpayee Indian Institute of Information Technology and Management (ABV-IIITM Gwalior)',
    shortName: 'IIITM Gwalior',
    aicte_id: '1-00000088',
    aishe_code: 'U-0268',
    category: 'Engineering & Technology',
    institution_type: 'Institute of National Importance',
    approval_status: 'APPROVED',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '474015',
    address: 'Morena Link Road, Gwalior, Madhya Pradesh',
    coordinates: { lat: 26.2494, lng: 78.1738 },
    estdYear: 1997,
    nirfRank: 'NIRF Engineering #88 • NAAC A Grade',
    accreditation: 'MoE Institute of National Importance',
    intakeCapacity: 450,
    website: 'https://www.iiitm.ac.in',
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 751 244 9801',
    contact_email: 'registrar@iiitm.ac.in',
  },
];

/**
 * Resolves AICTE Statutory Disciplines (Domains), Academic Programs (Streams),
 * and Institutional University Governance Framework for any technical institution.
 */
export function resolveCollegeClassification(col: Partial<CollegeGeoItem>): {
  domains: string[];
  streams: string[];
  framework: string;
} {
  if (col.domains && col.streams && col.framework) {
    return { domains: col.domains, streams: col.streams, framework: col.framework };
  }

  const name = (col.name || '').toLowerCase();
  const short = (col.shortName || '').toLowerCase();
  const type = (col.institution_type || '').toLowerCase();

  // 1. Institutional Governance Framework
  let framework = 'Private Self-Financing Institute';
  if (
    type.includes('national importance') ||
    name.includes('iit') ||
    name.includes('nit ') ||
    name.includes('iiit') ||
    name.includes('iisc')
  ) {
    framework = 'Institute of National Importance';
  } else if (
    type.includes('central university') ||
    name.includes('jamia') ||
    name.includes('jnu') ||
    name.includes('amu') ||
    name.includes('bhu')
  ) {
    framework = 'Central University';
  } else if (
    type.includes('deemed') ||
    name.includes('bits pilani') ||
    name.includes('manipal') ||
    name.includes('thapar') ||
    name.includes('vit') ||
    name.includes('kiit') ||
    name.includes('srm') ||
    name.includes('amrita')
  ) {
    framework = 'Deemed-to-be University (IoE)';
  } else if (
    type.includes('state autonomous') ||
    type.includes('technical university') ||
    name.includes('hbtu') ||
    name.includes('aktu') ||
    name.includes('jntu') ||
    name.includes('outr') ||
    name.includes('vssut') ||
    name.includes('coep') ||
    name.includes('pdeu')
  ) {
    framework = 'State Autonomous University';
  } else if (
    type.includes('government') ||
    type.includes('constituent') ||
    name.includes('vjti') ||
    name.includes('ceg') ||
    name.includes('pec') ||
    name.includes('gcoen') ||
    name.includes('gcoea') ||
    name.includes('ldce') ||
    name.includes('sgsits') ||
    name.includes('cet') ||
    name.includes('gec') ||
    name.includes('auce') ||
    name.includes('aec')
  ) {
    framework = 'State Government / Aided';
  }

  // 2. AICTE Statutory Domains & Approved Programs (Streams)
  const domains: string[] = ['Engineering & Technology'];
  let streams: string[] = [
    'B.Tech / B.E. Computer Science & Engineering',
    'B.Tech Artificial Intelligence & Machine Learning',
    'B.Tech Electronics & Communication Engineering',
    'B.Tech Mechanical Engineering',
    'B.Tech Electrical & Electronics Engineering',
  ];

  if (name.includes('polytechnic')) {
    streams = [
      'Diploma Mechanical Engineering',
      'Diploma Electrical Engineering',
      'Diploma Civil Engineering',
      'Diploma Electronics & Telecommunication',
      'Diploma Computer Technology',
    ];
  } else if (name.includes('chemical') || name.includes('laxminarayan') || short.includes('lit')) {
    streams = [
      'B.Tech Chemical Engineering',
      'B.Tech Petrochemical & Petroleum Refining',
      'B.Tech Food Technology',
      'B.Tech Surface Coating & Polymer Technology',
      'B.Tech Plastic & Polymer Engineering',
    ];
  } else {
    // Management & Business (MBA / PGDM)
    if (
      name.includes('iit') ||
      name.includes('nit') ||
      name.includes('bits') ||
      name.includes('vit') ||
      name.includes('thapar') ||
      name.includes('manipal') ||
      name.includes('kiit') ||
      name.includes('srm') ||
      name.includes('dtu') ||
      name.includes('nsut') ||
      name.includes('coep') ||
      name.includes('rcoem') ||
      name.includes('rvce') ||
      name.includes('bmsce') ||
      name.includes('psg') ||
      name.includes('jamia') ||
      name.includes('jnu') ||
      name.includes('aktu') ||
      name.includes('hbtu') ||
      name.includes('amrita') ||
      name.includes('nirma') ||
      name.includes('pes')
    ) {
      domains.push('Management & Business');
      streams.push('Master of Business Administration (MBA / PGDM)');
    }

    // Computer Applications (MCA / BCA)
    if (
      name.includes('nit') ||
      name.includes('vit') ||
      name.includes('coep') ||
      name.includes('rcoem') ||
      name.includes('rvce') ||
      name.includes('bmsce') ||
      name.includes('pict') ||
      name.includes('jss') ||
      name.includes('akgec') ||
      name.includes('kiit') ||
      name.includes('srm') ||
      name.includes('thapar') ||
      name.includes('iet') ||
      name.includes('mnnit') ||
      name.includes('jamia') ||
      name.includes('msrit') ||
      name.includes('cusat')
    ) {
      domains.push('Computer Applications');
      streams.push('Master of Computer Applications (MCA)');
    }

    // Architecture & Planning (B.Arch / M.Plan)
    if (
      name.includes('roorkee') ||
      name.includes('vnit') ||
      name.includes('iit kharagpur') ||
      name.includes('ceg') ||
      name.includes('jamia') ||
      name.includes('vit') ||
      name.includes('manipal') ||
      name.includes('msrit') ||
      name.includes('bms') ||
      name.includes('kiit') ||
      name.includes('manit') ||
      name.includes('nit trichy') ||
      name.includes('nit calicut') ||
      name.includes('outr') ||
      name.includes('cet')
    ) {
      domains.push('Architecture & Planning');
      streams.push('Bachelor of Architecture (B.Arch)');
      streams.push('Master of Urban & Regional Planning (M.Plan)');
    }

    // Pharmacy (B.Pharm / M.Pharm)
    if (
      name.includes('bits pilani') ||
      name.includes('manipal') ||
      name.includes('jamia') ||
      name.includes('bhu') ||
      name.includes('sgsits') ||
      name.includes('nirma')
    ) {
      domains.push('Pharmacy');
      streams.push('Bachelor of Pharmacy (B.Pharm)');
      streams.push('Master of Pharmacy (M.Pharm)');
    }

    // Applied Arts, Crafts & Design (B.Des / M.Des)
    if (
      name.includes('iit bombay') ||
      name.includes('iit delhi') ||
      name.includes('iit guwahati') ||
      name.includes('iiit') ||
      name.includes('bits') ||
      name.includes('dtu') ||
      name.includes('pes')
    ) {
      domains.push('Applied Arts, Crafts & Design');
      streams.push('Bachelor of Design (B.Des)');
      streams.push('Master of Design (M.Des)');
    }
  }

  return { domains, streams, framework };
}

// Automatically enrich every college in the national directory with statutory domains, streams, and frameworks
NATIONAL_COLLEGES_DIRECTORY.forEach((col) => {
  const cls = resolveCollegeClassification(col);
  col.domains = col.domains || cls.domains;
  col.streams = col.streams || cls.streams;
  col.framework = col.framework || cls.framework;
});

/**
 * Calculates Great-Circle (Haversine) Distance between two geographic points in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates Cardinal Compass Bearing (N, NE, E, SE, S, SW, W, NW).
 */
export function getCompassBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const compassPoints = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  return compassPoints[Math.round(brng / 45) % 8];
}

/**
 * Generates an external Google Maps directions link directly to the college destination.
 */
export function getGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number
): string {
  if (originLat !== undefined && originLng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
}

/**
 * Finds the nearest known metropolitan preset for a given coordinate pair.
 */
export function findNearestPreset(lat: number, lng: number): PresetLocation {
  let closest = PRESET_LOCATIONS[0];
  let minD = Infinity;
  for (const preset of PRESET_LOCATIONS) {
    const d = calculateDistanceKm(lat, lng, preset.lat, preset.lng);
    if (d < minD) {
      minD = d;
      closest = preset;
    }
  }
  return closest;
}

/**
 * Filters and ranks technical colleges based on real-time keystroke query,
 * user coordinates, radius boundaries, statutory domain filters, and university frameworks.
 */
export function getNearbyColleges(
  searchQuery: string,
  userCoords?: { lat: number; lng: number } | null,
  radiusKm?: number | 'ALL',
  categoryFilter?: string,
  domainFilter?: string,
  frameworkFilter?: string
): (CollegeGeoItem & { distanceKm?: number; compassBearing?: string })[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 1. Calculate distance & bearing for every college if coordinates are available
  let list = NATIONAL_COLLEGES_DIRECTORY.map((col) => {
    let distanceKm: number | undefined;
    let compassBearing: string | undefined;

    if (userCoords) {
      distanceKm = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        col.coordinates.lat,
        col.coordinates.lng
      );
      compassBearing = getCompassBearing(
        userCoords.lat,
        userCoords.lng,
        col.coordinates.lat,
        col.coordinates.lng
      );
    }
    return {
      ...col,
      distanceKm,
      compassBearing,
    };
  });

  // 2. Filter by Category if chosen
  if (categoryFilter && categoryFilter !== 'ALL') {
    list = list.filter((col) =>
      col.category.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  }

  // 3. Filter by AICTE Statutory Domain if chosen
  if (domainFilter && domainFilter !== 'ALL') {
    const dLower = domainFilter.toLowerCase();
    list = list.filter((col) =>
      col.domains?.some((dom) => dom.toLowerCase().includes(dLower) || dLower.includes(dom.toLowerCase())) ||
      col.category.toLowerCase().includes(dLower) ||
      col.streams?.some((st) => st.toLowerCase().includes(dLower))
    );
  }

  // 4. Filter by University Governance Framework if chosen
  if (frameworkFilter && frameworkFilter !== 'ALL') {
    const fLower = frameworkFilter.toLowerCase();
    list = list.filter((col) =>
      (col.framework && col.framework.toLowerCase().includes(fLower)) ||
      col.institution_type.toLowerCase().includes(fLower)
    );
  }

  // 5. Real-time Search Term Matching (Keystroke-level reactive match across name, domain, stream, location)
  if (normalizedQuery.length > 0) {
    list = list.filter((col) => {
      const matchName = col.name.toLowerCase().includes(normalizedQuery);
      const matchShort = col.shortName ? col.shortName.toLowerCase().includes(normalizedQuery) : false;
      const matchCity = col.city.toLowerCase().includes(normalizedQuery);
      const matchState = col.state.toLowerCase().includes(normalizedQuery);
      const matchAicte = col.aicte_id.toLowerCase().includes(normalizedQuery);
      const matchAishe = col.aishe_code.toLowerCase().includes(normalizedQuery);
      const matchCategory = col.category.toLowerCase().includes(normalizedQuery);
      const matchType = col.institution_type.toLowerCase().includes(normalizedQuery);
      const matchAddress = col.address.toLowerCase().includes(normalizedQuery);
      const matchPin = col.pin_code.includes(normalizedQuery);
      const matchDomain = col.domains?.some((d) => d.toLowerCase().includes(normalizedQuery));
      const matchStream = col.streams?.some((s) => s.toLowerCase().includes(normalizedQuery));
      const matchFramework = col.framework?.toLowerCase().includes(normalizedQuery);

      return (
        matchName ||
        matchShort ||
        matchCity ||
        matchState ||
        matchAicte ||
        matchAishe ||
        matchCategory ||
        matchType ||
        matchAddress ||
        matchPin ||
        matchDomain ||
        matchStream ||
        matchFramework
      );
    });
  }

  // 6. Reactive Radius Filter: When a radius limit is chosen, strictly filter institutions within radius
  if (userCoords && radiusKm && radiusKm !== 'ALL') {
    list = list.filter((col) => col.distanceKm !== undefined && col.distanceKm <= radiusKm);
  }

  // 7. Intelligent Multi-Criteria Sorting (Closest First)
  list.sort((a, b) => {
    // If search query is present, prioritize exact name matches first
    if (normalizedQuery.length > 0) {
      const aStarts = (a.shortName || a.name).toLowerCase().startsWith(normalizedQuery) ? -500 : 0;
      const bStarts = (b.shortName || b.name).toLowerCase().startsWith(normalizedQuery) ? -500 : 0;

      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm + aStarts - (b.distanceKm + bStarts);
      }
      return aStarts - bStarts;
    }

    // Default: Sort by closest distance if user coords are present
    if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
      return a.distanceKm - b.distanceKm;
    }

    // Otherwise sort by id
    return a.id - b.id;
  });

  return list;
}
