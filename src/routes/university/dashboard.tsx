import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { UniversityDashboard } from "@/components/UniversityDashboard";
import { GraduationCap, ShieldAlert, ArrowLeft, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/university/dashboard")({
  component: UniversityDashboardRoute,
});

function UniversityDashboardRoute() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [institution, setInstitution] = useState<any | null>(null);
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

        // 1. Fetch institution where user is owner
        let { data: instData } = await supabase
          .from("institutions")
          .select("*")
          .eq("owner_id", currentUser.id)
          .maybeSingle();

        // 2. If not owner, check institution_members roster
        if (!instData) {
          const { data: memberData } = await supabase
            .from("institution_members")
            .select("institution_id, institutions(*)")
            .eq("profile_id", currentUser.id)
            .maybeSingle();

          if (memberData?.institutions) {
            instData = memberData.institutions as any;
          }
        }

        // 3. Fallback for testing / admin: if user is university_admin or admin, link to the verified institution
        if (!instData && (prof?.role === "university_admin" || prof?.role === "admin")) {
          const { data: anyInst } = await supabase
            .from("institutions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (anyInst) instData = anyInst;
        }

        if (isMounted) {
          setUser(currentUser);
          setProfile(prof);
          setInstitution(instData);
          setLoading(false);
        }
      } catch (err) {
        console.error("University auth check error:", err);
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
        setInstitution(null);
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
          <GraduationCap size={28} />
        </div>
        <RefreshCw size={24} className="animate-spin text-[#168a45] mb-3" />
        <h2 className="text-base font-bold text-[#0B5D2A] tracking-wide font-display">Authenticating Higher-Education Institution</h2>
        <p className="text-xs text-[#66736b] mt-1">Verifying university accreditation and research credentials in Samaj Setu</p>
      </div>
    );
  }

  // Guard: Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="max-w-md w-full bg-white border border-[#0B5D2A]/15 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-[#eaf7ef] text-[#0B5D2A] border border-[#0B5D2A]/20 flex items-center justify-center mx-auto">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-lg font-bold text-[#0B5D2A] font-display">University Access Authentication Required</h2>
          <p className="text-xs text-[#66736b] leading-relaxed">
            The Samaj Setu University / Higher-Education Institution Dashboard is restricted to verified faculty leads, student research teams, and institutional nodal officers.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="px-4 py-2.5 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold text-[#17231b] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <button
              onClick={() => navigate({ to: "/", search: { view: "auth" } })}
              className="px-5 py-2.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-xs font-bold text-white transition shadow-sm"
            >
              Sign In with Institutional Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Determine if user is authorized for university role
  const userRole = String(profile?.role || "").trim().toLowerCase();
  const isUniversityRole =
    userRole === "university_admin" ||
    userRole === "faculty" ||
    userRole === "student" ||
    userRole === "research" ||
    userRole === "admin" ||
    Boolean(institution);

  if (!isUniversityRole) {
    return (
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-red-900 font-display">Access Denied: University Credentials Required</h2>
          <p className="text-xs text-[#66736b] leading-relaxed">
            Your account (<strong>{user.email}</strong>, Role: <strong>{userRole || "Citizen"}</strong>) is not associated with a registered higher-education institution.
          </p>
          <div className="p-3.5 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] text-[11px] text-[#66736b] text-left space-y-1">
            <p>• If you are registering an institution, please complete University Registration.</p>
            <p>• If you are a faculty mentor or student, please contact your university nodal officer to link your account.</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="px-4 py-2.5 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold text-[#17231b] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-xs font-bold text-slate-700 hover:text-red-700 transition"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Verification Status Check
  const registrationStatus = institution?.registration_status || "UNDER_VERIFICATION";
  const isVerified = registrationStatus === "VERIFIED" || userRole === "admin";

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#f6fbf8] flex flex-col items-center justify-center p-6 text-center text-[#17231b] font-sans">
        <div className="max-w-lg w-full bg-white border border-amber-200 rounded-2xl p-8 shadow-sm space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Clock size={28} />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold uppercase tracking-wider">
              Verification Pending
            </span>
            <h2 className="text-xl font-bold text-[#0B5D2A] pt-2 font-display">
              {institution?.legal_name || "Institution Account Under Review"}
            </h2>
            <p className="text-xs text-[#66736b]">
              AISHE Code: <strong className="text-[#17231b]">{institution?.aishe_code || "Pending"}</strong> • Application Status: <strong className="text-amber-800">{registrationStatus}</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#f6fbf8] border border-[#ddebe2] text-xs text-[#17231b] text-left space-y-2">
            <p className="font-semibold text-[#0B5D2A]">Institutional Verification Notice:</p>
            <p className="text-[#66736b] leading-relaxed">
              Samaj Setu Academic Problem Statements (Track B) and live research workspaces are restricted to verified higher-education institutions. Your AISHE documentation and institutional authorization letter are currently being authenticated by the Samaj Setu National Nodal Desk.
            </p>
            <div className="pt-2 border-t border-[#ddebe2] text-[11px] text-[#66736b]">
              Nodal Officer Contact: <strong className="text-[#17231b]">{institution?.nodal_officer_email || user.email}</strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="px-4 py-2.5 rounded-xl border border-[#ddebe2] hover:bg-[#f6fbf8] text-xs font-semibold text-[#17231b] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Portal</span>
            </button>
            <button
              onClick={() => void window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#168a45] hover:bg-[#0B5D2A] text-xs font-bold text-white transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Check Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-bounce">
          <span>{notice}</span>
        </div>
      )}
      <UniversityDashboard
        user={user}
        profile={profile}
        institution={institution}
        go={(scr) => {
          if (scr === "home") void navigate({ to: "/" });
          else if (scr === "pri-dashboard") void navigate({ to: "/pri/dashboard" });
          else if (scr === "department-dashboard") void navigate({ to: "/government/department/dashboard" });
          else void navigate({ to: "/" });
        }}
        flash={flash}
        logout={handleLogout}
      />
    </div>
  );
}
