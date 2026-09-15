import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Inbox,
  MapPin,
  AlertTriangle,
  Building2,
  BarChart3,
  Bell,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  X,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Users,
  Compass
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface ULBDashboardProps {
  user: User | null;
  profile: any;
  partnerIdentity: any;
  go: (screen: any) => void;
  flash: (msg: string) => void;
}

class ULBErrorBoundary extends React.Component<
  { children: React.ReactNode; goHome: () => void },
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
    console.error("ULBDashboard Render Error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl max-w-md shadow-sm space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-slate-900">ULB Dashboard Notice</h3>
            <p className="text-xs text-slate-500">
              {this.state.error?.message || "An unexpected error occurred while rendering the dashboard."}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
              >
                Reload Dashboard
              </button>
              <button
                onClick={this.props.goHome}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ULBDashboard(props: ULBDashboardProps) {
  return (
    <ULBErrorBoundary goHome={() => props.go("home")}>
      <ULBDashboardContent {...props} />
    </ULBErrorBoundary>
  );
}

function ULBDashboardContent({ user, profile, partnerIdentity, go, flash }: ULBDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "inbox"
    | "map"
    | "priority"
    | "departments"
    | "analytics"
    | "notifications"
    | "settings"
  >("overview");

  // Live Database States
  const [challenges, setChallenges] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters for Inbox & Map
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWard, setFilterWard] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");

  // Modals
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Submission Form State
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newDomain, setNewDomain] = useState("Roads");
  const [newDistrict, setNewDistrict] = useState(profile?.district || "Visakhapatnam");
  const [newLocality, setNewLocality] = useState("");
  const [newSeverity, setNewSeverity] = useState(3);
  const [newUrgency, setNewUrgency] = useState(3);
  const [newAffected, setNewAffected] = useState(250);
  const [newDepartment, setNewDepartment] = useState("Municipal Engineering");
  const [newScope, setNewScope] = useState("");
  const [newOutcome, setNewOutcome] = useState("");
  const [newConstraints, setNewConstraints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Assignment Form State
  const [assignDept, setAssignDept] = useState("Municipal Engineering");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignPriority, setAssignPriority] = useState("HIGH");
  const [assignNote, setAssignNote] = useState("");

  // ULB Authority Details
  const ulbName =
    partnerIdentity?.name ||
    user?.user_metadata?.["organization_name"] ||
    user?.user_metadata?.["display_name"] ||
    (profile?.district ? `${profile.district} Municipal Corporation` : "Urban Local Body (ULB)");

  const ulbDistrict = partnerIdentity?.district || profile?.district || "Visakhapatnam";

  // Load Real Data
  const loadData = async () => {
    if (!supabase) return;
    setRefreshing(true);
    try {
      const [challengesRes, orgsRes, notifsRes, assignmentsRes] = await Promise.all([
        supabase.rpc("search_challenges", { search_text: "" }),
        supabase.from("organization_accounts").select("*"),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("problem_assignments").select("*")
      ]);

      if (challengesRes.data) setChallenges(challengesRes.data);
      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (notifsRes.data) setNotifications(notifsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } catch (e: any) {
      flash(e.message || "Error fetching ULB data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered Challenges
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.public_id && c.public_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.locality && c.locality.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.summary && c.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesWard =
        filterWard === "all" ||
        (c.locality && c.locality.toLowerCase().includes(filterWard.toLowerCase())) ||
        (c.block && c.block.toLowerCase().includes(filterWard.toLowerCase()));

      const matchesCategory =
        filterCategory === "all" ||
        (c.domain && c.domain.toLowerCase() === filterCategory.toLowerCase());

      const matchesPriority =
        filterPriority === "all" ||
        (c.priority_level && c.priority_level.toLowerCase() === filterPriority.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (c.stage && c.stage.toLowerCase() === filterStatus.toLowerCase());

      const matchesVerification =
        filterVerification === "all" ||
        (filterVerification === "verified" && ["officially_verified", "community_verified"].includes(c.verification)) ||
        (filterVerification === "unverified" && c.verification === "unverified");

      return Boolean(
        matchesSearch &&
        matchesWard &&
        matchesCategory &&
        matchesPriority &&
        matchesStatus &&
        matchesVerification
      );
    });
  }, [challenges, searchQuery, filterWard, filterCategory, filterPriority, filterStatus, filterVerification]);

  // Derived Calculations
  const stats = useMemo(() => {
    const total = challenges.length;
    const pendingReview = challenges.filter((c) => ["reported", "unverified"].includes(c.stage) || c.verification === "unverified").length;
    const inProgress = challenges.filter((c) => ["assigned", "validated", "prototype", "pilot", "impact"].includes(c.stage)).length;
    const resolved = challenges.filter((c) => ["completed", "solved"].includes(c.stage)).length;
    const criticalHigh = challenges.filter((c) => ["CRITICAL", "HIGH"].includes(c.priority_level) || c.priority_score >= 70).length;
    const requiresVerification = challenges.filter((c) => c.verification === "unverified").length;
    const totalAffected = challenges.reduce((acc, c) => acc + (c.affected_population || 0), 0);

    return {
      total,
      pendingReview,
      inProgress,
      resolved,
      criticalHigh,
      requiresVerification,
      totalAffected,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : "0.0"
    };
  }, [challenges]);

  // Category Breakdown
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    challenges.forEach((c) => {
      const cat = c.domain || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [challenges]);

  // Critical & High Priority List
  const urgentChallenges = useMemo(() => {
    return challenges
      .filter((c) => ["CRITICAL", "HIGH"].includes(c.priority_level) || c.priority_score >= 70)
      .sort((a, b) => b.priority_score - a.priority_score);
  }, [challenges]);


  // Handle Direct Submission
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      return flash("Please provide challenge title and description.");
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase!.rpc("ulb_submit_challenge", {
        p_title: newTitle.trim(),
        p_summary: newSummary.trim(),
        p_domain: newDomain,
        p_district: newDistrict,
        p_block: null,
        p_locality: newLocality.trim() || null,
        p_latitude: 17.6868 + (Math.random() - 0.5) * 0.05,
        p_longitude: 83.2185 + (Math.random() - 0.5) * 0.05,
        p_severity: Number(newSeverity),
        p_urgency: Number(newUrgency),
        p_affected_population: Number(newAffected),
        p_department: newDepartment,
        p_technical_scope: newScope.trim() || null,
        p_expected_outcome: newOutcome.trim() || null,
        p_constraints: newConstraints.trim() || null
      });

      if (error) throw error;
      flash("Municipal challenge published to ULB pipeline.");
      setSubmitModalOpen(false);
      // Reset form
      setNewTitle("");
      setNewSummary("");
      setNewLocality("");
      setNewScope("");
      setNewOutcome("");
      setNewConstraints("");
      await loadData();
    } catch (err: any) {
      flash(err.message || "Failed to submit challenge.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Official Verification
  const handleVerify = async (challenge: any) => {
    try {
      const { error } = await supabase!.rpc("review_challenge", {
        challenge_uuid: challenge.id,
        next_status: "officially_verified",
        review_method: "ULB official inspection",
        review_note: "Verified by authorized Municipal Corporation authority."
      });
      if (error) throw error;
      flash(`Challenge ${challenge.public_id} verified.`);
      await loadData();
      if (selectedChallenge?.id === challenge.id) {
        setSelectedChallenge({ ...selectedChallenge, verification: "officially_verified" });
      }
    } catch (e: any) {
      flash(e.message || "Verification failed");
    }
  };

  // Handle Department Assignment
  const handleAssignDepartment = async () => {
    if (!selectedChallenge) return;
    try {
      const deadlineDate = assignDeadline
        ? new Date(assignDeadline).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase!.rpc("ulb_assign_department", {
        challenge_uuid: selectedChallenge.id,
        dept_name: assignDept,
        deadline_timestamp: deadlineDate,
        officer_note: assignNote.trim() || null,
        assigned_priority: assignPriority
      });
      if (error) throw error;
      flash(`Challenge ${selectedChallenge.public_id} assigned to ${assignDept}.`);
      setAssignModalOpen(false);
      await loadData();
    } catch (e: any) {
      flash(e.message || "Assignment failed");
    }
  };

  // Handle Mark Resolved
  const handleMarkResolved = async (challenge: any) => {
    try {
      const { error } = await supabase!
        .from("challenges")
        .update({ stage: "completed", updated_at: new Date().toISOString() })
        .eq("id", challenge.id);
      if (error) throw error;
      flash(`Challenge ${challenge.public_id} marked as resolved. Pending citizen verification.`);
      await loadData();
      if (selectedChallenge?.id === challenge.id) {
        setSelectedChallenge({ ...selectedChallenge, stage: "completed" });
      }
    } catch (e: any) {
      flash(e.message || "Could not update status");
    }
  };

  // Handle Citizen Verification Feedback Loop (Thumbs Up / Down)
  const handleCitizenVerdict = async (challenge: any, verdict: "resolved" | "unresolved") => {
    try {
      const comment = verdict === "resolved" 
        ? "Citizen confirmed civic issue resolved satisfactorily." 
        : "Citizen reported problem persists. Challenge reopened for municipal action.";
      
      const { error } = await supabase!.rpc("ulb_submit_resolution_feedback", {
        challenge_uuid: challenge.id,
        feedback_verdict: verdict,
        feedback_comment: comment
      });
      if (error) throw error;
      flash(verdict === "resolved" ? "Resolution confirmed by citizen." : "Challenge reopened for re-inspection.");
      await loadData();
    } catch (e: any) {
      flash(e.message || "Failed to submit citizen verdict.");
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 grid place-items-center font-bold text-white shadow-md">
              🏙️
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-none">
                ULB Portal
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[130px]">
                {ulbName}
              </p>
            </div>
          </div>
          <button
            onClick={() => void loadData()}
            title="Refresh database records"
            className={`p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition ${
              refreshing ? "animate-spin text-blue-400" : ""
            }`}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto text-xs font-semibold">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            {
              id: "inbox",
              label: "Challenge Inbox",
              icon: Inbox,
              badge: stats.pendingReview > 0 ? stats.pendingReview : undefined
            },
            { id: "map", label: "Problem Map", icon: MapPin },
            {
              id: "priority",
              label: "Priority Issues",
              icon: AlertTriangle,
              badge: stats.criticalHigh > 0 ? stats.criticalHigh : undefined,
              badgeColor: "bg-red-500 text-white"
            },
            { id: "departments", label: "Departments & SLA", icon: Building2 },
            { id: "analytics", label: "Municipal Analytics", icon: BarChart3 },
            {
              id: "notifications",
              label: "Notifications",
              icon: Bell,
              badge: notifications.length > 0 ? notifications.length : undefined
            },
            { id: "settings", label: "Municipal Settings", icon: Settings }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition text-left ${
                  isActive
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus size={14} /> Submit ULB Challenge
          </button>
          <button
            onClick={() => go("home")}
            className="w-full py-1.5 px-3 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition text-center"
          >
            Return to Public Portal
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === "inbox"
                ? "Urban Challenge Inbox"
                : activeTab === "priority"
                ? "Urgent & High Priority Action"
                : activeTab === "departments"
                ? "Municipal Department Assignment & SLA Deadlines"
                : activeTab === "analytics"
                ? "Municipal Performance & Domain Analytics"
                : activeTab === "map"
                ? "Geospatial Problem Distribution"
                : activeTab === "notifications"
                ? "Municipal Alerts & System Feeds"
                : activeTab === "settings"
                ? "ULB Jurisdiction & Department Settings"
                : "Municipal Command Overview"}
            </h2>
            <span className="hidden sm:inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              {ulbDistrict}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={15} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, ward, keywords..."
                className="w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <button
              onClick={() => setSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
            >
              <Plus size={14} /> Submit Challenge
            </button>
          </div>
        </header>

        {/* ─── SECTION 1: TOP SUMMARY CARDS (Always visible at top of Overview & Inbox) ─── */}
        <div className="p-6 space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Challenges</span>
                <Layers size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-1">Recorded in database</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Pending Review</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{stats.pendingReview}</p>
              <p className="text-[11px] text-slate-400 mt-1">Require verification / scope</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>In Progress</span>
                <TrendingUp size={16} className="text-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">{stats.inProgress}</p>
              <p className="text-[11px] text-slate-400 mt-1">Assigned or in development</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Resolved</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">{stats.resolved}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Resolution Rate: {stats.resolutionRate}%
              </p>
            </div>
          </section>

          {/* Secondary Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200/60 p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-800">Critical / High Priority</span>
                <p className="text-lg font-black text-red-700">{stats.criticalHigh}</p>
              </div>
              <AlertTriangle size={20} className="text-red-500 opacity-80" />
            </div>

            <div className="bg-purple-50 border border-purple-200/60 p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-800">Awaiting Verification</span>
                <p className="text-lg font-black text-purple-700">{stats.requiresVerification}</p>
              </div>
              <ShieldCheck size={20} className="text-purple-500 opacity-80" />
            </div>

            <div className="bg-blue-50 border border-blue-200/60 p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-800">Citizens Impacted</span>
                <p className="text-lg font-black text-blue-700">
                  {stats.totalAffected.toLocaleString()}
                </p>
              </div>
              <Users size={20} className="text-blue-500 opacity-80" />
            </div>
          </div>

          {/* ─── TAB CONTENT SWITCHING ─── */}

          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Split: Urgent Tasks & Domain Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Urgent Action Feed */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        🚨 Urgent Action Required ({urgentChallenges.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Critical and high-priority challenges needing officer assignment or verification
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("priority")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View All <ChevronRight size={14} />
                    </button>
                  </div>

                  {urgentChallenges.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No critical or high priority challenges pending urgent action.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {urgentChallenges.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-blue-600">
                                {c.public_id}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
                                {c.priority_level || "HIGH"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {c.locality || c.district}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-800">{c.title}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{c.summary}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedChallenge(c);
                                setAssignModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => setSelectedChallenge(c)}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Problems by Category Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      📊 Challenges by Domain
                    </h3>
                    <p className="text-xs text-slate-500">
                      Distribution across urban civic services
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {categoryCounts.map(([domain, count]) => {
                      const percentage = Math.round((count / Math.max(1, stats.total)) * 100);
                      return (
                        <div key={domain} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{domain}</span>
                            <span className="text-slate-500 font-mono font-bold">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(8, percentage))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {categoryCounts.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No categorized challenges available.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Citizen Verification Loop Status */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      🧑‍🤝‍🧑 Citizen Verification & Feedback Loop
                    </h3>
                    <p className="text-xs text-slate-500">
                      Closed-loop governance: Completed challenges awaiting citizen confirmation or reopening
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    {stats.resolved} Resolved Tasks
                  </span>
                </div>

                <div className="space-y-3">
                  {challenges.filter((c) => c.stage === "completed").length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No resolved tasks currently awaiting citizen verification feedback.
                    </div>
                  ) : (
                    challenges
                      .filter((c) => c.stage === "completed")
                      .slice(0, 3)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {c.public_id}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                Resolved by {c.responsible_department || "Department"}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 mt-1">{c.title}</h4>
                            <p className="text-[11px] text-slate-500">{c.locality || c.district}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 mr-2">Citizen Verification:</span>
                            <button
                              onClick={() => void handleCitizenVerdict(c, "resolved")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              <ThumbsUp size={13} /> Confirm Resolution
                            </button>
                            <button
                              onClick={() => void handleCitizenVerdict(c, "unresolved")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                            >
                              <ThumbsDown size={13} /> Reopen Issue
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. CHALLENGE INBOX TAB */}
          {activeTab === "inbox" && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Filter size={14} /> Filter Challenges ({filteredChallenges.length})
                  </div>
                  {(filterWard !== "all" ||
                    filterCategory !== "all" ||
                    filterPriority !== "all" ||
                    filterStatus !== "all" ||
                    filterVerification !== "all" ||
                    searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterWard("all");
                        setFilterCategory("all");
                        setFilterPriority("all");
                        setFilterStatus("all");
                        setFilterVerification("all");
                        setSearchQuery("");
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Ward / Locality
                    </label>
                    <input
                      value={filterWard === "all" ? "" : filterWard}
                      onChange={(e) => setFilterWard(e.target.value || "all")}
                      placeholder="e.g. Ward 12, Gajuwaka"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Problem Domain
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="all">All Categories</option>
                      {categoryCounts.map(([cat]) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Priority Level
                    </label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="CRITICAL">🔴 Critical</option>
                      <option value="HIGH">🟠 High</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="LOW">🟢 Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Lifecycle Stage
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="all">All Stages</option>
                      <option value="reported">Reported</option>
                      <option value="validated">Scoped / Validated</option>
                      <option value="assigned">Assigned</option>
                      <option value="prototype">Prototype Testing</option>
                      <option value="pilot">Field Pilot</option>
                      <option value="completed">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Verification
                    </label>
                    <select
                      value={filterVerification}
                      onChange={(e) => setFilterVerification(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="all">All</option>
                      <option value="verified">Officially Verified</option>
                      <option value="unverified">Unverified (Citizen)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Challenge Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Problem</th>
                        <th className="py-3 px-4">Location / Ward</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredChallenges.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {c.public_id}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-bold text-slate-900 truncate">{c.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{c.summary}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {c.locality || c.district}
                            {c.block && <span className="text-slate-400 block text-[10px]">{c.block}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                              {c.domain}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.priority_level === "CRITICAL"
                                  ? "bg-red-100 text-red-700"
                                  : c.priority_level === "HIGH"
                                  ? "bg-amber-100 text-amber-700"
                                  : c.priority_level === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {c.priority_level || "MEDIUM"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-semibold text-slate-700">
                              {c.stage.replaceAll("_", " ")}
                            </span>
                            {c.verification === "unverified" && (
                              <span className="block text-[10px] text-amber-600 font-bold">
                                ⚠️ Needs Verification
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => setSelectedChallenge(c)}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                              View
                            </button>
                            {c.verification === "unverified" && (
                              <button
                                onClick={() => void handleVerify(c)}
                                className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredChallenges.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No challenges match the active filters or search terms.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PROBLEM MAP TAB */}
          {activeTab === "map" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    🗺️ Municipal Geospatial Distribution Map
                  </h3>
                  <p className="text-xs text-slate-500">
                    Spatial concentration of reported challenges across municipal wards
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500" />
                    <span>Roads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span>Sanitation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-blue-500" />
                    <span>Water</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-purple-500" />
                    <span>Drainage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    <span>Resolved</span>
                  </div>
                </div>
              </div>

              {/* Map Canvas / Visualizer */}
              <div className="relative aspect-[16/9] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                {/* Plot Pins */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-full overflow-y-auto w-full p-2">
                  {challenges.map((c, idx) => {
                    const color =
                      c.stage === "completed"
                        ? "border-emerald-500 bg-emerald-950/80 text-emerald-300"
                        : c.domain === "Roads"
                        ? "border-red-500 bg-red-950/80 text-red-300"
                        : c.domain === "Sanitation"
                        ? "border-amber-500 bg-amber-950/80 text-amber-300"
                        : c.domain === "Water"
                        ? "border-blue-500 bg-blue-950/80 text-blue-300"
                        : "border-purple-500 bg-purple-950/80 text-purple-300";

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedChallenge(c)}
                        className={`cursor-pointer p-3 rounded-lg border text-left shadow-lg transition hover:scale-105 ${color}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <b>{c.public_id}</b>
                          <span>📍 {c.locality || "Ward"}</span>
                        </div>
                        <p className="font-bold text-xs text-white truncate mt-1">{c.title}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-300 mt-2">
                          <span>Priority: {c.priority_level || "MEDIUM"}</span>
                          <span>~{c.affected_population || 100} citizens</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. PRIORITY ISSUES TAB */}
          {activeTab === "priority" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    🚨 Prioritized Municipal Problem Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-severity civic emergencies ordered by urgency, severity, and population affected
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                  {urgentChallenges.length} High-Risk Tasks
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {urgentChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-5 rounded-xl border-l-4 border-l-red-500 border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-red-600">
                            {c.public_id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                            {c.priority_level || "CRITICAL"}
                          </span>
                          <span className="text-xs text-slate-500">{c.domain}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{c.title}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">
                        Score: {c.priority_score}/100
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{c.summary}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                      <div>
                        <b>Ward / Area:</b> {c.locality || c.district}
                      </div>
                      <div>
                        <b>Estimated Impact:</b> {c.affected_population || "200+"} people
                      </div>
                      <div>
                        <b>Department:</b> {c.responsible_department || "Pending Assignment"}
                      </div>
                      <div>
                        <b>Status:</b> {c.stage}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedChallenge(c);
                          setAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                      >
                        Assign Officer / Department
                      </button>
                      <button
                        onClick={() => setSelectedChallenge(c)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200"
                      >
                        Inspect Details
                      </button>
                    </div>
                  </div>
                ))}

                {urgentChallenges.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    No critical or high-priority issues recorded in the database.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. DEPARTMENTS & SLA TAB */}
          {activeTab === "departments" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm">
                  👨‍💼 Municipal Department Assignment & SLA Tracking
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Track response deadlines, department assignments, and SLA compliance across municipal divisions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  "Municipal Engineering",
                  "Public Health & Sanitation",
                  "Water Resources & Sewerage",
                  "Transport & Traffic Engineering",
                  "Electrical & Street Lighting",
                  "Public Works Department (PWD)"
                ].map((dept) => {
                  const deptTasks = challenges.filter(
                    (c) =>
                      c.responsible_department &&
                      c.responsible_department.toLowerCase().includes(dept.toLowerCase())
                  );

                  return (
                    <div
                      key={dept}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-xs text-slate-900">{dept}</h4>
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {deptTasks.length} tasks
                        </span>
                      </div>

                      <div className="space-y-2">
                        {deptTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <div className="truncate mr-2">
                              <span className="font-mono font-bold text-blue-600 text-[10px]">
                                {t.public_id}
                              </span>
                              <p className="font-semibold text-slate-800 truncate text-[11px]">
                                {t.title}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              SLA: 3d left
                            </span>
                          </div>
                        ))}

                        {deptTasks.length === 0 && (
                          <p className="text-center py-4 text-[11px] text-slate-400">
                            No active tasks assigned to this department.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm">
                  📊 Municipal Performance & Resolution Metrics
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Comprehensive analytics on problem resolution rates, turnaround time, and citizen satisfaction.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Average Resolution Time</span>
                  <p className="text-3xl font-black text-blue-600 mt-2">6.8 Days</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">↓ 1.4 days this month</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Civic Resolution Rate</span>
                  <p className="text-3xl font-black text-emerald-600 mt-2">{stats.resolutionRate}%</p>
                  <span className="text-[11px] text-slate-500">Target: &gt;75%</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Citizens Served</span>
                  <p className="text-3xl font-black text-purple-600 mt-2">
                    {stats.totalAffected.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-purple-600 font-semibold">Across {ulbDistrict}</span>
                </div>
              </div>
            </div>
          )}

          {/* 11. NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">
                🔔 Municipal Notifications & Civic Feeds
              </h3>

              <div className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div key={n.id} className="py-3 flex items-start gap-3">
                    <div className="size-8 rounded-full bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                      <Bell size={14} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{n.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <p className="text-center py-8 text-xs text-slate-400">
                    No new municipal notifications recorded.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 12. SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
              <h3 className="font-bold text-slate-800 text-sm">
                ⚙️ Municipal Corporation Jurisdiction Settings
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ULB Name</label>
                  <input
                    defaultValue={ulbName}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Municipal District</label>
                  <input
                    defaultValue={ulbDistrict}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Standard SLA Response Window</label>
                  <select defaultValue="7" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                    <option value="3">3 Days (Emergency Wards)</option>
                    <option value="7">7 Days (Standard Municipal Benchmark)</option>
                    <option value="14">14 Days (Capital Projects)</option>
                  </select>
                </div>
                <button
                  onClick={() => flash("Municipal settings updated.")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── MODAL: DIRECT ULB CHALLENGE SUBMISSION ─── */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Submit Municipal Infrastructure Challenge
                </h3>
                <p className="text-xs text-slate-500">
                  Register a problem statement directly from the Urban Local Body
                </p>
              </div>
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Challenge Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Broken Stormwater Culvert near Old Market Junction"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Problem Domain</label>
                  <select
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="Roads">Roads & Transport</option>
                    <option value="Sanitation">Sanitation & Solid Waste</option>
                    <option value="Water">Water Resources & Supply</option>
                    <option value="Drainage">Stormwater Drainage</option>
                    <option value="Street Lighting">Street Lighting & Power</option>
                    <option value="Environment">Urban Ecology & Green Spaces</option>
                    <option value="Other">Other Civic Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ward / Locality</label>
                  <input
                    value={newLocality}
                    onChange={(e) => setNewLocality(e.target.value)}
                    placeholder="e.g. Ward 14 (Old Market)"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Problem Description & Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Explain the civic hazard, underlying causes, and current impact..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Urgency (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">People Affected</label>
                  <input
                    type="number"
                    value={newAffected}
                    onChange={(e) => setNewAffected(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Responsible Municipal Department
                </label>
                <input
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Municipal Engineering & Stormwater Division"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Technical Problem Scope (For Universities / R&D)
                </label>
                <textarea
                  rows={2}
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  placeholder="Specify engineering guidelines, flow capacity, sensor requirements..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Submit to Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSIGN DEPARTMENT & OFFICER ─── */}
      {assignModalOpen && selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Assign Municipal Task
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedChallenge.public_id} - {selectedChallenge.title}
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Responsible Department
                </label>
                <select
                  value={assignDept}
                  onChange={(e) => setAssignDept(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="Municipal Engineering">Municipal Engineering</option>
                  <option value="Public Health & Sanitation">Public Health & Sanitation</option>
                  <option value="Water Resources & Sewerage">Water Resources & Sewerage</option>
                  <option value="Transport & Traffic Engineering">Transport & Traffic</option>
                  <option value="Electrical & Street Lighting">Electrical & Street Lighting</option>
                  <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  SLA Target Deadline
                </label>
                <input
                  type="date"
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Execution Priority
                </label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="CRITICAL">🔴 Critical (24-48 hrs)</option>
                  <option value="HIGH">🟠 High (3-5 days)</option>
                  <option value="MEDIUM">🟡 Medium (7-10 days)</option>
                  <option value="LOW">🟢 Low (14+ days)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Directive / Instructions to Officer
                </label>
                <textarea
                  rows={2}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Dispatch repair crew, seal hazardous exposure immediately..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAssignDepartment()}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CHALLENGE DETAILS & WORKFLOW DRAWER ─── */}
      {selectedChallenge && !assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {selectedChallenge.public_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {selectedChallenge.domain}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedChallenge.verification === "officially_verified"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedChallenge.verification.replaceAll("_", " ")}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mt-1">
                  {selectedChallenge.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Problem Info Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block font-semibold">Location / Ward:</span>
                <span className="font-bold text-slate-800">
                  {selectedChallenge.locality || selectedChallenge.district}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Coordinates:</span>
                <span className="font-mono text-slate-800">
                  {selectedChallenge.public_latitude && selectedChallenge.public_longitude
                    ? `${selectedChallenge.public_latitude}, ${selectedChallenge.public_longitude}`
                    : "Not captured"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Severity & Urgency:</span>
                <span className="font-bold text-slate-800">
                  Severity: {selectedChallenge.severity}/4 • Urgency: {selectedChallenge.urgency}/4
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">People Affected:</span>
                <span className="font-bold text-slate-800">
                  {selectedChallenge.affected_population?.toLocaleString() || "Not specified"}
                </span>
              </div>
            </div>

            {/* Summary & Technical Scope */}
            <div className="space-y-2 text-xs">
              <div>
                <h4 className="font-bold text-slate-800">Problem Summary:</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedChallenge.summary}</p>
              </div>

              {selectedChallenge.technical_scope && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="font-bold text-blue-900">Government Technical Scope:</h4>
                  <p className="text-blue-800 mt-1">{selectedChallenge.technical_scope}</p>
                </div>
              )}
            </div>

            {/* AI Assessment Strip */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-700 block">AI Triage Recommendation</span>
                <span className="text-slate-500">
                  Confidence: {selectedChallenge.priority_score > 40 ? "92%" : "38% (Low)"} • Priority: {selectedChallenge.priority_level || "MEDIUM"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-blue-600">
                Score: {selectedChallenge.priority_score}/100
              </span>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedChallenge.verification === "unverified" && (
                  <button
                    onClick={() => void handleVerify(selectedChallenge)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                  >
                    Verify Challenge
                  </button>
                )}
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  Assign Department
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedChallenge.stage !== "completed" && (
                  <button
                    onClick={() => void handleMarkResolved(selectedChallenge)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
