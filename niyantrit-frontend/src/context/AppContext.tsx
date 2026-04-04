import {
  createContext,
  ReactNode,
  useEffect,
  useContext,
  useMemo,
  useState,
} from "react";
import { ApiError, apiRequest, toQueryString } from "../lib/api";

export type UserRole = "user" | "tender" | null;
export type ProjectStatus = "Pending" | "Ongoing" | "Completed";

const ACCESS_TOKEN_KEY = "niyantrit.accessToken";
const REFRESH_TOKEN_KEY = "niyantrit.refreshToken";
const ROLE_KEY = "niyantrit.userRole";
const PHONE_KEY = "niyantrit.phoneNumber";

interface ApiLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    role: string;
    phone?: string | null;
  };
}

interface ApiOtpRequestResponse {
  message: string;
  role_hint?: string | null;
  dev_otp?: string | null;
}

interface ApiProject {
  id: number;
  project_name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  total_funds: number;
  labour_cost?: number;
  material_cost?: number;
}

interface ApiComplaint {
  id: number;
  project_id: number;
  description: string;
  formal_text?: string | null;
  category?: string | null;
  status: string;
  priority: number;
  severity: number;
  created_at: string;
  created_by?: string | null;
  created_by_role?: string | null;
  milestone_name?: string | null;
  work_summary?: string | null;
  next_action?: string | null;
  blockers?: string | null;
  target_date?: string | null;
  progress_update?: number | null;
  material_cost?: number | null;
  labour_cost?: number | null;
  is_contractor_update?: boolean | null;
}

export interface Project {
  id: string;
  name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  progress: number;
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

export interface Comment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
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
}

interface NewPostInput {
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
}

interface TextIssueInput {
  projectId: string;
  description: string;
  severity: number;
}

interface VoiceIssueInput {
  projectId: string;
  severity: number;
  audioBlob: Blob;
  filename?: string;
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
  ) => Promise<{ roleHint: Exclude<UserRole, null> | null; devOtp: string | null }>;
  verifyOtp: (
    phone: string,
    otp: string,
    role: Exclude<UserRole, null>
  ) => Promise<Exclude<UserRole, null>>;
  login: (role: Exclude<UserRole, null>, phone?: string) => Promise<void>;
  logout: () => void;
  addPost: (payload: NewPostInput) => Promise<void>;
  submitTextIssue: (payload: TextIssueInput) => Promise<void>;
  submitVoiceIssue: (payload: VoiceIssueInput) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

