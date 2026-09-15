import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Building2,
  FolderGit2,
  Users,
  Cpu,
  Rocket,
  ShieldCheck,
  TrendingUp,
  FileText,
  Bell,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Plus,
  X,
  UploadCloud,
  Check,
  Send,
  Sparkles,
  MapPin,
  Calendar,
  LogOut,
  Sliders,
  Eye,
  ArrowLeft,
  ChevronDown,
  BookOpen,
  Beaker,
  Award,
  Target,
  LayoutDashboard,
  FileCheck,
  ShieldAlert,
  MessageSquare,
  Handshake,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { CollaborationChatModal } from "./CollaborationChatModal";

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export interface UniversityDashboardProps {
  user: User | null;
  profile: any;
  institution: any;
  go: (screen: any) => void;
  flash: (msg: string) => void;
  logout: () => void;
}

interface RealInstitution {
  id: string;
  owner_id: string;
  institution_code: string;
  legal_name: string;
  short_name: string;
  aishe_code: string;
  aishe_verification_status: string;
  institution_type: string;
  institution_category: string;
  ownership: string;
  establishment_year: number;
  website: string;
  institutional_domain: string;
  nodal_officer_name: string;
  nodal_officer_designation: string;
  nodal_officer_department: string;
  nodal_officer_email: string;
  nodal_officer_mobile: string;
  campus_building: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  academic_departments: string[];
  research_domains: Record<string, string[]>;
  research_facilities: Array<{ name: string; capacity?: string; description?: string }>;
  field_capability: {
    deployment_radius_km?: number;
    preferred_districts?: string[];
    field_transport_available?: boolean;
  };
  academic_credit_info: {
    capstone_course_code?: string;
    credit_value?: number;
    faculty_mentor_required?: boolean;
  };
  registration_status: "DRAFT" | "SUBMITTED" | "UNDER_VERIFICATION" | "ACTION_REQUIRED" | "VERIFIED" | "SUSPENDED" | "REJECTED";
}

interface AcademicProblemStatement {
  id: string;
  public_id: string;
  track: "A" | "B";
  title: string;
  summary: string;
  domain: string;
  subdomain?: string;
  district: string;
  block?: string;
  locality?: string;
  severity: number;
  urgency: number;
  affected_population?: number;
  required_skills: string[];
  priority_score: number;
  priority_level: string;
  verification: string;
  stage: string;
  technical_scope?: string;
  expected_outcome?: string;
  constraints?: string;
  government_data?: string;
  regulatory_requirements?: string;
  safety_requirements?: string;
  pilot_requirements?: string;
  evaluation_criteria?: string;
  responsible_department?: string;
  academic_title?: string;
  current_trl?: number;
  target_trl?: number;
  created_at: string;
}

interface ResearchProject {
  id: string;
  challenge_id: string;
  institution_id?: string;
  faculty_lead_id?: string;
  faculty_lead_name?: string;
  title: string;
  objective: string;
  expected_outcome?: string;
  health_score: number;
  stage: string;
  current_trl: number;
  start_date?: string;
  expected_completion_date?: string;
  academic_credit_course_code?: string;
  academic_credit_value?: number;
  created_at: string;
  challenge?: {
    public_id: string;
    title: string;
    domain: string;
    district: string;
    target_trl?: number;
    responsible_department?: string;
  };
}

interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: "mentor" | "lead" | "member" | "advisor";
  joined_at: string;
  department?: string;
  responsibilities?: string;
  profile?: {
    display_name: string;
    role: string;
  };
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "OVERDUE";
  completion_percentage: number;
  evidence_url?: string;
  comments?: string;
  created_at: string;
}

interface Prototype {
  id: string;
  project_id: string;
  name?: string;
  version: string;
  description?: string;
  technology?: string;
  repository_url?: string;
  evidence_path?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface Pilot {
  id: string;
  project_id: string;
  pilot_name?: string;
  location_text: string;
  starts_on?: string;
  ends_on?: string;
  target_population?: number;
  baseline?: string;
  target?: string;
  observed_result?: string;
  status: string;
  current_trl?: number;
  target_trl?: number;
  technical_validation_status?: string;
  validation_notes?: string;
  validated_by?: string;
  validated_at?: string;
}

interface ImpactObservation {
  id: string;
  project_id: string;
  metric: string;
  unit: string;
  baseline?: number;
  target?: number;
  observed?: number;
  source: string;
  verification_status: string;
  created_at: string;
}

interface AcademicApplication {
  id: string;
  challenge_id: string;
  institution_id: string;
  applicant_id: string;
  faculty_lead_name: string;
  department: string;
  proposal_summary: string;
  proposed_timeline?: string;
  status: "applied" | "under_review" | "assigned" | "rejected";
  reviewer_notes?: string;
  created_at: string;
}

interface InstitutionMember {
  id: string;
  institution_id: string;
  profile_id?: string;
  name: string;
  email: string;
  role: "faculty" | "student" | "researcher" | "lab_technician";
  department: string;
  specialization?: string;
  status: "active" | "invited" | "inactive";
  joined_at: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read_at: string | null;
  link?: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: any;
  created_at: string;
  actor_name?: string;
}

// Error Boundary
class UniversityErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error("UniversityDashboard Error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-[#f6fbf8] text-[#17231b] font-sans">
          <div className="p-8 bg-white border border-[#0B5D2A]/15 rounded-2xl max-w-md shadow-sm space-y-3">
            <div className="h-12 w-12 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-[#0B5D2A] font-display">University Portal Notice</h3>
            <p className="text-xs text-[#66736b]">
              {this.state.error?.message || "An unexpected error occurred while loading the institutional workspace."}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onReset();
                }}
                className="px-4 py-2 bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function UniversityDashboard({
  user,
  profile,
  institution: initialInstitution,
  go,
  flash,
  logout,
}: UniversityDashboardProps) {
  return (
    <UniversityErrorBoundary onReset={() => window.location.reload()}>
      <UniversityDashboardInner
        user={user}
        profile={profile}
        institution={initialInstitution}
        go={go}
        flash={flash}
        logout={logout}
      />
    </UniversityErrorBoundary>
  );
}

