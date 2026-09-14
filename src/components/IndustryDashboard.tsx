import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Compass,
  Handshake,
  Users,
  FolderGit2,
  Rocket,
  Share2,
  TrendingUp,
  MessageSquare,
  Bell,
  Building2,
  Search,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  Wrench,
  Cpu,
  Layers,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  Calendar,
  Award,
  BarChart3,
  LogOut,
  HelpCircle,
  ShieldCheck,
  Zap,
  AlertCircle,
  FileText,
  Send,
  GraduationCap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface IndustryDashboardProps {
  user: User | null;
  profile: any;
  partnerIdentity: any;
  go: (screen: any) => void;
  logout: () => void;
}

interface RealChallenge {
  id: string;
  public_id: string;
  title: string;
  summary: string;
  domain: string;
  district: string;
  priority_score: number;
  priority_level?: string;
  verification: string;
  stage: string;
  affected_population: number | null;
  technical_scope: string | null;
  expected_outcome: string | null;
  constraints: string | null;
  government_data: string | null;
  regulatory_requirements: string | null;
  safety_requirements: string | null;
  pilot_requirements: string | null;
  evaluation_criteria: string | null;
  support_needed: string[];
  responsible_department: string | null;
  scope_defined_at: string | null;
  adoption_status: string;
  project_id: string | null;
  project_title: string | null;
  university_name: string | null;
  prototype_count: number;
  pilot_count: number;
  funding_count: number;
}

interface RealProject {
  id: string;
  title: string;
  objective: string;
  expected_outcome: string | null;
  status: string;
  health_score: number;
  created_at: string;
  challenges: {
    id: string;
    public_id: string;
    title: string;
    domain: string;
    district: string;
    responsible_department: string | null;
    technical_scope: string | null;
    support_needed: string[];
  } | null;
  milestones: Array<{ id: string; title: string; status: string; due_date: string | null }>;
  prototypes: Array<{ id: string; version: string; description: string | null; repository_url: string | null }>;
  pilots: Array<{ id: string; location_text: string; status: string; starts_on: string | null; ends_on: string | null; pilot_conditions?: string | null }>;
  funding_commitments: Array<{ id: string; amount: number; status: string; source_type: string; created_at: string }>;
  impact_observations: Array<{ id: string; metric: string; unit: string; observed: number | null }>;
}

const SUPPORT_CATEGORIES = [
  { id: "Mentoring", label: "Mentoring & Technical Expertise", icon: Users },
  { id: "Hardware", label: "Hardware & Component Provision", icon: Cpu },
  { id: "Software", label: "Software & Cloud Resources", icon: Layers },
  { id: "Funding", label: "CSR Funding & Grants", icon: DollarSign },
  { id: "Prototyping", label: "Prototyping Facilities & Labs", icon: Wrench },
  { id: "Testing", label: "Testing & Field Validation", icon: ShieldCheck },
  { id: "Pilot Implementation", label: "Pilot Implementation Sponsorship", icon: Rocket },
  { id: "Technology Transfer", label: "Technology Transfer & Commercialization", icon: Share2 },
] as const;

