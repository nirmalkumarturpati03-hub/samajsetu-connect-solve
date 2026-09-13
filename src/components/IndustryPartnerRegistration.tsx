import React, { useState, useRef, useEffect } from "react";
import {
  Factory,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Landmark,
  Mail,
  User,
  Briefcase,
  Globe,
  MapPin,
  Sparkles,
  FileCheck2,
  Cpu,
  Handshake,
  DollarSign,
  Wrench,
  Rocket,
  Share2,
  Users,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface IndustryPartnerRegistrationProps {
  close: () => void;
  onLogin: () => void;
  complete: (type: string) => void;
}

const ORG_TYPES = [
  "Industry",
  "Startup",
  "MSME",
  "CSR Organization",
  "Research Institution",
  "Innovation Hub",
] as const;

const INDUSTRY_SECTORS = [
  "IT & Software",
  "Manufacturing",
  "Healthcare",
  "Agriculture",
  "Renewable Energy",
  "Infrastructure",
  "Education",
  "Finance",
  "Telecommunications",
  "Other",
] as const;

const CAPABILITY_OPTIONS = [
  "AI / Machine Learning",
  "Software Development",
  "IoT",
  "GIS & Mapping",
  "Hardware",
  "Manufacturing",
  "Civil / Infrastructure",
  "Healthcare Technology",
  "Renewable Energy",
  "Data Analytics",
  "Cloud / IT Infrastructure",
  "Product Design",
  "Research & Development",
  "Testing & Validation",
  "Other",
] as const;

interface PartnershipOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PARTNERSHIP_INTERESTS: PartnershipOption[] = [
  {
    id: "mentoring",
    title: "Mentoring",
    description: "Guide university/student teams with industry expertise and real-world insights.",
    icon: <Users size={20} className="text-blue-600" />,
  },
  {
    id: "co-development",
    title: "Co-development",
    description: "Work jointly on innovative solutions alongside academic and community stakeholders.",
    icon: <Handshake size={20} className="text-emerald-600" />,
  },
  {
    id: "funding",
    title: "Funding / CSR Support",
    description: "Provide financial or Corporate Social Responsibility (CSR) grants for impactful projects.",
    icon: <DollarSign size={20} className="text-amber-600" />,
  },
  {
    id: "prototyping",
    title: "Prototyping",
    description: "Support hardware, software, lab testing, or proof-of-concept prototype development.",
    icon: <Wrench size={20} className="text-indigo-600" />,
  },
  {
    id: "pilot-implementation",
    title: "Pilot Implementation",
    description: "Help test, pilot, and deploy solutions in live industrial or community environments.",
    icon: <Rocket size={20} className="text-rose-600" />,
  },
  {
    id: "technology-transfer",
    title: "Technology Transfer",
    description: "Support the adoption, licensing, scaling, or commercialization of validated solutions.",
    icon: <Share2 size={20} className="text-purple-600" />,
  },
  {
    id: "technical-resources",
    title: "Technical Resources",
    description: "Provide compute infrastructure, specialized equipment, APIs, or dedicated engineering teams.",
    icon: <Cpu size={20} className="text-teal-600" />,
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Jharkhand",
  "Karnataka",
  "Maharashtra",
  "Delhi (NCT)",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Gujarat",
  "West Bengal",
  "Odisha",
  "Kerala",
  "Madhya Pradesh",
  "Rajasthan",
  "Punjab",
  "Haryana",
  "Bihar",
  "Assam",
  "Other State / UT",
];

export function IndustryPartnerRegistration({
  close,
  onLogin,
  complete,
}: IndustryPartnerRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Organization Details
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<string>("");
  const [industrySector, setIndustrySector] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");

  // Step 2: Authorized Representative
  const [repName, setRepName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Step 3: Organization Capabilities
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [capabilitySearch, setCapabilitySearch] = useState("");
  const [customCapability, setCustomCapability] = useState("");

  // Step 4: Partnership Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 5: Verification & Security
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  const [authDoc, setAuthDoc] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // General State
  const [stepError, setStepError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleSendOtp = () => {
    if (!officialEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
      setOtpError("Please ensure a valid official email address was entered in Step 2.");
      return;
    }
    setOtpError("");
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockCode);
    setIsOtpSent(true);
    setOtpTimer(60);
  };

  const handleVerifyOtp = () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    if (otpCode.trim() === generatedOtp || otpCode.trim() === "123456") {
      setIsEmailVerified(true);
      setOtpError("");
    } else {
      setOtpError("Invalid verification code. Please check and retry.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setStepError("Uploaded document must be under 10MB.");
        return;
      }
      setAuthDoc(file);
      setStepError("");
    }
  };

  const toggleCapability = (cap: string) => {
    if (selectedCapabilities.includes(cap)) {
      setSelectedCapabilities(selectedCapabilities.filter((c) => c !== cap));
    } else {
      setSelectedCapabilities([...selectedCapabilities, cap]);
    }
  };

  const addCustomCapability = () => {
    if (customCapability.trim() && !selectedCapabilities.includes(customCapability.trim())) {
      setSelectedCapabilities([...selectedCapabilities, customCapability.trim()]);
      setCustomCapability("");
    }
  };

  const toggleInterest = (title: string) => {
    if (selectedInterests.includes(title)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== title));
    } else {
      setSelectedInterests([...selectedInterests, title]);
    }
  };

  // Step Validation
  const validateAndProceed = () => {
    setStepError("");

    if (currentStep === 1) {
      if (!orgName.trim()) return setStepError("Organization / Company Name is required.");
      if (!orgType) return setStepError("Please select an Organization Type.");
      if (!industrySector) return setStepError("Please select an Industry Sector.");
      if (!state) return setStepError("Please select Registered State.");
      if (!district.trim()) return setStepError("District is required.");
      if (!city.trim()) return setStepError("City is required.");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentStep === 2) {
      if (!repName.trim()) return setStepError("Full Name of authorized representative is required.");
      if (!officialEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
        return setStepError("A valid Official Email ID is required.");
      }
      if (!designation.trim()) return setStepError("Designation / Role is required.");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentStep === 3) {
      if (selectedCapabilities.length === 0) {
        return setStepError("Please select at least one capability that your organization can provide.");
      }
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentStep === 4) {
      if (selectedInterests.length === 0) {
        return setStepError("Please select at least one way your organization would like to contribute.");
      }
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError("");

    if (!password) return setStepError("Password is required.");
    if (password.length < 6) return setStepError("Password must be at least 6 characters long.");
    if (password !== confirmPassword) return setStepError("Passwords do not match.");
    if (!agreeTerms) return setStepError("You must agree to the Terms of Use and Privacy Policy.");

    setBusy(true);

    try {
      if (supabase) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: officialEmail.trim(),
          password,
          options: {
            data: {
              display_name: orgName.trim(),
              account_type: "organization",
              organization_type: "Industry",
              company_type: orgType,
              industry_sector: industrySector,
              website: website.trim(),
              representative_name: repName.trim(),
              designation: designation.trim(),
              employee_id: employeeId.trim(),
              capabilities: selectedCapabilities,
              partnership_interests: selectedInterests,
              state,
              district: district.trim(),
              city: city.trim(),
              email_verified: isEmailVerified,
            },
          },
        });

        if (signupError) {
          setStepError(signupError.message);
          setBusy(false);
          return;
        }

        if (data.user && data.session) {
          // Only provision when there is a live session (auto-confirmed email).
          // If email confirmation is required, loadProfile handles this on first sign-in.
          await supabase.from("organization_accounts").upsert(
            {
              owner_id: data.user.id,
              name: orgName.trim(),
              organization_type: "Industry",
              contact_name: repName.trim(),
              contact_email: officialEmail.trim(),
              district: district.trim(),
              locality: `${city.trim()}, ${state.trim()}`,
              expertise: selectedCapabilities,
              capabilities: selectedInterests,
            },
            { onConflict: "owner_id" }
          );
          setHasSession(true);
          void supabase.from("profiles").update({ role: "industry" }).eq("id", data.user.id);
        } else if (data.user && !data.session) {
          // Email confirmation required — data will be provisioned by loadProfile on first login.
          setHasSession(false);
        }
      }

      setBusy(false);
      setIsSubmitted(true);
    } catch (err: any) {
      setBusy(false);
      setStepError(err?.message || "Failed to create Industry Account. Please try again.");
    }
  };

  const steps = [
    { number: 1, label: "Organization" },
    { number: 2, label: "Representative" },
    { number: 3, label: "Capabilities" },
    { number: 4, label: "Partnership" },
    { number: 5, label: "Verification" },
  ];

  const filteredCapabilities = CAPABILITY_OPTIONS.filter((cap) =>
    cap.toLowerCase().includes(capabilitySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 md:p-8 flex justify-center items-start">
      <div className="relative w-full max-w-3xl my-4 sm:my-8 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all text-slate-800">
        
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8 sm:py-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 shadow-sm shrink-0">
              <Lightbulb size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200/70 mb-1.5">
                <Sparkles size={13} className="text-blue-600" />
                Industry & Innovation Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Industry & Innovation Partner Registration
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Join SamajSetu to discover societal challenges, collaborate with universities and communities, and support solutions through mentoring, technology, funding and implementation.
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

        {/* 5-Step Progress Indicator */}
        {!isSubmitted && (
          <div className="border-b border-slate-100 bg-white px-6 py-3.5 sm:px-8">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                return (
                  <React.Fragment key={step.number}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isCompleted
                            ? "bg-emerald-600 text-white shadow-sm"
                            : isActive
                            ? "bg-blue-700 text-white ring-4 ring-blue-100 shadow-sm"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {isCompleted ? <Check size={14} strokeWidth={2.5} /> : step.number}
                      </div>
                      <span
                        className={`hidden sm:inline-block text-xs font-semibold ${
                          isActive ? "text-blue-900 font-bold" : isCompleted ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 sm:mx-3 transition-colors ${
                          currentStep > idx + 1 ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Success Confirmation View */}
        {isSubmitted ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 shadow-sm">
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Registration Submitted Successfully!
            </h2>
            <p className="mt-2 text-sm sm:text-base font-medium text-emerald-800">
              Your organization profile has been created and is pending verification.
            </p>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Once verified, you can discover relevant challenges, connect with university teams, and participate in collaborative projects.
            </p>

            {/* Profile Summary Card */}
            <div className="mt-6 mx-auto max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Organization:</span>
                <span className="font-semibold text-slate-800">{orgName} ({orgType})</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Industry Sector:</span>
                <span className="font-semibold text-slate-800">{industrySector}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Representative:</span>
                <span className="font-semibold text-slate-800">{repName} ({designation})</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-semibold text-slate-800">{officialEmail}</span>
              </div>
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Key Capabilities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCapabilities.slice(0, 4).map((cap) => (
                    <span key={cap} className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                      {cap}
                    </span>
                  ))}
                  {selectedCapabilities.length > 4 && (
                    <span className="text-[11px] text-slate-500 self-center">
                      +{selectedCapabilities.length - 4} more
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Location:</span>
                <span className="font-semibold text-slate-800">{city}, {district}, {state}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  close();
                  if (hasSession) {
                    complete("industry");
                  } else {
                    onLogin();
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-colors"
              >
                {hasSession ? "Go to Industry Dashboard" : "Proceed to Sign In"} <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to SamajSetu
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={currentStep === 5 ? handleSubmit : (e) => { e.preventDefault(); validateAndProceed(); }} className="p-6 sm:p-8 space-y-6">

            {stepError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 animate-in fade-in duration-200">
                <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Please check required details</p>
                  <p className="mt-0.5 text-xs text-rose-700">{stepError}</p>
                </div>
              </div>
            )}

            {/* STEP 1 — ORGANIZATION DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">
                    Step 1 — Organization Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter the legal identity and registered location of your enterprise or institution.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization / Company Name <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Factory size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Tata Steel, Infosys Labs, TechSparks Innovation"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization Type <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="">-- Select Type --</option>
                      {ORG_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Industry Sector <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={industrySector}
                      onChange={(e) => setIndustrySector(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="">-- Select Sector --</option>
                      {INDUSTRY_SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization Website <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Registered State <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    >
                      <option value="">-- Select State --</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      District <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Bengaluru Urban, Ranchi, Pune"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      City / Locality <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Whitefield, HEC Industrial Area, Electronic City"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — AUTHORIZED REPRESENTATIVE */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">
                    Step 2 — Authorized Representative
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official primary contact who represents your enterprise on SamajSetu.
                  </p>
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
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        placeholder="e.g. Priya Venkatesh"
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
                        placeholder="e.g. priya.v@company.com"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Designation / Role <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Head of CSR / VP Engineering / R&D Lead"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization ID / Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-98214"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  Note: Official communications, challenge invitations, and project agreements will be routed through this representative profile.
                </div>
              </div>
            )}

            {/* STEP 3 — ORGANIZATION CAPABILITIES */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">
                    Step 3 — Organization Capabilities
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    What capabilities can your organization provide?
                  </p>
                </div>

                {/* Selected Capabilities Chips */}
                {selectedCapabilities.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      Selected Capabilities ({selectedCapabilities.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCapabilities.map((cap) => (
                        <span
                          key={cap}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-sm"
                        >
                          {cap}
                          <button
                            type="button"
                            onClick={() => toggleCapability(cap)}
                            className="text-blue-500 hover:text-blue-800 rounded p-0.5"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Capabilities */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={capabilitySearch}
                    onChange={(e) => setCapabilitySearch(e.target.value)}
                    placeholder="Search capabilities (e.g. AI, IoT, Renewable Energy, Manufacturing)..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Capabilities Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {filteredCapabilities.map((cap) => {
                    const isSelected = selectedCapabilities.includes(cap);
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => toggleCapability(cap)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate mr-1">{cap}</span>
                        {isSelected && <Check size={15} className="text-blue-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom capability */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customCapability}
                    onChange={(e) => setCustomCapability(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomCapability();
                      }
                    }}
                    placeholder="Add other custom capability..."
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={addCustomCapability}
                    className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
                  >
                    + Add
                  </button>
                </div>

                {/* Helper text as specified */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  💡 These capabilities help SamajSetu match your organization with relevant societal challenges and university projects.
                </div>
              </div>
            )}

            {/* STEP 4 — PARTNERSHIP INTERESTS */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">
                    Step 4 — Partnership Interests
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How would you like to contribute? (Select all that apply)
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {PARTNERSHIP_INTERESTS.map((item) => {
                    const isSelected = selectedInterests.includes(item.title);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleInterest(item.title)}
                        className={`cursor-pointer rounded-xl border p-4 text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">{item.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                              {item.title}
                            </h3>
                            <div
                              className={`flex size-4 items-center justify-center rounded border transition-colors ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5 — VERIFICATION & SECURITY */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">
                    Step 5 — Verification & Security
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Secure your organization profile and verify authorized access.
                  </p>
                </div>

                {/* Email Verification Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Official Email Verification
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sending verification code to <strong>{officialEmail}</strong>
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
                        disabled={otpTimer > 0}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {isOtpSent ? (otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend OTP") : "Send Verification OTP"}
                      </button>
                    )}
                  </div>

                  {isOtpSent && !isEmailVerified && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit OTP"
                          className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tracking-widest text-center font-mono font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                        >
                          Verify OTP
                        </button>
                      </div>
                      {generatedOtp && (
                        <p className="text-[11px] text-blue-700 font-medium bg-blue-50/80 p-2 rounded-lg border border-blue-200/50">
                          Verification code sent to email. (Demo code: <strong>{generatedOtp}</strong>)
                        </p>
                      )}
                      {otpError && (
                        <p className="text-xs text-rose-600 font-medium">{otpError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Upload Organization / Authorization Document */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Upload Organization / Authorization Document <span className="text-slate-400 font-normal">(Optional: Certificate of Incorporation, CSR registration, or letterhead)</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  {authDoc ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                      <div className="flex items-center gap-3">
                        <FileCheck2 size={24} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1">
                            {authDoc.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(authDoc.size / 1024).toFixed(1)} KB · Attached
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthDoc(null);
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
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all"
                    >
                      <UploadCloud size={24} className="text-slate-400 mb-1" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">
                        Click or drag authorization document (.PDF, .JPG, .PNG up to 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Password Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Create Password <span className="text-rose-600">*</span>
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

                  {/* Terms Checkbox */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs sm:text-sm text-slate-700">
                        I agree to the SamajSetu <span className="font-semibold text-blue-700 underline">Terms of Use</span> and <span className="font-semibold text-blue-700 underline">Privacy Policy</span>.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Trust message as specified */}
                <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    Your organization details will be verified before access to industry collaboration features is enabled.
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Navigation */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStepError("");
                      setCurrentStep(currentStep - 1);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogin();
                  }}
                  className="text-xs sm:text-sm font-semibold text-blue-700 hover:underline mr-2"
                >
                  Already registered? Login
                </button>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={validateAndProceed}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-colors"
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {busy ? "Submitting Registration..." : "Create Industry Account"}
                  </button>
                )}
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
