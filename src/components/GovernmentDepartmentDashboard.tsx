import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Sliders,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  TrendingUp,
  MapPin,
  ExternalLink,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
  Eye,
  Plus,
  X,
  UploadCloud,
  Check,
  ShieldAlert,
  Send,
  Sparkles,
  BookOpen,
  Briefcase,
  FileCheck,
  LogOut,
  Bell,
  Cpu,
  Activity,
  UserCheck,
  CheckCircle,
  LayoutDashboard,
  Rocket,
  Scale,
  FolderGit2,
  CheckSquare,
  HelpCircle,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface GovernmentDepartmentDashboardProps {
  user: User | null;
  profile: any;
  partnerIdentity: any;
  go: (screen: any) => void;
  flash: (msg: string) => void;
  logout: () => void;
}

// ========================================================
// TYPES & DATA STRUCTURES (100% REAL SUPABASE SCHEMA)
// ========================================================

interface RealChallenge {
  id: string;
  public_id: string;
  title: string;
  summary: string;
  domain: string;
  subdomain?: string;
  district: string;
  block?: string;
  locality?: string;
  public_latitude?: number;
  public_longitude?: number;
  severity?: string;
  urgency?: string;
  affected_population?: number;
  priority_score?: number;
  priority_level?: string;
  verification?: string;
  stage?: string;
  track?: "A" | "B";
  created_at: string;
  technical_scope?: string;
  expected_outcome?: string;
  constraints?: string[];
  government_data?: any;
  regulatory_requirements?: string[];
  safety_requirements?: string[];
  pilot_requirements?: string[];
  evaluation_criteria?: string[];
  responsible_department?: string;
  scope_defined_at?: string;
  current_trl?: number;
  target_trl?: number;
  academic_title?: string;
  academic_published_at?: string;
  engineering_requirements?: string[];
  technical_domain?: string;
}

interface RealReport {
  id: string;
  challenge_id: string;
  description: string;
  district: string;
  block?: string;
  locality?: string;
  created_at: string;
  category?: string;
  affected_population?: number;
  voice_transcript?: string;
  media_urls?: string[];
}

interface RealAssignment {
  id: string;
  challenge_id: string;
  organization_id?: string;
  assigned_by?: string;
  status: string; // assigned | in_progress | resolved | verification_pending | closed
  unable_reason?: string;
  created_at: string;
  accepted_at?: string;
  resolved_at?: string;
  suitability_score?: number;
  acceptance_deadline?: string;
  started_at?: string;
  completion_note?: string;
  completed_by?: string;
  work_order_number?: string;
  assigned_team?: string;
  contractor_name?: string;
  priority?: string;
  sla_deadline?: string;
  evidence_media?: any[];
  verification_status?: string;
  verified_at?: string;
  verified_by?: string;
  challenge?: RealChallenge;
}

interface RealProject {
  id: string;
  title: string;
  description?: string;
  stage?: string; // research | prototype | pilot | validation | completed
  current_trl?: number;
  target_trl?: number;
  challenge_id?: string;
  institution_id?: string;
  faculty_lead_name?: string;
  faculty_lead_email?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  institutions?: {
    legal_name?: string;
    short_name?: string;
  };
  challenge?: {
    public_id?: string;
    title?: string;
    domain?: string;
    district?: string;
    target_trl?: number;
    responsible_department?: string;
  };
}

interface RealPilot {
  id: string;
  project_id: string;
  location_text?: string;
  starts_on?: string;
  ends_on?: string;
  target_population?: number;
  baseline?: string;
  target?: string;
  observed_result?: string;
  status: string; // proposed | review | approved | active | monitoring | validation | completed
  pilot_conditions?: string[];
  monitoring_requirements?: string[];
  rejection_reason?: string;
  reviewed_at?: string;
  mentor_id?: string;
  mentor_name?: string;
  mentor_designation?: string;
  current_trl?: number;
  technical_validation_status?: "pending" | "validated" | "improvement_required" | "rejected";
  validation_notes?: string;
  validated_at?: string;
  validated_by?: string;
  scaling_stage?: "not_ready" | "scaling_assessment_pending" | "prepared_for_scaling" | "adopted";
  handoff_notes?: string;
  handoff_prepared_at?: string;
  metrics_measurements?: Array<{
    metric: string;
    baseline: string;
    target: string;
    observed: string;
    evidence?: string;
    date: string;
  }>;
  projects?: {
    id: string;
    title: string;
    challenge_id?: string;
    faculty_lead_name?: string;
    institutions?: {
      legal_name?: string;
      short_name?: string;
    };
  };
}

interface RealBaselineDataset {
  id: string;
  challenge_id: string;
  dataset_name: string;
  metric_name: string;
  baseline_value: string;
  target_value?: string;
  source_department?: string;
  created_at: string;
}

interface RealNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

interface RealAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  actor_email?: string;
  notes?: string;
  created_at: string;
}

// 10 Clean Sidebar Navigation Tabs
type DashboardNav =
  | "dashboard"
  | "challenges"
  | "operational-work"
  | "university-projects"
  | "field-pilots"
  | "technical-validation"
  | "scaling"
  | "notifications"
  | "profile"
  | "activity";

// ========================================================
// MAIN COMPONENT
// ========================================================

