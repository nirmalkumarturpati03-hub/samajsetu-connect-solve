import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { GovernmentDepartmentDashboard } from "@/components/GovernmentDepartmentDashboard";
import { Building2, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/government/department/dashboard")({
  component: GovernmentDepartmentDashboardRoute,
});

function GovernmentDepartmentDashboardRoute() {
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
          .select("id,name,organization_type,district,locality,contact_phone,contact_name,expertise,capabilities")
          .eq("owner_id", currentUser.id)
          .maybeSingle();

        if (isMounted) {
          setUser(currentUser);
          setProfile(prof);
          setPartnerIdentity(orgAccount);
          setLoading(false);
        }
      } catch (err) {
        console.error("Department auth check error:", err);
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
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="h-14 w-14 rounded-2xl bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20 flex items-center justify-center font-bold mb-4 shadow-sm">
          <Building2 size={28} />
        </div>
        <RefreshCw size={24} className="animate-spin text-[#168a45] mb-3" />
        <h2 className="text-base font-bold text-[#0B5D2A] tracking-wide font-display">
          Authenticating Government Department Credentials
        </h2>
        <p className="text-xs text-[#66736b] mt-1">
          Verifying technical line department credentials in Samaj Setu
        </p>
      </div>
    );
  }

  // Guard: Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="max-w-md w-full bg-white border border-[#0B5D2A]/15 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0B5D2A] font-display">
            Department Authentication Required
          </h2>
          <p className="text-xs text-[#66736b] leading-relaxed">
            The Government Line Department Dashboard is restricted to authenticated technical officers. Please sign in with your official government credentials.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="px-4 py-2.5 rounded-xl border border-[#ddebe2] hover:bg-[#eaf7ef] text-xs font-bold text-[#17231b] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <button
              onClick={() => navigate({ to: "/", search: { view: "auth" } })}
              className="px-5 py-2.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-xs font-bold text-white transition shadow-sm"
            >
              Sign In with Official Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Determine if user is authorized as a Government Department user
  const userRole = String(profile?.role || "").trim().toLowerCase();
  const rawMeta = user.user_metadata || {};
  const officialCat = String(rawMeta["official_category"] || "").trim().toLowerCase();
  const expertise: string[] = Array.isArray(partnerIdentity?.expertise) ? partnerIdentity.expertise : [];

  const isDepartmentUser =
    userRole === "government_department" ||
    officialCat.includes("department") ||
    officialCat.includes("line department") ||
    expertise.includes("Government Department") ||
    (userRole === "government" && !officialCat.includes("urban local body") && !officialCat.includes("ulb")) ||
    userRole === "admin";

  if (!isDepartmentUser) {
    return (
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center mx-auto">
            <ShieldAlert size={26} />
          </div>
          <h2 className="text-lg font-bold text-red-800 font-display">
            Access Denied: Department Account Required
          </h2>
          <p className="text-xs text-[#66736b] leading-relaxed">
            Your current account (<strong>{user.email}</strong>, Role: <strong>{userRole || "User"}</strong>) is not recognized as an authorized Government Line Department account.
          </p>
          <div className="p-3.5 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] text-[11px] text-[#66736b] text-left space-y-1.5">
            <p>• If you belong to a Gram Panchayat / Zilla Parishad, please access the <strong>PRI Dashboard</strong>.</p>
            <p>• If you belong to a Municipal Corporation, please access the <strong>ULB Dashboard</strong>.</p>
            <p>• If this is a department account, please contact the platform administrator to verify your credentials.</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="px-4 py-2.5 rounded-xl border border-[#ddebe2] hover:bg-[#eaf7ef] text-xs font-bold text-[#17231b] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-xs font-bold text-red-700 transition"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#0B5D2A] px-4 py-3 text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-bounce">
          <span>{notice}</span>
        </div>
      )}
      <GovernmentDepartmentDashboard
        user={user}
        profile={profile}
        partnerIdentity={partnerIdentity}
        go={(scr) => {
          if (scr === "home") void navigate({ to: "/" });
          else if (scr === "pri-dashboard") void navigate({ to: "/pri/dashboard" });
          else void navigate({ to: "/" });
        }}
        flash={flash}
        logout={handleLogout}
      />
    </div>
  );
}
