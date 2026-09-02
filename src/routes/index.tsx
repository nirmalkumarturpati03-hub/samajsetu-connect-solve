import { createFileRoute } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import {
  Activity,
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
  FileSpreadsheet,
  FileUp,
  Image as ImageIcon,
  LocateFixed,
  LayoutDashboard,
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
      {screen === "coordinator" && <CoordinatorDashboard user={user} flash={flash} />}{" "}
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
function Auth({ complete }: { complete: (accountType: string) => void }) {
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
