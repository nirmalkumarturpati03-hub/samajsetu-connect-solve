import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Building2,
  ArrowRight,
  BadgeCheck,
  Bell,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  Image as ImageIcon,
  LocateFixed,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  Mic,
  Navigation,
  Paperclip,
  Plus,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { MediaUpload } from "@/components/MediaUpload";
import { LanguageSelector, voiceLocale } from "@/components/LanguageSelector";
import { CursorParticleField } from "@/components/CursorParticleField";
import { ProblemMap } from "@/components/ProblemMap";
import { distanceKm } from "@/lib/samaj";
import { createElevenLabsScribeToken } from "@/lib/elevenlabs.functions";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({ component: SamajSetu });
type Screen =
  | "home"
  | "auth"
  | "report"
  | "explore"
  | "my-reports"
  | "notifications"
  | "projects"
  | "admin-login"
  | "admin"
  | "organization"
  | "coordinator"
  | "volunteer";
type Profile = { id: string; display_name: string | null; role: string; district: string | null };
type PartnerIdentity = { id: string; name: string; organization_type: string };
type Challenge = {
  id: string;
  public_id: string;
  title: string;
  summary: string;
  domain: string;
  district: string;
  priority_score: number;
  priority_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MINOR";
  verification: string;
  stage: string;
  affected_population: number | null;
  reports: number;
  reposts: number;
  created_at: string;
  preview_image_path: string | null;
  media: { path: string; type: string }[] | null;
  comments: { id: string; note: string; created_at: string }[] | null;
  public_latitude?: number | null;
  public_longitude?: number | null;
  assignment_status?: string | null;
  participant_count?: number;
};
type PriorityAnalysis = {
  challenge_id: string;
  validated_factors: Record<string, number | boolean | string>;
  confidence: number | null;
  analysis_status: string;
  override_applied: boolean;
  override_reason: string | null;
  ai_analysis: { reasons?: string[] } | null;
};
type Report = {
  id: string;
  description: string;
  district: string;
  block: string | null;
  locality: string | null;
  created_at: string;
  challenge_id: string | null;
  challenges: { public_id: string; title: string; verification: string; stage: string } | null;
};

const malformedText = /[\u00c2\u00c3\u00e2\u0192\u20ac\u201a\u201c\u201d\u2020\u2021]/;
const cp1252Bytes = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

/** Repairs legacy Windows-1252/UTF-8 mojibake received from older records. */
function cleanLegacyText(value: string | null | undefined) {
  let current = value ?? "";
  for (let pass = 0; pass < 4 && malformedText.test(current); pass += 1) {
    const bytes: number[] = [];
    let canDecode = true;
    for (const character of current) {
      const code = character.codePointAt(0)!;
      const byte = code <= 0xff ? code : cp1252Bytes.get(code);
      if (byte === undefined) { canDecode = false; break; }
      bytes.push(byte);
    }
    if (!canDecode) break;
    try {
      const repaired = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
      if (repaired === current) break;
      current = repaired;
    } catch { break; }
  }
  return current;
}

