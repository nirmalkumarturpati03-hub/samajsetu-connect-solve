import React, { useState } from "react";
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
  Settings,
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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface IndustryDashboardProps {
  user: User | null;
  profile: any;
  partnerIdentity: any;
  go: (screen: any) => void;
  logout: () => void;
}

interface ChallengeRecommendation {
  id: string;
  title: string;
  location: string;
  domain: string;
  matchScore: number;
  peopleAffected: string;
  requiredCapabilities: string[];
  supportNeeded: string;
  currentStage: string;
  university: string;
  summary: string;
}

const RECOMMENDED_CHALLENGES: ChallengeRecommendation[] = [
  {
    id: "CH-8492",
    title: "Smart Waste Collection System",
    location: "Vijayawada",
    domain: "Waste Management",
    matchScore: 94,
    peopleAffected: "8,000+",
    requiredCapabilities: ["IoT", "AI/ML", "GIS"],
    supportNeeded: "Technology + Pilot Implementation",
    currentStage: "University Prototype",
    university: "ABC University & Municipal Corp",
    summary: "Sensor-enabled dynamic route optimization for municipal waste collection vehicles to reduce turnaround time and landfill emissions.",
  },
  {
    id: "CH-7319",
    title: "Smart Water Management & Leak Detection",
    location: "Ranchi",
    domain: "Water Supply",
    matchScore: 89,
    peopleAffected: "14,500+",
    requiredCapabilities: ["IoT", "Cloud/IT", "Hardware"],
    supportNeeded: "Co-development + Technical Resources",
    currentStage: "Testing & Validation",
    university: "BIT Mesra & Municipal Water Board",
    summary: "Acoustic and pressure monitoring grid along trunk pipelines to identify and geolocate subterranean water supply leakage in real time.",
  },
  {
    id: "CH-6582",
    title: "Rural Healthcare Diagnostic Monitoring",
    location: "East Singhbhum",
    domain: "Public Health",
    matchScore: 86,
    peopleAffected: "22,000+",
    requiredCapabilities: ["Healthcare Tech", "Data Analytics", "AI/ML"],
    supportNeeded: "Prototyping + Mentoring",
    currentStage: "University Research",
    university: "NIT Jamshedpur & PHC Network",
    summary: "Battery-powered point-of-care vital diagnostic kiosk transmitting field health indicators to district tele-consultation doctors.",
  },
];

interface CollaborationProject {
  id: string;
  title: string;
  university: string;
  governmentPartner: string;
  industryRole: string;
  stage: string;
  progressPercent: number;
  nextMilestone: string;
  nextMilestoneDate: string;
}

const ACTIVE_COLLABORATIONS: CollaborationProject[] = [
  {
    id: "COL-101",
    title: "Smart Waste Collection",
    university: "ABC University",
    governmentPartner: "Municipal Corporation",
    industryRole: "Technology & Pilot Partner",
    stage: "Pilot Testing",
    progressPercent: 72,
    nextMilestone: "Field Testing in Ward 14",
    nextMilestoneDate: "Oct 24, 2026",
  },
  {
    id: "COL-102",
    title: "Solar Water Purification Kiosks",
    university: "NIT Jamshedpur",
    governmentPartner: "Dept of Drinking Water & Sanitation",
    industryRole: "CSR & Hardware Prototyping Partner",
    stage: "Prototyping & Lab Validation",
    progressPercent: 54,
    nextMilestone: "Membrane Flow Quality Calibration",
    nextMilestoneDate: "Nov 02, 2026",
  },
  {
    id: "COL-103",
    title: "AI Pothole & Road Quality Survey Grid",
    university: "BIT Mesra",
    governmentPartner: "Public Works Department (PWD)",
    industryRole: "AI/ML Co-development & Cloud Compute",
    stage: "Implementation & Scaling",
    progressPercent: 88,
    nextMilestone: "Municipal GIS Live API Integration",
    nextMilestoneDate: "Oct 30, 2026",
  },
];

interface MentoringRequest {
  id: string;
  teamName: string;
  projectTitle: string;
  expertiseRequested: string;
  institution: string;
  status: "Pending" | "Scheduled" | "Completed";
  timeSlot?: string;
  studentsCount: number;
}