export function IndustryDashboard({
  user,
  profile,
  partnerIdentity,
  go,
  logout,
}: IndustryDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Real data state
  const [challenges, setChallenges] = useState<RealChallenge[]>([]);
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [myCommitments, setMyCommitments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [impactList, setImpactList] = useState<any[]>([]);

  // Modals & form state
  const [selectedChallenge, setSelectedChallenge] = useState<RealChallenge | null>(null);
  const [selectedProject, setSelectedProject] = useState<RealProject | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [selectedSupportType, setSelectedSupportType] = useState<string>("Mentoring");
  const [commitmentAmount, setCommitmentAmount] = useState<string>("");
  const [commitmentNote, setCommitmentNote] = useState<string>("");
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Determine active organization identity from real account
  const orgName =
    partnerIdentity?.name ||
    user?.user_metadata?.["organization_name"] ||
    profile?.display_name ||
    user?.email ||
    "Industry Partner";

  const loadData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Load real challenges through updated search_challenges RPC
      const { data: challengeData, error: challengeError } = await supabase.rpc("search_challenges", {
        search_text: "",
      });

      if (!challengeError && challengeData) {
        setChallenges(challengeData as RealChallenge[]);
      }

      // 2. Load real innovation projects
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`
          id, title, objective, expected_outcome, status, health_score, created_at,
          challenges (
            id, public_id, title, domain, district, responsible_department, technical_scope, support_needed
          ),
          milestones (id, title, status, due_date),
          prototypes (id, version, description, repository_url),
          pilots (id, location_text, status, starts_on, ends_on, pilot_conditions),
          funding_commitments (id, amount, status, source_type, created_at),
          impact_observations (id, metric, unit, observed)
        `)
        .order("created_at", { ascending: false });

      if (!projectError && projectData) {
        setProjects(projectData as unknown as RealProject[]);
      }

      // 3. Load my commitments
      if (user) {
        const { data: orgAccount } = await supabase
          .from("organization_accounts")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (orgAccount) {
          const { data: commitments } = await supabase
            .from("funding_commitments")
            .select(`
              id, project_id, amount, status, source_type, created_at,
              projects (id, title, challenges (public_id, title, domain))
            `)
            .eq("organization_id", orgAccount.id)
            .order("created_at", { ascending: false });

          setMyCommitments(commitments || []);
        }

        // 4. Notifications
        const { data: notifData } = await supabase
          .from("notifications")
          .select("id, title, body, created_at, read_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        setNotifications(notifData || []);
      }

      // 5. Impact observations
      const { data: impactData } = await supabase
        .from("impact_observations")
        .select(`
          id, metric, unit, baseline, target, observed, source, verification_status, created_at,
          projects (id, title, challenges (title, district))
        `)
        .order("created_at", { ascending: false });

      setImpactList(impactData || []);
    } catch (err: any) {
      console.error("Error loading industry dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user]);

  // Handle expressing collaboration / commitment in real DB
  const handleOfferSupport = async () => {
    if (!selectedChallenge && !selectedProject) return;
    setSubmittingSupport(true);
    setStatusMessage("");

    try {
      let targetProjectId = selectedProject?.id;

      // If opening from a challenge that doesn't have an active project yet:
      if (!targetProjectId && selectedChallenge?.project_id) {
        targetProjectId = selectedChallenge.project_id;
      }

      if (!targetProjectId) {
        // University has not created a project yet; record interest on the challenge
        if (selectedChallenge && supabase) {
          const { error: matchErr } = await supabase.from("match_recommendations").insert({
            challenge_id: selectedChallenge.id,
            match_kind: "industry",
            score: 100,
            reasons: [{ type: selectedSupportType, note: commitmentNote, amount: commitmentAmount }],
            status: "interested",
          });
          if (matchErr) throw matchErr;
        }
      } else if (supabase) {
        const { error: rpcError } = await supabase.rpc("express_industry_collaboration", {
          project_uuid: targetProjectId,
          support_category: selectedSupportType,
          commitment_amount: commitmentAmount ? parseFloat(commitmentAmount) : null,
          note_text: commitmentNote || null,
        });
        if (rpcError) throw rpcError;
      }

      setStatusMessage("Your collaboration offer has been recorded successfully in the platform.");
      setSupportModalOpen(false);
      setCommitmentAmount("");
      setCommitmentNote("");
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || "Failed to record collaboration"}`);
    } finally {
      setSubmittingSupport(false);
    }
  };

  // Real Database-Derived Pipeline Counts (0 if 0, never hardcoded)
  const validatedChallenges = challenges.filter(
    (c) => c.verification === "officially_verified" || c.verification === "community_verified"
  );
  const validatedChallengesCount = validatedChallenges.length;

  const projectsSeekingSupport = projects.filter(
    (p) => (p.challenges?.support_needed && p.challenges.support_needed.length > 0) || p.funding_commitments.length === 0
  );
  const projectsSeekingSupportCount = projectsSeekingSupport.length;

  const activeCollaborationsCount = myCommitments.length;

  const mentoringRequests = projects.filter((p) =>
    p.challenges?.support_needed?.some((s) => s.toLowerCase().includes("mentor"))
  );
  const mentoringRequestsCount = mentoringRequests.length;

  const fundingOpportunities = projects.filter((p) =>
    p.challenges?.support_needed?.some((s) => s.toLowerCase().includes("fund") || s.toLowerCase().includes("csr"))
  );
  const fundingOpportunitiesCount = fundingOpportunities.length;

  const pilotSupportRequests = projects.filter(
    (p) => p.pilots?.length > 0 || p.challenges?.support_needed?.some((s) => s.toLowerCase().includes("pilot"))
  );
  const pilotSupportRequestsCount = pilotSupportRequests.length;

  const techTransferOpportunities = projects.filter(
    (p) => p.prototypes?.length > 0 || p.status === "completed"
  );
  const techTransferOpportunitiesCount = techTransferOpportunities.length;

  // Filtered lists based on query
  const filteredChallenges = challenges.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      (c.responsible_department && c.responsible_department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans antialiased">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 hidden lg:flex">
        <div>
          {/* Logo */}
          <div className="h-16 border-b border-slate-200 px-6 flex items-center gap-3">
            <img src="/samajsetu-community-logo.svg" alt="SamajSetu" className="h-8 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 tracking-tight">SamajSetu</span>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Industry & CSR</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard size={18} className={activeTab === "dashboard" ? "text-blue-700" : "text-slate-400"} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("discover")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "discover"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Compass size={18} className={activeTab === "discover" ? "text-blue-700" : "text-slate-400"} />
                <span>Discover Challenges</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {validatedChallengesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("collaborations")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "collaborations"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Handshake size={18} className={activeTab === "collaborations" ? "text-blue-700" : "text-slate-400"} />
                <span>My Collaborations</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {activeCollaborationsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("mentoring")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "mentoring"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} className={activeTab === "mentoring" ? "text-blue-700" : "text-slate-400"} />
                <span>Mentoring</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {mentoringRequestsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "projects"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderGit2 size={18} className={activeTab === "projects" ? "text-blue-700" : "text-slate-400"} />
                <span>Projects</span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pilots")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "pilots"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Rocket size={18} className={activeTab === "pilots" ? "text-blue-700" : "text-slate-400"} />
                <span>Pilot & Implementation</span>
              </div>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                {pilotSupportRequestsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("transfer")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "transfer"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Share2 size={18} className={activeTab === "transfer" ? "text-blue-700" : "text-slate-400"} />
                <span>Technology Transfer</span>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                {techTransferOpportunitiesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("impact")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "impact"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className={activeTab === "impact" ? "text-blue-700" : "text-slate-400"} />
                <span>Societal Impact</span>
              </div>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                {impactList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "notifications"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={18} className={activeTab === "notifications" ? "text-blue-700" : "text-slate-400"} />
                <span>Notifications</span>
              </div>
              {notifications.filter((n) => !n.read_at).length > 0 && (
                <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold">
                  {notifications.filter((n) => !n.read_at).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Profile & Role Info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 truncate">{orgName}</span>
              <span className="text-[10px] text-slate-500">CSR & Technical Enabler</span>
            </div>
            <button onClick={logout} title="Sign out" className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search challenges by domain, district, technical keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("discover")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs"
            >
              <Compass size={14} />
              <span>Explore Validated Challenges</span>
            </button>
            <button
              onClick={() => go("home")}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Public Portal
            </button>
          </div>
        </header>

        {/* Status notification banner */}
        {statusMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage("")} className="text-blue-700 hover:text-blue-900 font-bold">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body content based on activeTab */}
        <main className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <>
              {/* Header Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-md">
                <div className="relative z-10 max-w-3xl space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold tracking-wide border border-blue-400/30">
                    <ShieldCheck size={13} /> Official Quad-Helix Civic Collaboration
                  </span>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    Find validated societal challenges where your organisation can contribute.
                  </h1>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed pt-1">
                    Industry enables university-led solutions through expertise, technology, CSR funding, hardware, and
                    implementation support. Government defines technical scopes, regulates constraints, approves field
                    pilots, and adopts proven solutions.
                  </p>
                </div>
              </div>

              {/* ================= REAL COLLABORATION PIPELINE ================= */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Your Collaboration Pipeline</h2>
                    <p className="text-xs text-slate-500">
                      Standard civic innovation lifecycle driven by real platform database records.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>01. Government</span>
                      <span className="size-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{validatedChallengesCount}</p>
                    <p className="text-[11px] text-slate-600 font-medium">Validated Challenges</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>02. University</span>
                      <span className="size-2 rounded-full bg-blue-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{projects.length}</p>
                    <p className="text-[11px] text-slate-600 font-medium">University Projects</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>03. Industry Need</span>
                      <span className="size-2 rounded-full bg-amber-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{projectsSeekingSupportCount}</p>
                    <p className="text-[11px] text-slate-600 font-medium">Support Needed</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>04. Engineering</span>
                      <span className="size-2 rounded-full bg-indigo-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {projects.filter((p) => p.prototypes?.length > 0).length}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">Prototypes & Testing</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>05. Public Pilot</span>
                      <span className="size-2 rounded-full bg-purple-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {projects.filter((p) => p.pilots?.length > 0).length}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">Government Pilots</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>06. Adoption</span>
                      <span className="size-2 rounded-full bg-teal-500"></span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {challenges.filter((c) => c.adoption_status !== "not_started").length}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">Govt Adoption</p>
                  </div>
                </div>
              </div>

              {/* ================= DETAILED REAL METRIC CARDS ================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Validated Challenges Available</span>
                    <Compass size={18} className="text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{validatedChallengesCount}</p>
                  <p className="text-[11px] text-slate-500">Official citizen reports reviewed & scoped</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Projects Seeking Support</span>
                    <Wrench size={18} className="text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{projectsSeekingSupportCount}</p>
                  <p className="text-[11px] text-slate-500">University teams requiring industry enablers</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Active Collaborations</span>
                    <Handshake size={18} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{activeCollaborationsCount}</p>
                  <p className="text-[11px] text-slate-500">Joint partnerships committed by your organization</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Pilot Support Requests</span>
                    <Rocket size={18} className="text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{pilotSupportRequestsCount}</p>
                  <p className="text-[11px] text-slate-500">Government approved/planned field trials</p>
                </div>
              </div>

              {/* ================= REAL VALIDATED CHALLENGES PREVIEW ================= */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Validated Societal Challenges</h2>
                    <p className="text-xs text-slate-500">
                      Real problems with government verification and technical scopes awaiting industry/CSR enablers.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View all {challenges.length} <ChevronRight size={14} />
                  </button>
                </div>

                {challenges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                    <Compass className="size-8 text-slate-400 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No validated challenges found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      There are currently no citizen problems in the database with government validation. As government
                      officials validate reports, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {challenges.slice(0, 6).map((challenge) => (
                      <article
                        key={challenge.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                              {challenge.public_id}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <MapPin size={12} /> {challenge.district}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                            {challenge.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {challenge.summary}
                          </p>
                        </div>

                        {/* Quad-helix Status Meta */}
                        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[11px] text-slate-400">Department:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[170px]">
                              {challenge.responsible_department || "Awaiting assignment"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[11px] text-slate-400">Technical Scope:</span>
                            <span
                              className={`font-semibold ${
                                challenge.technical_scope ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {challenge.technical_scope ? "Defined" : "Pending definition"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[11px] text-slate-400">University:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[170px]">
                              {challenge.university_name || "Awaiting university collaboration"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[11px] text-slate-400">Support Needed:</span>
                            <span className="font-medium text-blue-700 truncate max-w-[170px]">
                              {challenge.support_needed && challenge.support_needed.length > 0
                                ? challenge.support_needed.join(" / ")
                                : "General engineering & CSR"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[11px] text-slate-400">Stage:</span>
                            <span className="capitalize font-bold text-slate-700">
                              {challenge.stage.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedChallenge(challenge);
                            setSupportModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Offer Collaboration / Support</span>
                          <ArrowRight size={13} />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================= DISCOVER TAB ================= */}
          {activeTab === "discover" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Discover Validated Challenges</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Explore genuine citizen issues that have completed government validation and technical scoping.
                </p>
              </div>

              {filteredChallenges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Compass className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No challenges match your search</h3>
                  <p className="text-xs text-slate-500">Try adjusting your search terms.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredChallenges.map((challenge) => (
                    <article
                      key={challenge.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                            {challenge.public_id}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <MapPin size={12} /> {challenge.district}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 leading-snug">{challenge.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{challenge.summary}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] text-slate-400">Department:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[170px]">
                            {challenge.responsible_department || "Awaiting assignment"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] text-slate-400">Technical Scope:</span>
                          <span
                            className={`font-semibold ${
                              challenge.technical_scope ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {challenge.technical_scope ? "Defined" : "Pending definition"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] text-slate-400">University:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[170px]">
                            {challenge.university_name || "Awaiting university collaboration"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] text-slate-400">Support Needed:</span>
                          <span className="font-medium text-blue-700 truncate max-w-[170px]">
                            {challenge.support_needed && challenge.support_needed.length > 0
                              ? challenge.support_needed.join(" / ")
                              : "Hardware / Mentoring / Funding"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] text-slate-400">Stage:</span>
                          <span className="capitalize font-bold text-slate-700">
                            {challenge.stage.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedChallenge(challenge);
                          setSupportModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Offer Collaboration / Support</span>
                        <ArrowRight size={13} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= MY COLLABORATIONS TAB ================= */}
          {activeTab === "collaborations" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Active Collaborations</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Societal innovation initiatives where your organisation has committed grants, hardware, engineering, or
                  mentorship.
                </p>
              </div>

              {myCommitments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Handshake className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No active collaborations yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Discover validated university innovation projects to contribute hardware, mentoring, engineering
                    support, or CSR sponsorship.
                  </p>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                  >
                    Discover Challenges
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myCommitments.map((commitment) => (
                    <div
                      key={commitment.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase">
                            {commitment.source_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Committed on {new Date(commitment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {commitment.projects?.title || "Innovation Project"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Challenge: {commitment.projects?.challenges?.title || "Societal challenge"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {commitment.amount > 0 && (
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block">Commitment</span>
                            <span className="font-bold text-sm text-slate-900">₹{commitment.amount.toLocaleString()}</span>
                          </div>
                        )}
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold capitalize">
                          {commitment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= MENTORING TAB ================= */}
          {activeTab === "mentoring" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">University Mentoring Requests</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Higher education multidisciplinary student/faculty teams seeking engineering guidance and technical domain
                  expertise.
                </p>
              </div>

              {mentoringRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Users className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No mentoring requests recorded</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When university research teams flag mentoring requirements for their prototypes, they will be listed
                    here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentoringRequests.map((project) => (
                    <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold uppercase">
                          Mentoring Requested
                        </span>
                        <h3 className="mt-2 font-bold text-sm text-slate-900">{project.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{project.objective}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Domain:</span>
                          <span className="font-semibold text-slate-700">{project.challenges?.domain}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Required Skills:</span>
                          <span className="font-semibold text-slate-700">
                            {project.challenges?.support_needed?.join(", ") || "Technical guidance"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setSelectedSupportType("Mentoring");
                          setSupportModalOpen(true);
                        }}
                        className="w-full py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
                      >
                        Accept Mentoring Invitation
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PROJECTS TAB ================= */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">University Innovation Projects</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Active research, engineering, and prototype development initiatives across Higher Education Institutions.
                </p>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <FolderGit2 className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No active university projects</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No active university project has been created for verified challenges yet. Once an institution initiates a
                    project, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {projects.map((proj) => (
                    <article key={proj.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            {proj.challenges?.public_id}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 mt-1">{proj.title}</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold capitalize">
                          {proj.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{proj.objective}</p>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                        <div className="p-2 rounded-lg bg-slate-50">
                          <span className="text-[10px] text-slate-400 block">Milestones</span>
                          <span className="font-bold text-slate-900">{proj.milestones?.length || 0}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50">
                          <span className="text-[10px] text-slate-400 block">Prototypes</span>
                          <span className="font-bold text-slate-900">{proj.prototypes?.length || 0}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50">
                          <span className="text-[10px] text-slate-400 block">Pilots</span>
                          <span className="font-bold text-slate-900">{proj.pilots?.length || 0}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProject(proj);
                          setSupportModalOpen(true);
                        }}
                        className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
                      >
                        Offer Industry Support
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PILOTS & IMPLEMENTATION TAB ================= */}
          {activeTab === "pilots" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Pilot & Field Deployment</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Prototypes undergoing field testing on public infrastructure with government conditions and monitoring.
                </p>
              </div>

              {projects.filter((p) => p.pilots && p.pilots.length > 0).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Rocket className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No active field pilots</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Government approves field pilots after lab validation. Industry partners can sponsor deployment hardware
                    and telemetry.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects
                    .filter((p) => p.pilots && p.pilots.length > 0)
                    .map((proj) =>
                      proj.pilots.map((pilot) => (
                        <article key={pilot.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                              <MapPin size={13} /> {pilot.location_text}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold capitalize">
                              {pilot.status}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900">{proj.title}</h3>

                          {pilot.pilot_conditions && (
                            <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-700">
                              <b>Government Conditions:</b> {pilot.pilot_conditions}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span>
                              Timeline: {pilot.starts_on || "TBD"} – {pilot.ends_on || "TBD"}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedProject(proj);
                                setSelectedSupportType("Pilot Implementation");
                                setSupportModalOpen(true);
                              }}
                              className="text-blue-600 font-bold hover:underline"
                            >
                              Sponsor Pilot Hardware
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                </div>
              )}
            </div>
          )}

          {/* ================= TECHNOLOGY TRANSFER TAB ================= */}
          {activeTab === "transfer" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Technology Transfer & Scaling</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Validated prototypes and technologies developed by university teams ready for MSME commercialization or
                  district scaling.
                </p>
              </div>

              {projects.filter((p) => p.prototypes?.length > 0).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Share2 className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No technology transfer opportunities yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When university research teams complete lab verification and upload prototype repositories, technology
                    transfer options will be listed here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects
                    .filter((p) => p.prototypes?.length > 0)
                    .map((proj) => (
                      <article key={proj.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[10px] font-bold uppercase">
                          Prototype Ready
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{proj.title}</h3>
                        <p className="text-xs text-slate-500">{proj.objective}</p>

                        <div className="space-y-1 text-xs">
                          {proj.prototypes.map((pt) => (
                            <div key={pt.id} className="p-2 rounded bg-slate-50 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{pt.version}</span>
                              {pt.repository_url && (
                                <a
                                  href={pt.repository_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 flex items-center gap-1 font-medium"
                                >
                                  Repo <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedProject(proj);
                            setSelectedSupportType("Technology Transfer");
                            setSupportModalOpen(true);
                          }}
                          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                        >
                          Express Tech Transfer Interest
                        </button>
                      </article>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ================= SOCIETAL IMPACT TAB ================= */}
          {activeTab === "impact" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Measured Societal Impact</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Verified field outcomes and community metrics captured following government deployment and scaling.
                </p>
              </div>

              {impactList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <TrendingUp className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">Impact data not yet recorded.</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Outcome metrics are populated directly from real field sensors and verified government deployment surveys
                    once pilots complete.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {impactList.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400">{item.metric}</span>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {item.observed !== null ? item.observed : "Pending"} {item.unit}
                      </p>
                      <p className="text-xs text-slate-500">
                        Source: {item.source} • Status: {item.verification_status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= NOTIFICATIONS TAB ================= */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Notifications</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Real workflow updates regarding validated challenges, university proposals, and pilot requests.
                </p>
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <Bell className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No new notifications.</h3>
                  <p className="text-xs text-slate-500">You are all caught up with your collaboration alerts.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <article
                      key={notif.id}
                      className={`rounded-xl border bg-white p-4 space-y-1 ${
                        notif.read_at ? "border-slate-200 opacity-70" : "border-blue-200 bg-blue-50/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      {notif.body && <p className="text-xs text-slate-600">{notif.body}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ================= OFFER COLLABORATION / SUPPORT MODAL ================= */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                  Industry & CSR Contribution
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Offer Support for {selectedChallenge?.public_id || selectedProject?.title}
                </h3>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Contribution Category</label>
                <select
                  value={selectedSupportType}
                  onChange={(e) => setSelectedSupportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedSupportType === "Funding" || selectedSupportType === "Pilot Implementation") && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Funding Amount (₹ INR, Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={commitmentAmount}
                    onChange={(e) => setCommitmentAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Resources, Hardware Specifications, or Mentoring Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the hardware components, compute resources, mentoring hours, or engineering assistance your organization can provide..."
                  value={commitmentNote}
                  onChange={(e) => setCommitmentNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                <b>Quad-Helix Commitment:</b> This offer will be officially linked in the database to the university
                innovation team and recorded in platform audit logs. Government retains regulatory oversight and pilot
                approval authority.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleOfferSupport}
                disabled={submittingSupport}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs"
              >
                {submittingSupport ? "Submitting..." : "Confirm & Submit Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
