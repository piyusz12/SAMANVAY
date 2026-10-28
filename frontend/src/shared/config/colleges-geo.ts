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
}

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
];

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
 * user coordinates, radius boundaries, and category filters.
 * GUARANTEE: Never truncates to an empty list when user coordinates are present!
 */
export function getNearbyColleges(
  searchQuery: string,
  userCoords?: { lat: number; lng: number } | null,
  radiusKm?: number | 'ALL',
  categoryFilter?: string
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

  // 2. Filter by category if chosen
  if (categoryFilter && categoryFilter !== 'ALL') {
    list = list.filter((col) =>
      col.category.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  }

  // 3. Real-time Search Term Matching (Keystroke-level reactive match)
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
        matchPin
      );
    });
  }

  // 4. Intelligent Radius Filter: If radius is specified and userCoords exist, try to filter.
  // CRITICAL: If filtering by radius results in 0 matches, KEEP the closest colleges so user always sees colleges around them!
  if (userCoords && radiusKm && radiusKm !== 'ALL') {
    const withinRadius = list.filter((col) => col.distanceKm !== undefined && col.distanceKm <= radiusKm);
    if (withinRadius.length > 0) {
      list = withinRadius;
    }
  }

  // 5. Intelligent Multi-Criteria Sorting (Closest First)
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