const MENTORING_REQUESTS: MentoringRequest[] = [
  {
    id: "MEN-01",
    teamName: "Team EcoTech",
    projectTitle: "Smart Waste Collection",
    expertiseRequested: "IoT + Deployment",
    institution: "ABC University",
    status: "Pending",
    studentsCount: 4,
  },
  {
    id: "MEN-02",
    teamName: "Team HydroSense",
    projectTitle: "Groundwater Sensor Grid",
    expertiseRequested: "Cloud / IT Infrastructure",
    institution: "NIT Jamshedpur",
    status: "Scheduled",
    timeSlot: "Oct 18, 4:00 PM IST",
    studentsCount: 3,
  },
  {
    id: "MEN-03",
    teamName: "Team MedPulse",
    projectTitle: "Low-cost Telemedicine Kit",
    expertiseRequested: "Testing & Validation",
    institution: "Regional Engineering College",
    status: "Completed",
    timeSlot: "Completed (4 sessions)",
    studentsCount: 5,
  },
];

const NOTIFICATIONS = [
  { id: 1, text: "New challenge matches your AI/IoT capabilities", time: "10 min ago", unread: true },
  { id: 2, text: "University team requested mentoring", time: "2 hrs ago", unread: true },
  { id: 3, text: "Prototype ready for review", time: "5 hrs ago", unread: false },
  { id: 4, text: "Pilot approval requested by Municipal Corp", time: "Yesterday", unread: false },
  { id: 5, text: "Project milestone completed: Field Telemetry", time: "2 days ago", unread: false },
  { id: 6, text: "New collaboration invitation from NIT Jamshedpur", time: "3 days ago", unread: false },
];

const LIFECYCLE_STAGES = [
  { id: "challenge", name: "Challenge", count: 24, activeHere: false },
  { id: "collaboration", name: "Collaboration", count: 8, activeHere: false },
  { id: "prototype", name: "Prototype", count: 4, activeHere: true, project: "Solar Purification" },
  { id: "testing", name: "Testing", count: 3, activeHere: true, project: "Rural Diagnostics" },
  { id: "pilot", name: "Pilot", count: 3, activeHere: true, project: "Smart Waste Collection" },
  { id: "implementation", name: "Implementation", count: 2, activeHere: true, project: "AI Road Survey" },
  { id: "impact", name: "Impact", count: 12, activeHere: false },
];

