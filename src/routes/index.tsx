import { createFileRoute } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Repeat2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { MediaUpload } from "@/components/MediaUpload";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({ component: SamajSetu });
type Screen = "home" | "auth" | "report" | "explore" | "my-reports" | "admin";
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
  const repost = async (challenge: Challenge) => {
    if (!user) {
      flash("Sign in to repost a community problem.");
      go("auth");
      return;
    }
    const { error } = await supabase!
      .from("challenge_supports")
      .insert({ challenge_id: challenge.id, supporter_id: user.id });
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
          complete={() => {
            flash("Welcome to SamajSetu.");
            go("home");
          }}
        />
      )}{" "}
      {screen === "report" && (
        <Report
          user={user}
          go={go}
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
        />
      )}{" "}
      {screen === "my-reports" && <MyReports user={user} go={go} />}{" "}
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
          {user && (
            <button onClick={() => go("my-reports")} className="hidden sm:block">
              My reports
            </button>
          )}
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
function Auth({ complete }: { complete: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
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
        options: { data: { display_name: name } },
      });
      if (e) {
        if (/rate limit/i.test(e.message))
          setInfo(
            "Too many verification emails were requested. Please wait a few minutes, then try again or use a different email address.",
          );
        else setError(e.message);
      } else setInfo("Check your email to confirm your account, then sign in.");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message);
      else complete();
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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-5 w-full rounded-lg border border-input p-3"
          />
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
}: {
  user: User | null;
  go: (x: Screen) => void;
  complete: () => void;
}) {
  const [description, setDescription] = useState(""),
    [district, setDistrict] = useState(""),
    [block, setBlock] = useState(""),
    [locality, setLocality] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reportId, setReportId] = useState<string | null>(null),
    [mediaError, setMediaError] = useState("");

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
        title: description.slice(0, 100),
        summary: description,
        domain,
        district,
        block,
        locality,
        severity: 2,
        urgency: 2,
        evidence_quality: 1,
        created_by: actor.id,
      })
      .select("id")
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
      })
      .select("id")
      .single();
    setBusy(false);
    if (re || !r) {
      setError(re?.message ?? "Unable to save report.");
      return;
    }
    setReportId(r.id);
  };

  if (reportId) {
    return (
      <section className="container-page max-w-3xl py-14">
        <button
          onClick={() => {
            setReportId(null);
            setDescription("");
            setDistrict("");
            setBlock("");
            setLocality("");
          }}
          className="text-sm font-bold text-muted-foreground"
        >
          ← Back
        </button>
        <h1 className="mt-5 text-3xl font-bold">Add evidence to your report</h1>
        <p className="mt-2 text-muted-foreground">
          Attach photos, videos, or audio recordings to strengthen your report and help verify the
          problem.
        </p>
        <div className="card-surface mt-7 p-6">
          <MediaUpload reportId={reportId} onMediaAdded={() => {}} onError={setMediaError} />
          {mediaError && <p className="mt-4 text-sm text-destructive">{mediaError}</p>}
          <button
            onClick={() => {
              setReportId(null);
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
      <h1 className="mt-5 text-3xl font-bold">Report a community problem</h1>
      <p className="mt-2 text-muted-foreground">
        Plain language is enough. The record is AI-ready but will require human verification.
      </p>
      <div className="card-surface mt-7 p-6">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is happening? Who is affected?"
          className="min-h-36 w-full rounded-lg border border-input p-3"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
        <p className="mt-5 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mr-2 inline text-accent" size={16} />
          Sensitive evidence and exact locations stay private.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          disabled={busy || description.length < 10 || !district}
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
}: {
  challenges: Challenge[];
  load: (q: string) => void;
  supportedIds: string[];
  repost: (challenge: Challenge) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl font-bold">Challenge explorer</h1>
      <p className="mt-2 text-muted-foreground">
        Found the same problem? Repost it instead of creating another card. Each person can repost
        once.
      </p>
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
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {challenges.length === 0 ? (
          <div className="card-surface p-8 text-muted-foreground">No live challenges found.</div>
        ) : (
          challenges.map((c) => {
            const reposted = supportedIds.includes(c.id);
            return (
              <article className="card-surface p-5" key={c.id}>
                <div className="flex justify-between">
                  <b className="text-xs text-primary">{c.public_id}</b>
                  <b>{c.priority_score}/100</b>
                </div>
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
                <button
                  disabled={reposted}
                  onClick={() => void repost(c)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary disabled:cursor-default disabled:border-border disabled:text-muted-foreground"
                >
                  <Repeat2 size={16} />
                  {reposted ? "Reposted" : "Repost this problem"}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
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
