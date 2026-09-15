import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { PRIDashboard } from "@/components/PRIDashboard";
import { Landmark, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/pri/dashboard")({
  component: PRIDashboardRoute,
});

function PRIDashboardRoute() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [partnerIdentity, setPartnerIdentity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (!supabase) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;

        if (!currentUser) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("id,display_name,role,district")
          .eq("id", currentUser.id)
          .maybeSingle();

        const { data: orgAccount } = await supabase
          .from("organization_accounts")
          .select("id,name,organization_type,district,locality,contact_phone,expertise,capabilities")
          .eq("owner_id", currentUser.id)
          .maybeSingle();

        if (isMounted) {
          setUser(currentUser);
          setProfile(prof);
          setPartnerIdentity(orgAccount);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        if (isMounted) setLoading(false);
      }
    }

    void checkAuth();

    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setPartnerIdentity(null);
      }
    }) ?? { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    void navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="h-12 w-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold mb-4 shadow-lg">
          <Landmark size={26} />
        </div>
        <RefreshCw size={24} className="animate-spin text-emerald-400 mb-3" />
        <h2 className="text-base font-bold text-white tracking-wide">Authenticating Panchayat Raj Credentials</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying role and administrative jurisdiction in Samaj Setu</p>
      </div>
    );
  }

  // Role Gate: Must be authenticated and have role "pri" (or PRI account metadata)
  const isPri =
    profile?.role === "pri" ||
    user?.user_metadata?.["role"] === "pri" ||
    user?.user_metadata?.["account_type"] === "pri" ||
    String(user?.user_metadata?.["official_category"] || "").toLowerCase().includes("pri") ||
    String(partnerIdentity?.expertise || "").toLowerCase().includes("panchayati");

  if (!user || !isPri) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md bg-slate-800/90 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert size={30} />
          </div>
          <h2 className="text-xl font-bold text-white">Restricted Panchayat Portal</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            This dashboard is exclusively authorized for authenticated Panchayat Raj Institutions (PRI). You are currently{" "}
            {user ? `signed in as "${profile?.role || "citizen"}"` : "not signed in"}.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => void navigate({ to: "/" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <ArrowLeft size={14} /> Return to Samaj Setu
            </button>
            {user && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-700/50 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Sign Out & Switch Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PRIDashboard
        user={user}
        profile={profile}
        partnerIdentity={partnerIdentity}
        go={(screen: string) => {
          if (screen === "home") void navigate({ to: "/" });
        }}
        flash={flash}
        logout={handleLogout}
      />
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl border border-slate-800">
          {notice}
        </div>
      )}
    </div>
  );
}
