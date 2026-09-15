import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Inbox,
  MapPin,
  AlertTriangle,
  Building2,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  ArrowUpRight,
  Users,
  Compass,
  FileText,
  FileCheck2,
  Landmark,
  UserCheck,
  Send,
  HelpCircle,
  Eye,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  Calendar,
  Phone,
  Mail,
  Shield,
  Briefcase
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface PRIDashboardProps {
  user: User | null;
  profile: { id: string; display_name: string | null; role: string; district: string | null } | null;
  partnerIdentity: { id: string; name: string; organization_type: string; district?: string; locality?: string; contact_phone?: string; expertise?: string[]; capabilities?: string[] } | null;
  go: (screen: any) => void;
  flash: (msg: string) => void;
  logout?: () => Promise<void>;
}

export function PRIDashboard(props: PRIDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "inbox"
    | "scoping"
    | "pilots"
    | "gpdp"
    | "resolution"
    | "notifications"
    | "profile"
  >("overview");

  // Real Database States
  const [challenges, setChallenges] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [verificationEvents, setVerificationEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHabitation, setSelectedHabitation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Interaction States
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  const [scopingChallenge, setScopingChallenge] = useState<any | null>(null);
  const [scopingForm, setScopingForm] = useState({
    technicalScope: "",
    expectedOutcome: "",
    constraints: "",
    governmentData: "",
    regulatoryReq: "",
    safetyReq: "",
    pilotReq: "",
    evalCriteria: "",
    affectedPop: "",
  });
  const [verifyingChallenge, setVerifyingChallenge] = useState<any | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("Gram Panchayat Field Inspection");

  const [pilotReviewTarget, setPilotReviewTarget] = useState<any | null>(null);
  const [pilotConditions, setPilotConditions] = useState("");
  const [pilotMonitoring, setPilotMonitoring] = useState("");
  const [pilotActionBusy, setPilotActionBusy] = useState(false);

  const [resolutionTarget, setResolutionTarget] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // Metadata Extraction for PRI Jurisdiction
  const meta = useMemo(() => props.user?.user_metadata || {}, [props.user]);
  const districtName = props.profile?.district || props.partnerIdentity?.district || meta["district"] || "Jurisdiction District";
  const blockName = meta["block"] || "Mandal / Block";
  const gramPanchayatName = meta["gram_panchayat"] || (props.partnerIdentity?.name?.includes("Gram Panchayat") ? props.partnerIdentity.name.replace(" Gram Panchayat", "") : "Gram Panchayat");
  const villageName = meta["village"] || "";
  const priTier = meta["pri_tier"] || "Gram Panchayat";
  const officialDesignation = meta["designation"] || props.partnerIdentity?.capabilities?.[0] || "Panchayat Official";
  const officialName = props.profile?.display_name || meta["display_name"] || "Authorized Official";
  const officialEmail = props.user?.email || props.partnerIdentity?.locality || "";
  const officialPhone = meta["contact_phone"] || props.partnerIdentity?.contact_phone || "";

  // Load real database data
  const fetchData = async () => {
    if (!supabase) return;
    try {
      setRefreshing(true);

      // 1. Challenges
      const { data: challs } = await supabase
        .from("challenges")
        .select(`
          id, public_id, title, summary, domain, subdomain, district, block, locality,
          public_latitude, public_longitude, severity, urgency, affected_population,
          priority_score, priority_level, verification, stage, created_at,
          technical_scope, expected_outcome, constraints, government_data,
          regulatory_requirements, safety_requirements, pilot_requirements,
          evaluation_criteria, responsible_department, scope_defined_at
        `)
        .order("created_at", { ascending: false });

      // 2. Reports
      const { data: repList } = await supabase
        .from("reports")
        .select("id, challenge_id, description, district, block, locality, created_at, category, affected_population, voice_transcript")
        .order("created_at", { ascending: false });

      // 3. Pilots with Projects
      const { data: pilotList } = await supabase
        .from("pilots")
        .select(`
          id, project_id, location_text, starts_on, ends_on, target_population,
          baseline, target, observed_result, status, pilot_conditions,
          monitoring_requirements, rejection_reason, reviewed_at,
          projects (
            id, title, challenge_id, university_name:created_by
          )
        `);

      // 4. Organization volunteers (field supervisors/workers)
      let volList: any[] = [];
      if (props.partnerIdentity?.id) {
        const { data: vols } = await supabase
          .from("volunteers")
          .select("*")
          .eq("organization_id", props.partnerIdentity.id);
        volList = vols ?? [];
      }

      // 5. Problem assignments and tasks
      const { data: assignList } = await supabase
        .from("problem_assignments")
        .select("*");
      const { data: taskList } = await supabase
        .from("problem_tasks")
        .select("*");

      // 6. Funding sources
      const { data: funds } = await supabase
        .from("funding_sources")
        .select("*");

      // 7. Notifications
      let notifs: any[] = [];
      if (props.user?.id) {
        const { data: userNotifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", props.user.id)
          .order("created_at", { ascending: false })
          .limit(25);
        notifs = userNotifs ?? [];
      }

      // 8. Verification Events
      const { data: verifs } = await supabase
        .from("verification_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      setChallenges(challs ?? []);
      setReports(repList ?? []);
      setPilots(pilotList ?? []);
      setVolunteers(volList);
      setAssignments(assignList ?? []);
      setTasks(taskList ?? []);
      setFundingSources(funds ?? []);
      setNotifications(notifs);
      setVerificationEvents(verifs ?? []);
    } catch (err) {
      console.error("Failed to load PRI data:", err);
      props.flash("Unable to fetch live database records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [props.user, props.partnerIdentity]);

  // Derived Habitations from real reports and challenges in this district
  const habitations = useMemo(() => {
    const list = new Set<string>();
    const dLower = districtName.toLowerCase().trim();

    challenges.forEach((c) => {
      const cDist = (c.district || "").toLowerCase().trim();
      if (!dLower || cDist.includes(dLower) || dLower.includes(cDist) || cDist === "gps-detected location") {
        if (c.locality && c.locality.trim()) list.add(c.locality.trim());
        if (c.block && c.block.trim()) list.add(c.block.trim());
      }
    });

    reports.forEach((r) => {
      const rDist = (r.district || "").toLowerCase().trim();
      if (!dLower || rDist.includes(dLower) || dLower.includes(rDist) || rDist === "gps-detected location") {
        if (r.locality && r.locality.trim()) list.add(r.locality.trim());
        if (r.block && r.block.trim()) list.add(r.block.trim());
      }
    });

    return Array.from(list).sort();
  }, [challenges, reports, districtName]);

  // Filtered challenges by Habitation & Search
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedHabitation !== "all") {
        const matchesLoc = (c.locality || "").toLowerCase().includes(selectedHabitation.toLowerCase());
        const matchesBlock = (c.block || "").toLowerCase().includes(selectedHabitation.toLowerCase());
        if (!matchesLoc && !matchesBlock) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (c.title || "").toLowerCase().includes(q);
        const matchesSummary = (c.summary || "").toLowerCase().includes(q);
        const matchesId = (c.public_id || "").toLowerCase().includes(q);
        const matchesDomain = (c.domain || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesId && !matchesDomain) return false;
      }
      return true;
    });
  }, [challenges, selectedHabitation, searchQuery]);

  // Real KPIs (0 if empty)
  const kpis = useMemo(() => {
    const totalReports = reports.length;
    const routineIssues = challenges.filter(
      (c) => !c.technical_scope && (c.stage === "reported" || c.stage === "validated") && (c.priority_level === "MINOR" || c.priority_level === "LOW" || c.priority_level === "MEDIUM")
    ).length;
    const chronicChallenges = challenges.filter(
      (c) => Boolean(c.technical_scope) || c.priority_level === "HIGH" || c.priority_level === "CRITICAL" || c.stage === "pilot" || c.stage === "scaling"
    ).length;
    const activePilots = pilots.filter((p) => p.status === "running" || p.status === "active" || p.status === "approved").length;
    const pendingVerification = challenges.filter((c) => c.verification === "unverified").length;
    const activeFieldActions = tasks.filter((t) => t.status === "in_progress" || t.status === "assigned").length;
    const schemeOpportunities = fundingSources.length;
    const resolvedChallenges = challenges.filter((c) => c.stage === "resolved" || c.verification === "officially_verified").length;

    return {
      totalReports,
      routineIssues,
      chronicChallenges,
      activePilots,
      pendingVerification,
      activeFieldActions,
      schemeOpportunities,
      resolvedChallenges,
    };
  }, [challenges, reports, pilots, tasks, fundingSources]);

  // Handle Challenge Verification
  const handleVerifyChallenge = async (challengeId: string, status: "officially_verified" | "community_verified" | "rejected") => {
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc("review_challenge", {
        challenge_uuid: challengeId,
        next_status: status,
        review_method: verificationMethod,
        review_note: verificationNote.trim() || `Verified by ${officialDesignation}, ${gramPanchayatName} PRI`,
      });

      if (error) throw error;

      props.flash(`Challenge successfully updated to ${status}.`);
      setVerifyingChallenge(null);
      setVerificationNote("");
      void fetchData();
    } catch (err: any) {
      console.error("Verification failed:", err);
      props.flash(err?.message || "Failed to submit official verification.");
    }
  };

  // Handle Ground Scoping Submit
  const handleSaveGroundScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopingChallenge || !supabase) return;

    try {
      const { error } = await supabase.rpc("define_government_scope", {
        challenge_uuid: scopingChallenge.id,
        dept: `${gramPanchayatName} Panchayat Raj Office`,
        scope_text: scopingForm.technicalScope.trim(),
        outcome_text: scopingForm.expectedOutcome.trim() || null,
        constraints_text: scopingForm.constraints.trim() || null,
        gov_data: scopingForm.governmentData.trim() || null,
        reg_req: scopingForm.regulatoryReq.trim() || null,
        safety_req: scopingForm.safetyReq.trim() || null,
        pilot_req: scopingForm.pilotReq.trim() || null,
        eval_crit: scopingForm.evalCriteria.trim() || null,
        needed_support: ["Panchayat Raj Institution", "Field Volunteers", "GPDP Convergence"],
      });

      if (error) throw error;

      props.flash("Ground scoping data and engineering requirements successfully saved to database.");
      setScopingChallenge(null);
      void fetchData();
    } catch (err: any) {
      console.error("Ground scoping failed:", err);
      props.flash(err?.message || "Failed to save ground scoping data.");
    }
  };

  // Handle Pilot Approval / Rejection
  const handleReviewPilot = async (status: "approved" | "rejected") => {
    if (!pilotReviewTarget || !supabase) return;
    setPilotActionBusy(true);

    try {
      const { error } = await supabase.rpc("review_pilot_approval", {
        pilot_uuid: pilotReviewTarget.id,
        next_status: status,
        conditions_text: pilotConditions.trim() || "Compliance with Panchayat local sanitation and safety norms.",
        monitoring_text: pilotMonitoring.trim() || "Fortnightly progress review at Gram Sabha.",
        reject_note: status === "rejected" ? (pilotConditions.trim() || "Conditions not met.") : null,
      });

      if (error) throw error;

      props.flash(`University pilot proposal marked as ${status}.`);
      setPilotReviewTarget(null);
      setPilotConditions("");
      setPilotMonitoring("");
      void fetchData();
    } catch (err: any) {
      console.error("Pilot review failed:", err);
      props.flash(err?.message || "Failed to update pilot permission record.");
    } finally {
      setPilotActionBusy(false);
    }
  };

  // Handle Mark Resolved
  const handleConfirmResolution = async (challengeId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          stage: "resolved",
          verification: "officially_verified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", challengeId);

      if (error) throw error;

      await supabase.from("verification_events").insert({
        challenge_id: challengeId,
        actor_id: props.user?.id,
        status: "officially_verified",
        method: "Panchayat Raj Completion Verification",
        note: resolutionNote.trim() || "Resolution inspected and verified by Panchayat administration.",
      });

      props.flash("Resolution recorded and problem officially closed.");
      setResolutionTarget(null);
      setResolutionNote("");
      void fetchData();
    } catch (err: any) {
      console.error("Resolution verification failed:", err);
      props.flash(err?.message || "Failed to record resolution.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* ========================================================================= */}
      {/* 1. OFFICIAL PRI HEADER & JURISDICTION BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {gramPanchayatName ? `${gramPanchayatName} Gram Panchayat` : (props.partnerIdentity?.name || "Panchayat Raj Institution")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  PRI Operational Portal
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>
                  <strong className="text-slate-800">District:</strong> {districtName}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  <strong className="text-slate-800">Block/Mandal:</strong> {blockName}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  <strong className="text-slate-800">Role:</strong> {officialDesignation}
                </span>
                {villageName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>
                      <strong className="text-slate-800">Habitation:</strong> {villageName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Bar: Habitation Filter + Refresh + Profile & Logout */}
          <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end">
            {/* Dynamic Habitation Filter */}
            <div className="relative flex items-center">
              <Compass size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <select
                value={selectedHabitation}
                onChange={(e) => setSelectedHabitation(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none shadow-sm transition"
                title="Filter challenges by Habitation or Hamlet"
              >
                <option value="all">All Habitations (Jurisdiction)</option>
                {habitations.length > 0 ? (
                  habitations.map((hab) => (
                    <option key={hab} value={hab}>
                      {hab}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    No sub-habitations recorded
                  </option>
                )}
              </select>
            </div>

            <button
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Refresh database records"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-600" : ""} />
            </button>

            {props.logout && (
              <button
                onClick={props.logout}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition shadow-sm"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Operational Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-100 text-xs font-semibold text-slate-600 pt-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "overview"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard size={15} /> Overview & KPIs
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "inbox"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Inbox size={15} /> Village Challenge Inbox
            {kpis.pendingVerification > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
                {kpis.pendingVerification}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("scoping")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "scoping"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers size={15} /> Ground Scoping & Baseline
          </button>
          <button
            onClick={() => setActiveTab("pilots")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "pilots"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Sparkles size={15} /> University Pilot Requests
            {kpis.activePilots > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-bold">
                {kpis.activePilots}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("gpdp")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "gpdp"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building2 size={15} /> Scheme & GPDP Convergence
          </button>
          <button
            onClick={() => setActiveTab("resolution")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "resolution"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 size={15} /> Proof of Resolution & Validation
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "notifications"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Bell size={15} /> Notifications
            {notifications.filter((n) => !n.read_at).length > 0 && (
              <span className="ml-1 rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
                {notifications.filter((n) => !n.read_at).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Shield size={15} /> Official PRI Profile
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTENT */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
            <RefreshCw size={32} className="animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Panchayat governance records...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching live challenges and jurisdiction telemetry from Supabase</p>
          </div>
        ) : (
          <>
            {/* =================================================================== */}
            {/* KPI BAR (Calculated from Real Database Data) */}
            {/* =================================================================== */}
            <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Crowdsourced</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.totalReports}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Citizen reports</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Routine Track</p>
                <p className="text-2xl font-extrabold text-sky-700 mt-1">{kpis.routineIssues}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Local actions</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chronic Track</p>
                <p className="text-2xl font-extrabold text-purple-700 mt-1">{kpis.chronicChallenges}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Societal issues</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">HEI Pilots</p>
                <p className="text-2xl font-extrabold text-indigo-700 mt-1">{kpis.activePilots}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active deployments</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verification</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{kpis.pendingVerification}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Awaiting inspection</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Field Actions</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">{kpis.activeFieldActions}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active assignments</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">GPDP Schemes</p>
                <p className="text-2xl font-extrabold text-teal-700 mt-1">{kpis.schemeOpportunities}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Mapped pathways</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{kpis.resolvedChallenges}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Verified solutions</p>
              </div>
            </section>

            {/* =================================================================== */}
            {/* TAB: OVERVIEW & SYSTEM WORKSPACE */}
            {/* =================================================================== */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Two-Track Operational Banner */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 shadow-md">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                        <CheckCircle2 size={13} /> Two-Track Operational Governance
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold mt-2">
                        Panchayat Raj Problem Resolution Engine
                      </h2>
                      <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                        Track A routes routine civic maintenance to field workers with deadlines. Track B anchors chronic, structural community challenges for ground scoping and university R&D pilot sandboxes.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab("inbox")}
                        className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition shadow"
                      >
                        Review Challenge Inbox ({filteredChallenges.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("pilots")}
                        className="px-4 py-2.5 rounded-xl bg-emerald-700/60 border border-emerald-500/40 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        University Pilots ({kpis.activePilots})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Views Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Recent Unverified Challenges */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Inbox size={18} className="text-emerald-700" /> Recent Citizen Submissions in Jurisdiction
                        </h3>
                        <p className="text-xs text-slate-500">Live feed of reported problems requiring Panchayat triage</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("inbox")}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        View all <ArrowRight size={14} />
                      </button>
                    </div>

                    {filteredChallenges.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <Inbox size={32} className="mx-auto text-slate-300" />
                        <p className="text-sm font-semibold">No citizen challenges submitted for this jurisdiction yet.</p>
                        <p className="text-xs text-slate-400">Reports submitted by citizens will automatically appear here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredChallenges.slice(0, 5).map((c) => (
                          <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-slate-500">{c.public_id}</span>
                                <span className="text-xs font-bold text-slate-800">{c.title}</span>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {c.domain}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1">{c.summary}</p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span>📍 {c.locality || c.block || c.district}</span>
                                <span>•</span>
                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                <span className={`font-semibold ${c.verification === "unverified" ? "text-amber-600" : "text-emerald-600"}`}>
                                  • {c.verification.replace("_", " ").toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedChallenge(c);
                                  setVerifyingChallenge(c);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                              >
                                Triage / Verify
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Jurisdiction Telemetry & Convergence */}
                  <div className="space-y-6">
                    {/* Active University Collaboration Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-600" /> Academic Sandbox Status
                      </h3>
                      {pilots.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3">No active university pilot projects are currently deployed in this jurisdiction.</p>
                      ) : (
                        <div className="space-y-2">
                          {pilots.slice(0, 3).map((p) => (
                            <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                              <p className="font-bold text-slate-800">{p.projects?.title || "Academic Research Project"}</p>
                              <p className="text-[11px] text-slate-500">Site: {p.location_text}</p>
                              <span className="inline-block rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold">
                                Status: {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setActiveTab("pilots")}
                        className="w-full text-center py-2 border border-indigo-200 rounded-xl bg-indigo-50/50 text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition"
                      >
                        View Pilot Sandbox Clearances
                      </button>
                    </div>

                    {/* GPDP Scheme Convergence Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={16} className="text-teal-700" /> GPDP & Scheme Convergence
                      </h3>
                      {fundingSources.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No scheme opportunities have been configured.</p>
                      ) : (
                        <div className="space-y-2">
                          {fundingSources.slice(0, 3).map((f) => (
                            <div key={f.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                              <p className="font-bold text-slate-800">{f.title || f.name || "Government Scheme"}</p>
                              <p className="text-[11px] text-slate-500">{f.scheme_type || "Panchayat Convergence"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setActiveTab("gpdp")}
                        className="w-full text-center py-2 border border-teal-200 rounded-xl bg-teal-50/50 text-teal-800 text-xs font-bold hover:bg-teal-50 transition"
                      >
                        Manage Scheme Pathways
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: VILLAGE CHALLENGE INBOX */}
            {/* =================================================================== */}
            {activeTab === "inbox" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Inbox size={20} className="text-emerald-700" /> Village Challenge Inbox
                    </h2>
                    <p className="text-xs text-slate-500">Authorized citizen challenges and issues within {gramPanchayatName || districtName}</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title, ID, locality..."
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                    />
                  </div>
                </div>

                {filteredChallenges.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 space-y-2">
                    <Inbox size={40} className="mx-auto text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No challenges matching filter</p>
                    <p className="text-xs text-slate-400">Try changing the habitation filter or clearing the search box.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Challenge</th>
                          <th className="py-3 px-4">Location / Habitation</th>
                          <th className="py-3 px-4">Domain & Track</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Verification</th>
                          <th className="py-3 px-4">Stage</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredChallenges.map((c) => {
                          const isRoutine = !c.technical_scope && (c.priority_level === "MINOR" || c.priority_level === "LOW" || c.priority_level === "MEDIUM");
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                                <div className="font-mono text-[11px] text-slate-400">{c.public_id}</div>
                                <div className="font-bold text-slate-800 line-clamp-1">{c.title}</div>
                                <p className="text-[11px] text-slate-500 line-clamp-1 font-normal">{c.summary}</p>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-medium text-slate-800">{c.locality || c.block || "Main Village"}</span>
                                <div className="text-[10px] text-slate-400">{c.district}</div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div>{c.domain}</div>
                                <span
                                  className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                    isRoutine ? "bg-sky-100 text-sky-800" : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {isRoutine ? "TRACK A: Routine" : "TRACK B: Chronic"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                    c.priority_level === "CRITICAL" || c.priority_level === "HIGH"
                                      ? "bg-rose-100 text-rose-800"
                                      : c.priority_level === "MEDIUM"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {c.priority_level || "MEDIUM"} ({c.priority_score ?? 0})
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                                    c.verification === "officially_verified"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : c.verification === "community_verified"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {c.verification.replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                                <span className="capitalize">{c.stage}</span>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  onClick={() => {
                                    setVerifyingChallenge(c);
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                                  title="Perform PRI Verification"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    setScopingChallenge(c);
                                    setScopingForm({
                                      technicalScope: c.technical_scope || "",
                                      expectedOutcome: c.expected_outcome || "",
                                      constraints: c.constraints || "",
                                      governmentData: c.government_data || "",
                                      regulatoryReq: c.regulatory_requirements || "",
                                      safetyReq: c.safety_requirements || "",
                                      pilotReq: c.pilot_requirements || "",
                                      evalCriteria: c.evaluation_criteria || "",
                                      affectedPop: c.affected_population ? String(c.affected_population) : "",
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100"
                                  title="Enrich ground scoping & baseline"
                                >
                                  Scope
                                </button>
                                <button
                                  onClick={() => {
                                    setResolutionTarget(c);
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-teal-300 bg-teal-50 text-teal-800 font-semibold hover:bg-teal-100"
                                  title="Confirm proof of resolution"
                                >
                                  Resolve
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: GROUND SCOPING & BASELINE */}
            {/* =================================================================== */}
            {activeTab === "scoping" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Layers size={20} className="text-emerald-700" /> Ground Scoping & Baseline Enrichment
                      </h2>
                      <p className="text-xs text-slate-500">
                        Authorized PRI officials define technical engineering scopes, power/water constraints, and baseline metrics for university research and CSR scaling.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredChallenges.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                            <span>{c.public_id}</span>
                            <span className="text-emerald-700 font-semibold">{c.domain}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">{c.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{c.summary}</p>
                          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70 space-y-1 mt-2">
                            <p>
                              <strong>Technical Scope:</strong> {c.technical_scope ? c.technical_scope.slice(0, 75) + "..." : "Baseline data has not been recorded yet."}
                            </p>
                            {c.scope_defined_at && (
                              <p className="text-[10px] text-slate-400">
                                Scoped on {new Date(c.scope_defined_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setScopingChallenge(c);
                            setScopingForm({
                              technicalScope: c.technical_scope || "",
                              expectedOutcome: c.expected_outcome || "",
                              constraints: c.constraints || "",
                              governmentData: c.government_data || "",
                              regulatoryReq: c.regulatory_requirements || "",
                              safetyReq: c.safety_requirements || "",
                              pilotReq: c.pilot_requirements || "",
                              evalCriteria: c.evaluation_criteria || "",
                              affectedPop: c.affected_population ? String(c.affected_population) : "",
                            });
                          }}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-sm"
                        >
                          {c.technical_scope ? "Edit Ground Scope" : "Record Ground Baseline"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: UNIVERSITY PILOT REQUESTS */}
            {/* =================================================================== */}
            {activeTab === "pilots" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={20} className="text-indigo-600" /> University / HEI Pilot Requests
                    </h2>
                    <p className="text-xs text-slate-500">Review and authorize sandbox testing proposals submitted by university engineering teams</p>
                  </div>
                </div>

                {pilots.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Sparkles size={36} className="mx-auto text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No university pilot requests in this jurisdiction</p>
                    <p className="text-xs text-slate-400">When university faculty and student teams propose sandbox tests for scoped challenges, they will appear here for clearance.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pilots.map((p) => (
                      <div key={p.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400">{p.id.slice(0, 8)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Status: {p.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{p.projects?.title || "University Research Prototype"}</h4>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>
                            <strong>Proposed Test Site:</strong> {p.location_text}
                          </p>
                          <p>
                            <strong>Target Population:</strong> {p.target_population ? `${p.target_population} residents` : "Not specified"}
                          </p>
                          {p.pilot_conditions && (
                            <p>
                              <strong>Conditions / Oversight:</strong> {p.pilot_conditions}
                            </p>
                          )}
                          {p.monitoring_requirements && (
                            <p>
                              <strong>Monitoring Schedule:</strong> {p.monitoring_requirements}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setPilotReviewTarget(p);
                              setPilotConditions(p.pilot_conditions || "Ensure local Gram Sabha safety protocol compliance.");
                              setPilotMonitoring(p.monitoring_requirements || "Fortnightly progress update.");
                            }}
                            className="flex-1 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg transition shadow-sm"
                          >
                            Review Pilot Clearance
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: SCHEME & GPDP CONVERGENCE */}
            {/* =================================================================== */}
            {activeTab === "gpdp" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 size={20} className="text-teal-700" /> Gram Panchayat Development Plan (GPDP) & Scheme Convergence
                    </h2>
                    <p className="text-xs text-slate-500">Map verified local challenges to eligible government schemes and local planning allocations</p>
                  </div>
                </div>

                {fundingSources.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Building2 size={36} className="mx-auto text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No scheme opportunities have been configured.</p>
                    <p className="text-xs text-slate-400">Government schemes configured for local GPDP convergence will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fundingSources.map((f) => (
                      <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <span className="inline-block rounded bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-bold">
                          {f.scheme_type || "Government Scheme"}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{f.title || f.name}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{f.description || "Eligible for Panchayat convergence."}</p>
                        <div className="text-[11px] text-slate-500 pt-1">
                          Status: <strong className="text-slate-800">Potential Scheme Match</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: PROOF OF RESOLUTION & VALIDATION */}
            {/* =================================================================== */}
            {activeTab === "resolution" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-700" /> Proof of Resolution & Community Validation
                    </h2>
                    <p className="text-xs text-slate-500">Audit trail of completed tasks, inspections, and officially resolved challenges</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Recent Verification & Resolution Events</h3>
                  {verificationEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Community validation pending.</p>
                      <p className="text-xs text-slate-400">No completion verifications have been logged yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {verificationEvents.map((ev) => (
                        <div key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-800 capitalize">{ev.method}</span>
                              <span className="rounded bg-emerald-50 text-emerald-800 px-2 py-0.2 text-[10px] font-bold">
                                {ev.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{ev.note || "Official inspection recorded."}</p>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: NOTIFICATIONS */}
            {/* =================================================================== */}
            {activeTab === "notifications" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Bell size={20} className="text-emerald-700" /> Panchayat Notifications
                    </h2>
                    <p className="text-xs text-slate-500">Official updates, citizen submissions, and pilot notifications</p>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Bell size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No new notifications.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3.5 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{n.title}</span>
                            {!n.read_at && (
                              <span className="rounded-full bg-emerald-600 text-white px-1.5 py-0.2 text-[9px] font-bold">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{n.body}</p>
                          <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        {!n.read_at && (
                          <button
                            onClick={async () => {
                              if (!supabase) return;
                              await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
                              void fetchData();
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold shrink-0"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB: PRI PROFILE */}
            {/* =================================================================== */}
            {activeTab === "profile" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Shield size={20} className="text-emerald-700" /> Authenticated PRI Profile & Jurisdiction
                    </h2>
                    <p className="text-xs text-slate-500">Official credentials recorded in the Samaj Setu database</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Panchayat Raj Entity</span>
                    <p className="text-sm font-bold text-slate-900">{gramPanchayatName ? `${gramPanchayatName} Gram Panchayat` : (props.partnerIdentity?.name || "Panchayati Raj Institution")}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Panchayat Tier</span>
                    <p className="text-sm font-bold text-slate-900">{priTier}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Authorized Official</span>
                    <p className="text-sm font-bold text-slate-900">{officialName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Official Designation</span>
                    <p className="text-sm font-bold text-slate-900">{officialDesignation}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Official Email ID</span>
                    <p className="text-sm font-bold text-slate-900">{officialEmail}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Contact Mobile Number</span>
                    <p className="text-sm font-bold text-slate-900">{officialPhone || "Not provided"}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">District Jurisdiction</span>
                    <p className="text-sm font-bold text-slate-900">{districtName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Block / Mandal</span>
                    <p className="text-sm font-bold text-slate-900">{blockName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1 sm:col-span-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Unique Identity Link</span>
                    <p className="font-mono text-xs text-slate-700 mt-0.5 break-all">auth.users.id: {props.user?.id}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS & INTERACTION DRAWERS */}
      {/* ========================================================================= */}

      {/* Verification Modal */}
      {verifyingChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-700" /> Panchayat Official Verification
              </h3>
              <button
                onClick={() => setVerifyingChallenge(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-slate-400">{verifyingChallenge.public_id}</span>
              <h4 className="font-bold text-sm text-slate-900">{verifyingChallenge.title}</h4>
              <p className="text-xs text-slate-500">{verifyingChallenge.summary}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Verification Method</label>
                <select
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800"
                >
                  <option value="Gram Panchayat Field Inspection">Gram Panchayat Field Inspection</option>
                  <option value="Ward Member Ground Review">Ward Member Ground Review</option>
                  <option value="Panchayat Secretary Direct Verification">Panchayat Secretary Direct Verification</option>
                  <option value="Gram Sabha Consensus">Gram Sabha Consensus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Notes / Remarks</label>
                <textarea
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Record ground verification findings, severity confirmation, and local action needed..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyingChallenge(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyChallenge(verifyingChallenge.id, "rejected")}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold"
              >
                Reject Report
              </button>
              <button
                type="button"
                onClick={() => handleVerifyChallenge(verifyingChallenge.id, "officially_verified")}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Officially Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ground Scoping Modal */}
      {scopingChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-emerald-700" /> Ground Scoping & Engineering Requirements
                </h3>
                <p className="text-xs text-slate-500">Persists to real database via define_government_scope RPC</p>
              </div>
              <button onClick={() => setScopingChallenge(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <span className="font-mono text-slate-400">{scopingChallenge.public_id}</span>
              <p className="font-bold text-slate-900">{scopingChallenge.title}</p>
            </div>

            <form onSubmit={handleSaveGroundScope} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Technical Engineering Scope <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  value={scopingForm.technicalScope}
                  onChange={(e) => setScopingForm({ ...scopingForm, technicalScope: e.target.value })}
                  placeholder="Detail exact engineering defect, required hardware/infrastructure fixes, and target deliverables..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Outcome</label>
                  <input
                    type="text"
                    value={scopingForm.expectedOutcome}
                    onChange={(e) => setScopingForm({ ...scopingForm, expectedOutcome: e.target.value })}
                    placeholder="e.g. 500 households receiving potable water daily"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Affected Population</label>
                  <input
                    type="number"
                    value={scopingForm.affectedPop}
                    onChange={(e) => setScopingForm({ ...scopingForm, affectedPop: e.target.value })}
                    placeholder="e.g. 1200"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field Constraints & Observations</label>
                <textarea
                  value={scopingForm.constraints}
                  onChange={(e) => setScopingForm({ ...scopingForm, constraints: e.target.value })}
                  placeholder="e.g. Intermittent 3-phase grid power, seasonal groundwater depletion, narrow access road..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Local Baseline Data (Water tests / Soil / Power)</label>
                <textarea
                  value={scopingForm.governmentData}
                  onChange={(e) => setScopingForm({ ...scopingForm, governmentData: e.target.value })}
                  placeholder="e.g. TDS: 850ppm, Fluoride: 2.1mg/L, 4 hours power availability daily..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScopingChallenge(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
                >
                  Save Ground Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pilot Review Modal */}
      {pilotReviewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" /> Pilot / Sandbox Permission Record
              </h3>
              <button onClick={() => setPilotReviewTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">{pilotReviewTarget.projects?.title}</p>
              <p className="text-slate-500">Proposed Site: {pilotReviewTarget.location_text}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clearance Conditions & Safety Protocols</label>
                <textarea
                  value={pilotConditions}
                  onChange={(e) => setPilotConditions(e.target.value)}
                  placeholder="Specify operating conditions, safety clearances, and Gram Sabha supervision requirements..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monitoring Schedule</label>
                <input
                  type="text"
                  value={pilotMonitoring}
                  onChange={(e) => setPilotMonitoring(e.target.value)}
                  placeholder="e.g. Weekly inspection by Panchayat Secretary"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={pilotActionBusy}
                onClick={() => setPilotReviewTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pilotActionBusy}
                onClick={() => handleReviewPilot("rejected")}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold"
              >
                Reject Pilot
              </button>
              <button
                type="button"
                disabled={pilotActionBusy}
                onClick={() => handleReviewPilot("approved")}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Grant Pilot Clearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Resolution Confirmation Modal */}
      {resolutionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-700" /> Confirm Official Resolution
              </h3>
              <button onClick={() => setResolutionTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are officially marking <strong>{resolutionTarget.public_id}</strong> as resolved. This will persist the resolution status to the database and update community verification.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Resolution Note</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe resolution work, completion date, and field verification outcome..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolutionTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmResolution(resolutionTarget.id)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Mark Officially Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