function UniversityDashboardInner({
  user,
  profile,
  institution: initialInstitution,
  go,
  flash,
  logout,
}: UniversityDashboardProps) {
  // Navigation State (10 Simple Sidebar Sections)
  const [activeNav, setActiveNav] = useState<
    | "dashboard"
    | "academic-problems"
    | "my-projects"
    | "research-team"
    | "prototypes"
    | "field-pilots"
    | "impact"
    | "notifications"
    | "institution-profile"
    | "activity"
  >("dashboard");

  // Sub-filters
  const [apsFilter, setApsFilter] = useState<"recommended" | "open" | "applied" | "assigned">("recommended");
  const [projectsFilter, setProjectsFilter] = useState<"active" | "completed">("active");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectWorkspaceTab, setProjectWorkspaceTab] = useState<
    "overview" | "team" | "milestones" | "prototype" | "pilot" | "evidence" | "impact" | "collaboration"
  >("overview");

  // Collaboration State
  const [projectCollaborations, setProjectCollaborations] = useState<any[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<any[]>([]);
  const [activeChatCollab, setActiveChatCollab] = useState<{
    collaborationId: string;
    projectId: string;
    projectTitle: string;
    requestingOrgName: string;
    targetOrgName: string;
    isCompleted?: boolean;
  } | null>(null);
  const [showRequestCollabModal, setShowRequestCollabModal] = useState(false);
  const [collabTargetOrgId, setCollabTargetOrgId] = useState("");
  const [collabMessage, setCollabMessage] = useState("");
  const [submittingCollab, setSubmittingCollab] = useState(false);

  // Real Supabase Data State (Zero Mock Data)
  const [institution, setInstitution] = useState<RealInstitution | null>(initialInstitution);
  const [challenges, setChallenges] = useState<AcademicProblemStatement[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [impactObservations, setImpactObservations] = useState<ImpactObservation[]>([]);
  const [applications, setApplications] = useState<AcademicApplication[]>([]);
  const [institutionMembers, setInstitutionMembers] = useState<InstitutionMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");

  // Modals
  const [selectedApsModal, setSelectedApsModal] = useState<AcademicProblemStatement | null>(null);
  const [applyModalAps, setApplyModalAps] = useState<AcademicProblemStatement | null>(null);
  const [applyForm, setApplyForm] = useState({
    facultyLead: profile?.display_name || "",
    department: "",
    proposalSummary: "",
    timeline: "6 Months",
  });
  const [submittingApply, setSubmittingApply] = useState(false);

  const [createMilestoneModal, setCreateMilestoneModal] = useState(false);
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    title: "",
    description: "",
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    status: "NOT_STARTED" as "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED",
  });

  const [createPrototypeModal, setCreatePrototypeModal] = useState(false);
  const [newProtoForm, setNewProtoForm] = useState({
    name: "",
    version: "v0.1.0",
    description: "",
    technology: "",
    repositoryUrl: "",
    status: "PROTOTYPE",
  });

  const [measurementModal, setMeasurementModal] = useState<Pilot | null>(null);
  const [observedMeasurement, setObservedMeasurement] = useState("");
  const [validationNotes, setValidationNotes] = useState("");

  const [createMemberModal, setCreateMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    role: "faculty" as "faculty" | "student" | "researcher",
    department: "",
    specialization: "",
  });

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // User role determination
  const userRole = String(profile?.role || "").trim().toLowerCase();
  const isVerified = institution?.registration_status === "VERIFIED" || userRole === "admin";

  // ==========================================
  // DATA LOADING (100% REAL SUPABASE ROWS)
  // ==========================================
  const loadAllData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setRefreshing(true);

    try {
      // 1. Refresh institution profile
      let currentInst = institution;
      if (user) {
        const { data: instData } = await supabase
          .from("institutions")
          .select("*")
          .or(`owner_id.eq.${user.id},nodal_officer_email.eq.${user.email}`)
          .maybeSingle();

        if (instData) {
          currentInst = instData as RealInstitution;
          setInstitution(instData as RealInstitution);
        }
      }

      // 2. Load Track B Academic Problem Statements
      const { data: challengesData, error: chError } = await supabase
        .from("challenges")
        .select("*")
        .eq("track", "B")
        .order("priority_score", { ascending: false });

      if (chError) console.error("Error loading Track B challenges:", chError);
      else setChallenges((challengesData || []) as AcademicProblemStatement[]);

      // 3. Load Projects linked to this institution
      let instProjects: ResearchProject[] = [];
      if (currentInst?.id) {
        const { data: pData, error: pError } = await supabase
          .from("projects")
          .select(`
            *,
            challenge:challenges(public_id, title, domain, district, target_trl, responsible_department)
          `)
          .eq("institution_id", currentInst.id)
          .order("created_at", { ascending: false });

        if (pError) console.error("Error loading projects:", pError);
        else {
          instProjects = (pData || []) as ResearchProject[];
          setProjects(instProjects);
        }
      } else {
        setProjects([]);
      }

      const projectIds = instProjects.map((p) => p.id);

      // 4. Load Project Members
      if (projectIds.length > 0) {
        const { data: mData } = await supabase
          .from("project_members")
          .select(`
            *,
            profile:profiles(display_name, role)
          `)
          .in("project_id", projectIds);
        setProjectMembers((mData || []) as ProjectMember[]);

        // 5. Load Milestones
        const { data: msData } = await supabase
          .from("milestones")
          .select("*")
          .in("project_id", projectIds)
          .order("due_date", { ascending: true });
        setMilestones((msData || []) as Milestone[]);

        // 6. Load Prototypes
        const { data: protoData } = await supabase
          .from("prototypes")
          .select("*")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });
        setPrototypes((protoData || []) as Prototype[]);

        // 7. Load Field Pilots
        const { data: pilotData } = await supabase
          .from("pilots")
          .select("*")
          .in("project_id", projectIds)
          .order("starts_on", { ascending: false });
        setPilots((pilotData || []) as Pilot[]);

        // 8. Load Impact Observations
        const { data: impactData } = await supabase
          .from("impact_observations")
          .select("*")
          .in("project_id", projectIds);
        setImpactObservations((impactData || []) as ImpactObservation[]);
      } else {
        setProjectMembers([]);
        setMilestones([]);
        setPrototypes([]);
        setPilots([]);
        setImpactObservations([]);
      }

      // 9. Load Applications
      if (currentInst?.id) {
        const { data: appData } = await supabase
          .from("academic_problem_applications")
          .select("*")
          .eq("institution_id", currentInst.id)
          .order("created_at", { ascending: false });
        setApplications((appData || []) as AcademicApplication[]);

        // 10. Load Institutional Roster Members
        const { data: imData } = await supabase
          .from("institution_members")
          .select("*")
          .eq("institution_id", currentInst.id)
          .order("joined_at", { ascending: false });
        setInstitutionMembers((imData || []) as InstitutionMember[]);
      }

      // 11. Load Notifications
      if (user) {
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(25);
        setNotifications((notifData || []) as NotificationItem[]);
      }

      // 12. Load Audit Logs / Activity
      if (currentInst?.id) {
        const { data: logData } = await supabase
          .from("audit_logs")
          .select("*")
          .or(`entity_id.eq.${currentInst.id},metadata->>institution_id.eq.${currentInst.id}`)
          .order("created_at", { ascending: false })
          .limit(30);
        setAuditLogs((logData || []) as AuditLog[]);
      }
    } catch (err: any) {
      console.error("loadAllData exception:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, [user?.id, initialInstitution?.id]);

  // Load collaborations for active workspace project
  const loadProjectCollaborations = async (projId: string) => {
    if (!supabase || !projId) return;
    try {
      const { data } = await supabase
        .from("organization_collaborations")
        .select(`
          id,
          project_id,
          challenge_id,
          requesting_org_id,
          target_org_id,
          request_message,
          status,
          created_at,
          responded_at,
          requesting_org:organization_accounts!requesting_org_id(id, name, organization_type),
          target_org:organization_accounts!target_org_id(id, name, organization_type)
        `)
        .eq("project_id", projId)
        .order("created_at", { ascending: false });
      setProjectCollaborations(data || []);
    } catch (err) {
      console.warn("loadProjectCollaborations failed:", err);
    }
  };

  const loadAvailableOrganizations = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("organization_accounts")
        .select("id, name, organization_type, district")
        .order("name", { ascending: true });
      setAvailableOrganizations(data || []);
    } catch (err) {
      console.warn("loadAvailableOrganizations failed:", err);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      void loadProjectCollaborations(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleRespondCollaboration = async (collabId: string, newStatus: "Accepted" | "Rejected") => {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase
        .from("organization_collaborations")
        .update({
          status: newStatus,
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq("id", collabId);

      if (error) throw error;
      flash(`Collaboration request has been ${newStatus.toLowerCase()}.`);
      if (selectedProjectId) void loadProjectCollaborations(selectedProjectId);
    } catch (err: any) {
      flash(`Error: ${err.message || "Failed to update request"}`);
    }
  };

  const handleSendCollaborationRequest = async () => {
    if (!supabase || !selectedProjectId || !collabTargetOrgId || !collabMessage.trim() || !user) return;
    setSubmittingCollab(true);
    try {
      let myOrgId = institution?.id;
      const { data: myOrg } = await supabase
        .from("organization_accounts")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (myOrg?.id) myOrgId = myOrg.id;

      if (!myOrgId) {
        const { data: newOrg } = await supabase
          .from("organization_accounts")
          .upsert({
            owner_id: user.id,
            name: institution?.legal_name || institution?.short_name || profile?.display_name || "Academic Institution",
            organization_type: "University",
            district: institution?.district || profile?.district || "",
          }, { onConflict: "owner_id" })
          .select("id")
          .single();
        if (newOrg?.id) myOrgId = newOrg.id;
      }

      if (!myOrgId) throw new Error("Could not determine organization identity.");

      const pr = projects.find((p) => p.id === selectedProjectId);
      const { error } = await supabase.from("organization_collaborations").insert({
        project_id: selectedProjectId,
        challenge_id: pr?.challenge_id || null,
        requesting_org_id: myOrgId,
        target_org_id: collabTargetOrgId,
        request_message: collabMessage.trim(),
        status: "Pending",
      });

      if (error) throw error;
      flash("Collaboration request sent successfully.");
      setShowRequestCollabModal(false);
      setCollabMessage("");
      setCollabTargetOrgId("");
      void loadProjectCollaborations(selectedProjectId);
    } catch (err: any) {
      flash(`Error: ${err.message || "Failed to send request"}`);
    } finally {
      setSubmittingCollab(false);
    }
  };


  // Safe Name Extraction Helpers
  const getFacilityName = (f: any): string => {
    if (!f) return "";
    if (typeof f === "string") return f;
    if (typeof f === "object" && f.name) return String(f.name);
    return String(f);
  };

  const getDeptName = (d: any): string => {
    if (!d) return "";
    if (typeof d === "string") return d;
    if (typeof d === "object" && d.name) return String(d.name);
    return String(d);
  };

  // ==========================================
  // DETERMINISTIC CAPABILITY MATCHING
  // ==========================================
  const matchEvaluation = useMemo(() => {
    const instDepts = (institution?.academic_departments || [])
      .map((d) => getDeptName(d).toLowerCase())
      .filter(Boolean);
    const instFacilities = (institution?.research_facilities || [])
      .map((f) => getFacilityName(f).toLowerCase())
      .filter(Boolean);
    const instDomains: string[] = [];
    if (institution?.research_domains && typeof institution.research_domains === "object") {
      Object.entries(institution.research_domains).forEach(([dept, list]) => {
        if (dept) instDomains.push(String(dept).toLowerCase());
        if (Array.isArray(list)) {
          list.forEach((sub) => {
            if (sub) instDomains.push(String(sub).toLowerCase());
          });
        }
      });
    }

    const matchesMap: Record<
      string,
      { isMatch: boolean; reasons: string[]; matchedFacility?: string | undefined; matchedDept?: string | undefined }
    > = {};

    challenges.forEach((ch) => {
      const reasons: string[] = [];
      const chDomain = String(ch?.domain || "").toLowerCase();
      const chSkills = (ch?.required_skills || []).map((s) => String(s || "").toLowerCase());
      const chText = `${ch?.title || ""} ${ch?.summary || ""} ${ch?.technical_scope || ""}`.toLowerCase();

      // Department Match
      const matchedDept = instDepts.find((dept) => dept && (chDomain.includes(dept) || dept.includes(chDomain)));
      if (matchedDept) {
        const origDept = institution?.academic_departments?.find(
          (d) => getDeptName(d).toLowerCase() === matchedDept
        );
        reasons.push(getDeptName(origDept) || "Department Match");
      }

      // Research Domain Match
      const matchedDomain = instDomains.find((dom) => dom && (chDomain.includes(dom) || chText.includes(dom)));
      if (matchedDomain && !reasons.some((r) => r.toLowerCase() === matchedDomain)) {
        reasons.push(matchedDomain.charAt(0).toUpperCase() + matchedDomain.slice(1));
      }

      // Facility Match
      const matchedFac = instFacilities.find(
        (fac) =>
          fac &&
          (chText.includes(fac) ||
            chSkills.some((s) => s && fac.includes(s)) ||
            (fac.includes("water") && chDomain.includes("water")) ||
            (fac.includes("lab") && chText.includes("lab")))
      );
      if (matchedFac) {
        const origFac = institution?.research_facilities?.find(
          (f) => getFacilityName(f).toLowerCase() === matchedFac
        );
        reasons.push(getFacilityName(origFac) || "Laboratory Capability");
      }

      const isMatch = reasons.length > 0;
      matchesMap[ch.id] = {
        isMatch,
        reasons: isMatch ? reasons.slice(0, 3) : ["General Civic R&D"],
        matchedFacility: matchedFac,
        matchedDept,
      };
    });

    return matchesMap;
  }, [institution, challenges]);

  // ==========================================
  // TOP 5 REAL KPIS (ZERO MOCK DATA)
  // ==========================================
  const kpis = useMemo(() => {
    const availableAps = challenges.length;
    const activeProjects = projects.filter((p) => p.stage !== "completed" && p.stage !== "cancelled").length;
    const completedProjects = projects.filter((p) => p.stage === "completed").length;
    const activePilots = pilots.filter((pi) => pi.status === "active" || pi.status === "monitoring").length;

    // Actionable pending items: overdue milestones, pending pilot updates, applications under review
    const overdueMilestones = milestones.filter(
      (m) => m.status === "OVERDUE" || (m.due_date && new Date(m.due_date) < new Date() && m.status !== "COMPLETED")
    ).length;
    const pendingPilotReports = pilots.filter((p) => !p.observed_result && p.status === "active").length;
    const pendingApps = applications.filter((a) => a.status === "applied" || a.status === "under_review").length;
    const pendingActions = overdueMilestones + pendingPilotReports + pendingApps;

    return {
      availableAps,
      activeProjects,
      activePilots,
      pendingActions,
      completedProjects,
    };
  }, [challenges, projects, pilots, milestones, applications]);

  // Attention Items
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      reason: string;
      date: string;
      type: "milestone" | "pilot" | "application" | "validation";
      projectId?: string;
      challengeId?: string;
    }> = [];

    // Overdue milestones
    milestones.forEach((m) => {
      const isOverdue =
        m.status === "OVERDUE" ||
        (m.due_date && new Date(m.due_date) < new Date() && m.status !== "COMPLETED");
      if (isOverdue) {
        const pr = projects.find((p) => p.id === m.project_id);
        items.push({
          id: `m-${m.id}`,
          title: pr?.title || "Research Project",
          reason: `Milestone "${m.title}" is overdue`,
          date: m.due_date || "Past due",
          type: "milestone",
          projectId: m.project_id,
        });
      }
    });

    // Active pilots needing measurement
    pilots.forEach((pi) => {
      if (pi.status === "active" && !pi.observed_result) {
        const pr = projects.find((p) => p.id === pi.project_id);
        items.push({
          id: `pi-${pi.id}`,
          title: pr?.title || pi.pilot_name || "Field Pilot Testbed",
          reason: "Field monitoring update required (no observed measurement recorded)",
          date: pi.starts_on || "Active",
          type: "pilot",
          projectId: pi.project_id,
        });
      }
    });

    // Review feedback received
    pilots.forEach((pi) => {
      if (pi.validation_notes && pi.technical_validation_status === "feedback_provided") {
        const pr = projects.find((p) => p.id === pi.project_id);
        items.push({
          id: `val-${pi.id}`,
          title: pr?.title || "Project Validation",
          reason: `Line Department Feedback: "${pi.validation_notes}"`,
          date: pi.validated_at || "Recent",
          type: "validation",
          projectId: pi.project_id,
        });
      }
    });

    return items.slice(0, 5);
  }, [milestones, pilots, projects]);

  // Recommended Challenges
  const recommendedChallenges = useMemo(() => {
    return challenges.filter((c) => matchEvaluation[c.id]?.isMatch);
  }, [challenges, matchEvaluation]);

  // Filtered Academic Problems
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Sub-filter
      if (apsFilter === "recommended" && !matchEvaluation[c.id]?.isMatch) return false;
      if (apsFilter === "applied" && !applications.some((a) => a.challenge_id === c.id)) return false;
      if (apsFilter === "assigned" && !projects.some((p) => p.challenge_id === c.id)) return false;

      // Category / Domain
      if (selectedDomain !== "all" && c.domain !== selectedDomain) return false;
      // District
      if (selectedDistrict !== "all" && c.district !== selectedDistrict) return false;
      // Priority
      if (selectedPriority !== "all" && c.priority_level !== selectedPriority) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          String(c?.title || "").toLowerCase().includes(q) ||
          String(c?.summary || "").toLowerCase().includes(q) ||
          String(c?.public_id || "").toLowerCase().includes(q) ||
          String(c?.academic_title || "").toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      return true;
    });
  }, [challenges, apsFilter, matchEvaluation, applications, projects, selectedDomain, selectedDistrict, selectedPriority, searchQuery]);

  // Unique domains and districts for dropdowns
  const uniqueDomains = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => c.domain && set.add(c.domain));
    return Array.from(set);
  }, [challenges]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => c.district && set.add(c.district));
    return Array.from(set);
  }, [challenges]);

  // Active vs Completed Projects
  const filteredProjects = useMemo(() => {
    if (projectsFilter === "completed") {
      return projects.filter((p) => p.stage === "completed");
    }
    return projects.filter((p) => p.stage !== "completed" && p.stage !== "cancelled");
  }, [projects, projectsFilter]);

  // Selected Project for workspace
  const activeWorkspaceProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Project-specific items
  const activeProjectMembers = useMemo(() => {
    if (!selectedProjectId) return [];
    return projectMembers.filter((m) => m.project_id === selectedProjectId);
  }, [projectMembers, selectedProjectId]);

  const activeProjectMilestones = useMemo(() => {
    if (!selectedProjectId) return [];
    return milestones.filter((m) => m.project_id === selectedProjectId);
  }, [milestones, selectedProjectId]);

  const activeProjectPrototypes = useMemo(() => {
    if (!selectedProjectId) return [];
    return prototypes.filter((p) => p.project_id === selectedProjectId);
  }, [prototypes, selectedProjectId]);

  const activeProjectPilots = useMemo(() => {
    if (!selectedProjectId) return [];
    return pilots.filter((p) => p.project_id === selectedProjectId);
  }, [pilots, selectedProjectId]);

  const activeProjectImpact = useMemo(() => {
    if (!selectedProjectId) return [];
    return impactObservations.filter((i) => i.project_id === selectedProjectId);
  }, [impactObservations, selectedProjectId]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const handleApplyAps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalAps || !institution || !supabase || !user) return;
    setSubmittingApply(true);

    try {
      const { error } = await supabase.from("academic_problem_applications").insert({
        challenge_id: applyModalAps.id,
        institution_id: institution.id,
        applicant_id: user.id,
        faculty_lead_name: applyForm.facultyLead || profile?.display_name || "Faculty Lead",
        department: applyForm.department || institution.academic_departments[0] || "Engineering",
        proposal_summary: applyForm.proposalSummary,
        proposed_timeline: applyForm.timeline,
        status: "applied",
      });

      if (error) throw error;

      flash("Application submitted successfully. Under review by Department & PRI/ULB authorities.");
      setApplyModalAps(null);
      setApplyForm({
        facultyLead: profile?.display_name || "",
        department: "",
        proposalSummary: "",
        timeline: "6 Months",
      });
      void loadAllData();
    } catch (err: any) {
      flash("Error submitting proposal: " + err.message);
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleUpdateMilestoneStatus = async (
    milestoneId: string,
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  ) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("milestones")
        .update({
          status,
          completion_percentage: status === "COMPLETED" ? 100 : status === "IN_PROGRESS" ? 50 : 0,
        })
        .eq("id", milestoneId);

      if (error) throw error;
      flash(`Milestone marked as ${status.replace("_", " ")}`);
      void loadAllData();
    } catch (err: any) {
      flash("Failed to update milestone: " + err.message);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !supabase || !user) return;

    try {
      const { error } = await supabase.from("milestones").insert({
        project_id: selectedProjectId,
        title: newMilestoneForm.title,
        description: newMilestoneForm.description,
        owner_id: user.id,
        start_date: newMilestoneForm.startDate,
        due_date: newMilestoneForm.dueDate || null,
        status: newMilestoneForm.status,
        completion_percentage: newMilestoneForm.status === "COMPLETED" ? 100 : 0,
      });

      if (error) throw error;
      flash("Research milestone added.");
      setCreateMilestoneModal(false);
      setNewMilestoneForm({
        title: "",
        description: "",
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        status: "NOT_STARTED",
      });
      void loadAllData();
    } catch (err: any) {
      flash("Failed to create milestone: " + err.message);
    }
  };

  const handleCreatePrototype = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !supabase || !user) return;

    try {
      const { error } = await supabase.from("prototypes").insert({
        project_id: selectedProjectId,
        name: newProtoForm.name || "Research Prototype",
        version: newProtoForm.version,
        description: newProtoForm.description,
        technology: newProtoForm.technology,
        repository_url: newProtoForm.repositoryUrl || null,
        status: newProtoForm.status,
        created_by: user.id,
      });

      if (error) throw error;
      flash("Prototype artifact registered.");
      setCreatePrototypeModal(false);
      setNewProtoForm({
        name: "",
        version: "v0.1.0",
        description: "",
        technology: "",
        repositoryUrl: "",
        status: "PROTOTYPE",
      });
      void loadAllData();
    } catch (err: any) {
      flash("Failed to register prototype: " + err.message);
    }
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measurementModal || !supabase) return;

    try {
      const { error } = await supabase
        .from("pilots")
        .update({
          observed_result: observedMeasurement,
          validation_notes: validationNotes || measurementModal.validation_notes,
        })
        .eq("id", measurementModal.id);

      if (error) throw error;
      flash("Observed measurement recorded. Ready for Technical Validation.");
      setMeasurementModal(null);
      setObservedMeasurement("");
      setValidationNotes("");
      void loadAllData();
    } catch (err: any) {
      flash("Failed to update pilot measurement: " + err.message);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile || !selectedProjectId || !supabase || !user) return;
    setUploadingEvidence(true);

    try {
      const fileExt = evidenceFile.name.split(".").pop();
      const fileName = `projects/${selectedProjectId}/${Date.now()}_${evidenceFile.name.replace(/\s+/g, "_")}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("evidence")
        .upload(fileName, evidenceFile);

      if (uploadErr) throw uploadErr;

      // Update prototype or audit log with evidence path
      flash(`Evidence file "${evidenceFile.name}" uploaded successfully.`);
      setEvidenceFile(null);
      void loadAllData();
    } catch (err: any) {
      flash("Upload failed: " + err.message);
    } finally {
      setUploadingEvidence(false);
    }
  };

  // ==========================================
  // SIDEBAR NAVIGATION ITEMS (10 SIMPLE SECTIONS)
  // ==========================================
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "academic-problems", label: "Academic Problems", icon: BookOpen, count: kpis.availableAps },
    { id: "my-projects", label: "My Projects", icon: FolderGit2, count: kpis.activeProjects },
    { id: "research-team", label: "Research Team", icon: Users },
    { id: "prototypes", label: "Prototypes", icon: Cpu },
    { id: "field-pilots", label: "Field Pilots", icon: Rocket, count: kpis.activePilots },
    { id: "impact", label: "Impact", icon: TrendingUp },
    { id: "notifications", label: "Notifications", icon: Bell, count: notifications.filter((n) => !n.read_at).length },
    { id: "institution-profile", label: "Institution Profile", icon: Building2 },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#f6fbf8] text-[#17231b] font-sans flex flex-col md:flex-row">
      {/* ========================================== */}
      {/* SIDEBAR (CLEAN 10-ITEM SAMAJ SETU NAV)     */}
      {/* ========================================== */}
      <aside className="w-full md:w-64 bg-white border-r border-[#ddebe2] flex flex-col shrink-0">
        {/* Brand & Institution Badge */}
        <div className="p-4 border-b border-[#ddebe2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20 flex items-center justify-center font-bold">
              <GraduationCap size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-[#0B5D2A] font-display block leading-tight">
                Samaj Setu
              </span>
              <span className="text-[10px] text-[#66736b] font-medium tracking-wide uppercase">
                University Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => void loadAllData()}
            title="Refresh"
            className="p-1.5 rounded-lg border border-[#ddebe2] text-[#66736b] hover:text-[#0B5D2A] hover:bg-[#f6fbf8] transition"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#168a45]" : ""} />
          </button>
        </div>

        {/* 10 Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id as any);
                  if (item.id === "my-projects" && !selectedProjectId && projects.length > 0) {
                    // reset workspace if clicking sidebar
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#eaf7ef] text-[#0B5D2A] font-bold border-l-4 border-[#168a45]"
                    : "text-[#66736b] hover:bg-[#f6fbf8] hover:text-[#0B5D2A]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? "text-[#168a45]" : "text-[#66736b]"} />
                  <span>{item.label}</span>
                </div>
                {typeof item.count === "number" && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-[#168a45] text-white" : "bg-[#ddebe2] text-[#17231b]"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-[#ddebe2] bg-[#f6fbf8]/70">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-bold text-[#17231b] truncate">
                {profile?.display_name || user?.email?.split("@")[0] || "Faculty Lead"}
              </p>
              <p className="text-[10px] text-[#66736b] truncate capitalize">
                {userRole.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-[#ddebe2] bg-white text-[#66736b] hover:text-red-600 hover:border-red-200 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MAIN CONTENT AREA                          */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP INSTITUTIONAL HEADER BAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#ddebe2] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#0B5D2A] font-display tracking-tight">
                {institution?.legal_name || "Higher Education Institution"}
              </h1>
              {institution?.short_name && (
                <span className="px-2 py-0.5 rounded-md bg-[#eaf7ef] border border-[#0B5D2A]/15 text-[#0B5D2A] text-xs font-bold">
                  {institution.short_name}
                </span>
              )}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                  <span>✓ Institution Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                  <Clock size={12} className="text-amber-700" />
                  <span>Under Verification</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#66736b] mt-0.5">
              <span>AISHE: <strong className="text-[#17231b]">{institution?.aishe_code || "U-XXXX"}</strong></span>
              <span>•</span>
              <span>District: <strong className="text-[#17231b]">{institution?.district || "N/A"}</strong></span>
              <span>•</span>
              <span>Nodal Officer: <strong className="text-[#17231b]">{institution?.nodal_officer_name || "Assigned"}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setActiveNav("notifications")}
              className="relative p-2 rounded-xl border border-[#ddebe2] bg-white text-[#66736b] hover:text-[#0B5D2A] hover:bg-[#f6fbf8] transition"
              title="Notifications"
            >
              <Bell size={15} />
              {notifications.filter((n) => !n.read_at).length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#168a45] text-white text-[9px] font-bold flex items-center justify-center">
                  {notifications.filter((n) => !n.read_at).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveNav("academic-problems")}
              className="px-3.5 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Search size={13} />
              <span>Explore Problems</span>
            </button>
          </div>
        </header>

        {/* BODY CONTAINER */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ========================================== */}
          {/* VIEW 1: DASHBOARD HOME                     */}
          {/* ========================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-6">
              {/* WELCOME BANNER */}
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0B5D2A] font-display">
                    Good afternoon, {institution?.short_name || institution?.legal_name?.split(" ")[0] || "University"} Research Team
                  </h2>
                  <p className="text-xs text-[#66736b] mt-0.5">
                    Turn civic challenges into real research, prototypes, field pilots, and validated community impact.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#eaf7ef] border border-[#0B5D2A]/20 text-[#0B5D2A] text-xs font-bold self-start sm:self-auto">
                  Research & Field Validation Partner
                </span>
              </div>

              {/* TOP 5 CALCULATED REAL KPI CARDS (ZERO MOCK DATA) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <KpiCard
                  title="Available Problems"
                  value={kpis.availableAps}
                  subtitle="Track B Civic R&D"
                  icon={<BookOpen size={18} className="text-[#168a45]" />}
                  onClick={() => {
                    setActiveNav("academic-problems");
                    setApsFilter("recommended");
                  }}
                />
                <KpiCard
                  title="Active Projects"
                  value={kpis.activeProjects}
                  subtitle="Faculty + Student Led"
                  icon={<FolderGit2 size={18} className="text-[#168a45]" />}
                  onClick={() => {
                    setActiveNav("my-projects");
                    setProjectsFilter("active");
                  }}
                />
                <KpiCard
                  title="Active Pilots"
                  value={kpis.activePilots}
                  subtitle="Ground Testbeds"
                  icon={<Rocket size={18} className="text-amber-700" />}
                  onClick={() => setActiveNav("field-pilots")}
                />
                <KpiCard
                  title="Pending Actions"
                  value={kpis.pendingActions}
                  subtitle="Requires Attention"
                  icon={<AlertCircle size={18} className="text-red-700" />}
                  onClick={() => setActiveNav("notifications")}
                />
                <KpiCard
                  title="Completed Projects"
                  value={kpis.completedProjects}
                  subtitle="Validated Outcomes"
                  icon={<CheckCircle2 size={18} className="text-[#0B5D2A]" />}
                  onClick={() => {
                    setActiveNav("my-projects");
                    setProjectsFilter("completed");
                  }}
                />
              </div>

              {/* SMALL UNOBTRUSIVE ACADEMIC RESEARCH WORKFLOW VISUAL */}
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                    Academic Innovation Pathway
                  </span>
                  <span className="text-[11px] text-[#66736b]">From civic issue to technical validation</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { step: "1", label: "Academic Problem", desc: "Track B APS" },
                    { step: "2", label: "Research", desc: "Faculty + Students" },
                    { step: "3", label: "Prototype", desc: "Lab & Codebase" },
                    { step: "4", label: "Field Pilot", desc: "Site Testbed" },
                    { step: "5", label: "Tech Validation", desc: "Dept Review" },
                    { step: "6", label: "Civic Impact", desc: "Scale Readiness" },
                  ].map((s, idx) => (
                    <div
                      key={s.step}
                      className="bg-[#f6fbf8] border border-[#ddebe2] rounded-xl p-2.5 text-center flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-bold text-[#168a45] uppercase tracking-wider">
                        Step {s.step}
                      </span>
                      <p className="text-xs font-bold text-[#17231b] mt-1">{s.label}</p>
                      <p className="text-[10px] text-[#66736b]">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* THREE MAIN DASHBOARD SECTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SECTION 1: RECOMMENDED FOR YOUR INSTITUTION (2 Cols on lg) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0B5D2A] font-display flex items-center gap-1.5">
                        <Sparkles size={15} className="text-[#168a45]" />
                        <span>Recommended for Your Institution</span>
                      </h3>
                      <p className="text-xs text-[#66736b]">
                        Academic Problem Statements matched to your registered capabilities
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveNav("academic-problems");
                        setApsFilter("recommended");
                      }}
                      className="text-xs font-semibold text-[#168a45] hover:text-[#0B5D2A] flex items-center gap-1"
                    >
                      <span>View all ({recommendedChallenges.length})</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {recommendedChallenges.length === 0 ? (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-8 text-center space-y-2">
                      <BookOpen size={28} className="mx-auto text-[#66736b]/60" />
                      <p className="text-sm font-bold text-[#17231b]">No Capability Matches Currently</p>
                      <p className="text-xs text-[#66736b] max-w-sm mx-auto">
                        No new Track B Academic Problems currently match your registered departments or research facilities.
                      </p>
                      <button
                        onClick={() => {
                          setActiveNav("academic-problems");
                          setApsFilter("open");
                        }}
                        className="mt-2 px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs font-semibold text-[#0B5D2A] hover:bg-[#f6fbf8] transition"
                      >
                        Browse All Open Problems
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendedChallenges.slice(0, 3).map((ch) => {
                        const match = matchEvaluation[ch.id];
                        return (
                          <div
                            key={ch.id}
                            className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm hover:border-[#168a45]/50 transition space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-[#168a45]">
                                    {ch.public_id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-[#eaf7ef] border border-[#0B5D2A]/20 text-[#0B5D2A] text-[10px] font-bold uppercase tracking-wider">
                                    Capability Match
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                      ch.priority_level === "CRITICAL"
                                        ? "bg-red-100 text-red-900 border border-red-300"
                                        : ch.priority_level === "HIGH"
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-sky-100 text-sky-900 border border-sky-300"
                                    }`}
                                  >
                                    {ch.priority_level} Priority
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-[#17231b] mt-1">
                                  {ch.academic_title || ch.title}
                                </h4>
                              </div>
                              <span className="text-xs text-[#66736b] shrink-0">{ch.district}</span>
                            </div>

                            <p className="text-xs text-[#66736b] line-clamp-2">{ch.summary}</p>

                            {/* Why this matches */}
                            <div className="p-2.5 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] space-y-1">
                              <span className="text-[10px] font-bold text-[#0B5D2A] uppercase tracking-wider block">
                                Why this matches your institution:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {match?.reasons.map((r, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#168a45]"
                                  >
                                    <Check size={11} />
                                    <span>{r}</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <div className="text-[11px] text-[#66736b]">
                                Target TRL: <strong className="text-[#17231b]">TRL-{ch.target_trl || 6}</strong>
                                {ch.responsible_department && (
                                  <> • Dept: <strong className="text-[#17231b]">{ch.responsible_department}</strong></>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedApsModal(ch)}
                                  className="px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs font-semibold text-[#17231b] hover:bg-[#f6fbf8] transition"
                                >
                                  View Problem
                                </button>
                                <button
                                  onClick={() => setApplyModalAps(ch)}
                                  className="px-3 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
                                >
                                  Express Interest
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SECTION 2: MY ACTIVE PROJECTS */}
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B5D2A] font-display flex items-center gap-1.5">
                          <FolderGit2 size={15} className="text-[#168a45]" />
                          <span>My Active Projects</span>
                        </h3>
                        <p className="text-xs text-[#66736b]">Research initiatives currently being executed by your teams</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveNav("my-projects");
                          setProjectsFilter("active");
                        }}
                        className="text-xs font-semibold text-[#168a45] hover:text-[#0B5D2A] flex items-center gap-1"
                      >
                        <span>View all ({projects.filter((p) => p.stage !== "completed").length})</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {projects.filter((p) => p.stage !== "completed").length === 0 ? (
                      <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-6 text-center space-y-2">
                        <FolderGit2 size={24} className="mx-auto text-[#66736b]/60" />
                        <p className="text-sm font-bold text-[#17231b]">No Active Projects</p>
                        <p className="text-xs text-[#66736b]">
                          Your institution has no active research projects underway. Apply to an Academic Problem above to begin.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {projects
                          .filter((p) => p.stage !== "completed")
                          .slice(0, 4)
                          .map((pr) => {
                            const prMilestones = milestones.filter((m) => m.project_id === pr.id);
                            const completedCount = prMilestones.filter((m) => m.status === "COMPLETED").length;
                            const progress =
                              prMilestones.length > 0 ? Math.round((completedCount / prMilestones.length) * 100) : 25;

                            return (
                              <div
                                key={pr.id}
                                className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between text-[11px] text-[#66736b]">
                                    <span className="font-mono font-bold text-[#168a45]">
                                      {pr.challenge?.public_id || "R&D-PROJECT"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#eaf7ef] text-[#0B5D2A] font-bold uppercase text-[10px]">
                                      {pr.stage}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-[#17231b] mt-1.5 line-clamp-1">
                                    {pr.title}
                                  </h4>
                                  <p className="text-xs text-[#66736b] mt-1">
                                    Lead: <strong className="text-[#17231b]">{pr.faculty_lead_name || "Faculty Lead"}</strong>
                                  </p>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-[#ddebe2]">
                                  <div className="flex items-center justify-between text-[11px] text-[#66736b]">
                                    <span>Milestones Progress</span>
                                    <span className="font-bold text-[#17231b]">{progress}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-[#ddebe2] overflow-hidden">
                                    <div
                                      className="h-full bg-[#168a45] rounded-full transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedProjectId(pr.id);
                                    setActiveNav("my-projects");
                                    setProjectWorkspaceTab("overview");
                                  }}
                                  className="w-full py-1.5 rounded-xl border border-[#ddebe2] hover:border-[#168a45] bg-[#f6fbf8] hover:bg-white text-xs font-bold text-[#0B5D2A] transition"
                                >
                                  Open Project Workspace
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: ATTENTION REQUIRED (1 Col on lg) */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B5D2A] font-display flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-700" />
                      <span>Attention Required</span>
                    </h3>
                    <p className="text-xs text-[#66736b]">Actionable items needing your team's response</p>
                  </div>

                  {attentionItems.length === 0 ? (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-6 text-center space-y-2">
                      <CheckCircle2 size={24} className="mx-auto text-[#168a45]" />
                      <p className="text-xs font-bold text-[#17231b]">All Items Up to Date</p>
                      <p className="text-[11px] text-[#66736b]">
                        No overdue milestones, pending pilot reports, or technical validation requests.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {attentionItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-sm space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-bold text-[#17231b] line-clamp-1">{item.title}</span>
                            <span className="text-[10px] text-[#66736b] shrink-0">{item.date}</span>
                          </div>
                          <p className="text-xs text-amber-900 leading-snug">{item.reason}</p>
                          <button
                            onClick={() => {
                              if (item.projectId) {
                                setSelectedProjectId(item.projectId);
                                setActiveNav("my-projects");
                                setProjectWorkspaceTab(
                                  item.type === "pilot" || item.type === "validation" ? "pilot" : "milestones"
                                );
                              } else {
                                setActiveNav("notifications");
                              }
                            }}
                            className="text-xs font-bold text-[#168a45] hover:text-[#0B5D2A] flex items-center gap-1"
                          >
                            <span>Resolve action</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* QUICK STATS SUMMARY */}
                  <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                      Institutional Capabilities
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#66736b]">
                        <span>Academic Departments:</span>
                        <strong className="text-[#17231b]">{institution?.academic_departments?.length || 0}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[#66736b]">
                        <span>Research Facilities:</span>
                        <strong className="text-[#17231b]">{institution?.research_facilities?.length || 0}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[#66736b]">
                        <span>Roster Members:</span>
                        <strong className="text-[#17231b]">{institutionMembers.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 2: ACADEMIC PROBLEMS DISCOVERY        */}
          {/* ========================================== */}
          {activeNav === "academic-problems" && (
            <div className="space-y-5">
              {/* SUB-FILTER BUTTONS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ddebe2] pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "recommended", label: "Recommended", count: recommendedChallenges.length },
                    { id: "open", label: "Open Problems", count: challenges.length },
                    { id: "applied", label: "Applied", count: applications.length },
                    {
                      id: "assigned",
                      label: "Assigned",
                      count: projects.length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setApsFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        apsFilter === tab.id
                          ? "bg-[#168a45] text-white shadow-xs"
                          : "bg-white border border-[#ddebe2] text-[#66736b] hover:text-[#17231b]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          apsFilter === tab.id ? "bg-white/20 text-white" : "bg-[#ddebe2] text-[#17231b]"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* SEARCH INPUT */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#66736b]" />
                  <input
                    type="text"
                    placeholder="Search problems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#ddebe2] bg-white text-[#17231b] placeholder-[#66736b] focus:outline-none focus:border-[#168a45]"
                  />
                </div>
              </div>

              {/* SECONDARY FILTERS: DOMAIN, DISTRICT, PRIORITY */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[#66736b] font-semibold flex items-center gap-1">
                  <Filter size={12} /> Filters:
                </span>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-[#ddebe2] bg-white text-[#17231b] text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Domains</option>
                  {uniqueDomains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-[#ddebe2] bg-white text-[#17231b] text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Districts</option>
                  {uniqueDistricts.map((dst) => (
                    <option key={dst} value={dst}>
                      {dst}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-[#ddebe2] bg-white text-[#17231b] text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>

                {(selectedDomain !== "all" || selectedDistrict !== "all" || selectedPriority !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedDomain("all");
                      setSelectedDistrict("all");
                      setSelectedPriority("all");
                    }}
                    className="text-xs text-[#168a45] hover:underline font-semibold"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* PROBLEM CARDS GRID */}
              {filteredChallenges.length === 0 ? (
                <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-12 text-center space-y-3">
                  <BookOpen size={36} className="mx-auto text-[#66736b]/40" />
                  <h3 className="text-base font-bold text-[#17231b]">No Academic Problem Statements Found</h3>
                  <p className="text-xs text-[#66736b] max-w-md mx-auto">
                    No Track B challenges match your selected criteria. Try adjusting filters or resetting the search query.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredChallenges.map((ch) => {
                    const match = matchEvaluation[ch.id];
                    const hasApplied = applications.some((a) => a.challenge_id === ch.id);
                    const hasProject = projects.some((p) => p.challenge_id === ch.id);

                    return (
                      <div
                        key={ch.id}
                        className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm hover:border-[#168a45]/50 transition flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#168a45]">
                                {ch.public_id}
                              </span>
                              {match?.isMatch && (
                                <span className="px-2 py-0.5 rounded-md bg-[#eaf7ef] border border-[#0B5D2A]/20 text-[#0B5D2A] text-[10px] font-bold">
                                  Capability Match
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  ch.priority_level === "CRITICAL"
                                    ? "bg-red-100 text-red-900 border border-red-300"
                                    : ch.priority_level === "HIGH"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-sky-100 text-sky-900 border border-sky-300"
                                }`}
                              >
                                {ch.priority_level}
                              </span>
                            </div>
                            <span className="text-xs text-[#66736b] shrink-0 font-medium">
                              {ch.district}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-[#17231b] leading-snug font-display">
                            {ch.academic_title || ch.title}
                          </h4>

                          <p className="text-xs text-[#66736b] line-clamp-3 leading-relaxed">
                            {ch.summary}
                          </p>

                          {/* Matching tags */}
                          {match?.isMatch && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {match.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-[#f6fbf8] border border-[#ddebe2] text-[11px] font-semibold text-[#0B5D2A]"
                                >
                                  ✓ {r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Technical context */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ddebe2] text-xs">
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Technical Domain:</span>
                              <span className="font-bold text-[#17231b]">{ch.domain}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Target TRL:</span>
                              <span className="font-bold text-[#17231b]">TRL-{ch.target_trl || 6}</span>
                            </div>
                            {ch.affected_population && (
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Affected Population:</span>
                                <span className="font-bold text-[#17231b]">~{ch.affected_population.toLocaleString()} citizens</span>
                              </div>
                            )}
                            {ch.responsible_department && (
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Technical Authority:</span>
                                <span className="font-bold text-[#17231b] truncate block">{ch.responsible_department}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#ddebe2]">
                          <button
                            onClick={() => setSelectedApsModal(ch)}
                            className="px-3 py-1.5 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold text-[#17231b] transition flex items-center gap-1.5"
                          >
                            <Eye size={13} />
                            <span>View Details</span>
                          </button>

                          {hasProject ? (
                            <span className="px-3 py-1.5 rounded-xl bg-[#eaf7ef] text-[#0B5D2A] text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>Project Active</span>
                            </span>
                          ) : hasApplied ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1">
                              <Clock size={13} />
                              <span>Application Under Review</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => setApplyModalAps(ch)}
                              className="px-4 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                            >
                              <Send size={13} />
                              <span>Apply / Express Interest</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 3: MY PROJECTS & 7-TAB WORKSPACE      */}
          {/* ========================================== */}
          {activeNav === "my-projects" && (
            <div className="space-y-5">
              {!activeWorkspaceProject ? (
                // PROJECTS LIST VIEW
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setProjectsFilter("active")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          projectsFilter === "active"
                            ? "bg-[#168a45] text-white"
                            : "bg-white border border-[#ddebe2] text-[#66736b]"
                        }`}
                      >
                        Active Projects ({projects.filter((p) => p.stage !== "completed").length})
                      </button>
                      <button
                        onClick={() => setProjectsFilter("completed")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          projectsFilter === "completed"
                            ? "bg-[#168a45] text-white"
                            : "bg-white border border-[#ddebe2] text-[#66736b]"
                        }`}
                      >
                        Completed Projects ({projects.filter((p) => p.stage === "completed").length})
                      </button>
                    </div>

                    <button
                      onClick={() => setActiveNav("academic-problems")}
                      className="px-3 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>New Project via APS</span>
                    </button>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-12 text-center space-y-3">
                      <FolderGit2 size={36} className="mx-auto text-[#66736b]/40" />
                      <h3 className="text-base font-bold text-[#17231b]">
                        No {projectsFilter === "completed" ? "Completed" : "Active"} Projects
                      </h3>
                      <p className="text-xs text-[#66736b] max-w-md mx-auto">
                        {projectsFilter === "completed"
                          ? "Completed projects with validated technical outcomes will appear here."
                          : "Apply to an open Academic Problem Statement to launch an institutional research project."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProjects.map((pr) => {
                        const prMilestones = milestones.filter((m) => m.project_id === pr.id);
                        const prPilots = pilots.filter((p) => p.project_id === pr.id);
                        const completedMs = prMilestones.filter((m) => m.status === "COMPLETED").length;
                        const progress =
                          prMilestones.length > 0 ? Math.round((completedMs / prMilestones.length) * 100) : 30;

                        return (
                          <div
                            key={pr.id}
                            className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4 hover:border-[#168a45]/50 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#168a45]">
                                  {pr.challenge?.public_id || "PROJECT"}
                                </span>
                                <h4 className="text-base font-bold text-[#17231b] mt-1 font-display">
                                  {pr.title}
                                </h4>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf7ef] border border-[#0B5D2A]/20 text-[#0B5D2A] text-xs font-bold uppercase">
                                {pr.stage}
                              </span>
                            </div>

                            <p className="text-xs text-[#66736b] line-clamp-2">{pr.objective}</p>

                            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] text-xs">
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Faculty Lead</span>
                                <strong className="text-[#17231b] truncate block">{pr.faculty_lead_name || "Assigned"}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Current TRL</span>
                                <strong className="text-[#17231b]">TRL-{pr.current_trl}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Pilots</span>
                                <strong className="text-[#17231b]">{prPilots.length} Active</strong>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-[#66736b]">
                                <span>Milestones Progress</span>
                                <span className="font-bold text-[#17231b]">{progress}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#ddebe2] overflow-hidden">
                                <div
                                  className="h-full bg-[#168a45] rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedProjectId(pr.id);
                                setProjectWorkspaceTab("overview");
                              }}
                              className="w-full py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Open Project Workspace</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // 7-TAB PROJECT WORKSPACE
                <div className="space-y-5">
                  {/* Workspace Header */}
                  <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProjectId(null)}
                          className="p-1.5 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-[#66736b] transition"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#168a45]">
                            {activeWorkspaceProject.challenge?.public_id || "PROJECT"} • {activeWorkspaceProject.challenge?.domain || "Civic Tech"}
                          </span>
                          <h2 className="text-lg font-bold text-[#0B5D2A] font-display">
                            {activeWorkspaceProject.title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#eaf7ef] border border-[#0B5D2A]/20 text-[#0B5D2A] text-xs font-bold uppercase">
                          Stage: {activeWorkspaceProject.stage}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-[#ddebe2] text-[#17231b] text-xs font-bold">
                          TRL-{activeWorkspaceProject.current_trl}
                        </span>
                      </div>
                    </div>

                    {/* 8 FOCUSED WORKSPACE TABS */}
                    <div className="flex items-center gap-1 overflow-x-auto border-t border-[#ddebe2] pt-3">
                      {[
                        { id: "overview", label: "Overview" },
                        { id: "team", label: "Team", count: activeProjectMembers.length },
                        { id: "milestones", label: "Milestones", count: activeProjectMilestones.length },
                        { id: "prototype", label: "Prototype", count: activeProjectPrototypes.length },
                        { id: "pilot", label: "Pilot", count: activeProjectPilots.length },
                        { id: "evidence", label: "Evidence" },
                        { id: "impact", label: "Impact", count: activeProjectImpact.length },
                        { id: "collaboration", label: "Collaboration & Chat", count: projectCollaborations.length },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setProjectWorkspaceTab(t.id as any)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                            projectWorkspaceTab === t.id
                              ? "bg-[#168a45] text-white shadow-xs"
                              : "text-[#66736b] hover:bg-[#f6fbf8] hover:text-[#17231b]"
                          }`}
                        >
                          <span>{t.label}</span>
                          {typeof t.count === "number" && t.count > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                projectWorkspaceTab === t.id ? "bg-white/20 text-white" : "bg-[#ddebe2] text-[#17231b]"
                              }`}
                            >
                              {t.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  {projectWorkspaceTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-2 space-y-4">
                        <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3">
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Research Objective</h3>
                          <p className="text-xs text-[#66736b] leading-relaxed">
                            {activeWorkspaceProject.objective}
                          </p>
                          {activeWorkspaceProject.expected_outcome && (
                            <>
                              <h4 className="text-xs font-bold text-[#17231b] pt-2">Expected Outcomes</h4>
                              <p className="text-xs text-[#66736b] leading-relaxed">
                                {activeWorkspaceProject.expected_outcome}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Associated APS */}
                        <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3">
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">
                            Associated Academic Problem Statement
                          </h3>
                          <div className="p-3.5 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#168a45]">
                                {activeWorkspaceProject.challenge?.public_id}
                              </span>
                              <span className="text-[#66736b]">District: {activeWorkspaceProject.challenge?.district}</span>
                            </div>
                            <p className="font-bold text-[#17231b]">
                              {activeWorkspaceProject.challenge?.title}
                            </p>
                            <p className="text-[#66736b]">
                              Technical Line Dept: <strong>{activeWorkspaceProject.challenge?.responsible_department || "Designated Department"}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Project Sidebar Info */}
                      <div className="space-y-4">
                        <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
                          <h3 className="text-xs font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                            Project Metadata
                          </h3>
                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Faculty Lead:</span>
                              <strong className="text-[#17231b]">{activeWorkspaceProject.faculty_lead_name || "Faculty Lead"}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Institution:</span>
                              <strong className="text-[#17231b]">{institution?.legal_name}</strong>
                            </div>
                            {activeWorkspaceProject.academic_credit_course_code && (
                              <div>
                                <span className="text-[10px] text-[#66736b] block">Capstone Course Code:</span>
                                <strong className="text-[#17231b]">{activeWorkspaceProject.academic_credit_course_code}</strong>
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Started:</span>
                              <strong className="text-[#17231b]">{activeWorkspaceProject.start_date || "Active"}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TEAM */}
                  {projectWorkspaceTab === "team" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Research Team Members</h3>
                          <p className="text-xs text-[#66736b]">Faculty mentors, research associates, and student developers</p>
                        </div>
                      </div>

                      {activeProjectMembers.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Users size={28} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Members Explicitly Linked</p>
                          <p className="text-[11px] text-[#66736b]">
                            Lead Faculty: <strong>{activeWorkspaceProject.faculty_lead_name || "Assigned"}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {activeProjectMembers.map((m) => (
                            <div
                              key={m.id}
                              className="p-3.5 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#17231b]">
                                  {m.profile?.display_name || "Team Member"}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white text-[#168a45] text-[10px] font-bold uppercase border border-[#ddebe2]">
                                  {m.role}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#66736b]">{m.department || "Department"}</p>
                              {m.responsibilities && (
                                <p className="text-[10px] text-[#17231b] pt-1 border-t border-[#ddebe2]">
                                  {m.responsibilities}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: MILESTONES */}
                  {projectWorkspaceTab === "milestones" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Project Milestones</h3>
                          <p className="text-xs text-[#66736b]">Key deliverables and progress tracking</p>
                        </div>
                        <button
                          onClick={() => setCreateMilestoneModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>Add Milestone</span>
                        </button>
                      </div>

                      {activeProjectMilestones.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Target size={28} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Milestones Defined</p>
                          <p className="text-[11px] text-[#66736b]">Add milestones to track research progress.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {activeProjectMilestones.map((ms) => (
                            <div
                              key={ms.id}
                              className="p-3.5 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#17231b]">{ms.title}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      ms.status === "COMPLETED"
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : ms.status === "IN_PROGRESS"
                                        ? "bg-sky-100 text-sky-900 border border-sky-300"
                                        : ms.status === "OVERDUE"
                                        ? "bg-red-100 text-red-900 border border-red-300"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {ms.status.replace("_", " ")}
                                  </span>
                                </div>
                                {ms.description && (
                                  <p className="text-[11px] text-[#66736b]">{ms.description}</p>
                                )}
                                <div className="text-[10px] text-[#66736b]">
                                  Due Date: <strong className="text-[#17231b]">{ms.due_date || "Flexible"}</strong>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {ms.status !== "COMPLETED" ? (
                                  <button
                                    onClick={() => handleUpdateMilestoneStatus(ms.id, "COMPLETED")}
                                    className="px-3 py-1 rounded-lg bg-[#168a45] hover:bg-[#0B5D2A] text-white text-[11px] font-bold transition flex items-center gap-1"
                                  >
                                    <Check size={12} />
                                    <span>Mark Complete</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateMilestoneStatus(ms.id, "IN_PROGRESS")}
                                    className="px-3 py-1 rounded-lg border border-[#ddebe2] text-[#66736b] text-[11px] font-semibold hover:bg-white transition"
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: PROTOTYPE */}
                  {projectWorkspaceTab === "prototype" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Prototypes & Artifacts</h3>
                          <p className="text-xs text-[#66736b]">Software codebases, engineering designs, and lab test models</p>
                        </div>
                        <button
                          onClick={() => setCreatePrototypeModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>Add Prototype</span>
                        </button>
                      </div>

                      {activeProjectPrototypes.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Cpu size={28} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Prototypes Registered</p>
                          <p className="text-[11px] text-[#66736b]">Register your prototype codebase, hardware model, or testbench.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeProjectPrototypes.map((prt) => (
                            <div
                              key={prt.id}
                              className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-2 text-xs"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-bold text-[#17231b] text-sm">
                                    {prt.name || "Engineering Prototype"}
                                  </span>
                                  <span className="ml-2 px-2 py-0.5 rounded bg-white border border-[#ddebe2] font-mono text-[10px] text-[#168a45] font-bold">
                                    {prt.version}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-[#eaf7ef] text-[#0B5D2A] font-bold text-[10px] uppercase">
                                  {prt.status}
                                </span>
                              </div>

                              {prt.description && <p className="text-[#66736b]">{prt.description}</p>}

                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#ddebe2]">
                                <div>
                                  <span className="text-[#66736b]">Technology: </span>
                                  <strong className="text-[#17231b]">{prt.technology || "Specified in docs"}</strong>
                                </div>
                                {prt.repository_url && (
                                  <div>
                                    <a
                                      href={prt.repository_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#168a45] hover:underline flex items-center gap-1 font-bold"
                                    >
                                      <ExternalLink size={11} />
                                      <span>Repository / Docs</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: PILOT */}
                  {projectWorkspaceTab === "pilot" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Field Pilots</h3>
                          <p className="text-xs text-[#66736b]">On-the-ground deployments and empirical testbed monitoring</p>
                        </div>
                      </div>

                      {activeProjectPilots.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Rocket size={28} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Field Pilots Configured</p>
                          <p className="text-[11px] text-[#66736b]">
                            When ready for ground trials, field pilots are authorized with PRI/ULB site access.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeProjectPilots.map((plt) => (
                            <div
                              key={plt.id}
                              className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-3 text-xs"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-[#17231b] text-sm">
                                    {plt.pilot_name || "Field Pilot Testbed"}
                                  </h4>
                                  <p className="text-[11px] text-[#66736b] flex items-center gap-1 mt-0.5">
                                    <MapPin size={12} className="text-[#168a45]" />
                                    <span>{plt.location_text}</span>
                                  </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] uppercase">
                                  {plt.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white border border-[#ddebe2]">
                                <div>
                                  <span className="text-[10px] text-[#66736b] block">Baseline Measurement</span>
                                  <strong className="text-[#17231b]">{plt.baseline || "Pre-intervention state"}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#66736b] block">Target Outcome</span>
                                  <strong className="text-[#168a45]">{plt.target || "Target specification"}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#66736b] block">Observed Measurement</span>
                                  <strong className="text-[#0B5D2A]">{plt.observed_result || "Pending field read"}</strong>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[#ddebe2]">
                                <div className="text-[11px] text-[#66736b]">
                                  Technical Validation:{" "}
                                  <strong className="text-[#17231b] capitalize">
                                    {plt.technical_validation_status || "Pending Review"}
                                  </strong>
                                </div>
                                <button
                                  onClick={() => {
                                    setMeasurementModal(plt);
                                    setObservedMeasurement(plt.observed_result || "");
                                    setValidationNotes(plt.validation_notes || "");
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
                                >
                                  Record Measurement
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: EVIDENCE */}
                  {projectWorkspaceTab === "evidence" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Research & Pilot Evidence</h3>
                          <p className="text-xs text-[#66736b]">Upload lab certificates, field test logs, and technical reports</p>
                        </div>
                      </div>

                      {/* Upload Form */}
                      <form onSubmit={handleUploadEvidence} className="p-4 rounded-xl border border-dashed border-[#168a45]/40 bg-[#f6fbf8] space-y-3">
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <input
                            type="file"
                            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                            className="text-xs text-[#66736b] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#168a45] file:text-white hover:file:bg-[#0B5D2A]"
                          />
                          <button
                            type="submit"
                            disabled={!evidenceFile || uploadingEvidence}
                            className="px-4 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                          >
                            <UploadCloud size={14} />
                            <span>{uploadingEvidence ? "Uploading..." : "Upload Evidence"}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-[#66736b]">
                          Accepted: PDF, DOCX, CSV, PNG, JPG (Protected Supabase storage bucket: evidence)
                        </p>
                      </form>
                    </div>
                  )}

                  {/* TAB 7: IMPACT */}
                  {projectWorkspaceTab === "impact" && (
                    <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Impact Observations</h3>
                          <p className="text-xs text-[#66736b]">Empirical civic problem reduction and community benefits</p>
                        </div>
                      </div>

                      {activeProjectImpact.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <TrendingUp size={28} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Direct Impact Observations Recorded Yet</p>
                          <p className="text-[11px] text-[#66736b]">
                            Measurements will appear once field pilot telemetry and line department verifications are logged.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {activeProjectImpact.map((obs) => (
                            <div
                              key={obs.id}
                              className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-1 text-xs"
                            >
                              <span className="text-[10px] text-[#66736b] uppercase tracking-wider block">
                                {obs.metric}
                              </span>
                              <div className="text-base font-bold text-[#0B5D2A]">
                                {obs.observed !== undefined ? `${obs.observed} ${obs.unit}` : "Under observation"}
                              </div>
                              <div className="text-[10px] text-[#66736b] pt-1">
                                Target: <strong>{obs.target} {obs.unit}</strong> • Source: {obs.source}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 8: COLLABORATION & CHAT */}
                  {projectWorkspaceTab === "collaboration" && (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#0B5D2A]/15 rounded-2xl">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B5D2A] font-display flex items-center gap-2">
                            <Handshake size={16} />
                            <span>Inter-Organizational Collaborations</span>
                          </h3>
                          <p className="text-xs text-[#66736b]">
                            Partner with other Universities, Research Labs, and Industry Partners on this project with Realtime persistent chat.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void loadAvailableOrganizations();
                            setShowRequestCollabModal(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto hover:bg-[#0B5D2A] transition shadow-xs"
                        >
                          <Plus size={13} />
                          <span>Request Collaboration</span>
                        </button>
                      </div>

                      {projectCollaborations.length === 0 ? (
                        <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-8 text-center space-y-3">
                          <Handshake size={32} className="mx-auto text-[#66736b]/40" />
                          <p className="text-xs font-bold text-[#17231b]">No Collaborations Attached Yet</p>
                          <p className="text-[11px] text-[#66736b] max-w-md mx-auto">
                            Invite another University or Industry CSR partner to collaborate on R&D, prototype validation, or pilot trials. All conversations are persistently recorded.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projectCollaborations.map((collab) => {
                            const isIncoming = collab.target_org_id === institution?.id;
                            const isPending = collab.status === "Pending";
                            const isAccepted = collab.status === "Accepted";
                            const partnerName = isIncoming
                              ? collab.requesting_org?.name || "Collaborating Organization"
                              : collab.target_org?.name || "Collaborating Organization";
                            const partnerType = isIncoming
                              ? collab.requesting_org?.organization_type || "Institution"
                              : collab.target_org?.organization_type || "Institution";

                            return (
                              <div
                                key={collab.id}
                                className="bg-white border border-[#ddebe2] hover:border-[#0B5D2A]/30 rounded-2xl p-4 transition space-y-3 shadow-2xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ddebe2] pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-[#eaf7ef] border border-[#0B5D2A]/20 flex items-center justify-center text-[#0B5D2A]">
                                      {partnerType.toLowerCase().includes("university") ? (
                                        <GraduationCap size={16} />
                                      ) : (
                                        <Building2 size={16} />
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-[#17231b] flex items-center gap-1.5">
                                        <span>{partnerName}</span>
                                        <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-100 text-[#66736b] font-normal">
                                          {partnerType}
                                        </span>
                                      </h4>
                                      <span className="text-[11px] text-[#66736b]">
                                        {isIncoming ? "Incoming Collaboration Request" : "Outgoing Collaboration Request"} • {new Date(collab.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                        isAccepted
                                          ? "bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20"
                                          : collab.status === "Rejected"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                    >
                                      {collab.status}
                                    </span>
                                  </div>
                                </div>

                                {collab.request_message && (
                                  <p className="text-xs text-[#66736b] bg-[#f6fbf8] p-3 rounded-xl border border-[#ddebe2]">
                                    "{collab.request_message}"
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  {isIncoming && isPending ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleRespondCollaboration(collab.id, "Accepted")}
                                        className="px-3 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#0B5D2A] transition shadow-xs"
                                      >
                                        <CheckCircle2 size={12} />
                                        <span>Accept Collaboration</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRespondCollaboration(collab.id, "Rejected")}
                                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold transition"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <div />
                                  )}

                                  {isAccepted && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveChatCollab({
                                          collaborationId: collab.id,
                                          projectId: collab.project_id,
                                          projectTitle: activeWorkspaceProject.title,
                                          requestingOrgName: collab.requesting_org?.name || institution?.legal_name || institution?.short_name || "Institution",
                                          targetOrgName: partnerName,
                                          isCompleted: activeWorkspaceProject.stage === "Completed",
                                        });
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#0B5D2A] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#168a45] transition shadow-xs"
                                    >
                                      <MessageSquare size={13} />
                                      <span>Open Persistent Chat</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 4: RESEARCH TEAM                      */}
          {/* ========================================== */}
          {activeNav === "research-team" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0B5D2A] font-display">Institutional Research Roster</h3>
                    <p className="text-xs text-[#66736b]">
                      Authorized faculty mentors, research scholars, and student collaborators
                    </p>
                  </div>
                  <button
                    onClick={() => setCreateMemberModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Member</span>
                  </button>
                </div>

                {institutionMembers.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Members in Roster</h4>
                    <p className="text-xs text-[#66736b] max-w-sm mx-auto">
                      Add faculty mentors and student researchers to collaborate on Samaj Setu civic projects.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {institutionMembers.map((mem) => (
                      <div
                        key={mem.id}
                        className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-[#17231b]">{mem.name}</h4>
                            <p className="text-[11px] text-[#66736b]">{mem.email}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-white border border-[#ddebe2] text-[#168a45] text-[10px] font-bold uppercase">
                            {mem.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#66736b] pt-1 border-t border-[#ddebe2]">
                          Department: <strong className="text-[#17231b]">{mem.department}</strong>
                          {mem.specialization && (
                            <> • Focus: <strong className="text-[#17231b]">{mem.specialization}</strong></>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 5: PROTOTYPES                         */}
          {/* ========================================== */}
          {activeNav === "prototypes" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-[#ddebe2] pb-3">
                  <h3 className="text-base font-bold text-[#0B5D2A] font-display">Institutional Prototypes</h3>
                  <p className="text-xs text-[#66736b]">All software and engineering artifacts developed across projects</p>
                </div>

                {prototypes.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Cpu size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Prototypes Registered</h4>
                    <p className="text-xs text-[#66736b]">Prototypes created in active project workspaces will be listed here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {prototypes.map((pt) => {
                      const pr = projects.find((p) => p.id === pt.project_id);
                      return (
                        <div
                          key={pt.id}
                          className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-[#17231b]">{pt.name || "Prototype"}</h4>
                              <p className="text-[11px] text-[#168a45] font-bold">Project: {pr?.title || "Research Project"}</p>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#ddebe2]">
                              {pt.version}
                            </span>
                          </div>
                          <p className="text-[#66736b]">{pt.description}</p>
                          <div className="text-[11px] text-[#66736b] pt-2 border-t border-[#ddebe2]">
                            Tech: <strong className="text-[#17231b]">{pt.technology || "General"}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 6: FIELD PILOTS                       */}
          {/* ========================================== */}
          {activeNav === "field-pilots" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-[#ddebe2] pb-3">
                  <h3 className="text-base font-bold text-[#0B5D2A] font-display">Authorized Field Pilots</h3>
                  <p className="text-xs text-[#66736b]">
                    Real-world community deployments verified by line departments and local authorities
                  </p>
                </div>

                {pilots.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Rocket size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Active Field Pilots</h4>
                    <p className="text-xs text-[#66736b]">
                      Pilots are created once laboratory prototypes reach field readiness (TRL-5/6).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {pilots.map((plt) => {
                      const pr = projects.find((p) => p.id === plt.project_id);
                      return (
                        <div
                          key={plt.id}
                          className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-3 text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-[#17231b] text-sm">{plt.pilot_name || "Field Pilot"}</h4>
                              <p className="text-[11px] text-[#66736b] flex items-center gap-1 mt-0.5">
                                <MapPin size={12} className="text-[#168a45]" />
                                <span>{plt.location_text} • Project: {pr?.title}</span>
                              </p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] uppercase">
                              {plt.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white border border-[#ddebe2]">
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Baseline:</span>
                              <strong className="text-[#17231b]">{plt.baseline || "Baseline"}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Target:</span>
                              <strong className="text-[#168a45]">{plt.target || "Target"}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#66736b] block">Observed:</span>
                              <strong className="text-[#0B5D2A]">{plt.observed_result || "Pending measurement"}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#ddebe2]">
                            <div className="text-[11px] text-[#66736b]">
                              Technical Validation:{" "}
                              <strong className="text-[#17231b] capitalize">
                                {plt.technical_validation_status || "Pending Review"}
                              </strong>
                            </div>
                            <button
                              onClick={() => {
                                setMeasurementModal(plt);
                                setObservedMeasurement(plt.observed_result || "");
                                setValidationNotes(plt.validation_notes || "");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
                            >
                              Record Measurement
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 7: IMPACT                             */}
          {/* ========================================== */}
          {activeNav === "impact" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-[#ddebe2] pb-3">
                  <h3 className="text-base font-bold text-[#0B5D2A] font-display">Institutional Impact Overview</h3>
                  <p className="text-xs text-[#66736b]">Empirical results from civic interventions and research deployments</p>
                </div>

                {impactObservations.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <TrendingUp size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Impact Observations Recorded</h4>
                    <p className="text-xs text-[#66736b]">
                      Impact observations will be recorded as field pilots complete verification.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {impactObservations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-4 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] space-y-1 text-xs"
                      >
                        <span className="text-[10px] text-[#66736b] uppercase tracking-wider block">
                          {obs.metric}
                        </span>
                        <div className="text-lg font-bold text-[#0B5D2A]">
                          {obs.observed} {obs.unit}
                        </div>
                        <p className="text-[10px] text-[#66736b]">Target: {obs.target} {obs.unit}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 8: NOTIFICATIONS                      */}
          {/* ========================================== */}
          {activeNav === "notifications" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-[#ddebe2] pb-3">
                  <h3 className="text-base font-bold text-[#0B5D2A] font-display">Institutional Notifications</h3>
                  <p className="text-xs text-[#66736b]">Real-time alerts, review feedback, and milestone notices</p>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Bell size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Notifications</h4>
                    <p className="text-xs text-[#66736b]">You are all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                          !n.read_at ? "bg-[#f6fbf8] border-[#168a45]/30 font-semibold" : "bg-white border-[#ddebe2]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#17231b]">{n.title}</span>
                          <span className="text-[10px] text-[#66736b]">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[#66736b] font-normal">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 9: INSTITUTION PROFILE                */}
          {/* ========================================== */}
          {activeNav === "institution-profile" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0B5D2A] font-display">Institution Profile</h3>
                    <p className="text-xs text-[#66736b]">Verified identity and registered research capabilities</p>
                  </div>
                  {isVerified ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>✓ Verified Institution</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                      Under Review
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] space-y-2">
                    <h4 className="font-bold text-[#0B5D2A] uppercase tracking-wider text-[10px]">
                      Identity & AISHE
                    </h4>
                    <div className="space-y-1.5">
                      <div><span className="text-[#66736b]">Legal Name:</span> <strong className="text-[#17231b]">{institution?.legal_name}</strong></div>
                      <div><span className="text-[#66736b]">AISHE Code:</span> <strong className="text-[#17231b]">{institution?.aishe_code}</strong></div>
                      <div><span className="text-[#66736b]">Type:</span> <strong className="text-[#17231b]">{institution?.institution_type}</strong></div>
                      <div><span className="text-[#66736b]">Ownership:</span> <strong className="text-[#17231b]">{institution?.ownership}</strong></div>
                      <div><span className="text-[#66736b]">Website:</span> <a href={institution?.website} target="_blank" rel="noreferrer" className="text-[#168a45] underline">{institution?.website}</a></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] space-y-2">
                    <h4 className="font-bold text-[#0B5D2A] uppercase tracking-wider text-[10px]">
                      Nodal Officer & Campus
                    </h4>
                    <div className="space-y-1.5">
                      <div><span className="text-[#66736b]">Nodal Officer:</span> <strong className="text-[#17231b]">{institution?.nodal_officer_name}</strong></div>
                      <div><span className="text-[#66736b]">Designation:</span> <strong className="text-[#17231b]">{institution?.nodal_officer_designation}</strong></div>
                      <div><span className="text-[#66736b]">Email:</span> <strong className="text-[#17231b]">{institution?.nodal_officer_email}</strong></div>
                      <div><span className="text-[#66736b]">District / State:</span> <strong className="text-[#17231b]">{institution?.district}, {institution?.state}</strong></div>
                      <div><span className="text-[#66736b]">PIN Code:</span> <strong className="text-[#17231b]">{institution?.pincode}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-[#0B5D2A] uppercase tracking-wider">
                    Academic Departments
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {institution?.academic_departments?.map((dept: any, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-xl bg-[#eaf7ef] border border-[#0B5D2A]/15 text-[#0B5D2A] text-xs font-semibold">
                        {typeof dept === "string" ? dept : dept?.name || String(dept)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-[#0B5D2A] uppercase tracking-wider">
                    Research Facilities & Labs
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {institution?.research_facilities?.map((fac: any, i: number) => {
                      const facName = typeof fac === "string" ? fac : fac?.name || "Laboratory";
                      const facDesc = typeof fac === "object" && fac?.description ? fac.description : null;
                      return (
                        <div key={i} className="p-3 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] text-xs">
                          <span className="font-bold text-[#17231b] block">{facName}</span>
                          {facDesc && <p className="text-[10px] text-[#66736b] mt-0.5">{facDesc}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 10: ACTIVITY (AUDIT LOGS)             */}
          {/* ========================================== */}
          {activeNav === "activity" && (
            <div className="space-y-5">
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-[#ddebe2] pb-3">
                  <h3 className="text-base font-bold text-[#0B5D2A] font-display">Activity Stream</h3>
                  <p className="text-xs text-[#66736b]">Chronological audit trail of institutional actions</p>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Activity size={32} className="mx-auto text-[#66736b]/40" />
                    <h4 className="text-sm font-bold text-[#17231b]">No Recent Activity</h4>
                    <p className="text-xs text-[#66736b]">Actions taken in projects and pilots will be recorded here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-[#17231b] capitalize">{log.action.replace("_", " ")}</span>
                          <span className="text-[#66736b] ml-2 font-mono text-[10px]">{log.entity_type}</span>
                        </div>
                        <span className="text-[10px] text-[#66736b]">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL: APS DETAIL VIEW                     */}
      {/* ========================================== */}
      {selectedApsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-[#ddebe2] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#168a45]">
                  {selectedApsModal.public_id} • Track B Academic Problem Statement
                </span>
                <h3 className="text-lg font-bold text-[#0B5D2A] font-display mt-1">
                  {selectedApsModal.academic_title || selectedApsModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApsModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#66736b]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#17231b]">
              <div>
                <h4 className="font-bold text-[#0B5D2A] uppercase tracking-wider text-[10px]">Problem Summary</h4>
                <p className="text-[#66736b] mt-1 leading-relaxed">{selectedApsModal.summary}</p>
              </div>

              {selectedApsModal.technical_scope && (
                <div>
                  <h4 className="font-bold text-[#0B5D2A] uppercase tracking-wider text-[10px]">Technical Scope</h4>
                  <p className="text-[#66736b] mt-1 leading-relaxed">{selectedApsModal.technical_scope}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#f6fbf8] border border-[#ddebe2]">
                <div>
                  <span className="text-[10px] text-[#66736b] block">Government Technical Authority</span>
                  <strong>{selectedApsModal.responsible_department || "Line Department"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#66736b] block">Geographic Authority (PRI/ULB)</span>
                  <strong>{selectedApsModal.district} District Authority</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#66736b] block">Current TRL</span>
                  <strong>TRL-{selectedApsModal.current_trl || 3}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#66736b] block">Target TRL</span>
                  <strong className="text-[#168a45]">TRL-{selectedApsModal.target_trl || 6}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#ddebe2]">
              <button
                onClick={() => setSelectedApsModal(null)}
                className="px-4 py-2 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const ch = selectedApsModal;
                  setSelectedApsModal(null);
                  setApplyModalAps(ch);
                }}
                className="px-4 py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
              >
                Express Interest / Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: APPLY / EXPRESS INTEREST            */}
      {/* ========================================== */}
      {applyModalAps && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-[#ddebe2] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#168a45] uppercase tracking-wider">
                  Academic Research Application
                </span>
                <h3 className="text-base font-bold text-[#0B5D2A] font-display mt-0.5">
                  {applyModalAps.academic_title || applyModalAps.title}
                </h3>
              </div>
              <button
                onClick={() => setApplyModalAps(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#66736b]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyAps} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Faculty Lead Name</label>
                <input
                  type="text"
                  required
                  value={applyForm.facultyLead}
                  onChange={(e) => setApplyForm({ ...applyForm, facultyLead: e.target.value })}
                  placeholder="Dr. Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#17231b] block mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={applyForm.department}
                  onChange={(e) => setApplyForm({ ...applyForm, department: e.target.value })}
                  placeholder="e.g. Civil Engineering, Water Resources Lab"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#17231b] block mb-1">Research Proposal Summary</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.proposalSummary}
                  onChange={(e) => setApplyForm({ ...applyForm, proposalSummary: e.target.value })}
                  placeholder="Outline your research methodology, prototype concept, and lab facilities..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#17231b] block mb-1">Expected Timeline</label>
                <select
                  value={applyForm.timeline}
                  onChange={(e) => setApplyForm({ ...applyForm, timeline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                >
                  <option value="3 Months">3 Months (Rapid Prototype)</option>
                  <option value="6 Months">6 Months (Prototype + Field Testbed)</option>
                  <option value="12 Months">12 Months (Full Multi-season Pilot)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#ddebe2]">
                <button
                  type="button"
                  onClick={() => setApplyModalAps(null)}
                  className="px-4 py-2 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-4 py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
                >
                  {submittingApply ? "Submitting..." : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD MILESTONE                       */}
      {/* ========================================== */}
      {createMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-2">
              <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Add Research Milestone</h3>
              <button onClick={() => setCreateMilestoneModal(false)} className="p-1 text-[#66736b]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={newMilestoneForm.title}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, title: e.target.value })}
                  placeholder="e.g. Lab Water Quality Batch Test #1"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newMilestoneForm.description}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, description: e.target.value })}
                  placeholder="Deliverable details..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={newMilestoneForm.dueDate}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateMilestoneModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD PROTOTYPE                       */}
      {/* ========================================== */}
      {createPrototypeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-2">
              <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Register Prototype</h3>
              <button onClick={() => setCreatePrototypeModal(false)} className="p-1 text-[#66736b]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreatePrototype} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Prototype Name</label>
                <input
                  type="text"
                  required
                  value={newProtoForm.name}
                  onChange={(e) => setNewProtoForm({ ...newProtoForm, name: e.target.value })}
                  placeholder="e.g. Gravity Bio-filtration Column"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Technology Stack</label>
                <input
                  type="text"
                  value={newProtoForm.technology}
                  onChange={(e) => setNewProtoForm({ ...newProtoForm, technology: e.target.value })}
                  placeholder="e.g. Activated Carbon, IoT Turbidity Sensors"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Repository or Document Link</label>
                <input
                  type="url"
                  value={newProtoForm.repositoryUrl}
                  onChange={(e) => setNewProtoForm({ ...newProtoForm, repositoryUrl: e.target.value })}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatePrototypeModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold"
                >
                  Save Prototype
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RECORD PILOT MEASUREMENT            */}
      {/* ========================================== */}
      {measurementModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-2">
              <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Record Pilot Measurement</h3>
              <button onClick={() => setMeasurementModal(null)} className="p-1 text-[#66736b]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveMeasurement} className="space-y-3 text-xs">
              <p className="text-[#66736b]">
                Pilot: <strong>{measurementModal.pilot_name || "Field Testbed"}</strong> ({measurementModal.location_text})
              </p>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Observed Field Result</label>
                <input
                  type="text"
                  required
                  value={observedMeasurement}
                  onChange={(e) => setObservedMeasurement(e.target.value)}
                  placeholder="e.g. Fluoride reduced from 3.8 mg/L to 0.7 mg/L (NABL Certified)"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Technical Notes for Line Department</label>
                <textarea
                  rows={3}
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Detail test methods, sample dates, and lab calibration..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMeasurementModal(null)}
                  className="px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold"
                >
                  Submit for Technical Validation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD ROSTER MEMBER                   */}
      {/* ========================================== */}
      {createMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-2">
              <h3 className="text-sm font-bold text-[#0B5D2A] font-display">Add Institutional Member</h3>
              <button onClick={() => setCreateMemberModal(false)} className="p-1 text-[#66736b]">
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!institution || !supabase) return;
                try {
                  const { error } = await supabase.from("institution_members").insert({
                    institution_id: institution.id,
                    name: newMemberForm.name,
                    email: newMemberForm.email,
                    role: newMemberForm.role,
                    department: newMemberForm.department,
                    specialization: newMemberForm.specialization || null,
                    status: "active",
                  });
                  if (error) throw error;
                  flash("Member added to institutional roster.");
                  setCreateMemberModal(false);
                  setNewMemberForm({
                    name: "",
                    email: "",
                    role: "faculty",
                    department: "",
                    specialization: "",
                  });
                  void loadAllData();
                } catch (err: any) {
                  flash("Failed to add member: " + err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  placeholder="name@university.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#17231b] block mb-1">Role</label>
                  <select
                    value={newMemberForm.role}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                  >
                    <option value="faculty">Faculty Mentor</option>
                    <option value="student">Student Researcher</option>
                    <option value="researcher">Research Associate</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#17231b] block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newMemberForm.department}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, department: e.target.value })}
                    placeholder="e.g. Civil Engg"
                    className="w-full px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateMemberModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#ddebe2] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#168a45] text-white text-xs font-bold"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST COLLABORATION MODAL */}
      {showRequestCollabModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#ddebe2] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
              <div className="flex items-center gap-2">
                <Handshake size={20} className="text-[#0B5D2A]" />
                <h3 className="text-base font-bold text-[#17231b] font-display">
                  Request Inter-Org Collaboration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestCollabModal(false)}
                className="p-1 rounded-lg text-[#66736b] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#17231b] mb-1">
                  Target Organization (University or Industry)
                </label>
                <select
                  value={collabTargetOrgId}
                  onChange={(e) => setCollabTargetOrgId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] text-[#17231b] focus:outline-none focus:border-[#168a45]"
                >
                  <option value="">-- Select Organization --</option>
                  {availableOrganizations
                    .filter((org) => org.id !== institution?.id)
                    .map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.organization_type} - {org.district || "National"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#17231b] mb-1">
                  Collaboration Proposal / Note
                </label>
                <textarea
                  rows={4}
                  value={collabMessage}
                  onChange={(e) => setCollabMessage(e.target.value)}
                  placeholder="Describe joint R&D goals, resource sharing, prototyping, or pilot testing scope..."
                  className="w-full p-3 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] text-[#17231b] focus:outline-none focus:border-[#168a45]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#ddebe2] pt-3">
              <button
                type="button"
                onClick={() => setShowRequestCollabModal(false)}
                className="px-4 py-2 rounded-xl border border-[#ddebe2] text-[#66736b] text-xs font-semibold hover:bg-[#f6fbf8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingCollab || !collabTargetOrgId || !collabMessage.trim()}
                onClick={() => void handleSendCollaborationRequest()}
                className="px-4 py-2 rounded-xl bg-[#168a45] disabled:opacity-50 text-white text-xs font-bold hover:bg-[#0B5D2A] transition shadow-xs"
              >
                {submittingCollab ? "Sending Request..." : "Send Collaboration Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENT REALTIME COLLABORATION CHAT MODAL */}
      {activeChatCollab && (
        <CollaborationChatModal
          isOpen={Boolean(activeChatCollab)}
          onClose={() => setActiveChatCollab(null)}
          collaborationId={activeChatCollab.collaborationId}
          projectId={activeChatCollab.projectId}
          projectTitle={activeChatCollab.projectTitle}
          requestingOrgName={activeChatCollab.requestingOrgName}
          targetOrgName={activeChatCollab.targetOrgName}
          currentUser={user}
          currentOrgId={institution?.id}
          isProjectCompleted={activeChatCollab.isCompleted}
        />
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: KPI CARD
// ==========================================
function KpiCard({
  title,
  value,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border border-[#0B5D2A]/15 bg-white shadow-sm flex flex-col justify-between transition ${
        onClick ? "cursor-pointer hover:border-[#168a45] hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#66736b]">{title}</span>
        <div className="p-2 rounded-xl bg-[#eaf7ef] border border-[#0B5D2A]/15">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl sm:text-3xl font-bold text-[#0B5D2A] font-display">
          {value}
        </span>
        <p className="text-[11px] text-[#66736b] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