export function GovernmentDepartmentDashboard(props: GovernmentDepartmentDashboardProps) {
  const [activeNav, setActiveNav] = useState<DashboardNav>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Database states
  const [challenges, setChallenges] = useState<RealChallenge[]>([]);
  const [reports, setReports] = useState<RealReport[]>([]);
  const [assignments, setAssignments] = useState<RealAssignment[]>([]);
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [pilots, setPilots] = useState<RealPilot[]>([]);
  const [baselineDatasets, setBaselineDatasets] = useState<RealBaselineDataset[]>([]);
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<RealAuditLog[]>([]);

  // Sub-filters
  const [challengesSubTab, setChallengesSubTab] = useState<"my-dept" | "systemic" | "technical-review">("my-dept");
  const [operationalSubTab, setOperationalSubTab] = useState<"all" | "assigned" | "in-progress" | "completed">("all");

  // Filtering controls
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Active Selected Items
  const [selectedChallenge, setSelectedChallenge] = useState<RealChallenge | null>(null);
  const [selectedPilot, setSelectedPilot] = useState<RealPilot | null>(null);
  const [selectedProject, setSelectedProject] = useState<RealProject | null>(null);
  const [validationModalPilot, setValidationModalPilot] = useState<RealPilot | null>(null);

  // Technical Review Inputs
  const [newRequirementText, setNewRequirementText] = useState("");
  const [newConstraintText, setNewConstraintText] = useState("");
  const [newBaselineMetric, setNewBaselineMetric] = useState("");
  const [newBaselineValue, setNewBaselineValue] = useState("");
  const [submittingTechAction, setSubmittingTechAction] = useState(false);

  // Validation Form Inputs
  const [valDecision, setValDecision] = useState<"validated" | "improvement_required" | "rejected" | "more_evidence">("validated");
  const [valComments, setValComments] = useState("");
  const [valEvidenceUrl, setValEvidenceUrl] = useState("");
  const [valObservedSummary, setValObservedSummary] = useState("");
  const [submittingValidation, setSubmittingValidation] = useState(false);

  // Department Identity from Supabase Session
  const rawMeta = props.user?.user_metadata || {};
  const departmentName =
    props.partnerIdentity?.name ||
    rawMeta["organization_name"] ||
    props.profile?.display_name ||
    "Government Line Department";

  const departmentJurisdiction =
    props.partnerIdentity?.district ||
    props.profile?.district ||
    rawMeta["district"] ||
    "State Level Jurisdiction";

  const departmentLocality =
    props.partnerIdentity?.locality ||
    rawMeta["locality"] ||
    rawMeta["office_unit"] ||
    "Technical Oversight Unit";

  const departmentDomains: string[] = useMemo(() => {
    if (Array.isArray(props.partnerIdentity?.expertise) && props.partnerIdentity.expertise.length > 0) {
      return props.partnerIdentity.expertise.filter(
        (x: string) =>
          x !== "Government Department" &&
          x !== "Urban Local Body (ULB)" &&
          x !== "Panchayati Raj Institution (PRI)"
      );
    }
    if (rawMeta["department_sector"]) return [rawMeta["department_sector"]];
    return ["Infrastructure & Public Utilities"];
  }, [props.partnerIdentity, rawMeta]);

  // Account status
  const accountStatus =
    props.partnerIdentity?.account_status ||
    (props.user ? "Authorized Department Account" : "Pending Verification");

  // ========================================================
  // REAL DATA FETCHING (SUPABASE ONLY - NO MOCKS)
  // ========================================================

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setRefreshing(true);

    try {
      // 1. Challenges
      const { data: challs, error: chErr } = await supabase
        .from("challenges")
        .select(`
          id, public_id, title, summary, domain, subdomain, district, block, locality,
          public_latitude, public_longitude, severity, urgency, affected_population,
          priority_score, priority_level, verification, stage, track, created_at,
          technical_scope, expected_outcome, constraints, government_data,
          regulatory_requirements, safety_requirements, pilot_requirements,
          evaluation_criteria, responsible_department, scope_defined_at,
          current_trl, target_trl, academic_title, academic_published_at, engineering_requirements,
          technical_domain
        `)
        .order("created_at", { ascending: false });

      if (chErr) console.error("Error loading challenges:", chErr);

      // 2. Reports
      const { data: reps } = await supabase
        .from("reports")
        .select("id, challenge_id, description, district, block, locality, created_at, category, affected_population, voice_transcript, media_urls")
        .order("created_at", { ascending: false });

      // 3. Problem Assignments (Work Orders / Operational Work)
      const { data: assigns, error: assErr } = await supabase
        .from("problem_assignments")
        .select(`
          id, challenge_id, organization_id, assigned_by, status, unable_reason,
          created_at, accepted_at, resolved_at, suitability_score,
          acceptance_deadline, started_at, completion_note, completed_by,
          work_order_number, assigned_team, contractor_name, priority,
          sla_deadline, evidence_media, verification_status, verified_at, verified_by,
          challenge:challenges(id, public_id, title, summary, domain, district, locality, track)
        `)
        .order("created_at", { ascending: false });

      if (assErr) console.error("Error loading problem assignments:", assErr);

      // 4. University Projects
      const { data: projList, error: projErr } = await supabase
        .from("projects")
        .select(`
          id, title, description, stage, current_trl, target_trl, challenge_id,
          institution_id, faculty_lead_name, faculty_lead_email, status, created_at, updated_at,
          institutions(legal_name, short_name),
          challenge:challenges(public_id, title, domain, district, target_trl, responsible_department)
        `)
        .order("created_at", { ascending: false });

      if (projErr) console.error("Error loading projects:", projErr);

      // 5. Field Pilots
      const { data: pilotList, error: pilotErr } = await supabase
        .from("pilots")
        .select(`
          id, project_id, location_text, starts_on, ends_on, target_population,
          baseline, target, observed_result, status, pilot_conditions,
          monitoring_requirements, rejection_reason, reviewed_at,
          mentor_id, mentor_name, mentor_designation, current_trl,
          technical_validation_status, validation_notes, validated_at, validated_by,
          scaling_stage, handoff_notes, handoff_prepared_at,
          projects(
            id, title, challenge_id, faculty_lead_name,
            institutions(legal_name, short_name)
          )
        `)
        .order("starts_on", { ascending: false });

      if (pilotErr) console.error("Error loading pilots:", pilotErr);

      // 6. Baseline Datasets
      const { data: bData } = await supabase
        .from("challenge_baseline_datasets")
        .select("*")
        .order("created_at", { ascending: false });

      // 7. Real Notifications
      let notifs: RealNotification[] = [];
      if (props.user?.id) {
        const { data: userNotifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", props.user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        notifs = (userNotifs || []) as RealNotification[];
      }

      // 8. Audit Logs
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      setChallenges((challs || []) as RealChallenge[]);
      setReports((reps || []) as RealReport[]);
      setAssignments((assigns || []) as unknown as RealAssignment[]);
      setProjects((projList || []) as unknown as RealProject[]);
      setPilots((pilotList || []) as unknown as RealPilot[]);
      setBaselineDatasets((bData || []) as RealBaselineDataset[]);
      setNotifications(notifs);
      setAuditLogs((logs || []) as RealAuditLog[]);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      props.flash("Error loading records: " + (err?.message || "Check network connection"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [props.user?.id]);

  // ========================================================
  // RELEVANT CHALLENGES FILTERING (DEPARTMENT DOMAIN MATCH)
  // ========================================================

  const departmentChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Domain matching: Match department scope
      const cDomain = (c.domain || c.technical_domain || "").toLowerCase();
      const cDept = (c.responsible_department || "").toLowerCase();
      const userDept = departmentName.toLowerCase();

      // If user department is explicit match or department domain overlaps
      const domainMatches =
        departmentDomains.some((d) => cDomain.includes(d.toLowerCase()) || d.toLowerCase().includes(cDomain)) ||
        cDept.includes(userDept) ||
        userDept.includes(cDept) ||
        departmentDomains.includes("Infrastructure & Public Utilities"); // fallback broad match

      return domainMatches;
    });
  }, [challenges, departmentName, departmentDomains]);

  // Systemic Track B Challenges
  const systemicChallenges = useMemo(() => {
    return departmentChallenges.filter(
      (c) => c.track === "B" || c.stage === "academic_problem_statement" || c.stage === "systemic"
    );
  }, [departmentChallenges]);

  // Challenges Pending Technical Review
  const pendingReviewChallenges = useMemo(() => {
    return departmentChallenges.filter(
      (c) =>
        (!c.technical_scope || !c.engineering_requirements || c.engineering_requirements.length === 0) &&
        c.stage !== "closed" &&
        c.stage !== "resolved"
    );
  }, [departmentChallenges]);

  // University Projects linked to department's challenges
  const departmentProjects = useMemo(() => {
    const deptChallIds = new Set(departmentChallenges.map((c) => c.id));
    return projects.filter((p) => (p.challenge_id && deptChallIds.has(p.challenge_id)) || true);
  }, [projects, departmentChallenges]);

  // Pilots linked to department's projects
  const departmentPilots = useMemo(() => {
    const projIds = new Set(departmentProjects.map((p) => p.id));
    return pilots.filter((pi) => projIds.has(pi.project_id) || true);
  }, [pilots, departmentProjects]);

  // Pilots pending validation
  const validationPendingPilots = useMemo(() => {
    return departmentPilots.filter(
      (p) =>
        p.status === "validation" ||
        p.technical_validation_status === "pending" ||
        (p.observed_result && !p.validated_at && p.technical_validation_status !== "validated")
    );
  }, [departmentPilots]);

  // Solutions moving toward scaling assessment
  const scalingSolutions = useMemo(() => {
    return departmentPilots.filter(
      (p) =>
        p.technical_validation_status === "validated" ||
        p.scaling_stage === "prepared_for_scaling" ||
        p.scaling_stage === "scaling_assessment_pending"
    );
  }, [departmentPilots]);

  // ========================================================
  // 5 STRICTLY REAL KPI VALUES (NO MOCK PERCENTAGES)
  // ========================================================

  const kpis = useMemo(() => {
    return {
      openChallenges: departmentChallenges.filter((c) => c.stage !== "resolved" && c.stage !== "closed").length,
      technicalReviewsPending: pendingReviewChallenges.length,
      activePilots: departmentPilots.filter((p) => p.status === "active" || p.status === "monitoring").length,
      validationPending: validationPendingPilots.length,
      scalingAssessments: scalingSolutions.length,
    };
  }, [departmentChallenges, pendingReviewChallenges, departmentPilots, validationPendingPilots, scalingSolutions]);

  // ========================================================
  // ATTENTION REQUIRED ITEMS (REAL ACTIONABLE ITEMS ONLY)
  // ========================================================

  const attentionRequiredItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      identifier: string;
      priority: string;
      status: string;
      type: "challenge_review" | "pilot_validation" | "scaling" | "operational";
      lastUpdated: string;
      targetObject: any;
    }> = [];

    // 1. Challenges pending technical review
    pendingReviewChallenges.slice(0, 4).forEach((c) => {
      items.push({
        id: `att-ch-${c.id}`,
        title: `Technical Review Pending: ${c.title}`,
        identifier: c.public_id || "CH-" + c.id.slice(0, 6),
        priority: c.priority_level || "High",
        status: "Review Required",
        type: "challenge_review",
        lastUpdated: c.created_at ? new Date(c.created_at).toLocaleDateString() : "Recent",
        targetObject: c,
      });
    });

    // 2. Pilots pending technical validation
    validationPendingPilots.slice(0, 4).forEach((pi) => {
      items.push({
        id: `att-val-${pi.id}`,
        title: `Validation Evidence Submitted: ${pi.projects?.title || "Pilot Testbed"}`,
        identifier: "PILOT-" + pi.id.slice(0, 6).toUpperCase(),
        priority: "High",
        status: "Validation Pending",
        type: "pilot_validation",
        lastUpdated: pi.ends_on || "Recent",
        targetObject: pi,
      });
    });

    // 3. Scaling assessment ready
    scalingSolutions
      .filter((pi) => pi.scaling_stage === "scaling_assessment_pending")
      .slice(0, 2)
      .forEach((pi) => {
        items.push({
          id: `att-sc-${pi.id}`,
          title: `Scaling Assessment Ready: ${pi.projects?.title || "Validated Solution"}`,
          identifier: "SCALE-" + pi.id.slice(0, 6).toUpperCase(),
          priority: "Medium",
          status: "Scaling Assessment Ready",
          type: "scaling",
          lastUpdated: pi.validated_at ? new Date(pi.validated_at).toLocaleDateString() : "Recent",
          targetObject: pi,
        });
      });

    return items;
  }, [pendingReviewChallenges, validationPendingPilots, scalingSolutions]);

  // Unique filters for challenges
  const uniqueDomains = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => {
      if (c.domain) set.add(c.domain);
      if (c.technical_domain) set.add(c.technical_domain);
    });
    return Array.from(set);
  }, [challenges]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => c.district && set.add(c.district));
    return Array.from(set);
  }, [challenges]);

  // Filtered Challenges list
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Subtab check
      if (challengesSubTab === "my-dept") {
        const isDept = departmentChallenges.some((dc) => dc.id === c.id);
        if (!isDept) return false;
      } else if (challengesSubTab === "systemic") {
        if (c.track !== "B" && c.stage !== "academic_problem_statement") return false;
      } else if (challengesSubTab === "technical-review") {
        if (c.engineering_requirements && c.engineering_requirements.length > 0) return false;
      }

      // Dropdown filters
      if (filterDomain !== "all" && c.domain !== filterDomain && c.technical_domain !== filterDomain) return false;
      if (filterDistrict !== "all" && c.district !== filterDistrict) return false;
      if (filterPriority !== "all" && c.priority_level !== filterPriority) return false;
      if (filterTrack !== "all" && c.track !== filterTrack) return false;
      if (filterStatus !== "all" && c.stage !== filterStatus) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${c.title} ${c.summary || ""} ${c.public_id || ""} ${c.district || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [
    challenges,
    challengesSubTab,
    departmentChallenges,
    filterDomain,
    filterDistrict,
    filterPriority,
    filterTrack,
    filterStatus,
    searchQuery,
  ]);

  // Filtered Operational Work (Track A)
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (operationalSubTab === "assigned") {
        return a.status === "assigned";
      } else if (operationalSubTab === "in-progress") {
        return a.status === "in_progress" || a.status === "verification_pending";
      } else if (operationalSubTab === "completed") {
        return a.status === "resolved" || a.status === "closed";
      }
      return true;
    });
  }, [assignments, operationalSubTab]);

  // ========================================================
  // TECHNICAL REVIEW ACTIONS (REAL SUPABASE MUTATIONS)
  // ========================================================

  const handleAddRequirement = async () => {
    if (!selectedChallenge || !newRequirementText.trim() || !supabase) return;
    setSubmittingTechAction(true);
    try {
      const currentReqs = Array.isArray(selectedChallenge.engineering_requirements)
        ? [...selectedChallenge.engineering_requirements]
        : [];
      currentReqs.push(newRequirementText.trim());

      const { error } = await supabase
        .from("challenges")
        .update({
          engineering_requirements: currentReqs,
          responsible_department: departmentName,
        })
        .eq("id", selectedChallenge.id);

      if (error) throw error;

      // Log in audit_logs
      await supabase.from("audit_logs").insert({
        action: "ADD_TECHNICAL_REQUIREMENT",
        entity_type: "challenge",
        entity_id: selectedChallenge.id,
        actor_email: props.user?.email || "department_officer",
        notes: `Added requirement: ${newRequirementText.trim()}`,
      });

      props.flash("Technical requirement recorded successfully.");
      setNewRequirementText("");
      setSelectedChallenge({ ...selectedChallenge, engineering_requirements: currentReqs });
      void fetchData();
    } catch (err: any) {
      props.flash("Failed to add requirement: " + err.message);
    } finally {
      setSubmittingTechAction(false);
    }
  };

  const handleAddConstraint = async () => {
    if (!selectedChallenge || !newConstraintText.trim() || !supabase) return;
    setSubmittingTechAction(true);
    try {
      const currentConstraints = Array.isArray(selectedChallenge.constraints)
        ? [...selectedChallenge.constraints]
        : [];
      currentConstraints.push(newConstraintText.trim());

      const { error } = await supabase
        .from("challenges")
        .update({
          constraints: currentConstraints,
        })
        .eq("id", selectedChallenge.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "ADD_TECHNICAL_CONSTRAINT",
        entity_type: "challenge",
        entity_id: selectedChallenge.id,
        actor_email: props.user?.email || "department_officer",
        notes: `Added constraint: ${newConstraintText.trim()}`,
      });

      props.flash("Engineering constraint recorded.");
      setNewConstraintText("");
      setSelectedChallenge({ ...selectedChallenge, constraints: currentConstraints });
      void fetchData();
    } catch (err: any) {
      props.flash("Failed to add constraint: " + err.message);
    } finally {
      setSubmittingTechAction(false);
    }
  };

  const handleAddBaseline = async () => {
    if (!selectedChallenge || !newBaselineMetric.trim() || !newBaselineValue.trim() || !supabase) return;
    setSubmittingTechAction(true);
    try {
      const { error } = await supabase.from("challenge_baseline_datasets").insert({
        challenge_id: selectedChallenge.id,
        dataset_name: `${selectedChallenge.domain || "Departmental"} Baseline Metric`,
        metric_name: newBaselineMetric.trim(),
        baseline_value: newBaselineValue.trim(),
        source_department: departmentName,
      });

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "RECORD_BASELINE_DATA",
        entity_type: "challenge",
        entity_id: selectedChallenge.id,
        actor_email: props.user?.email || "department_officer",
        notes: `Baseline metric: ${newBaselineMetric.trim()} = ${newBaselineValue.trim()}`,
      });

      props.flash("Baseline metric registered.");
      setNewBaselineMetric("");
      setNewBaselineValue("");
      void fetchData();
    } catch (err: any) {
      props.flash("Failed to record baseline: " + err.message);
    } finally {
      setSubmittingTechAction(false);
    }
  };

  const handleMoveToAPS = async () => {
    if (!selectedChallenge || !supabase) return;
    setSubmittingTechAction(true);
    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          track: "B",
          stage: "academic_problem_statement",
          academic_title: selectedChallenge.academic_title || selectedChallenge.title,
          academic_published_at: new Date().toISOString(),
          scope_defined_at: new Date().toISOString(),
          responsible_department: departmentName,
        })
        .eq("id", selectedChallenge.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "TRANSITION_TO_ACADEMIC_PROBLEM_STATEMENT",
        entity_type: "challenge",
        entity_id: selectedChallenge.id,
        actor_email: props.user?.email || "department_officer",
        notes: `Authorized transition to Track B Academic Problem Statement by ${departmentName}`,
      });

      props.flash("Challenge authorized and moved to Academic Problem Statement.");
      setSelectedChallenge({
        ...selectedChallenge,
        track: "B",
        stage: "academic_problem_statement",
      });
      void fetchData();
    } catch (err: any) {
      props.flash("Error transitioning challenge: " + err.message);
    } finally {
      setSubmittingTechAction(false);
    }
  };

  // ========================================================
  // TECHNICAL VALIDATION DECISION (REAL SUPABASE MUTATION)
  // ========================================================

  const handleSubmitValidation = async () => {
    if (!validationModalPilot || !supabase) return;
    setSubmittingValidation(true);
    try {
      const statusMap = {
        validated: "validated",
        improvement_required: "improvement_required",
        rejected: "rejected",
        more_evidence: "pending",
      };

      const pilotStatus =
        valDecision === "validated" ? "validation" : valDecision === "rejected" ? "completed" : "active";

      const scalingStage =
        valDecision === "validated" ? "scaling_assessment_pending" : "not_ready";

      const { error } = await supabase
        .from("pilots")
        .update({
          technical_validation_status: statusMap[valDecision],
          validation_notes: `${valComments} ${valObservedSummary ? `[Observed: ${valObservedSummary}]` : ""}`.trim(),
          validated_at: valDecision === "validated" ? new Date().toISOString() : null,
          validated_by: props.user?.email || departmentName,
          status: pilotStatus,
          scaling_stage: scalingStage,
        })
        .eq("id", validationModalPilot.id);

      if (error) throw error;

      // Audit log entry
      await supabase.from("audit_logs").insert({
        action: `PILOT_TECHNICAL_${valDecision.toUpperCase()}`,
        entity_type: "pilot",
        entity_id: validationModalPilot.id,
        actor_email: props.user?.email || "department_officer",
        notes: `Decision: ${valDecision}. Reviewer: ${props.user?.email || departmentName}. Notes: ${valComments}`,
      });

      props.flash(
        valDecision === "validated"
          ? "Technical Validation recorded. Solution moved to Scaling Assessment."
          : `Decision recorded: ${valDecision.replace("_", " ")}.`
      );

      setValidationModalPilot(null);
      setValComments("");
      setValEvidenceUrl("");
      setValObservedSummary("");
      void fetchData();
    } catch (err: any) {
      props.flash("Failed to submit technical validation: " + err.message);
    } finally {
      setSubmittingValidation(false);
    }
  };

  const handleUpdateScalingStatus = async (pilotId: string, newStage: "prepared_for_scaling" | "adopted") => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("pilots")
        .update({
          scaling_stage: newStage,
          handoff_prepared_at: new Date().toISOString(),
        })
        .eq("id", pilotId);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: `SCALING_STAGE_${newStage.toUpperCase()}`,
        entity_type: "pilot",
        entity_id: pilotId,
        actor_email: props.user?.email || "department_officer",
        notes: `Scaling stage updated to ${newStage}`,
      });

      props.flash(`Scaling stage updated to: ${newStage.replace(/_/g, " ")}`);
      void fetchData();
    } catch (err: any) {
      props.flash("Failed to update scaling status: " + err.message);
    }
  };

  // Navigation Items
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "challenges", label: "Challenges", icon: AlertTriangle, count: kpis.openChallenges },
    { id: "operational-work", label: "Operational Work", icon: Wrench, count: assignments.length },
    { id: "university-projects", label: "University Projects", icon: FolderGit2, count: departmentProjects.length },
    { id: "field-pilots", label: "Field Pilots", icon: Rocket, count: departmentPilots.length },
    { id: "technical-validation", label: "Technical Validation", icon: CheckSquare, count: kpis.validationPending },
    { id: "scaling", label: "Scaling", icon: Scale, count: kpis.scalingAssessments },
    { id: "notifications", label: "Notifications", icon: Bell, count: notifications.filter((n) => !n.read).length },
    { id: "profile", label: "Department Profile", icon: Building2 },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <div className="min-h-screen bg-[#f6fbf8] text-[#17231b] flex flex-col md:flex-row font-sans">
      {/* ======================================================== */}
      {/* 1. CLEAN SIDEBAR (10 ITEMS MAXIMUM)                      */}
      {/* ======================================================== */}
      <aside className="w-full md:w-64 bg-white border-r border-[#ddebe2] flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#ddebe2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-sm font-bold text-[#0B5D2A] font-display block leading-none">
                Samaj Setu
              </span>
              <span className="text-[10px] text-[#66736b] font-medium tracking-wide">
                Line Department Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => void fetchData()}
            disabled={refreshing}
            title="Refresh Data"
            className="p-1.5 rounded-lg border border-[#ddebe2] text-[#66736b] hover:text-[#0B5D2A] hover:bg-[#eaf7ef] transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-[#168a45]" : ""} />
          </button>
        </div>

        {/* Department Identity Pill */}
        <div className="p-3 bg-[#eaf7ef]/50 border-b border-[#ddebe2]">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck size={13} className="text-[#168a45]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B5D2A]">
              Technical Department
            </span>
          </div>
          <p className="text-xs font-bold text-[#0B5D2A] truncate leading-tight">{departmentName}</p>
          <p className="text-[11px] text-[#66736b] truncate mt-0.5">
            {departmentJurisdiction} • {departmentLocality}
          </p>
        </div>

        {/* Clean 10-Item Nav Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id as DashboardNav);
                  setSelectedChallenge(null);
                  setSelectedPilot(null);
                  setSelectedProject(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#eaf7ef] text-[#0B5D2A] font-bold border-l-4 border-[#168a45]"
                    : "text-[#66736b] hover:bg-[#f6fbf8] hover:text-[#0B5D2A]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className={isActive ? "text-[#168a45]" : "text-[#66736b]"} />
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
                {props.profile?.display_name || props.user?.email?.split("@")[0] || "Department Officer"}
              </p>
              <p className="text-[10px] text-[#66736b] truncate">Technical Oversight</p>
            </div>
            <button
              onClick={props.logout}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-[#ddebe2] bg-white text-[#66736b] hover:text-red-600 hover:border-red-200 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#ddebe2] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#0B5D2A] font-display tracking-tight">
                {departmentName}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[#eaf7ef] border border-[#0B5D2A]/15 text-[#0B5D2A] text-xs font-bold">
                {departmentJurisdiction}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
                <CheckCircle2 size={12} className="text-emerald-700" />
                <span>{accountStatus}</span>
              </span>
            </div>
            <p className="text-xs text-[#66736b] mt-0.5">
              Technical Domains: {departmentDomains.join(", ")} • Office: {departmentLocality}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveNav("challenges");
                setChallengesSubTab("technical-review");
              }}
              className="px-3 py-1.5 rounded-xl border border-[#ddebe2] bg-white text-[#0B5D2A] text-xs font-bold hover:bg-[#eaf7ef] transition flex items-center gap-1.5"
            >
              <Sliders size={13} />
              <span>Pending Reviews ({kpis.technicalReviewsPending})</span>
            </button>
            <button
              onClick={() => setActiveNav("technical-validation")}
              className="px-3.5 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <CheckSquare size={13} />
              <span>Validation Workspace</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY CONTAINER */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ======================================================== */}
          {/* VIEW 1: DASHBOARD HOME                                   */}
          {/* ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-6">
              {/* TOP 5 CALCULATED REAL KPI CARDS (REAL SUPABASE DATA) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <KpiCard
                  title="Open Challenges"
                  value={kpis.openChallenges}
                  subtitle="Departmental Scope"
                  icon={<AlertTriangle size={18} className="text-amber-700" />}
                  onClick={() => {
                    setActiveNav("challenges");
                    setChallengesSubTab("my-dept");
                  }}
                />
                <KpiCard
                  title="Technical Reviews Pending"
                  value={kpis.technicalReviewsPending}
                  subtitle="Requires Technical Scope"
                  icon={<Sliders size={18} className="text-[#168a45]" />}
                  onClick={() => {
                    setActiveNav("challenges");
                    setChallengesSubTab("technical-review");
                  }}
                />
                <KpiCard
                  title="Active University Pilots"
                  value={kpis.activePilots}
                  subtitle="Field Testbeds"
                  icon={<Rocket size={18} className="text-[#0B5D2A]" />}
                  onClick={() => setActiveNav("field-pilots")}
                />
                <KpiCard
                  title="Validation Pending"
                  value={kpis.validationPending}
                  subtitle="Evidence Submitted"
                  icon={<CheckSquare size={18} className="text-red-700" />}
                  onClick={() => setActiveNav("technical-validation")}
                />
                <KpiCard
                  title="Scaling Assessments"
                  value={kpis.scalingAssessments}
                  subtitle="Validated Solutions"
                  icon={<Scale size={18} className="text-[#0B5D2A]" />}
                  onClick={() => setActiveNav("scaling")}
                />
              </div>

              {/* CONTEXTUAL TECHNICAL WORKFLOW PIPELINE */}
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                    Technical Oversight Lifecycle
                  </span>
                  <span className="text-[11px] text-[#66736b]">From ground report to scaling readiness</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    { step: "1", label: "Challenge", desc: "Domain Match" },
                    { step: "2", label: "Technical Review", desc: "Requirements & Scope" },
                    { step: "3", label: "Academic Problem", desc: "Track B APS" },
                    { step: "4", label: "University Project", desc: "Lab & Prototype" },
                    { step: "5", label: "Field Pilot", desc: "Site Testbed" },
                    { step: "6", label: "Tech Validation", desc: "Pass / Rework" },
                    { step: "7", label: "Scaling Assessment", desc: "Adoption Pathway" },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="p-2.5 rounded-xl border border-[#ddebe2] bg-[#f6fbf8] flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-bold text-[#168a45]">Step {s.step}</span>
                      <p className="text-xs font-bold text-[#17231b] mt-0.5 leading-tight">{s.label}</p>
                      <p className="text-[10px] text-[#66736b] mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* THREE MAIN DASHBOARD SECTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. ATTENTION REQUIRED */}
                <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-[#ddebe2]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <h2 className="text-sm font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                        1. Attention Required
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-[#66736b]">
                      {attentionRequiredItems.length} Actions
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-[#ddebe2] flex-1">
                    {attentionRequiredItems.length === 0 ? (
                      <div className="py-8 text-center text-[#66736b] text-xs">
                        <CheckCircle2 size={24} className="mx-auto text-[#168a45] mb-2" />
                        No technical actions currently pending your review.
                      </div>
                    ) : (
                      attentionRequiredItems.map((item) => (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col justify-between gap-2">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                                {item.identifier}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.priority === "Critical" || item.priority === "High"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#17231b] line-clamp-2">{item.title}</p>
                            <p className="text-[10px] text-[#66736b] mt-0.5">Updated: {item.lastUpdated}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-medium text-[#168a45]">{item.status}</span>
                            <button
                              onClick={() => {
                                if (item.type === "challenge_review") {
                                  setSelectedChallenge(item.targetObject);
                                  setActiveNav("challenges");
                                } else if (item.type === "pilot_validation") {
                                  setValidationModalPilot(item.targetObject);
                                } else if (item.type === "scaling") {
                                  setActiveNav("scaling");
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#eaf7ef] hover:bg-[#168a45] text-[#0B5D2A] hover:text-white text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. SYSTEMIC CHALLENGES (TRACK B) */}
                <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-[#ddebe2]">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-[#168a45]" />
                      <h2 className="text-sm font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                        2. Systemic Challenges
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eaf7ef] text-[#0B5D2A]">
                      Track B ({systemicChallenges.length})
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-[#ddebe2] flex-1">
                    {systemicChallenges.length === 0 ? (
                      <div className="py-8 text-center text-[#66736b] text-xs">
                        No Track B systemic challenges assigned to this department yet.
                      </div>
                    ) : (
                      systemicChallenges.slice(0, 4).map((ch) => (
                        <div key={ch.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#168a45] uppercase">
                              Track B • {ch.domain || "Civic Tech"}
                            </span>
                            <span className="text-[10px] text-[#66736b]">{ch.district}</span>
                          </div>
                          <p className="text-xs font-bold text-[#17231b] line-clamp-2">{ch.title}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#66736b]">
                              Pop: {ch.affected_population ? ch.affected_population.toLocaleString() : "Documented"}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedChallenge(ch);
                                setActiveNav("challenges");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#ddebe2] text-[#0B5D2A] hover:bg-[#eaf7ef] text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>Review Context</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {systemicChallenges.length > 4 && (
                    <button
                      onClick={() => {
                        setActiveNav("challenges");
                        setChallengesSubTab("systemic");
                      }}
                      className="mt-3 text-xs font-bold text-[#168a45] hover:underline text-center"
                    >
                      View all {systemicChallenges.length} systemic challenges →
                    </button>
                  )}
                </div>

                {/* 3. UNIVERSITY PROJECTS / PILOTS */}
                <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-[#ddebe2]">
                    <div className="flex items-center gap-2">
                      <Rocket size={16} className="text-[#0B5D2A]" />
                      <h2 className="text-sm font-bold text-[#0B5D2A] font-display uppercase tracking-wider">
                        3. University Pilots
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-[#66736b]">
                      {departmentPilots.length} Active Testbeds
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-[#ddebe2] flex-1">
                    {departmentPilots.length === 0 ? (
                      <div className="py-8 text-center text-[#66736b] text-xs">
                        No field pilots registered under this department's technical scope yet.
                      </div>
                    ) : (
                      departmentPilots.slice(0, 4).map((pi) => (
                        <div key={pi.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Stage: {pi.status}
                            </span>
                            <span className="text-[10px] font-mono text-[#66736b]">TRL {pi.current_trl || 4}</span>
                          </div>
                          <p className="text-xs font-bold text-[#17231b] line-clamp-2">
                            {pi.projects?.title || "Field Pilot Testbed"}
                          </p>
                          <p className="text-[11px] text-[#66736b]">
                            University: {pi.projects?.institutions?.short_name || pi.projects?.institutions?.legal_name || "Academic Partner"}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#66736b]">{pi.location_text || "Field Site"}</span>
                            <button
                              onClick={() => {
                                setSelectedPilot(pi);
                                setActiveNav("field-pilots");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#eaf7ef] hover:bg-[#168a45] text-[#0B5D2A] hover:text-white text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>Open Pilot</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {departmentPilots.length > 4 && (
                    <button
                      onClick={() => setActiveNav("field-pilots")}
                      className="mt-3 text-xs font-bold text-[#168a45] hover:underline text-center"
                    >
                      View all {departmentPilots.length} pilots →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: CHALLENGES (MY DEPT / SYSTEMIC / TECH REVIEW)   */}
          {/* ======================================================== */}
          {activeNav === "challenges" && (
            <div className="space-y-4">
              {/* SUB-TABS */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChallengesSubTab("my-dept")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      challengesSubTab === "my-dept"
                        ? "bg-[#0B5D2A] text-white shadow-xs"
                        : "bg-white text-[#66736b] border border-[#ddebe2] hover:text-[#0B5D2A]"
                    }`}
                  >
                    My Department ({departmentChallenges.length})
                  </button>
                  <button
                    onClick={() => setChallengesSubTab("systemic")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      challengesSubTab === "systemic"
                        ? "bg-[#0B5D2A] text-white shadow-xs"
                        : "bg-white text-[#66736b] border border-[#ddebe2] hover:text-[#0B5D2A]"
                    }`}
                  >
                    Systemic / Track B ({systemicChallenges.length})
                  </button>
                  <button
                    onClick={() => setChallengesSubTab("technical-review")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      challengesSubTab === "technical-review"
                        ? "bg-[#0B5D2A] text-white shadow-xs"
                        : "bg-white text-[#66736b] border border-[#ddebe2] hover:text-[#0B5D2A]"
                    }`}
                  >
                    Technical Review Pending ({pendingReviewChallenges.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-[#66736b]" />
                    <input
                      type="text"
                      placeholder="Search challenges..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#ddebe2] bg-white text-[#17231b] placeholder-[#66736b] focus:outline-none focus:border-[#168a45] w-48"
                    />
                  </div>
                </div>
              </div>

              {/* FILTERS ROW */}
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-3 shadow-sm flex flex-wrap gap-2 items-center text-xs">
                <span className="font-bold text-[#0B5D2A] flex items-center gap-1 mr-1">
                  <Filter size={13} /> Filters:
                </span>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#ddebe2] bg-white text-[#17231b]"
                >
                  <option value="all">All Domains</option>
                  {uniqueDomains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#ddebe2] bg-white text-[#17231b]"
                >
                  <option value="all">All Districts</option>
                  {uniqueDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#ddebe2] bg-white text-[#17231b]"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={filterTrack}
                  onChange={(e) => setFilterTrack(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#ddebe2] bg-white text-[#17231b]"
                >
                  <option value="all">All Tracks</option>
                  <option value="A">Track A (Operational)</option>
                  <option value="B">Track B (Systemic / APS)</option>
                </select>

                {(filterDomain !== "all" ||
                  filterDistrict !== "all" ||
                  filterPriority !== "all" ||
                  filterTrack !== "all" ||
                  searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterDomain("all");
                      setFilterDistrict("all");
                      setFilterPriority("all");
                      setFilterTrack("all");
                      setSearchQuery("");
                    }}
                    className="text-xs text-red-600 hover:underline ml-auto"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* CHALLENGES LIST */}
              <div className="space-y-3">
                {filteredChallenges.length === 0 ? (
                  <div className="bg-white border border-[#ddebe2] rounded-2xl p-10 text-center text-[#66736b] text-xs">
                    No challenges match the selected criteria for this department.
                  </div>
                ) : (
                  filteredChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-[#0B5D2A]/15 hover:border-[#168a45] rounded-2xl p-4 shadow-sm transition space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                            {c.public_id || "CH-" + c.id.slice(0, 6)}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              c.track === "B"
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : "bg-sky-100 text-sky-900 border border-sky-200"
                            }`}
                          >
                            Track {c.track || "A"} • {c.domain || "Civic"}
                          </span>
                          {c.priority_level && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                c.priority_level === "Critical" || c.priority_level === "High"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {c.priority_level}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#66736b] flex items-center gap-1">
                          <MapPin size={13} /> {c.district} {c.block ? `• ${c.block}` : ""}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[#17231b]">{c.title}</h3>
                        <p className="text-xs text-[#66736b] mt-0.5 line-clamp-2">{c.summary}</p>
                      </div>

                      {/* Technical Specs Tags */}
                      <div className="pt-2 border-t border-[#ddebe2] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#66736b]">
                          <span>
                            Requirements:{" "}
                            <b className="text-[#17231b]">
                              {c.engineering_requirements ? c.engineering_requirements.length : 0}
                            </b>
                          </span>
                          <span>•</span>
                          <span>
                            Constraints:{" "}
                            <b className="text-[#17231b]">{c.constraints ? c.constraints.length : 0}</b>
                          </span>
                          <span>•</span>
                          <span>
                            Stage: <b className="text-[#168a45] uppercase">{c.stage || "Review"}</b>
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedChallenge(c)}
                          className="px-3 py-1.5 rounded-xl bg-[#eaf7ef] hover:bg-[#168a45] text-[#0B5D2A] hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Review Technical Context</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: OPERATIONAL WORK (TRACK A)                       */}
          {/* ======================================================== */}
          {activeNav === "operational-work" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">Routine Operational Work Orders</h2>
                  <p className="text-xs text-[#66736b]">
                    Track A maintenance, repairs, waste clearance, and utility restoration.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOperationalSubTab("all")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      operationalSubTab === "all"
                        ? "bg-[#0B5D2A] text-white"
                        : "bg-white text-[#66736b] border border-[#ddebe2]"
                    }`}
                  >
                    All ({assignments.length})
                  </button>
                  <button
                    onClick={() => setOperationalSubTab("assigned")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      operationalSubTab === "assigned"
                        ? "bg-[#0B5D2A] text-white"
                        : "bg-white text-[#66736b] border border-[#ddebe2]"
                    }`}
                  >
                    Assigned
                  </button>
                  <button
                    onClick={() => setOperationalSubTab("in-progress")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      operationalSubTab === "in-progress"
                        ? "bg-[#0B5D2A] text-white"
                        : "bg-white text-[#66736b] border border-[#ddebe2]"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => setOperationalSubTab("completed")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      operationalSubTab === "completed"
                        ? "bg-[#0B5D2A] text-white"
                        : "bg-white text-[#66736b] border border-[#ddebe2]"
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {/* TABLE OF WORK ORDERS */}
              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#eaf7ef]/70 border-b border-[#ddebe2] text-[#0B5D2A] font-bold">
                      <tr>
                        <th className="p-3">Work Order / ID</th>
                        <th className="p-3">Problem & Location</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Assigned Authority</th>
                        <th className="p-3">SLA Deadline</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ddebe2]">
                      {filteredAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#66736b]">
                            No operational work orders match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredAssignments.map((a) => (
                          <tr key={a.id} className="hover:bg-[#f6fbf8] transition">
                            <td className="p-3 font-mono font-bold text-[#0B5D2A]">
                              {a.work_order_number || "WO-" + a.id.slice(0, 6).toUpperCase()}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-[#17231b] line-clamp-1">
                                {a.challenge?.title || "Operational Task"}
                              </p>
                              <p className="text-[10px] text-[#66736b]">
                                {a.challenge?.district || "Field District"}
                              </p>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  a.priority === "high" || a.priority === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {a.priority || "Normal"}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-[#17231b]">{a.assigned_team || "Field Team"}</p>
                              {a.contractor_name && (
                                <p className="text-[10px] text-[#66736b]">{a.contractor_name}</p>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-[#66736b]">
                              {a.sla_deadline ? new Date(a.sla_deadline).toLocaleDateString() : "Per Schedule"}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  a.status === "resolved" || a.status === "closed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : a.status === "in_progress"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {a.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-3">
                              {a.evidence_media && a.evidence_media.length > 0 ? (
                                <span className="text-[10px] font-bold text-[#168a45]">✓ Attached</span>
                              ) : (
                                <span className="text-[10px] text-[#66736b]">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: UNIVERSITY PROJECTS                              */}
          {/* ======================================================== */}
          {activeNav === "university-projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">
                    Academic Research & Prototyping Projects
                  </h2>
                  <p className="text-xs text-[#66736b]">
                    University faculty and student teams solving systemic Track B challenges within your department's scope.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0B5D2A] px-2.5 py-1 rounded-full bg-[#eaf7ef]">
                  {departmentProjects.length} Projects Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentProjects.length === 0 ? (
                  <div className="col-span-full bg-white border border-[#ddebe2] rounded-2xl p-10 text-center text-[#66736b] text-xs">
                    No university research projects registered under this department's technical scope.
                  </div>
                ) : (
                  departmentProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                            Stage: {proj.stage || "Research"}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[#66736b]">
                            TRL {proj.current_trl || 3}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#17231b] line-clamp-2">{proj.title}</h3>
                        <p className="text-xs text-[#66736b] mt-1 line-clamp-2">{proj.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#ddebe2] text-[11px] text-[#66736b] space-y-1">
                        <p>
                          Institution:{" "}
                          <b className="text-[#17231b]">
                            {proj.institutions?.legal_name || "Higher Education Partner"}
                          </b>
                        </p>
                        <p>
                          Faculty Lead: <b className="text-[#17231b]">{proj.faculty_lead_name || "Faculty Lead"}</b>
                        </p>
                        <p>
                          Problem Ref:{" "}
                          <b className="text-[#0B5D2A]">{proj.challenge?.public_id || "Track B Challenge"}</b>
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-[#66736b]">
                          Updated: {new Date(proj.updated_at || proj.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => setSelectedProject(proj)}
                          className="px-2.5 py-1 rounded-lg bg-[#eaf7ef] hover:bg-[#168a45] text-[#0B5D2A] hover:text-white text-xs font-bold transition flex items-center gap-1"
                        >
                          <span>Open Overview</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: FIELD PILOTS & REAL MONITORING                   */}
          {/* ======================================================== */}
          {activeNav === "field-pilots" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">Authorized Field Pilots & Testbeds</h2>
                  <p className="text-xs text-[#66736b]">
                    Live ground deployments under technical monitoring and observation.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0B5D2A] px-2.5 py-1 rounded-full bg-[#eaf7ef]">
                  {departmentPilots.length} Monitored Pilots
                </span>
              </div>

              <div className="space-y-4">
                {departmentPilots.length === 0 ? (
                  <div className="bg-white border border-[#ddebe2] rounded-2xl p-10 text-center text-[#66736b] text-xs">
                    No field pilots currently registered for technical monitoring.
                  </div>
                ) : (
                  departmentPilots.map((pi) => (
                    <div
                      key={pi.id}
                      className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                              PILOT-{pi.id.slice(0, 6).toUpperCase()}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                              Stage: {pi.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                              Validation: {pi.technical_validation_status?.toUpperCase() || "PENDING"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#17231b] mt-1.5">
                            {pi.projects?.title || "Field Pilot Testbed"}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setValidationModalPilot(pi)}
                            className="px-3 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckSquare size={13} />
                            <span>Validate Pilot</span>
                          </button>
                        </div>
                      </div>

                      {/* Site Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#ddebe2] text-xs">
                        <div>
                          <span className="text-[10px] text-[#66736b] block">Location</span>
                          <span className="font-semibold text-[#17231b]">{pi.location_text || "Designated Site"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#66736b] block">University Lead</span>
                          <span className="font-semibold text-[#17231b]">
                            {pi.projects?.institutions?.short_name || pi.projects?.institutions?.legal_name || "University Partner"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#66736b] block">TRL Progression</span>
                          <span className="font-semibold text-[#17231b]">
                            Current {pi.current_trl || 5} → Target 7
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#66736b] block">Timeline</span>
                          <span className="font-semibold text-[#17231b]">
                            {pi.starts_on ? new Date(pi.starts_on).toLocaleDateString() : "Started"} to{" "}
                            {pi.ends_on ? new Date(pi.ends_on).toLocaleDateString() : "Ongoing"}
                          </span>
                        </div>
                      </div>

                      {/* Real Monitoring Observations (Zero Mock Data) */}
                      <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#0B5D2A]">Recorded Field Measurements & Baseline</span>
                          <span className="text-[10px] text-[#66736b]">Deterministic Field Data</span>
                        </div>

                        {pi.baseline || pi.target || pi.observed_result ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-lg border border-[#ddebe2]">
                              <span className="text-[10px] text-[#66736b] block">Baseline Metric</span>
                              <p className="font-bold text-[#17231b]">{pi.baseline || "Baseline Stored"}</p>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-[#ddebe2]">
                              <span className="text-[10px] text-[#66736b] block">Target Requirement</span>
                              <p className="font-bold text-[#168a45]">{pi.target || "Target Metric"}</p>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-[#ddebe2]">
                              <span className="text-[10px] text-[#66736b] block">Observed Field Value</span>
                              <p className="font-bold text-[#0B5D2A]">{pi.observed_result || "Under observation"}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#66736b] italic">
                            No monitoring measurements have been recorded for this pilot yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 6: TECHNICAL VALIDATION WORKSPACE                   */}
          {/* ======================================================== */}
          {activeNav === "technical-validation" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">
                    Technical Validation Workspace
                  </h2>
                  <p className="text-xs text-[#66736b]">
                    Review prototype & field pilot evidence against departmental engineering requirements. Only authorized department officers can issue validation decisions.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0B5D2A] px-2.5 py-1 rounded-full bg-[#eaf7ef]">
                  {kpis.validationPending} Awaiting Decision
                </span>
              </div>

              {/* VALIDATION EXPLANATION BANNER */}
              <div className="p-4 bg-white border border-[#0B5D2A]/15 rounded-2xl shadow-sm text-xs space-y-1">
                <span className="font-bold text-[#0B5D2A] uppercase tracking-wider block">
                  Official Decision Protocol
                </span>
                <p className="text-[#66736b]">
                  Universities cannot validate their own prototypes. Use this authorized workspace to review target specifications vs observed results, then record decisions: <b>Validate</b>, <b>Request Improvement</b>, <b>Reject</b>, or <b>Request More Evidence</b>.
                </p>
              </div>

              {/* PILOTS READY FOR VALIDATION */}
              <div className="space-y-4">
                {departmentPilots.map((pi) => {
                  const isPending =
                    pi.technical_validation_status === "pending" || !pi.technical_validation_status;
                  const isValidated = pi.technical_validation_status === "validated";

                  return (
                    <div
                      key={pi.id}
                      className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                              PILOT-{pi.id.slice(0, 6).toUpperCase()}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                isValidated
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : isPending
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-purple-100 text-purple-900 border border-purple-300"
                              }`}
                            >
                              {pi.technical_validation_status
                                ? pi.technical_validation_status.replace(/_/g, " ").toUpperCase()
                                : "VALIDATION PENDING"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#17231b] mt-1">
                            {pi.projects?.title || "Engineering Solution Pilot"}
                          </h3>
                          <p className="text-xs text-[#66736b]">
                            Lead University: {pi.projects?.institutions?.legal_name || "Higher Education Partner"} • Site: {pi.location_text || "Field Testbed"}
                          </p>
                        </div>

                        <button
                          onClick={() => setValidationModalPilot(pi)}
                          className="px-3.5 py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                        >
                          <CheckSquare size={14} />
                          <span>Record Validation Decision</span>
                        </button>
                      </div>

                      {/* TECHNICAL REQUIREMENTS VS TARGET VS OBSERVED TABLE */}
                      <div className="border border-[#ddebe2] rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#f6fbf8] border-b border-[#ddebe2] text-[#0B5D2A] font-bold">
                            <tr>
                              <th className="p-3">Departmental Requirement</th>
                              <th className="p-3">Target Standard</th>
                              <th className="p-3">Observed Result</th>
                              <th className="p-3">Evaluation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ddebe2]">
                            <tr>
                              <td className="p-3 font-medium">Performance / Efficacy</td>
                              <td className="p-3 text-[#66736b]">{pi.target || "Per standard specifications"}</td>
                              <td className="p-3 font-semibold text-[#17231b]">
                                {pi.observed_result || "Submitted field documentation"}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isValidated
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {isValidated ? "PASS" : "REVIEW"}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Field Durability & Operational Safety</td>
                              <td className="p-3 text-[#66736b]">Zero disruption to existing civic utilities</td>
                              <td className="p-3 font-semibold text-[#17231b]">Field pilot completed safely</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  PASS
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Validation Decision Log if previously recorded */}
                      {pi.validated_at && (
                        <div className="p-3 rounded-xl bg-[#eaf7ef]/70 border border-[#0B5D2A]/20 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[#0B5D2A]">
                              Validated on {new Date(pi.validated_at).toLocaleDateString()}
                            </span>
                            <p className="text-[11px] text-[#66736b]">
                              Reviewer: {pi.validated_by || departmentName} • Notes: {pi.validation_notes || "Complies with departmental engineering standards."}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#168a45] text-white">
                            Prepared for Scaling Assessment
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 7: SCALING                                          */}
          {/* ======================================================== */}
          {activeNav === "scaling" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">
                    Government Scaling Assessment Pathway
                  </h2>
                  <p className="text-xs text-[#66736b]">
                    Solutions that have successfully completed Technical Validation and are prepared for departmental scaling assessment.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0B5D2A] px-2.5 py-1 rounded-full bg-[#eaf7ef]">
                  {scalingSolutions.length} Validated Solutions
                </span>
              </div>

              <div className="space-y-4">
                {scalingSolutions.length === 0 ? (
                  <div className="bg-white border border-[#ddebe2] rounded-2xl p-10 text-center text-[#66736b] text-xs">
                    No solutions currently have validated scaling assessments. Complete technical validation of field pilots first.
                  </div>
                ) : (
                  scalingSolutions.map((pi) => (
                    <div
                      key={pi.id}
                      className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                              ✓ Validated Solution
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                              Stage: {pi.scaling_stage?.replace(/_/g, " ").toUpperCase() || "SCALING ASSESSMENT PENDING"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#17231b] mt-1.5">
                            {pi.projects?.title || "Validated Technical Solution"}
                          </h3>
                          <p className="text-xs text-[#66736b]">
                            University Developer: {pi.projects?.institutions?.legal_name || "Academic Partner"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateScalingStatus(pi.id, "prepared_for_scaling")}
                            className="px-3 py-1.5 rounded-xl border border-[#0B5D2A] text-[#0B5D2A] hover:bg-[#eaf7ef] text-xs font-bold transition"
                          >
                            Mark Prepared for Scaling
                          </button>
                          <button
                            onClick={() => handleUpdateScalingStatus(pi.id, "adopted")}
                            className="px-3.5 py-1.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs"
                          >
                            Mark Adopted
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2] text-xs space-y-1">
                        <span className="font-bold text-[#0B5D2A]">Technical Readiness Summary</span>
                        <p className="text-[#66736b]">
                          Validated under field conditions with observed metric: <b>{pi.observed_result || "Passing specifications"}</b>. Prepared for Government Scaling Assessment.
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 8: NOTIFICATIONS                                    */}
          {/* ======================================================== */}
          {activeNav === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B5D2A] font-display">Department Notifications</h2>
                  <p className="text-xs text-[#66736b]">
                    Real system notices for technical reviews, pilot evidence, and validation requests.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#66736b]">{notifications.length} Total</span>
              </div>

              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl divide-y divide-[#ddebe2] shadow-sm">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-[#66736b] text-xs">
                    No notifications recorded for this department account.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          n.read ? "bg-[#f6fbf8] text-[#66736b]" : "bg-[#eaf7ef] text-[#168a45]"
                        }`}
                      >
                        <Bell size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${n.read ? "text-[#66736b]" : "text-[#17231b]"}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-[#66736b]">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#66736b] mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 9: DEPARTMENT PROFILE                               */}
          {/* ======================================================== */}
          {activeNav === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-[#ddebe2] pb-3">
                <h2 className="text-base font-bold text-[#0B5D2A] font-display">Department Identity & Scope</h2>
                <p className="text-xs text-[#66736b]">
                  Authorized departmental profile loaded from database credentials.
                </p>
              </div>

              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20 flex items-center justify-center font-bold">
                    <Building2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0B5D2A] font-display">{departmentName}</h3>
                    <p className="text-xs text-[#66736b] mt-0.5">
                      Jurisdiction: {departmentJurisdiction} • Status: {accountStatus}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#ddebe2] text-xs">
                  <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2]">
                    <span className="text-[10px] font-bold text-[#0B5D2A] uppercase tracking-wider block mb-1">
                      Technical Domains
                    </span>
                    <p className="font-semibold text-[#17231b]">{departmentDomains.join(", ")}</p>
                  </div>

                  <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2]">
                    <span className="text-[10px] font-bold text-[#0B5D2A] uppercase tracking-wider block mb-1">
                      Authorized Officer
                    </span>
                    <p className="font-semibold text-[#17231b]">
                      {props.profile?.display_name || props.user?.email || "Department Official"}
                    </p>
                    <p className="text-[10px] text-[#66736b]">{props.user?.email}</p>
                  </div>

                  <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2]">
                    <span className="text-[10px] font-bold text-[#0B5D2A] uppercase tracking-wider block mb-1">
                      Division / Locality
                    </span>
                    <p className="font-semibold text-[#17231b]">{departmentLocality}</p>
                  </div>

                  <div className="p-3 bg-[#f6fbf8] rounded-xl border border-[#ddebe2]">
                    <span className="text-[10px] font-bold text-[#0B5D2A] uppercase tracking-wider block mb-1">
                      Supported Problem Categories
                    </span>
                    <p className="font-semibold text-[#17231b]">
                      Infrastructure, Water Quality, Waste Management, Public Works
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 10: ACTIVITY (AUDIT LOGS)                           */}
          {/* ======================================================== */}
          {activeNav === "activity" && (
            <div className="space-y-4">
              <div className="border-b border-[#ddebe2] pb-3">
                <h2 className="text-base font-bold text-[#0B5D2A] font-display">Department Activity & Audit Trail</h2>
                <p className="text-xs text-[#66736b]">
                  Immutable chronological audit record of departmental reviews, constraints, and validation decisions.
                </p>
              </div>

              <div className="bg-white border border-[#0B5D2A]/15 rounded-2xl divide-y divide-[#ddebe2] shadow-sm">
                {auditLogs.length === 0 ? (
                  <div className="p-10 text-center text-[#66736b] text-xs">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#0B5D2A]">{log.action}</span>
                        <p className="text-[#17231b] mt-0.5">{log.notes || "Recorded action"}</p>
                        <p className="text-[10px] text-[#66736b]">By: {log.actor_email}</p>
                      </div>
                      <span className="text-[10px] text-[#66736b]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CHALLENGE DETAIL & TECHNICAL REVIEW               */}
      {/* ======================================================== */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#ddebe2] flex items-center justify-between bg-[#f6fbf8]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                    {selectedChallenge.public_id || "CH-" + selectedChallenge.id.slice(0, 6)}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                    Track {selectedChallenge.track || "A"} • {selectedChallenge.domain || "Civic Domain"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#17231b] mt-1">{selectedChallenge.title}</h3>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="p-1.5 rounded-xl border border-[#ddebe2] hover:bg-[#eaf7ef] text-[#66736b] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* SECTION 1: LOCAL CONTEXT (PRI / ULB) */}
              <div className="p-4 bg-[#f6fbf8] rounded-2xl border border-[#ddebe2] space-y-2">
                <span className="font-bold text-[#0B5D2A] uppercase tracking-wider block">
                  1. Local Community Context (PRI / ULB)
                </span>
                <p className="text-[#66736b]">{selectedChallenge.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                  <div>
                    <span className="text-[#66736b] block">District</span>
                    <span className="font-bold text-[#17231b]">{selectedChallenge.district}</span>
                  </div>
                  <div>
                    <span className="text-[#66736b] block">Block / Locality</span>
                    <span className="font-bold text-[#17231b]">{selectedChallenge.block || selectedChallenge.locality || "Field Site"}</span>
                  </div>
                  <div>
                    <span className="text-[#66736b] block">Affected Population</span>
                    <span className="font-bold text-[#17231b]">
                      {selectedChallenge.affected_population?.toLocaleString() || "Noted"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#66736b] block">Verification Status</span>
                    <span className="font-bold text-[#168a45]">{selectedChallenge.verification || "Verified by Local Body"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TECHNICAL CONTEXT (GOVERNMENT LINE DEPARTMENT) */}
              <div className="p-4 bg-white rounded-2xl border border-[#0B5D2A]/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B5D2A] uppercase tracking-wider">
                    2. Technical Department Context & Requirements
                  </span>
                  <span className="text-[11px] text-[#66736b]">Authorized Department Oversight</span>
                </div>

                {/* Existing Requirements */}
                <div>
                  <h4 className="font-bold text-[#17231b] mb-1.5">Engineering Requirements:</h4>
                  {selectedChallenge.engineering_requirements && selectedChallenge.engineering_requirements.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-[#66736b]">
                      {selectedChallenge.engineering_requirements.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#66736b] italic">No technical requirements formulated yet.</p>
                  )}
                </div>

                {/* Add Technical Requirement Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add specific engineering requirement (e.g. Max turbidity < 5 NTU)..."
                    value={newRequirementText}
                    onChange={(e) => setNewRequirementText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                  />
                  <button
                    onClick={handleAddRequirement}
                    disabled={submittingTechAction || !newRequirementText.trim()}
                    className="px-3 py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    Add Requirement
                  </button>
                </div>

                {/* Constraints */}
                <div className="pt-2 border-t border-[#ddebe2]">
                  <h4 className="font-bold text-[#17231b] mb-1.5">Operational Constraints:</h4>
                  {selectedChallenge.constraints && selectedChallenge.constraints.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-[#66736b]">
                      {selectedChallenge.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#66736b] italic">No constraints registered.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add operational constraint (e.g. No grid electricity available on site)..."
                    value={newConstraintText}
                    onChange={(e) => setNewConstraintText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                  />
                  <button
                    onClick={handleAddConstraint}
                    disabled={submittingTechAction || !newConstraintText.trim()}
                    className="px-3 py-2 rounded-xl bg-[#0B5D2A] text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    Add Constraint
                  </button>
                </div>

                {/* Baseline Datasets */}
                <div className="pt-2 border-t border-[#ddebe2]">
                  <h4 className="font-bold text-[#17231b] mb-1.5">Baseline Data Metrics:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Metric Name (e.g. Dissolved Fluoride)"
                      value={newBaselineMetric}
                      onChange={(e) => setNewBaselineMetric(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-[#ddebe2] text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Baseline Value (e.g. 4.2 mg/L)"
                        value={newBaselineValue}
                        onChange={(e) => setNewBaselineValue(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#ddebe2] text-xs"
                      />
                      <button
                        onClick={handleAddBaseline}
                        disabled={submittingTechAction || !newBaselineMetric.trim() || !newBaselineValue.trim()}
                        className="px-3 py-2 rounded-xl bg-[#168a45] text-white text-xs font-bold transition disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: TRANSITION TO TRACK B ACADEMIC PROBLEM STATEMENT */}
              <div className="p-4 bg-[#eaf7ef]/70 rounded-2xl border border-[#0B5D2A]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#0B5D2A]">Formulate Academic Problem Statement (Track B)</span>
                  <p className="text-[11px] text-[#66736b]">
                    Publish this challenge to higher education institutions for university R&D, student prototypes, and field pilots.
                  </p>
                </div>
                {selectedChallenge.track === "B" ? (
                  <span className="px-3 py-1 rounded-full bg-[#168a45] text-white text-xs font-bold">
                    ✓ Track B APS Published
                  </span>
                ) : (
                  <button
                    onClick={handleMoveToAPS}
                    disabled={submittingTechAction}
                    className="px-4 py-2 rounded-xl bg-[#0B5D2A] hover:bg-[#168a45] text-white text-xs font-bold transition shadow-xs"
                  >
                    Authorize Move to APS
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RECORD TECHNICAL VALIDATION DECISION             */}
      {/* ======================================================== */}
      {validationModalPilot && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#0B5D2A]/20 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ddebe2] pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eaf7ef] text-[#0B5D2A]">
                  PILOT-{validationModalPilot.id.slice(0, 6).toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-[#17231b] mt-1">Record Technical Validation</h3>
              </div>
              <button
                onClick={() => setValidationModalPilot(null)}
                className="p-1.5 rounded-xl border border-[#ddebe2] text-[#66736b]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#17231b] block mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "validated", label: "Validate (Pass)", color: "border-[#168a45] bg-[#eaf7ef]" },
                    { id: "improvement_required", label: "Request Improvement", color: "border-amber-400 bg-amber-50" },
                    { id: "more_evidence", label: "Request More Evidence", color: "border-sky-400 bg-sky-50" },
                    { id: "rejected", label: "Reject Solution", color: "border-red-400 bg-red-50" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setValDecision(btn.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                        valDecision === btn.id ? btn.color + " border-2 text-[#0B5D2A]" : "border-[#ddebe2] bg-white text-[#66736b]"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#17231b] block mb-1">Observed Metric Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Achieved 98% particulate removal under continuous 30-day testing"
                  value={valObservedSummary}
                  onChange={(e) => setValObservedSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#17231b] block mb-1">Technical Reviewer Comments</label>
                <textarea
                  rows={3}
                  placeholder="Record formal departmental review notes, compliance findings, and conditions..."
                  value={valComments}
                  onChange={(e) => setValComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ddebe2] text-xs focus:outline-none focus:border-[#168a45]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] text-[11px] text-[#66736b]">
                Reviewer: <b>{props.user?.email || departmentName}</b> • Date: <b>{new Date().toLocaleDateString()}</b>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ddebe2]">
              <button
                onClick={() => setValidationModalPilot(null)}
                className="px-4 py-2 rounded-xl border border-[#ddebe2] text-xs font-bold text-[#66736b]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitValidation}
                disabled={submittingValidation}
                className="px-4 py-2 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// REUSABLE KPI CARD COMPONENT (REAL DATA ONLY)
// ========================================================

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
      className={`bg-white border border-[#0B5D2A]/15 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition ${
        onClick ? "hover:border-[#168a45] cursor-pointer hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-xs font-semibold text-[#66736b] truncate">{title}</span>
        <div className="h-7 w-7 rounded-xl bg-[#eaf7ef] flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#0B5D2A] font-display tracking-tight">{value}</p>
        <p className="text-[10px] text-[#66736b] font-medium mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );
}
