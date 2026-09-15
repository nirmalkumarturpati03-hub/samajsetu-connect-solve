import React, { useState, useId, useRef, useEffect } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  X,
  Search,
  ChevronDown,
  Check,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Landmark,
  Mail,
  User,
  Briefcase,
  MapPin,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestRegistrationOtp, verifyRegistrationOtp } from "@/lib/otp.functions";

interface GovernmentOfficialRegistrationProps {
  close: () => void;
  onLogin: () => void;
  complete: (type: string) => void;
}

export interface GovernmentDepartmentMapping {
  domain: string;
  department: string;
  shortName: string;
}

export const GOVERNMENT_LINE_DEPARTMENTS: GovernmentDepartmentMapping[] = [
  {
    domain: "Roads & Infrastructure",
    department: "Rural Development / Panchayati Raj / Public Works Department (PWD)",
    shortName: "Public Works Department (PWD)",
  },
  {
    domain: "Water Supply",
    department: "Rural Water Supply & Sanitation / Public Health Engineering Department (PHED)",
    shortName: "Public Health Engineering Department (PHED)",
  },
  {
    domain: "Sanitation & Waste Management",
    department: "Panchayati Raj / Rural Development / Municipal or Local Body authority",
    shortName: "Sanitation & Waste Management Authority",
  },
  {
    domain: "Electricity",
    department: "State Electricity Distribution Company (DISCOM) / Energy Department",
    shortName: "Electricity Distribution Company (DISCOM) / Energy Department",
  },
  {
    domain: "Health & Medical Services",
    department: "Health & Family Welfare Department",
    shortName: "Health & Family Welfare Department",
  },
  {
    domain: "Education",
    department: "School Education Department / Department of School Education",
    shortName: "School Education Department",
  },
  {
    domain: "Agriculture",
    department: "Agriculture Department",
    shortName: "Agriculture Department",
  },
  {
    domain: "Rural Development",
    department: "Rural Development Department",
    shortName: "Rural Development Department",
  },
  {
    domain: "Women & Child Welfare",
    department: "Women & Child Development (WCD) Department",
    shortName: "Women & Child Development (WCD) Department",
  },
  {
    domain: "Public Safety & Security",
    department: "Police Department / Home Department",
    shortName: "Police Department / Home Department",
  },
  {
    domain: "Housing & Public Facilities",
    department: "Rural Development / Housing Department / Panchayati Raj",
    shortName: "Housing Department / Rural Development",
  },
  {
    domain: "Transport",
    department: "Transport Department / State Road Transport authority",
    shortName: "Transport Department / State Road Transport",
  },
  {
    domain: "Environment",
    department: "Environment & Forest Department / State Pollution Control Board",
    shortName: "Environment & Forest Department / Pollution Control Board",
  },
  {
    domain: "Revenue & Land",
    department: "Revenue Department",
    shortName: "Revenue Department",
  },
  {
    domain: "Social Welfare",
    department: "Social Welfare Department",
    shortName: "Social Welfare Department",
  },
  {
    domain: "Other / General",
    department: "District Administration / appropriate department after classification",
    shortName: "District Administration (General Oversight)",
  },
];

