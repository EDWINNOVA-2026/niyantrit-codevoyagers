import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiRequest } from "../lib/api";
import { requestMessagingToken } from "../lib/firebase";

export type UserRole = "user" | "tender" | null;
export type ProjectStatus = "Pending" | "Ongoing" | "Completed";
export type RiskLevel =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "VERY_HIGH"
  | "CRITICAL"
  | "UNKNOWN";

export interface Project {
  id: string;
  name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  riskScore: number | null;
  riskLevel: RiskLevel;
  budget: number;
  labourCost: number;
  materialCost: number;
  location: {
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
}

export interface Post {
  id: string;
  projectId: string;
  caption: string;
  imageUrl: string;
  authorName: string;
  authorRole: Exclude<UserRole, null>;
  createdAt: string;
  progress: number;
  materialCost: number;
  labourCost: number;
  milestoneName: string | null;
  workSummary: string | null;
  nextAction: string | null;
  blockers: string | null;
  targetDate: string | null;
  isContractorUpdate: boolean;
  complaintCategory: string | null;
  complaintStatus: string;
  severity: number;
  priority: number;
  supportCount: number;
  supportedByMe: boolean;
  evidenceLocationLabel: string;
  evidenceLatitude: number | null;
  evidenceLongitude: number | null;
  evidenceMediaType: string;
  evidenceMediaFilename: string | null;
  evidenceMediaMimeType: string | null;
  evidenceMediaSizeBytes: number | null;
  evidenceTamperHash: string;
}

export interface TenderLeaderboardEntry {
  contractorUserId: number;
  contractorName: string;
  rank: number;
  promotionScore: number;
  qualityScore: number;
  timelinessScore: number;
  budgetScore: number;
  reliabilityScore: number;
  riskScore: number | null;
  contractorUpdateCount: number;
  resolvedUpdateCount: number;
  featuredEligible: boolean;
  optInEnabled: boolean;
  featuredActive: boolean;
  reasonCodes: string[];
  suggestedActions: string[];
  lastEvaluatedAt: string | null;
  minimumUpdatesRequired: number;
  isCurrentUser: boolean;
}

interface AppContextValue {
  isAuthenticated: boolean;
  userRole: UserRole;
  phoneNumber: string;
  loading: boolean;
  error: string | null;
  projects: Project[];
  posts: Post[];
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<Exclude<UserRole, null>>;
  requestOtp: (
    phone: string
  ) => Promise<{ roleHint: string | null; devOtp: string | null }>;
  sendOtp: (
    phone: string
  ) => Promise<{ roleHint: string | null; devOtp: string | null }>;
  verifyOtp: (
    phone: string,
    otp: string,
    roleHint?: string | null
  ) => Promise<Exclude<UserRole, null>>;
  loginWithFirebase: (
    idToken: string,
    roleHint?: string | null,
    phone?: string,
  ) => Promise<Exclude<UserRole, null>>;
  login: (role: Exclude<UserRole, null>, phone?: string) => Promise<void>;
  logout: () => void;
  submitTextIssue: (payload: {
    projectId: string;
    description: string;
    severity: number;
  }) => Promise<void>;
  submitVoiceIssue: (payload: {
    projectId: string;
    severity: number;
    audioBlob: Blob;
  }) => Promise<void>;
  addPost: (payload: {
    projectId: string;
    imageUrl: string;
    progress: number;
    materialCost: number;
    labourCost: number;
    milestoneName: string;
    workSummary: string;
    nextAction: string;
    blockers: string;
    targetDate: string;
  }) => Promise<void>;
  getTenderLeaderboard: (limit?: number) => Promise<TenderLeaderboardEntry[]>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  supportComplaint: (complaintId: string) => Promise<void>;
  unsupportComplaint: (complaintId: string) => Promise<void>;
}

const ACCESS_TOKEN_KEY = "niyantrit_access_token";
const REFRESH_TOKEN_KEY = "niyantrit_refresh_token";

type BackendMeResponse = {
  user_id: number;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

type BackendOtpRequestResponse = {
  phone: string;
  role_hint: string | null;
  dev_otp: string | null;
};

type BackendOtpVerifyResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    user_id: number;
    email: string;
    role: string;
    full_name: string | null;
    phone: string | null;
    is_new_user?: boolean;
  };
};

type BackendProject = {
  id: number;
  project_id: string;
  project_name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  total_funds: number;
  labour_cost?: number | null;
  material_cost?: number | null;
  other_cost?: number | null;
  status: string;
  risk_score: number | null;
  risk_level: string;
};

