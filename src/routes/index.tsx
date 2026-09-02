import { createFileRoute } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  FileUp,
  Image as ImageIcon,
  LocateFixed,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
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
  XCircle,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { MediaUpload } from "@/components/MediaUpload";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({ component: SamajSetu });
type Screen = "home" | "auth" | "report" | "explore" | "my-reports" | "admin" | "organization" | "coordinator" | "volunteer";
type Profile = { id: string; display_name: string | null; role: string; district: string | null };
type Challenge = {
  id: string;
  public_id: string;
  title: string;
  domain: string;
  district: string;
  priority_score: number;
  verification: string;
  stage: string;
  affected_population: number | null;
  reports: number;
  created_at: string;
  preview_image_path: string | null;
  media: { path: string; type: string }[] | null;
  comments: { id: string; note: string; created_at: string }[] | null;
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

function SamajSetu() {
  const [screen, setScreen] = useState<Screen>("home"),
    [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [challenges, setChallenges] = useState<Challenge[]>([]),
    [supportedIds, setSupportedIds] = useState<string[]>([]),
    [notice, setNotice] = useState("");
  const loadChallenges = async (q = "") => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("search_challenges", { search_text: q });
    if (error) flash(error.message);
    else setChallenges((data ?? []) as Challenge[]);
  };
  const loadProfile = async (u: User | null) => {
    setUser(u);
    if (!u || !supabase) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,role,district")
      .eq("id", u.id)
      .single();
    setProfile(data);
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
    } = supabase!.auth.onAuthStateChange((_e, s) => void loadProfile(s?.user ?? null));
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
  if (!isSupabaseConfigured) return <Setup />;
  const go = (v: Screen) => {
    setScreen(v);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const repost = async (challenge: Challenge, note = "") => {
    if (!user) {
      flash("Sign in to repost a community problem.");
      go("auth");
      return;
    }
    const { error } = await supabase!
      .from("challenge_supports")
      .insert({
        challenge_id: challenge.id,
        supporter_id: user.id,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    if (error) {
      flash(error.code === "23505" ? "You have already reposted this problem." : error.message);
      return;
    }
    setSupportedIds((ids) => [...ids, challenge.id]);
    void loadChallenges();
    flash(`Your repost added support to ${challenge.public_id}.`);
  };
  const isAdmin = profile?.role === "admin";
  return (
    <main className="min-h-screen bg-background">
      <Header
        user={user}
        profile={profile}
        go={go}
        logout={async () => {
          await supabase!.auth.signOut();
          flash("Signed out successfully.");
        }}
      />
      {screen === "home" && <Home go={go} count={challenges.length} user={user} />}{" "}
      {screen === "auth" && (
        <Auth
          complete={(accountType) => {
            flash("Welcome to SamajSetu.");
            go(accountType === "organization" ? "organization" : accountType === "volunteer" ? "volunteer" : "my-reports");
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
          complete={() => {
            flash("Report submitted for verification.");
            void loadChallenges();
            go("my-reports");
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
      {screen === "organization" && <OrganizationRegistration user={user} go={go} flash={flash} />}{" "}
      {screen === "coordinator" && <OrganizationDashboard user={user} flash={flash} />}{" "}
      {screen === "volunteer" && <VolunteerDashboard user={user} />} {" "}
      {screen === "admin" &&
        (isAdmin ? <Admin flash={flash} refresh={loadChallenges} /> : <Forbidden />)}
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift">
          <Check className="mr-2 inline text-emerald-300" size={16} />
          {notice}
        </div>
      )}
    </main>
  );
}
function Header({
  user,
  profile,
  go,
  logout,
}: {
  user: User | null;
  profile: Profile | null;
  go: (x: Screen) => void;
  logout: () => void;
}) {
  const isOrganizationUser = user?.user_metadata?.["account_type"] === "organization";
  const isVolunteer = user?.user_metadata?.["account_type"] === "volunteer";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-17 items-center justify-between">
        <button onClick={() => go("home")} className="font-display text-xl font-bold text-primary">
          SamajSetu
        </button>
        <nav className="flex items-center gap-3 text-sm font-bold">
          <button onClick={() => go("explore")} className="hidden sm:block">
            Challenges
          </button>
          {user && !isOrganizationUser && (
            <button onClick={() => go("my-reports")} className="hidden sm:block">
              My reports
            </button>
          )}
          {user && isOrganizationUser && (
            <button onClick={() => go("coordinator")} className="hidden sm:block">
              Coordinator
            </button>
          )}
          {user && isVolunteer && <button onClick={() => go("volunteer")} className="hidden sm:block">My workspace</button>}
          {profile?.role === "admin" && (
            <button onClick={() => go("admin")} className="hidden sm:block text-primary">
              Admin
            </button>
          )}
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground md:block">
                {profile?.display_name || user.email || "Signed in"}
              </span>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg border border-border p-2"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => go("auth")}
              className="rounded-lg border border-border px-3 py-2"
            >
              Sign in
            </button>
          )}
          <button
            onClick={() => go("report")}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Report
          </button>
          {user && isOrganizationUser && (
            <button onClick={() => go("organization")} className="hidden rounded-lg border border-border px-3 py-2 sm:block">
              Organization
            </button>
          )}
        </nav>
      </div>
    </header>
  );
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
function Home({ go, count, user }: { go: (x: Screen) => void; count: number; user: User | null }) {
  const stages = [
    [BrainCircuit, "Understand"],
    [ShieldCheck, "Validate"],
    [Users, "Match"],
    [ClipboardCheck, "Build"],
    [Activity, "Impact"],
  ] as const;
  return (
    <>
      <section className="grid-bg">
        <div className="container-page py-24">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            JHARKHAND COMMUNITY INNOVATION
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-tight">
            From community problems to <span className="text-primary">measurable impact.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
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
            {!user && (
              <button onClick={() => go("auth")} className="px-4 text-sm font-bold text-primary">
                Create an account
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="container-page grid grid-cols-3 border-x border-b border-border bg-card">
        <Stat n={count} t="Live challenges" />
        <Stat n="Realtime" t="Database updates" />
        <Stat n="Human-led" t="Verification" />
      </section>
      <section className="container-page py-18">
        <h2 className="text-3xl font-bold">One shared journey</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {stages.map(([I, t]) => (
            <div key={t} className="card-surface p-5">
              {createElement(I, { className: "text-primary", size: 20 })}
              <h3 className="mt-4 font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Transparent, accountable progress.
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
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
        {mode === "signup" && (<>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-5 w-full rounded-lg border border-input p-3"
          />
          <label className="mt-4 block text-sm font-bold">I want to join as</label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value as typeof accountType)} className="mt-2 w-full rounded-lg border border-input bg-background p-3">
            <option value="citizen">Citizen — report and track local problems</option>
            <option value="volunteer">Volunteer — help solve community challenges</option>
            <option value="organization">Organization — coordinate projects and teams</option>
          </select>
        </>)}
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
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
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
function Auth({ complete }: { complete: (accountType: string) => void }) {
  const [kind, setKind] = useState<"Organization" | "NGO" | null>(null);
  const [signIn, setSignIn] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const login = async () => { if (!supabase) return; setBusy(true); setError(""); const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (loginError) setError(loginError.message); else complete(data.user?.user_metadata?.["account_type"] ?? "organization"); };
  return <section className="container-page max-w-3xl py-14"><div className="card-surface p-7 sm:p-10"><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">SECURE PARTNER ACCESS</span><h1 className="mt-4 text-3xl font-bold">Sign In / Register</h1><p className="mt-2 text-muted-foreground">Choose the type of partner account you want to create.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><button onClick={() => setKind("Organization")} className="rounded-2xl border border-border p-6 text-left transition hover:border-primary hover:shadow-lift"><Users className="text-primary" size={26}/><h2 className="mt-5 text-xl font-bold">Organization</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Register an institution, college, department, or company response team.</p><span className="mt-5 inline-block text-sm font-bold text-primary">Register organization →</span></button><button onClick={() => setKind("NGO")} className="rounded-2xl border border-border p-6 text-left transition hover:border-primary hover:shadow-lift"><ShieldCheck className="text-accent" size={26}/><h2 className="mt-5 text-xl font-bold">NGO</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Register a non-profit team to contribute expertise and community resources.</p><span className="mt-5 inline-block text-sm font-bold text-primary">Register NGO →</span></button></div><div className="mt-8 border-t border-border pt-6 text-center"><button onClick={() => { setSignIn(!signIn); setError(""); }} className="text-sm font-bold text-primary">Already registered? Sign in securely</button>{signIn && <div className="mx-auto mt-4 grid max-w-md gap-3 text-left"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Official email ID" className="rounded-lg border border-input p-3"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="rounded-lg border border-input p-3"/>{error && <p className="text-sm text-destructive">{error}</p>}<button disabled={busy || !email || !password} onClick={() => void login()} className="rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></div>}</div></div>{kind && <PartnerRegistration kind={kind} close={() => setKind(null)} complete={complete}/>}</section>;
}

function PartnerRegistration({ kind, close, complete }: { kind: "Organization" | "NGO"; close: () => void; complete: (type: string) => void }) {
  const noun = kind === "NGO" ? "NGO" : "Organization";
  const [name, setName] = useState(""), [latitude, setLatitude] = useState(""), [longitude, setLongitude] = useState(""), [email, setEmail] = useState(""), [expertise, setExpertise] = useState(""), [resources, setResources] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [error, setError] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const getGps = () => { setError(""); setInfo("Requesting location permission…"); if (!navigator.geolocation) { setInfo(""); setError("GPS is not supported on this device. Enter coordinates manually."); return; } navigator.geolocation.getCurrentPosition(p => { setLatitude(p.coords.latitude.toFixed(6)); setLongitude(p.coords.longitude.toFixed(6)); setInfo("Current GPS location retrieved. You can edit these values if needed."); }, e => { setInfo(""); setError(e.code === e.PERMISSION_DENIED ? "Location permission was denied. Enter latitude and longitude manually." : "Unable to retrieve GPS location. Please try again or enter coordinates manually."); }, { enableHighAccuracy: true, timeout: 12000 }); };
  const register = async () => { const lat = Number(latitude), lng = Number(longitude); if (![name, latitude, longitude, email, expertise, resources, password, confirm].every(x => x.trim())) return setError("Complete all required fields before registering."); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address."); if (password !== confirm) return setError("Password and Confirm Password must match."); if (password.length < 6) return setError("Password must be at least 6 characters."); if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return setError("Enter valid coordinates: latitude −90 to 90 and longitude −180 to 180."); if (!supabase) return; setBusy(true); setError(""); const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim(), account_type: "organization", organization_type: kind, latitude: lat, longitude: lng, expertise, resources } } }); if (signupError) { setError(signupError.message); setBusy(false); return; } if (data.user && data.session) { const { error: orgError } = await supabase.from("organization_accounts").upsert({ owner_id: data.user.id, name: name.trim(), organization_type: kind, contact_email: email.trim(), latitude: lat, longitude: lng, expertise: expertise.split(",").map(x => x.trim()).filter(Boolean), capabilities: resources.split(",").map(x => x.trim()).filter(Boolean) }, { onConflict: "owner_id" }); setBusy(false); if (orgError) return setError(orgError.message); close(); complete("organization"); } else { setBusy(false); setInfo("Registration created. Check your email to verify your account, then sign in."); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-lift sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">SECURE REGISTRATION</span><h2 className="mt-3 text-2xl font-bold">{noun} Registration</h2><p className="mt-1 text-sm text-muted-foreground">All fields are required. GPS coordinates may be entered manually.</p></div><button onClick={close} className="rounded-lg border border-border px-3 py-2 text-sm font-bold">Close</button></div><div className="mt-6 grid gap-4"><label className="text-sm font-bold">{noun} Name<input value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-input p-3"/></label><div className="rounded-xl bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b className="text-sm">{noun} GPS Location</b><p className="mt-1 text-xs text-muted-foreground">Use the actual current location from this device.</p></div><button type="button" onClick={getGps} className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary"><MapPin size={16}/> Get GPS Location</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Latitude<input value={latitude} onChange={e=>setLatitude(e.target.value)} inputMode="decimal" placeholder="e.g. 16.5062" className="mt-2 w-full rounded-lg border border-input bg-card p-3"/></label><label className="text-sm font-bold">Longitude<input value={longitude} onChange={e=>setLongitude(e.target.value)} inputMode="decimal" placeholder="e.g. 80.6480" className="mt-2 w-full rounded-lg border border-input bg-card p-3"/></label></div>{latitude && longitude && <p className="mt-3 rounded-lg bg-card p-3 font-mono text-xs text-primary">Latitude: {latitude}<br/>Longitude: {longitude}</p>}</div><label className="text-sm font-bold">{kind === "NGO" ? "Email ID" : "Official Email ID"}<input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-2 w-full rounded-lg border border-input p-3"/></label><label className="text-sm font-bold">Area of Expertise<textarea value={expertise} onChange={e=>setExpertise(e.target.value)} className="mt-2 min-h-22 w-full rounded-lg border border-input p-3"/></label><label className="text-sm font-bold">Available Resources<textarea value={resources} onChange={e=>setResources(e.target.value)} className="mt-2 min-h-22 w-full rounded-lg border border-input p-3"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Create Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="mt-2 w-full rounded-lg border border-input p-3"/></label><label className="text-sm font-bold">Confirm Password<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" className="mt-2 w-full rounded-lg border border-input p-3"/></label></div>{error && <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">{error}</p>}{info && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{info}</p>}<button disabled={busy} onClick={() => void register()} className="rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Registering…" : `Register ${noun}`}</button></div></div></div>;
}

function Report({
  user,
  go,
  complete,
  challenges,
  supportedIds,
  repost,
}: {
  user: User | null;
  go: (x: Screen) => void;
  complete: () => void;
  challenges: Challenge[];
  supportedIds: string[];
  repost: (challenge: Challenge, note?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [supportingInfo, setSupportingInfo] = useState(""),
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
    [locationLabel, setLocationLabel] = useState(""),
    [showNearby, setShowNearby] = useState(false),
    [mediaError, setMediaError] = useState("");

  const nearby = challenges.slice(0, 3).map((challenge, index) => ({
    challenge,
    distance: (0.4 + index * 0.7).toFixed(1),
  }));

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    let actor = user;
    if (!actor) {
      const a = await supabase.auth.signInAnonymously();
      actor = a.data.user;
      if (a.error || !actor) {
        setError(a.error?.message ?? "Unable to create secure reporting session.");
        setBusy(false);
        return;
      }
    }
    const domain = /water|handpump|well|tap/i.test(description) ? "Water" : "Public Services";
    const { data: c, error: ce } = await supabase
      .from("challenges")
      .insert({
        title: title.trim(),
        summary: `${description}${supportingInfo ? `\n\nSupporting information: ${supportingInfo}` : ""}`,
        domain,
        district,
        block,
        locality,
        severity: 2,
        urgency: 2,
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
        district,
        block,
        locality,
        latitude,
        longitude,
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
            setSupportingInfo("");
            setDistrict("");
            setBlock("");
            setLocality("");
          }}
          className="text-sm font-bold text-muted-foreground"
        >
          ← Back
        </button>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">REPORT SAVED — NO ACCOUNT NEEDED</span>
        <h1 className="mt-5 text-3xl font-bold">Your Problem ID is ready</h1>
        <p className="mt-2 rounded-lg bg-primary-soft p-3 text-sm font-bold text-primary">
          Problem ID: {publicId ?? "Generating…"}. Keep this ID to track your report.
        </p>
        <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm"><b>Tracking link</b><span className="ml-2 break-all text-primary">samajsetu.in/track/{publicId}</span></div>
        <p className="mt-2 text-muted-foreground">
          Attach photos, videos, or audio recordings to strengthen your report and help verify the
          problem.
        </p>
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
        ← Back
      </button>
      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">NO SIGN-IN REQUIRED</span>
      <h1 className="mt-5 text-3xl font-bold">Report a community problem</h1>
      <p className="mt-2 text-muted-foreground">
        Share what you see in plain language. You will receive a Problem ID and tracking link after submission.
      </p>
      <div className="card-surface mt-7 p-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Problem title *"
          className="w-full rounded-lg border border-input p-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is happening? Who is affected?"
          className="mt-3 min-h-36 w-full rounded-lg border border-input p-3"
        />
        <div className="mt-5 flex items-center justify-between gap-3"><label className="text-sm font-bold">Location</label><span className="text-xs text-muted-foreground">GPS or manual entry</span></div>
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
        </div>
        <textarea
          value={supportingInfo}
          onChange={(e) => setSupportingInfo(e.target.value)}
          placeholder="Supporting information (optional)"
          className="mt-3 min-h-24 w-full rounded-lg border border-input p-3"
        />
        <button
          onClick={() => navigator.geolocation?.getCurrentPosition(
            (position) => {
              setLatitude(position.coords.latitude);
              setLongitude(position.coords.longitude);
              setLocationLabel("Current location added");
              setShowNearby(true);
            },
            () => setError("Location could not be obtained. Please enter your location manually."),
          )}
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-bold text-primary"
        >
          <LocateFixed size={16} /> {latitude !== null ? "Location added" : "Use current GPS location"}
        </button>
        {locationLabel && <span className="ml-3 text-sm font-medium text-accent">{locationLabel}</span>}
        {(showNearby || locality.length > 2) && nearby.length > 0 && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-bold">Possible matches nearby</p><p className="mt-1 text-sm text-muted-foreground">Avoid duplicate reports by supporting an existing problem.</p></div><Navigation className="text-primary" size={20} /></div>
            <div className="mt-3 space-y-2">{nearby.map(({ challenge, distance }) => <div key={challenge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-3"><div><b className="text-sm">{challenge.title}</b><p className="mt-1 text-xs text-muted-foreground"><MapPin className="mr-1 inline" size={12}/>{distance} km away · {challenge.stage.replaceAll("_", " ")}</p></div><button disabled={supportedIds.includes(challenge.id)} onClick={() => void repost(challenge, "Also affected — submitted from report flow.")} className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-50">{supportedIds.includes(challenge.id) ? "Supporting" : "I am also affected"}</button></div>)}</div>
          </div>
        )}
        <p className="mt-5 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mr-2 inline text-accent" size={16} />
          Sensitive evidence and exact locations stay private.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          disabled={busy || title.trim().length < 3 || description.length < 10 || !district}
          onClick={() => void submit()}
          className="mt-6 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Submit for review"}
        </button>
      </div>
    </section>
  );
}
function Explorer({
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
    [located, setLocated] = useState(false);
  return (
    <section className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">LOCATION-BASED DISCOVERY</span><h1 className="mt-4 text-3xl font-bold">Problems near you</h1></div><button onClick={() => navigator.geolocation?.getCurrentPosition(() => setLocated(true), () => setLocated(true))} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary"><LocateFixed size={16}/>{located ? "Location shared" : "Use my location"}</button></div>
      <p className="mt-2 text-muted-foreground">
        Found the same problem? Repost it instead of creating another card. Each person can repost
        once.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="relative min-h-64 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_20%_30%,oklch(0.9_0.05_268),transparent_2px),radial-gradient(circle_at_75%_60%,oklch(0.9_0.05_155),transparent_2px)] bg-[length:32px_32px]"><div className="absolute inset-0 bg-primary/5"/><div className="absolute left-[22%] top-[34%] grid size-10 place-items-center rounded-full bg-primary text-white shadow-lift"><MapPin size={20}/></div><div className="absolute left-[62%] top-[52%] grid size-9 place-items-center rounded-full bg-destructive text-white shadow-lift"><MapPin size={18}/></div><div className="absolute bottom-4 left-4 rounded-lg bg-card/95 px-3 py-2 text-xs font-bold shadow-card">{located ? "Showing results within 5 km" : "Enable location for exact distance"}</div></div><div className="card-surface p-5"><p className="text-sm font-bold">Your local response network</p><div className="mt-4 space-y-4 text-sm"><p><b className="text-2xl text-primary">{challenges.length}</b><span className="ml-2 text-muted-foreground">reported problems nearby</span></p><p><b className="text-2xl text-accent">3</b><span className="ml-2 text-muted-foreground">partner organizations available</span></p><button onClick={() => go("report")} className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground">Report a new problem</button></div></div></div>
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
                  <b>{c.priority_score}/100</b>
                </div>
                {activeMedia && supabase ? (
                  <div className="relative aspect-square bg-black">
                    {activeMedia.type.startsWith("video/") ? (
                      <video
                        src={supabase.storage.from("challenge-previews").getPublicUrl(activeMedia.path).data.publicUrl}
                        controls
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <img
                        src={supabase.storage.from("challenge-previews").getPublicUrl(activeMedia.path).data.publicUrl}
                        alt={`Community evidence for ${c.title}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {media.length > 1 && (
                      <>
                        <button
                          aria-label="Previous media"
                          onClick={() => setMediaIndexes((items) => ({ ...items, [c.id]: (mediaIndex - 1 + media.length) % media.length }))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          aria-label="Next media"
                          onClick={() => setMediaIndexes((items) => ({ ...items, [c.id]: (mediaIndex + 1) % media.length }))}
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
                  {c.district} · {c.domain}
                </p>
                <div className="mt-4 flex gap-2 text-xs font-bold">
                  <span className="rounded-full bg-surface px-2 py-1">
                    {c.verification.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-1">
                    {c.reports} community reports
                  </span>
                </div>
                {comments.length > 0 && (
                  <section className="mt-4 border-t border-border pt-3" aria-label="Community comments">
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
                          setExpandedComments((items) => ({ ...items, [c.id]: !commentsExpanded }))
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
                      <p className="font-medium">Repost this problem to add your community support?</p>
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
    </section>
  );
}
function OrganizationRegistration({ user, go, flash }: { user: User | null; go: (x: Screen) => void; flash: (x: string) => void }) {
  const [name, setName] = useState(""), [kind, setKind] = useState("Institution"), [district, setDistrict] = useState(""), [locality, setLocality] = useState(""), [contact, setContact] = useState(""), [expertise, setExpertise] = useState(""), [capabilities, setCapabilities] = useState(""), [busy, setBusy] = useState(false);
  if (!user) return <Forbidden />;
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase!.from("organization_accounts").upsert({ owner_id: user.id, name, organization_type: kind, district, locality, contact_email: contact, expertise: expertise.split(",").map((x) => x.trim()).filter(Boolean), capabilities: capabilities.split(",").map((x) => x.trim()).filter(Boolean) }, { onConflict: "owner_id" });
    setBusy(false);
    if (error) flash(error.message); else { flash("Organization profile saved."); go("coordinator"); }
  };
  return <section className="container-page max-w-2xl py-12"><h1 className="text-3xl font-bold">Register your organization</h1><p className="mt-2 text-muted-foreground">You can review and correct the location before saving.</p><div className="card-surface mt-6 grid gap-3 p-6"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name *" className="rounded-lg border border-input p-3" /><select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-input p-3"><option>Institution</option><option>NGO</option><option>CSR / Industry</option></select><div className="grid gap-3 sm:grid-cols-2"><input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className="rounded-lg border border-input p-3" /><input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Locality" className="rounded-lg border border-input p-3" /></div><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact email" className="rounded-lg border border-input p-3" /><input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Areas of expertise (comma separated)" className="rounded-lg border border-input p-3" /><input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="Resources and capabilities (comma separated)" className="rounded-lg border border-input p-3" /><button disabled={!name || busy} onClick={() => void submit()} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save and open coordinator dashboard"}</button></div></section>;
}

type OrganizationTaskStatus = "Pending" | "Accepted" | "Students Assigned" | "Work in Progress" | "Solved" | "Couldn't Solve — Reassigned";
type OrganizationTask = { id: string; title: string; description: string; category: string; location: string; coordinates: string; reported: string; priority: "High" | "Medium" | "Low"; status: OrganizationTaskStatus; students: string[]; remarks?: string };

function OrganizationDashboard({ user, flash }: { user: User | null; flash: (x: string) => void }) {
  const [section, setSection] = useState("Dashboard");
  const [showInstitute, setShowInstitute] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClose, setShowClose] = useState<"solved" | "failed" | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>("SS-1024");
  const [instituteName, setInstituteName] = useState("ABC University");
  const [newCount, setNewCount] = useState("20");
  const [reason, setReason] = useState("Insufficient skilled participants");
  const [remarks, setRemarks] = useState("");
  const [institutes, setInstitutes] = useState([{ name: "ABC University", count: 20, history: ["20 participants · Today"] }, { name: "XYZ Institute", count: 15, history: ["15 participants · Today"] }]);
  const [tasks, setTasks] = useState<OrganizationTask[]>([
    { id: "SS-1024", title: "Damaged street light on main road", description: "A street-light pole near the Duvvada junction is damaged and has been non-functional for three nights, creating a safety concern for residents.", category: "Electricity & Energy", location: "Duvvada, Ward 12", coordinates: "17.7231, 83.3014", reported: "Today, 09:42 AM", priority: "High", status: "Pending", students: [] },
    { id: "SS-1021", title: "Unsafe drinking-water supply", description: "Residents reported discoloured water and need field testing and a documented response.", category: "Water & Sanitation", location: "MVP Colony, Sector 4", coordinates: "17.7416, 83.3230", reported: "Yesterday, 03:18 PM", priority: "Medium", status: "Accepted", students: ["Aditi Kumari"] },
    { id: "SS-1018", title: "Drainage blockage after rainfall", description: "Storm-water drainage is blocked along the school boundary.", category: "Roads & Infrastructure", location: "Madhurawada", coordinates: "17.8194, 83.3502", reported: "28 Aug, 11:06 AM", priority: "Low", status: "Work in Progress", students: ["Ravi Singh", "Sai Teja"] },
  ]);
  const task = tasks.find((item) => item.id === selectedTask) ?? tasks[0];
  if (!user) return <Forbidden />;
  const statusTone: Record<OrganizationTaskStatus, string> = { "Pending": "bg-amber-100 text-amber-800", "Accepted": "bg-sky-100 text-sky-800", "Students Assigned": "bg-violet-100 text-violet-800", "Work in Progress": "bg-orange-100 text-orange-800", "Solved": "bg-emerald-100 text-emerald-800", "Couldn't Solve — Reassigned": "bg-rose-100 text-rose-800" };
  const updateTask = (id: string, patch: Partial<OrganizationTask>) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const saveInstitute = () => {
    const count = Number(newCount || 0);
    setInstitutes((items) => {
      const found = items.find((item) => item.name.toLowerCase() === instituteName.trim().toLowerCase());
      if (found) return items.map((item) => item === found ? { ...item, count, history: [`${count} participants · ${new Date().toLocaleString()}`, ...item.history] } : item);
      return [...items, { name: instituteName.trim() || "New Institute", count, history: [`${count} participants · ${new Date().toLocaleString()}`] }];
    });
    setShowInstitute(false); flash("Skilled participant availability updated.");
  };
  const downloadReport = () => {
    const rows = [["Task ID", "Problem Title", "Problem Location", "Organization Name", "University / Institute", "Student Full Name", "Student Roll Number", "Student Skill / Expertise", "Assignment Date", "Task Status", "Remarks"], ...task.students.map((student, i) => [task.id, task.title, task.location, "SamajSetu Partner Organization", i ? "XYZ Institute" : "ABC University", student, `21A01A00${i + 1}`, i ? "Civil" : "Electrical", new Date().toLocaleDateString(), task.status, task.remarks ?? ""])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${task.id}-student-report.csv`; link.click(); URL.revokeObjectURL(link.href); flash("Excel-compatible task report downloaded.");
  };
  const nav = ["Dashboard", "Institutes / Universities", "Skilled Participants", "Assigned Tasks", "Active Tasks", "Completed Tasks", "Could Not Solve", "Task Tracking", "Reports / Excel Upload", "Profile"];
  const visibleTasks = section === "Active Tasks" ? tasks.filter((item) => ["Accepted", "Students Assigned", "Work in Progress"].includes(item.status)) : section === "Completed Tasks" ? tasks.filter((item) => item.status === "Solved") : section === "Could Not Solve" ? tasks.filter((item) => item.status.includes("Couldn't")) : tasks;
  return <div className="min-h-screen bg-surface"><div className="mx-auto flex max-w-[1600px]"><aside className="sticky top-0 hidden h-screen w-68 shrink-0 border-r border-border bg-card p-5 lg:block"><div className="flex items-center gap-3 px-2"><div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 size={20}/></div><div><b>SamajSetu</b><p className="text-xs text-muted-foreground">Organization portal</p></div></div><nav className="mt-8 space-y-1">{nav.map((item) => <button key={item} onClick={() => setSection(item)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}>{item === "Dashboard" ? <LayoutDashboard size={17}/> : item.includes("Institute") ? <Building2 size={17}/> : item.includes("Participant") ? <Users size={17}/> : item.includes("Tracking") ? <ListChecks size={17}/> : item.includes("Report") ? <FileSpreadsheet size={17}/> : <ClipboardCheck size={17}/>} {item}</button>)}</nav><button onClick={() => flash("Signed out successfully.")} className="mt-7 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-surface"><LogOut size={17}/> Logout</button></aside><main className="min-w-0 flex-1 p-4 sm:p-7"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-primary">ORGANIZATION WORKSPACE</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome, SamajSetu Partner Organization</h1><p className="mt-1 text-sm text-muted-foreground">Manage skilled participants, assignments, and outcomes in one place.</p></div><button onClick={() => setShowInstitute(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={17}/> Add / Update Skilled Participants</button></header>
  {section === "Dashboard" && <><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><DashboardStat label="Total Skilled Participants" value={institutes.reduce((sum, item) => sum + item.count, 0)} icon={<Users size={18}/>}/><DashboardStat label="Available Participants" value={institutes.reduce((sum, item) => sum + item.count, 0) - 8} icon={<BadgeCheck size={18}/>}/><DashboardStat label="Active Tasks" value={tasks.filter((item) => ["Accepted", "Students Assigned", "Work in Progress"].includes(item.status)).length} icon={<Activity size={18}/>}/><DashboardStat label="Completed Tasks" value={tasks.filter((item) => item.status === "Solved").length + 18} icon={<CheckCircle2 size={18}/>}/><DashboardStat label="Pending Tasks" value={tasks.filter((item) => item.status === "Pending").length} icon={<Clock3 size={18}/>}/><DashboardStat label="Reassigned Tasks" value={tasks.filter((item) => item.status.includes("Couldn't")).length + 2} icon={<Repeat2 size={18}/>}/></div><section className="mt-7"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Recent Assigned Tasks</h2><p className="text-sm text-muted-foreground">New citizen-reported problems assigned to your organization.</p></div><button onClick={() => setSection("Assigned Tasks")} className="text-sm font-bold text-primary">View all</button></div><TaskTable tasks={tasks} statusTone={statusTone} onOpen={(id) => { setSelectedTask(id); setSection("Task Tracking"); }} onAccept={(id) => { updateTask(id, { status: "Accepted" }); flash("Task accepted. You can now assign skilled participants."); }}/></section><section className="mt-7"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Skilled Participants Availability</h2><p className="text-sm text-muted-foreground">Live availability by institute or university.</p></div><button onClick={() => setShowInstitute(true)} className="text-sm font-bold text-primary">Modify count</button></div><InstituteTable institutes={institutes} onEdit={(item) => { setInstituteName(item.name); setNewCount(String(item.count)); setShowInstitute(true); }}/></section></>}
  {(section === "Institutes / Universities" || section === "Skilled Participants") && <section className="mt-7"><h2 className="text-2xl font-bold">Skilled Participants Availability</h2><p className="mt-2 text-muted-foreground">Update the available skilled-participant count as it changes. Every update is retained in its history.</p><InstituteTable institutes={institutes} onEdit={(item) => { setInstituteName(item.name); setNewCount(String(item.count)); setShowInstitute(true); }}/></section>}
  {["Assigned Tasks", "Active Tasks", "Completed Tasks", "Could Not Solve"].includes(section) && <section className="mt-7"><h2 className="text-2xl font-bold">{section}</h2><p className="mt-2 text-muted-foreground">Open a task to see full citizen-provided information and manage its delivery.</p><TaskTable tasks={visibleTasks} statusTone={statusTone} onOpen={(id) => { setSelectedTask(id); setSection("Task Tracking"); }} onAccept={(id) => { updateTask(id, { status: "Accepted" }); flash("Task accepted."); }}/></section>}
  {section === "Task Tracking" && <section className="mt-7"><button onClick={() => setSection("Assigned Tasks")} className="text-sm font-bold text-primary">← Back to assigned tasks</button><div className="mt-3 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><article className="card-surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold text-primary">{task.id} · {task.category.toUpperCase()}</span><h2 className="mt-2 text-2xl font-bold">{task.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[task.status]}`}>{task.status}</span></div><p className="mt-4 leading-7 text-muted-foreground">{task.description}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Location" value={task.location} icon={<MapPin size={16}/>}/><Info label="GPS location" value={task.coordinates} icon={<Navigation size={16}/>}/><Info label="Reported" value={task.reported} icon={<CalendarDays size={16}/>}/><Info label="Priority" value={task.priority} icon={<BadgeCheck size={16}/>}/></div><div className="mt-6 rounded-xl border border-border bg-surface p-4"><p className="text-xs font-bold text-muted-foreground">CITIZEN-PROVIDED INFORMATION</p><p className="mt-2 text-sm">Attachments and original report media will appear here when connected to the reporting backend.</p><div className="mt-3 flex gap-2"><span className="rounded-lg bg-card px-3 py-2 text-xs font-semibold"><ImageIcon className="mr-1 inline text-primary" size={14}/> Photo evidence</span><span className="rounded-lg bg-card px-3 py-2 text-xs font-semibold"><Paperclip className="mr-1 inline text-primary" size={14}/> Report details</span></div></div><div className="mt-6 flex flex-wrap gap-3">{task.status === "Pending" && <button onClick={() => { updateTask(task.id, { status: "Accepted" }); flash("Task accepted successfully."); }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Accept Task</button>}{task.status !== "Pending" && task.status !== "Solved" && !task.status.includes("Couldn't") && <><button onClick={() => setShowAssign(true)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Assign Students</button><button onClick={() => updateTask(task.id, { status: "Work in Progress" })} className="rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary">Mark work in progress</button><button onClick={() => setShowClose("solved")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">✓ Solved</button><button onClick={() => setShowClose("failed")} className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-bold text-destructive">✕ Couldn't Solve</button></>}<button onClick={downloadReport} className="rounded-lg border border-input px-4 py-2.5 text-sm font-bold"><Download className="mr-1 inline" size={16}/> Generate Excel Report</button></div></article><aside className="space-y-5"><div className="card-surface p-5"><h3 className="font-bold">Task progress</h3>{["Task Assigned", "Task Accepted", "Students Assigned", "Work in Progress", "Solved / Could Not Solve"].map((step, index) => { const active = index === 0 || (index === 1 && task.status !== "Pending") || (index === 2 && task.students.length > 0) || (index === 3 && task.status === "Work in Progress") || (index === 4 && (task.status === "Solved" || task.status.includes("Couldn't"))); return <div key={step} className="mt-4 flex gap-3"><div className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>{active ? "✓" : index + 1}</div><div><p className="text-sm font-semibold">{step}</p>{active && <p className="text-xs text-muted-foreground">Updated in this workspace</p>}</div></div>; })}</div><div className="card-surface p-5"><h3 className="font-bold">Assigned students</h3>{task.students.length ? task.students.map((student, i) => <div className="mt-3 flex items-center gap-3" key={student}><div className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{student.split(" ").map((part) => part[0]).join("")}</div><div><p className="text-sm font-semibold">{student}</p><p className="text-xs text-muted-foreground">{i ? "Civil Engineering" : "Electrical Engineering"} · Available</p></div></div>) : <p className="mt-3 text-sm text-muted-foreground">No students assigned yet.</p>}</div><div className="card-surface p-5"><h3 className="font-bold">Reassignment history</h3><p className="mt-3 text-sm text-muted-foreground">If this organization cannot solve the task, the system records the reason and routes it to the nearest suitable partner based on location, expertise, and availability.</p></div></aside></div></section>}
  {section === "Reports / Excel Upload" && <section className="mt-7 card-surface p-7"><FileSpreadsheet className="text-primary" size={28}/><h2 className="mt-4 text-2xl font-bold">Reports & Excel Upload</h2><p className="mt-2 max-w-2xl text-muted-foreground">Download a structured, Excel-compatible student assignment record for any task or upload the final verified report when a task is completed.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={downloadReport} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Download className="mr-1 inline" size={16}/> Generate Excel Report</button><label className="cursor-pointer rounded-lg border border-input px-4 py-2.5 text-sm font-bold"><Upload className="mr-1 inline" size={16}/> Upload final Excel<input onChange={() => flash("Excel report uploaded successfully.")} type="file" accept=".xlsx,.xls,.csv" className="hidden"/></label></div></section>}
  {section === "Profile" && <section className="mt-7 card-surface max-w-2xl p-7"><UserRound className="text-primary"/><h2 className="mt-4 text-2xl font-bold">Organization profile</h2><p className="mt-2 text-muted-foreground">Keep organization details, expertise, and location current to improve future matching and reassignment.</p><button onClick={() => flash("Open the registration profile to update organization details.")} className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Edit organization profile</button></section>}
  </main></div>
  {showInstitute && <Modal title="Add / Update Skilled Participants" close={() => setShowInstitute(false)}><label className="block text-sm font-semibold">University / Institute Name<input value={instituteName} onChange={(event) => setInstituteName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"/></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Current count<input value={String(institutes.find((item) => item.name === instituteName)?.count ?? 0)} readOnly className="mt-1.5 w-full rounded-lg border border-input bg-surface p-3 font-normal"/></label><label className="text-sm font-semibold">New count<input type="number" min="0" value={newCount} onChange={(event) => setNewCount(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"/></label></div><label className="mt-4 block text-sm font-semibold">Date / time of update<input value={new Date().toLocaleString()} readOnly className="mt-1.5 w-full rounded-lg border border-input bg-surface p-3 font-normal"/></label><button onClick={saveInstitute} className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground">Update Count</button></Modal>}
  {showAssign && <Modal title={`Assign students · ${task.id}`} close={() => setShowAssign(false)}><p className="text-sm text-muted-foreground">Select available students from your university/institute pool.</p>{["Aditi Kumari", "Ravi Singh", "Sai Teja"].map((student, index) => <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3" key={student}><input type="checkbox" defaultChecked={task.students.includes(student)} value={student}/><div className="flex-1"><b className="text-sm">{student}</b><p className="text-xs text-muted-foreground">21A01A00{index + 1} · {index === 1 ? "Civil" : index === 2 ? "IT" : "Electrical"} · {index === 2 ? "XYZ Institute" : "ABC University"}</p></div><span className="text-xs font-bold text-emerald-700">Available</span></label>)}<button onClick={() => { const checks = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((input) => input.value).filter((value) => ["Aditi Kumari", "Ravi Singh", "Sai Teja"].includes(value)); updateTask(task.id, { students: checks, status: checks.length ? "Students Assigned" : task.status }); setShowAssign(false); flash(`${checks.length} skilled participants assigned.`); }} className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground">Assign Selected Students</button></Modal>}
  {showClose && <Modal title={showClose === "solved" ? "Submit completed task" : "Couldn't solve this task"} close={() => setShowClose(null)}>{showClose === "solved" ? <><label className="block text-sm font-semibold">Completion date<input type="date" className="mt-1.5 w-full rounded-lg border border-input p-3 font-normal"/></label><label className="mt-4 block text-sm font-semibold">Work completion remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-input p-3 font-normal" placeholder="Describe completed work and proof provided."/></label><label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-input p-4 text-center text-sm font-semibold"><Upload className="mr-1 inline" size={16}/> Upload proof / final Excel<input type="file" className="hidden"/></label><button onClick={() => { updateTask(task.id, { status: "Solved", remarks }); setShowClose(null); flash("Completed task submitted. Excel Report: Uploaded ✓"); }} className="mt-5 w-full rounded-lg bg-emerald-600 py-3 font-bold text-white">Submit Completed Task</button></> : <><label className="block text-sm font-semibold">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 font-normal">{["Insufficient skilled participants", "Required resources unavailable", "Technical difficulty", "Location/accessibility problem", "Time constraint", "Equipment unavailable", "Safety issue", "Other"].map((option) => <option key={option}>{option}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">Additional remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-input p-3 font-normal"/></label><button onClick={() => { updateTask(task.id, { status: "Couldn't Solve — Reassigned", remarks: `${reason}. ${remarks}` }); setShowClose(null); flash("Task could not be completed. A nearby suitable organization is being notified for reassignment."); }} className="mt-5 w-full rounded-lg bg-destructive py-3 font-bold text-destructive-foreground">Confirm & Reassign Task</button></>}</Modal>}
  </div>;
}

function DashboardStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="card-surface p-4"><div className="flex items-center justify-between text-primary">{icon}<span className="text-2xl font-bold text-foreground">{value}</span></div><p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p></div>; }
function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="flex gap-3 rounded-lg bg-surface p-3"><span className="text-primary">{icon}</span><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div></div>; }
function InstituteTable({ institutes, onEdit }: { institutes: { name: string; count: number; history: string[] }[]; onEdit: (item: { name: string; count: number }) => void }) { return <div className="card-surface mt-5 overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><thead className="border-b border-border bg-surface text-xs text-muted-foreground"><tr><th className="px-5 py-3">UNIVERSITY / INSTITUTE</th><th className="px-5 py-3">SKILLED PARTICIPANTS</th><th className="px-5 py-3">STATUS</th><th className="px-5 py-3">LAST UPDATE</th><th className="px-5 py-3"></th></tr></thead><tbody>{institutes.map((item) => <tr className="border-b border-border last:border-0" key={item.name}><td className="px-5 py-4 font-semibold">{item.name}</td><td className="px-5 py-4">{item.count}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Available</span></td><td className="px-5 py-4 text-xs text-muted-foreground">{item.history[0]}</td><td className="px-5 py-4"><button onClick={() => onEdit(item)} className="font-bold text-primary">Modify</button></td></tr>)}</tbody></table></div>; }
function TaskTable({ tasks, statusTone, onOpen, onAccept }: { tasks: OrganizationTask[]; statusTone: Record<OrganizationTaskStatus, string>; onOpen: (id: string) => void; onAccept: (id: string) => void }) { return <div className="card-surface mt-5 overflow-x-auto"><table className="w-full min-w-200 text-left text-sm"><thead className="border-b border-border bg-surface text-xs text-muted-foreground"><tr><th className="px-5 py-3">TASK ID</th><th className="px-5 py-3">PROBLEM</th><th className="px-5 py-3">LOCATION</th><th className="px-5 py-3">PRIORITY</th><th className="px-5 py-3">STATUS</th><th className="px-5 py-3">ACTION</th></tr></thead><tbody>{tasks.length ? tasks.map((item) => <tr className="border-b border-border last:border-0" key={item.id}><td className="px-5 py-4 font-bold text-primary">#{item.id.replace("SS-", "")}</td><td className="max-w-72 px-5 py-4"><p className="font-semibold">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.category}</p></td><td className="px-5 py-4">{item.location}</td><td className="px-5 py-4"><span className={`font-bold ${item.priority === "High" ? "text-destructive" : item.priority === "Medium" ? "text-warn" : "text-primary"}`}>{item.priority}</span></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[item.status]}`}>{item.status}</span></td><td className="px-5 py-4"><div className="flex gap-2">{item.status === "Pending" && <button onClick={() => onAccept(item.id)} className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Accept Task</button>}<button onClick={() => onOpen(item.id)} className="whitespace-nowrap rounded-lg border border-input px-3 py-2 text-xs font-bold">{item.status === "Pending" ? "View task" : "Track progress"}</button></div></td></tr>) : <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No tasks in this category yet.</td></tr>}</tbody></table></div>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-lift"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={close} className="rounded-lg p-1 text-muted-foreground"><XCircle size={21}/></button></div>{children}</div></div>; }

function CoordinatorDashboard({ user, flash }: { user: User | null; flash: (x: string) => void }) {
  const [tab, setTab] = useState<"problems" | "people" | "review">("problems");
  const [showTask, setShowTask] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [reason, setReason] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [tasks, setTasks] = useState([{ id: "task-1", title: "Survey affected households", person: "Aditi Kumari", status: "In Progress", deadline: "12 Sep" }, { id: "task-2", title: "Document water-quality evidence", person: "Ravi Singh", status: "Pending", deadline: "14 Sep" }]);
  if (!user) return <Forbidden />;
  const createTask = () => {
    if (!taskDescription.trim()) return;
    setTasks((items) => [...items, { id: String(Date.now()), title: taskDescription, person: "Select from team", status: "Pending", deadline: deadline || "No deadline" }]);
    setTaskDescription(""); setDeadline(""); setShowTask(false); flash("Task created and ready to assign.");
  };
  return <section className="container-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">SPO / COORDINATOR WORKSPACE</span><h1 className="mt-4 text-3xl font-bold">Community response dashboard</h1><p className="mt-2 text-muted-foreground">Match local problems with your institution's skills, people, and resources.</p></div><button onClick={() => setShowTask(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Plus size={17}/> Create task</button></div><div className="mt-7 grid gap-3 sm:grid-cols-4"><Stat n="04" t="Active problems"/><Stat n="12" t="Available volunteers"/><Stat n={tasks.filter(t => t.status === "In Progress").length} t="Work in progress"/><Stat n="08" t="Verified resolutions"/></div><div className="mt-8 flex gap-2 border-b border-border"><button onClick={() => setTab("problems")} className={`px-4 py-3 text-sm font-bold ${tab === "problems" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>Assigned problems</button><button onClick={() => setTab("people")} className={`px-4 py-3 text-sm font-bold ${tab === "people" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>Students & volunteers</button><button onClick={() => setTab("review")} className={`px-4 py-3 text-sm font-bold ${tab === "review" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>Evidence review</button></div>{tab === "problems" && <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div className="card-surface p-6"><div className="flex justify-between gap-3"><div><span className="text-xs font-bold text-primary">SS-2026-0041 · WATER</span><h2 className="mt-2 text-xl font-bold">Unsafe drinking water near Ward 5</h2><p className="mt-2 text-sm text-muted-foreground"><MapPin className="mr-1 inline" size={14}/> Ranchi · 1.2 km away · 48 residents affected</p></div><span className="h-fit rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-warn">In progress</span></div><div className="mt-5 rounded-xl bg-surface p-4"><p className="text-xs font-bold text-muted-foreground">REQUIRED SKILLS</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">Water testing</span><span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">Field survey</span><span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">Documentation</span></div></div><div className="mt-5 space-y-2">{tasks.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><b className="text-sm">{t.title}</b><p className="mt-1 text-xs text-muted-foreground">{t.person} · due {t.deadline}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${t.status === "In Progress" ? "bg-primary-soft text-primary" : "bg-surface text-muted-foreground"}`}>{t.status}</span></div>)}</div></div><aside className="card-surface p-6"><h2 className="font-bold">Escalate if needed</h2><p className="mt-2 text-sm text-muted-foreground">Transfer the complete history and evidence to a better-matched partner.</p>{escalating ? <><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why can your organization not resolve this?" className="mt-4 min-h-24 w-full rounded-lg border border-input p-3 text-sm"/><button onClick={() => { setEscalating(false); setReason(""); flash("Suitable organizations recommended; transfer is ready for acceptance."); }} disabled={!reason.trim()} className="mt-3 w-full rounded-lg bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-50">Find suitable organization</button></> : <button onClick={() => setEscalating(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm font-bold text-destructive"><XCircle size={16}/> Unable to resolve</button>}<div className="mt-5 rounded-lg bg-accent-soft p-3 text-xs text-accent"><Sparkles className="mr-1 inline" size={14}/> Suggested partner: Jharkhand Water Initiative — field lab and repair team available.</div></aside></div>}{tab === "people" && <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="card-surface p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">AK</div><div><b>Aditi Kumari</b><p className="text-xs text-muted-foreground">Environmental Engineering</p></div></div><p className="mt-4 text-sm">Water testing · Field survey · Available this week</p></div><div className="card-surface p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-accent-soft font-bold text-accent">RS</div><div><b>Ravi Singh</b><p className="text-xs text-muted-foreground">Civil Engineering</p></div></div><p className="mt-4 text-sm">Documentation · GIS mapping · Available weekends</p></div><label className="card-surface grid cursor-pointer place-items-center p-5 text-center"><FileSpreadsheet className="text-primary"/><b className="mt-3">Bulk upload students</b><span className="mt-1 text-xs text-muted-foreground">Upload an Excel (.xlsx or .csv) roster</span><input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={() => flash("Roster selected. Review and import records to complete upload.")}/></label></div>}{tab === "review" && <div className="mt-6 card-surface p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><span className="text-xs font-bold text-primary">TASK EVIDENCE SUBMITTED</span><h2 className="mt-2 text-xl font-bold">Household survey and water samples</h2><p className="mt-2 text-sm text-muted-foreground">Submitted by Aditi Kumari · Photos, sample sheet, and completion notes attached.</p></div><div className="flex gap-2"><button onClick={() => flash("Changes requested from the assigned volunteer.")} className="rounded-lg border border-input px-3 py-2 text-sm font-bold">Request changes</button><button onClick={() => flash("Evidence verified. The problem has been marked resolved.")} className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground"><CheckCircle2 className="mr-1 inline" size={16}/> Verify & resolve</button></div></div><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-lg bg-surface px-3 py-2 text-sm"><ImageIcon className="mr-1 inline text-primary" size={15}/> 4 field photos</span><span className="rounded-lg bg-surface px-3 py-2 text-sm"><Paperclip className="mr-1 inline text-primary" size={15}/> water-sample.pdf</span><span className="rounded-lg bg-surface px-3 py-2 text-sm"><BadgeCheck className="mr-1 inline text-primary" size={15}/> Completion notes</span></div></div>}{showTask && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-lift"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Create and assign task</h2><button onClick={() => setShowTask(false)}><XCircle className="text-muted-foreground"/></button></div><textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Task description" className="mt-5 min-h-28 w-full rounded-lg border border-input p-3"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><select className="rounded-lg border border-input p-3"><option>Assign to: Aditi Kumari</option><option>Assign to: Ravi Singh</option></select><input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" className="rounded-lg border border-input p-3"/></div><button onClick={createTask} disabled={!taskDescription.trim()} className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">Create task</button></div></div>}</section>;
}

function CoordinatorDashboardLegacy({ user, flash }: { user: User | null; flash: (x: string) => void }) {
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null), [people, setPeople] = useState<{ id: string; name: string; skills: string[] }[]>([]), [challenges, setChallenges] = useState<Challenge[]>([]), [name, setName] = useState(""), [skills, setSkills] = useState(""), [task, setTask] = useState(""), [selectedChallenge, setSelectedChallenge] = useState(""), [selectedPerson, setSelectedPerson] = useState("");
  const load = async () => { if (!user || !supabase) return; const [{ data: organization }, { data: challengeData }] = await Promise.all([supabase.from("organization_accounts").select("id,name").eq("owner_id", user.id).maybeSingle(), supabase.rpc("search_challenges", { search_text: "" })]); setOrg(organization); setChallenges((challengeData ?? []) as Challenge[]); if (organization) { const { data } = await supabase.from("volunteers").select("id,name,skills").eq("organization_id", organization.id); setPeople(data ?? []); } };
  useEffect(() => { void load(); }, [user]);
  if (!user) return <Forbidden />;
  if (!org) return <section className="container-page py-12"><h1 className="text-3xl font-bold">Coordinator dashboard</h1><p className="mt-3 text-muted-foreground">Register your institution or NGO before managing work.</p></section>;
  const addPerson = async () => { const { error } = await supabase!.from("volunteers").insert({ organization_id: org.id, name, skills: skills.split(",").map((x) => x.trim()).filter(Boolean) }); if (error) flash(error.message); else { setName(""); setSkills(""); void load(); } };
  const assign = async () => { const { data: assignment, error } = await supabase!.from("problem_assignments").insert({ challenge_id: selectedChallenge, organization_id: org.id, assigned_by: user.id, status: "in_progress" }).select("id").single(); if (error || !assignment) { flash(error?.message ?? "Could not assign problem."); return; } const { error: taskError } = await supabase!.from("problem_tasks").insert({ assignment_id: assignment.id, volunteer_id: selectedPerson || null, description: task, status: "pending" }); if (taskError) flash(taskError.message); else { setTask(""); flash("Task assigned."); } };
  return <section className="container-page py-12"><h1 className="text-3xl font-bold">{org.name} coordinator dashboard</h1><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card-surface p-5"><h2 className="font-bold">Students & volunteers</h2><div className="mt-3 grid gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-input p-2" /><input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma separated)" className="rounded border border-input p-2" /><button onClick={() => void addPerson()} className="rounded bg-primary p-2 font-bold text-primary-foreground">Add person</button></div><div className="mt-4 space-y-2">{people.map((person) => <p key={person.id} className="rounded bg-surface p-2"><b>{person.name}</b> · {person.skills.join(", ")}</p>)}</div></div><div className="card-surface p-5"><h2 className="font-bold">Assign a community problem</h2><div className="mt-3 grid gap-2"><select value={selectedChallenge} onChange={(e) => setSelectedChallenge(e.target.value)} className="rounded border border-input p-2"><option value="">Choose a problem</option>{challenges.map((c) => <option key={c.id} value={c.id}>{c.public_id} — {c.title}</option>)}</select><select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} className="rounded border border-input p-2"><option value="">Choose a person</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task description" className="rounded border border-input p-2" /><button disabled={!selectedChallenge || !task} onClick={() => void assign()} className="rounded bg-primary p-2 font-bold text-primary-foreground disabled:opacity-50">Create assignment</button></div></div></div></section>;
}

function VolunteerDashboard({ user }: { user: User | null }) {
  if (!user) return <Forbidden />;
  return <section className="container-page py-12"><h1 className="text-3xl font-bold">Volunteer workspace</h1><p className="mt-3 text-muted-foreground">Discover challenges, join a response team, and track your contribution.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="card-surface p-5"><b>Find challenges</b><p className="mt-2 text-sm text-muted-foreground">Explore verified community problems.</p></div><div className="card-surface p-5"><b>My assignments</b><p className="mt-2 text-sm text-muted-foreground">Assignments from partner organizations will appear here.</p></div><div className="card-surface p-5"><b>Impact</b><p className="mt-2 text-sm text-muted-foreground">Track outcomes you help deliver.</p></div></div></section>;
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
          <p>Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">You have not submitted a report yet.</p>
        ) : (
          data.map((r) => (
            <div key={r.id} className="card-surface p-5">
              <b className="text-xs text-primary">{r.challenges?.public_id || "REPORT"}</b>
              <p className="mt-2 font-bold">{r.challenges?.title || r.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {r.district} · Submitted {new Date(r.created_at).toLocaleDateString()}
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
function Admin({ flash, refresh }: { flash: (x: string) => void; refresh: (q?: string) => void }) {
  const [items, setItems] = useState<Challenge[]>([]),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await supabase!.rpc("search_challenges", { search_text: "" });
    setItems((data ?? []) as Challenge[]);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const verify = async (c: Challenge) => {
    const { error } = await supabase!
      .from("challenges")
      .update({ verification: "under_review", stage: "validated" })
      .eq("id", c.id);
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
          <p>Loading queue…</p>
        ) : (
          items.map((c) => (
            <div
              className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"
              key={c.id}
            >
              <div>
                <b className="text-xs text-primary">{c.public_id}</b>
                <p className="mt-1 font-bold">{c.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.district} · {c.domain} · {c.priority_score}/100
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