export function IndustryDashboard({
  user,
  profile,
  partnerIdentity,
  go,
  logout,
}: IndustryDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeRecommendation | null>(null);
  const [interestSubmitted, setInterestSubmitted] = useState<string | null>(null);
  const [acceptedMentorships, setAcceptedMentorships] = useState<string[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<CollaborationProject | null>(null);

  // Derive organization name
  const orgName =
    partnerIdentity?.name ||
    user?.user_metadata?.["display_name"] ||
    user?.user_metadata?.["organization_name"] ||
    "TechNova Solutions";

  const handleAcceptMentoring = (id: string) => {
    setAcceptedMentorships((prev) => [...prev, id]);
  };

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
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Industry Portal</span>
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
                <Compass size={18} className="text-slate-400" />
                <span>Discover Challenges</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">24</span>
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
                <Handshake size={18} className="text-slate-400" />
                <span>My Collaborations</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">8</span>
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
                <Users size={18} className="text-slate-400" />
                <span>Mentoring</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">5</span>
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "projects"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FolderGit2 size={18} className="text-slate-400" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => setActiveTab("pilots")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "pilots"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Rocket size={18} className="text-slate-400" />
              <span>Pilot & Implementation</span>
            </button>

            <button
              onClick={() => setActiveTab("transfer")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "transfer"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Share2 size={18} className="text-slate-400" />
              <span>Technology Transfer</span>
            </button>

            <button
              onClick={() => setActiveTab("impact")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "impact"
                  ? "bg-blue-50 text-blue-800 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <TrendingUp size={18} className="text-slate-400" />
              <span>Impact</span>
            </button>

            <div className="pt-2 pb-1 px-3">
              <div className="h-px bg-slate-200" />
            </div>

            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "messages"
                  ? "bg-blue-50 text-blue-800 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-slate-400" />
                <span>Messages</span>
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">3</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "notifications"
                  ? "bg-blue-50 text-blue-800 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-slate-400" />
                <span>Notifications</span>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">6</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: Profile & Settings */}
        <div className="p-3 border-t border-slate-200 space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Building2 size={18} className="text-slate-400" />
            <span>Organization Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings size={18} className="text-slate-400" />
            <span>Settings</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-900 tracking-tight">Industry Dashboard</span>
            <span className="hidden sm:inline-block rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              Verified Innovation Partner
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challenges, student teams, projects..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-600 ring-2 ring-white" />
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Notifications</h4>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">6 new</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                        <div className={`size-2 mt-1.5 rounded-full shrink-0 ${n.unread ? "bg-blue-600" : "bg-transparent"}`} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{n.text}</p>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Organization Avatar & Name */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                {orgName.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-4">{orgName}</span>
                <span className="text-[10px] text-slate-500 font-medium">Industry Partner</span>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* ================= DASHBOARD MAIN BODY ================= */}
        <main className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">

          {/* WELCOME SECTION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200/60">
                <Sparkles size={12} className="text-blue-600" />
                Innovation & Strategic Partnerships
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Good morning, {orgName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                Discover meaningful opportunities to apply your expertise and create measurable societal impact.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("recommended-challenges-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-colors"
              >
                + Explore Challenges
              </button>
            </div>
          </div>

          {/* SECTION 1 — IMPACT & ACTIVITY OVERVIEW */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Impact & Activity Overview
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Real-time sync</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Card 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Matching</span>
                  <Compass size={18} className="text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">24</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">Challenges Matching Expertise</div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                  +4 this month
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Collaborations</span>
                  <Handshake size={18} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">8</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">Active Collaborations</div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                  +2 new teams
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Mentoring</span>
                  <Users size={18} className="text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">5</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">Mentoring Requests</div>
                <div className="mt-2 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                  3 awaiting response
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Projects</span>
                  <FolderGit2 size={18} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">12</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">Projects Supported</div>
                <div className="mt-2 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                  Across 4 states
                </div>
              </div>

              {/* Card 5 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Pilots</span>
                  <Rocket size={18} className="text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">3</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">Pilots in Progress</div>
                <div className="mt-2 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                  Field testing phase
                </div>
              </div>

              {/* Card 6 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold text-slate-600">Impact</span>
                  <Award size={18} className="text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">18,450+</div>
                <div className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">People Benefited</div>
                <div className="mt-2 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                  Direct community
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 — RECOMMENDED CHALLENGES */}
          <div id="recommended-challenges-section" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Challenges Matching Your Expertise
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI-powered recommendations based on your organization’s capabilities, sector and partnership interests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => go("explore")}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                View All Challenges →
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {RECOMMENDED_CHALLENGES.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <MapPin size={13} className="text-slate-400" />
                        {ch.location} · {ch.domain}
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        {ch.matchScore}% Match
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {ch.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ch.summary}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">People affected:</span>
                        <span className="font-semibold text-slate-800">{ch.peopleAffected}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Current stage:</span>
                        <span className="font-semibold text-blue-700">{ch.currentStage}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Support needed:</span>
                        <span className="font-semibold text-slate-800 text-right">{ch.supportNeeded}</span>
                      </div>
                    </div>

                    {/* Capabilities Tags */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {ch.requiredCapabilities.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedChallenge(ch)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      View Challenge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInterestSubmitted(ch.id);
                        setTimeout(() => setInterestSubmitted(null), 3000);
                      }}
                      className="flex-1 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
                    >
                      {interestSubmitted === ch.id ? "Interest Sent ✓" : "Express Interest"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 — ACTIVE COLLABORATIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Collaborations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live joint problem-solving workspaces with universities, civic bodies, and community partners.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{ACTIVE_COLLABORATIONS.length} Active Workspaces</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {ACTIVE_COLLABORATIONS.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {project.stage}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{project.progressPercent}% Complete</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{project.title}</h3>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <p>
                        <span className="text-slate-400">University:</span>{" "}
                        <strong className="text-slate-800 font-semibold">{project.university}</strong>
                      </p>
                      <p>
                        <span className="text-slate-400">Government Partner:</span>{" "}
                        <strong className="text-slate-800 font-semibold">{project.governmentPartner}</strong>
                      </p>
                      <p>
                        <span className="text-slate-400">Industry Role:</span>{" "}
                        <span className="text-emerald-800 font-medium">{project.industryRole}</span>
                      </p>
                      <p className="text-slate-500 pt-1">
                        Next milestone: <strong>{project.nextMilestone}</strong> ({project.nextMilestoneDate})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCollab(project)}
                    className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Open Collaboration Workspace <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4 — MENTORING REQUESTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mentoring Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct requests from university teams seeking industry review, technical validation, and domain coaching.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Student / Project Team</th>
                      <th className="px-5 py-3.5">Institution</th>
                      <th className="px-5 py-3.5">Expertise Requested</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MENTORING_REQUESTS.map((req) => {
                      const isAccepted = acceptedMentorships.includes(req.id);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900 text-sm">{req.teamName}</p>
                            <p className="text-slate-500 text-[11px]">{req.projectTitle} · {req.studentsCount} student members</p>
                          </td>
                          <td className="px-5 py-4 text-slate-700 font-medium">
                            {req.institution}
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                              {req.expertiseRequested}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {isAccepted || req.status === "Scheduled" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                                <Clock size={12} className="text-blue-600" />
                                {req.timeSlot || "Scheduled"}
                              </span>
                            ) : req.status === "Pending" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            {req.status === "Pending" && !isAccepted ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptMentoring(req.id)}
                                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alert(`Details for ${req.teamName}: Focus on ${req.projectTitle} with ${req.institution}.`)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  View Details
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => alert(`Session active with ${req.teamName}. Next meeting scheduled.`)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                {req.status === "Completed" ? "View Summary" : "Session Workspace"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 5 — PARTNERSHIP OPPORTUNITIES */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Partnership Opportunities</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore tailored collaboration avenues to mobilize technology, capital, and engineering teams.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-3">
                    <Users size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Mentoring</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Guide university and student teams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("mentoring")}
                  className="mt-3 text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
                    <Handshake size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Co-development</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Build solutions jointly with project teams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("collaborations")}
                  className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 mb-3">
                    <DollarSign size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Funding / CSR Support</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Support high-impact societal projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => go("explore")}
                  className="mt-3 text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-3">
                    <Wrench size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">Prototyping</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Provide technology, equipment or technical resources.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("projects")}
                  className="mt-3 text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-rose-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 mb-3">
                    <Rocket size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-rose-700">Pilot Implementation</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Help test and deploy solutions in real environments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("pilots")}
                  className="mt-3 text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-purple-400 hover:shadow-sm transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-3">
                    <Share2 size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">Technology Transfer</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Support adoption, deployment or commercialization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("transfer")}
                  className="mt-3 text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                >
                  Explore →
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 6 — PROJECT PIPELINE (Horizontal Lifecycle) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Lifecycle Pipeline</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  End-to-end innovation journey from challenge discovery to certified societal impact.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                12 Active Across Pipeline
              </span>
            </div>

            {/* Horizontal Steps Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {LIFECYCLE_STAGES.map((st, i) => (
                <div
                  key={st.id}
                  className={`rounded-xl p-3 border transition-all text-left ${
                    st.activeHere
                      ? "border-blue-500 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">0{i + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      st.activeHere ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                      {st.count}
                    </span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-900">{st.name}</h4>
                  {st.project && (
                    <p className="mt-1 text-[10px] font-medium text-blue-800 line-clamp-1">
                      ● {st.project}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 7 & SECTION 8 (Side-by-Side on large screens) */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* SECTION 7 — IMPACT SNAPSHOT (2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Societal Impact</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified metrics measured through field deployments and partner validations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("impact")}
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    View Impact Profile →
                  </button>
                </div>

                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">Projects Supported</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">Successful Pilots</span>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">3</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">People Benefited</span>
                    <p className="text-2xl font-bold text-blue-700 mt-1">18,450+</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">Impact Score</span>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">87<span className="text-sm font-normal text-slate-400">/100</span></p>
                  </div>
                </div>

                {/* Impact Created Over Time Chart */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-slate-800">Impact Created Over Time (Beneficiaries)</span>
                    <span className="text-slate-400 text-[11px]">May 2026 – Oct 2026</span>
                  </div>

                  {/* SVG Line / Bar Chart Representation */}
                  <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 px-2 bg-slate-50/70 rounded-xl border border-slate-100">
                    {[
                      { month: "May", value: 2400, height: "22%" },
                      { month: "Jun", value: 4800, height: "38%" },
                      { month: "Jul", value: 7200, height: "50%" },
                      { month: "Aug", value: 11500, height: "68%" },
                      { month: "Sep", value: 15200, height: "82%" },
                      { month: "Oct", value: 18450, height: "95%" },
                    ].map((bar) => (
                      <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {bar.value.toLocaleString()}
                        </span>
                        <div
                          className="w-full max-w-[42px] bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-lg transition-all group-hover:from-blue-800 group-hover:to-blue-600 shadow-xs"
                          style={{ height: bar.height }}
                        />
                        <span className="text-[10px] font-semibold text-slate-500">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                <span>Verified by SamajSetu Civic Impact Protocol & Local Civic Authorities</span>
                <span className="font-semibold text-slate-800">Certified Partner</span>
              </div>
            </div>

            {/* SECTION 8 — RECENT NOTIFICATIONS (1 Col) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Recent Notifications</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Live</span>
                </div>

                <div className="divide-y divide-slate-100 mt-2">
                  {NOTIFICATIONS.map((item) => (
                    <div key={item.id} className="py-3 flex items-start gap-3 text-xs">
                      <div
                        className={`size-2 mt-1.5 rounded-full shrink-0 ${
                          item.unread ? "bg-blue-600 ring-4 ring-blue-100" : "bg-slate-300"
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`leading-snug ${item.unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {item.text}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                View All Activity
              </button>
            </div>

          </div>

        </main>
      </div>

      {/* Detail Modal for Selected Challenge */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {selectedChallenge.matchScore}% Match for {orgName}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedChallenge.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedChallenge.location} · {selectedChallenge.domain}</p>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {selectedChallenge.summary}
            </p>

            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2 border border-slate-200/80">
              <div className="flex justify-between">
                <span className="text-slate-400">People affected:</span>
                <span className="font-bold text-slate-800">{selectedChallenge.peopleAffected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Institutional Partner:</span>
                <span className="font-bold text-slate-800">{selectedChallenge.university}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Support Needed:</span>
                <span className="font-bold text-blue-700">{selectedChallenge.supportNeeded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stage:</span>
                <span className="font-bold text-slate-800">{selectedChallenge.currentStage}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setInterestSubmitted(selectedChallenge.id);
                  setSelectedChallenge(null);
                  setTimeout(() => setInterestSubmitted(null), 3000);
                }}
                className="flex-1 rounded-xl bg-blue-700 py-3 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
              >
                Confirm Expression of Interest
              </button>
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Workspace Modal */}
      {selectedCollab && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {selectedCollab.stage}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedCollab.title}</h3>
                <p className="text-xs text-slate-500">Workspace ID: {selectedCollab.id}</p>
              </div>
              <button
                onClick={() => setSelectedCollab(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2.5 border border-slate-200/80">
              <div className="flex justify-between">
                <span className="text-slate-500">University Lead:</span>
                <span className="font-semibold text-slate-800">{selectedCollab.university}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Civic Partner:</span>
                <span className="font-semibold text-slate-800">{selectedCollab.governmentPartner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Your Role:</span>
                <span className="font-semibold text-emerald-800">{selectedCollab.industryRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Milestone:</span>
                <span className="font-semibold text-blue-800">{selectedCollab.nextMilestone} ({selectedCollab.nextMilestoneDate})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Progress</span>
                <span>{selectedCollab.progressPercent}% Complete</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${selectedCollab.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedCollab(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Navigating to joint files & task repo for ${selectedCollab.title}`);
                  setSelectedCollab(null);
                }}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
              >
                Launch Team Slack / Repo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