type BackendComplaint = {
  id: number;
  project_id: number;
  description: string;
  formal_text: string | null;
  category: string | null;
  status: string;
  priority: number;
  severity: number;
  created_at: string;
  created_by: string | null;
  created_by_role: string | null;
  milestone_name: string | null;
  work_summary: string | null;
  next_action: string | null;
  blockers: string | null;
  target_date: string | null;
  progress_update: number | null;
  material_cost: number | null;
  labour_cost: number | null;
  is_contractor_update: boolean;
  project_location: string | null;
  project_latitude: number | null;
  project_longitude: number | null;
  media_type: string;
  media_filename: string | null;
  media_mime_type: string | null;
  media_size_bytes: number | null;
  evidence_hash: string;
  support_count?: number;
  supported_by_me?: boolean;
};

type BackendLoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    user_id: number;
    email: string;
    role: string;
    full_name: string | null;
    phone: string | null;
  };
};

type BackendFirebaseLoginResponse = BackendLoginResponse;

type BackendNotificationRegisterResponse = {
  status: string;
};

type BackendSupportResponse = {
  complaint_id: number;
  supported: boolean;
  support_count: number;
};

function toAppUserRole(backendRole: string | null | undefined): UserRole {
  if (!backendRole) return null;
  if (backendRole === "Contractor") return "tender";
  return "user";
}

function toPostAuthorRole(
  backendRole: string | null | undefined,
): Exclude<UserRole, null> {
  return backendRole === "Contractor" ? "tender" : "user";
}

function toBackendRole(roleHint?: string | null) {
  const normalized = (roleHint || "").trim();
  return normalized || "Citizen";
}

function parseCityState(location: string) {
  const value = (location || "").trim();
  if (!value) return { city: "Unknown", state: "" };
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], state: parts.slice(1).join(", ") };
  }
  return { city: value, state: "" };
}

function toAppProjectStatus(backendStatus: string | null | undefined): ProjectStatus {
  switch ((backendStatus || "").toLowerCase()) {
    case "completed":
      return "Completed";
    case "active":
    case "delayed":
      return "Ongoing";
    case "planning":
    case "on hold":
    default:
      return "Pending";
  }
}

function estimateProgress(backendStatus: string | null | undefined) {
  switch ((backendStatus || "").toLowerCase()) {
    case "completed":
      return 100;
    case "active":
      return 65;
    case "delayed":
      return 45;
    case "planning":
    case "on hold":
    default:
      return 20;
  }
}

function normalizeRiskLevel(level: string | null | undefined): RiskLevel {
  const value = (level || "").toUpperCase();
  if (
    value === "LOW" ||
    value === "MODERATE" ||
    value === "HIGH" ||
    value === "VERY_HIGH" ||
    value === "CRITICAL" ||
    value === "UNKNOWN"
  ) {
    return value;
  }
  return "UNKNOWN";
}