function SamajSetu() {
  const [screen, setScreen] = useState<Screen>("home"),
    [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [partnerIdentity, setPartnerIdentity] = useState<PartnerIdentity | null>(null),
    [challenges, setChallenges] = useState<Challenge[]>([]),
    [supportedIds, setSupportedIds] = useState<string[]>([]),
    [language, setLanguage] = useState("en"),
    [notice, setNotice] = useState(""),
    [showSplash, setShowSplash] = useState(true),
    [passwordRecovery, setPasswordRecovery] = useState(false);
  useEffect(() => {
    const saved = window.history.state?.samajsetuScreen as Screen | undefined;
    if (!saved) window.history.replaceState({ ...(window.history.state ?? {}), samajsetuScreen: "home" }, "", window.location.href);
    else setScreen(saved);
    const onBack = (event: PopStateEvent) => setScreen((event.state?.samajsetuScreen as Screen | undefined) ?? "home");
    window.addEventListener("popstate", onBack);
    const timer = window.setTimeout(() => setShowSplash(false), 2200);
    return () => { window.removeEventListener("popstate", onBack); window.clearTimeout(timer); };
  }, []);
  const loadChallenges = async (q = "") => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("search_challenges", { search_text: q });
    if (error) flash(error.message);
    else setChallenges((data ?? []) as Challenge[]);
  };
  const loadProfile = async (u: User | null) => {
    // Anonymous sessions secure report/evidence writes but are never presented
    // as a signed-in citizen account in the UI.
    setUser(u?.is_anonymous ? null : u);
    if (u?.is_anonymous) { setProfile(null); setPartnerIdentity(null); return; }
    if (!u || !supabase) {
      setProfile(null);
      setPartnerIdentity(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,role,district")
      .eq("id", u.id)
      .single();
    setProfile(data);
    // Accounts confirmed by email do not have a session during registration, so
    // provision their private partner record on first successful sign-in.
    if (u.user_metadata?.["account_type"] === "organization") {
      const meta = u.user_metadata;
      const latitude = Number(meta["latitude"]);
      const longitude = Number(meta["longitude"]);
      await supabase.from("organization_accounts").upsert(
        {
          owner_id: u.id,
          name: String(meta["display_name"] || u.email?.split("@")[0] || "Organization"),
          organization_type: String(meta["organization_type"] || "Organization"),
          contact_email: u.email ?? null,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
          expertise: String(meta["expertise"] || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          capabilities: String(meta["resources"] || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        { onConflict: "owner_id" },
      );
      const { data: entity } = await supabase
        .from("organization_accounts")
        .select("id,name,organization_type")
        .eq("owner_id", u.id)
        .maybeSingle();
      setPartnerIdentity(entity ?? null);
    } else {
      setPartnerIdentity(null);
    }
  };
  const flash = (x: string) => {
    setNotice(x);
    setTimeout(() => setNotice(""), 3500);
  };
  useEffect(() => {
    if (!supabase) return;
    void supabase!.auth.getUser().then(({ data }) => loadProfile(data.user));
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") { setPasswordRecovery(true); go("auth"); }
      void loadProfile(s?.user ?? null);
    });
    const channel = supabase!
      .channel("challenge-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenges" },
        () => void loadChallenges(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_supports" },
        () => void loadChallenges(),
      )
      .subscribe();
    void loadChallenges();
    return () => {
      subscription.unsubscribe();
      void supabase!.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!supabase || !user) {
      setSupportedIds([]);
      return;
    }
    void supabase
      .from("challenge_supports")
      .select("challenge_id")
      .eq("supporter_id", user.id)
      .then(({ data }) => setSupportedIds((data ?? []).map((x) => x.challenge_id)));
  }, [user]);
  useEffect(() => {
    const repairTextNodes = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = root.nodeType === Node.TEXT_NODE ? [root as Text] : [];
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      nodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return;
        const repaired = cleanLegacyText(textNode.data);
        if (repaired !== textNode.data) textNode.data = repaired;
      });
    };
    repairTextNodes(document.body);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => repairTextNodes(node));
        if (record.type === "characterData") repairTextNodes(record.target.parentNode ?? document.body);
      });
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  if (!isSupabaseConfigured) return <Setup />;
  const go = (v: Screen) => {
    if (v !== screen) window.history.pushState({ ...(window.history.state ?? {}), samajsetuScreen: v }, "", window.location.href);
    setScreen(v);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const repost = async (challenge: Challenge, note = "") => {
    let supporter = user;
    if (!supporter) {
      // Anonymous citizens deliberately have no visible account in the UI. Reuse
      // their secure anonymous session before creating one, so repeated reposts
      // remain attributable to one device without ever opening partner sign-in.
      const current = await supabase!.auth.getUser();
      supporter = current.data.user;
      if (!supporter) {
        const anonymous = await supabase!.auth.signInAnonymously();
        supporter = anonymous.data.user;
        if (anonymous.error || !supporter) { flash(anonymous.error?.message ?? "Unable to add your repost."); return; }
      }
    }
    const { error } = await supabase!.from("challenge_supports").insert({
      challenge_id: challenge.id,
      supporter_id: supporter.id,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    if (error) {
      flash(error.code === "23505" ? "You have already reposted this problem." : error.message);
      return;
    }
    setSupportedIds((ids) => [...ids, challenge.id]);
    void loadChallenges();
    flash(`Your repost added support to ${challenge.public_id}.`);
    // A repost completes the citizen flow; do not route a citizen to any login.
    go("explore");
  };
  const isAdmin = profile?.role.trim().toLowerCase() === "admin";
  return (
    <main className="samaj-app min-h-screen bg-background">
      {showSplash && <LaunchScreen />}
      <Header
        user={user}
        profile={profile}
        partnerIdentity={partnerIdentity}
        go={go}
        setLanguage={setLanguage}
        logout={async () => {
          await supabase!.auth.signOut();
          go("home");
        }}
      />
      {screen === "home" && <Home go={go} count={challenges.length} user={user} profile={profile} flash={flash} />}{" "}
      {screen === "auth" && (
        <Auth recovery={passwordRecovery}
          complete={(accountType) => {
            flash("Welcome to SamajSetu.");
            go(
              accountType === "admin"
                ? "admin"
                : accountType === "organization"
                ? "coordinator"
                : accountType === "volunteer"
                  ? "volunteer"
                  : "my-reports",
            );
          }}
        />
      )}{" "}
      {screen === "report" && (
        <Report
          user={user}
          go={go}
          challenges={challenges}
          supportedIds={supportedIds}
          repost={repost}
          speechLanguage={voiceLocale(language)}
          complete={() => {
            flash("Report submitted for verification.");
            void loadChallenges();
            // Citizen reports do not require an account, so return to the public view.
            go("home");
          }}
        />
      )}{" "}
      {screen === "explore" && (
        <Explorer
          challenges={challenges}
          load={loadChallenges}
          supportedIds={supportedIds}
          repost={repost}
          go={go}
        />
      )}{" "}
      {screen === "my-reports" && <MyReports user={user} go={go} />}{" "}
      {screen === "notifications" && <Notifications user={user} go={go} />}{" "}
      {screen === "projects" && <ProjectWorkspace user={user} profile={profile} flash={flash} />}{" "}
      {screen === "organization" && <OrganizationRegistration user={user} go={go} flash={flash} />}{" "}
      {screen === "coordinator" && <PartnerDashboard user={user} partnerIdentity={partnerIdentity} flash={flash} />}{" "}
      {screen === "volunteer" && <VolunteerDashboard user={user} />}{" "}
      {screen === "admin-login" && <AdminLogin complete={() => go("admin")} />}
      {screen === "admin" &&
        (user && !profile ? (
          <section className="container-page py-20 text-center text-sm text-muted-foreground">Loading administrator access...</section>
        ) : isAdmin ? (
          <AdminControlCenter user={user} profile={profile} flash={flash} refresh={loadChallenges} />
        ) : (
          <AdminRedirect go={go} />
        ))}
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift">
          <Check className="mr-2 inline text-white/80" size={16} />
          {notice}
        </div>
      )}
    </main>
  );
}
function Header({
  user,
  profile,
  partnerIdentity,
  go,
  setLanguage,
  logout,
}: {
  user: User | null;
  profile: Profile | null;
  partnerIdentity: PartnerIdentity | null;
  go: (x: Screen) => void;
  setLanguage: (language: string) => void;
  logout: () => void;
}) {
  const identityName = profile?.role === "admin"
    ? profile.display_name || user?.email
    : partnerIdentity?.name || profile?.display_name || user?.email;
  const identityRole = profile?.role === "admin"
    ? "Admin"
    : partnerIdentity?.organization_type || user?.user_metadata?.["organization_type"] || user?.user_metadata?.["account_type"] || "Member";
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (screen: Screen) => { setMenuOpen(false); go(screen); };
  const accountType = String(user?.user_metadata?.["account_type"] ?? "").trim().toLowerCase();
  const dashboardScreen: Screen = profile?.role.trim().toLowerCase() === "admin"
    ? "admin"
    : accountType === "volunteer"
      ? "volunteer"
      : ["organization", "ngo"].includes(accountType)
        ? "coordinator"
        : "my-reports";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between sm:h-17">
        <button onClick={() => navigate("home")} className="flex min-w-0 items-center">
          <img src="/samajsetu-community-logo.svg" alt="SamajSetu" className="h-9 w-auto sm:h-10" />
        </button>
        <nav className="hidden items-center gap-3 text-sm font-bold sm:flex">
          <LanguageSelector onLanguageChange={setLanguage} />
          {user ? <><button onClick={() => navigate(dashboardScreen)} title="Open dashboard" className="text-right text-xs leading-4"><b className="block text-foreground">{identityName}</b><span className="capitalize text-muted-foreground">{identityRole}</span></button><button onClick={logout} title="Sign out" className="rounded-lg border border-border p-2"><LogOut size={16} /></button></> : <><button onClick={() => go("explore")}>Challenges</button><button onClick={() => go("auth")} className="rounded-lg border border-border px-3 py-2">Sign in / register</button><button onClick={() => navigate("report")} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Report</button></>}
        </nav>
        <button onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} className="grid size-11 place-items-center rounded-lg border border-border sm:hidden">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && <nav className="container-page grid gap-1 border-t border-border py-3 text-sm font-bold sm:hidden">
        {user ? <><button onClick={() => navigate(dashboardScreen)} className="rounded-lg bg-surface px-3 py-3 text-left"><b className="block">{identityName}</b><span className="text-xs capitalize text-muted-foreground">{identityRole}</span></button><div className="px-2 py-2"><LanguageSelector onLanguageChange={setLanguage} /></div><button onClick={() => { setMenuOpen(false); logout(); }} className="rounded-lg px-3 py-3 text-left text-destructive hover:bg-destructive-soft">Sign out</button></> : <><button onClick={() => navigate("report")} className="rounded-lg bg-primary px-3 py-3 text-left text-primary-foreground">REPORT</button><button onClick={() => navigate("explore")} className="rounded-lg px-3 py-3 text-left hover:bg-surface">CHALLENGES</button><button onClick={() => navigate("auth")} className="rounded-lg px-3 py-3 text-left hover:bg-surface">SIGN IN / REGISTER</button></>}
      </nav>}
    </header>
  );
}
function LaunchScreen() {
  return <div className="launch-screen" role="status" aria-label="Loading SamajSetu"><div className="launch-mark"><img src="/samajsetu-community-logo.svg" alt="SamajSetu" className="launch-logo" /></div></div>;
}
function Setup() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface p-6">
      <div className="card-surface max-w-xl p-8">
        <BrainCircuit className="text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Supabase connection required</h1>
        <p className="mt-3 text-muted-foreground">
          Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values to .env.local, then
          restart the dev server.
        </p>
      </div>
    </main>
  );
}
function Home({ go, count, user, profile, flash }: { go: (x: Screen) => void; count: number; user: User | null; profile: Profile | null; flash: (message: string) => void }) {
  return (
    <>
      <section className="public-hero relative overflow-hidden">
        <CursorParticleField />
        <div className="hero-content container-page relative z-10 py-10 sm:py-14 lg:py-16">
          <div className="hero-copy">
            <p className="hero-kicker">COMMUNITY ACTION PLATFORM</p>
            <h1 className="mt-4 text-3xl font-bold leading-[.96] sm:mt-5 sm:text-5xl">
              From community problems to <span className="text-primary">measurable impact.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              The intelligence and collaboration layer connecting community needs with the people who
              can solve them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => go("report")}
                className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground"
              >
                Report a problem <ArrowRight className="inline" size={16} />
              </button>
              <button
                onClick={() => go("explore")}
                className="rounded-lg border border-border bg-card px-5 py-3 font-bold"
              >
                Explore challenges
              </button>
            </div>
          </div>
          <figure className="hero-scene" aria-label="A connected community moving from reports to impact">
            <p className="hero-scene-note">From reports<br />to impact</p>
            <img
              src="/WhatsApp%20Image%202026-09-11%20at%2000.52.34.jpeg"
              alt="Bridge crossing a forested river at sunrise"
              className="hero-scene-art"
            />
            <figcaption>People / Ideas / Collaboration / Impact</figcaption><aside className="hero-impact-quote"><Sparkles size={24} /><p><b>Stronger communities,<br />a brighter tomorrow.</b><br /><small>SamajSetu</small></p></aside>
          </figure>
        </div>
      </section>
      <section id="landing-metrics" className="public-metrics container-page grid grid-cols-1 border-x border-b border-border bg-card sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.35fr]">
        <HeroMetric icon={<Users size={23} />} value={count} label="Live challenges" />
        <HeroMetric icon={<Activity size={23} />} value="Realtime" label="Database updates" />
        <HeroMetric icon={<BadgeCheck size={23} />} value="Human-led" label="Verification" />
        <p className="hero-metrics-quote">&quot;Real change begins when people<br />come together.&quot;<br /><span>- SamajSetu</span></p>
      </section>
      <FundingTransparencyV2 user={user} profile={profile} flash={flash} embedded />
      <section id="featured-challenges" className="featured-challenges container-page py-14 sm:py-18">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="hero-kicker">COMMUNITY ACTION</p><h2 className="mt-3">Featured Challenges</h2><p className="mt-2 text-sm text-muted-foreground">Verified local problems where people and institutions are creating measurable change.</p></div>
          <button onClick={() => go("explore")} className="rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary">View All <ArrowRight className="inline" size={16} /></button>
        </div>
      </section>
    </>
  );
}
function HeroMetric({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return <div className="hero-metric"><span>{icon}</span><div><b>{value}</b><p>{label}</p></div><ArrowRight size={18} /></div>;
}
function AuthLegacy({ complete }: { complete: (accountType: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [accountType, setAccountType] = useState<"citizen" | "volunteer" | "organization">("citizen"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setInfo("");
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name, account_type: accountType } },
      });
      if (e) {
        if (/rate limit/i.test(e.message))
          setInfo(
            "Too many verification emails were requested. Please wait a few minutes, then try again or use a different email address.",
          );
        else setError(e.message);
      } else setInfo("Check your email to confirm your account, then sign in.");
    } else {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message);
      else complete(data.user?.user_metadata?.["account_type"] ?? "citizen");
    }
    setBusy(false);
  };
  return (
    <section className="container-page max-w-md py-14">
      <div className="card-surface p-7">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          SECURE ACCOUNT ACCESS
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "New accounts start as citizens. Protected roles are assigned by the platform administrator."
            : "Sign in to view your reports and role-based workspace."}
        </p>
        {mode === "signup" && (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="mt-5 w-full rounded-lg border border-input p-3"
            />
            <label className="mt-4 block text-sm font-bold">I want to join as</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as typeof accountType)}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3"
            >
              <option value="citizen">Citizen - report and track local problems</option>
              <option value="volunteer">Volunteer - help solve community challenges</option>
              <option value="organization">Organization - coordinate projects and teams</option>
            </select>
          </>
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email address"
          className="mt-3 w-full rounded-lg border border-input p-3"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password (min. 6 characters)"
          className="mt-3 w-full rounded-lg border border-input p-3"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {info && <p className="mt-3 text-sm text-accent">{info}</p>}
        <button
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          className="mt-4 w-full text-sm font-bold text-primary"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </section>
  );
}
function Auth({ complete, recovery = false }: { complete: (accountType: string) => void; recovery?: boolean }) {
  const [kind, setKind] = useState<"Organization" | "NGO" | null>(null);
  const [signIn, setSignIn] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [forgotPassword, setForgotPassword] = useState(false),
    [resetSent, setResetSent] = useState(false),
    [newPassword, setNewPassword] = useState(""),
    [resetComplete, setResetComplete] = useState(false);
  const login = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) { setBusy(false); setError(loginError?.message ?? "Unable to sign in."); }
    else {
      const { data: accountProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !accountProfile) {
        await supabase.auth.signOut();
        setBusy(false);
        setError("We could not determine this account's SamajSetu role. Please contact support.");
        return;
      }
      setBusy(false);
      const role = accountProfile.role.trim().toLowerCase();
      complete(role === "admin" ? "admin" : (data.user.user_metadata?.["account_type"] ?? "organization"));
    }
  };
  const requestReset = async () => {
    if (!supabase || !email.trim()) return setError("Enter your registered email address first.");
    setBusy(true); setError("");
    const { data: registeredAccount, error: limitError } = await supabase.rpc("request_password_reset", { requested_email: email.trim().toLowerCase() });
    if (limitError) { setBusy(false); setError(limitError.message); return; }
    const { error: resetError } = registeredAccount
      ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` })
      : { error: null };
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setResetSent(true);
  };
  const saveNewPassword = async () => {
    if (!supabase || newPassword.length < 6) return setError("Use a password with at least 6 characters.");
    setBusy(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) setError(updateError.message); else setResetComplete(true);
  };
  return (
    <section className="auth-page container-page max-w-6xl py-8 sm:py-14">
      <div className="auth-shell card-surface overflow-hidden p-0">
        <aside className="auth-intro">
          <img src="/samajsetu-community-logo.svg" alt="SamajSetu" className="h-14 w-auto max-w-full" />
          <p className="mt-7 text-xs font-bold tracking-[.14em] text-white/75">SAMAJSETU PARTNER NETWORK</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white">Work together for stronger communities.</h2>
          <p className="mt-4 text-sm leading-6 text-white/80">Bring your organization&apos;s expertise, volunteers, and resources to verified local problems.</p>
          <div className="auth-intro-points">
            <span>Verified community challenges</span>
            <span>Location-aware task matching</span>
            <span>Clear progress and impact tracking</span>
          </div>
        </aside>
        <div className="auth-panel p-6 sm:p-10">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          SECURE PARTNER ACCESS
        </span>
        <h1 className="mt-4 text-3xl font-bold">{recovery ? "Create a new password" : signIn ? "Welcome back" : "Create a partner account"}</h1>
        {recovery ? <div className="mt-6 grid max-w-md gap-3">{resetComplete ? <p className="rounded-lg bg-accent-soft p-4 text-sm font-semibold">Password reset successful. You can now sign in with your new password.</p> : <><div className="relative"><input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-input p-3 pr-12"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 grid size-10 place-items-center rounded-md text-muted-foreground">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><button disabled={busy} onClick={() => void saveNewPassword()} className="rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saving..." : "Save new password"}</button></>}</div> : <>
        <p className="mt-2 text-muted-foreground">
          Choose the type of team you represent. You can always sign in with the same secure account.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setKind("Organization")}
            className="auth-choice rounded-2xl border border-border p-5 text-left"
          >
            <span className="auth-choice-icon"><Users size={22} /></span>
            <h2 className="mt-4 text-xl font-bold">Organization</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Register a response team that contributes skilled people, expertise, and resources.
            </p>
            <span className="auth-choice-action mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Register organization <ArrowRight size={16} />
            </span>
          </button>
          <button
            onClick={() => setKind("NGO")}
            className="auth-choice rounded-2xl border border-border p-5 text-left"
          >
            <span className="auth-choice-icon"><ShieldCheck size={22} /></span>
            <h2 className="mt-4 text-xl font-bold">NGO</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Register a non-profit team to contribute expertise and community resources.
            </p>
            <span className="auth-choice-action mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Register NGO <ArrowRight size={16} /></span>
          </button>
        </div>
        <div className="auth-login-section mt-8 border-t border-border pt-6 text-center">
          <button
            onClick={() => {
              setSignIn(!signIn);
              setError("");
            }}
            className="auth-login-toggle text-sm font-bold text-primary"
          >
            Already registered? Sign in securely
          </button>
          {signIn && (
            <div className="auth-login-form mx-auto mt-5 grid max-w-md gap-4 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Official email ID"
                className="rounded-xl border border-input p-3"
              />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-input p-3 pr-12" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted-foreground">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <button type="button" onClick={() => { setForgotPassword(true); setResetSent(false); setError(""); }} className="justify-self-start text-sm font-bold text-primary">Forgot Password?</button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                disabled={busy || !email || !password}
                onClick={() => void login()}
                className="auth-submit rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Signing in..." : "Sign in"}
              </button>
              {forgotPassword && <div className="auth-reset rounded-xl border border-primary/20 bg-primary-soft p-4"><p className="font-bold">Reset your password</p>{resetSent ? <p className="mt-1 text-sm text-muted-foreground">If this registered email exists, a secure reset link has been sent.</p> : <><p className="mt-1 text-sm text-muted-foreground">We will send a secure, single-use reset link. Requests are limited to four per cooldown window.</p><button disabled={busy || !email} onClick={() => void requestReset()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Sending..." : "Send reset link"}</button></>}</div>}
            </div>
          )}
        </div></>}
        </div>
      </div>
      {kind && <PartnerRegistration kind={kind} close={() => setKind(null)} complete={complete} />}
    </section>
  );
}

function PartnerRegistration({
  kind,
  close,
  complete,
}: {
  kind: "Organization" | "NGO";
  close: () => void;
  complete: (type: string) => void;
}) {
  const noun = kind === "NGO" ? "NGO" : "Organization";
  const [name, setName] = useState(""),
    [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [email, setEmail] = useState(""),
    [expertise, setExpertise] = useState(""),
    [resources, setResources] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false);
  const getGps = () => {
    setError("");
    setInfo("Requesting location permission...");
    if (!navigator.geolocation) {
      setInfo("");
      setError("GPS is not supported on this device. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLatitude(p.coords.latitude.toFixed(6));
        setLongitude(p.coords.longitude.toFixed(6));
        setInfo("Current GPS location retrieved. You can edit these values if needed.");
      },
      (e) => {
        setInfo("");
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Location permission was denied. Enter latitude and longitude manually."
            : "Unable to retrieve GPS location. Please try again or enter coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const register = async () => {
    const lat = Number(latitude),
      lng = Number(longitude);
    if (
      ![name, latitude, longitude, email, expertise, resources, password, confirm].every((x) =>
        x.trim(),
      )
    )
      return setError("Complete all required fields before registering.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (password !== confirm) return setError("Password and Confirm Password must match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    )
      return setError("Enter valid coordinates: latitude -90 to 90 and longitude -180 to 180.");
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name.trim(),
          account_type: "organization",
          organization_type: kind,
          latitude: lat,
          longitude: lng,
          expertise,
          resources,
        },
      },
    });
    if (signupError) {
      setError(signupError.message);
      setBusy(false);
      return;
    }
    if (data.user && data.session) {
      const { error: orgError } = await supabase.from("organization_accounts").upsert(
        {
          owner_id: data.user.id,
          name: name.trim(),
          organization_type: kind,
          contact_email: email.trim(),
          latitude: lat,
          longitude: lng,
          expertise: expertise
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          capabilities: resources
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        },
        { onConflict: "owner_id" },
      );
      setBusy(false);
      if (orgError) return setError(orgError.message);
      close();
      complete("organization");
    } else {
      setBusy(false);
      setInfo("Registration created. Check your email to verify your account, then sign in.");
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-lift sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              SECURE REGISTRATION
            </span>
            <h2 className="mt-3 text-2xl font-bold">{noun} Registration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All fields are required. GPS coordinates may be entered manually.
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold"
          >
            Close
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-bold">
            {noun} Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input p-3"
            />
          </label>
          <div className="rounded-xl bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <b className="text-sm">{noun} GPS Location</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use the actual current location from this device.
                </p>
              </div>
              <button
                type="button"
                onClick={getGps}
                className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary"
              >
                <MapPin size={16} /> Get GPS Location
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Latitude
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 16.5062"
                  className="mt-2 w-full rounded-lg border border-input bg-card p-3"
                />
              </label>
              <label className="text-sm font-bold">
                Longitude
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 80.6480"
                  className="mt-2 w-full rounded-lg border border-input bg-card p-3"
                />
              </label>
            </div>
            {latitude && longitude && (
              <p className="mt-3 rounded-lg bg-card p-3 font-mono text-xs text-primary">
                Latitude: {latitude}
                <br />
                Longitude: {longitude}
              </p>
            )}
          </div>
          <label className="text-sm font-bold">
            {kind === "NGO" ? "Email ID" : "Official Email ID"}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-2 w-full rounded-lg border border-input p-3"
            />
          </label>
          <label className="text-sm font-bold">
            Area of Expertise
            <textarea
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="mt-2 min-h-22 w-full rounded-lg border border-input p-3"
            />
          </label>
          <label className="text-sm font-bold">
            Available Resources
            <textarea
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              className="mt-2 min-h-22 w-full rounded-lg border border-input p-3"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Create Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-lg border border-input p-3"
              />
            </label>
            <label className="text-sm font-bold">
              Confirm Password
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-lg border border-input p-3"
              />
            </label>
          </div>
          {error && (
            <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">{error}</p>
          )}
          {info && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{info}</p>}
          <button
            disabled={busy}
            onClick={() => void register()}
            className="rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Registering..." : `Register ${noun}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Report({
  user,
  go,
  complete,
  challenges,
  supportedIds,
  repost,
  speechLanguage,
}: {
  user: User | null;
  go: (x: Screen) => void;
  complete: () => void;
  challenges: Challenge[];
  supportedIds: string[];
  repost: (challenge: Challenge, note?: string) => Promise<void>;
  speechLanguage: string;
}) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState(""),
    [severity, setSeverity] = useState("2"),
    [urgency, setUrgency] = useState("2"),
    [affectedPopulation, setAffectedPopulation] = useState(""),
    [supportingInfo, setSupportingInfo] = useState(""),
    [nearProblem, setNearProblem] = useState<"yes" | "no" | "">(""),
    [voiceTranscript, setVoiceTranscript] = useState(""),
    [voiceRecording, setVoiceRecording] = useState<"title" | "description" | null>(null),
    [voiceError, setVoiceError] = useState(""),
    [reviewing, setReviewing] = useState(false),
    [district, setDistrict] = useState(""),
    [block, setBlock] = useState(""),
    [locality, setLocality] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reportId, setReportId] = useState<string | null>(null),
    [challengeId, setChallengeId] = useState<string | null>(null),
    [publicId, setPublicId] = useState<string | null>(null),
    [latitude, setLatitude] = useState<number | null>(null),
    [longitude, setLongitude] = useState<number | null>(null),
    [duplicateMatches, setDuplicateMatches] = useState<
      { challenge_id: string; public_id: string; title: string; duplicate_score: number }[]
    >([]),
    [duplicateDecision, setDuplicateDecision] = useState(false),
    [supportSuggestions, setSupportSuggestions] = useState<
      { id: string; title: string; support_type: string; official_url: string | null; contact_information: string | null }[]
    >([]),
    [locationLabel, setLocationLabel] = useState(""),
    [showNearby, setShowNearby] = useState(false),
    [consentLocation, setConsentLocation] = useState(false),
    [consentMedia, setConsentMedia] = useState(false),
    [consentAi, setConsentAi] = useState(false),
    [mediaError, setMediaError] = useState("");
  const voiceSession = useRef<{
    socket: WebSocket;
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    gain: GainNode;
    context: AudioContext;
  } | null>(null);
  const voiceCommittedText = useRef("");
  const voicePartialText = useRef("");
  const voiceBaseText = useRef("");

  const nearby = challenges
    .filter((challenge) => latitude != null && longitude != null && challenge.public_latitude != null && challenge.public_longitude != null)
    .map((challenge) => ({
      challenge,
      distance: distanceKm(
        { lat: latitude!, lng: longitude! },
        { lat: challenge.public_latitude!, lng: challenge.public_longitude! },
      ),
    }))
    .filter(({ distance }) => Number.isFinite(distance) && distance <= 5)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const getProblemGps = () => {
    if (!navigator.geolocation) return setError("GPS is not supported on this device. Enter the problem location manually.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationLabel("Current GPS location detected. Manual location entry is not required.");
        setShowNearby(true);
      },
      () => {
        setLocationLabel("");
        setError("Location permission was denied. Choose 'No, I am elsewhere' to enter the problem location manually.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const stopVoiceResources = () => {
    const session = voiceSession.current;
    if (!session) return;
    session.processor.disconnect();
    session.source.disconnect();
    session.gain.disconnect();
    session.stream.getTracks().forEach((track) => track.stop());
    void session.context.close();
    voiceSession.current = null;
  };
  const updateLiveTranscript = (field: "title" | "description") => {
    const transcript = [voiceCommittedText.current, voicePartialText.current].filter(Boolean).join(" ").trim();
    const fullText = [voiceBaseText.current, transcript].filter(Boolean).join(voiceBaseText.current && transcript ? " " : "");
    setVoiceTranscript(transcript);
    (field === "title" ? setTitle : setDescription)(fullText);
  };

  const startVoiceTranscription = async (field: "title" | "description") => {
    setVoiceError("");
    setError("");
    if (!window.isSecureContext) {
      setVoiceError("Microphone access requires a secure (HTTPS) connection. Open the deployed HTTPS site or use localhost.");
      return;
    }
    try {
      const { token } = await createElevenLabsScribeToken();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error("This browser does not support the audio processing needed for live transcription.");
      const context = new AudioContextClass();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const gain = context.createGain();
      gain.gain.value = 0;
      const languageCode = speechLanguage.split("-")[0] || "en";
      const socket = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=${encodeURIComponent(languageCode)}&token=${encodeURIComponent(token)}`);
      voiceBaseText.current = (field === "title" ? title : description).trim();
      voiceCommittedText.current = "";
      voicePartialText.current = "";
      voiceSession.current = { socket, stream, source, processor, gain, context };
      setVoiceRecording(field);

      socket.onopen = () => {
        source.connect(processor);
        processor.connect(gain);
        gain.connect(context.destination);
        processor.onaudioprocess = (event) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const input = event.inputBuffer.getChannelData(0);
          const outputLength = Math.floor(input.length * 16000 / context.sampleRate);
          const pcm = new Int16Array(outputLength);
          for (let index = 0; index < outputLength; index += 1) {
            const sample = Math.max(-1, Math.min(1, input[Math.floor(index * context.sampleRate / 16000)] ?? 0));
            pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }
          const bytes = new Uint8Array(pcm.buffer);
          let binary = "";
          bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
          socket.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: btoa(binary) }));
        };
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { message_type?: string; text?: string; error?: string };
        if (message.message_type === "partial_transcript") {
          voicePartialText.current = message.text?.trim() ?? "";
          updateLiveTranscript(field);
        } else if (message.message_type === "committed_transcript") {
          voiceCommittedText.current = [voiceCommittedText.current, message.text?.trim()].filter(Boolean).join(" ");
          voicePartialText.current = "";
          updateLiveTranscript(field);
        } else if (message.message_type === "rate_limited" || message.message_type === "error") {
          setVoiceError(message.error || "ElevenLabs could not transcribe this recording. Please try again.");
        }
      };
      socket.onerror = () => setVoiceError("The live transcription connection failed. Check your connection and try again.");
      socket.onclose = () => {
        stopVoiceResources();
        setVoiceRecording(null);
      };
    } catch (cause: any) {
      stopVoiceResources();
      setVoiceRecording(null);
      setVoiceError(cause?.name === "NotAllowedError" ? "Microphone permission was blocked. Allow it in your browser site settings, then try again." : cause?.message || "We could not start live transcription. Please try again.");
    }
  };
  const stopVoiceTranscription = () => {
    const session = voiceSession.current;
    if (!session) return;
    session.processor.disconnect();
    session.source.disconnect();
    session.stream.getTracks().forEach((track) => track.stop());
    if (session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: "", commit: true }));
      window.setTimeout(() => session.socket.close(), 650);
    } else {
      stopVoiceResources();
      setVoiceRecording(null);
    }
  };
  useEffect(() => () => stopVoiceResources(), []);
  const findDuplicates = async () => {
    if (!supabase) return [] as { challenge_id: string; public_id: string; title: string; duplicate_score: number }[];
    const duplicateArgs = {
      problem_title: title.trim(),
      problem_description: description.trim(),
      problem_domain: category,
      problem_lat: latitude,
      problem_lng: longitude,
      problem_district: nearProblem === "yes" ? null : district.trim() || null,
      problem_locality: nearProblem === "yes" ? null : locality.trim() || null,
    };
    // Prefer the locality-aware function, but retain compatibility until its migration is applied.
    let result = await supabase.rpc("find_possible_duplicates_v2", duplicateArgs);
    if (result.error) {
      result = await supabase.rpc("find_possible_duplicates", {
        problem_title: duplicateArgs.problem_title,
        problem_description: duplicateArgs.problem_description,
        problem_domain: duplicateArgs.problem_domain,
        problem_lat: duplicateArgs.problem_lat,
        problem_lng: duplicateArgs.problem_lng,
      });
    }
    return ((result.data ?? []) as { challenge_id: string; public_id: string; title: string; duplicate_score: number }[])
      // 55 includes a strong title/context match in the same locality while
      // still requiring the citizen to explicitly choose "different" to proceed.
      .filter((item) => item.duplicate_score >= 55);
  };
  const review = async () => {
    setError("");
    if (!nearProblem) return setError("Please select whether you are currently near the problem location.");
    if (!title.trim() || description.trim().length < 10) return setError("Enter a problem title and a description of at least 10 characters.");
    if (!category) return setError("Select the category that best describes this problem.");
    if (nearProblem === "yes" && (latitude == null || longitude == null)) return setError("We need your GPS location. Retry GPS, or choose 'No, I am elsewhere' to enter it manually.");
    if (nearProblem === "no" && (!district.trim() || !block.trim() || !locality.trim())) return setError("District, Block / Mandal, and Village / City are required when entering the location manually.");
    if (nearProblem === "yes" && !consentLocation) return setError("Confirm consent before sharing your exact GPS location with authorised responders.");
    setDuplicateDecision(false);
    setDuplicateMatches(await findDuplicates());
    setReviewing(true);
  };

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    // Check again immediately before creating a record. This catches a report made
    // by another citizen while this form was open.
    if (!duplicateDecision) {
      const matches = await findDuplicates();
      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setReviewing(true);
        setBusy(false);
        return;
      }
    }
    let actor = user;
    if (!actor) {
      // The interface intentionally hides anonymous sessions. Reuse one when
      // it exists instead of repeatedly signing a citizen in.
      const current = await supabase.auth.getUser();
      actor = current.data.user;
      if (!actor) {
        const a = await supabase.auth.signInAnonymously();
        actor = a.data.user;
        if (a.error || !actor) {
          setError(a.error?.message ?? "Unable to create secure reporting session.");
          setBusy(false);
          return;
        }
      }
    }
    const domain = category;
    const population = affectedPopulation.trim() ? Number(affectedPopulation) : null;
    const savedDistrict = nearProblem === "yes" ? "GPS-detected location" : district.trim();
    const savedBlock = nearProblem === "yes" ? null : block.trim() || null;
    const savedLocality = nearProblem === "yes" ? null : locality.trim() || null;
    const { data: c, error: ce } = await supabase
      .from("challenges")
      .insert({
        title: title.trim(),
        summary: `${description}${supportingInfo ? `\n\nSupporting information: ${supportingInfo}` : ""}`,
        domain,
        district: savedDistrict,
        block: savedBlock,
        locality: savedLocality,
        severity: Number(severity),
        urgency: Number(urgency),
        affected_population: Number.isFinite(population) ? population : null,
        evidence_quality: 1,
        created_by: actor.id,
        public_latitude: latitude,
        public_longitude: longitude,
      })
      .select("id,public_id")
      .single();
    if (ce || !c) {
      setError(ce?.message ?? "Unable to save challenge.");
      setBusy(false);
      return;
    }
    const { data: r, error: re } = await supabase
      .from("reports")
      .insert({
        challenge_id: c.id,
        reporter_id: actor.id,
        description,
        district: savedDistrict,
        block: savedBlock,
        locality: savedLocality,
        latitude,
        longitude,
        voice_transcript: voiceTranscript.trim() || null,
        category: domain,
        severity: Number(severity),
        urgency: Number(urgency),
        affected_population: Number.isFinite(population) ? population : null,
        consent_location: consentLocation,
        consent_media: consentMedia,
        consent_ai_processing: consentAi,
      })
      .select("id")
      .single();
    setBusy(false);
    if (re || !r) {
      setError(re?.message ?? "Unable to save report.");
      return;
    }
    setReportId(r.id);
    setChallengeId(c.id);
    setPublicId(c.public_id);
    const { data: support } = await supabase
      .from("support_information")
      .select("id,title,support_type,official_url,contact_information")
      .eq("verification_status", "verified")
      .or(`categories.cs.{${domain}},districts.cs.{${district}}`)
      .limit(4);
    setSupportSuggestions((support ?? []) as typeof supportSuggestions);
  };

  if (reportId) {
    return (
      <section className="container-page max-w-3xl py-14">
        <button
          onClick={() => {
            setReportId(null);
            setChallengeId(null);
            setPublicId(null);
            setTitle("");
            setDescription("");
            setCategory("");
            setSeverity("2");
            setUrgency("2");
            setAffectedPopulation("");
            setSupportingInfo("");
            setDistrict("");
            setBlock("");
            setLocality("");
          }}
          className="text-sm font-bold text-muted-foreground"
        >
          Back
        </button>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
          REPORT SAVED - NO ACCOUNT NEEDED
        </span>
        <h1 className="mt-5 text-3xl font-bold">Your Problem ID is ready</h1>
        <p className="mt-2 rounded-lg bg-primary-soft p-3 text-sm font-bold text-primary">
          Problem ID: {publicId ?? "Generating..."}. Keep this ID to track your report.
        </p>
        <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm">
          <b>Tracking link</b>
          <span className="ml-2 break-all text-primary">samajsetu.in/track/{publicId}</span>
        </div>
        <p className="mt-2 text-muted-foreground">
          Attach photos, videos, or audio recordings to strengthen your report and help verify the
          problem.
        </p>
        {supportSuggestions.length > 0 && <section className="card-surface mt-5 p-5"><h2 className="font-bold">Verified support that may help</h2><p className="mt-1 text-sm text-muted-foreground">Matched to this report's category or district. Confirm eligibility and documents with the provider.</p><div className="mt-3 space-y-2">{supportSuggestions.map((item) => <div key={item.id} className="rounded-lg bg-surface p-3 text-sm"><b>{item.title}</b><p className="mt-1 text-xs text-muted-foreground">{item.support_type.replaceAll("_", " ")}</p>{item.official_url && <a href={item.official_url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-primary">Official application link</a>}{item.contact_information && <p className="mt-1">{item.contact_information}</p>}</div>)}</div></section>}
        <div className="card-surface mt-7 p-6">
          <MediaUpload
            reportId={reportId}
            challengeId={challengeId ?? undefined}
            onMediaAdded={() => {}}
            onError={setMediaError}
          />
          {mediaError && <p className="mt-4 text-sm text-destructive">{mediaError}</p>}
          <button
            onClick={() => {
              setReportId(null);
              setChallengeId(null);
              complete();
            }}
            className="mt-6 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            Submit report
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page max-w-3xl py-14">
      <button onClick={() => go("home")} className="text-sm font-bold text-muted-foreground">
        Back
      </button>
      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
        NO SIGN-IN REQUIRED
      </span>
      <h1 className="mt-5 text-3xl font-bold">Report a community problem</h1>
      <p className="mt-2 text-muted-foreground">
        Share what you see in plain language. You will receive a Problem ID and tracking link after
        submission.
      </p>
      <div className="card-surface mt-7 p-6">
        <div className="relative">
          <label className="sr-only" htmlFor="problem-title">Problem title</label>
          <input
            id="problem-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Problem title *"
            className="w-full rounded-lg border border-input p-3 pr-14"
          />
          <button type="button" onClick={() => voiceRecording === "title" ? stopVoiceTranscription() : startVoiceTranscription("title")} disabled={voiceRecording === "description"} aria-label={voiceRecording === "title" ? "Stop dictating problem title" : "Dictate problem title"} title={voiceRecording === "title" ? "Stop listening" : "Start listening"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-primary hover:bg-primary-soft disabled:opacity-50"><Mic size={19} className={voiceRecording === "title" ? "animate-pulse" : ""} /></button>
        </div>
        <div className="relative mt-3">
          <label className="sr-only" htmlFor="problem-description">Problem description</label>
          <textarea
            id="problem-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is happening? Who is affected?"
            className="min-h-36 w-full rounded-lg border border-input p-3 pr-14"
          />
          <button type="button" onClick={() => voiceRecording === "description" ? stopVoiceTranscription() : startVoiceTranscription("description")} disabled={voiceRecording === "title"} aria-label={voiceRecording === "description" ? "Stop dictating problem description" : "Dictate problem description"} title={voiceRecording === "description" ? "Stop listening" : "Start listening"} className="absolute right-2 top-3 rounded-full p-2 text-primary hover:bg-primary-soft disabled:opacity-50"><Mic size={19} className={voiceRecording === "description" ? "animate-pulse" : ""} /></button>
        </div>
        {(voiceRecording || voiceError) && <div className="mt-3 rounded-lg bg-primary-soft/40 p-3 text-sm"><p className="font-medium text-primary">{voiceRecording ? `Listening for the problem ${voiceRecording}. Live transcription appears as you speak; click the microphone again to stop listening.` : null}</p>{voiceError && <p className="text-destructive">{voiceError}</p>}<p className="mt-1 text-xs text-muted-foreground">ElevenLabs transcribes in your selected language. Review the live transcript before submitting.</p></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3 font-normal">
              <option value="">Select category *</option>
              {["Water", "Healthcare", "Education", "Agriculture", "Sanitation", "Environment", "Accessibility", "Urban Infrastructure", "Public Services", "Rural Livelihoods"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Affected people (optional)
            <input value={affectedPopulation} onChange={(event) => setAffectedPopulation(event.target.value)} type="number" min="0" placeholder="Estimated number" className="mt-1 w-full rounded-lg border border-input p-3 font-normal" />
          </label>
          <label className="text-sm font-bold">Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3 font-normal"><option value="1">Minor</option><option value="2">Moderate</option><option value="3">High</option><option value="4">Critical</option></select>
          </label>
          <label className="text-sm font-bold">Urgency
            <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3 font-normal"><option value="1">Low</option><option value="2">Medium</option><option value="3">High</option><option value="4">Critical</option></select>
          </label>
        </div>
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
          <p className="font-bold">Are you currently near the location where the problem exists? <span className="text-destructive">*</span></p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["yes", "no"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm font-semibold">
                <input type="radio" name="near-problem" checked={nearProblem === value} onChange={() => { setNearProblem(value); setError(""); if (value === "yes") { setDistrict(""); setBlock(""); setLocality(""); getProblemGps(); } else { setLatitude(null); setLongitude(null); setLocationLabel("Enter the problem location manually below. Your current GPS will not be requested."); } }} />
                {value === "yes" ? "Yes, I am nearby" : "No, I am elsewhere"}
              </label>
            ))}
          </div>
          {nearProblem === "yes" && <div className="mt-3 text-sm"><button type="button" onClick={getProblemGps} className="font-bold text-primary"><LocateFixed className="mr-1 inline" size={16} /> Get / retry GPS location</button>{latitude != null && longitude != null && <p className="mt-2 font-mono text-xs">Latitude: {latitude.toFixed(6)} | Longitude: {longitude.toFixed(6)}</p>}</div>}
        </div>
        <div className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
          <label className="flex items-start gap-2"><input type="checkbox" checked={consentLocation} onChange={(event) => setConsentLocation(event.target.checked)} /> I consent to authorised verifiers and assigned partners using my exact location. Public discovery uses an approximate location only.</label>
        </div>
        {nearProblem === "no" && <><div className="mt-5 flex items-center justify-between gap-3">
          <label className="text-sm font-bold">Problem location</label>
          <span className="text-xs text-muted-foreground">Manual entry</span>
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="District *"
            className="rounded-lg border border-input p-3 text-sm"
          />
          <input
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            placeholder="Block"
            className="rounded-lg border border-input p-3 text-sm"
          />
          <input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Village / city"
            className="rounded-lg border border-input p-3 text-sm"
          />
        </div></>}
        <textarea
          value={supportingInfo}
          onChange={(e) => setSupportingInfo(e.target.value)}
          placeholder="Supporting information (optional)"
          className="mt-3 min-h-24 w-full rounded-lg border border-input p-3"
        />
        <div className="mt-4 space-y-2 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
          <label className="flex items-start gap-2"><input type="checkbox" checked={consentMedia} onChange={(event) => setConsentMedia(event.target.checked)} /> I consent to secure storage and authorised review of any evidence I upload.</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={consentAi} onChange={(event) => setConsentAi(event.target.checked)} /> I consent to optional future AI-assisted analysis. It will never replace my original report.</label>
        </div>
        {locationLabel && (
          <span className="ml-3 text-sm font-medium text-accent">{locationLabel}</span>
        )}
        {(showNearby || locality.length > 2) && nearby.length > 0 && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">Possible matches nearby</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Avoid duplicate reports by supporting an existing problem.
                </p>
              </div>
              <Navigation className="text-primary" size={20} />
            </div>
            <div className="mt-3 space-y-2">
              {nearby.map(({ challenge, distance }) => (
                <div
                  key={challenge.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-3"
                >
                  <div>
                    <b className="text-sm">{challenge.title}</b>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline" size={12} />
                      {distance.toFixed(1)} km away | {challenge.stage.replaceAll("_", " ")}
                    </p>
                  </div>
                  <button
                    disabled={supportedIds.includes(challenge.id)}
                    onClick={() =>
                      void repost(challenge, "Also affected - submitted from report flow.")
                    }
                    className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                  >
                    {supportedIds.includes(challenge.id) ? "Supporting" : "I am also affected"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-5 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mr-2 inline text-accent" size={16} />
          Sensitive evidence and exact locations stay private.
        </p>
        {reviewing && (
          <div className="mt-5 rounded-xl border border-primary bg-primary-soft/40 p-5">
            <h2 className="text-lg font-bold">Review Report</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p><b>Problem:</b> {title} - {description}</p>
              <p><b>Category:</b> {category} | <b>Severity:</b> {severity}/4 | <b>Urgency:</b> {urgency}/4</p>
              {voiceTranscript && <p><b>Voice transcription:</b> {voiceTranscript}</p>}
              <p><b>Near the problem:</b> {nearProblem === "yes" ? "Yes" : "No"}</p>
              {nearProblem === "yes" && latitude != null && <p><b>Reporter GPS:</b> {latitude.toFixed(6)}, {longitude?.toFixed(6)}</p>}
              <p><b>Problem location:</b> {district}, {block}, {locality}</p>
              {supportingInfo && <p><b>Supporting information:</b> {supportingInfo}</p>}
            </div>
            {duplicateMatches.length > 0 && !duplicateDecision && <div className="mt-4 rounded-lg border border-[#DDEBE2] bg-[#F6FBF8] p-3 text-sm"><b>A problem with similar problem is already reported.</b><p className="mt-1">Choose repost if this is the same issue. It adds your support to the existing problem without creating a duplicate.</p>{duplicateMatches.map((item) => <div key={item.challenge_id} className="mt-3 flex flex-wrap items-center justify-between gap-2"><p><b>{item.public_id}</b> | {item.title} ({Math.round(item.duplicate_score)}% match)</p><button type="button" onClick={() => { const match = challenges.find((challenge) => challenge.id === item.challenge_id); if (match) void repost(match); }} className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary">This is the same problem - repost</button></div>)}<button type="button" onClick={() => setDuplicateDecision(true)} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">These are different - continue reporting</button></div>}
            {(duplicateMatches.length === 0 || duplicateDecision) && <button onClick={() => void submit()} disabled={busy} className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Submitting..." : "Submit Report"}</button>}
            <button onClick={() => setReviewing(false)} className="ml-3 text-sm font-bold text-primary">Edit report</button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          disabled={busy || reviewing}
          onClick={review}
          className="mt-6 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving..." : "Submit for review"}
        </button>
      </div>
    </section>
  );
}
function ProblemProgressTimeline({ challenge, compact = false }: { challenge: Challenge; compact?: boolean }) {
  const status = challenge.assignment_status ?? "";
  const assigned = Boolean(status) || ["matched", "project", "prototype", "pilot", "impact"].includes(challenge.stage);
  const accepted = ["accepted", "in_progress", "completed", "verified", "unable_to_resolve"].includes(status);
  const participants = (challenge.participant_count ?? 0) > 0;
  const working = ["in_progress", "completed", "verified", "unable_to_resolve"].includes(status);
  const finished = ["completed", "verified", "unable_to_resolve"].includes(status) || challenge.stage === "impact";
  const steps = [
    ["Task Assigned", assigned],
    ["Task Accepted", accepted],
    ["Skilled Participants Assigned", participants],
    ["Work in Progress", working],
    [status === "unable_to_resolve" ? "Couldn't Solve - reassignment" : "Solved / Resolution", finished],
  ] as const;
  return <section className={compact ? "mt-4" : "mt-5 rounded-xl border border-border bg-surface p-4"} aria-label="Problem progress timeline"><p className="text-sm font-bold">Progress timeline</p><ol className={`mt-3 ${compact ? "flex flex-wrap gap-2" : "space-y-3"}`}>{steps.map(([label, complete], index) => <li key={label} className={`flex items-center gap-3 text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{index + 1}</span><span className={complete ? "font-semibold" : ""}>{label}</span></li>)}</ol>{!assigned && <p className="mt-3 text-xs text-muted-foreground">Awaiting verification and partner assignment.</p>}</section>;
}

function Explorer({ challenges, load, go }: { challenges: Challenge[]; load: (q: string) => void; go: (x: Screen) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("all");
  const [sort, setSort] = useState("priority");
  const [devicePosition, setDevicePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const categories = [...new Set(challenges.map((item) => item.domain).filter(Boolean))].sort();
  const visibleChallenges = challenges
    .filter((item) => category === "all" || item.domain === category)
    .filter((item) => state === "all" || item.stage === state || item.assignment_status === state)
    .sort((a, b) => sort === "newest" ? +new Date(b.created_at) - +new Date(a.created_at) : sort === "oldest" ? +new Date(a.created_at) - +new Date(b.created_at) : b.priority_score - a.priority_score);
  const mediaFor = (challenge: Challenge) => challenge.media?.length ? challenge.media : challenge.preview_image_path ? [{ path: challenge.preview_image_path, type: "image/jpeg" }] : [];
  const mediaUrl = (path: string) => supabase?.storage.from("challenge-previews").getPublicUrl(path).data.publicUrl ?? "";
  const priorityLabel = (challenge: Challenge) => challenge.priority_level ?? (challenge.priority_score >= 75 ? "HIGH" : challenge.priority_score >= 50 ? "MEDIUM" : "LOW");
  const locateDevice = () => {
    if (!navigator.geolocation) return setLocationError("Location is not supported on this device.");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => setDevicePosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocationError("Location access was not granted. Problem markers are still available."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };
  const openProblem = (challenge: Challenge) => { setMediaIndex(0); setSelected(challenge); };
  return <section className="container-page py-8 sm:py-12">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Explore Problems</h1><p className="mt-1 text-sm text-muted-foreground">Discover real-world challenges and be a part of the solution.</p></div>
      <button onClick={() => go("report")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={16} /> Report a Problem</button>
    </div>
    <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(10rem,.9fr)_minmax(10rem,.9fr)_minmax(10rem,.9fr)]">
      <label className="relative"><Search className="absolute left-3 top-3 text-muted-foreground" size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); void load(event.target.value); }} placeholder="Search problems..." className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-3 text-sm" /></label>
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm"><option value="all">All Categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={state} onChange={(event) => setState(event.target.value)} className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm"><option value="all">All States</option><option value="reported">Reported</option><option value="matched">Matched</option><option value="in_progress">In progress</option><option value="impact">Resolved</option></select>
      <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm"><option value="priority">Sort by priority</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
    </div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visibleChallenges.map((challenge) => {
        const thumbnail = mediaFor(challenge)[0];
        const priority = priorityLabel(challenge);
        return <button key={challenge.id} onClick={() => openProblem(challenge)} className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
          <div className="relative aspect-[1.8] bg-surface">{thumbnail ? thumbnail.type.startsWith("video/") ? <video src={mediaUrl(thumbnail.path)} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={mediaUrl(thumbnail.path)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon size={28} /></div>}<span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold text-white ${priority === "HIGH" || priority === "CRITICAL" ? "bg-destructive" : priority === "MEDIUM" ? "bg-[#d9902f]" : "bg-primary"}`}>{priority[0] + priority.slice(1).toLowerCase()} Priority</span></div>
          <div className="p-3"><h2 className="line-clamp-2 font-bold leading-5 group-hover:text-primary">{challenge.title}</h2><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} /> {challenge.district}</p><div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><BadgeCheck size={12} className="text-primary" /> {challenge.domain}</span><span>{new Date(challenge.created_at).toLocaleDateString()}</span></div></div>
        </button>;
      })}
      {!visibleChallenges.length && <p className="card-surface col-span-full p-8 text-center text-muted-foreground">No problems match these filters.</p>}
    </div>
    <section className="mt-10 overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="font-bold">Problem map</h2><p className="mt-1 text-xs text-muted-foreground">Select a marker to view that problem&apos;s complete public details.</p></div><button onClick={locateDevice} className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary"><LocateFixed size={15} /> {devicePosition ? "Location updated" : "Use my location"}</button></div><ProblemMap problems={visibleChallenges} devicePosition={devicePosition} onProblemSelect={(problem) => { const match = challenges.find((item) => item.id === problem.id); if (match) openProblem(match); }} />{locationError && <p className="px-4 py-3 text-sm text-destructive">{locationError}</p>}</section>
    {selected && (() => { const media = mediaFor(selected); const activeMedia = media[mediaIndex]; return <div className="fixed inset-0 z-[2000] grid place-items-end bg-ink/50 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Problem details"><article className="card-surface max-h-[92dvh] w-full max-w-4xl overflow-y-auto p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">{selected.public_id}</span><h2 className="mt-3 text-2xl font-bold">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="grid size-10 shrink-0 place-items-center rounded-lg border border-border" aria-label="Close problem details"><X size={18} /></button></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div>{activeMedia ? <div className="relative aspect-video overflow-hidden rounded-xl bg-black">{activeMedia.type.startsWith("video/") ? <video src={mediaUrl(activeMedia.path)} controls className="h-full w-full object-contain" /> : <img src={mediaUrl(activeMedia.path)} alt={`Evidence for ${selected.title}`} className="h-full w-full object-cover" />}{media.length > 1 && <div className="absolute inset-x-3 bottom-3 flex justify-between"><button onClick={() => setMediaIndex((index) => (index - 1 + media.length) % media.length)} className="rounded-full bg-black/65 p-2 text-white" aria-label="Previous media"><ChevronLeft size={18} /></button><button onClick={() => setMediaIndex((index) => (index + 1) % media.length)} className="rounded-full bg-black/65 p-2 text-white" aria-label="Next media"><ChevronRight size={18} /></button></div>}</div> : <div className="grid aspect-video place-items-center rounded-xl bg-surface text-sm text-muted-foreground">No public media submitted</div>}<h3 className="mt-5 font-bold">Problem details</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.summary}</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><b>Category</b><br />{selected.domain}</p><p><b>Location</b><br />{selected.district}</p><p><b>Reported</b><br />{new Date(selected.created_at).toLocaleDateString()}</p><p><b>People affected</b><br />{selected.affected_population ?? "Not reported"}</p><p><b>Verification</b><br />{selected.verification.replaceAll("_", " ")}</p><p><b>Community support</b><br />{selected.reports + selected.reposts} reports and reposts</p></div>{selected.comments?.length ? <section className="mt-5 border-t border-border pt-4"><h3 className="font-bold">Community updates</h3><div className="mt-3 space-y-2">{selected.comments.map((comment) => <p key={comment.id} className="rounded-lg bg-surface px-3 py-2 text-sm">{comment.note}</p>)}</div></section> : null}</div><aside><div className="rounded-xl bg-primary-soft/40 p-4"><p className="text-xs font-bold text-primary">CURRENT STATUS</p><p className="mt-1 font-bold capitalize">{(selected.assignment_status ?? selected.stage).replaceAll("_", " ")}</p><p className="mt-3 text-sm"><b>Priority:</b> {priorityLabel(selected)} ({selected.priority_score}/100)</p></div><ProblemProgressTimeline challenge={selected} /></aside></div></article></div>; })()}
  </section>;
}

function ExplorerLegacy({
  challenges,
  load,
  supportedIds,
  repost,
  go,
}: {
  challenges: Challenge[];
  load: (q: string) => void;
  supportedIds: string[];
  repost: (challenge: Challenge, note?: string) => Promise<void>;
  go: (x: Screen) => void;
}) {
  const [q, setQ] = useState(""),
    [confirmingId, setConfirmingId] = useState<string | null>(null),
    [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({}),
    [repostNotes, setRepostNotes] = useState<Record<string, string>>({}),
    [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({}),
    [devicePosition, setDevicePosition] = useState<{ lat: number; lng: number } | null>(null),
    [locationError, setLocationError] = useState(""),
    [selectedMapChallenge, setSelectedMapChallenge] = useState<Challenge | null>(null);
  const locateDevice = () => {
    if (!navigator.geolocation) return setLocationError("Location is not supported on this device.");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => setDevicePosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocationError("Location access was not granted. Problem markers are still available."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };
  return (
    <section className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            LOCATION-BASED DISCOVERY
          </span>
          <h1 className="mt-4 text-3xl font-bold">Problems near you</h1>
        </div>
        <button
          onClick={locateDevice}
          className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary"
        >
          <LocateFixed size={16} />
          {devicePosition ? "Location updated" : "Use my location"}
        </button>
      </div>
      <p className="mt-2 text-muted-foreground">
        Found the same problem? Repost it instead of creating another card. Each person can repost
        once.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ProblemMap problems={challenges} devicePosition={devicePosition} onProblemSelect={(problem) => setSelectedMapChallenge(challenges.find((item) => item.id === problem.id) ?? null)} />
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {devicePosition ? "Green marker: your current device location. It is never stored or shared." : "Enable location to show your current device marker."} Only community-verified and officially verified problems are pinned, using their stored public problem coordinates. Numbered pins group nearby problems; zoom in to inspect each one.
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm font-bold">Your local response network</p>
          <div className="mt-4 space-y-4 text-sm">
            <p>
              <b className="text-2xl text-primary">{challenges.length}</b>
              <span className="ml-2 text-muted-foreground">reported problems nearby</span>
            </p>
            <p>
              <b className="text-2xl text-accent">3</b>
              <span className="ml-2 text-muted-foreground">partner organizations available</span>
            </p>
            <button
              onClick={() => go("report")}
              className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
            >
              Report a new problem
            </button>
          </div>
        </div>
      </div>
      {locationError && <p className="mt-3 text-sm text-destructive">{locationError}</p>}
      <div className="relative mt-5 max-w-xl">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            void load(e.target.value);
          }}
          placeholder="Search title or domain"
          className="w-full rounded-lg border border-input py-3 pl-10"
        />
      </div>
      <div className="mt-7 mx-auto max-w-xl space-y-6">
        {challenges.length === 0 ? (
          <div className="card-surface p-8 text-muted-foreground">No live challenges found.</div>
        ) : (
          challenges.map((c) => {
            const reposted = supportedIds.includes(c.id);
            const confirming = confirmingId === c.id;
            const media = c.media?.length
              ? c.media
              : c.preview_image_path
                ? [{ path: c.preview_image_path, type: "image/jpeg" }]
                : [];
            const mediaIndex = Math.min(mediaIndexes[c.id] ?? 0, Math.max(0, media.length - 1));
            const activeMedia = media[mediaIndex];
            const comments = c.comments ?? [];
            const commentsExpanded = expandedComments[c.id] ?? false;
            const visibleComments = commentsExpanded ? comments : comments.slice(0, 2);
            return (
              <article className="card-surface overflow-hidden" key={c.id}>
                <div className="flex items-center justify-between p-4">
                  <b className="text-xs text-primary">{c.public_id}</b>
                  <div className="text-right"><b>{c.priority_score}/100</b><p className="text-[10px] font-bold text-primary">{c.priority_level ?? (c.priority_score >= 90 ? "CRITICAL" : c.priority_score >= 75 ? "HIGH" : c.priority_score >= 50 ? "MEDIUM" : c.priority_score >= 25 ? "LOW" : "MINOR")}</p></div>
                </div>
                {activeMedia && supabase ? (
                  <div className="relative aspect-square bg-black">
                    {activeMedia.type.startsWith("video/") ? (
                      <video
                        src={
                          supabase.storage.from("challenge-previews").getPublicUrl(activeMedia.path)
                            .data.publicUrl
                        }
                        controls
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <img
                        src={
                          supabase.storage.from("challenge-previews").getPublicUrl(activeMedia.path)
                            .data.publicUrl
                        }
                        alt={`Community evidence for ${c.title}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {media.length > 1 && (
                      <>
                        <button
                          aria-label="Previous media"
                          onClick={() =>
                            setMediaIndexes((items) => ({
                              ...items,
                              [c.id]: (mediaIndex - 1 + media.length) % media.length,
                            }))
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          aria-label="Next media"
                          onClick={() =>
                            setMediaIndexes((items) => ({
                              ...items,
                              [c.id]: (mediaIndex + 1) % media.length,
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">
                          {mediaIndex + 1}/{media.length}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex aspect-square w-full flex-col items-center justify-center bg-surface px-2 text-center text-sm text-muted-foreground"
                    aria-label="No photo submitted"
                  >
                    <ImageIcon size={32} aria-hidden="true" />
                    <span className="mt-2">No photo submitted</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="mt-2 font-bold">{c.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <MapPin className="inline" size={14} />
                    {c.district} | {c.domain}
                  </p>
                  <div className="mt-4 flex gap-2 text-xs font-bold">
                    <span className="rounded-full bg-surface px-2 py-1">
                      {c.verification.replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-1">
                      {c.reports} community reports
                    </span>
                    <span className="rounded-full bg-primary-soft px-2 py-1 text-primary">
                      <Repeat2 className="mr-1 inline" size={12} /> {c.reposts} reposts
                    </span>
                  </div>
                  <ProblemProgressTimeline challenge={c} />
                  {comments.length > 0 && (
                    <section
                      className="mt-4 border-t border-border pt-3"
                      aria-label="Community comments"
                    >
                      <p className="text-xs font-bold text-muted-foreground">Community comments</p>
                      <div className="mt-2 space-y-2">
                        {visibleComments.map((comment) => (
                          <p key={comment.id} className="rounded-lg bg-surface px-3 py-2 text-sm">
                            <span className="mr-1 font-bold">Community member</span>
                            {comment.note}
                          </p>
                        ))}
                      </div>
                      {comments.length > 2 && (
                        <button
                          onClick={() =>
                            setExpandedComments((items) => ({
                              ...items,
                              [c.id]: !commentsExpanded,
                            }))
                          }
                          className="mt-2 text-sm font-bold text-primary"
                        >
                          {commentsExpanded ? "Show less" : `See ${comments.length - 2} more`}
                        </button>
                      )}
                    </section>
                  )}
                  {reposted ? (
                    <button
                      disabled
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted-foreground"
                    >
                      <Repeat2 size={16} /> Reposted
                    </button>
                  ) : confirming ? (
                    <div className="mt-5 rounded-lg border border-primary/30 bg-primary-soft p-3 text-sm">
                      <p className="font-medium">
                        Repost this problem to add your community support?
                      </p>
                      <label className="mt-3 block text-xs font-medium text-muted-foreground">
                        Add any points about this problem (optional)
                        <textarea
                          value={repostNotes[c.id] ?? ""}
                          onChange={(event) =>
                            setRepostNotes((notes) => ({ ...notes, [c.id]: event.target.value }))
                          }
                          maxLength={1000}
                          placeholder="For example: This is also affecting our street."
                          className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
                        />
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            void repost(c, repostNotes[c.id] ?? "").finally(() => {
                              setConfirmingId(null);
                              setRepostNotes((notes) => {
                                const { [c.id]: _removed, ...remaining } = notes;
                                return remaining;
                              });
                            });
                          }}
                          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                        >
                          Confirm repost
                        </button>
                        <button
                          onClick={() => {
                            setConfirmingId(null);
                            setRepostNotes((notes) => {
                              const { [c.id]: _removed, ...remaining } = notes;
                              return remaining;
                            });
                          }}
                          className="rounded-lg border border-input px-3 py-2 text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(c.id)}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary"
                    >
                      <Repeat2 size={16} /> Repost this problem
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
      {selectedMapChallenge && <div className="fixed inset-0 z-[2000] grid place-items-end bg-ink/45 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Problem details"><article className="card-surface max-h-[88dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">{selectedMapChallenge.public_id}</span><h2 className="mt-3 text-xl font-bold">{selectedMapChallenge.title}</h2></div><button onClick={() => setSelectedMapChallenge(null)} className="grid size-10 shrink-0 place-items-center rounded-lg border border-border" aria-label="Close problem details"><X size={18}/></button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><b>Category</b><br/>{selectedMapChallenge.domain}</p><p><b>Location</b><br/>{selectedMapChallenge.district}</p><p><b>Date reported</b><br/>{new Date(selectedMapChallenge.created_at).toLocaleDateString()}</p><p><b>Current status</b><br/>{selectedMapChallenge.stage.replaceAll("_", " ")}</p><p><b>Supporting reports</b><br/>{selectedMapChallenge.reports + selectedMapChallenge.reposts}</p><p><b>Priority</b><br/>{selectedMapChallenge.priority_level ?? "Under review"}</p></div><p className="mt-5 rounded-lg bg-surface p-3 text-xs text-muted-foreground">Map locations are approximate public problem locations. Reporter identity and private evidence are protected.</p></article></div>}
    </section>
  );
}
function OrganizationRegistration({
  user,
  go,
  flash,
}: {
  user: User | null;
  go: (x: Screen) => void;
  flash: (x: string) => void;
}) {
  const [name, setName] = useState(""),
    [kind, setKind] = useState("Institution"),
    [district, setDistrict] = useState(""),
    [locality, setLocality] = useState(""),
    [contact, setContact] = useState(""),
    [expertise, setExpertise] = useState(""),
    [capabilities, setCapabilities] = useState(""),
    [busy, setBusy] = useState(false);
  if (!user) return <Forbidden />;
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase!.from("organization_accounts").upsert(
      {
        owner_id: user.id,
        name,
        organization_type: kind,
        district,
        locality,
        contact_email: contact,
        expertise: expertise
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        capabilities: capabilities
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      },
      { onConflict: "owner_id" },
    );
    setBusy(false);
    if (error) flash(error.message);
    else {
      flash("Organization profile saved.");
      go("coordinator");
    }
  };
  return (
    <section className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-bold">Register your organization</h1>
      <p className="mt-2 text-muted-foreground">
        You can review and correct the location before saving.
      </p>
      <div className="card-surface mt-6 grid gap-3 p-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Organization name *"
          className="rounded-lg border border-input p-3"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-input p-3"
        >
          <option>Institution</option>
          <option>NGO</option>
          <option>CSR / Industry</option>
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="District"
            className="rounded-lg border border-input p-3"
          />
          <input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Locality"
            className="rounded-lg border border-input p-3"
          />
        </div>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Contact email"
          className="rounded-lg border border-input p-3"
        />
        <input
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="Areas of expertise (comma separated)"
          className="rounded-lg border border-input p-3"
        />
        <input
          value={capabilities}
          onChange={(e) => setCapabilities(e.target.value)}
          placeholder="Resources and capabilities (comma separated)"
          className="rounded-lg border border-input p-3"
        />
        <button
          disabled={!name || busy}
          onClick={() => void submit()}
          className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save and open coordinator dashboard"}
        </button>
      </div>
    </section>
  );
}

type OrganizationTaskStatus =
  | "Pending"
  | "Accepted"
  | "Students Assigned"
  | "Work in Progress"
  | "Solved"
  | "Couldn't Solve - Reassigned";
type OrganizationTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  coordinates: string;
  reported: string;
  priority: "High" | "Medium" | "Low";
  status: OrganizationTaskStatus;
  students: string[];
  remarks?: string;
};

function OrganizationDashboardLegacy({
  user,
  flash,
}: {
  user: User | null;
  flash: (x: string) => void;
}) {
  const [section, setSection] = useState("Dashboard");
  const [showInstitute, setShowInstitute] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClose, setShowClose] = useState<"solved" | "failed" | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>("SS-1024");
  const [instituteName, setInstituteName] = useState("ABC University");
  const [newCount, setNewCount] = useState("20");
  const [reason, setReason] = useState("Insufficient skilled participants");
  const [remarks, setRemarks] = useState("");
  const [institutes, setInstitutes] = useState([
    { name: "ABC University", count: 20, history: ["20 participants | Today"] },
    { name: "XYZ Institute", count: 15, history: ["15 participants | Today"] },
  ]);
  const [tasks, setTasks] = useState<OrganizationTask[]>([
    {
      id: "SS-1024",
      title: "Damaged street light on main road",
      description:
        "A street-light pole near the Duvvada junction is damaged and has been non-functional for three nights, creating a safety concern for residents.",
      category: "Electricity & Energy",
      location: "Duvvada, Ward 12",
      coordinates: "17.7231, 83.3014",
      reported: "Today, 09:42 AM",
      priority: "High",
      status: "Pending",
      students: [],
    },
    {
      id: "SS-1021",
      title: "Unsafe drinking-water supply",
      description:
        "Residents reported discoloured water and need field testing and a documented response.",
      category: "Water & Sanitation",
      location: "MVP Colony, Sector 4",
      coordinates: "17.7416, 83.3230",
      reported: "Yesterday, 03:18 PM",
      priority: "Medium",
      status: "Accepted",
      students: ["Aditi Kumari"],
    },
    {
      id: "SS-1018",
      title: "Drainage blockage after rainfall",
      description: "Storm-water drainage is blocked along the school boundary.",
      category: "Roads & Infrastructure",
      location: "Madhurawada",
      coordinates: "17.8194, 83.3502",
      reported: "28 Aug, 11:06 AM",
      priority: "Low",
      status: "Work in Progress",
      students: ["Ravi Singh", "Sai Teja"],
    },
  ]);
  // This dashboard always starts with seeded task cards; the assertion keeps that invariant explicit.
  const task = tasks.find((item) => item.id === selectedTask) ?? tasks[0]!;
  if (!user) return <Forbidden />;
  const statusTone: Record<OrganizationTaskStatus, string> = {
    Pending: "bg-[#F6FBF8] text-[#0B5D2A]",
    Accepted: "bg-[#EAF7EF] text-[#0B5D2A]",
    "Students Assigned": "bg-[#EAF7EF] text-[#0B5D2A]",
    "Work in Progress": "bg-[#EAF7EF] text-[#0B5D2A]",
    Solved: "bg-[#0B5D2A] text-white",
    "Couldn't Solve - Reassigned": "bg-rose-100 text-rose-800",
  };
  const updateTask = (id: string, patch: Partial<OrganizationTask>) =>
    setTasks((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const saveInstitute = () => {
    const count = Number(newCount || 0);
    setInstitutes((items) => {
      const found = items.find(
        (item) => item.name.toLowerCase() === instituteName.trim().toLowerCase(),
      );
      if (found)
        return items.map((item) =>
          item === found
            ? {
                ...item,
                count,
                history: [
                  `${count} participants | ${new Date().toLocaleString()}`,
                  ...item.history,
                ],
              }
            : item,
        );
      return [
        ...items,
        {
          name: instituteName.trim() || "New Institute",
          count,
          history: [`${count} participants | ${new Date().toLocaleString()}`],
        },
      ];
    });
    setShowInstitute(false);
    flash("Skilled participant availability updated.");
  };
  const downloadReport = () => {
    const rows = [
      [
        "Task ID",
        "Problem Title",
        "Problem Location",
        "Organization Name",
        "University / Institute",
        "Student Full Name",
        "Student Roll Number",
        "Student Skill / Expertise",
        "Assignment Date",
        "Task Status",
        "Remarks",
      ],
      ...task.students.map((student, i) => [
        task.id,
        task.title,
        task.location,
        "SamajSetu Partner Organization",
        i ? "XYZ Institute" : "ABC University",
        student,
        `21A01A00${i + 1}`,
        i ? "Civil" : "Electrical",
        new Date().toLocaleDateString(),
        task.status,
        task.remarks ?? "",
      ]),
    ];
    const blob = new Blob(
      [
        rows
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n"),
      ],
      { type: "text/csv" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${task.id}-student-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    flash("Excel-compatible task report downloaded.");
  };
  const nav = [
    "Dashboard",
    "Institutes / Universities",
    "Skilled Participants",
    "Assigned Tasks",
    "Active Tasks",
    "Completed Tasks",
    "Could Not Solve",
    "Task Tracking",
    "Reports / Excel Upload",
    "Profile",
  ];
  const visibleTasks =
    section === "Active Tasks"
      ? tasks.filter((item) =>
          ["Accepted", "Students Assigned", "Work in Progress"].includes(item.status),
        )
      : section === "Completed Tasks"
        ? tasks.filter((item) => item.status === "Solved")
        : section === "Could Not Solve"
          ? tasks.filter((item) => item.status.includes("Couldn't"))
          : tasks;
  return (
    <div className="dashboard-shell min-h-screen bg-surface">
      <div className="dashboard-frame mx-auto flex max-w-[1600px]">
        <aside className="app-sidebar sticky top-0 hidden h-screen w-68 shrink-0 border-r border-border bg-card p-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Building2 size={20} />
            </div>
            <div>
              <b>SamajSetu</b>
              <p className="text-xs text-muted-foreground">Organization portal</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {nav.map((item) => (
              <button
                key={item}
                onClick={() => setSection(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
              >
                {item === "Dashboard" ? (
                  <LayoutDashboard size={17} />
                ) : item.includes("Institute") ? (
                  <Building2 size={17} />
                ) : item.includes("Participant") ? (
                  <Users size={17} />
                ) : item.includes("Tracking") ? (
                  <ListChecks size={17} />
                ) : item.includes("Report") ? (
                  <FileSpreadsheet size={17} />
                ) : (
                  <ClipboardCheck size={17} />
                )}{" "}
                {item}
              </button>
            ))}
          </nav>
          <button
            onClick={() => flash("Signed out successfully.")}
            className="mt-7 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-surface"
          >
            <LogOut size={17} /> Logout
          </button>
        </aside>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card p-2 shadow-[0_-4px_16px_rgba(0,0,0,.08)] lg:hidden">
          {nav.map((item) => <button key={item} onClick={() => setSection(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${section === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item}</button>)}
        </nav>
        <main className="dashboard-main min-w-0 flex-1 p-4 pb-20 sm:p-7 lg:pb-7">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">ORGANIZATION WORKSPACE</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Welcome, SamajSetu Partner Organization
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage skilled participants, assignments, and outcomes in one place.
              </p>
            </div>
            <button
              onClick={() => setShowInstitute(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Plus size={17} /> Add / Update Skilled Participants
            </button>
          </header>
          {section === "Dashboard" && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <DashboardStat
                  label="Total Skilled Participants"
                  value={institutes.reduce((sum, item) => sum + item.count, 0)}
                  icon={<Users size={18} />}
                />
                <DashboardStat
                  label="Available Participants"
                  value={institutes.reduce((sum, item) => sum + item.count, 0) - 8}
                  icon={<BadgeCheck size={18} />}
                />
                <DashboardStat
                  label="Active Tasks"
                  value={
                    tasks.filter((item) =>
                      ["Accepted", "Students Assigned", "Work in Progress"].includes(item.status),
                    ).length
                  }
                  icon={<Activity size={18} />}
                />
                <DashboardStat
                  label="Completed Tasks"
                  value={tasks.filter((item) => item.status === "Solved").length + 18}
                  icon={<CheckCircle2 size={18} />}
                />
                <DashboardStat
                  label="Pending Tasks"
                  value={tasks.filter((item) => item.status === "Pending").length}
                  icon={<Clock3 size={18} />}
                />
                <DashboardStat
                  label="Reassigned Tasks"
                  value={tasks.filter((item) => item.status.includes("Couldn't")).length + 2}
                  icon={<Repeat2 size={18} />}
                />
              </div>
              <section className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Recent Assigned Tasks</h2>
                    <p className="text-sm text-muted-foreground">
                      New citizen-reported problems assigned to your organization.
                    </p>
                  </div>
                  <button
                    onClick={() => setSection("Assigned Tasks")}
                    className="text-sm font-bold text-primary"
                  >
                    View all
                  </button>
                </div>
                <TaskTable
                  tasks={tasks}
                  statusTone={statusTone}
                  onOpen={(id) => {
                    setSelectedTask(id);
                    setSection("Task Tracking");
                  }}
                  onAccept={(id) => {
                    updateTask(id, { status: "Accepted" });
                    flash("Task accepted. You can now assign skilled participants.");
                  }}
                />
              </section>
              <section className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Skilled Participants Availability</h2>
                    <p className="text-sm text-muted-foreground">
                      Live availability by institute or university.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInstitute(true)}
                    className="text-sm font-bold text-primary"
                  >
                    Modify count
                  </button>
                </div>
                <InstituteTable
                  institutes={institutes}
                  onEdit={(item) => {
                    setInstituteName(item.name);
                    setNewCount(String(item.count));
                    setShowInstitute(true);
                  }}
                />
              </section>
            </>
          )}
          {(section === "Institutes / Universities" || section === "Skilled Participants") && (
            <section className="mt-7">
              <h2 className="text-2xl font-bold">Skilled Participants Availability</h2>
              <p className="mt-2 text-muted-foreground">
                Update the available skilled-participant count as it changes. Every update is
                retained in its history.
              </p>
              <InstituteTable
                institutes={institutes}
                onEdit={(item) => {
                  setInstituteName(item.name);
                  setNewCount(String(item.count));
                  setShowInstitute(true);
                }}
              />
            </section>
          )}
          {["Assigned Tasks", "Active Tasks", "Completed Tasks", "Could Not Solve"].includes(
            section,
          ) && (
            <section className="mt-7">
              <h2 className="text-2xl font-bold">{section}</h2>
              <p className="mt-2 text-muted-foreground">
                Open a task to see full citizen-provided information and manage its delivery.
              </p>
              <TaskTable
                tasks={visibleTasks}
                statusTone={statusTone}
                onOpen={(id) => {
                  setSelectedTask(id);
                  setSection("Task Tracking");
                }}
                onAccept={(id) => {
                  updateTask(id, { status: "Accepted" });
                  flash("Task accepted.");
                }}
              />
            </section>
          )}
          {section === "Task Tracking" && (
            <section className="mt-7">
              <button
                onClick={() => setSection("Assigned Tasks")}
                className="text-sm font-bold text-primary"
              >
                Back to assigned tasks
              </button>
              <div className="mt-3 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                <article className="card-surface p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-primary">
                        {task.id} | {task.category.toUpperCase()}
                      </span>
                      <h2 className="mt-2 text-2xl font-bold">{task.title}</h2>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[task.status]}`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-4 leading-7 text-muted-foreground">{task.description}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Info label="Location" value={task.location} icon={<MapPin size={16} />} />
                    <Info
                      label="GPS location"
                      value={task.coordinates}
                      icon={<Navigation size={16} />}
                    />
                    <Info
                      label="Reported"
                      value={task.reported}
                      icon={<CalendarDays size={16} />}
                    />
                    <Info label="Priority" value={task.priority} icon={<BadgeCheck size={16} />} />
                  </div>
                  <div className="mt-6 rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-bold text-muted-foreground">
                      CITIZEN-PROVIDED INFORMATION
                    </p>
                    <p className="mt-2 text-sm">
                      Attachments and original report media will appear here when connected to the
                      reporting backend.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-lg bg-card px-3 py-2 text-xs font-semibold">
                        <ImageIcon className="mr-1 inline text-primary" size={14} /> Photo evidence
                      </span>
                      <span className="rounded-lg bg-card px-3 py-2 text-xs font-semibold">
                        <Paperclip className="mr-1 inline text-primary" size={14} /> Report details
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {task.status === "Pending" && (
                      <button
                        onClick={() => {
                          updateTask(task.id, { status: "Accepted" });
                          flash("Task accepted successfully.");
                        }}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                      >
                        Accept Task
                      </button>
                    )}
                    {task.status !== "Pending" &&
                      task.status !== "Solved" &&
                      !task.status.includes("Couldn't") && (
                        <>
                          <button
                            onClick={() => setShowAssign(true)}
                            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                          >
                            Assign Students
                          </button>
                          <button
                            onClick={() => updateTask(task.id, { status: "Work in Progress" })}
                            className="rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary"
                          >
                            Mark work in progress
                          </button>
                          <button
                            onClick={() => setShowClose("solved")}
                            className="rounded-lg bg-[#0B5D2A] px-4 py-2.5 text-sm font-bold text-white"
                          >
                            Solved
                          </button>
                          <button
                            onClick={() => setShowClose("failed")}
                            className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-bold text-destructive"
                          >
                            Couldn't Solve
                          </button>
                        </>
                      )}
                    <button
                      onClick={downloadReport}
                      className="rounded-lg border border-input px-4 py-2.5 text-sm font-bold"
                    >
                      <Download className="mr-1 inline" size={16} /> Generate Excel Report
                    </button>
                  </div>
                </article>
                <aside className="space-y-5">
                  <div className="card-surface p-5">
                    <h3 className="font-bold">Task progress</h3>
                    {[
                      "Task Assigned",
                      "Task Accepted",
                      "Students Assigned",
                      "Work in Progress",
                      "Solved / Could Not Solve",
                    ].map((step, index) => {
                      const active =
                        index === 0 ||
                        (index === 1 && task.status !== "Pending") ||
                        (index === 2 && task.students.length > 0) ||
                        (index === 3 && task.status === "Work in Progress") ||
                        (index === 4 &&
                          (task.status === "Solved" || task.status.includes("Couldn't")));
                      return (
                        <div key={step} className="mt-4 flex gap-3">
                          <div
                            className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
                          >
                            {active ? "Done" : index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{step}</p>
                            {active && (
                              <p className="text-xs text-muted-foreground">
                                Updated in this workspace
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="card-surface p-5">
                    <h3 className="font-bold">Assigned students</h3>
                    {task.students.length ? (
                      task.students.map((student, i) => (
                        <div className="mt-3 flex items-center gap-3" key={student}>
                          <div className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                            {student
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{student}</p>
                            <p className="text-xs text-muted-foreground">
                              {i ? "Civil Engineering" : "Electrical Engineering"} | Available
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No students assigned yet.
                      </p>
                    )}
                  </div>
                  <div className="card-surface p-5">
                    <h3 className="font-bold">Reassignment history</h3>
                    <p className="mt-3 text-sm text-muted-foreground">
                      If this organization cannot solve the task, the system records the reason and
                      routes it to the nearest suitable partner based on location, expertise, and
                      availability.
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          )}
          {section === "Reports / Excel Upload" && (
            <section className="mt-7 card-surface p-7">
              <FileSpreadsheet className="text-primary" size={28} />
              <h2 className="mt-4 text-2xl font-bold">Reports & Excel Upload</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Download a structured, Excel-compatible student assignment record for any task or
                upload the final verified report when a task is completed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={downloadReport}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  <Download className="mr-1 inline" size={16} /> Generate Excel Report
                </button>
                <label className="cursor-pointer rounded-lg border border-input px-4 py-2.5 text-sm font-bold">
                  <Upload className="mr-1 inline" size={16} /> Upload final Excel
                  <input
                    onChange={() => flash("Excel report uploaded successfully.")}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                </label>
              </div>
            </section>
          )}
          {section === "Profile" && (
            <section className="mt-7 card-surface max-w-2xl p-7">
              <UserRound className="text-primary" />
              <h2 className="mt-4 text-2xl font-bold">Organization profile</h2>
              <p className="mt-2 text-muted-foreground">
                Keep organization details, expertise, and location current to improve future
                matching and reassignment.
              </p>
              <button
                onClick={() =>
                  flash("Open the registration profile to update organization details.")
                }
                className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Edit organization profile
              </button>
            </section>
          )}
        </main>
      </div>
      {showInstitute && (
        <Modal title="Add / Update Skilled Participants" close={() => setShowInstitute(false)}>
          <label className="block text-sm font-semibold">
            University / Institute Name
            <input
              value={instituteName}
              onChange={(event) => setInstituteName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Current count
              <input
                value={String(institutes.find((item) => item.name === instituteName)?.count ?? 0)}
                readOnly
                className="mt-1.5 w-full rounded-lg border border-input bg-surface p-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              New count
              <input
                type="number"
                min="0"
                value={newCount}
                onChange={(event) => setNewCount(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Date / time of update
            <input
              value={new Date().toLocaleString()}
              readOnly
              className="mt-1.5 w-full rounded-lg border border-input bg-surface p-3 font-normal"
            />
          </label>
          <button
            onClick={saveInstitute}
            className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
          >
            Update Count
          </button>
        </Modal>
      )}
      {showAssign && (
        <Modal title={`Assign students | ${task.id}`} close={() => setShowAssign(false)}>
          <p className="text-sm text-muted-foreground">
            Select available students from your university/institute pool.
          </p>
          {["Aditi Kumari", "Ravi Singh", "Sai Teja"].map((student, index) => (
            <label
              className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
              key={student}
            >
              <input
                type="checkbox"
                defaultChecked={task.students.includes(student)}
                value={student}
              />
              <div className="flex-1">
                <b className="text-sm">{student}</b>
                <p className="text-xs text-muted-foreground">
                  21A01A00{index + 1} | {index === 1 ? "Civil" : index === 2 ? "IT" : "Electrical"}{" "}
                  | {index === 2 ? "XYZ Institute" : "ABC University"}
                </p>
              </div>
              <span className="text-xs font-bold text-[#0B5D2A]">Available</span>
            </label>
          ))}
          <button
            onClick={() => {
              const checks = Array.from(
                document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'),
              )
                .map((input) => input.value)
                .filter((value) => ["Aditi Kumari", "Ravi Singh", "Sai Teja"].includes(value));
              updateTask(task.id, {
                students: checks,
                status: checks.length ? "Students Assigned" : task.status,
              });
              setShowAssign(false);
              flash(`${checks.length} skilled participants assigned.`);
            }}
            className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
          >
            Assign Selected Students
          </button>
        </Modal>
      )}
      {showClose && (
        <Modal
          title={showClose === "solved" ? "Submit completed task" : "Couldn't solve this task"}
          close={() => setShowClose(null)}
        >
          {showClose === "solved" ? (
            <>
              <label className="block text-sm font-semibold">
                Completion date
                <input
                  type="date"
                  className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"
                />
              </label>
              <label className="mt-4 block text-sm font-semibold">
                Work completion remarks
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  className="mt-1.5 min-h-24 w-full rounded-lg border border-input p-3 font-normal"
                  placeholder="Describe completed work and proof provided."
                />
              </label>
              <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-input p-4 text-center text-sm font-semibold">
                <Upload className="mr-1 inline" size={16} /> Upload proof / final Excel
                <input type="file" className="hidden" />
              </label>
              <button
                onClick={() => {
                  updateTask(task.id, { status: "Solved", remarks });
                  setShowClose(null);
                  flash("Completed task submitted. Excel Report uploaded successfully.");
                }}
                className="mt-5 w-full rounded-lg bg-[#0B5D2A] py-3 font-bold text-white"
              >
                Submit Completed Task
              </button>
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                Reason
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 font-normal"
                >
                  {[
                    "Insufficient skilled participants",
                    "Required resources unavailable",
                    "Technical difficulty",
                    "Location/accessibility problem",
                    "Time constraint",
                    "Equipment unavailable",
                    "Safety issue",
                    "Other",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-semibold">
                Additional remarks
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  className="mt-1.5 min-h-24 w-full rounded-lg border border-input p-3 font-normal"
                />
              </label>
              <button
                onClick={() => {
                  updateTask(task.id, {
                    status: "Couldn't Solve - Reassigned",
                    remarks: `${reason}. ${remarks}`,
                  });
                  setShowClose(null);
                  flash(
                    "Task could not be completed. A nearby suitable organization is being notified for reassignment.",
                  );
                }}
                className="mt-5 w-full rounded-lg bg-destructive py-3 font-bold text-destructive-foreground"
              >
                Confirm & Reassign Task
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="dashboard-stat card-surface p-4">
      <div className="flex items-center justify-between">
        <span className="dashboard-stat-icon">{icon}</span>
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg bg-surface p-3">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
function InstituteTable({
  institutes,
  onEdit,
}: {
  institutes: { name: string; count: number; history: string[] }[];
  onEdit: (item: { name: string; count: number }) => void;
}) {
  return (
    <div className="card-surface mt-5 overflow-x-auto">
      <table className="w-full min-w-150 text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-3">UNIVERSITY / INSTITUTE</th>
            <th className="px-5 py-3">SKILLED PARTICIPANTS</th>
            <th className="px-5 py-3">STATUS</th>
            <th className="px-5 py-3">LAST UPDATE</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {institutes.map((item) => (
            <tr className="border-b border-border last:border-0" key={item.name}>
              <td className="px-5 py-4 font-semibold">{item.name}</td>
              <td className="px-5 py-4">{item.count}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-[#EAF7EF] px-2.5 py-1 text-xs font-bold text-[#0B5D2A]">
                  Available
                </span>
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">{item.history[0]}</td>
              <td className="px-5 py-4">
                <button onClick={() => onEdit(item)} className="font-bold text-primary">
                  Modify
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TaskTable({
  tasks,
  statusTone,
  onOpen,
  onAccept,
}: {
  tasks: OrganizationTask[];
  statusTone: Record<OrganizationTaskStatus, string>;
  onOpen: (id: string) => void;
  onAccept: (id: string) => void;
}) {
  return (
    <div className="card-surface mt-5 overflow-x-auto">
      <table className="w-full min-w-200 text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-3">TASK ID</th>
            <th className="px-5 py-3">PROBLEM</th>
            <th className="px-5 py-3">LOCATION</th>
            <th className="px-5 py-3">PRIORITY</th>
            <th className="px-5 py-3">STATUS</th>
            <th className="px-5 py-3">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length ? (
            tasks.map((item) => (
              <tr className="border-b border-border last:border-0" key={item.id}>
                <td className="px-5 py-4 font-bold text-primary">#{item.id.replace("SS-", "")}</td>
                <td className="max-w-72 px-5 py-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.category}</p>
                </td>
                <td className="px-5 py-4">{item.location}</td>
                <td className="px-5 py-4">
                  <span
                    className={`font-bold ${item.priority === "High" ? "text-destructive" : item.priority === "Medium" ? "text-warn" : "text-primary"}`}
                  >
                    {item.priority}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    {item.status === "Pending" && (
                      <button
                        onClick={() => onAccept(item.id)}
                        className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                      >
                        Accept Task
                      </button>
                    )}
                    <button
                      onClick={() => onOpen(item.id)}
                      className="whitespace-nowrap rounded-lg border border-input px-3 py-2 text-xs font-bold"
                    >
                      {item.status === "Pending" ? "View task" : "Track progress"}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                No tasks in this category yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-lift">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={close} className="rounded-lg p-1 text-muted-foreground">
            <XCircle size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type PartnerMember = {
  id: string;
  name: string;
  identifier: string;
  skill: string;
  available: boolean;
};
type PartnerTaskStatus =
  | "Pending"
  | "Accepted"
  | "People Assigned"
  | "Work in Progress"
  | "Solved"
  | "Couldn't Solve - Reassigned";
type PartnerTask = {
  id: string;
  assignmentId?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  coordinates: string;
  reported: string;
  priority: "High" | "Medium" | "Low";
  status: PartnerTaskStatus;
  people: string[];
  taskIds?: string[];
  remarks?: string;
  acceptanceDeadline?: string | null;
  assignedAt?: string;
};

function AcceptanceCountdown({ deadline }: { deadline: string | null | undefined }) {
  const [, tick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => tick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - Date.now();
  const exactDeadline = new Date(deadline).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  if (remaining <= 0) return <span className="text-xs font-bold text-destructive">Response deadline: {exactDeadline}. Reassignment is pending.</span>;
  const hours = Math.floor(remaining / 3_600_000), minutes = Math.floor((remaining % 3_600_000) / 60_000), seconds = Math.floor((remaining % 60_000) / 1000);
  return <span className="text-xs font-bold text-[#0B5D2A]"><Clock3 className="mr-1 inline" size={13} />Respond by {exactDeadline} | {hours}h {minutes}m {seconds}s remaining</span>;
}

function PartnerAnalytics({
  tasks,
  partnerName,
  isNgo,
}: {
  tasks: PartnerTask[];
  partnerName: string;
  isNgo: boolean;
}) {
  const { metrics, months, assignedTotal, solved, unable, inProgress } = useMemo(() => {
    const solved = tasks.filter((task) => task.status === "Solved").length;
    const unable = tasks.filter((task) => task.status.includes("Couldn't")).length;
    const inProgress = tasks.filter((task) => ["Accepted", "People Assigned", "Work in Progress"].includes(task.status)).length;
    const now = new Date();
    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, { month: "short" }),
        value: 0,
      };
    });
    for (const task of tasks) {
      if (!task.assignedAt) continue;
      const assigned = new Date(task.assignedAt);
      if (Number.isNaN(assigned.getTime())) continue;
      const bucket = monthBuckets.find((month) => month.key === `${assigned.getFullYear()}-${assigned.getMonth()}`);
      if (bucket && task.status === "Solved") bucket.value += 1;
    }
    return {
      metrics: [
        { label: "Problems solved", value: solved, color: "bg-[#0B5D2A]" },
        { label: "Could not be solved", value: unable, color: "bg-rose-500" },
        { label: "Currently in progress", value: inProgress, color: "bg-[#0B5D2A]" },
      ],
      months: monthBuckets,
      assignedTotal: tasks.length,
      solved,
      unable,
      inProgress,
    };
  }, [tasks]);
  const maximum = Math.max(assignedTotal, ...metrics.map((metric) => metric.value), 1);
  const completedTotal = solved + unable + inProgress;
  const solvedShare = completedTotal ? (solved / completedTotal) * 100 : 0;
  const unableShare = completedTotal ? (unable / completedTotal) * 100 : 0;
  const trendMaximum = Math.max(...months.map((month) => month.value), 1);

  return (
    <section className="mt-7 card-surface p-5 sm:p-6" aria-label="Live partner analytics">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-primary">LIVE ASSIGNMENT ANALYTICS</p>
          <h2 className="mt-1 text-xl font-bold">{partnerName} {isNgo ? "NGO" : "Organization"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Updates automatically when this account's assignments change.</p>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">Total assigned: {assignedTotal}</span>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-xl bg-surface p-4">
          <h3 className="text-sm font-bold">Assignment status</h3>
          <div className="mt-5 space-y-4">
            {[...metrics, { label: "Total assigned", value: assignedTotal, color: "bg-primary" }].map((metric) => (
              <div key={metric.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span>{metric.label}</span><b>{metric.value}</b></div>
                <div className="h-3 overflow-hidden rounded-full bg-card"><div className={`h-full rounded-full ${metric.color}`} style={{ width: `${(metric.value / maximum) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-surface p-4">
          <h3 className="text-sm font-bold">Solved outcome</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0B5D2A 0 ${solvedShare}%, #B54A4A ${solvedShare}% ${solvedShare + unableShare}%, #DDEBE2 ${solvedShare + unableShare}% 100%)` }}><div className="grid size-20 place-items-center rounded-full bg-card text-center"><b>{solved}</b><span className="text-[10px] text-muted-foreground">solved</span></div></div>
            <div className="text-xs leading-6"><p><span className="mr-2 inline-block size-2 rounded-full bg-[#0B5D2A]" />Solved: <b>{solved}</b></p><p><span className="mr-2 inline-block size-2 rounded-full bg-rose-500" />Could not solve: <b>{unable}</b></p><p><span className="mr-2 inline-block size-2 rounded-full bg-slate-200" />In progress: <b>{inProgress}</b></p></div>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-surface p-4">
        <h3 className="text-sm font-bold">Monthly problems solved</h3>
        <div className="mt-5 flex h-36 items-end justify-between gap-2" role="img" aria-label="Monthly problems solved for the last six months">
          {months.map((month) => <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-1 text-xs font-bold">{month.value}</span><div className="min-h-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (month.value / trendMaximum) * 100)}%` }} /><span className="mt-2 text-xs text-muted-foreground">{month.label}</span></div>)}
        </div>
      </div>
    </section>
  );
}

function PartnerDashboard({
  user,
  partnerIdentity,
  flash,
}: {
  user: User | null;
  partnerIdentity: PartnerIdentity | null;
  flash: (x: string) => void;
}) {
  const isNgo = (partnerIdentity?.organization_type || user?.user_metadata?.["organization_type"]) === "NGO";
  const partnerName = String(
    partnerIdentity?.name || user?.user_metadata?.["display_name"] || (isNgo ? "Community NGO" : "Partner Organization"),
  );
  const singular = isNgo ? "Volunteer" : "Skilled Participant",
    plural = `${singular}s`;
  const getOwnedOrganization = async () => {
    if (partnerIdentity?.id) return { organization: { id: partnerIdentity.id }, error: null };
    if (!user || !supabase) return { organization: null, error: null };
    const { data, error } = await supabase
      .from("organization_accounts")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    return { organization: data, error };
  };
  const [section, setSection] = useState("Dashboard"),
    [selectedId, setSelectedId] = useState("SS-1024"),
    [available, setAvailable] = useState(20),
    [countModal, setCountModal] = useState(false),
    [peopleModal, setPeopleModal] = useState(false),
    [editingMemberId, setEditingMemberId] = useState<string | null>(null),
    [memberName, setMemberName] = useState(""),
    [memberIdentifier, setMemberIdentifier] = useState(""),
    [memberSkill, setMemberSkill] = useState(""),
    [assignModal, setAssignModal] = useState(false),
    [finishModal, setFinishModal] = useState<"solved" | "failed" | null>(null),
    [remarks, setRemarks] = useState(""),
    [reason, setReason] = useState("Required resources unavailable"),
    [completionEvidence, setCompletionEvidence] = useState<File | null>(null),
    [chosen, setChosen] = useState<string[]>([]);
  const [members, setMembers] = useState<PartnerMember[]>([]);
  const [tasks, setTasks] = useState<PartnerTask[]>([]);
  useEffect(() => {
    if (!user || !supabase) return;
    const metadata = user.user_metadata;
    const latitude = Number(metadata["latitude"]);
    const longitude = Number(metadata["longitude"]);
    void supabase
      .from("organization_accounts")
      .upsert(
        {
          owner_id: user.id,
          name: partnerName,
          organization_type: isNgo ? "NGO" : "Organization",
          contact_email: user.email ?? null,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
          expertise: String(metadata["expertise"] || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          capabilities: String(metadata["resources"] || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        { onConflict: "owner_id" },
      )
      .then(({ error }) => {
        if (error) flash(`Could not sync this ${isNgo ? "NGO" : "organization"}: ${error.message}`);
      });
  }, [user, isNgo, partnerName]);
  useEffect(() => {
    const database = supabase;
    if (!user || !database) return;
    const loadMembers = async () => {
      const { organization, error: organizationError } = await getOwnedOrganization();
      if (organizationError || !organization) return;
      const { data, error } = await database
        .from("volunteers")
        .select("id,name,member_identifier,skills,availability")
        .eq("organization_id", organization.id)
        .order("created_at");
      if (error) return flash(`Could not load ${plural.toLowerCase()}: ${error.message}`);
      setMembers(
        ((data ?? []) as Array<any>).map((member) => ({
          id: member.id,
          name: member.name,
          identifier: member.member_identifier ?? "-",
          skill: (member.skills ?? []).join(", ") || "Not specified",
          available: !["unavailable", "busy", "inactive", "off"].includes(String(member.availability ?? "available").toLowerCase()),
        })),
      );
    };
    void loadMembers();
  }, [user, partnerIdentity?.id, flash, plural]);
  useEffect(() => {
    const database = supabase;
    if (!user || !database) return;
    let channel: ReturnType<typeof database.channel> | undefined;
    const statusFor = (status: string): PartnerTaskStatus =>
      status === "pending"
        ? "Pending"
        : status === "accepted"
          ? "Accepted"
        : status === "in_progress"
          ? "Work in Progress"
          : status === "completed" || status === "verified"
            ? "Solved"
            : "Couldn't Solve - Reassigned";
    const loadAssignedTasks = async () => {
      const { organization, error: orgError } = await getOwnedOrganization();
      if (orgError || !organization) return;
      const { data, error } = await database
        .from("problem_assignments")
        .select(
          "id,status,unable_reason,completion_note,created_at,acceptance_deadline,challenges(public_id,title,summary,domain,district,locality,public_latitude,public_longitude,priority_score),problem_tasks(id,volunteer_id,volunteers(name))",
        )
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) {
        flash(`Could not sync assigned tasks: ${error.message}`);
        return;
      }
      setTasks(
        ((data ?? []) as Array<any>).map((assignment) => {
          const challenge = assignment.challenges;
          const priority = Number(challenge?.priority_score ?? 0);
          return {
            id: challenge?.public_id ?? assignment.id,
            assignmentId: assignment.id,
            title: challenge?.title ?? "Assigned community problem",
            description: challenge?.summary ?? "Problem details are available in the task record.",
            category: challenge?.domain ?? "Community service",
            location: challenge?.locality || challenge?.district || "Location pending",
            coordinates:
              challenge?.public_latitude != null && challenge?.public_longitude != null
                ? `${challenge.public_latitude}, ${challenge.public_longitude}`
                : "GPS not available",
            reported: new Date(assignment.created_at).toLocaleString(),
            priority: priority >= 75 ? "High" : priority >= 45 ? "Medium" : "Low",
            status: statusFor(assignment.status),
            people: (assignment.problem_tasks ?? []).map((item: any) => item.volunteers?.name).filter(Boolean),
            taskIds: (assignment.problem_tasks ?? []).map((item: any) => item.id),
            remarks: assignment.completion_note ?? assignment.unable_reason ?? undefined,
            acceptanceDeadline: assignment.acceptance_deadline,
            assignedAt: assignment.created_at,
          };
        }),
      );
      if (!channel) {
        channel = database
          .channel(`partner-assignments-${organization.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "problem_assignments",
              filter: `organization_id=eq.${organization.id}`,
            },
            () => void loadAssignedTasks(),
          )
          .subscribe();
      }
    };
    void loadAssignedTasks();
    return () => {
      if (channel) void database.removeChannel(channel);
    };
  }, [user, partnerIdentity?.id, flash]);
  if (!user) return <Forbidden />;
  const task: PartnerTask =
    tasks.find((item) => item.id === selectedId) ??
    tasks[0] ?? {
      id: "no-assignment",
      title: "No assigned tasks",
      description: "New algorithmic assignments will appear here automatically.",
      category: "Community service",
      location: "-",
      coordinates: "-",
      reported: "-",
      priority: "Low",
      status: "Pending",
      people: [],
    };
  const update = (id: string, patch: Partial<PartnerTask>) => {
    const existing = tasks.find((item) => item.id === id);
    setTasks((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    if (!existing?.assignmentId || !patch.status || !supabase) return;
    const status = patch.status === "Pending" ? "pending" : patch.status === "Accepted" ? "accepted" : patch.status === "Solved" ? "completed" : patch.status.includes("Couldn't") ? "unable_to_resolve" : "in_progress";
    void supabase
      .rpc("mark_assignment_progress", { assignment_uuid: existing.assignmentId, next_status: status, progress_note: patch.remarks ?? null })
      .then(({ error }) => error && flash(`Could not sync task update: ${error.message}`));
  };
  const open = (id: string) => {
    setSelectedId(id);
    setSection("Task Details");
  };
  const openMemberForm = (member?: PartnerMember) => {
    setEditingMemberId(member?.id ?? null);
    setMemberName(member?.name ?? "");
    setMemberIdentifier(member?.identifier ?? "");
    setMemberSkill(member?.skill ?? "");
    setPeopleModal(true);
  };
  const saveMember = async () => {
    if (!memberName.trim() || !memberIdentifier.trim() || !memberSkill.trim()) {
      flash(`Enter the ${singular.toLowerCase()}'s name, ID, and skill.`);
      return;
    }
    if (!user || !supabase) return;
    const { organization, error: organizationError } = await getOwnedOrganization();
    if (organizationError || !organization) return flash("Your organization profile is still being prepared. Please retry.");
    const record = {
      name: memberName.trim(),
      member_identifier: memberIdentifier.trim(),
      skills: memberSkill.split(",").map((skill) => skill.trim()).filter(Boolean),
      availability: "available",
      updated_at: new Date().toISOString(),
    };
    if (editingMemberId) {
      const { error } = await supabase.from("volunteers").update(record).eq("id", editingMemberId);
      if (error) return flash(error.message);
      setMembers((items) => items.map((item) => item.id === editingMemberId ? { ...item, name: record.name, identifier: record.member_identifier, skill: record.skills.join(", ") } : item));
      flash(`${singular} updated.`);
    } else {
      const { data, error } = await supabase.from("volunteers").insert({ ...record, organization_id: organization.id }).select("id").single();
      if (error || !data) return flash(error?.message ?? `Could not add ${singular.toLowerCase()}.`);
      setMembers((items) => [...items, { id: data.id, name: record.name, identifier: record.member_identifier, skill: record.skills.join(", "), available: true }]);
      flash(`${singular} added.`);
    }
    setPeopleModal(false);
  };
  const tone = (s: PartnerTaskStatus) =>
    s === "Solved"
      ? "bg-[#0B5D2A] text-white"
      : s.includes("Couldn't")
        ? "bg-rose-100 text-rose-800"
        : s === "Pending"
          ? "bg-[#F6FBF8] text-[#0B5D2A]"
          : "bg-[#EAF7EF] text-[#0B5D2A]";
  const filtered =
    section === "Active Tasks"
      ? tasks.filter((t) => ["Accepted", "People Assigned", "Work in Progress"].includes(t.status))
      : section === "Completed Tasks"
        ? tasks.filter((t) => t.status === "Solved")
        : section === "Couldn't Solve"
          ? tasks.filter((t) => t.status.includes("Couldn't"))
          : tasks;
  const excel = () => {
    const rows = [
      [
        "Task ID",
        "Problem title",
        "Problem location",
        "Organization name",
        "Student full name",
        "Roll number",
        "Skill",
        "Assignment date",
        "Task status",
        "Remarks",
      ],
      ...task.people.map((name) => {
        const p = members.find((m) => m.name === name);
        return [
          task.id,
          task.title,
          task.location,
          partnerName,
          name,
          p?.identifier ?? "",
          p?.skill ?? "",
          new Date().toLocaleDateString(),
          task.status,
          task.remarks ?? "",
        ];
      }),
    ];
    const blob = new Blob(
      [
        rows
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n"),
      ],
      { type: "text/csv" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${task.id}-participant-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    flash("Excel-compatible participant report downloaded.");
  };
  const nav = [
    "Dashboard",
    plural,
    "Assigned Tasks",
    "Active Tasks",
    "Completed Tasks",
    "Couldn't Solve",
  ];
  return (
    <div className="dashboard-shell min-h-screen bg-surface">
      <div className="dashboard-frame mx-auto flex max-w-[1600px]">
        <aside className="app-sidebar sticky top-0 hidden h-screen w-68 shrink-0 border-r border-border bg-card p-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Building2 size={20} />
            </div>
            <div>
              <b>SamajSetu</b>
              <p className="text-xs text-muted-foreground">
                {isNgo ? "NGO portal" : "Organization portal"}
              </p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {nav.map((item) => (
              <button
                key={item}
                onClick={() => setSection(item === plural ? "People" : item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === (item === plural ? "People" : item) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface"}`}
              >
                {item === "Dashboard" ? (
                  <LayoutDashboard size={17} />
                ) : item === plural ? (
                  <Users size={17} />
                ) : (
                  <ClipboardCheck size={17} />
                )}{" "}
                {item}
              </button>
            ))}
          </nav>
        </aside>
        <main className="dashboard-main min-w-0 flex-1 p-4 sm:p-7">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">
                {isNgo ? "NGO" : "ORGANIZATION"} WORKSPACE
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome, {partnerName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Logged in as: {partnerName}</p>
            </div>
            <button
              onClick={() => setCountModal(true)}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Update {isNgo ? "Volunteer" : "Participant"} Count
            </button>
          </header>
          {section === "Dashboard" && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                <DashboardStat
                  label={`Total ${plural}`}
                  value={members.length}
                  icon={<Users size={18} />}
                />
                <DashboardStat
                  label={`Currently Available ${plural}`}
                  value={members.filter((member) => member.available).length}
                  icon={<BadgeCheck size={18} />}
                />
                <DashboardStat
                  label="Total Problems Assigned"
                  value={tasks.length}
                  icon={<ClipboardCheck size={18} />}
                />
                <DashboardStat
                  label="Active Tasks"
                  value={
                    tasks.filter((t) =>
                      ["Accepted", "People Assigned", "Work in Progress"].includes(t.status),
                    ).length
                  }
                  icon={<Activity size={18} />}
                />
                <DashboardStat
                  label="Pending Tasks"
                  value={tasks.filter((t) => t.status === "Pending").length}
                  icon={<Clock3 size={18} />}
                />
                <DashboardStat
                  label="Completed Tasks"
                  value={tasks.filter((t) => t.status === "Solved").length}
                  icon={<CheckCircle2 size={18} />}
                />
                <DashboardStat
                  label="Couldn't Solve"
                  value={tasks.filter((t) => t.status.includes("Couldn't")).length}
                  icon={<XCircle size={18} />}
                />
                <DashboardStat
                  label="Reassigned Tasks"
                  value={tasks.filter((t) => t.status.includes("Couldn't")).length}
                  icon={<Repeat2 size={18} />}
                />
              </div>
              <PartnerAnalytics tasks={tasks} partnerName={partnerName} isNgo={isNgo} />
              <h2 className="mt-8 text-xl font-bold">Recent Assigned Tasks</h2>
              <PartnerTaskCards
                tasks={tasks.filter((task) => task.status !== "Solved")}
                tone={tone}
                open={open}
                accept={(id) => {
                  update(id, { status: "Accepted" });
                  flash("Task accepted. Assign your available team next.");
                }}
              />
            </>
          )}
          {section === "People" && (
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{plural}</h2>
                  <p className="mt-1 text-muted-foreground">
                    Only this account's {plural.toLowerCase()} are visible and manageable here.
                  </p>
                </div>
                <button
                  onClick={() => openMemberForm()}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Add {singular}
                </button>
              </div>
              <div className="mt-5 overflow-x-auto card-surface">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead className="bg-surface text-xs text-muted-foreground">
                    <tr>
                      <th className="p-4">FULL NAME</th>
                      <th className="p-4">{isNgo ? "VOLUNTEER ID" : "ROLL / PARTICIPANT ID"}</th>
                      <th className="p-4">SKILL</th>
                      <th className="p-4">AVAILABILITY</th>
                      <th className="p-4">ASSIGNMENT STATUS</th>
                      <th className="p-4">MANAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="p-4 font-semibold">{m.name}</td>
                        <td className="p-4">{m.identifier}</td>
                        <td className="p-4">{m.skill}</td>
                        <td className="p-4">
                          <button
                            onClick={() => void supabase!.from("volunteers").update({ availability: m.available ? "unavailable" : "available", updated_at: new Date().toISOString() }).eq("id", m.id).then(({ error }) => {
                              if (error) flash(error.message);
                              else setMembers((all) => all.map((x) => x.id === m.id ? { ...x, available: !x.available } : x));
                            })}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.available ? "bg-[#EAF7EF] text-[#0B5D2A]" : "bg-slate-100 text-slate-700"}`}
                          >
                            {m.available ? "Available" : "Unavailable"}
                          </button>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {tasks.some((t) => t.people.includes(m.name))
                            ? "Assigned"
                            : "Not assigned"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-3 text-xs font-bold">
                            <button onClick={() => openMemberForm(m)} className="text-primary">
                              Edit
                            </button>
                            <button
                              onClick={() => void supabase!.from("volunteers").delete().eq("id", m.id).then(({ error }) => {
                                if (error) flash(error.message);
                                else { setMembers((all) => all.filter((item) => item.id !== m.id)); flash(`${singular} removed.`); }
                              })}
                              className="text-destructive"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {["Assigned Tasks", "Active Tasks", "Completed Tasks", "Couldn't Solve"].includes(
            section,
          ) && (
            <section className="mt-7">
              <h2 className="text-2xl font-bold">{section}</h2>
              <p className="mt-2 text-muted-foreground">
                Every task includes the complete report, priority, location, GPS coordinates, and
                submitted attachments.
              </p>
              <PartnerTaskCards
                tasks={filtered}
                tone={tone}
                open={open}
                accept={(id) => {
                  update(id, { status: "Accepted" });
                  flash("Task accepted.");
                }}
              />
            </section>
          )}
          {section === "Task Details" && (
            <section className="mt-7">
              <button
                onClick={() => setSection("Assigned Tasks")}
                className="text-sm font-bold text-primary"
              >
                Back to assigned tasks
              </button>
              <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                <article className="card-surface p-6">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {task.id} | {task.category.toUpperCase()}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">{task.title}</h2>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${tone(task.status)}`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <h3 className="mt-7 font-bold">Problem Information</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{task.description}</p>
                  {task.status === "Pending" && <div className="mt-4 rounded-lg border border-[#DDEBE2] bg-[#F6FBF8] p-3"><p className="text-sm font-bold">Task acceptance deadline</p><p className="mt-1"><AcceptanceCountdown deadline={task.acceptanceDeadline} /></p></div>}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Info
                      label="Problem location"
                      value={task.location}
                      icon={<MapPin size={16} />}
                    />
                    <Info
                      label="Latitude / Longitude / GPS"
                      value={task.coordinates}
                      icon={<Navigation size={16} />}
                    />
                    <Info
                      label="Date / time reported"
                      value={task.reported}
                      icon={<CalendarDays size={16} />}
                    />
                    <Info label="Priority" value={task.priority} icon={<BadgeCheck size={16} />} />
                  </div>
                  <div className="mt-5 rounded-xl bg-surface p-4">
                    <b className="text-sm">Attachments & additional information</b>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Photo, video, document evidence and all reporter-provided information are
                      retained with this task.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {task.status === "Pending" && (
                      <button
                        onClick={() => update(task.id, { status: "Accepted" })}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                      >
                        Accept Task
                      </button>
                    )}
                    {!["Pending", "Solved"].includes(task.status) &&
                      !task.status.includes("Couldn't") && (
                        <>
                          <button
                            onClick={() => {
                              setChosen(task.people);
                              setAssignModal(true);
                            }}
                            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                          >
                            Assign {plural}
                          </button>
                          <button
                            onClick={() => update(task.id, { status: "Work in Progress" })}
                            className="rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary"
                          >
                            Work in Progress
                          </button>
                          <button
                            onClick={() => setFinishModal("solved")}
                            className="rounded-lg bg-[#0B5D2A] px-4 py-2.5 text-sm font-bold text-white"
                          >
                            Solved
                          </button>
                          <button
                            onClick={() => setFinishModal("failed")}
                            className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-bold text-destructive"
                          >
                            Couldn't Solve
                          </button>
                        </>
                      )}
                    {!isNgo && (
                      <button
                        onClick={excel}
                        className="rounded-lg border border-input px-4 py-2.5 text-sm font-bold"
                      >
                        <Download className="mr-1 inline" size={16} /> Generate Excel Report
                      </button>
                    )}
                  </div>
                </article>
                <aside className="space-y-5">
                  <div className="card-surface p-5">
                    <h3 className="font-bold">Progress timeline</h3>
                    {[
                      "Task Assigned",
                      "Task Accepted",
                      `${plural} Assigned`,
                      "Work in Progress",
                      "Solved / Couldn't Solve",
                    ].map((step, i) => (
                      <div key={step} className="mt-4 flex gap-3">
                        <div
                          className={`grid size-6 place-items-center rounded-full text-xs font-bold ${i === 0 || (i === 1 && task.status !== "Pending") || (i === 2 && task.people.length) || (i === 3 && task.status === "Work in Progress") || (i === 4 && (task.status === "Solved" || task.status.includes("Couldn't"))) ? "bg-primary text-primary-foreground" : "bg-surface"}`}
                        >
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="card-surface p-5">
                    <h3 className="font-bold">Assigned {plural}</h3>
                    {task.people.length ? (
                      task.people.map((name) => (
                        <p
                          key={name}
                          className="mt-3 rounded-lg bg-surface p-3 text-sm font-semibold"
                        >
                          {name}
                        </p>
                      ))
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No {plural.toLowerCase()} assigned yet.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          )}
        </main>
      </div>
      {countModal && (
        <Modal
          title={`Update ${isNgo ? "Volunteer" : "Participant"} Count`}
          close={() => setCountModal(false)}
        >
          <p className="text-sm text-muted-foreground">
            Set the number currently available. You can increase or decrease it anytime.
          </p>
          <input
            autoFocus
            type="number"
            min="0"
            defaultValue={available}
            onChange={(e) => setAvailable(Number(e.target.value || 0))}
            className="mt-4 w-full rounded-lg border border-input p-3"
          />
          <button
            onClick={() => {
              setCountModal(false);
              flash(`Available ${isNgo ? "volunteer" : "participant"} count updated.`);
            }}
            className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
          >
            Update Count
          </button>
        </Modal>
      )}
      {peopleModal && (
        <Modal
          title={`${editingMemberId ? "Edit" : "Add"} ${singular}`}
          close={() => setPeopleModal(false)}
        >
          <p className="text-sm text-muted-foreground">
            This member will belong only to {partnerName}.
          </p>
          <input
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Full name"
            className="mt-4 w-full rounded-lg border border-input p-3"
          />
          <input
            value={memberIdentifier}
            onChange={(event) => setMemberIdentifier(event.target.value)}
            placeholder={isNgo ? "Volunteer ID" : "Roll number / Participant ID"}
            className="mt-3 w-full rounded-lg border border-input p-3"
          />
          <input
            value={memberSkill}
            onChange={(event) => setMemberSkill(event.target.value)}
            placeholder="Area of skill / expertise"
            className="mt-3 w-full rounded-lg border border-input p-3"
          />
          <button
            onClick={() => void saveMember()}
            className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
          >
            {editingMemberId ? `Save ${singular}` : `Add ${singular}`}
          </button>
        </Modal>
      )}
      {assignModal && (
        <Modal title={`Assign ${plural} | ${task.id}`} close={() => setAssignModal(false)}>
          {members
            .filter((m) => m.available)
            .map((m) => (
              <label
                key={m.id}
                className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(m.name)}
                  onChange={() =>
                    setChosen((items) =>
                      items.includes(m.name)
                        ? items.filter((x) => x !== m.name)
                        : [...items, m.name],
                    )
                  }
                />
                <div>
                  <b className="text-sm">{m.name}</b>
                  <p className="text-xs text-muted-foreground">
                    {m.identifier} | {m.skill} | Available
                  </p>
                </div>
              </label>
            ))}
          <button
            onClick={() => void (async () => {
              if (!task.assignmentId || !supabase) return flash("This task is not available for assignment.");
              const participantIds = members.filter((member) => chosen.includes(member.name)).map((member) => member.id);
              const { error } = await supabase.rpc("set_assignment_participants", { assignment_uuid: task.assignmentId, volunteer_uuids: participantIds });
              if (error) return flash(error.message);
              setTasks((items) => items.map((item) => item.id === task.id ? { ...item, people: chosen, status: chosen.length ? "People Assigned" : item.status } : item));
              setAssignModal(false);
              flash(`${chosen.length} ${plural.toLowerCase()} assigned.`);
            })()}
            className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground"
          >
            Assign Selected {plural}
          </button>
        </Modal>
      )}
      {finishModal && (
        <Modal
          title={
            finishModal === "solved"
              ? "Submit completed task"
              : "Why couldn't this task be completed?"
          }
          close={() => setFinishModal(null)}
        >
          {finishModal === "solved" ? (
            <>
              <input type="date" className="mt-4 w-full rounded-lg border border-input p-3" />
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Completion remarks"
                className="mt-4 min-h-24 w-full rounded-lg border border-input p-3"
              />
              <label className="mt-4 block rounded-lg border border-dashed border-input p-3 text-sm font-semibold">
                <Upload className="mr-1 inline" size={16} /> Upload proof / documents
                {!isNgo && " / Excel report"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" onChange={(event) => setCompletionEvidence(event.target.files?.[0] ?? null)} className="hidden" />
              </label>
              {completionEvidence && <p className="mt-2 text-xs text-muted-foreground">Ready to upload: {completionEvidence.name}</p>}
              <button
                onClick={() => void (async () => {
                  if (!task.assignmentId || !supabase || !user) return flash("This task is no longer available.");
                  if (completionEvidence && completionEvidence.size > 26214400) return flash("Evidence files must be 25 MB or smaller.");
                  if (completionEvidence && !task.taskIds?.[0]) return flash("Assign at least one participant before uploading task evidence.");
                  const { error: progressError } = await supabase.rpc("mark_assignment_progress", { assignment_uuid: task.assignmentId, next_status: "completed", progress_note: remarks || null });
                  if (progressError) return flash(progressError.message);
                  const taskId = task.taskIds?.[0];
                  if (completionEvidence && taskId) {
                    const extension = completionEvidence.name.split(".").pop() || "bin";
                    const path = `${user.id}/${taskId}/${Date.now()}-completion.${extension}`;
                    const { error: uploadError } = await supabase.storage.from("task-evidence").upload(path, completionEvidence, { contentType: completionEvidence.type, upsert: false });
                    if (uploadError) return flash(`Task was completed, but evidence upload failed: ${uploadError.message}`);
                    const { error: evidenceError } = await supabase.from("task_evidence").insert({ task_id: taskId, storage_path: path, mime_type: completionEvidence.type, note: remarks || null, evidence_kind: "completion", size_bytes: completionEvidence.size, uploaded_by: user.id });
                    if (evidenceError) return flash(`Task was completed, but evidence metadata could not be saved: ${evidenceError.message}`);
                  }
                  setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: "Solved", remarks } : item));
                  setCompletionEvidence(null);
                  setFinishModal(null);
                  flash("Task marked SOLVED and completion evidence saved.");
                })()}
                className="mt-5 w-full rounded-lg bg-[#0B5D2A] py-3 font-bold text-white"
              >
                Submit Completed Task
              </button>
            </>
          ) : (
            <>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-4 w-full rounded-lg border border-input p-3"
              >
                {[
                  "Required resources unavailable",
                  `Insufficient ${plural.toLowerCase()}`,
                  "Technical difficulty",
                  "Equipment unavailable",
                  "Accessibility / location issue",
                  "Time constraint",
                  "Other",
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional remarks"
                className="mt-4 min-h-24 w-full rounded-lg border border-input p-3"
              />
              <button
                onClick={() => {
                  update(task.id, {
                    status: "Couldn't Solve - Reassigned",
                    remarks: `${reason}. ${remarks}`,
                  });
                  setFinishModal(null);
                  flash(
                    "Task could not be completed. A suitable nearby partner is being found for reassignment.",
                  );
                }}
                className="mt-5 w-full rounded-lg bg-destructive py-3 font-bold text-destructive-foreground"
              >
                Confirm & Reassign Task
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function PartnerTaskCards({
  tasks,
  tone,
  open,
  accept,
}: {
  tasks: PartnerTask[];
  tone: (status: PartnerTaskStatus) => string;
  open: (id: string) => void;
  accept: (id: string) => void;
}) {
  return (
    <div className="mt-5 space-y-3">
      {tasks.length ? (
        tasks.map((task) => (
          <article
            key={task.id}
            className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                {task.id} | {task.category}
              </p>
              <h3 className="mt-1 font-bold">{task.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{task.description}</p>
              {task.status === "Pending" && <p className="mt-2"><AcceptanceCountdown deadline={task.acceptanceDeadline} /></p>}
              <p className="mt-2 text-xs text-muted-foreground">
                <MapPin className="mr-1 inline" size={13} />
                {task.location} | GPS {task.coordinates} | {task.reported}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone(task.status)}`}>
                {task.status}
              </span>
              {task.status === "Pending" && (
                <button
                  onClick={() => accept(task.id)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  Accept Task
                </button>
              )}
              <button
                onClick={() => open(task.id)}
                className="rounded-lg border border-input px-3 py-2 text-xs font-bold"
              >
                View details
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="card-surface p-8 text-center text-muted-foreground">
          No tasks in this category yet.
        </p>
      )}
    </div>
  );
}

function CoordinatorDashboard({ user, flash }: { user: User | null; flash: (x: string) => void }) {
  const [tab, setTab] = useState<"problems" | "people" | "review">("problems");
  const [showTask, setShowTask] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [reason, setReason] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [tasks, setTasks] = useState([
    {
      id: "task-1",
      title: "Survey affected households",
      person: "Aditi Kumari",
      status: "In Progress",
      deadline: "12 Sep",
    },
    {
      id: "task-2",
      title: "Document water-quality evidence",
      person: "Ravi Singh",
      status: "Pending",
      deadline: "14 Sep",
    },
  ]);
  if (!user) return <Forbidden />;
  const createTask = () => {
    if (!taskDescription.trim()) return;
    setTasks((items) => [
      ...items,
      {
        id: String(Date.now()),
        title: taskDescription,
        person: "Select from team",
        status: "Pending",
        deadline: deadline || "No deadline",
      },
    ]);
    setTaskDescription("");
    setDeadline("");
    setShowTask(false);
    flash("Task created and ready to assign.");
  };
  return (
    <section className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            SPO / COORDINATOR WORKSPACE
          </span>
          <h1 className="mt-4 text-3xl font-bold">Community response dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Match local problems with your institution's skills, people, and resources.
          </p>
        </div>
        <button
          onClick={() => setShowTask(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
        >
          <Plus size={17} /> Create task
        </button>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        <Stat n="04" t="Active problems" />
        <Stat n="12" t="Available volunteers" />
        <Stat n={tasks.filter((t) => t.status === "In Progress").length} t="Work in progress" />
        <Stat n="08" t="Verified resolutions" />
      </div>
      <div className="mt-8 flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("problems")}
          className={`px-4 py-3 text-sm font-bold ${tab === "problems" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Assigned problems
        </button>
        <button
          onClick={() => setTab("people")}
          className={`px-4 py-3 text-sm font-bold ${tab === "people" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Students & volunteers
        </button>
        <button
          onClick={() => setTab("review")}
          className={`px-4 py-3 text-sm font-bold ${tab === "review" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Evidence review
        </button>
      </div>
      {tab === "problems" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="card-surface p-6">
            <div className="flex justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-primary">SS-2026-0041 | WATER</span>
                <h2 className="mt-2 text-xl font-bold">Unsafe drinking water near Ward 5</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  <MapPin className="mr-1 inline" size={14} /> Ranchi | 1.2 km away | 48 residents
                  affected
                </p>
              </div>
              <span className="h-fit rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-warn">
                In progress
              </span>
            </div>
            <div className="mt-5 rounded-xl bg-surface p-4">
              <p className="text-xs font-bold text-muted-foreground">REQUIRED SKILLS</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">
                  Water testing
                </span>
                <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">
                  Field survey
                </span>
                <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">
                  Documentation
                </span>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <b className="text-sm">{t.title}</b>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.person} | due {t.deadline}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${t.status === "In Progress" ? "bg-primary-soft text-primary" : "bg-surface text-muted-foreground"}`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <aside className="card-surface p-6">
            <h2 className="font-bold">Escalate if needed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Transfer the complete history and evidence to a better-matched partner.
            </p>
            {escalating ? (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why can your organization not resolve this?"
                  className="mt-4 min-h-24 w-full rounded-lg border border-input p-3 text-sm"
                />
                <button
                  onClick={() => {
                    setEscalating(false);
                    setReason("");
                    flash("Suitable organizations recommended; transfer is ready for acceptance.");
                  }}
                  disabled={!reason.trim()}
                  className="mt-3 w-full rounded-lg bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                >
                  Find suitable organization
                </button>
              </>
            ) : (
              <button
                onClick={() => setEscalating(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm font-bold text-destructive"
              >
                <XCircle size={16} /> Unable to resolve
              </button>
            )}
            <div className="mt-5 rounded-lg bg-accent-soft p-3 text-xs text-accent">
              <Sparkles className="mr-1 inline" size={14} /> Suggested partner: Jharkhand Water
              Initiative - field lab and repair team available.
            </div>
          </aside>
        </div>
      )}
      {tab === "people" && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="card-surface p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">
                AK
              </div>
              <div>
                <b>Aditi Kumari</b>
                <p className="text-xs text-muted-foreground">Environmental Engineering</p>
              </div>
            </div>
            <p className="mt-4 text-sm">Water testing | Field survey | Available this week</p>
          </div>
          <div className="card-surface p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-accent-soft font-bold text-accent">
                RS
              </div>
              <div>
                <b>Ravi Singh</b>
                <p className="text-xs text-muted-foreground">Civil Engineering</p>
              </div>
            </div>
            <p className="mt-4 text-sm">Documentation | GIS mapping | Available weekends</p>
          </div>
          <label className="card-surface grid cursor-pointer place-items-center p-5 text-center">
            <FileSpreadsheet className="text-primary" />
            <b className="mt-3">Bulk upload students</b>
            <span className="mt-1 text-xs text-muted-foreground">
              Upload an Excel (.xlsx or .csv) roster
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={() =>
                flash("Roster selected. Review and import records to complete upload.")
              }
            />
          </label>
        </div>
      )}
      {tab === "review" && (
        <div className="mt-6 card-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-primary">TASK EVIDENCE SUBMITTED</span>
              <h2 className="mt-2 text-xl font-bold">Household survey and water samples</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted by Aditi Kumari | Photos, sample sheet, and completion notes attached.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => flash("Changes requested from the assigned volunteer.")}
                className="rounded-lg border border-input px-3 py-2 text-sm font-bold"
              >
                Request changes
              </button>
              <button
                onClick={() => flash("Evidence verified. The problem has been marked resolved.")}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground"
              >
                <CheckCircle2 className="mr-1 inline" size={16} /> Verify & resolve
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-lg bg-surface px-3 py-2 text-sm">
              <ImageIcon className="mr-1 inline text-primary" size={15} /> 4 field photos
            </span>
            <span className="rounded-lg bg-surface px-3 py-2 text-sm">
              <Paperclip className="mr-1 inline text-primary" size={15} /> water-sample.pdf
            </span>
            <span className="rounded-lg bg-surface px-3 py-2 text-sm">
              <BadgeCheck className="mr-1 inline text-primary" size={15} /> Completion notes
            </span>
          </div>
        </div>
      )}
      {showTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create and assign task</h2>
              <button onClick={() => setShowTask(false)}>
                <XCircle className="text-muted-foreground" />
              </button>
            </div>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Task description"
              className="mt-5 min-h-28 w-full rounded-lg border border-input p-3"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-input p-3">
                <option>Assign to: Aditi Kumari</option>
                <option>Assign to: Ravi Singh</option>
              </select>
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                type="date"
                className="rounded-lg border border-input p-3"
              />
            </div>
            <button
              onClick={createTask}
              disabled={!taskDescription.trim()}
              className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              Create task
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CoordinatorDashboardLegacy({
  user,
  flash,
}: {
  user: User | null;
  flash: (x: string) => void;
}) {
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null),
    [people, setPeople] = useState<{ id: string; name: string; skills: string[] }[]>([]),
    [challenges, setChallenges] = useState<Challenge[]>([]),
    [name, setName] = useState(""),
    [skills, setSkills] = useState(""),
    [task, setTask] = useState(""),
    [selectedChallenge, setSelectedChallenge] = useState(""),
    [selectedPerson, setSelectedPerson] = useState("");
  const load = async () => {
    if (!user || !supabase) return;
    const [{ data: organization }, { data: challengeData }] = await Promise.all([
      supabase
        .from("organization_accounts")
        .select("id,name")
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase.rpc("search_challenges", { search_text: "" }),
    ]);
    setOrg(organization);
    setChallenges((challengeData ?? []) as Challenge[]);
    if (organization) {
      const { data } = await supabase
        .from("volunteers")
        .select("id,name,skills")
        .eq("organization_id", organization.id);
      setPeople(data ?? []);
    }
  };
  useEffect(() => {
    void load();
  }, [user]);
  if (!user) return <Forbidden />;
  if (!org)
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl font-bold">Coordinator dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Register your institution or NGO before managing work.
        </p>
      </section>
    );
  const addPerson = async () => {
    const { error } = await supabase!.from("volunteers").insert({
      organization_id: org.id,
      name,
      skills: skills
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    if (error) flash(error.message);
    else {
      setName("");
      setSkills("");
      void load();
    }
  };
  const assign = async () => {
    const { data: assignment, error } = await supabase!
      .from("problem_assignments")
      .insert({
        challenge_id: selectedChallenge,
        organization_id: org.id,
        assigned_by: user.id,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (error || !assignment) {
      flash(error?.message ?? "Could not assign problem.");
      return;
    }
    const { error: taskError } = await supabase!.from("problem_tasks").insert({
      assignment_id: assignment.id,
      volunteer_id: selectedPerson || null,
      description: task,
      status: "pending",
    });
    if (taskError) flash(taskError.message);
    else {
      setTask("");
      flash("Task assigned.");
    }
  };
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl font-bold">{org.name} coordinator dashboard</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-bold">Students & volunteers</h2>
          <div className="mt-3 grid gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded border border-input p-2"
            />
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Skills (comma separated)"
              className="rounded border border-input p-2"
            />
            <button
              onClick={() => void addPerson()}
              className="rounded bg-primary p-2 font-bold text-primary-foreground"
            >
              Add person
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {people.map((person) => (
              <p key={person.id} className="rounded bg-surface p-2">
                <b>{person.name}</b> | {person.skills.join(", ")}
              </p>
            ))}
          </div>
        </div>
        <div className="card-surface p-5">
          <h2 className="font-bold">Assign a community problem</h2>
          <div className="mt-3 grid gap-2">
            <select
              value={selectedChallenge}
              onChange={(e) => setSelectedChallenge(e.target.value)}
              className="rounded border border-input p-2"
            >
              <option value="">Choose a problem</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.public_id} - {c.title}
                </option>
              ))}
            </select>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="rounded border border-input p-2"
            >
              <option value="">Choose a person</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Task description"
              className="rounded border border-input p-2"
            />
            <button
              disabled={!selectedChallenge || !task}
              onClick={() => void assign()}
              className="rounded bg-primary p-2 font-bold text-primary-foreground disabled:opacity-50"
            >
              Create assignment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function VolunteerDashboard({ user }: { user: User | null }) {
  if (!user) return <Forbidden />;
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl font-bold">Volunteer workspace</h1>
      <p className="mt-3 text-muted-foreground">
        Discover challenges, join a response team, and track your contribution.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <b>Find challenges</b>
          <p className="mt-2 text-sm text-muted-foreground">Explore verified community problems.</p>
        </div>
        <div className="card-surface p-5">
          <b>My assignments</b>
          <p className="mt-2 text-sm text-muted-foreground">
            Assignments from partner organizations will appear here.
          </p>
        </div>
        <div className="card-surface p-5">
          <b>Impact</b>
          <p className="mt-2 text-sm text-muted-foreground">Track outcomes you help deliver.</p>
        </div>
      </div>
    </section>
  );
}

function FundingTransparency({ user, profile, flash, embedded = false }: { user: User | null; profile: Profile | null; flash: (message: string) => void; embedded?: boolean }) {
  const admin = !embedded && profile?.role === "admin";
  const [sources, setSources] = useState<any[]>([]), [transactions, setTransactions] = useState<any[]>([]), [projects, setProjects] = useState<any[]>([]);
  const [category, setCategory] = useState("government"), [donor, setDonor] = useState(""), [amount, setAmount] = useState(""), [purpose, setPurpose] = useState(""), [projectId, setProjectId] = useState(""), [transactionSourceId, setTransactionSourceId] = useState(""), [transactionType, setTransactionType] = useState("expenditure"), [transactionAmount, setTransactionAmount] = useState(""), [transactionPurpose, setTransactionPurpose] = useState("");
  const format = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
  const load = async () => {
    if (!supabase) return;
    const [sourceResult, transactionResult, projectResult] = await Promise.all([
      supabase.from("funding_sources").select("id,category,donor_name,amount,received_on,purpose,status,created_at").order("received_on", { ascending: false }),
      supabase.from("financial_transactions").select("id,project_id,transaction_type,amount,occurred_on,purpose,status,projects(title,challenges(title,district)),funding_sources(donor_name,category)").order("occurred_on", { ascending: false }),
      supabase.from("projects").select("id,title,challenges(public_id,title,district)").order("created_at", { ascending: false }),
    ]);
    setSources(((embedded ? (sourceResult.data ?? []).filter((item: any) => item.status === "verified") : sourceResult.data) ?? []) as any[]); setTransactions(((embedded ? (transactionResult.data ?? []).filter((item: any) => item.status === "verified") : transactionResult.data) ?? []) as any[]); setProjects((projectResult.data ?? []) as any[]);
  };
  useEffect(() => { void load(); }, []);
  const publicSources = sources.filter((item) => item.status === "verified");
  const publicTransactions = transactions.filter((item) => item.status === "verified");
  const totalReceived = publicSources.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalSpent = publicTransactions.filter((item) => item.transaction_type === "expenditure").reduce((sum, item) => sum + Number(item.amount), 0);
  const addSource = async () => { if (!user || !donor.trim() || Number(amount) <= 0 || !purpose.trim()) return flash("Enter a valid funding source, amount, and purpose."); const { error } = await supabase!.from("funding_sources").insert({ category, donor_name: donor.trim(), amount: Number(amount), received_on: new Date().toISOString().slice(0, 10), purpose: purpose.trim(), created_by: user.id }); if (error) return flash(error.message); setDonor(""); setAmount(""); setPurpose(""); flash("Funding source recorded as pending verification."); await load(); };
  const addTransaction = async () => { if (!user || !projectId || Number(transactionAmount) <= 0 || !transactionPurpose.trim()) return flash("Select a project and enter a valid amount and purpose."); const { error } = await supabase!.from("financial_transactions").insert({ project_id: projectId, funding_source_id: transactionSourceId || null, transaction_type: transactionType, amount: Number(transactionAmount), occurred_on: new Date().toISOString().slice(0, 10), purpose: transactionPurpose.trim(), created_by: user.id }); if (error) return flash(error.message); setTransactionAmount(""); setTransactionPurpose(""); flash("Financial ledger entry recorded as pending verification."); await load(); };
  const verify = async (table: "funding_sources" | "financial_transactions", id: string) => { const { error } = await supabase!.from(table).update({ status: "verified", verified_by: user?.id ?? null, verified_at: new Date().toISOString() }).eq("id", id); if (error) flash(error.message); else { flash("Financial record verified and published."); await load(); } };
  return <section className="container-page py-12"><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">PUBLIC FINANCIAL TRANSPARENCY</span><h1 className="mt-4 text-3xl font-bold">Every Rupee Has a Source. Every Rupee Has a Purpose.</h1><p className="mt-2 max-w-3xl text-muted-foreground">Verified funding, project allocations, and expenditure records are published here for public accountability.</p><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Funds received" value={format(totalReceived)} icon={<Building2 size={18} />}/><DashboardStat label="Funds utilized" value={format(totalSpent)} icon={<Activity size={18} />}/><DashboardStat label="Funds available" value={format(totalReceived - totalSpent)} icon={<BadgeCheck size={18} />}/><DashboardStat label="Verified entries" value={sources.length + transactions.length} icon={<ClipboardCheck size={18} />}/></div><div className="mt-7 grid gap-5 lg:grid-cols-2"><section className="card-surface p-6"><h2 className="text-xl font-bold">Funding sources</h2><div className="mt-5 space-y-3">{sources.map((source) => <article key={source.id} className="rounded-lg bg-surface p-4"><div className="flex justify-between gap-3"><div><b>{cleanLegacyText(source.donor_name)}</b><p className="mt-1 text-xs capitalize text-muted-foreground">{source.category.replaceAll("_", " ")} | {new Date(source.received_on).toLocaleDateString()}</p></div><b className="text-primary">{format(Number(source.amount))}</b></div><p className="mt-2 text-sm text-muted-foreground">{cleanLegacyText(source.purpose)}</p>{admin && source.status === "pending" && <button onClick={() => void verify("funding_sources", source.id)} className="mt-2 text-xs font-bold text-primary">Verify & publish</button>}</article>)}{!sources.length && <p className="text-sm text-muted-foreground">No verified funding entries have been published.</p>}</div></section><section className="card-surface p-6"><h2 className="text-xl font-bold">Project financial timeline</h2><div className="mt-5 space-y-3">{transactions.map((transaction) => <article key={transaction.id} className="rounded-lg bg-surface p-4"><div className="flex justify-between gap-3"><div><b>{transaction.projects?.title ?? "Project"}</b><p className="mt-1 text-xs capitalize text-muted-foreground">{transaction.transaction_type} | {new Date(transaction.occurred_on).toLocaleDateString()}</p></div><b className={transaction.transaction_type === "expenditure" ? "text-destructive" : "text-primary"}>{format(Number(transaction.amount))}</b></div><p className="mt-2 text-sm text-muted-foreground">{cleanLegacyText(transaction.purpose)}</p>{admin && transaction.status === "pending" && <button onClick={() => void verify("financial_transactions", transaction.id)} className="mt-2 text-xs font-bold text-primary">Verify & publish</button>}</article>)}{!transactions.length && <p className="text-sm text-muted-foreground">No verified project transactions have been published.</p>}</div></section></div>{admin && <section className="card-surface mt-7 p-6"><h2 className="text-xl font-bold">Admin funding portal</h2><p className="mt-1 text-sm text-muted-foreground">New financial records remain pending until verified; every change is audit logged.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-lg bg-surface p-4"><h3 className="font-bold">Record funding source</h3><div className="mt-3 grid gap-2"><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-input bg-background p-2"><option value="government">Government</option><option value="industry_csr">Industry / CSR</option><option value="samajsetu_trust">SamajSetu Trust</option><option value="university">University</option><option value="ngo">NGO</option><option value="other_approved">Other approved</option></select><input value={donor} onChange={(e) => setDonor(e.target.value)} placeholder="Donor / organization" className="rounded border border-input p-2"/><input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="Amount in Rs." className="rounded border border-input p-2"/><textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose / restrictions" className="rounded border border-input p-2"/><button onClick={() => void addSource()} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Add funding source</button></div></div><div className="rounded-lg bg-surface p-4"><h3 className="font-bold">Record project ledger entry</h3><div className="mt-3 grid gap-2"><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-input bg-background p-2"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select><select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="rounded border border-input bg-background p-2"><option value="approval">Budget approved</option><option value="release">Funds released</option><option value="expenditure">Expenditure</option><option value="adjustment">Approved adjustment</option></select><input value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} type="number" min="1" placeholder="Amount in Rs." className="rounded border border-input p-2"/><textarea value={transactionPurpose} onChange={(e) => setTransactionPurpose(e.target.value)} placeholder="Purpose / expenditure detail" className="rounded border border-input p-2"/><button onClick={() => void addTransaction()} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Add ledger entry</button></div></div></div></section>}</section>;
}

function FundingTransparencyV2({ user, profile, flash, embedded = false }: { user: User | null; profile: Profile | null; flash: (message: string) => void; embedded?: boolean }) {
  const admin = !embedded && profile?.role === "admin";
  const [sources, setSources] = useState<any[]>([]), [category, setCategory] = useState("government"), [donor, setDonor] = useState(""), [amount, setAmount] = useState(""), [purpose, setPurpose] = useState(""), [selectedId, setSelectedId] = useState(""), [utilized, setUtilized] = useState(""), [utilizationDescription, setUtilizationDescription] = useState("");
  const format = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("funding_sources").select("id,category,donor_name,amount,utilized_amount,utilization_description,received_on,purpose,status").order("received_on", { ascending: false });
    if (error) return flash(error.message);
    setSources(((data ?? []).filter((item: any) => admin || item.status === "verified")) as any[]);
  };
  useEffect(() => { void load(); }, [admin]);
  const verified = sources.filter((source) => source.status === "verified");
  const totalReceived = verified.reduce((sum, source) => sum + Number(source.amount), 0);
  const totalUtilized = verified.reduce((sum, source) => sum + Number(source.utilized_amount), 0);
  const addSource = async () => {
    if (!user || !donor.trim() || Number(amount) <= 0 || !purpose.trim()) return flash("Enter a funding source, received amount, and purpose.");
    const { error } = await supabase!.from("funding_sources").insert({ category, donor_name: donor.trim(), amount: Number(amount), received_on: new Date().toISOString().slice(0, 10), purpose: purpose.trim(), created_by: user.id });
    if (error) return flash(error.message);
    setDonor(""); setAmount(""); setPurpose(""); flash("Funding record added as pending verification."); await load();
  };
  const updateUtilization = async () => {
    if (!selectedId || Number(utilized) < 0) return flash("Choose a funding source and enter a valid utilized amount.");
    const { error } = await supabase!.rpc("update_funding_utilization", { source_uuid: selectedId, next_utilized: Number(utilized), description: utilizationDescription });
    if (error) return flash(error.message);
    setUtilized(""); setUtilizationDescription(""); flash("Fund utilization updated."); await load();
  };
  const verify = async (id: string) => { const { error } = await supabase!.from("funding_sources").update({ status: "verified", verified_by: user?.id ?? null, verified_at: new Date().toISOString() }).eq("id", id); if (error) flash(error.message); else { flash("Funding record verified and published."); await load(); } };
  return <section id="financial-transparency" className="funding-transparency container-page py-10"><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">PUBLIC FINANCIAL TRANSPARENCY</span><h1 className="mt-4 text-3xl font-bold">Public funds, clearly accounted for.</h1><p className="mt-2 max-w-3xl text-muted-foreground">Verified funding records show what was received, utilized, and still available to the community.</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><DashboardStat label="Total funds received" value={format(totalReceived)} icon={<Building2 size={18} />} /><DashboardStat label="Total funds utilized" value={format(totalUtilized)} icon={<Activity size={18} />} /><DashboardStat label="Remaining funds" value={format(totalReceived - totalUtilized)} icon={<BadgeCheck size={18} />} /></div><div className="funding-records mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sources.map((source) => { const remaining = Number(source.amount) - Number(source.utilized_amount); return <article key={source.id} className="card-surface p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{cleanLegacyText(source.donor_name)}</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{source.category.replaceAll("_", " ")} | {new Date(source.received_on).toLocaleDateString()}</p></div>{admin && source.status === "pending" && <button onClick={() => void verify(source.id)} className="text-xs font-bold text-primary">Verify & publish</button>}</div><p className="mt-3 text-sm text-muted-foreground">{cleanLegacyText(source.purpose)}</p><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><p><b className="block text-primary">{format(Number(source.amount))}</b><span className="text-xs text-muted-foreground">Received</span></p><p><b className="block text-accent">{format(Number(source.utilized_amount))}</b><span className="text-xs text-muted-foreground">Utilized</span></p><p><b className="block">{format(remaining)}</b><span className="text-xs text-muted-foreground">Remaining</span></p></div>{source.utilization_description && <p className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted-foreground">Utilization: {source.utilization_description}</p>}</article>; })}</div>{!sources.length && <p className="card-surface mt-6 p-6 text-muted-foreground">No verified funding records have been published.</p>}{admin && <section className="card-surface mt-7 p-6"><h2 className="text-xl font-bold">Admin fund management</h2><p className="mt-1 text-sm text-muted-foreground">Funding and utilization changes are audit logged and publish to citizens only after verification.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-xl bg-surface p-4"><h3 className="font-bold">Add funding record</h3><div className="mt-3 grid gap-2"><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded border border-input bg-background p-2"><option value="government">Government</option><option value="industry_csr">CSR</option><option value="samajsetu_trust">SamajSetu Charitable Trust</option><option value="ngo">NGO contribution</option><option value="other_approved">Other verified source</option></select><input value={donor} onChange={(event) => setDonor(event.target.value)} placeholder="Department / organization name" className="rounded border border-input p-2"/><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" placeholder="Amount received in Rs." className="rounded border border-input p-2"/><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Purpose" className="rounded border border-input p-2"/><button onClick={() => void addSource()} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Add funding record</button></div></div><div className="rounded-xl bg-surface p-4"><h3 className="font-bold">Update utilized amount</h3><div className="mt-3 grid gap-2"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded border border-input bg-background p-2"><option value="">Select funding source</option>{sources.map((source) => <option key={source.id} value={source.id}>{cleanLegacyText(source.donor_name)} - {format(Number(source.amount))}</option>)}</select><input value={utilized} onChange={(event) => setUtilized(event.target.value)} type="number" min="0" placeholder="Total amount utilized in Rs." className="rounded border border-input p-2"/><textarea value={utilizationDescription} onChange={(event) => setUtilizationDescription(event.target.value)} placeholder="Utilization description" className="rounded border border-input p-2"/><button onClick={() => void updateUtilization()} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Save utilized amount</button></div></div></div></section>}</section>;
}

function ProjectWorkspace({ user, profile, flash }: { user: User | null; profile: Profile | null; flash: (message: string) => void }) {
  const staff = ["admin", "government", "university_admin", "faculty"].includes(profile?.role ?? "");
  const [projects, setProjects] = useState<any[]>([]), [challenges, setChallenges] = useState<any[]>([]), [selected, setSelected] = useState<any | null>(null);
  const [title, setTitle] = useState(""), [objective, setObjective] = useState(""), [challengeId, setChallengeId] = useState("");
  const [milestone, setMilestone] = useState(""), [prototype, setPrototype] = useState(""), [repository, setRepository] = useState(""), [impact, setImpact] = useState(""), [unit, setUnit] = useState(""), [pilotLocation, setPilotLocation] = useState(""), [verdict, setVerdict] = useState("solved"), [feedback, setFeedback] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [projectResult, challengeResult] = await Promise.all([
      supabase.from("projects").select("id,title,objective,expected_outcome,status,health_score,created_at,challenges(public_id,title),milestones(id,title,status,due_date),prototypes(id,version,description,repository_url),pilots(id,location_text,status,starts_on,ends_on),community_feedback(id,verdict,comment,created_at),impact_observations(id,metric,unit,baseline,target,observed,verification_status)").order("created_at", { ascending: false }),
      supabase.from("challenges").select("id,public_id,title").in("verification", ["community_verified", "officially_verified"]).order("created_at", { ascending: false }),
    ]);
    setProjects((projectResult.data ?? []) as any[]); setChallenges((challengeResult.data ?? []) as any[]);
    if (selected) setSelected((projectResult.data ?? []).find((item: any) => item.id === selected.id) ?? null);
  };
  useEffect(() => { void load(); }, []);
  if (!user) return <section className="container-page py-12"><h1 className="text-3xl font-bold">Innovation projects</h1><p className="mt-3 text-muted-foreground">Sign in to view projects.</p></section>;
  const create = async () => { if (!challengeId || !title.trim() || !objective.trim()) return flash("Select a verified challenge, title, and objective."); const { error } = await supabase!.rpc("create_innovation_project", { challenge_uuid: challengeId, project_title: title.trim(), project_objective: objective.trim(), outcome: null }); if (error) return flash(error.message); setTitle(""); setObjective(""); setChallengeId(""); flash("Innovation project created."); await load(); };
  const addMilestone = async () => { if (!selected || !milestone.trim()) return; const { error } = await supabase!.from("milestones").insert({ project_id: selected.id, title: milestone.trim() }); if (error) flash(error.message); else { setMilestone(""); await load(); } };
  const addPrototype = async () => { if (!selected || !prototype.trim()) return; const { error } = await supabase!.from("prototypes").insert({ project_id: selected.id, version: prototype.trim(), repository_url: repository.trim() || null, created_by: user.id }); if (error) flash(error.message); else { setPrototype(""); setRepository(""); await load(); } };
  const addImpact = async () => { if (!selected || !impact.trim() || !unit.trim()) return; const { error } = await supabase!.from("impact_observations").insert({ project_id: selected.id, metric: impact.trim(), unit: unit.trim(), source: "Project workspace", verification_status: "unverified" }); if (error) flash(error.message); else { setImpact(""); setUnit(""); await load(); } };
  const createPilot = async () => { if (!selected || !pilotLocation.trim()) return; const { error } = await supabase!.from("pilots").upsert({ project_id: selected.id, location_text: pilotLocation.trim(), status: "planned" }, { onConflict: "project_id" }); if (error) flash(error.message); else { setPilotLocation(""); await load(); } };
  const addFeedback = async () => { if (!selected || !feedback.trim()) return; const { error } = await supabase!.from("community_feedback").insert({ project_id: selected.id, author_id: user.id, verdict, comment: feedback.trim() }); if (error) flash(error.message); else { setFeedback(""); await load(); } };
  return <section className="container-page py-12"><h1 className="text-3xl font-bold">Innovation projects</h1><p className="mt-2 text-muted-foreground">Deliver verified challenges through milestones, prototypes, pilots, and measured impact.</p>{staff && <div className="card-surface mt-6 grid gap-3 p-5 md:grid-cols-2"><select value={challengeId} onChange={(e) => setChallengeId(e.target.value)} className="rounded-lg border border-input bg-background p-3"><option value="">Verified challenge</option>{challenges.map((item) => <option key={item.id} value={item.id}>{item.public_id} | {item.title}</option>)}</select><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" className="rounded-lg border border-input p-3"/><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Project objective" className="min-h-24 rounded-lg border border-input p-3"/><button onClick={() => void create()} className="rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground">Convert to innovation project</button></div>}<div className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-3">{projects.length ? projects.map((project) => <button key={project.id} onClick={() => setSelected(project)} className={`card-surface w-full p-5 text-left ${selected?.id === project.id ? "border-primary" : ""}`}><b>{project.title}</b><p className="mt-1 text-sm text-muted-foreground">{project.challenges?.public_id} | {project.status}</p></button>) : <p className="card-surface p-5 text-muted-foreground">No projects yet.</p>}</div><div className="card-surface p-6">{selected ? <><h2 className="text-2xl font-bold">{selected.title}</h2><p className="mt-2 text-muted-foreground">{selected.objective}</p><div className="mt-6 grid gap-5 md:grid-cols-2"><section><h3 className="font-bold">Milestones</h3><div className="mt-3 space-y-2">{(selected.milestones ?? []).map((item: any) => <p key={item.id} className="rounded bg-surface p-2 text-sm">{item.title} | {item.status}</p>)}</div>{staff && <div className="mt-3 flex gap-2"><input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Milestone" className="min-w-0 rounded border border-input p-2 text-sm"/><button onClick={() => void addMilestone()} className="rounded bg-primary px-3 text-sm font-bold text-primary-foreground">Add</button></div>}</section><section><h3 className="font-bold">Prototype versions</h3>{(selected.prototypes ?? []).map((item: any) => <p key={item.id} className="mt-2 rounded bg-surface p-2 text-sm">{item.version}{item.repository_url && ` | ${item.repository_url}`}</p>)}{staff && <div className="mt-3 space-y-2"><input value={prototype} onChange={(e) => setPrototype(e.target.value)} placeholder="Version, e.g. V1" className="w-full rounded border border-input p-2 text-sm"/><input value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="Repository URL (optional)" className="w-full rounded border border-input p-2 text-sm"/><button onClick={() => void addPrototype()} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Record prototype</button></div>}</section><section><h3 className="font-bold">Pilot</h3>{selected.pilots?.[0] ? <p className="mt-2 rounded bg-surface p-2 text-sm">{selected.pilots[0].location_text} | {selected.pilots[0].status}</p> : <p className="mt-2 text-sm text-muted-foreground">No pilot proposed.</p>}{staff && <div className="mt-3 flex gap-2"><input value={pilotLocation} onChange={(e) => setPilotLocation(e.target.value)} placeholder="Pilot location" className="min-w-0 rounded border border-input p-2 text-sm"/><button onClick={() => void createPilot()} className="rounded bg-primary px-3 text-sm font-bold text-primary-foreground">Save</button></div>}</section><section><h3 className="font-bold">Impact observations</h3>{(selected.impact_observations ?? []).map((item: any) => <p key={item.id} className="mt-2 rounded bg-surface p-2 text-sm">{item.metric} | {item.observed ?? "Pending"} {item.unit}</p>)}{staff && <div className="mt-3 flex gap-2"><input value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Metric" className="min-w-0 rounded border border-input p-2 text-sm"/><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="w-20 rounded border border-input p-2 text-sm"/><button onClick={() => void addImpact()} className="rounded bg-primary px-3 text-sm font-bold text-primary-foreground">Add</button></div>}</section></div><section className="mt-6 border-t border-border pt-5"><h3 className="font-bold">Community feedback</h3>{(selected.community_feedback ?? []).map((item: any) => <p key={item.id} className="mt-2 rounded bg-surface p-2 text-sm">{item.verdict.replaceAll("_", " ")} | {item.comment}</p>)}<div className="mt-3 flex flex-wrap gap-2"><select value={verdict} onChange={(e) => setVerdict(e.target.value)} className="rounded border border-input bg-background p-2 text-sm"><option value="solved">Solved</option><option value="partially_solved">Partially solved</option><option value="not_solved">Not solved</option></select><input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share outcome feedback" className="min-w-48 flex-1 rounded border border-input p-2 text-sm"/><button onClick={() => void addFeedback()} className="rounded bg-primary px-3 text-sm font-bold text-primary-foreground">Submit</button></div></section></> : <p className="text-muted-foreground">Select a project to open its workspace.</p>}</div></div></section>;
}

function Notifications({ user, go }: { user: User | null; go: (x: Screen) => void }) {
  const [items, setItems] = useState<Array<{ id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase.from("notifications").select("id,kind,title,body,created_at,read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
      setItems((data ?? []) as typeof items);
      setLoading(false);
    };
    void load();
    const channel = supabase.channel(`notifications-${user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);
  if (!user) return <section className="container-page py-14"><h1 className="text-3xl font-bold">Notifications</h1><p className="mt-3 text-muted-foreground">Sign in to view your notifications.</p><button onClick={() => go("auth")} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign in</button></section>;
  const markRead = async (id: string) => {
    const { error } = await supabase!.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (!error) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  };
  return <section className="container-page max-w-3xl py-12"><h1 className="text-3xl font-bold">Notifications</h1><p className="mt-2 text-muted-foreground">Assignment and workflow updates are stored here.</p><div className="mt-7 space-y-3">{loading ? <p>Loading...</p> : !items.length ? <p className="card-surface p-6 text-muted-foreground">You have no notifications yet.</p> : items.map((item) => <article key={item.id} className={`card-surface flex gap-4 p-5 ${item.read_at ? "opacity-70" : "border-primary/30"}`}><Bell className="mt-1 shrink-0 text-primary" size={18} /><div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p>{item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div>{!item.read_at && <button onClick={() => void markRead(item.id)} className="h-fit text-xs font-bold text-primary">Mark read</button>}</article>)}</div></section>;
}

function MyReports({ user, go }: { user: User | null; go: (x: Screen) => void }) {
  const [data, setData] = useState<Report[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    void supabase
      .from("reports")
      .select(
        "id,description,district,block,locality,created_at,challenge_id,challenges(public_id,title,verification,stage)",
      )
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setData((data ?? []) as unknown as Report[]);
        setLoading(false);
      });
  }, [user]);
  if (!user)
    return (
      <section className="container-page py-14">
        <h1 className="text-3xl font-bold">My reports</h1>
        <p className="mt-3 text-muted-foreground">Sign in to view your reporting history.</p>
        <button
          onClick={() => go("auth")}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Sign in
        </button>
      </section>
    );
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl font-bold">My reports</h1>
      <div className="mt-7 space-y-3">
        {loading ? (
          <p>Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">You have not submitted a report yet.</p>
        ) : (
          data.map((r) => (
            <div key={r.id} className="card-surface p-5">
              <b className="text-xs text-primary">{r.challenges?.public_id || "REPORT"}</b>
              <p className="mt-2 font-bold">{r.challenges?.title || r.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {r.district} | Submitted {new Date(r.created_at).toLocaleDateString()}
              </p>
              <div className="mt-3 flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-surface px-2 py-1">
                  {r.challenges?.verification?.replaceAll("_", " ") || "under review"}
                </span>
                <span className="rounded-full bg-surface px-2 py-1">
                  {r.challenges?.stage || "reported"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

type AdminPartner = {
  id: string;
  name: string;
  organization_type: "Organization" | "NGO";
  contact_email: string | null;
  district: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  expertise: string[];
  capabilities: string[];
  account_status?: string;
  created_at: string;
};
type AdminMember = {
  id: string;
  organization_id: string;
  name: string;
  skills: string[];
  availability: string | null;
  contact_details: string | null;
  created_at: string;
};
type AdminAssignment = {
  id: string;
  challenge_id: string;
  organization_id: string;
  status: string;
  unable_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  acceptance_deadline: string | null;
  resolved_at: string | null;
};
type AdminTransfer = {
  id: string;
  assignment_id: string;
  to_organization_id: string;
  reason: string;
  created_at: string;
};
type AllocationRanking = {
  id: string;
  challenge_id: string;
  organization_id: string;
  allocation_rank: number;
  suitability_score: number;
  distance_km: number | null;
  expertise_score: number;
  resource_score: number;
  availability_score: number;
  performance_score: number;
  workload_score: number;
  is_selected: boolean;
  created_at: string;
};
type AllocationSettings = {
  expertise_weight: number;
  resource_weight: number;
  availability_weight: number;
  distance_weight: number;
  performance_weight: number;
  workload_weight: number;
};

function AdminLogin({ complete }: { complete: () => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Unable to sign in.");
      setBusy(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not authorized for the control center.");
      setBusy(false);
      return;
    }
    setBusy(false);
    complete();
  };
  return (
    <section className="container-page grid min-h-[70vh] max-w-md place-items-center py-12">
      <div className="card-surface w-full p-7">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          RESTRICTED ACCESS
        </span>
        <h1 className="mt-4 text-3xl font-bold">Admin Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with an authorized administrator account to access the Admin Control Center.
        </p>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Admin email"
          className="mt-6 w-full rounded-lg border border-input p-3"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          className="mt-3 w-full rounded-lg border border-input p-3"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          disabled={busy || !email || !password}
          onClick={() => void signIn()}
          className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Checking access..." : "Sign in securely"}
        </button>
      </div>
    </section>
  );
}

function AdminRedirect({ go }: { go: (x: Screen) => void }) {
  useEffect(() => {
    const redirect = setTimeout(() => go("home"), 250);
    return () => clearTimeout(redirect);
  }, [go]);
  return (
    <section className="container-page py-20 text-center text-sm text-muted-foreground">
      Administrator access is required. Redirecting...
    </section>
  );
}

type PublicHoliday = { holiday_date: string; name: string };

function HolidayCalendarAdmin({ flash }: { flash: (message: string) => void }) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("public_holidays").select("holiday_date,name").order("holiday_date");
    if (error) flash(`Could not load public holidays: ${error.message}`);
    else setHolidays((data ?? []) as PublicHoliday[]);
  };
  useEffect(() => { void load(); }, []);
  const add = async () => {
    if (!date || !name.trim() || !supabase) return flash("Enter a holiday date and name.");
    const { error } = await supabase.from("public_holidays").upsert({ holiday_date: date, name: name.trim() });
    if (error) return flash(error.message);
    setDate(""); setName(""); await load(); flash("Public holiday saved. New task deadlines will exclude it.");
  };
  const remove = async (holidayDate: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("public_holidays").delete().eq("holiday_date", holidayDate);
    if (error) return flash(error.message);
    await load(); flash("Public holiday removed.");
  };
  return <section className="mt-7 max-w-3xl"><h2 className="text-2xl font-bold">Public holiday calendar</h2><p className="mt-2 text-sm text-muted-foreground">The automatic assignment deadline counts three working days. Saturdays, Sundays, and these configured public holidays are excluded.</p><div className="card-surface mt-5 p-5"><div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-input bg-background p-3"/><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Holiday name" className="rounded-lg border border-input p-3"/><button onClick={() => void add()} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Add holiday</button></div></div><div className="mt-5 space-y-2">{holidays.map((holiday) => <article key={holiday.holiday_date} className="card-surface flex items-center justify-between gap-3 p-4"><div><b>{holiday.name}</b><p className="mt-1 text-sm text-muted-foreground">{new Date(`${holiday.holiday_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "long" })}</p></div><button onClick={() => void remove(holiday.holiday_date)} className="rounded-lg px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive-soft">Remove</button></article>)}{!holidays.length && <p className="card-surface p-5 text-sm text-muted-foreground">No public holidays are configured.</p>}</div></section>;
}

function AdminControlCenter({
  user,
  profile,
  flash,
  refresh,
}: {
  user: User | null;
  profile: Profile | null;
  flash: (x: string) => void;
  refresh: (q?: string) => void;
}) {
  const [section, setSection] = useState("Dashboard"),
    [query, setQuery] = useState(""),
    [partners, setPartners] = useState<AdminPartner[]>([]),
    [tasks, setTasks] = useState<Challenge[]>([]),
    [members, setMembers] = useState<AdminMember[]>([]),
    [assignments, setAssignments] = useState<AdminAssignment[]>([]),
    [transfers, setTransfers] = useState<AdminTransfer[]>([]),
    [rankings, setRankings] = useState<AllocationRanking[]>([]),
    [allocationSettings, setAllocationSettings] = useState<AllocationSettings | null>(null),
    [selected, setSelected] = useState<AdminPartner | null>(null),
    [status, setStatus] = useState("All");
  const load = async () => {
    if (!supabase) return;
    const partnerFields =
      "id,name,organization_type,contact_email,district,locality,latitude,longitude,expertise,capabilities,account_status,created_at";
    let { data: orgs, error: organizationError } = await supabase
      .from("organization_accounts")
      .select(partnerFields);
    // Existing deployments may not have run the account-status migration yet.
    // Keep the directory readable while the migration is being applied.
    if (organizationError?.code === "42703" || organizationError?.code === "PGRST204") {
      const fallback = await supabase
        .from("organization_accounts")
        .select(
          "id,name,organization_type,contact_email,district,locality,latitude,longitude,expertise,capabilities,created_at",
        );
      orgs = fallback.data as typeof orgs;
      organizationError = fallback.error;
    }
    const [
      { data: challenges, error: challengesError },
      { data: memberData },
      { data: assignmentData },
      { data: transferData },
      { data: rankingData },
      { data: settingData },
    ] = await Promise.all([
      supabase.rpc("search_challenges", { search_text: "" }),
      supabase
        .from("volunteers")
        .select("id,organization_id,name,skills,availability,contact_details,created_at"),
      supabase
        .from("problem_assignments")
        .select(
          "id,challenge_id,organization_id,status,unable_reason,created_at,accepted_at,acceptance_deadline,resolved_at",
        ),
      supabase
        .from("problem_transfers")
        .select("id,assignment_id,to_organization_id,reason,created_at"),
      supabase
        .from("task_allocation_rankings")
        .select(
          "id,challenge_id,organization_id,allocation_rank,suitability_score,distance_km,expertise_score,resource_score,availability_score,performance_score,workload_score,is_selected,created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("task_allocation_settings")
        .select(
          "expertise_weight,resource_weight,availability_weight,distance_weight,performance_weight,workload_weight",
        )
        .maybeSingle(),
    ]);
    if (organizationError) flash(`Could not load partners: ${organizationError.message}`);
    if (challengesError) flash(`Could not load tasks: ${challengesError.message}`);
    setPartners((orgs ?? []) as AdminPartner[]);
    setTasks((challenges ?? []) as Challenge[]);
    setMembers((memberData ?? []) as AdminMember[]);
    setAssignments((assignmentData ?? []) as AdminAssignment[]);
    setTransfers((transferData ?? []) as AdminTransfer[]);
    setRankings((rankingData ?? []) as AllocationRanking[]);
    setAllocationSettings((settingData ?? null) as AllocationSettings | null);
  };
  useEffect(() => {
    void load();
  }, []);
  const organizations = partners.filter((partner) => partner.organization_type !== "NGO"),
    ngos = partners.filter((partner) => partner.organization_type === "NGO");
  const activeTasks = tasks.filter(
    (task) => !["impact", "completed", "solved"].includes(task.stage),
  ).length;
  const nav = [
    "Dashboard",
    "Organizations",
    "NGOs",
    "All Tasks",
    "Task Tracking",
    "Smart Task Allocation",
    "Public Holidays",
    "Reassignments",
    "Skilled Participants",
    "Volunteers",
    "Expertise & Resources",
    "Financial Transparency",
    "Reports",
    "Analytics",
    "Account Management",
  ];
  const shownPartners = (section === "NGOs" ? ngos : organizations).filter(
    (partner) =>
      `${partner.name} ${partner.contact_email ?? ""} ${partner.district ?? ""} ${partner.expertise.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All" || (partner.account_status ?? "Active") === status),
  );
  const updateStatus = async (partner: AdminPartner, account_status: string) => {
    const { error } = await supabase!
      .from("organization_accounts")
      .update({ account_status })
      .eq("id", partner.id);
    if (error) flash(error.message);
    else {
      setPartners((all) =>
        all.map((item) => (item.id === partner.id ? { ...item, account_status } : item)),
      );
      flash(`${partner.name} is now ${account_status.toLowerCase()}.`);
    }
  };
  const verifyChallenge = async (challenge: Challenge) => {
    const { error } = await supabase!.rpc("review_challenge", {
      challenge_uuid: challenge.id,
      next_status: "officially_verified",
      review_method: "admin manual verification",
      review_note: "Verified by an authorized platform administrator.",
    });
    if (error) return flash(error.message);
    flash(`${challenge.public_id} has been verified.`);
    await load();
    void refresh();
  };
  const cards = [
    ["Organizations", organizations.length],
    ["NGOs", ngos.length],
    [
      "Active organizations",
      organizations.filter((item) => (item.account_status ?? "Active") === "Active").length,
    ],
    ["Active NGOs", ngos.filter((item) => (item.account_status ?? "Active") === "Active").length],
    [
      "Total skilled participants",
      members.filter((member) =>
        organizations.some((partner) => partner.id === member.organization_id),
      ).length,
    ],
    [
      "Total volunteers",
      members.filter((member) => ngos.some((partner) => partner.id === member.organization_id))
        .length,
    ],
    ["Active tasks", activeTasks],
    ["Completed tasks", tasks.filter((task) => task.stage === "impact").length],
    ["Pending tasks", tasks.filter((task) => task.stage === "reported").length],
    ["Reassigned tasks", transfers.length],
  ] as const;
  return (
    <div className="dashboard-shell min-h-screen bg-surface">
      <div className="dashboard-frame mx-auto flex max-w-[1700px]">
        <aside className="app-sidebar sticky top-0 hidden h-screen w-68 shrink-0 border-r border-border bg-card p-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck size={20} />
            </div>
            <div>
              <b>SamajSetu</b>
              <p className="text-xs text-muted-foreground">Admin Control Center</p>
            </div>
          </div>
          <nav className="mt-7 space-y-1">
            {nav.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSection(item);
                  setSelected(null);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
              >
                {item === "Dashboard" ? (
                  <LayoutDashboard size={16} />
                ) : item === "Organizations" || item === "NGOs" ? (
                  <Building2 size={16} />
                ) : item.includes("Task") ? (
                  <ClipboardCheck size={16} />
                ) : (
                  <Users size={16} />
                )}{" "}
                {item}
              </button>
            ))}
          </nav>
        </aside>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card p-2 shadow-[0_-4px_16px_rgba(0,0,0,.08)] lg:hidden">
          {nav.map((item) => <button key={item} onClick={() => { setSection(item); setSelected(null); }} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${section === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item}</button>)}
        </nav>
        <main className="dashboard-main min-w-0 flex-1 p-4 pb-20 sm:p-7 lg:pb-7">
          <header className="dashboard-topbar">
            <div className="dashboard-search flex w-full max-w-xl items-center gap-2 rounded-lg border border-input bg-card px-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search organizations, tasks, people..."
                className="w-full bg-transparent py-2.5 text-sm outline-none"
              />
            </div>
          </header>
          <section className="dashboard-heading mt-6 flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-primary">PLATFORM ADMINISTRATION</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Admin Control Center</h1>
              <p className="mt-2 text-sm text-muted-foreground">Monitor activity, manage resources, and drive impact across communities.</p>
            </div>
            <aside className="dashboard-quote"><span aria-hidden="true">&#10047;</span><p><b>“Stronger communities,<br />a brighter tomorrow.”</b><br /><small>— SamajSetu</small></p></aside>
          </section>
          {section === "Financial Transparency" && <FundingTransparencyV2 user={user} profile={profile} flash={flash} />}
          {section === "Public Holidays" && <HolidayCalendarAdmin flash={flash} />}
          {section === "Dashboard" && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {cards.map(([label, value]) => (
                  <DashboardStat
                    key={label}
                    label={label}
                    value={value}
                    icon={label.includes("Organization") ? <Building2 size={18} /> : label.includes("NGO") || label.includes("volunteer") ? <Users size={18} /> : label.includes("Completed") ? <CheckCircle2 size={18} /> : label.includes("Pending") ? <Clock3 size={18} /> : label.includes("Reassigned") ? <Repeat2 size={18} /> : label.includes("participant") ? <BadgeCheck size={18} /> : <ClipboardCheck size={18} />}
                  />
                ))}
              </div>
              <div className="mt-7 grid gap-5 xl:grid-cols-2">
                <section className="card-surface p-6">
                  <h2 className="text-lg font-bold">Platform activity</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Monitor registered partners, reported challenges, and response activity from one
                    place.
                  </p>
                  <div className="mt-6 space-y-3">
                    {tasks.slice(0, 5).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSection("All Tasks")}
                        className="flex w-full items-center justify-between rounded-lg bg-surface p-3 text-left"
                      >
                        <span>
                          <b className="block text-sm">{task.title}</b>
                          <span className="text-xs text-muted-foreground">
                            {task.public_id} | {task.district}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-primary">{task.stage}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="card-surface p-6">
                  <h2 className="text-lg font-bold">Capability coverage</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Expertise and resources reported by all registered organizations and NGOs.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {Array.from(new Set(partners.flatMap((partner) => partner.expertise))).map(
                      (expertise) => (
                        <span
                          key={expertise}
                          className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary"
                        >
                          {expertise}
                        </span>
                      ),
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
          {(section === "Organizations" ||
            section === "NGOs" ||
            section === "Account Management") &&
            !selected && (
              <section className="mt-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {section === "Account Management" ? "Partner account management" : section}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Search, filter, review details, and manage account status.
                    </p>
                  </div>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="rounded-lg border border-input bg-card p-2 text-sm"
                  >
                    <option>All</option>
                    <option>Active</option>
                    <option>Suspended</option>
                    <option>Deactivated</option>
                  </select>
                </div>
                <div className="mt-5 overflow-x-auto card-surface">
                  <table className="w-full min-w-220 text-left text-sm">
                    <thead className="bg-surface text-xs text-muted-foreground">
                      <tr>
                        <th className="p-4">PARTNER</th>
                        <th className="p-4">EMAIL</th>
                        <th className="p-4">LOCATION / GPS</th>
                        <th className="p-4">EXPERTISE</th>
                        <th className="p-4">RESOURCES</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownPartners.map((partner) => (
                        <tr key={partner.id} className="border-t border-border">
                          <td className="p-4 font-semibold">{partner.name}</td>
                          <td className="p-4">{partner.contact_email ?? "-"}</td>
                          <td className="p-4 text-xs">
                            {partner.locality || partner.district || "-"}
                            <br />
                            {partner.latitude != null
                              ? `${partner.latitude}, ${partner.longitude}`
                              : "GPS unavailable"}
                          </td>
                          <td className="p-4">{partner.expertise.join(", ") || "-"}</td>
                          <td className="p-4">{partner.capabilities.join(", ") || "-"}</td>
                          <td className="p-4">
                            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                              {partner.account_status ?? "Active"}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelected(partner)}
                              className="font-bold text-primary"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {shownPartners.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      No matching partners found.
                    </p>
                  )}
                </div>
              </section>
            )}
          {selected && (
            <section className="mt-7">
              <button onClick={() => setSelected(null)} className="text-sm font-bold text-primary">
                Back to partners
              </button>
              <div className="mt-4 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <article className="card-surface p-6">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {selected.organization_type.toUpperCase()}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">{selected.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.contact_email ?? "No email recorded"}
                      </p>
                    </div>
                    <span className="h-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                      {selected.account_status ?? "Active"}
                    </span>
                  </div>
                  <h3 className="mt-7 font-bold">Basic information</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Info
                      label="Registration date"
                      value={new Date(selected.created_at).toLocaleDateString()}
                      icon={<CalendarDays size={16} />}
                    />
                    <Info
                      label="GPS location"
                      value={
                        selected.latitude != null
                          ? `${selected.latitude}, ${selected.longitude}`
                          : "Not provided"
                      }
                      icon={<MapPin size={16} />}
                    />
                  </div>
                  <h3 className="mt-7 font-bold">Expertise & resources</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...selected.expertise, ...selected.capabilities].map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-surface px-3 py-1 text-xs font-semibold"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-7 font-bold">Task history</h3>
                  <div className="mt-3 space-y-2">
                    {assignments
                      .filter((assignment) => assignment.organization_id === selected.id)
                      .map((assignment) => {
                        const challenge = tasks.find((task) => task.id === assignment.challenge_id);
                        return (
                          <div key={assignment.id} className="rounded-lg bg-surface p-3 text-sm">
                            <b>
                              {challenge?.public_id ?? "Task"} |{" "}
                              {challenge?.title ?? "Assigned task"}
                            </b>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {assignment.status.replaceAll("_", " ")} |{" "}
                              {new Date(assignment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        );
                      })}
                    {!assignments.some(
                      (assignment) => assignment.organization_id === selected.id,
                    ) && (
                      <p className="text-sm text-muted-foreground">
                        No task assignments have been recorded yet.
                      </p>
                    )}
                  </div>
                  <h3 className="mt-7 font-bold">
                    {selected.organization_type === "NGO" ? "Volunteers" : "Skilled participants"}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {members
                      .filter((member) => member.organization_id === selected.id)
                      .map((member) => (
                        <div key={member.id} className="rounded-lg bg-surface p-3 text-sm">
                          <b>{member.name}</b>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.skills.join(", ") || "General"} |{" "}
                            {member.availability || "Availability not set"}
                          </p>
                        </div>
                      ))}
                    {!members.some((member) => member.organization_id === selected.id) && (
                      <p className="text-sm text-muted-foreground">
                        No {selected.organization_type === "NGO" ? "volunteers" : "participants"}{" "}
                        have been recorded yet.
                      </p>
                    )}
                  </div>
                </article>
                <aside className="card-surface p-6">
                  <h3 className="font-bold">Account controls</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Changes immediately restrict the partner's workspace access.
                  </p>
                  <div className="mt-5 grid gap-2">
                    <button
                      onClick={() => void updateStatus(selected, "Active")}
                      className="rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => void updateStatus(selected, "Suspended")}
                      className="rounded-lg border border-destructive py-2.5 text-sm font-bold text-destructive"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => void updateStatus(selected, "Deactivated")}
                      className="rounded-lg border border-input py-2.5 text-sm font-bold"
                    >
                      Deactivate
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          )}
          {section === "All Tasks" && (
            <section className="mt-7">
              <h2 className="text-2xl font-bold">All Tasks</h2>
              <div className="mt-5 space-y-3">
                {tasks
                  .filter((task) =>
                    `${task.public_id} ${task.title} ${task.domain} ${task.district} ${task.stage}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((task) => (
                    <article
                      key={task.id}
                      className="card-surface p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {task.public_id} | {task.domain}
                        </p>
                        <h3 className="mt-1 font-bold">{task.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {task.district} | Reported{" "}
                          {new Date(task.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold">
                          {task.verification.replaceAll("_", " ")}
                        </span>
                        {!['community_verified', 'officially_verified'].includes(task.verification) && (
                          <button
                            onClick={() => void verifyChallenge(task)}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                          >
                            Verify challenge
                          </button>
                        )}
                      </div>
                      </div>
                      <ProblemProgressTimeline challenge={task} compact />
                    </article>
                  ))}
              </div>
            </section>
          )}
          {[
            "Task Tracking",
            "Smart Task Allocation",
            "Reassignments",
            "Skilled Participants",
            "Volunteers",
            "Expertise & Resources",
            "Analytics",
          ].includes(section) && (
            <AdminDataSection
              section={section}
              query={query}
              partners={partners}
              tasks={tasks}
              members={members}
              assignments={assignments}
              transfers={transfers}
              rankings={rankings}
              allocationSettings={allocationSettings}
            />
          )}
          {section === "Reports" && <AdminProblemReview flash={flash} refresh={refresh} />}
        </main>
      </div>
    </div>
  );
}

type AdminReviewProblem = {
  challenge_id: string; public_id: string; title: string; summary: string; domain: string; district: string; block: string | null; locality: string | null;
  severity: number; urgency: number; affected_population: number | null; created_at: string; priority_score: number; priority_level: string;
  report_id: string | null; report_description: string | null; report_latitude: number | null; report_longitude: number | null; voice_transcript: string | null;
  evidence: { path: string; mime_type: string; size_bytes: number; created_at: string }[];
};

function AdminProblemReview({ flash, refresh }: { flash: (message: string) => void; refresh: () => void }) {
  const [items, setItems] = useState<AdminReviewProblem[]>([]), [scores, setScores] = useState<Record<string, string>>({}), [notes, setNotes] = useState<Record<string, string>>({}), [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    const { data, error } = await supabase!.rpc("admin_problem_review");
    if (error) flash(error.message); else setItems((data ?? []) as AdminReviewProblem[]);
  };
  useEffect(() => { void load(); }, []);
  const assign = async (item: AdminReviewProblem) => {
    const score = Number(scores[item.challenge_id] ?? item.priority_score);
    if (!Number.isInteger(score) || score < 0 || score > 100) return flash("Enter a whole priority score from 0 to 100.");
    setBusy(item.challenge_id);
    const { error } = await supabase!.rpc("assign_problem_priority", { challenge_uuid: item.challenge_id, assigned_score: score, assignment_note: notes[item.challenge_id] ?? null });
    setBusy(null);
    if (error) return flash(error.message);
    flash(`${item.public_id} priority assigned and smart allocation started.`); await load(); refresh();
  };
  const evidenceUrl = async (path: string) => {
    const { data, error } = await supabase!.storage.from("evidence").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return flash(error?.message ?? "Unable to open evidence.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return <section className="mt-7"><h2 className="text-2xl font-bold">Citizen problem review</h2><p className="mt-1 text-sm text-muted-foreground">Review the complete report, exact reported location and private evidence. Assigning priority starts smart partner allocation.</p><div className="mt-5 space-y-4">{items.map((item) => <article key={`${item.challenge_id}-${item.report_id}`} className="card-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-primary">{item.public_id} | {item.domain}</p><h3 className="mt-1 text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.summary}</p></div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">Current: {item.priority_score}/100 | {item.priority_level}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><b>Submitted location:</b> {item.district}{item.block ? `, ${item.block}` : ""}{item.locality ? `, ${item.locality}` : ""}</p><p><b>Exact report GPS:</b> {item.report_latitude ?? "Not shared"}, {item.report_longitude ?? "Not shared"}</p><p><b>Citizen severity / urgency:</b> {item.severity}/4 | {item.urgency}/4</p><p><b>Affected people:</b> {item.affected_population ?? "Not provided"}</p></div>{item.report_description && <p className="mt-3 rounded-lg bg-surface p-3 text-sm"><b>Citizen description:</b> {item.report_description}</p>}{item.voice_transcript && <p className="mt-2 rounded-lg bg-surface p-3 text-sm"><b>Original voice transcript:</b> {item.voice_transcript}</p>}<div className="mt-3"><p className="text-sm font-bold">Private submitted media ({item.evidence.length})</p><div className="mt-2 flex flex-wrap gap-2">{item.evidence.map((media) => <button key={media.path} onClick={() => void evidenceUrl(media.path)} className="rounded-lg border border-input px-3 py-2 text-xs font-bold text-primary">Open {media.mime_type.split("/")[0]} | {Math.ceil(media.size_bytes / 1024)} KB</button>)}{!item.evidence.length && <p className="text-sm text-muted-foreground">No media attached.</p>}</div></div><div className="mt-4 grid gap-2 sm:grid-cols-[150px_1fr_auto]"><input value={scores[item.challenge_id] ?? String(item.priority_score)} onChange={(event) => setScores((all) => ({ ...all, [item.challenge_id]: event.target.value }))} type="number" min="0" max="100" placeholder="0-100" className="rounded-lg border border-input p-3" aria-label="Priority score"/><input value={notes[item.challenge_id] ?? ""} onChange={(event) => setNotes((all) => ({ ...all, [item.challenge_id]: event.target.value }))} placeholder="Priority rationale (optional)" className="rounded-lg border border-input p-3"/><button onClick={() => void assign(item)} disabled={busy === item.challenge_id} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy === item.challenge_id ? "Saving..." : "Assign & allocate"}</button></div></article>)}{!items.length && <p className="card-surface p-5 text-muted-foreground">No citizen reports are available for review.</p>}</div></section>;
}

function AdminDataSection({
  section,
  query,
  partners,
  tasks,
  members,
  assignments,
  transfers,
  rankings,
  allocationSettings,
}: {
  section: string;
  query: string;
  partners: AdminPartner[];
  tasks: Challenge[];
  members: AdminMember[];
  assignments: AdminAssignment[];
  transfers: AdminTransfer[];
  rankings: AllocationRanking[];
  allocationSettings: AllocationSettings | null;
}) {
  const matches = (value: string) => value.toLowerCase().includes(query.toLowerCase());
  const partner = (id: string) => partners.find((item) => item.id === id);
  const challenge = (id: string) => tasks.find((item) => item.id === id);
  const isVolunteerView = section === "Volunteers";
  const [weights, setWeights] = useState<AllocationSettings>(
    allocationSettings ?? {
      expertise_weight: 30,
      resource_weight: 20,
      availability_weight: 15,
      distance_weight: 15,
      performance_weight: 10,
      workload_weight: 10,
    },
  );
  useEffect(() => {
    if (allocationSettings) setWeights(allocationSettings);
  }, [allocationSettings]);
  const latestRankings = Array.from(new Set(rankings.map((row) => row.challenge_id)))
    .filter((challengeId) => challenge(challengeId)?.stage !== "impact")
    .flatMap(
    (challengeId) => {
      const activeAssignment = assignments
        .filter(
          (assignment) =>
            assignment.challenge_id === challengeId &&
            !["completed", "verified", "unable_to_resolve"].includes(assignment.status),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const candidates = rankings.filter((row) => row.challenge_id === challengeId);
      // Follow the selected organization of the live assignment. This keeps the display on the
      // reassignment snapshot instead of incorrectly showing the original failed assignment.
      const selected = candidates
        .filter(
          (row) =>
            row.is_selected &&
            (!activeAssignment || row.organization_id === activeAssignment.organization_id),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const snapshotAt =
        selected?.created_at ??
        candidates.reduce(
          (latest, row) => (row.created_at > latest ? row.created_at : latest),
          "",
        );
      return candidates.filter((row) => row.created_at === snapshotAt);
    },
  );
  const saveWeights = async () => {
    if (!supabase) return;
    const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0);
    if (total <= 0) return;
    await supabase.from("task_allocation_settings").upsert({ id: true, ...weights });
  };
  if (section === "Smart Task Allocation")
    return (
      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Smart Task Allocation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Explainable rankings use live capability, available people, GPS distance, performance, and workload.
            </p>
          </div>
          <button
            onClick={() => void saveWeights()}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Save ranking weights
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Object.entries(weights).map(([key, value]) => (
            <label key={key} className="card-surface p-3 text-xs font-bold capitalize">
              {key.replace("_weight", "")}%
              <input
                type="number"
                min="0"
                value={value}
                onChange={(event) =>
                  setWeights((current) => ({ ...current, [key]: Number(event.target.value || 0) }))
                }
                className="mt-2 w-full rounded border border-input p-2 text-sm font-normal"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 overflow-x-auto card-surface">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-4">TASK</th><th className="p-4">PARTNER</th><th className="p-4">RANK</th><th className="p-4">SCORE</th><th className="p-4">GPS DISTANCE</th><th className="p-4">EXPERTISE</th><th className="p-4">RESOURCES</th><th className="p-4">AVAILABLE PEOPLE</th><th className="p-4">PERFORMANCE</th><th className="p-4">WORKLOAD</th><th className="p-4">DECISION</th>
              </tr>
            </thead>
            <tbody>
              {latestRankings.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-4 font-semibold">{challenge(row.challenge_id)?.public_id ?? "Task"}<br /><span className="font-normal text-muted-foreground">{challenge(row.challenge_id)?.title ?? ""}</span></td>
                  <td className="p-4">{partner(row.organization_id)?.name ?? "-"}</td>
                  <td className="p-4">#{row.allocation_rank}</td><td className="p-4 font-bold text-primary">{row.suitability_score}</td>
                  <td className="p-4">{row.distance_km == null ? "GPS unavailable" : `${row.distance_km} km`}</td>
                  <td className="p-4">{row.expertise_score}%</td><td className="p-4">{row.resource_score}%</td><td className="p-4">{row.availability_score}%</td><td className="p-4">{row.performance_score}%</td><td className="p-4">{row.workload_score}%</td>
                  <td className="p-4">{row.is_selected ? <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">Assigned</span> : "Eligible"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!latestRankings.length && <p className="p-8 text-center text-sm text-muted-foreground">No smart allocation decisions yet. New reported problems are evaluated automatically.</p>}
        </div>
      </section>
    );
  if (section === "Skilled Participants" || section === "Volunteers") {
    const rows = members.filter((member) => {
      const owner = partner(member.organization_id);
      return (
        (isVolunteerView
          ? owner?.organization_type === "NGO"
          : owner?.organization_type !== "NGO") &&
        matches(`${member.name} ${member.skills.join(" ")} ${owner?.name ?? ""}`)
      );
    });
    return (
      <section className="mt-7">
        <h2 className="text-2xl font-bold">{section}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform-wide private member directory. Only administrators can view these records.
        </p>
        <div className="mt-5 overflow-x-auto card-surface">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-4">NAME</th>
                <th className="p-4">{isVolunteerView ? "NGO" : "ORGANIZATION"}</th>
                <th className="p-4">SKILL / EXPERTISE</th>
                <th className="p-4">AVAILABILITY</th>
                <th className="p-4">CURRENT TASK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const assignment = assignments.find(
                  (item) =>
                    item.organization_id === member.organization_id &&
                    !["completed", "unable_to_resolve"].includes(item.status),
                );
                return (
                  <tr key={member.id} className="border-t border-border">
                    <td className="p-4 font-semibold">{member.name}</td>
                    <td className="p-4">{partner(member.organization_id)?.name ?? "-"}</td>
                    <td className="p-4">{member.skills.join(", ") || "-"}</td>
                    <td className="p-4">{member.availability || "Not set"}</td>
                    <td className="p-4">
                      {assignment
                        ? (challenge(assignment.challenge_id)?.public_id ?? "Assigned")
                        : "Not assigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No matching records found.
            </p>
          )}
        </div>
      </section>
    );
  }
  if (section === "Task Tracking")
    return (
      <section className="mt-7">
        <h2 className="text-2xl font-bold">Task Tracking</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor the full assignment lifecycle across all partners.
        </p>
        <div className="mt-5 space-y-3">
          {assignments
            .filter((item) =>
              matches(
                `${challenge(item.challenge_id)?.title ?? ""} ${partner(item.organization_id)?.name ?? ""} ${item.status}`,
              ),
            )
            .map((item) => (
              <article
                key={item.id}
                className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="text-xs font-bold text-primary">
                    {challenge(item.challenge_id)?.public_id ?? "TASK"} |{" "}
                    {partner(item.organization_id)?.name ?? "Unassigned partner"}
                  </p>
                  <h3 className="mt-1 font-bold">
                    {challenge(item.challenge_id)?.title ?? "Task record"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assigned {new Date(item.created_at).toLocaleString()}{" "}
                    {item.accepted_at
                      ? `| Accepted ${new Date(item.accepted_at).toLocaleString()}`
                      : "| Awaiting acceptance"}
                  </p>
                </div>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                  {item.status.replaceAll("_", " ")}
                </span>
                {item.status === "pending" && !item.accepted_at && <AcceptanceCountdown deadline={item.acceptance_deadline} />}
              </article>
            ))}
          {!assignments.length && (
            <p className="card-surface p-8 text-center text-sm text-muted-foreground">
              No assignment lifecycle records yet.
            </p>
          )}
        </div>
      </section>
    );
  if (section === "Reassignments")
    return (
      <section className="mt-7">
        <h2 className="text-2xl font-bold">Reassignment Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review why a task moved and where it was routed next.
        </p>
        <div className="mt-5 overflow-x-auto card-surface">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-4">TASK</th>
                <th className="p-4">ORIGINAL PARTNER</th>
                <th className="p-4">FAILURE REASON</th>
                <th className="p-4">NEW PARTNER</th>
                <th className="p-4">REASSIGNED</th>
                <th className="p-4">CURRENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => {
                const assignment = assignments.find((item) => item.id === transfer.assignment_id);
                return (
                  <tr key={transfer.id} className="border-t border-border">
                    <td className="p-4 font-semibold">
                      {assignment
                        ? (challenge(assignment.challenge_id)?.public_id ?? "Task")
                        : "Task"}
                    </td>
                    <td className="p-4">
                      {assignment ? (partner(assignment.organization_id)?.name ?? "-") : "-"}
                    </td>
                    <td className="p-4">{transfer.reason}</td>
                    <td className="p-4">{partner(transfer.to_organization_id)?.name ?? "-"}</td>
                    <td className="p-4">{new Date(transfer.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      {assignment?.status.replaceAll("_", " ") ?? "Reassigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!transfers.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No reassigned tasks have been recorded.
            </p>
          )}
        </div>
      </section>
    );
  if (section === "Expertise & Resources")
    return (
      <section className="mt-7">
        <h2 className="text-2xl font-bold">Expertise & Resources</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A platform capability map for allocation and reassignment decisions.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {partners
            .filter((item) =>
              matches(`${item.name} ${item.expertise.join(" ")} ${item.capabilities.join(" ")}`),
            )
            .map((item) => (
              <article key={item.id} className="card-surface p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.organization_type} |{" "}
                      {item.locality || item.district || "Location not set"}
                    </p>
                  </div>
                  <MapPin size={18} className="text-primary" />
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground">EXPERTISE</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.expertise.map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary"
                    >
                      {value}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground">RESOURCES</p>
                <p className="mt-2 text-sm">
                  {item.capabilities.join(", ") || "No resources listed"}
                </p>
              </article>
            ))}
        </div>
      </section>
    );
  if (section === "Reports")
    return (
      <section className="mt-7">
        <h2 className="text-2xl font-bold">Admin Reports</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Export-ready reporting overview for performance, outcomes, and response health.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DashboardStat
            label="Reported tasks"
            value={tasks.length}
            icon={<FileSpreadsheet size={18} />}
          />
          <DashboardStat
            label="Resolved / impact"
            value={tasks.filter((item) => item.stage === "impact").length}
            icon={<CheckCircle2 size={18} />}
          />
          <DashboardStat label="Reassigned" value={transfers.length} icon={<Repeat2 size={18} />} />
        </div>
        <button
          onClick={() => {
            const rows = [
              ["Task ID", "Title", "Location", "Status"],
              ...tasks.map((item) => [item.public_id, item.title, item.district, item.stage]),
            ];
            const link = document.createElement("a");
            link.href = URL.createObjectURL(
              new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }),
            );
            link.download = "samajsetu-admin-report.csv";
            link.click();
            URL.revokeObjectURL(link.href);
          }}
          className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <Download className="mr-1 inline" size={16} /> Export task report
        </button>
      </section>
    );
  return (
    <section className="mt-7">
      <h2 className="text-2xl font-bold">Analytics</h2>
      <p className="mt-2 text-sm text-muted-foreground">Live platform-wide operating metrics.</p>
      <AdminAnalytics assignments={assignments} partners={partners} tasks={tasks} transfers={transfers} />
    </section>
  );
}

function AdminAnalytics({
  assignments,
  partners,
  tasks,
  transfers,
}: {
  assignments: AdminAssignment[];
  partners: AdminPartner[];
  tasks: Challenge[];
  transfers: AdminTransfer[];
}) {
  const partnerFor = (id: string) => partners.find((partner) => partner.id === id);
  const challengeFor = (id: string) => tasks.find((task) => task.id === id);
  const solved = assignments.filter((item) => ["completed", "verified"].includes(item.status));
  const organizationAssignments = assignments.filter((item) => partnerFor(item.organization_id)?.organization_type !== "NGO");
  const ngoAssignments = assignments.filter((item) => partnerFor(item.organization_id)?.organization_type === "NGO");
  const organizationSolved = solved.filter((item) => partnerFor(item.organization_id)?.organization_type !== "NGO").length;
  const ngoSolved = solved.filter((item) => partnerFor(item.organization_id)?.organization_type === "NGO").length;
  const inProgress = assignments.filter((item) => ["accepted", "in_progress"].includes(item.status)).length;
  const couldNotSolve = assignments.filter((item) => item.status === "unable_to_resolve").length;
  const aggregate = (key: (assignment: AdminAssignment) => string) => {
    const values = new Map<string, number>();
    for (const item of solved) { const label = key(item); values.set(label, (values.get(label) ?? 0) + 1); }
    return [...values.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  };
  const monthLabels = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString(undefined, { month: "short" }), value: 0 };
  });
  for (const item of solved) {
    const date = new Date(item.resolved_at ?? item.created_at);
    const bucket = monthLabels.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  }
  const categoryData = aggregate((item) => challengeFor(item.challenge_id)?.domain || "Uncategorised");
  const districtData = aggregate((item) => challengeFor(item.challenge_id)?.district || "Unspecified");
  const maximum = Math.max(organizationSolved, ngoSolved, ...categoryData.map((item) => item.value), ...districtData.map((item) => item.value), 1);
  const trendMaximum = Math.max(...monthLabels.map((month) => month.value), 1);
  const HorizontalChart = ({ title, data }: { title: string; data: { label: string; value: number }[] }) => <section className="card-surface p-5"><h3 className="font-bold">{title}</h3><div className="mt-5 space-y-3">{data.length ? data.map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{item.label}</span><b>{item.value}</b></div><div className="h-3 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / maximum) * 100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">No solved problems recorded yet.</p>}</div></section>;
  return <><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Problems solved by organizations" value={organizationSolved} icon={<Building2 size={18} />} /><DashboardStat label="Problems solved by NGOs" value={ngoSolved} icon={<ShieldCheck size={18} />} /><DashboardStat label="Total problems solved" value={solved.length} icon={<CheckCircle2 size={18} />} /><DashboardStat label="Handled by organizations" value={organizationAssignments.length} icon={<ClipboardCheck size={18} />} /><DashboardStat label="Handled by NGOs" value={ngoAssignments.length} icon={<ClipboardCheck size={18} />} /><DashboardStat label="Currently being worked on" value={inProgress} icon={<Activity size={18} />} /><DashboardStat label="Could not be solved" value={couldNotSolve} icon={<XCircle size={18} />} /><DashboardStat label="Reassigned problems" value={transfers.length} icon={<Repeat2 size={18} />} /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="card-surface p-5"><h3 className="font-bold">Organization vs NGO solved problems</h3><p className="mt-1 text-sm text-muted-foreground">Completed assignments, grouped by the assigned partner type.</p><div className="mt-5 space-y-4">{[{ label: "Organizations", value: organizationSolved, color: "bg-primary" }, { label: "NGOs", value: ngoSolved, color: "bg-accent" }].map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><b>{item.value}</b></div><div className="h-5 overflow-hidden rounded-full bg-surface"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / maximum) * 100}%` }} /></div></div>)}</div></section><section className="card-surface p-5"><h3 className="font-bold">Monthly problems solved</h3><p className="mt-1 text-sm text-muted-foreground">Last six months, based on each assignment's resolution date.</p><div className="mt-5 flex h-38 items-end justify-between gap-2">{monthLabels.map((month) => <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><b className="mb-1 text-xs">{month.value}</b><div className="min-h-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (month.value / trendMaximum) * 100)}%` }} /><span className="mt-2 text-xs text-muted-foreground">{month.label}</span></div>)}</div></section><HorizontalChart title="Category-wise problems solved" data={categoryData} /><HorizontalChart title="District-wise problems solved" data={districtData} /></div></>;
}

function SupportFunding({ flash }: { flash: (message: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("government_scheme");
  const [url, setUrl] = useState("");
  const [contact, setContact] = useState("");
  const load = async () => {
    const { data, error } = await supabase!.from("support_information").select("id,title,support_type,official_url,contact_information,verification_status,created_at").order("created_at", { ascending: false });
    if (error) flash(error.message); else setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);
  const add = async () => {
    if (!title.trim()) return flash("Enter a support or funding title.");
    const { error } = await supabase!.from("support_information").insert({ title: title.trim(), support_type: type, official_url: url.trim() || null, contact_information: contact.trim() || null, verification_status: "pending" });
    if (error) return flash(error.message);
    setTitle(""); setUrl(""); setContact(""); await load(); flash("Support information saved as pending verification.");
  };
  const updateStatus = async (id: string, verification_status: string) => {
    const { error } = await supabase!.from("support_information").update({ verification_status }).eq("id", id);
    if (error) flash(error.message); else { await load(); flash(`Listing marked ${verification_status}.`); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase!.from("support_information").delete().eq("id", id);
    if (error) flash(error.message); else { await load(); flash("Support listing deleted."); }
  };
  return <section className="mt-7"><h2 className="text-2xl font-bold">Support & Funding</h2><p className="mt-1 text-sm text-muted-foreground">Manage government schemes, CSR opportunities, NGO programs, emergency resources, and official contacts. Pending entries are never presented as official schemes.</p><div className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Program or scheme title" className="rounded-lg border border-input p-2 text-sm" /><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-input bg-card p-2 text-sm"><option value="government_scheme">Government scheme</option><option value="government_assistance">Government assistance</option><option value="csr_funding">CSR funding</option><option value="ngo_program">NGO support program</option><option value="department">Relevant department</option><option value="emergency_resource">Emergency resource</option></select><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Official application link" className="rounded-lg border border-input p-2 text-sm" /><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact information" className="rounded-lg border border-input p-2 text-sm" /><button onClick={() => void add()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Add pending listing</button></div><div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4"><div><b>{item.title}</b><p className="mt-1 text-xs text-muted-foreground">{item.support_type.replaceAll("_", " ")} | {item.official_url || item.contact_information || "No link/contact supplied"}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.verification_status === "verified" ? "bg-[#EAF7EF] text-[#0B5D2A]" : "bg-[#F6FBF8] text-[#0B5D2A]"}`}>{item.verification_status}</span><button onClick={() => void updateStatus(item.id, item.verification_status === "verified" ? "pending" : "verified")} className="text-sm font-bold text-primary">{item.verification_status === "verified" ? "Mark pending" : "Verify"}</button><button onClick={() => void remove(item.id)} className="text-sm font-bold text-destructive">Delete</button></div></article>)}{!items.length && <p className="rounded-lg bg-surface p-5 text-sm text-muted-foreground">No support listings yet.</p>}</div></section>;
}

function Admin({ flash, refresh }: { flash: (x: string) => void; refresh: (q?: string) => void }) {
  const [items, setItems] = useState<Challenge[]>([]),
    [analyses, setAnalyses] = useState<Record<string, PriorityAnalysis>>({}),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const [{ data }, { data: analysisData }] = await Promise.all([
      supabase!.rpc("search_challenges", { search_text: "" }),
      supabase!.from("challenge_priority_analyses").select("challenge_id,validated_factors,confidence,analysis_status,override_applied,override_reason,ai_analysis").order("created_at", { ascending: false }),
    ]);
    setItems((data ?? []) as Challenge[]);
    const latestAnalyses: Record<string, PriorityAnalysis> = {};
    for (const item of (analysisData ?? []) as PriorityAnalysis[]) if (!latestAnalyses[item.challenge_id]) latestAnalyses[item.challenge_id] = item;
    setAnalyses(latestAnalyses);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const verify = async (c: Challenge) => {
    const { error } = await supabase!.rpc("review_challenge", {
      challenge_uuid: c.id,
      next_status: "under_review",
      review_method: "admin queue review",
      review_note: "Moved from the verification queue for documented review.",
    });
    if (error) flash(error.message);
    else {
      flash(`${c.public_id} moved to review.`);
      void load();
      void refresh();
    }
  };
  return (
    <section className="container-page py-12">
      <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
        PLATFORM ADMINISTRATION
      </span>
      <h1 className="mt-4 text-3xl font-bold">Verification queue</h1>
      <p className="mt-2 text-muted-foreground">
        Human review is required before a community report becomes an official challenge.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <Stat n={items.length} t="Total challenges" />
        <Stat n={items.filter((x) => x.verification === "unverified").length} t="Unverified" />
        <Stat n={items.filter((x) => x.priority_score >= 75).length} t="High priority" />
      </div>
      <div className="mt-7 space-y-3">
        {loading ? (
          <p>Loading queue...</p>
        ) : (
          items.map((c) => (
            <div
              className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"
              key={c.id}
            >
              <div>
                <b className="text-xs text-primary">{c.public_id}</b>
                <p className="mt-1 font-bold">{c.title}</p>
                {analyses[c.id] && <details className="mt-3 max-w-xl rounded-lg bg-primary-soft/40 p-3 text-xs"><summary className="cursor-pointer font-bold text-primary">AI-assisted priority analysis | {analyses[c.id].analysis_status.replaceAll("_", " ")} | {analyses[c.id].confidence ?? 0}% confidence</summary><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(analyses[c.id].validated_factors).filter(([key]) => !["emergency_signal", "critical_hazard"].includes(key)).map(([key, value]) => <p key={key}><span className="text-muted-foreground">{key.replaceAll("_", " ")}</span><br /><b>{String(value)}/100</b></p>)}</div>{analyses[c.id].ai_analysis?.reasons?.length ? <ul className="mt-3 list-disc space-y-1 pl-4">{analyses[c.id].ai_analysis.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}{analyses[c.id].override_applied && <p className="mt-3 font-bold text-destructive">Critical override: {analyses[c.id].override_reason}</p>}</details>}
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.district} | {c.domain} | {c.priority_score}/100
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold">
                  {c.verification.replaceAll("_", " ")}
                </span>
                {c.verification === "unverified" && (
                  <button
                    onClick={() => void verify(c)}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                  >
                    Start review
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
function Forbidden() {
  return (
    <section className="container-page py-20 text-center">
      <LayoutDashboard className="mx-auto text-primary" />
      <h1 className="mt-5 text-3xl font-bold">Admin access required</h1>
      <p className="mt-3 text-muted-foreground">
        Your account does not have platform-administrator permission.
      </p>
    </section>
  );
}
function Stat({ n, t }: { n: string | number; t: string }) {
  return (
    <div className="card-surface p-5 text-center">
      <b className="text-2xl text-primary">{n}</b>
      <p className="mt-1 text-xs text-muted-foreground">{t}</p>
    </div>
  );
}