function splitLocation(location: string) {
  const [city, ...rest] = location.split(",").map((part) => part.trim());
  return {
    city: city || "Unknown City",
    state: rest.join(", ") || "India",
  };
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function deriveCoordinates(seed: string) {
  const hash = hashSeed(seed);
  const latitude = 8 + (hash % 2800) / 100; // 8.00 - 36.00
  const longitude = 68 + ((Math.floor(hash / 10) % 2900) / 100); // 68.00 - 97.00
  return { latitude, longitude };
}

function normalizeProjectStatus(status: string): ProjectStatus {
  if (status === "Completed") return "Completed";
  if (status === "Planning" || status === "On Hold") return "Pending";
  return "Ongoing";
}

function deriveProgress(projectId: string, status: ProjectStatus) {
  if (status === "Completed") return 100;
  const basis = hashSeed(projectId) % 35;
  if (status === "Pending") return 15 + basis;
  return 50 + basis;
}

function mapApiProject(project: ApiProject): Project {
  const normalizedStatus = normalizeProjectStatus(project.status);
  const { city, state } = splitLocation(project.location || "Unknown, India");
  const coords =
    typeof project.latitude === "number" && typeof project.longitude === "number"
      ? { latitude: project.latitude, longitude: project.longitude }
      : deriveCoordinates(`${project.id}-${project.project_name}`);

  return {
    id: String(project.id),
    name: project.project_name,
    department: "Public Works",
    description: `Live backend project record for ${project.project_name}`,
    status: normalizedStatus,
    progress: deriveProgress(project.project_name, normalizedStatus),
    budget: project.total_funds,
    labourCost: project.labour_cost || 0,
    materialCost: project.material_cost || 0,
    location: {
      city,
      state,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  };
}

function derivePostProgress(complaint: ApiComplaint) {
  if (typeof complaint.progress_update === "number" && Number.isFinite(complaint.progress_update)) {
    return Math.max(0, Math.min(100, complaint.progress_update));
  }

  return Math.max(5, Math.min(95, 100 - complaint.severity * 7));
}

function mapBackendRole(role: string | null | undefined): Exclude<UserRole, null> {
  return role === "Contractor" ? "tender" : "user";
}

function mapUiRoleToBackendRole(role: Exclude<UserRole, null>): "Citizen" | "Contractor" {
  return role === "tender" ? "Contractor" : "Citizen";
}

function mapComplaintAuthorRole(role: string | null | undefined): Exclude<UserRole, null> {
  return role === "Contractor" ? "tender" : "user";
}

function mapApiComplaint(complaint: ApiComplaint): Post {
  const authorRole = mapComplaintAuthorRole(complaint.created_by_role);
  const milestoneName = complaint.milestone_name || null;
  const workSummary = complaint.work_summary || null;

  return {
    id: String(complaint.id),
    projectId: String(complaint.project_id),
    caption: workSummary || complaint.formal_text || complaint.description,
    imageUrl: `https://picsum.photos/seed/complaint-${complaint.id}/960/560`,
    authorName: complaint.created_by || "Anonymous Reporter",
    authorRole,
    createdAt: complaint.created_at,
    progress: derivePostProgress(complaint),
    materialCost: Math.max(0, complaint.material_cost || 0),
    labourCost: Math.max(0, complaint.labour_cost || 0),
    milestoneName,
    workSummary,
    nextAction: complaint.next_action || null,
    blockers: complaint.blockers || null,
    targetDate: complaint.target_date || null,
    isContractorUpdate:
      Boolean(complaint.is_contractor_update) ||
      (authorRole === "tender" && Boolean(milestoneName || workSummary)),
    complaintCategory: complaint.category || null,
    complaintStatus: complaint.status,
    severity: complaint.severity,
    priority: complaint.priority,
  };
}

function getRoleDetails(role: Exclude<UserRole, null>, phone: string) {
  const backendRole = mapUiRoleToBackendRole(role);
  const normalizedPhone = phone.replace(/\D/g, "") || "0000000000";
  const email = `${role}.${normalizedPhone}@niyantrit.local`;
  const password = `Niyantrit@${normalizedPhone}`;
  const fullName = role === "tender" ? "Contractor User" : "Citizen User";
  return { backendRole, normalizedPhone, email, password, fullName };
}

function humanizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while contacting the backend.";
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(accessToken));
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const stored = localStorage.getItem(ROLE_KEY);
    return stored === "user" || stored === "tender" ? stored : null;
  });
  const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem(PHONE_KEY) || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const loginWithCredentials = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const loginResponse = await apiRequest<ApiLoginResponse>("/auth/login", {
        method: "POST",
        body: {
          email,
          password,
        },
      });

      const resolvedRole = mapBackendRole(loginResponse.user.role);
      const resolvedPhone =
        loginResponse.user.phone?.replace(/\D/g, "") || phoneNumber || "0000000000";

      persistAuth({
        accessToken: loginResponse.access_token,
        refreshToken: loginResponse.refresh_token,
        role: resolvedRole,
        phone: resolvedPhone,
      });

      await refreshData(loginResponse.access_token);
      return resolvedRole;
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (phone: string) => {
    const normalizedPhone = phone.replace(/\D/g, "");
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<ApiOtpRequestResponse>("/auth/request-otp", {
        method: "POST",
        body: {
          phone: normalizedPhone,
        },
      });

      return {
        roleHint: response.role_hint ? mapBackendRole(response.role_hint) : null,
        devOtp: response.dev_otp || null,
      };
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (
    phone: string,
    otp: string,
    role: Exclude<UserRole, null>
  ) => {
    const normalizedPhone = phone.replace(/\D/g, "");
    const backendRole = mapUiRoleToBackendRole(role);

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<ApiLoginResponse>("/auth/verify-otp", {
        method: "POST",
        body: {
          phone: normalizedPhone,
          otp,
          role: backendRole,
        },
      });

      const resolvedRole = mapBackendRole(response.user.role);

      persistAuth({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        role: resolvedRole,
        phone: normalizedPhone,
      });

      await refreshData(response.access_token);
      return resolvedRole;
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const persistAuth = (payload: {
    accessToken: string;
    refreshToken: string;
    role: Exclude<UserRole, null>;
    phone: string;
  }) => {
    setAccessToken(payload.accessToken);
    setIsAuthenticated(true);
    setUserRole(payload.role);
    setPhoneNumber(payload.phone);

    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    localStorage.setItem(ROLE_KEY, payload.role);
    localStorage.setItem(PHONE_KEY, payload.phone);
  };

  const refreshData = async (tokenOverride?: string | null) => {
    const tokenToUse = tokenOverride ?? accessToken;
    if (!tokenToUse) return;

    setLoading(true);
    setError(null);

    try {
      const [apiProjects, apiComplaints] = await Promise.all([
        apiRequest<ApiProject[]>(`/projects${toQueryString({ limit: 200 })}`, {
          method: "GET",
          token: tokenToUse,
        }),
        apiRequest<ApiComplaint[]>(`/complaints${toQueryString({ limit: 200 })}`, {
          method: "GET",
          token: tokenToUse,
        }),
      ]);

      setProjects(apiProjects.map(mapApiProject));
      setPosts(
        apiComplaints
          .map(mapApiComplaint)
          .sort(
            (first, second) =>
              new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
          )
      );
    } catch (requestError) {
      setError(humanizeApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;

    void (async () => {
      try {
        await apiRequest<{ user_id: number }>("/auth/me", {
          method: "GET",
          token: accessToken,
        });
        await refreshData(accessToken);
      } catch {
        setAccessToken(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setPhoneNumber("");
        setProjects([]);
        setPosts([]);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(PHONE_KEY);
      }
    })();
  }, [accessToken]);

  const login = async (role: Exclude<UserRole, null>, phone = "") => {
    const details = getRoleDetails(role, phone);
    setLoading(true);
    setError(null);

    try {
      let loginResponse: ApiLoginResponse;

      try {
        loginResponse = await apiRequest<ApiLoginResponse>("/auth/login", {
          method: "POST",
          body: {
            email: details.email,
            password: details.password,
          },
        });
      } catch (loginError) {
        if (loginError instanceof ApiError && loginError.status === 401) {
          await apiRequest<{ message: string }>("/auth/register", {
            method: "POST",
            body: {
              email: details.email,
              password: details.password,
              full_name: details.fullName,
              role: details.backendRole,
              phone: details.normalizedPhone,
            },
          });

          loginResponse = await apiRequest<ApiLoginResponse>("/auth/login", {
            method: "POST",
            body: {
              email: details.email,
              password: details.password,
            },
          });
        } else {
          throw loginError;
        }
      }

      persistAuth({
        accessToken: loginResponse.access_token,
        refreshToken: loginResponse.refresh_token,
        role,
        phone: details.normalizedPhone,
      });

      await refreshData(loginResponse.access_token);
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setPhoneNumber("");
    setProjects([]);
    setPosts([]);
    setError(null);

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PHONE_KEY);
  };

  const addPost = async (payload: NewPostInput) => {
    if (!accessToken) {
      throw new Error("You must be authenticated before publishing an update.");
    }

    const projectNumericId = Number(payload.projectId);
    if (!Number.isFinite(projectNumericId)) {
      throw new Error("Invalid project selection.");
    }

    setLoading(true);
    setError(null);

    try {
      const severity = Math.max(1, Math.min(10, 10 - Math.floor(payload.progress / 10)));
      const composedDescription =
        payload.workSummary.trim() || payload.milestoneName.trim() || "Contractor milestone update";

      await apiRequest<{ complaint_id: number }>("/complaints/submit-text", {
        method: "POST",
        token: accessToken,
        body: {
          project_id: projectNumericId,
          description: composedDescription,
          severity,
          file: payload.imageUrl,
          milestone_name: payload.milestoneName,
          work_summary: payload.workSummary,
          next_action: payload.nextAction,
          blockers: payload.blockers,
          target_date: payload.targetDate,
          progress_update: payload.progress,
          material_cost: payload.materialCost,
          labour_cost: payload.labourCost,
          is_contractor_update: true,
        },
      });

      await refreshData(accessToken);
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const submitTextIssue = async (payload: TextIssueInput) => {
    if (!accessToken) {
      throw new Error("You must be authenticated before submitting an issue.");
    }

    const projectNumericId = Number(payload.projectId);
    if (!Number.isFinite(projectNumericId)) {
      throw new Error("Invalid project selection.");
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest<{ complaint_id: number }>("/complaints/submit-text", {
        method: "POST",
        token: accessToken,
        body: {
          project_id: projectNumericId,
          description: payload.description,
          severity: Math.max(1, Math.min(10, payload.severity)),
        },
      });

      await refreshData(accessToken);
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  const submitVoiceIssue = async (payload: VoiceIssueInput) => {
    if (!accessToken) {
      throw new Error("You must be authenticated before submitting an issue.");
    }

    const projectNumericId = Number(payload.projectId);
    if (!Number.isFinite(projectNumericId)) {
      throw new Error("Invalid project selection.");
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("project_id", String(projectNumericId));
      formData.append("severity", String(Math.max(1, Math.min(10, payload.severity))));
      formData.append(
        "audio_file",
        new File([payload.audioBlob], payload.filename || "complaint-audio.webm", {
          type: payload.audioBlob.type || "audio/webm",
        })
      );

      await apiRequest<{ complaint_id: number }>("/complaints/submit-voice", {
        method: "POST",
        token: accessToken,
        body: formData,
      });

      await refreshData(accessToken);
    } catch (requestError) {
      setError(humanizeApiError(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
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
      verifyOtp,
      login,
      logout,
      addPost,
      submitTextIssue,
      submitVoiceIssue,
      refreshData: () => refreshData(),
      clearError,
    }),
    [isAuthenticated, userRole, phoneNumber, loading, error, projects, posts]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}