function seededImage(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/960/560`;
}

function mapBackendProjectToApp(project: BackendProject): Project {
  const { city, state } = parseCityState(project.location);
  return {
    id: String(project.id),
    name: project.project_name || `Project ${project.project_id}`,
    department: "Infrastructure",
    description: project.location ? `Location: ${project.location}` : "",
    status: toAppProjectStatus(project.status),
    progress: estimateProgress(project.status),
    riskScore:
      project.risk_score === null || project.risk_score === undefined
        ? null
        : Math.round(project.risk_score),
    riskLevel: normalizeRiskLevel(project.risk_level),
    budget: Number(project.total_funds || 0),
    labourCost: Number(project.labour_cost || 0),
    materialCost: Number(project.material_cost || 0),
    location: {
      city,
      state,
      latitude: project.latitude ?? 0,
      longitude: project.longitude ?? 0,
    },
  };
}

function mapBackendComplaintToPost(complaint: BackendComplaint): Post {
  const authorRole = toPostAuthorRole(complaint.created_by_role);

  return {
    id: String(complaint.id),
    projectId: String(complaint.project_id),
    caption: (complaint.formal_text || complaint.description || "").trim(),
    imageUrl: seededImage(`complaint-${complaint.id}`),
    authorName:
      (complaint.created_by || "").trim() ||
      (authorRole === "tender" ? "Contractor" : "Citizen"),
    authorRole,
    createdAt: complaint.created_at,
    progress: Number(complaint.progress_update || 0),
    materialCost: Number(complaint.material_cost || 0),
    labourCost: Number(complaint.labour_cost || 0),
    milestoneName: complaint.milestone_name || null,
    workSummary: complaint.work_summary || null,
    nextAction: complaint.next_action || null,
    blockers: complaint.blockers || null,
    targetDate: complaint.target_date || null,
    isContractorUpdate: Boolean(complaint.is_contractor_update),
    complaintCategory: complaint.category || null,
    complaintStatus: complaint.status,
    severity: Number(complaint.severity || 5),
    priority: Number(complaint.priority || 5),
    supportCount: Number(complaint.support_count || 0),
    supportedByMe: Boolean(complaint.supported_by_me),
    evidenceLocationLabel: complaint.project_location || "Reported",
    evidenceLatitude:
      complaint.project_latitude === null || complaint.project_latitude === undefined
        ? null
        : Number(complaint.project_latitude),
    evidenceLongitude:
      complaint.project_longitude === null || complaint.project_longitude === undefined
        ? null
        : Number(complaint.project_longitude),
    evidenceMediaType: complaint.media_type || "text",
    evidenceMediaFilename: complaint.media_filename || null,
    evidenceMediaMimeType: complaint.media_mime_type || null,
    evidenceMediaSizeBytes:
      complaint.media_size_bytes === null || complaint.media_size_bytes === undefined
        ? null
        : Number(complaint.media_size_bytes),
    evidenceTamperHash: complaint.evidence_hash,
  };
}

// --- MOCK DATA ---
const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "NH-48 Highway Expansion Phase 3",
    department: "National Highways Authority",
    description:
      "Six-lane expansion of NH-48 from Bangalore to Tumkur covering 65 km stretch with service roads and flyovers",
    status: "Ongoing",
    progress: 72,
    riskScore: 35,
    riskLevel: "MODERATE",
    budget: 245000000,
    labourCost: 89000000,
    materialCost: 120000000,
    location: {
      city: "Bangalore",
      state: "Karnataka",
      latitude: 13.0827,
      longitude: 77.5877,
    },
  },
  {
    id: "2",
    name: "Metro Rail Blue Line Extension",
    department: "Urban Development Authority",
    description:
      "Extension of metro blue line from Whitefield to Electronic City covering 12 stations",
    status: "Ongoing",
    progress: 58,
    riskScore: 62,
    riskLevel: "HIGH",
    budget: 890000000,
    labourCost: 320000000,
    materialCost: 410000000,
    location: {
      city: "Bangalore",
      state: "Karnataka",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  },
  {
    id: "3",
    name: "Cauvery Water Treatment Plant Upgrade",
    department: "Water Supply Board",
    description:
      "Modernization of water treatment facility with 500 MLD capacity enhancement and advanced filtration systems",
    status: "Pending",
    progress: 22,
    riskScore: 78,
    riskLevel: "VERY_HIGH",
    budget: 180000000,
    labourCost: 45000000,
    materialCost: 98000000,
    location: {
      city: "Mysuru",
      state: "Karnataka",
      latitude: 12.2958,
      longitude: 76.6394,
    },
  },
  {
    id: "4",
    name: "Smart City Digital Infrastructure",
    department: "IT Department",
    description:
      "Implementation of IoT sensors, smart lighting, and traffic management systems across city zones",
    status: "Ongoing",
    progress: 45,
    riskScore: 41,
    riskLevel: "MODERATE",
    budget: 350000000,
    labourCost: 120000000,
    materialCost: 180000000,
    location: {
      city: "Hyderabad",
      state: "Telangana",
      latitude: 17.385,
      longitude: 78.4867,
    },
  },
  {
    id: "5",
    name: "Government Hospital Wing Construction",
    department: "Health Department",
    description:
      "New 200-bed specialty wing with ICU facilities and modern diagnostic equipment at District Hospital",
    status: "Completed",
    progress: 100,
    riskScore: 12,
    riskLevel: "LOW",
    budget: 420000000,
    labourCost: 150000000,
    materialCost: 220000000,
    location: {
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.0827,
      longitude: 80.2707,
    },
  },
  {
    id: "6",
    name: "Solar Farm Grid Integration Project",
    department: "Energy Department",
    description:
      "100 MW solar farm with grid integration and battery storage facility",
    status: "Ongoing",
    progress: 63,
    riskScore: 28,
    riskLevel: "LOW",
    budget: 560000000,
    labourCost: 90000000,
    materialCost: 380000000,
    location: {
      city: "Jodhpur",
      state: "Rajasthan",
      latitude: 26.2389,
      longitude: 73.0243,
    },
  },
  {
    id: "7",
    name: "Flood Control Embankment Works",
    department: "Irrigation Department",
    description:
      "Construction of flood control embankments along Brahmaputra river covering 45km stretch",
    status: "Pending",
    progress: 18,
    riskScore: 85,
    riskLevel: "CRITICAL",
    budget: 320000000,
    labourCost: 110000000,
    materialCost: 150000000,
    location: {
      city: "Guwahati",
      state: "Assam",
      latitude: 26.1445,
      longitude: 91.7362,
    },
  },
  {
    id: "8",
    name: "Rural Road Connectivity Programme",
    department: "Rural Development",
    description:
      "All-weather road connectivity to 120 remote villages with bridges and culverts",
    status: "Ongoing",
    progress: 51,
    riskScore: 55,
    riskLevel: "HIGH",
    budget: 280000000,
    labourCost: 95000000,
    materialCost: 135000000,
    location: {
      city: "Ranchi",
      state: "Jharkhand",
      latitude: 23.3441,
      longitude: 85.3096,
    },
  },
  {
    id: "9",
    name: "Municipal Waste Processing Plant",
    department: "Urban Local Bodies",
    description:
      "Integrated solid waste management facility with waste-to-energy conversion capacity of 500 TPD",
    status: "Pending",
    progress: 30,
    riskScore: 48,
    riskLevel: "MODERATE",
    budget: 195000000,
    labourCost: 52000000,
    materialCost: 105000000,
    location: {
      city: "Pune",
      state: "Maharashtra",
      latitude: 18.5204,
      longitude: 73.8567,
    },
  },
  {
    id: "10",
    name: "District Court Complex Modernization",
    department: "Law & Justice Department",
    description:
      "Renovation and digital infrastructure upgrade for district court complex with e-filing systems",
    status: "Completed",
    progress: 100,
    riskScore: 8,
    riskLevel: "LOW",
    budget: 85000000,
    labourCost: 28000000,
    materialCost: 42000000,
    location: {
      city: "Lucknow",
      state: "Uttar Pradesh",
      latitude: 26.8467,
      longitude: 80.9462,
    },
  },
  {
    id: "11",
    name: "Bridge Over River Krishna",
    department: "PWD",
    description: "4-lane cable-stayed bridge spanning 1.2 km over Krishna river",
    status: "Ongoing",
    progress: 38,
    riskScore: 71,
    riskLevel: "HIGH",
    budget: 620000000,
    labourCost: 210000000,
    materialCost: 310000000,
    location: {
      city: "Vijayawada",
      state: "Andhra Pradesh",
      latitude: 16.5062,
      longitude: 80.648,
    },
  },
  {
    id: "12",
    name: "Affordable Housing Scheme Phase 2",
    department: "Housing Board",
    description: "Construction of 5000 EWS and LIG dwelling units under PM Awas Yojana",
    status: "Ongoing",
    progress: 44,
    riskScore: 52,
    riskLevel: "HIGH",
    budget: 750000000,
    labourCost: 280000000,
    materialCost: 350000000,
    location: {
      city: "Bhopal",
      state: "Madhya Pradesh",
      latitude: 23.2599,
      longitude: 77.4126,
    },
  },
];

const MOCK_POSTS: Post[] = [
  {
    id: "c1",
    projectId: "1",
    caption:
      "Major cracks observed on the newly constructed service road near KM 28. Substandard material suspected.",
    imageUrl: "https://picsum.photos/seed/complaint-1/960/560",
    authorName: "Rajesh Kumar",
    authorRole: "user",
    createdAt: "2026-04-03T14:30:00Z",
    progress: 72,
    materialCost: 120000000,
    labourCost: 89000000,
    milestoneName: null,
    workSummary: null,
    nextAction: null,
    blockers: null,
    targetDate: null,
    isContractorUpdate: false,
    complaintCategory: "Quality",
    complaintStatus: "Pending",
    severity: 8,
    priority: 9,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "NH-48 KM 28, Nelamangala",
    evidenceLatitude: 13.0827,
    evidenceLongitude: 77.5877,
    evidenceMediaType: "image",
    evidenceMediaFilename: "road_crack_photo.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 2456000,
    evidenceTamperHash: "a3f8c2d1e5b7a9f0",
  },
  {
    id: "c2",
    projectId: "2",
    caption:
      "Completion of pillar foundation work for Station 7. All structural integrity tests passed.",
    imageUrl: "https://picsum.photos/seed/complaint-2/960/560",
    authorName: "Suresh Contractors Ltd",
    authorRole: "tender",
    createdAt: "2026-04-02T09:15:00Z",
    progress: 58,
    materialCost: 410000000,
    labourCost: 320000000,
    milestoneName: "Station 7 Foundation",
    workSummary: "Completed pillar foundation and load testing",
    nextAction: "Begin column erection",
    blockers: "Steel delivery delayed by 3 days",
    targetDate: "2026-04-20",
    isContractorUpdate: true,
    complaintCategory: "Progress Update",
    complaintStatus: "Resolved",
    severity: 3,
    priority: 4,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Metro Blue Line Station 7",
    evidenceLatitude: 12.9716,
    evidenceLongitude: 77.5946,
    evidenceMediaType: "image",
    evidenceMediaFilename: "station7_progress.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 3100000,
    evidenceTamperHash: "b7d2e4f6a1c3b5d8",
  },
  {
    id: "c3",
    projectId: "3",
    caption:
      "Sewage water contaminating treatment inlet. Urgent action required to prevent health hazard.",
    imageUrl: "https://picsum.photos/seed/complaint-3/960/560",
    authorName: "Priya Sharma",
    authorRole: "user",
    createdAt: "2026-04-01T16:45:00Z",
    progress: 22,
    materialCost: 98000000,
    labourCost: 45000000,
    milestoneName: null,
    workSummary: null,
    nextAction: null,
    blockers: null,
    targetDate: null,
    isContractorUpdate: false,
    complaintCategory: "Safety",
    complaintStatus: "Pending",
    severity: 9,
    priority: 10,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Cauvery Treatment Plant, Mysuru",
    evidenceLatitude: 12.2958,
    evidenceLongitude: 76.6394,
    evidenceMediaType: "image",
    evidenceMediaFilename: "contamination_evidence.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 1890000,
    evidenceTamperHash: "c5e3f1a8d2b6c4e7",
  },
  {
    id: "c4",
    projectId: "7",
    caption:
      "Embankment work halted due to unauthorized sand mining upstream affecting foundation stability.",
    imageUrl: "https://picsum.photos/seed/complaint-4/960/560",
    authorName: "Amit Das",
    authorRole: "user",
    createdAt: "2026-03-30T11:20:00Z",
    progress: 18,
    materialCost: 150000000,
    labourCost: 110000000,
    milestoneName: null,
    workSummary: null,
    nextAction: null,
    blockers: null,
    targetDate: null,
    isContractorUpdate: false,
    complaintCategory: "Environmental",
    complaintStatus: "Pending",
    severity: 9,
    priority: 9,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Brahmaputra Embankment KM 12",
    evidenceLatitude: 26.1445,
    evidenceLongitude: 91.7362,
    evidenceMediaType: "voice",
    evidenceMediaFilename: "audio_complaint.webm",
    evidenceMediaMimeType: "audio/webm",
    evidenceMediaSizeBytes: 450000,
    evidenceTamperHash: "d8f4a2c6e1b3d5f9",
  },
  {
    id: "c5",
    projectId: "1",
    caption:
      "Drainage system along service road is completely blocked causing waterlogging during rains.",
    imageUrl: "https://picsum.photos/seed/complaint-5/960/560",
    authorName: "Meena Devi",
    authorRole: "user",
    createdAt: "2026-03-29T08:30:00Z",
    progress: 72,
    materialCost: 120000000,
    labourCost: 89000000,
    milestoneName: null,
    workSummary: null,
    nextAction: null,
    blockers: null,
    targetDate: null,
    isContractorUpdate: false,
    complaintCategory: "Quality",
    complaintStatus: "Resolved",
    severity: 6,
    priority: 7,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "NH-48 Service Road KM 15",
    evidenceLatitude: 13.1027,
    evidenceLongitude: 77.5677,
    evidenceMediaType: "image",
    evidenceMediaFilename: "waterlogging.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 2100000,
    evidenceTamperHash: "e1a5b3d7c2f4e6a8",
  },
  {
    id: "c6",
    projectId: "4",
    caption:
      "Smart traffic signals installed at 15 junctions. Real-time monitoring dashboard operational.",
    imageUrl: "https://picsum.photos/seed/complaint-6/960/560",
    authorName: "TechInfra Solutions",
    authorRole: "tender",
    createdAt: "2026-03-28T15:00:00Z",
    progress: 45,
    materialCost: 180000000,
    labourCost: 120000000,
    milestoneName: "Phase 2 - Traffic Systems",
    workSummary: "Installed smart signals at 15/40 junctions",
    nextAction: "Deploy CCTV integration at remaining junctions",
    blockers: "Fiber connectivity pending at 5 locations",
    targetDate: "2026-05-15",
    isContractorUpdate: true,
    complaintCategory: "Progress Update",
    complaintStatus: "Resolved",
    severity: 2,
    priority: 3,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Hyderabad Smart City Zone A",
    evidenceLatitude: 17.385,
    evidenceLongitude: 78.4867,
    evidenceMediaType: "image",
    evidenceMediaFilename: "smart_signals.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 2800000,
    evidenceTamperHash: "f2b6c4d8e3a1f5b7",
  },
  {
    id: "c7",
    projectId: "8",
    caption:
      "Road construction between village Tola and Ramgarh using inferior quality aggregate. Surface deteriorating within weeks.",
    imageUrl: "https://picsum.photos/seed/complaint-7/960/560",
    authorName: "Sunita Kumari",
    authorRole: "user",
    createdAt: "2026-03-27T10:10:00Z",
    progress: 51,
    materialCost: 135000000,
    labourCost: 95000000,
    milestoneName: null,
    workSummary: null,
    nextAction: null,
    blockers: null,
    targetDate: null,
    isContractorUpdate: false,
    complaintCategory: "Fund Misuse",
    complaintStatus: "Pending",
    severity: 8,
    priority: 8,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Tola-Ramgarh Road, Ranchi",
    evidenceLatitude: 23.3441,
    evidenceLongitude: 85.3096,
    evidenceMediaType: "image",
    evidenceMediaFilename: "road_quality.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 1950000,
    evidenceTamperHash: "a4c8d2e6f1b3a5c7",
  },
  {
    id: "c8",
    projectId: "11",
    caption:
      "Cable anchorage work completed on the south pillar. Load distribution tests in progress.",
    imageUrl: "https://picsum.photos/seed/complaint-8/960/560",
    authorName: "BridgeTech Corp",
    authorRole: "tender",
    createdAt: "2026-03-26T13:45:00Z",
    progress: 38,
    materialCost: 310000000,
    labourCost: 210000000,
    milestoneName: "South Pillar Anchorage",
    workSummary: "Cable anchorage installation and stress testing",
    nextAction: "Begin deck segment placement",
    blockers: "Monsoon forecast may delay work by 2 weeks",
    targetDate: "2026-05-01",
    isContractorUpdate: true,
    complaintCategory: "Progress Update",
    complaintStatus: "Resolved",
    severity: 2,
    priority: 3,
    supportCount: 0,
    supportedByMe: false,
    evidenceLocationLabel: "Krishna Bridge South Bank",
    evidenceLatitude: 16.5062,
    evidenceLongitude: 80.648,
    evidenceMediaType: "image",
    evidenceMediaFilename: "bridge_anchorage.jpg",
    evidenceMediaMimeType: "image/jpeg",
    evidenceMediaSizeBytes: 3400000,
    evidenceTamperHash: "b5d9e3f7a2c4b6d8",
  },
];

const MOCK_LEADERBOARD: TenderLeaderboardEntry[] = [
  {
    contractorUserId: 101,
    contractorName: "Suresh Contractors Ltd",
    rank: 1,
    promotionScore: 92,
    qualityScore: 95,
    timelinessScore: 88,
    budgetScore: 90,
    reliabilityScore: 94,
    riskScore: 15,
    contractorUpdateCount: 47,
    resolvedUpdateCount: 42,
    featuredEligible: true,
    optInEnabled: true,
    featuredActive: true,
    reasonCodes: ["HIGH_QUALITY", "ON_TIME"],
    suggestedActions: [],
    lastEvaluatedAt: "2026-04-03T00:00:00Z",
    minimumUpdatesRequired: 10,
    isCurrentUser: false,
  },
  {
    contractorUserId: 102,
    contractorName: "TechInfra Solutions",
    rank: 2,
    promotionScore: 87,
    qualityScore: 90,
    timelinessScore: 85,
    budgetScore: 88,
    reliabilityScore: 86,
    riskScore: 22,
    contractorUpdateCount: 35,
    resolvedUpdateCount: 30,
    featuredEligible: true,
    optInEnabled: true,
    featuredActive: false,
    reasonCodes: ["HIGH_QUALITY"],
    suggestedActions: ["Improve timeliness"],
    lastEvaluatedAt: "2026-04-03T00:00:00Z",
    minimumUpdatesRequired: 10,
    isCurrentUser: true,
  },
  {
    contractorUserId: 103,
    contractorName: "BridgeTech Corp",
    rank: 3,
    promotionScore: 81,
    qualityScore: 85,
    timelinessScore: 78,
    budgetScore: 82,
    reliabilityScore: 80,
    riskScore: 35,
    contractorUpdateCount: 28,
    resolvedUpdateCount: 22,
    featuredEligible: false,
    optInEnabled: false,
    featuredActive: false,
    reasonCodes: [],
    suggestedActions: [
      "Submit more updates",
      "Improve timeline adherence",
    ],
    lastEvaluatedAt: "2026-04-03T00:00:00Z",
    minimumUpdatesRequired: 10,
    isCurrentUser: false,
  },
  {
    contractorUserId: 104,
    contractorName: "National Build Co.",
    rank: 4,
    promotionScore: 74,
    qualityScore: 78,
    timelinessScore: 70,
    budgetScore: 75,
    reliabilityScore: 73,
    riskScore: 48,
    contractorUpdateCount: 20,
    resolvedUpdateCount: 15,
    featuredEligible: false,
    optInEnabled: false,
    featuredActive: false,
    reasonCodes: [],
    suggestedActions: [
      "Reduce risk score",
      "Improve budget adherence",
    ],
    lastEvaluatedAt: "2026-04-03T00:00:00Z",
    minimumUpdatesRequired: 10,
    isCurrentUser: false,
  },
  {
    contractorUserId: 105,
    contractorName: "GreenPath Infra",
    rank: 5,
    promotionScore: 68,
    qualityScore: 72,
    timelinessScore: 65,
    budgetScore: 70,
    reliabilityScore: 64,
    riskScore: 55,
    contractorUpdateCount: 15,
    resolvedUpdateCount: 10,
    featuredEligible: false,
    optInEnabled: false,
    featuredActive: false,
    reasonCodes: [],
    suggestedActions: [
      "Submit more updates",
      "Improve all metrics",
    ],
    lastEvaluatedAt: "2026-04-03T00:00:00Z",
    minimumUpdatesRequired: 10,
    isCurrentUser: false,
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const clearError = () => setError(null);

  const clearSession = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setPhoneNumber("");
    setProjects([]);
    setPosts([]);
    setError(null);
  };

  const handleApiError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        clearSession();
        return;
      }
      setError(err.message);
      return;
    }
    setError("Something went wrong. Please try again.");
  };

  const registerPushToken = async (tokenValue: string, authToken: string) => {
    try {
      await apiRequest<BackendNotificationRegisterResponse>(
        "/notifications/register",
        {
          method: "POST",
          token: authToken,
          body: {
            token: tokenValue,
            platform: "web",
          },
        },
      );
    } catch {}
  };

  const tryRegisterPushToken = async (authToken: string) => {
    try {
      const tokenValue = await requestMessagingToken();
      if (!tokenValue) return;
      await registerPushToken(tokenValue, authToken);
    } catch {}
  };

  const fetchProjects = async (token: string) => {
    const backendProjects = await apiRequest<BackendProject[]>("/projects", {
      method: "GET",
      token,
    });
    setProjects(backendProjects.map(mapBackendProjectToApp));
  };

  const fetchComplaints = async (token: string) => {
    const backendComplaints = await apiRequest<BackendComplaint[]>("/complaints", {
      method: "GET",
      token,
    });
    setPosts(backendComplaints.map(mapBackendComplaintToPost));
  };

  const refreshData = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchProjects(accessToken), fetchComplaints(accessToken)]);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await apiRequest<BackendMeResponse>("/auth/me", {
          method: "GET",
          token: accessToken,
        });

        if (cancelled) return;

        setIsAuthenticated(true);
        setUserRole(toAppUserRole(me.role));
        setPhoneNumber(me.phone || "");
        await Promise.all([fetchProjects(accessToken), fetchComplaints(accessToken)]);
      } catch {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const loginWithCredentials = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<BackendLoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);

      setIsAuthenticated(true);
      const role = toAppUserRole(response.user.role) || "user";
      setUserRole(role);
      setPhoneNumber(response.user.phone || "");
      await Promise.all([
        fetchProjects(response.access_token),
        fetchComplaints(response.access_token),
      ]);
      await tryRegisterPushToken(response.access_token);
      return role;
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<BackendOtpRequestResponse>(
        "/auth/request-otp",
        {
          method: "POST",
          body: { phone },
        },
      );
      setPhoneNumber(response.phone || phone);
      return {
        roleHint: response.role_hint,
        devOtp: response.dev_otp,
      };
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (phone: string) => requestOtp(phone);

  const verifyOtp = async (
    phone: string,
    otp: string,
    roleHint?: string | null,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<BackendOtpVerifyResponse>(
        "/auth/verify-otp",
        {
          method: "POST",
          body: {
            phone,
            otp,
            role: toBackendRole(roleHint),
          },
        },
      );

      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);

      setIsAuthenticated(true);
      const role = toAppUserRole(response.user.role) || "user";
      setUserRole(role);
      setPhoneNumber(response.user.phone || phone);
      await Promise.all([
        fetchProjects(response.access_token),
        fetchComplaints(response.access_token),
      ]);
      await tryRegisterPushToken(response.access_token);
      return role;
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithFirebase = async (
    idToken: string,
    roleHint?: string | null,
    phone?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<BackendFirebaseLoginResponse>(
        "/auth/firebase-login",
        {
          method: "POST",
          body: {
            id_token: idToken,
            role: toBackendRole(roleHint),
          },
        },
      );

      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);

      setIsAuthenticated(true);
      const role = toAppUserRole(response.user.role) || "user";
      setUserRole(role);
      setPhoneNumber(response.user.phone || phone || "");
      await Promise.all([
        fetchProjects(response.access_token),
        fetchComplaints(response.access_token),
      ]);
      await tryRegisterPushToken(response.access_token);
      return role;
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (role: Exclude<UserRole, null>, phone = "") => {
    setIsAuthenticated(true);
    setUserRole(role);
    setPhoneNumber(phone || phoneNumber);
  };

  const logout = () => {
    clearSession();
  };

  const requireToken = () => {
    if (!accessToken) {
      throw new Error("Not authenticated");
    }
    return accessToken;
  };

  const supportComplaint = async (complaintId: string) => {
    const token = requireToken();
    setError(null);
    try {
      const response = await apiRequest<BackendSupportResponse>(
        `/complaints/${encodeURIComponent(complaintId)}/support`,
        {
          method: "POST",
          token,
        },
      );

      setPosts((prev) =>
        prev.map((post) =>
          post.id === String(response.complaint_id)
            ? {
                ...post,
                supportCount: response.support_count,
                supportedByMe: response.supported,
              }
            : post,
        ),
      );
    } catch (err) {
      handleApiError(err);
      throw err;
    }
  };

  const unsupportComplaint = async (complaintId: string) => {
    const token = requireToken();
    setError(null);
    try {
      const response = await apiRequest<BackendSupportResponse>(
        `/complaints/${encodeURIComponent(complaintId)}/support`,
        {
          method: "DELETE",
          token,
        },
      );

      setPosts((prev) =>
        prev.map((post) =>
          post.id === String(response.complaint_id)
            ? {
                ...post,
                supportCount: response.support_count,
                supportedByMe: response.supported,
              }
            : post,
        ),
      );
    } catch (err) {
      handleApiError(err);
      throw err;
    }
  };

  const submitTextIssue = async (payload: {
    projectId: string;
    description: string;
    severity: number;
  }) => {
    const token = requireToken();
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ complaint_id: number; status: string }>(
        "/complaints/submit-text",
        {
          method: "POST",
          token,
          body: {
            project_id: Number(payload.projectId),
            description: payload.description,
            severity: payload.severity,
          },
        },
      );
      await Promise.all([fetchProjects(token), fetchComplaints(token)]);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitVoiceIssue = async (payload: {
    projectId: string;
    severity: number;
    audioBlob: Blob;
  }) => {
    const token = requireToken();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("project_id", payload.projectId);
      formData.append("severity", String(payload.severity));
      formData.append(
        "audio_file",
        payload.audioBlob,
        (payload.audioBlob as File).name || "voice_complaint.webm",
      );

      await apiRequest<{ complaint_id: number; status: string }>(
        "/complaints/submit-voice",
        {
          method: "POST",
          token,
          body: formData,
        },
      );
      await Promise.all([fetchProjects(token), fetchComplaints(token)]);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (payload: {
    projectId: string;
    imageUrl: string;
    progress: number;
    materialCost: number;
    labourCost: number;
    milestoneName: string;
    workSummary: string;
    nextAction: string;
    blockers: string;
    targetDate: string;
  }) => {
    const token = requireToken();
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ complaint_id: number; status: string }>(
        "/complaints/submit-text",
        {
          method: "POST",
          token,
          body: {
            project_id: Number(payload.projectId),
            description:
              payload.workSummary ||
              payload.milestoneName ||
              "Contractor update",
            severity: 2,
            milestone_name: payload.milestoneName || undefined,
            work_summary: payload.workSummary || undefined,
            next_action: payload.nextAction || undefined,
            blockers: payload.blockers || undefined,
            target_date: payload.targetDate || undefined,
            progress_update: payload.progress,
            material_cost: payload.materialCost,
            labour_cost: payload.labourCost,
            is_contractor_update: true,
          },
        },
      );
      await Promise.all([fetchProjects(token), fetchComplaints(token)]);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTenderLeaderboard = async () => {
    return MOCK_LEADERBOARD;
  };

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated,
      userRole,
      phoneNumber,
      loading,
      error,
      projects,
      posts,
      loginWithCredentials,
      requestOtp,
      sendOtp,
      verifyOtp,
      loginWithFirebase,
      login,
      logout,
      submitTextIssue,
      submitVoiceIssue,
      supportComplaint,
      unsupportComplaint,
      addPost,
      getTenderLeaderboard,
      refreshData,
      clearError,
    }),
    [
      isAuthenticated,
      userRole,
      phoneNumber,
      loading,
      error,
      projects,
      posts,
      accessToken,
      refreshToken,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProvider");
  return context;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