const PRESET_ORGANIZATIONS = [
  // Urban Local Bodies
  { name: "Greater Visakhapatnam Municipal Corporation (GVMC)", category: "Urban Local Body (ULB)", state: "Andhra Pradesh", district: "Visakhapatnam", sector: "Sanitation & Waste Management" },
  { name: "Bruhat Bengaluru Mahanagara Palike (BBMP)", category: "Urban Local Body (ULB)", state: "Karnataka", district: "Bengaluru Urban", sector: "Sanitation & Waste Management" },
  { name: "Municipal Corporation of Delhi (MCD)", category: "Urban Local Body (ULB)", state: "Delhi (NCT)", district: "New Delhi", sector: "Sanitation & Waste Management" },
  { name: "Greater Hyderabad Municipal Corporation (GHMC)", category: "Urban Local Body (ULB)", state: "Telangana", district: "Hyderabad", sector: "Sanitation & Waste Management" },
  { name: "Brihanmumbai Municipal Corporation (BMC)", category: "Urban Local Body (ULB)", state: "Maharashtra", district: "Mumbai", sector: "Sanitation & Waste Management" },
  { name: "Ranchi Municipal Corporation (RMC)", category: "Urban Local Body (ULB)", state: "Jharkhand", district: "Ranchi", sector: "Sanitation & Waste Management" },
  { name: "Dhanbad Municipal Corporation", category: "Urban Local Body (ULB)", state: "Jharkhand", district: "Dhanbad", sector: "Sanitation & Waste Management" },
  
  // Panchayati Raj Institutions
  { name: "Zilla Parishad Ranchi", category: "Panchayati Raj Institution (PRI)", state: "Jharkhand", district: "Ranchi", sector: "Rural Development" },
  { name: "Zilla Parishad East Singhbhum", category: "Panchayati Raj Institution (PRI)", state: "Jharkhand", district: "East Singhbhum", sector: "Rural Development" },
  { name: "Zilla Parishad Visakhapatnam", category: "Panchayati Raj Institution (PRI)", state: "Andhra Pradesh", district: "Visakhapatnam", sector: "Rural Development" },
  { name: "District Panchayat Office, Krishna", category: "Panchayati Raj Institution (PRI)", state: "Andhra Pradesh", district: "Krishna", sector: "Rural Development" },
  { name: "Block Development Office, Kanke", category: "Panchayati Raj Institution (PRI)", state: "Jharkhand", district: "Ranchi", sector: "Rural Development" },
  
  // Government Line Departments (All 16 Official Domains)
  { name: "Public Works Department (PWD)", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Rural Development / Panchayati Raj / Public Works Department (PWD)" },
  { name: "Rural Water Supply & Sanitation / PHED", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Rural Water Supply & Sanitation / Public Health Engineering Department (PHED)" },
  { name: "Panchayati Raj & Rural Sanitation Authority", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Panchayati Raj / Rural Development / Municipal or Local Body authority" },
  { name: "Jharkhand Bijli Vitran Nigam (DISCOM) / Energy Dept", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "State Electricity Distribution Company (DISCOM) / Energy Department" },
  { name: "Department of Health & Family Welfare", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Health & Family Welfare Department" },
  { name: "Department of School Education & Literacy", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "School Education Department / Department of School Education" },
  { name: "Department of Agriculture & Sugarcane Development", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Agriculture Department" },
  { name: "Rural Development Department", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Rural Development Department" },
  { name: "Women & Child Development & Social Security", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Women & Child Development (WCD) Department" },
  { name: "Police Department / Home Department", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Police Department / Home Department" },
  { name: "Urban Development & Housing Department", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Rural Development / Housing Department / Panchayati Raj" },
  { name: "Transport Department / State Road Transport", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Transport Department / State Road Transport authority" },
  { name: "Department of Forest, Environment & Climate Change", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Environment & Forest Department / State Pollution Control Board" },
  { name: "Department of Revenue, Registration & Land Reforms", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Revenue Department" },
  { name: "Social Welfare & Disability Empowerment Department", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "Social Welfare Department" },
  { name: "District Administration & Disaster Management (Ranchi)", category: "Government Department", state: "Jharkhand", district: "Ranchi", sector: "District Administration / appropriate department after classification" },
];

const ORG_CATEGORIES = [
  "Urban Local Body (ULB)",
  "Panchayati Raj Institution (PRI)",
  "Government Department",
] as const;

const DEPARTMENTS_SECTORS = [
  "Roads & Infrastructure",
  "Water Supply",
  "Sanitation & Waste Management",
  "Electricity",
  "Health & Medical Services",
  "Education",
  "Agriculture",
  "Rural Development",
  "Women & Child Welfare",
  "Public Safety & Security",
  "Housing & Public Facilities",
  "Transport",
  "Environment",
  "Revenue & Land",
  "Social Welfare",
  "Other / General",
] as const;

import { INDIAN_STATES, getDistrictsForState } from "@/data/india-geo";


export function GovernmentOfficialRegistration({
  close,
  onLogin,
  complete,
}: GovernmentOfficialRegistrationProps) {
  // Section 1: Personal Details
  const [fullName, setFullName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");

  // Section 2: Organization Details
  const [orgName, setOrgName] = useState("");
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [orgCategory, setOrgCategory] = useState<string>("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  // Section 3: Official Role
  const [departmentSector, setDepartmentSector] = useState<string>("");
  const [designation, setDesignation] = useState("");
  const [officeUnit, setOfficeUnit] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  // PRI-Specific Fields (when orgCategory is Panchayati Raj Institution)
  const [priTier, setPriTier] = useState<string>("Gram Panchayat");
  const [block, setBlock] = useState<string>("");
  const [gramPanchayat, setGramPanchayat] = useState<string>("");
  const [village, setVillage] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");

  // Section 4: Official Verification
  const [officialId, setOfficialId] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpBusy, setOtpBusy] = useState(false);

  // Section 5: Account Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  // Close org dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // OTP Countdown timer (strictly 60 seconds)
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [otpTimer]);

  const handleSendOtp = async () => {
    if (!officialEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
      setOtpError("Please enter a valid official email address first.");
      return;
    }
    setOtpError("");
    setOtpSuccessMsg("");
    setOtpBusy(true);

    try {
      const res = await requestRegistrationOtp({
        data: {
          email: officialEmail.trim(),
          name: fullName.trim() || "Government Official",
          purpose: "registration_verification",
        },
      });

      setOtpRequestId(res.requestId);
      setIsOtpSent(true);
      setOtpTimer(60); // strictly 60 seconds validity
      setOtpSuccessMsg(res.message);
    } catch (err: any) {
      setOtpError(err?.message || "Failed to dispatch verification code. Please retry.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    if (!otpRequestId) {
      setOtpError("No active verification session. Please request a new OTP.");
      return;
    }
    setOtpError("");
    setOtpBusy(true);

    try {
      await verifyRegistrationOtp({
        data: {
          email: officialEmail.trim(),
          requestId: otpRequestId,
          otp: otpCode.trim(),
        },
      });
      setIsEmailVerified(true);
      setOtpSuccessMsg("Official email address verified successfully.");
    } catch (err: any) {
      setOtpError(err?.message || "Invalid or expired verification code.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setFormError("Uploaded ID file must be under 10MB.");
        return;
      }
      setIdFile(file);
      setFormError("");
    }
  };

  const filteredOrgs = PRESET_ORGANIZATIONS.filter(
    (org) =>
      org.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
      org.category.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
      org.district.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  const selectPresetOrg = (org: typeof PRESET_ORGANIZATIONS[0]) => {
    setOrgName(org.name);
    setOrgCategory(org.category);
    if (org.district) setDistrict(org.district);
    if (org.state) setState(org.state);
    if ((org as any).sector) {
      setDepartmentSector((org as any).sector);
    }
    setIsOrgDropdownOpen(false);
    setOrgSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const isPri = orgCategory === "Panchayati Raj Institution (PRI)";
    const isDept = orgCategory === "Government Department";
    const userRole = isPri ? "pri" : isDept ? "government_department" : "government";
    const userAccountType = isPri ? "pri" : isDept ? "department" : "organization";

    // Validations
    if (!fullName.trim()) return setFormError("Full Name is required.");
    if (!officialEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
      return setFormError("A valid Official Email ID is required.");
    }
    if (!orgCategory) return setFormError("Please select an Organization Category.");
    if (!district.trim()) return setFormError("District is required.");
    if (!state.trim()) return setFormError("State is required.");

    if (isPri) {
      if (!block.trim()) return setFormError("Block / Mandal is required for Panchayati Raj Institution.");
      if (priTier === "Gram Panchayat" && !gramPanchayat.trim()) {
        return setFormError("Gram Panchayat name is required.");
      }
      if (!designation.trim()) return setFormError("Official Designation is required.");
    } else {
      if (!orgName.trim()) return setFormError("Organization Name is required.");
      if (!departmentSector) return setFormError("Please select a Department / Sector.");
      if (!designation.trim()) return setFormError("Designation is required.");
      if (!officeUnit.trim()) return setFormError("Office / Unit is required.");
      if (!jurisdiction.trim()) return setFormError("Jurisdiction / Areas Served is required.");
    }

    if (!officialId.trim()) return setFormError("Government Employee / Official ID is required.");
    if (!password) return setFormError("Password is required.");
    if (password.length < 6) return setFormError("Password must be at least 6 characters long.");
    if (password !== confirmPassword) return setFormError("Password and Confirm Password do not match.");
    if (!agreeTerms) return setFormError("You must agree to the Terms of Use and Privacy Policy.");

    const computedOrgName = isPri
      ? (orgName.trim() || (gramPanchayat.trim() ? `${gramPanchayat.trim()} Gram Panchayat` : (block.trim() ? `${block.trim()} Panchayat Samiti` : `Zilla Parishad ${district.trim()}`)))
      : orgName.trim();
    const effectiveSector = departmentSector || (isPri ? "Rural Development & Panchayati Raj" : "General Administration");
    const effectiveOfficeUnit = isPri
      ? (gramPanchayat.trim() ? `${gramPanchayat.trim()} GP Office` : (block.trim() ? `${block.trim()} BDO Office` : `${district.trim()} ZP Office`))
      : officeUnit.trim();
    const effectiveJurisdiction = isPri
      ? (jurisdiction.trim() || [village.trim(), gramPanchayat.trim() ? `${gramPanchayat.trim()} GP` : null, block.trim() ? `Block: ${block.trim()}` : null, district.trim()].filter(Boolean).join(", "))
      : jurisdiction.trim();
    const matchedDept = GOVERNMENT_LINE_DEPARTMENTS.find(
      (d) =>
        departmentSector.includes(d.domain) ||
        departmentSector.includes(d.department) ||
        departmentSector === d.department ||
        (effectiveSector && (effectiveSector.includes(d.domain) || effectiveSector.includes(d.department)))
    );
    const effectiveDomain = matchedDept ? matchedDept.domain : "";
    const effectiveDeptName = matchedDept ? matchedDept.department : effectiveSector;

    setBusy(true);

    try {
      if (supabase) {
        // Sign up official
        const { data, error: signupError } = await supabase.auth.signUp({
          email: officialEmail.trim(),
          password,
          options: {
            data: {
              display_name: fullName.trim(),
              account_type: userAccountType,
              role: userRole,
              organization_type: "Government",
              official_category: orgCategory,
              organization_name: computedOrgName,
              department_sector: effectiveDeptName,
              domain: effectiveDomain || undefined,
              designation: designation.trim(),
              office_unit: effectiveOfficeUnit,
              jurisdiction: effectiveJurisdiction,
              district: district.trim(),
              state: state.trim(),
              block: block.trim(),
              gram_panchayat: gramPanchayat.trim(),
              village: village.trim(),
              pri_tier: isPri ? priTier : undefined,
              contact_phone: contactPhone.trim(),
              employee_id: officialId.trim(),
              email_verified: isEmailVerified,
            },
          },
        });

        if (signupError) {
          setFormError(signupError.message);
          setBusy(false);
          return;
        }

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setFormError("An account with this email address already exists. Please use the Sign In option below or reset your password.");
          setBusy(false);
          return;
        }

        if (data.user && data.session) {
          // Only provision when there is a live session (auto-confirmed email).
          // If email confirmation is required, loadProfile handles this on first sign-in.
          await supabase.from("organization_accounts").upsert(
            {
              owner_id: data.user.id,
              name: computedOrgName,
              organization_type: "Government",
              contact_name: fullName.trim(),
              contact_email: officialEmail.trim(),
              contact_phone: contactPhone.trim() || null,
              district: district.trim(),
              locality: isPri
                ? [village.trim(), gramPanchayat.trim() ? `${gramPanchayat.trim()} GP` : null, block.trim() ? `Block: ${block.trim()}` : null, district.trim()].filter(Boolean).join(", ")
                : `${effectiveOfficeUnit} (${effectiveJurisdiction})`,
              expertise: isPri
                ? ["Panchayati Raj Institution (PRI)", priTier, effectiveSector].filter(Boolean)
                : [effectiveDeptName, effectiveDomain, orgCategory, effectiveJurisdiction].filter(Boolean),
              capabilities: isPri
                ? [designation.trim(), `GP: ${gramPanchayat.trim()}`, `Block: ${block.trim()}`, `District: ${district.trim()}`, `ID: ${officialId.trim()}`].filter(Boolean)
                : [designation.trim(), `Jurisdiction: ${effectiveJurisdiction}`, `ID: ${officialId.trim()}`].filter(Boolean),
            },
            { onConflict: "owner_id" }
          );
          setHasSession(true);
          void supabase.from("profiles").update({ role: userRole, district: district.trim() }).eq("id", data.user.id);
        } else if (data.user && !data.session) {
          // Email confirmation required — data will be provisioned by loadProfile on first login.
          setHasSession(false);
        }
      }

      setBusy(false);
      setIsSubmitted(true);
    } catch (err: any) {
      setBusy(false);
      setFormError(err?.message || "Failed to submit official registration. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 md:p-8 flex justify-center items-start">
      <div className="relative w-full max-w-3xl my-4 sm:my-8 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all text-slate-800">
        
        {/* Top Header Bar */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8 sm:py-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 shadow-sm shrink-0">
              <Landmark size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/70 mb-1.5">
                <ShieldCheck size={13} className="text-emerald-600" />
                Verified Government Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Government Official Registration
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Register your official profile to access and manage challenges relevant to your department and jurisdiction.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
            title="Close registration"
            aria-label="Close registration"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Confirmation View */}
        {isSubmitted ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 shadow-sm">
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Registration submitted successfully.
            </h2>
            <p className="mt-2 text-base font-medium text-emerald-800">
              Your official profile is ready for verification.
            </p>
            <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              We have recorded your official credentials for <strong>{orgName}</strong> ({departmentSector}). You can now sign in to your official portal.
            </p>

            {/* Profile Overview Card */}
            <div className="mt-6 mx-auto max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Official Name:</span>
                <span className="font-semibold text-slate-800">{fullName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-semibold text-slate-800">{officialEmail}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Organization:</span>
                <span className="font-semibold text-slate-800">{orgName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Category & Sector:</span>
                <span className="font-semibold text-slate-800">{orgCategory} · {departmentSector}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Jurisdiction:</span>
                <span className="font-semibold text-slate-800">{jurisdiction}, {district}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  close();
                  if (hasSession) {
                    complete(orgCategory === "Panchayati Raj Institution (PRI)" ? "pri" : "government");
                  } else {
                    onLogin();
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-colors"
              >
                {hasSession ? (orgCategory === "Panchayati Raj Institution (PRI)" ? "Go to PRI Dashboard" : "Go to Official Dashboard") : "Proceed to Sign In"} <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Return to Samaj Setu
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to submit registration</p>
                  <p className="mt-0.5 text-xs text-rose-700">{formError}</p>
                </div>
              </div>
            )}

            {/* SECTION 1 — PERSONAL DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  1
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
                  Personal Details
                </h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Email ID <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={officialEmail}
                      onChange={(e) => {
                        setOfficialEmail(e.target.value);
                        if (isEmailVerified) setIsEmailVerified(false);
                      }}
                      placeholder="official.name@gov.in, @nic.in, or official email"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 — ORGANIZATION DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  2
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
                  Organization Details
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Organization Name Searchable Dropdown */}
                <div className="sm:col-span-2 relative" ref={orgDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Organization Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onFocus={() => setIsOrgDropdownOpen(true)}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        setOrgSearchQuery(e.target.value);
                        setIsOrgDropdownOpen(true);
                      }}
                      placeholder="e.g. Greater Visakhapatnam Municipal Corporation (GVMC)"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>

                  {/* Dropdown Options */}
                  {isOrgDropdownOpen && (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Select an organization or type to specify custom
                      </div>
                      {filteredOrgs.length > 0 ? (
                        filteredOrgs.map((org, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectPresetOrg(org)}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm hover:bg-blue-50 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 group-hover:text-blue-700">
                                {org.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {org.category} · {org.district}, {org.state}
                              </p>
                            </div>
                            {orgName === org.name && (
                              <Check size={16} className="text-blue-600 shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Custom organization name entered. You can continue with this name.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Organization Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Organization Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={orgCategory}
                    onChange={(e) => setOrgCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                  >
                    <option value="">-- Select Category --</option>
                    {ORG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* When Category is Government Department: Dedicated Line Department Selector */}
                {orgCategory === "Government Department" && (
                  <div className="sm:col-span-2 rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <Landmark size={18} className="text-blue-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        Select Authorized Line Department
                      </span>
                    </div>
                    <p className="text-xs text-blue-800/90 leading-relaxed">
                      Choose your official government department. This sets your technical oversight domain and jurisdiction.
                    </p>
                    <select
                      value={departmentSector}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDepartmentSector(val);
                        const matched = GOVERNMENT_LINE_DEPARTMENTS.find(
                          (d) => d.department === val || `${d.department} (${d.domain})` === val || val.includes(d.domain)
                        );
                        if (matched && (!orgName.trim() || orgName.includes("Department") || orgName.includes("Authority") || orgName.includes("Corporation"))) {
                          setOrgName(matched.shortName || matched.department);
                        }
                      }}
                      className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm font-medium"
                    >
                      <option value="">-- Choose from all 16 Government Line Departments --</option>
                      {GOVERNMENT_LINE_DEPARTMENTS.map((item) => (
                        <optgroup key={item.domain} label={`🏛️ Domain: ${item.domain}`}>
                          <option value={`${item.department} (${item.domain})`}>
                            {item.department}
                          </option>
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    State <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setDistrict("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                  >
                    <option value="">-- Select State / UT --</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown Cascaded from Selected State */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    District <span className="text-rose-600">*</span>
                  </label>
                  {state && getDistrictsForState(state).length > 0 ? (
                    <select
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm font-medium"
                    >
                      <option value="">-- Select District ({getDistrictsForState(state).length} in {state}) --</option>
                      {getDistrictsForState(state).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      disabled={!state}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="">{state ? "-- Select District --" : "-- Select a State First to view districts --"}</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3 — OFFICIAL ROLE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  3
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
                  {orgCategory === "Panchayati Raj Institution (PRI)" ? "Panchayat Raj Official Role & Jurisdiction" : "Official Role"}
                </h2>
              </div>

              {orgCategory === "Panchayati Raj Institution (PRI)" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* PRI Tier */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Panchayat Raj Tier <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={priTier}
                      onChange={(e) => setPriTier(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="Gram Panchayat">Gram Panchayat (Village Level)</option>
                      <option value="Panchayat Samiti / Block Panchayat">Panchayat Samiti / Mandal Parishad (Block Level)</option>
                      <option value="Zilla Parishad">Zilla Parishad (District Level)</option>
                    </select>
                  </div>

                  {/* Block / Mandal */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Block / Mandal / Taluka <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="e.g. Kanke, Bheemunipatnam, Anandapuram"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Gram Panchayat Name */}
                  {priTier === "Gram Panchayat" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Gram Panchayat Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={gramPanchayat}
                        onChange={(e) => {
                          setGramPanchayat(e.target.value);
                          if (!orgName.trim() || orgName.includes("Gram Panchayat")) {
                            setOrgName(`${e.target.value.trim()} Gram Panchayat`);
                          }
                        }}
                        placeholder="e.g. Pithoria, Thagarapuvalasa"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  )}

                  {/* Village / Habitation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Village / Habitation / Hamlets
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Rampur, Main Village, Ward 4"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Official Designation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Official Designation <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Sarpanch / Mukhiya, Panchayat Secretary, GRS, BDO"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Official Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Department / Sector Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Sector / Focus Area
                    </label>
                    <select
                      value={departmentSector}
                      onChange={(e) => setDepartmentSector(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="">Rural Development & Panchayati Raj (Default)</option>
                      {GOVERNMENT_LINE_DEPARTMENTS.map((dept) => (
                        <option key={dept.domain} value={`${dept.domain} - ${dept.department}`}>
                          {dept.domain} — {dept.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Administrative Jurisdiction */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Administrative Jurisdiction Scope
                    </label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="Auto-derived or e.g. Entire Panchayat / Wards 1-9"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Department / Sector Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {orgCategory === "Government Department" ? "Government Line Department" : "Department / Sector"} <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={departmentSector}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDepartmentSector(val);
                        const matched = GOVERNMENT_LINE_DEPARTMENTS.find(
                          (d) => d.department === val || `${d.department} (${d.domain})` === val || val.includes(d.domain)
                        );
                        if (matched && (!orgName.trim() || orgName.includes("Department") || orgName.includes("Authority") || orgName.includes("Corporation"))) {
                          setOrgName(matched.shortName || matched.department);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm font-medium"
                    >
                      <option value="">-- Select Government Line Department / Sector --</option>
                      {GOVERNMENT_LINE_DEPARTMENTS.map((item) => (
                        <optgroup key={item.domain} label={`🏛️ Domain: ${item.domain}`}>
                          <option value={`${item.department} (${item.domain})`}>
                            {item.department}
                          </option>
                        </optgroup>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Select your authorized department to oversee challenges in its technical domain.
                    </p>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Designation <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Executive Engineer / BDO / Commissioner"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Office / Unit */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Office / Unit <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={officeUnit}
                      onChange={(e) => setOfficeUnit(e.target.value)}
                      placeholder="e.g. Zone 3 Engineering Division / Ward Office 14"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Jurisdiction / Wards / Areas Served */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Jurisdiction / Wards / Areas Served <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="e.g. Wards 12-25, Central Zone, or Panchayats A-E"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4 — OFFICIAL VERIFICATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  4
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
                  Official Verification
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Government Employee / Official ID */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Government Employee / Official ID <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={officialId}
                      onChange={(e) => setOfficialId(e.target.value)}
                      placeholder="e.g. SPARROW ID / CFMS Code / Official Employee Code"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Upload Official ID */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Upload Official ID (Optional proof of appointment or department ID)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  {idFile ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                      <div className="flex items-center gap-3">
                        <FileCheck2 size={24} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1">
                            {idFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(idFile.size / 1024).toFixed(1)} KB · Ready to upload
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIdFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-5 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all"
                    >
                      <UploadCloud size={28} className="text-slate-400 mb-1.5" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">
                        Click or drag official ID card (.PDF, .JPG, .PNG up to 10MB)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Used for fast-track verified badge and expedited jurisdiction routing
                      </p>
                    </div>
                  )}
                </div>

                {/* Official Email Verification / OTP */}
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Official Email Verification
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isOtpSent ? (
                          <>We've sent a 6-digit verification code to: <strong className="text-slate-700">{officialEmail}</strong></>
                        ) : (
                          <>Verify access to {officialEmail || "your official email address"}</>
                        )}
                      </p>
                    </div>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Official Email Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpBusy || otpTimer > 0}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {otpBusy
                          ? "Sending..."
                          : isOtpSent
                            ? otpTimer > 0
                              ? `Resend in 00:${otpTimer < 10 ? "0" : ""}${otpTimer}`
                              : "Resend OTP"
                            : "Send Verification OTP"}
                      </button>
                    )}
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200/70">
                      {otpError}
                    </p>
                  )}

                  {otpSuccessMsg && !isEmailVerified && (
                    <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200/70">
                      {otpSuccessMsg}
                    </p>
                  )}

                  {isOtpSent && !isEmailVerified && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit OTP"
                          disabled={otpBusy}
                          className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tracking-widest text-center font-mono font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpBusy || otpCode.length !== 6}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                        >
                          {otpBusy ? "Verifying..." : "Verify OTP"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Code expires strictly in <strong>60 seconds</strong></span>
                        {otpTimer > 0 ? (
                          <span className="text-amber-700 font-mono font-semibold">00:{otpTimer < 10 ? "0" : ""}${otpTimer}</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Expired — Please click Resend OTP</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Note as requested */}
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                <Landmark size={16} className="text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Your organization, department and jurisdiction help Samaj Setu route relevant challenges to the appropriate authority.
                </span>
              </div>
            </div>

            {/* SECTION 5 — ACCOUNT SECURITY */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  5
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
                  Account Security
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm text-slate-700">
                      I agree to the <span className="font-semibold text-blue-700 underline">Terms of Use</span> and <span className="font-semibold text-blue-700 underline">Privacy Policy</span>.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {busy ? "Submitting Official Profile..." : "Create Government Account"}
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  onLogin();
                }}
                className="text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
              >
                Already registered? Login
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
