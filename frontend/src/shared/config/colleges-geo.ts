/**
 * SAMANVAY — AICTE National Technical Institutions & Geolocation Directory
 * Includes geographic coordinates, territorial bureaus, accreditation statuses,
 * and distance calculation utilities for location-aware suggestions.
 */

export interface CollegeGeoItem {
  id: number;
  name: string;
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
  { id: 'delhi', label: 'Delhi NCR', city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { id: 'mumbai', label: 'Mumbai & Navi Mumbai', city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { id: 'pune', label: 'Pune', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { id: 'bangalore', label: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { id: 'chennai', label: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { id: 'kolkata', label: 'Kolkata', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { id: 'hyderabad', label: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { id: 'bhopal', label: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { id: 'kanpur', label: 'Kanpur / Lucknow', city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
];

export const NATIONAL_COLLEGES_DIRECTORY: CollegeGeoItem[] = [
  // 1. Northern Region (Delhi NCR & UP)
  {
    id: 3,
    name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
    aicte_id: '1-99887766',
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
    active_complaints_count: 4,
    is_conflicting: true,
    active_bureaus: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    contact_phone: '+91 11 2788 1234',
    contact_email: 'director@ditm-synthetic.edu.in',
  },
  {
    id: 7,
    name: 'Delhi Technological University (DTU / DCE)',
    aicte_id: '1-77889900',
    aishe_code: 'U-0105',
    category: 'Engineering & Technology',
    institution_type: 'State University',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110042',
    address: 'Shahbad Daulatpur, Main Bawana Road, Delhi',
    coordinates: { lat: 28.7499, lng: 77.117 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2787 1018',
    contact_email: 'registrar@dtu.ac.in',
  },
  {
    id: 8,
    name: 'Indraprastha Institute of Information Technology (IIIT Delhi)',
    aicte_id: '1-66778899',
    aishe_code: 'U-0106',
    category: 'Information Technology & CSE',
    institution_type: 'State Autonomous',
    approval_status: 'APPROVED',
    city: 'New Delhi',
    state: 'Delhi',
    region: 'Northern',
    pin_code: '110020',
    address: 'Okhla Industrial Estate, Phase III, Near Govind Puri, New Delhi',
    coordinates: { lat: 28.5438, lng: 77.2724 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 11 2690 7400',
    contact_email: 'info@iiitd.ac.in',
  },
  {
    id: 9,
    name: 'Global Institute of Management Studies [SYNTHETIC]',
    aicte_id: '1-39485721',
    aishe_code: 'C-39102',
    category: 'Management & Business',
    institution_type: 'Private-Self-Financed',
    approval_status: 'APPROVED',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '201310',
    address: 'Knowledge Park III, Greater Noida, UP',
    coordinates: { lat: 28.4744, lng: 77.504 },
    active_complaints_count: 1,
    is_conflicting: false,
    contact_phone: '+91 120 3948 5721',
    contact_email: 'director@gims-synthetic.edu.in',
  },
  {
    id: 10,
    name: 'Harcourt Butler Technical University (HBTU)',
    aicte_id: '1-44556677',
    aishe_code: 'U-0512',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    region: 'Northern',
    pin_code: '208002',
    address: 'Nawabganj, Kanpur, Uttar Pradesh',
    coordinates: { lat: 26.4947, lng: 80.309 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 512 2534 001',
    contact_email: 'registrar@hbtu.ac.in',
  },

  // 2. Western Region (Maharashtra & Gujarat)
  {
    id: 1,
    name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
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
    active_complaints_count: 3,
    is_conflicting: true,
    active_bureaus: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    contact_phone: '+91 20 2293 8470',
    contact_email: 'registrar@apex-tech-synthetic.edu.in',
  },
  {
    id: 11,
    name: 'College of Engineering Pune (COEP Technological University)',
    aicte_id: '1-11223344',
    aishe_code: 'U-0312',
    category: 'Engineering & Technology',
    institution_type: 'Unitary State University',
    approval_status: 'APPROVED',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '411005',
    address: 'Wellesley Road, Shivajinagar, Pune, Maharashtra',
    coordinates: { lat: 18.5293, lng: 73.8565 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 20 2550 7000',
    contact_email: 'admin@coep.ac.in',
  },
  {
    id: 12,
    name: 'Veermata Jijabai Technological Institute (VJTI)',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 22 2419 8100',
    contact_email: 'director@vjti.ac.in',
  },
  {
    id: 13,
    name: 'Sardar Patel Institute of Technology (SPIT)',
    aicte_id: '1-33445566',
    aishe_code: 'C-34109',
    category: 'Engineering & Technology',
    institution_type: 'Private-Autonomous',
    approval_status: 'APPROVED',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    pin_code: '400058',
    address: 'Bhavans Campus, Munshi Nagar, Andheri West, Mumbai',
    coordinates: { lat: 19.1232, lng: 72.8361 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 22 2670 7440',
    contact_email: 'principal@spit.ac.in',
  },

  // 3. South-Western Region (Karnataka & Kerala)
  {
    id: 2,
    name: 'National Institute of Science & Technology [SYNTHETIC]',
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
    active_complaints_count: 2,
    is_conflicting: true,
    active_bureaus: ['VIGILANCE_CELL', 'PGRC'],
    contact_phone: '+91 80 2849 1022',
    contact_email: 'admin@nist-synthetic.edu.in',
  },
  {
    id: 14,
    name: 'R.V. College of Engineering (RVCE)',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 6818 8100',
    contact_email: 'principal@rvce.edu.in',
  },
  {
    id: 15,
    name: 'BMS College of Engineering',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 80 2662 2130',
    contact_email: 'info@bmsce.ac.in',
  },

  // 4. Southern Region (Tamil Nadu)
  {
    id: 5,
    name: 'Chennai Global Engineering College [SYNTHETIC]',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 5544 3322',
    contact_email: 'dean@cgec-synthetic.edu.in',
  },
  {
    id: 16,
    name: 'College of Engineering, Guindy (CEG Anna University)',
    aicte_id: '1-66334455',
    aishe_code: 'U-0441',
    category: 'Engineering & Technology',
    institution_type: 'State Technical University',
    approval_status: 'APPROVED',
    city: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '600025',
    address: 'Sardar Patel Road, Guindy, Chennai, Tamil Nadu',
    coordinates: { lat: 13.0109, lng: 80.2354 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 44 2235 7004',
    contact_email: 'deanceg@annauniv.edu',
  },
  {
    id: 17,
    name: 'PSG College of Technology',
    aicte_id: '1-77445566',
    aishe_code: 'C-0622',
    category: 'Engineering & Technology',
    institution_type: 'Govt-Aided Autonomous',
    approval_status: 'APPROVED',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    region: 'Southern',
    pin_code: '641004',
    address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu',
    coordinates: { lat: 11.0247, lng: 77.0028 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 422 257 2177',
    contact_email: 'principal@psgtech.edu',
  },

  // 5. Eastern Region (West Bengal & Odisha)
  {
    id: 4,
    name: 'Kolkata Polytechnic Institute [SYNTHETIC]',
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
    active_complaints_count: 1,
    is_conflicting: false,
    active_bureaus: ['REGULATION_BUREAU'],
    contact_phone: '+91 33 6655 4433',
    contact_email: 'admin@kpi-synthetic.edu.in',
  },
  {
    id: 18,
    name: 'Heritage Polytechnic Institute [SYNTHETIC]',
    aicte_id: '1-58392019',
    aishe_code: 'C-22910',
    category: 'Polytechnic & Applied Tech',
    institution_type: 'Govt-Aided',
    approval_status: 'APPROVED',
    city: 'Kolkata',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '700091',
    address: 'Sector V, Salt Lake, Kolkata, West Bengal',
    coordinates: { lat: 22.58, lng: 88.43 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 33 5839 2019',
    contact_email: 'principal@heritage-poly-synthetic.edu.in',
  },
  {
    id: 19,
    name: 'Jadavpur University Faculty of Engineering & Tech',
    aicte_id: '1-88556677',
    aishe_code: 'U-0570',
    category: 'Engineering & Technology',
    institution_type: 'State University',
    approval_status: 'APPROVED',
    city: 'Kolkata',
    state: 'West Bengal',
    region: 'Eastern',
    pin_code: '700032',
    address: '188, Raja S.C. Mallick Road, Kolkata, West Bengal',
    coordinates: { lat: 22.4996, lng: 88.3715 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 33 2457 2227',
    contact_email: 'fet@jadavpuruniversity.in',
  },

  // 6. Central Region (Madhya Pradesh & Chhattisgarh)
  {
    id: 6,
    name: 'Bhopal Institute of Science & Applied Tech [SYNTHETIC]',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 755 4433 2211',
    contact_email: 'contact@bisat-synthetic.edu.in',
  },
  {
    id: 20,
    name: 'Central Indian Institute of Technology [SYNTHETIC]',
    aicte_id: '1-74829103',
    aishe_code: 'C-61099',
    category: 'Engineering & Technology',
    institution_type: 'Govt',
    approval_status: 'APPROVED',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    region: 'Central',
    pin_code: '462011',
    address: 'Arera Hills, Bhopal, Madhya Pradesh',
    coordinates: { lat: 23.23, lng: 77.43 },
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 755 7482 9103',
    contact_email: 'office@ciit-synthetic.edu.in',
  },

  // 7. Telangana & Andhra Pradesh
  {
    id: 21,
    name: 'Jawaharlal Nehru Technological University (JNTU Hyderabad)',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 40 2315 8661',
    contact_email: 'registrar@jntuh.ac.in',
  },
  {
    id: 22,
    name: 'International Institute of Information Technology (IIIT Hyderabad)',
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
    active_complaints_count: 0,
    is_conflicting: false,
    contact_phone: '+91 40 6653 1000',
    contact_email: 'query@iiit.ac.in',
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
 * Filters and ranks technical colleges and universities based on search query and optional user coordinates.
 */
export function getNearbyColleges(
  searchQuery: string,
  userCoords?: { lat: number; lng: number } | null
): (CollegeGeoItem & { distanceKm?: number })[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Calculate distance for all colleges if user coordinates are available
  const list = NATIONAL_COLLEGES_DIRECTORY.map((col) => {
    let distanceKm: number | undefined;
    if (userCoords) {
      distanceKm = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        col.coordinates.lat,
        col.coordinates.lng
      );
    }
    return {
      ...col,
      distanceKm,
    };
  });

  // Filter based on search query if provided
  let filtered = list;
  if (normalizedQuery.length > 0) {
    filtered = list.filter((col) => {
      const matchName = col.name.toLowerCase().includes(normalizedQuery);
      const matchAicte = col.aicte_id.toLowerCase().includes(normalizedQuery);
      const matchCity = col.city.toLowerCase().includes(normalizedQuery);
      const matchState = col.state.toLowerCase().includes(normalizedQuery);
      const matchCategory = col.category.toLowerCase().includes(normalizedQuery);
      const matchAddress = col.address.toLowerCase().includes(normalizedQuery);
      const matchAishe = col.aishe_code.toLowerCase().includes(normalizedQuery);

      return (
        matchName ||
        matchAicte ||
        matchCity ||
        matchState ||
        matchCategory ||
        matchAddress ||
        matchAishe
      );
    });
  }

  // Sort: If user coordinates provided, prioritize nearest distance; otherwise keep default order
  filtered.sort((a, b) => {
    // If both have distance, sort by distance ascending
    if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
      // If query is present, give bonus weight to exact name matches
      if (normalizedQuery.length > 0) {
        const aNameStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? -100 : 0;
        const bNameStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? -100 : 0;
        return (a.distanceKm + aNameStarts) - (b.distanceKm + bNameStarts);
      }
      return a.distanceKm - b.distanceKm;
    }
    return 0;
  });

  return filtered;
}
