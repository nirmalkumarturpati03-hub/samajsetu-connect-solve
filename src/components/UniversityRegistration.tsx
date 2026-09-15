import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  MapPin,
  Building,
  UserCheck,
  BookOpen,
  FlaskConical,
  Award,
  Handshake,
  FileCheck,
  CheckSquare,
  Lock,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestRegistrationOtp, verifyRegistrationOtp } from "@/lib/otp.functions";

// ==============================================================================
// PRESETS & DATA DEFINITIONS
// ==============================================================================

const INSTITUTION_TYPES = [
  "University",
  "College",
  "Standalone Institution",
  "Institute of National Importance",
] as const;

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  University: [
    "Central University",
    "State Public University",
    "State Private University",
    "Deemed-to-be University",
    "Research Institution",
    "Other University",
  ],
  College: [
    "Government Engineering College",
    "Government Degree College",
    "Private Engineering College",
    "Autonomous College",
    "Constituent College",
    "Affiliated College",
    "Polytechnic / Technical Institution",
    "Other College",
  ],
  "Standalone Institution": [
    "Autonomous Research Institution",
    "National Laboratory / Centre",
    "Post-Graduate Research Centre",
    "Polytechnic / Technical Institution",
    "Management Institution",
    "Other Standalone Institution",
  ],
  "Institute of National Importance": [
    "IIT (Indian Institute of Technology)",
    "NIT (National Institute of Technology)",
    "IIIT (Indian Institute of Information Technology)",
    "IISER (Indian Institute of Science Education and Research)",
    "IIM (Indian Institute of Management)",
    "AIIMS",
    "Other Institute of National Importance",
  ],
};

const OWNERSHIP_OPTIONS = [
  "Central Government",
  "State Government",
  "Private",
  "Public-Private",
  "Autonomous",
  "Other",
] as const;

const NIRF_BANDS = [
  "Top 50",
  "51–100",
  "101–200",
  "Unranked",
  "Not Applicable",
  "Not Available",
] as const;

const NAAC_STATUSES = [
  "Accredited",
  "Not Accredited",
  "Accreditation In Progress",
  "Not Applicable",
  "Not Available",
] as const;

const NAAC_GRADES = ["A++", "A+", "A", "B++", "B+", "B", "C"] as const;

const ACADEMIC_DEPARTMENTS_LIST = [
  "Civil Engineering",
  "Environmental Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics Engineering",
  "Electronics & Communication Engineering",
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence / Machine Learning",
  "Data Science",
  "IoT / Embedded Systems",
  "Agriculture / Agricultural Engineering",
  "Architecture / Planning",
  "Biomedical Engineering",
  "Materials Science",
  "Physics",
  "Chemistry",
  "Mathematics / Statistics",
  "Social Sciences",
  "Economics / Public Policy",
  "Management",
];

const RESEARCH_DOMAINS_TAXONOMY: Record<string, string[]> = {
  "Water & Sanitation": [
    "Drinking Water",
    "Groundwater",
    "Water Quality",
    "Wastewater Treatment",
    "Sanitation",
    "Drainage",
    "Rainwater Harvesting",
    "Water Conservation",
    "Leak Detection",
  ],
  Infrastructure: [
    "Road Engineering",
    "Pavement Monitoring",
    "Bridges",
    "Structural Health",
    "Traffic Engineering",
    "Urban Infrastructure",
  ],
  Agriculture: [
    "Irrigation",
    "Soil Health",
    "Precision Agriculture",
    "Farm Mechanization",
    "Crop Monitoring",
    "Agricultural IoT",
  ],
  Waste: [
    "Solid Waste Management",
    "Plastic Waste",
    "E-Waste",
    "Waste Segregation",
    "Composting",
    "Waste-to-Energy",
  ],
  Energy: [
    "Solar Energy",
    "Renewable Energy",
    "Microgrids",
    "Energy Storage",
    "Energy Efficiency",
    "Rural Electrification",
  ],
  "Digital Civic Systems": [
    "GIS",
    "Remote Sensing",
    "AI/ML",
    "Data Analytics",
    "Computer Vision",
    "IoT",
    "Cybersecurity",
    "Mobile Applications",
    "Digital Governance",
  ],
};

const RESEARCH_FACILITIES_PRESETS = [
  "Environmental Laboratory",
  "Water Testing Laboratory",
  "Soil Testing Laboratory",
  "Structural Laboratory",
  "Materials Laboratory",
  "Electronics Laboratory",
  "IoT Laboratory",
  "Robotics Laboratory",
  "AI/ML Laboratory",
  "GIS / Remote Sensing Laboratory",
  "Agricultural Laboratory",
  "Fabrication / Maker Space",
  "Incubation Centre",
  "Testing & Certification Facility",
  "Field Testing Facility",
];

const ACADEMIC_PARTICIPATION_TYPES = [
  "Final-year projects",
  "Mini projects",
  "Capstone projects",
  "Internships",
  "Community field projects",
  "Service learning",
  "Research projects",
  "Faculty research",
  "Student innovation projects",
];

const PARTNERSHIP_CONTRIBUTIONS = [
  "Research",
  "Problem Analysis",
  "Field Surveys",
  "Laboratory Testing",
  "Prototype Development",
  "Software Development",
  "Hardware Development",
  "AI/ML Development",
  "GIS Analysis",
  "Data Analysis",
  "Student Teams",
  "Faculty Expertise",
  "Field Deployment",
  "Pilot Testing",
  "Impact Measurement",
  "Technical Validation",
  "Training / Capacity Building",
];

const PARTNERSHIP_MODELS = [
  "University ↔ Government",
  "University ↔ Panchayat",
  "University ↔ ULB",
  "University ↔ Industry",
  "University ↔ CSR",
  "University ↔ Community",
];

import { INDIAN_STATES, getDistrictsForState } from "@/data/india-geo";


const GENERIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "rediffmail.com",
  "icloud.com",
  "protonmail.com",
  "zoho.com",
];

// Helper: validate AISHE format (e.g. U-1234, C-12345, S-123456)
export function validateAisheCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return /^[UCS]-\d{4,6}$/.test(normalized);
}

interface FacilityRecord {
  name: string;
  description: string;
  capacity: string;
  availability: string;
  externalCollaboration: boolean;
}

interface UniversityRegistrationProps {
  close: () => void;
  onLogin: () => void;
  complete: (type: string) => void;
}

export function UniversityRegistration({
  close,
  onLogin,
  complete,
}: UniversityRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [generatedInstitutionId, setGeneratedInstitutionId] = useState<string>("");

  // --------------------------------------------------------------------------
  // STEP 1: Institutional Identity
  // --------------------------------------------------------------------------
  const [legalName, setLegalName] = useState("");
  const [shortName, setShortName] = useState("");
  const [aisheCode, setAisheCode] = useState("");
  const [institutionType, setInstitutionType] = useState<string>("University");
  const [institutionCategory, setInstitutionCategory] = useState<string>("");
  const [ownership, setOwnership] = useState<string>("");
  const [establishmentYear, setEstablishmentYear] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [institutionalDomainEmail, setInstitutionalDomainEmail] = useState("");
  const [allowGenericEmailException, setAllowGenericEmailException] = useState(false);
  const [genericEmailReason, setGenericEmailReason] = useState("");
  const [nirfRankingBand, setNirfRankingBand] = useState<string>("");
  const [naacStatus, setNaacStatus] = useState<string>("");
  const [naacGrade, setNaacGrade] = useState<string>("");
  const [nbaAccreditation, setNbaAccreditation] = useState<string>("");
  const [ugcRecognition, setUgcRecognition] = useState<string>("");

  // --------------------------------------------------------------------------
  // STEP 2: Primary Nodal Officer & OTP
  // --------------------------------------------------------------------------
  const [nodalName, setNodalName] = useState("");
  const [nodalDesignation, setNodalDesignation] = useState("");
  const [nodalDepartment, setNodalDepartment] = useState("");
  const [nodalEmail, setNodalEmail] = useState("");
  const [nodalMobile, setNodalMobile] = useState("");
  const [altContactName, setAltContactName] = useState("");
  const [altContactEmail, setAltContactEmail] = useState("");
  const [altContactMobile, setAltContactMobile] = useState("");

  // OTP State
  const [otpRequestId, setOtpRequestId] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [otpBusy, setOtpBusy] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>("");
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string>("");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // --------------------------------------------------------------------------
  // STEP 3: Institutional Address & GIS Location
  // --------------------------------------------------------------------------
  const [campusBuilding, setCampusBuilding] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const country = "India";
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapStatus, setMapStatus] = useState<string>("");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Initialize Leaflet map on step 3
  useEffect(() => {
    if (currentStep !== 3 || !mapContainerRef.current) return;

    let isDisposed = false;
    const initialLat = parseFloat(latitude) || 20.5937;
    const initialLng = parseFloat(longitude) || 78.9629;
    const initialZoom = latitude && longitude ? 13 : 4;

    void import("leaflet").then((L) => {
      if (isDisposed || !mapContainerRef.current) return;

      // Fix default Leaflet icon issues in bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      markerInstanceRef.current = marker;
      mapInstanceRef.current = map;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLatitude(pos.lat.toFixed(6));
        setLongitude(pos.lng.toFixed(6));
        setMapStatus(`Confirmed coordinates: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setLatitude(e.latlng.lat.toFixed(6));
        setLongitude(e.latlng.lng.toFixed(6));
        setMapStatus(`Selected coordinates: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
      });
    });

    return () => {
      isDisposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentStep]);

  const searchMapLocation = async () => {
    if (!mapSearchQuery.trim()) return;
    setMapStatus("Searching location in India...");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchQuery + ", India"
        )}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const top = data[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 14);
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
        setMapStatus(`Found: ${top.display_name.slice(0, 70)}...`);
      } else {
        setMapStatus("No location matches found. Please drag pin manually.");
      }
    } catch {
      setMapStatus("Location search unavailable. Please enter coordinates manually.");
    }
  };

  // --------------------------------------------------------------------------
  // STEP 4: Academic & Research Capabilities
  // --------------------------------------------------------------------------
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [customDepartment, setCustomDepartment] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<Record<string, string[]>>({});
  const [domainSearch, setDomainSearch] = useState("");

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const addCustomDept = () => {
    if (customDepartment.trim() && !selectedDepartments.includes(customDepartment.trim())) {
      setSelectedDepartments((prev) => [...prev, customDepartment.trim()]);
      setCustomDepartment("");
    }
  };

  const toggleDomainItem = (domainGroup: string, item: string) => {
    setSelectedDomains((prev) => {
      const groupItems = prev[domainGroup] || [];
      const updated = groupItems.includes(item)
        ? groupItems.filter((i) => i !== item)
        : [...groupItems, item];
      return { ...prev, [domainGroup]: updated };
    });
  };

  // --------------------------------------------------------------------------
  // STEP 5: Research Infrastructure & Field Capability
  // --------------------------------------------------------------------------
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [customFacility, setCustomFacility] = useState("");
  const [detailedFacilities, setDetailedFacilities] = useState<FacilityRecord[]>([]);

  const [newFacName, setNewFacName] = useState("");
  const [newFacDesc, setNewFacDesc] = useState("");
  const [newFacCap, setNewFacCap] = useState("");
  const [newFacAvail, setNewFacAvail] = useState("");
  const [newFacCollab, setNewFacCollab] = useState(true);

  // Field Deployment
  const [canConductField, setCanConductField] = useState<boolean>(false);
  const [fieldRadiusKm, setFieldRadiusKm] = useState<string>("50");
  const [preferredDistricts, setPreferredDistricts] = useState<string>("");
  const [fieldTeamAvailable, setFieldTeamAvailable] = useState<boolean>(true);
  const [transportSupport, setTransportSupport] = useState<boolean>(false);
  const [communityEngagementTeam, setCommunityEngagementTeam] = useState<boolean>(true);
  const [fieldTestingCapability, setFieldTestingCapability] = useState<boolean>(true);

  const addFacilityRecord = () => {
    if (!newFacName.trim()) return;
    setDetailedFacilities((prev) => [
      ...prev,
      {
        name: newFacName.trim(),
        description: newFacDesc.trim(),
        capacity: newFacCap.trim(),
        availability: newFacAvail.trim(),
        externalCollaboration: newFacCollab,
      },
    ]);
    setNewFacName("");
    setNewFacDesc("");
    setNewFacCap("");
    setNewFacAvail("");
    setNewFacCollab(true);
  };

  const removeFacilityRecord = (index: number) => {
    setDetailedFacilities((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------------------------------------------------------
  // STEP 6: NEP / Academic Credit & Student Participation
  // --------------------------------------------------------------------------
  const [academicCouncilRecognition, setAcademicCouncilRecognition] = useState<string>("");
  const [capstoneCourseCodes, setCapstoneCourseCodes] = useState<string[]>([""]);
  const [defaultCreditValue, setDefaultCreditValue] = useState<string>("4 Credits");
  const [selectedParticipationTypes, setSelectedParticipationTypes] = useState<string[]>([]);
  const [expectedStudentsPerProject, setExpectedStudentsPerProject] = useState<string>("4");
  const [facultyMentorRequired, setFacultyMentorRequired] = useState<boolean>(true);
  const [maxConcurrentProjects, setMaxConcurrentProjects] = useState<string>("10");

  const addCourseCode = () => {
    setCapstoneCourseCodes((prev) => [...prev, ""]);
  };

  const updateCourseCode = (index: number, val: string) => {
    setCapstoneCourseCodes((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const removeCourseCode = (index: number) => {
    setCapstoneCourseCodes((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------------------------------------------------------
  // STEP 7: Partnership Capabilities
  // --------------------------------------------------------------------------
  const [selectedContributions, setSelectedContributions] = useState<string[]>([]);
  const [selectedPartnershipModels, setSelectedPartnershipModels] = useState<string[]>([]);

  // --------------------------------------------------------------------------
  // STEP 8: External Identifiers
  // --------------------------------------------------------------------------
  const [irinsUrl, setIrinsUrl] = useState("");
  const [istemRegistration, setIstemRegistration] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [orcid, setOrcid] = useState("");
  const [scopusId, setScopusId] = useState("");

  // --------------------------------------------------------------------------
  // STEP 9: Verification Documents
  // --------------------------------------------------------------------------
  const [aisheDocFile, setAisheDocFile] = useState<File | null>(null);
  const [authLetterFile, setAuthLetterFile] = useState<File | null>(null);
  const [optionalDocs, setOptionalDocs] = useState<{ type: string; file: File }[]>([]);
  const [optDocType, setOptDocType] = useState<string>("ugc_document");
  const [optDocFile, setOptDocFile] = useState<File | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    setStepError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setStepError("Only PDF documents (.pdf) are accepted for institutional verification.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setStepError("Document size must not exceed 5 MB.");
        return;
      }
      setter(file);
    }
  };

  const addOptionalDoc = () => {
    if (!optDocFile) return;
    setOptionalDocs((prev) => [...prev, { type: optDocType, file: optDocFile }]);
    setOptDocFile(null);
  };

  // --------------------------------------------------------------------------
  // STEP 10: Declaration, Review & Account Credentials
  // --------------------------------------------------------------------------
  const [decAccurate, setDecAccurate] = useState(false);
  const [decAuthorized, setDecAuthorized] = useState(false);
  const [decAisheVerify, setDecAisheVerify] = useState(false);
  const [decNotAutoApproval, setDecNotAutoApproval] = useState(false);
  const [decContactAgree, setDecContactAgree] = useState(false);
  const [decTermsAgree, setDecTermsAgree] = useState(false);

  const [authorizedOfficerName, setAuthorizedOfficerName] = useState("");
  const [authorizedOfficerDesignation, setAuthorizedOfficerDesignation] = useState("");
  const declarationDate = new Date().toISOString().split("T")[0];

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ==============================================================================
  // OTP HANDLERS (Samaj Setu Custom OTP Flow)
  // ==============================================================================
  const handleSendOtp = async () => {
    if (!nodalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nodalEmail)) {
      setOtpError("Please enter a valid official institutional email first.");
      return;
    }

    setOtpError("");
    setOtpSuccessMsg("");
    setOtpBusy(true);

    try {
      const res = await requestRegistrationOtp({
        data: {
          email: nodalEmail.trim(),
          name: nodalName.trim() || "Institutional Nodal Officer",
          purpose: "university_registration",
        },
      });

      setOtpRequestId(res.requestId);
      setIsOtpSent(true);
      setOtpTimer(60); // strictly 60 seconds
      setOtpSuccessMsg(`Verification code sent to ${nodalEmail.trim()}`);
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
          email: nodalEmail.trim(),
          requestId: otpRequestId,
          otp: otpCode.trim(),
        },
      });

      setIsEmailVerified(true);
      setOtpSuccessMsg("Official institutional email verified successfully ✓");
    } catch (err: any) {
      setOtpError(err?.message || "Invalid or expired verification code.");
    } finally {
      setOtpBusy(false);
    }
  };

  // Reset OTP status if user modifies email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNodalEmail(val);
    if (isEmailVerified || isOtpSent) {
      setIsEmailVerified(false);
      setIsOtpSent(false);
      setOtpCode("");
      setOtpRequestId("");
      setOtpSuccessMsg("");
    }
  };

  // ==============================================================================
  // STEP VALIDATION LOGIC
  // ==============================================================================
  const validateStep = (step: number): boolean => {
    setStepError("");

    if (step === 1) {
      if (!legalName.trim() || legalName.trim().length < 3) {
        setStepError("Full Legal Institution Name is required (minimum 3 characters).");
        return false;
      }
      if (!shortName.trim()) {
        setStepError("Institution Short Name / Acronym is required.");
        return false;
      }
      if (!aisheCode.trim()) {
        setStepError("AISHE Code is required.");
        return false;
      }
      if (!validateAisheCode(aisheCode)) {
        setStepError(
          "Invalid AISHE Code format. Format must be prefix letter (U, C, or S) followed by a hyphen and 4 to 6 digits (e.g., U-0206, C-12345)."
        );
        return false;
      }
      if (!institutionType) {
        setStepError("Please select an Institution Type.");
        return false;
      }
      if (!institutionCategory) {
        setStepError("Please select an Institution Category.");
        return false;
      }
      if (!ownership) {
        setStepError("Please select Ownership.");
        return false;
      }
      const year = parseInt(establishmentYear, 10);
      const currentYear = new Date().getFullYear();
      if (!establishmentYear || isNaN(year) || year < 1800 || year > currentYear) {
        setStepError(`Establishment year must be a 4-digit year between 1800 and ${currentYear}.`);
        return false;
      }
      if (
        !website.trim() ||
        !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(website.trim())
      ) {
        setStepError("A valid official institution website URL is required (e.g. https://www.example.edu.in).");
        return false;
      }
      if (!institutionalDomainEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(institutionalDomainEmail)) {
        setStepError("A valid primary institutional domain email is required.");
        return false;
      }
      const emailDomain = institutionalDomainEmail.split("@")[1]?.toLowerCase() || "";
      if (GENERIC_EMAIL_DOMAINS.includes(emailDomain) && !allowGenericEmailException) {
        setStepError(
          `Primary institutional email cannot be from a generic provider (@${emailDomain}). Please use your official institutional domain (e.g., @andhrauniversity.edu.in) or request an exception below.`
        );
        return false;
      }
      if (!ugcRecognition) {
        setStepError("Please specify UGC / Statutory Recognition status.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!nodalName.trim()) {
        setStepError("Nodal Officer Full Name is required.");
        return false;
      }
      if (!nodalDesignation.trim()) {
        setStepError("Official Designation is required.");
        return false;
      }
      if (!nodalDepartment.trim()) {
        setStepError("Department is required.");
        return false;
      }
      if (!nodalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nodalEmail)) {
        setStepError("Valid Official Institutional Email for Nodal Officer is required.");
        return false;
      }
      if (!nodalMobile.trim() || !/^\d{10}$/.test(nodalMobile.replace(/\D/g, ""))) {
        setStepError("A valid 10-digit mobile number is required.");
        return false;
      }
      if (!isEmailVerified) {
        setStepError("You must verify the Nodal Officer's institutional email address using the OTP verification before proceeding.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!campusBuilding.trim()) {
        setStepError("Campus / Building Name is required.");
        return false;
      }
      if (!addressLine1.trim()) {
        setStepError("Address Line 1 is required.");
        return false;
      }
      if (!city.trim()) {
        setStepError("Village / Town / City is required.");
        return false;
      }
      if (!district.trim()) {
        setStepError("District is required.");
        return false;
      }
      if (!state) {
        setStepError("State is required.");
        return false;
      }
      if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
        setStepError("A valid 6-digit PIN code is required.");
        return false;
      }
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setStepError("Valid campus GPS coordinates (Latitude -90 to 90 and Longitude -180 to 180) are required.");
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (selectedDepartments.length === 0) {
        setStepError("Please select at least one Academic Department.");
        return false;
      }
      const totalSelectedDomains = Object.values(selectedDomains).reduce(
        (sum, list) => sum + list.length,
        0
      );
      if (totalSelectedDomains === 0) {
        setStepError("Please select at least one Research Domain capability.");
        return false;
      }
      return true;
    }

    if (step === 5) {
      if (selectedFacilities.length === 0) {
        setStepError("Please select at least one Research Laboratory / Facility.");
        return false;
      }
      if (canConductField) {
        const rad = parseInt(fieldRadiusKm, 10);
        if (isNaN(rad) || rad <= 0) {
          setStepError("Please provide a valid maximum field radius (in km).");
          return false;
        }
      }
      return true;
    }

    if (step === 6) {
      if (!academicCouncilRecognition) {
        setStepError("Please select whether Academic Council recognizes experiential/community problem-solving.");
        return false;
      }
      if (selectedParticipationTypes.length === 0) {
        setStepError("Please select at least one Academic Participation Type.");
        return false;
      }
      return true;
    }

    if (step === 7) {
      if (selectedContributions.length === 0) {
        setStepError("Please select at least one capability your institution can contribute.");
        return false;
      }
      if (selectedPartnershipModels.length === 0) {
        setStepError("Please select at least one Partnership Type.");
        return false;
      }
      return true;
    }

    if (step === 8) {
      // Step 8 is optional external identifiers, but if entered, validate URLs
      if (irinsUrl.trim() && !irinsUrl.startsWith("http")) {
        setStepError("IRINS Profile URL must begin with http:// or https://");
        return false;
      }
      if (repoUrl.trim() && !repoUrl.startsWith("http")) {
        setStepError("Institutional Repository URL must begin with http:// or https://");
        return false;
      }
      return true;
    }

    if (step === 9) {
      if (!aisheDocFile) {
        setStepError("AISHE Registration / Allotment Document (PDF) is required.");
        return false;
      }
      if (!authLetterFile) {
        setStepError("Institutional Authorization Letter (PDF) is required.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 10));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setStepError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==============================================================================
  // FINAL SUBMISSION HANDLER
  // ==============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError("");

    // Verify declarations
    if (
      !decAccurate ||
      !decAuthorized ||
      !decAisheVerify ||
      !decNotAutoApproval ||
      !decContactAgree ||
      !decTermsAgree
    ) {
      setStepError("You must accept all required institutional declarations before submission.");
      return;
    }

    if (!authorizedOfficerName.trim() || !authorizedOfficerDesignation.trim()) {
      setStepError("Authorized Officer Name and Designation are required.");
      return;
    }

    if (!password || password.length < 6) {
      setStepError("Please provide a secure account password (minimum 6 characters).");
      return;
    }

    if (password !== confirmPassword) {
      setStepError("Passwords do not match.");
      return;
    }

    if (!isEmailVerified) {
      setStepError("Institutional Email must be verified with OTP before account creation.");
      return;
    }

    setBusy(true);

    try {
      const client = supabase;
      if (!client) throw new Error("Supabase client is not available.");

      // 1. Sign up Supabase Auth User with Nodal Officer details
      // Note: The BEFORE INSERT trigger on auth.users will automatically set email_confirmed_at = NOW()
      // because an OTP was recently consumed for nodalEmail.trim(). No Supabase confirmation email is sent!
      const { data: authData, error: signupError } = await client.auth.signUp({
        email: nodalEmail.trim(),
        password,
        options: {
          data: {
            display_name: nodalName.trim(),
            account_type: "university",
            organization_type: "University",
            role: "university_admin",
            institution_name: legalName.trim(),
            aishe_code: aisheCode.trim().toUpperCase(),
            phone: nodalMobile.trim(),
            email_verified: true,
          },
        },
      });

      if (signupError) {
        setStepError(signupError.message);
        setBusy(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        throw new Error("Unable to create authenticated user account.");
      }

      // Generate institutional code
      const generatedCode = `UNIV-${new Date().getFullYear()}-${user.id.slice(0, 6).toUpperCase()}`;
      setGeneratedInstitutionId(generatedCode);

      // 2. Insert into public.institutions table
      const { data: instData, error: instError } = await client
        .from("institutions")
        .insert({
          owner_id: user.id,
          institution_code: generatedCode,
          legal_name: legalName.trim(),
          short_name: shortName.trim(),
          aishe_code: aisheCode.trim().toUpperCase(),
          aishe_verification_status: "pending_verification",
          institution_type: institutionType,
          institution_category: institutionCategory,
          ownership,
          establishment_year: parseInt(establishmentYear, 10),
          website: website.trim(),
          institutional_domain: institutionalDomainEmail.split("@")[1] || website.trim(),
          nirf_ranking_band: nirfRankingBand || null,
          naac_status: naacStatus || null,
          naac_grade: naacStatus === "Accredited" ? naacGrade : null,
          nba_accreditation: nbaAccreditation || null,
          ugc_recognition: ugcRecognition === "Yes",
          nodal_officer_name: nodalName.trim(),
          nodal_officer_designation: nodalDesignation.trim(),
          nodal_officer_department: nodalDepartment.trim(),
          nodal_officer_email: nodalEmail.trim(),
          nodal_officer_mobile: nodalMobile.trim(),
          institutional_email_verified: true,
          alternate_contact_name: altContactName.trim() || null,
          alternate_contact_email: altContactEmail.trim() || null,
          alternate_contact_mobile: altContactMobile.trim() || null,
          campus_building: campusBuilding.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || null,
          city: city.trim(),
          district: district.trim(),
          state,
          pincode: pincode.trim(),
          country: "India",
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          academic_departments: selectedDepartments,
          research_domains: selectedDomains,
          research_facilities: detailedFacilities.length > 0 ? detailedFacilities : selectedFacilities,
          field_capability: {
            canConductField,
            fieldRadiusKm: parseInt(fieldRadiusKm, 10) || 50,
            preferredDistricts: preferredDistricts.trim(),
            fieldTeamAvailable,
            transportSupport,
            communityEngagementTeam,
            fieldTestingCapability,
          },
          academic_credit_info: {
            academicCouncilRecognition,
            capstoneCourseCodes: capstoneCourseCodes.filter((c) => c.trim()),
            defaultCreditValue,
            selectedParticipationTypes,
            expectedStudentsPerProject: parseInt(expectedStudentsPerProject, 10) || 4,
            facultyMentorRequired,
            maxConcurrentProjects: parseInt(maxConcurrentProjects, 10) || 10,
          },
          partnership_capabilities: selectedContributions,
          partnership_types: selectedPartnershipModels,
          external_identifiers: {
            irinsUrl: irinsUrl.trim() || null,
            istemRegistration: istemRegistration.trim() || null,
            repoUrl: repoUrl.trim() || null,
            orcid: orcid.trim() || null,
            scopusId: scopusId.trim() || null,
          },
          registration_status: "UNDER_VERIFICATION",
          authorized_by_name: authorizedOfficerName.trim(),
          authorized_by_designation: authorizedOfficerDesignation.trim(),
          declaration_date: declarationDate,
        })
        .select()
        .single();

      if (instError) {
        console.error("Institution profile save error:", instError);
        throw new Error(instError.message || "Failed to persist institution profile.");
      }

      // 3. Upload Verification Documents to private Supabase Storage
      const institutionId = instData.id;

      const uploadDoc = async (file: File, docType: string) => {
        const filePath = `${user.id}/${docType}_${Date.now()}.pdf`;
        const { error: uploadErr } = await client.storage
          .from("institution-documents")
          .upload(filePath, file, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadErr) {
          console.warn(`Warning: file upload failed for ${docType}:`, uploadErr);
        } else {
          // Record document metadata in PostgreSQL
          await client.from("institution_documents").insert({
            institution_id: institutionId,
            owner_id: user.id,
            document_type: docType,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: "application/pdf",
            verification_status: "pending",
          });
        }
      };

      if (aisheDocFile) await uploadDoc(aisheDocFile, "aishe_document");
      if (authLetterFile) await uploadDoc(authLetterFile, "authorization_letter");
      for (const item of optionalDocs) {
        await uploadDoc(item.file, item.type);
      }

      // 4. Mirror into organization_accounts for Samaj Setu matching & challenge queries
      await client.from("organization_accounts").upsert(
        {
          owner_id: user.id,
          name: legalName.trim(),
          organization_type: "University",
          contact_name: nodalName.trim(),
          contact_email: nodalEmail.trim(),
          contact_phone: nodalMobile.trim(),
          district: district.trim(),
          locality: `${city.trim()}, ${state}`,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          expertise: selectedDepartments,
          capabilities: selectedContributions,
          account_status: "under_verification",
          registered_address: `${campusBuilding.trim()}, ${addressLine1.trim()}, ${city.trim()} - ${pincode.trim()}`,
        },
        { onConflict: "owner_id" }
      );

      // 5. Update profiles role to university_admin
      await client
        .from("profiles")
        .update({ role: "university_admin", district: district.trim() })
        .eq("id", user.id);

      setBusy(false);
      setIsSubmitted(true);
    } catch (err: any) {
      setBusy(false);
      setStepError(err?.message || "Failed to submit institutional registration. Please check inputs and retry.");
    }
  };

  // ==============================================================================
  // RENDER STEP CONTENT
  // ==============================================================================
  const renderStep = () => {
    switch (currentStep) {
      // ------------------------------------------------------------------------
      // STEP 1: Institutional Identity
      // ------------------------------------------------------------------------
      case 1:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 1 — Institutional Identity</h2>
              <p className="text-xs text-slate-500">
                Provide legal identification, AISHE code, ownership, and accreditation status.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Institution Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g., Birla Institute of Technology, Mesra"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Short Name / Acronym <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g., BIT Mesra"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AISHE Code <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={aisheCode}
                    onChange={(e) => setAisheCode(e.target.value.toUpperCase())}
                    placeholder="e.g., U-0206 or C-12345"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm uppercase font-mono font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  {aisheCode && (
                    <span className="absolute right-3 top-2.5 text-xs">
                      {validateAisheCode(aisheCode) ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={14} /> Valid format (Pending verification)
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle size={14} /> Invalid format
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Format: Prefix (U, C, S) followed by hyphen and 4 to 6 digits.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={institutionType}
                  onChange={(e) => {
                    setInstitutionType(e.target.value);
                    setInstitutionCategory("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={institutionCategory}
                  onChange={(e) => setInstitutionCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select Category --</option>
                  {(CATEGORIES_BY_TYPE[institutionType] || []).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ownership <span className="text-rose-600">*</span>
                </label>
                <select
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select Ownership --</option>
                  {OWNERSHIP_OPTIONS.map((own) => (
                    <option key={own} value={own}>
                      {own}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year of Establishment <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={establishmentYear}
                  onChange={(e) => setEstablishmentYear(e.target.value)}
                  placeholder="e.g., 1955"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Institution Website <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.bitmesra.ac.in"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Domain Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  value={institutionalDomainEmail}
                  onChange={(e) => setInstitutionalDomainEmail(e.target.value)}
                  placeholder="e.g., registrar@bitmesra.ac.in or nodal@andhrauniversity.edu.in"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Must use the institution's official verified domain where possible.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAllowGenericEmailException(!allowGenericEmailException)}
                    className="text-[11px] text-blue-700 underline font-medium"
                  >
                    {allowGenericEmailException ? "Cancel exception" : "Request email domain exception"}
                  </button>
                </div>
                {allowGenericEmailException && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Reason for non-domain email:
                    </label>
                    <input
                      type="text"
                      value={genericEmailReason}
                      onChange={(e) => setGenericEmailReason(e.target.value)}
                      placeholder="e.g., Institutional domain setup in progress under state technical board"
                      className="w-full rounded-md border border-amber-300 bg-white p-2 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Accreditations & Recognitions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIRF Ranking Band (Optional)
                </label>
                <select
                  value={nirfRankingBand}
                  onChange={(e) => setNirfRankingBand(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select NIRF Band --</option>
                  {NIRF_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NAAC Accreditation Status (Optional)
                </label>
                <select
                  value={naacStatus}
                  onChange={(e) => setNaacStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select NAAC Status --</option>
                  {NAAC_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {naacStatus === "Accredited" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NAAC Grade
                  </label>
                  <select
                    value={naacGrade}
                    onChange={(e) => setNaacGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="">-- Select Grade --</option>
                    {NAAC_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NBA Accreditation (Optional)
                </label>
                <select
                  value={nbaAccreditation}
                  onChange={(e) => setNbaAccreditation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UGC / Statutory Recognition Status <span className="text-rose-600">*</span>
                </label>
                <select
                  value={ugcRecognition}
                  onChange={(e) => setUgcRecognition(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select Status --</option>
                  <option value="Yes">Yes (Recognized)</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 2: Primary Nodal Officer & OTP
      // ------------------------------------------------------------------------
      case 2:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 2 — Primary Nodal Officer & Email Verification
              </h2>
              <p className="text-xs text-slate-500">
                Designate the institutional authority authorized to coordinate Samaj Setu challenges.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nodal Officer Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nodalName}
                  onChange={(e) => setNodalName(e.target.value)}
                  placeholder="e.g., Dr. Rajesh Kumar Sharma"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Designation <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nodalDesignation}
                  onChange={(e) => setNodalDesignation(e.target.value)}
                  placeholder="e.g., Dean – R&D / Faculty Coordinator"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nodalDepartment}
                  onChange={(e) => setNodalDepartment(e.target.value)}
                  placeholder="e.g., Civil Engineering / Innovation Cell"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={nodalMobile}
                  onChange={(e) => setNodalMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g., 9876543210"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Official Email & OTP Verification Box */}
              <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Official Institutional Email & OTP Verification <span className="text-rose-600">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      We dispatch a cryptographically secure 6-digit OTP via n8n Cloud to verify nodal ownership.
                    </p>
                  </div>
                  {isEmailVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shrink-0">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Email Verified ✓
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

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={nodalEmail}
                    onChange={handleEmailChange}
                    placeholder="e.g., nodal@bitmesra.ac.in"
                    disabled={isEmailVerified}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-slate-100"
                  />
                </div>

                {/* OTP Messages */}
                {otpError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {otpError}
                  </p>
                )}

                {otpSuccessMsg && (
                  <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {otpSuccessMsg}
                  </p>
                )}

                {/* OTP Input Fields */}
                {isOtpSent && !isEmailVerified && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
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
                      <span>Expires strictly in <strong>60 seconds</strong></span>
                      {otpTimer > 0 ? (
                        <span className="text-amber-700 font-mono font-semibold">
                          00:{otpTimer < 10 ? "0" : ""}${otpTimer}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Expired — Click Resend OTP</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Alternate Contact Person */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 mb-2">Alternate Contact Person (Optional)</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <input
                      type="text"
                      value={altContactName}
                      onChange={(e) => setAltContactName(e.target.value)}
                      placeholder="Alternate Contact Name"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={altContactEmail}
                      onChange={(e) => setAltContactEmail(e.target.value)}
                      placeholder="Alternate Email"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={altContactMobile}
                      onChange={(e) => setAltContactMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="Alternate Mobile"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 3: Institutional Address & GIS Location
      // ------------------------------------------------------------------------
      case 3:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 3 — Institutional Address & Campus GIS Location
              </h2>
              <p className="text-xs text-slate-500">
                Pinpoint your campus coordinates for geographical proximity matching with local challenges.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus / Building Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={campusBuilding}
                  onChange={(e) => setCampusBuilding(e.target.value)}
                  placeholder="e.g., Main Academic Campus / South Block"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address Line 1 <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g., Mesra Campus Road"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g., Near Technical Gate"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Town / Village <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Ranchi"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State <span className="text-rose-600">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setDistrict("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">-- Select State / UT --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District <span className="text-rose-600">*</span>
                </label>
                {state && getDistrictsForState(state).length > 0 ? (
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
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
                    disabled={!state}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="">{state ? "-- Select District --" : "-- Select State First --"}</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PIN Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g., 835215"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            {/* MAP SELECTOR */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin size={15} className="text-blue-700" />
                    📍 Select Institution Campus Location
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Search your campus or click & drag the marker on the map to confirm coordinates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMapLocation()}
                    placeholder="Search campus / landmark"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={searchMapLocation}
                    className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    Search
                  </button>
                </div>
              </div>

              {mapStatus && (
                <p className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                  {mapStatus}
                </p>
              )}

              <div
                ref={mapContainerRef}
                className="h-64 w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-inner z-0"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Latitude *</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 23.412345"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Longitude *</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 85.438765"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 4: Academic & Research Capabilities
      // ------------------------------------------------------------------------
      case 4:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 4 — Academic & Research Capabilities
              </h2>
              <p className="text-xs text-slate-500">
                Select your academic departments and specific research domain expertise for challenge matching.
              </p>
            </div>

            {/* Academic Departments */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Academic Departments Active in Research <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                {ACADEMIC_DEPARTMENTS_LIST.map((dept) => {
                  const isChecked = selectedDepartments.includes(dept);
                  return (
                    <label
                      key={dept}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-blue-600 bg-blue-50/80 font-bold text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDepartment(dept)}
                        className="rounded text-blue-700 focus:ring-blue-500"
                      />
                      <span>{dept}</span>
                    </label>
                  );
                })}
              </div>

              {/* Custom Department */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomDept()}
                  placeholder="Add custom department..."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs flex-1 outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomDept}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Research Domains Taxonomy */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Research Domains & Sub-Domains <span className="text-rose-600">*</span>
                </label>
                <div className="relative w-48">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    placeholder="Search capabilities..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {Object.entries(RESEARCH_DOMAINS_TAXONOMY).map(([group, items]) => {
                  const filteredItems = items.filter((item) =>
                    item.toLowerCase().includes(domainSearch.toLowerCase())
                  );
                  if (domainSearch && filteredItems.length === 0) return null;

                  return (
                    <div key={group} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                        {group}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {filteredItems.map((item) => {
                          const isSelected = (selectedDomains[group] || []).includes(item);
                          return (
                            <button
                              type="button"
                              key={item}
                              onClick={() => toggleDomainItem(group, item)}
                              className={`flex items-center justify-between p-2 rounded-lg text-left text-xs border transition-all ${
                                isSelected
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                              }`}
                            >
                              <span>{item}</span>
                              {isSelected && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 5: Research Infrastructure & Field Capability
      // ------------------------------------------------------------------------
      case 5:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 5 — Research Infrastructure & Field Capability
              </h2>
              <p className="text-xs text-slate-500">
                Document laboratory facilities, major equipment, and field survey deployment radius.
              </p>
            </div>

            {/* Research Facilities Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Laboratories & Testing Facilities <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RESEARCH_FACILITIES_PRESETS.map((fac) => {
                  const isChecked = selectedFacilities.includes(fac);
                  return (
                    <label
                      key={fac}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-blue-600 bg-blue-50 font-bold text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedFacilities((prev) =>
                            prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac]
                          );
                        }}
                        className="rounded text-blue-700 focus:ring-blue-500"
                      />
                      <span>{fac}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Detailed Facility Records */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">
                Add Specific Facility / Equipment Records (Optional)
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={newFacName}
                  onChange={(e) => setNewFacName(e.target.value)}
                  placeholder="Facility / Equipment Name *"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none"
                />
                <input
                  type="text"
                  value={newFacCap}
                  onChange={(e) => setNewFacCap(e.target.value)}
                  placeholder="Testing Capacity (e.g. 50 samples/day)"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none"
                />
                <input
                  type="text"
                  value={newFacDesc}
                  onChange={(e) => setNewFacDesc(e.target.value)}
                  placeholder="Short description / specs"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-xs sm:col-span-2 outline-none"
                />
                <input
                  type="text"
                  value={newFacAvail}
                  onChange={(e) => setNewFacAvail(e.target.value)}
                  placeholder="Availability (e.g. Mon-Fri 9am-5pm)"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none"
                />
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={newFacCollab}
                    onChange={(e) => setNewFacCollab(e.target.checked)}
                    className="rounded text-blue-700"
                  />
                  <span>External Civic Collaboration Allowed</span>
                </label>
              </div>
              <button
                type="button"
                onClick={addFacilityRecord}
                className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
              >
                + Add Facility
              </button>

              {detailedFacilities.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  {detailedFacilities.map((fac, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <div>
                        <strong className="text-slate-800">{fac.name}</strong>
                        {fac.capacity && <span className="text-slate-500 ml-2">({fac.capacity})</span>}
                        {fac.description && <p className="text-[11px] text-slate-600">{fac.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFacilityRecord(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1"
                        title="Remove facility"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Deployment Capabilities */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">Field Deployment Capabilities</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-700 font-semibold">
                  Can your institution conduct on-ground field projects?
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="fieldProjects"
                      checked={canConductField}
                      onChange={() => setCanConductField(true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="fieldProjects"
                      checked={!canConductField}
                      onChange={() => setCanConductField(false)}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {canConductField && (
                <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Maximum Field Radius (km)
                    </label>
                    <input
                      type="number"
                      value={fieldRadiusKm}
                      onChange={(e) => setFieldRadiusKm(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Districts for Deployment
                    </label>
                    <input
                      type="text"
                      value={preferredDistricts}
                      onChange={(e) => setPreferredDistricts(e.target.value)}
                      placeholder="e.g. Visakhapatnam, Vizianagaram"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={fieldTeamAvailable}
                        onChange={(e) => setFieldTeamAvailable(e.target.checked)}
                      />
                      <span>Dedicated Field Team Available</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={transportSupport}
                        onChange={(e) => setTransportSupport(e.target.checked)}
                      />
                      <span>Institutional Transport Available</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={communityEngagementTeam}
                        onChange={(e) => setCommunityEngagementTeam(e.target.checked)}
                      />
                      <span>Community Engagement Team Available</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={fieldTestingCapability}
                        onChange={(e) => setFieldTestingCapability(e.target.checked)}
                      />
                      <span>Mobile / Field Testing Capability</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 6: NEP / Academic Credit & Student Participation
      // ------------------------------------------------------------------------
      case 6:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 6 — NEP 2020 / Academic Credit Recognition
              </h2>
              <p className="text-xs text-slate-500">
                Specify experiential learning credit frameworks under NEP guidelines.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Does your institution recognize experiential/community problem-solving as credit-bearing academic work? <span className="text-rose-600">*</span>
                </label>
                <select
                  value={academicCouncilRecognition}
                  onChange={(e) => setAcademicCouncilRecognition(e.target.value)}
                  className="w-full sm:w-80 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 outline-none"
                >
                  <option value="">-- Select Status --</option>
                  <option value="Yes">Yes (Recognized by Academic Council)</option>
                  <option value="Under Consideration">Under Consideration / Pilot Phase</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Credit Value Recognized
                </label>
                <div className="flex items-center gap-4">
                  {["2 Credits", "4 Credits", "6 Credits"].map((cred) => (
                    <label key={cred} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="creditVal"
                        checked={defaultCreditValue === cred}
                        onChange={() => setDefaultCreditValue(cred)}
                      />
                      <span>{cred}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Capstone Course Codes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable Capstone / Course Codes (Optional)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  e.g., CVP401 — Major Project (Community Innovation), ENV402 — Community Field Project
                </p>
                <div className="space-y-2">
                  {capstoneCourseCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => updateCourseCode(idx, e.target.value)}
                        placeholder="e.g. CVP401 — Community Field Project"
                        className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none"
                      />
                      {capstoneCourseCodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCourseCode(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCourseCode}
                    className="text-xs text-blue-700 font-bold hover:underline"
                  >
                    + Add another course code
                  </button>
                </div>
              </div>

              {/* Academic Participation Types */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Academic Participation Formats Supported <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACADEMIC_PARTICIPATION_TYPES.map((type) => {
                    const isChecked = selectedParticipationTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "border-blue-600 bg-blue-50 font-bold text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedParticipationTypes((prev) =>
                              prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                            );
                          }}
                          className="rounded text-blue-700"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Students per Team
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={expectedStudentsPerProject}
                    onChange={(e) => setExpectedStudentsPerProject(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Faculty Mentor Required?
                  </label>
                  <select
                    value={facultyMentorRequired ? "Yes" : "No"}
                    onChange={(e) => setFacultyMentorRequired(e.target.value === "Yes")}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  >
                    <option value="Yes">Yes (Mandatory)</option>
                    <option value="No">No (Optional)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Concurrent Projects
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxConcurrentProjects}
                    onChange={(e) => setMaxConcurrentProjects(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 7: Partnership Capabilities
      // ------------------------------------------------------------------------
      case 7:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 7 — Partnership Capabilities & Collaboration Models
              </h2>
              <p className="text-xs text-slate-500">
                What capabilities can your institution contribute to civic challenges?
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Contribution Offerings <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PARTNERSHIP_CONTRIBUTIONS.map((contrib) => {
                  const isChecked = selectedContributions.includes(contrib);
                  return (
                    <label
                      key={contrib}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-blue-600 bg-blue-50 font-bold text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedContributions((prev) =>
                            prev.includes(contrib) ? prev.filter((c) => c !== contrib) : [...prev, contrib]
                          );
                        }}
                        className="rounded text-blue-700"
                      />
                      <span>{contrib}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Target Partnership Frameworks <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PARTNERSHIP_MODELS.map((model) => {
                  const isChecked = selectedPartnershipModels.includes(model);
                  return (
                    <label
                      key={model}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedPartnershipModels((prev) =>
                            prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
                          );
                        }}
                        className="rounded text-emerald-700"
                      />
                      <span>{model}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 8: External Identifiers
      // ------------------------------------------------------------------------
      case 8:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 8 — External Research Identifiers (Optional)
              </h2>
              <p className="text-xs text-slate-500">
                Connect external research repositories and researcher identifiers for enhanced verification.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IRINS Profile URL / ID
                </label>
                <input
                  type="url"
                  value={irinsUrl}
                  onChange={(e) => setIrinsUrl(e.target.value)}
                  placeholder="https://example.irins.org/profile/1234"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  I-STEM Institution Registration ID
                </label>
                <input
                  type="text"
                  value={istemRegistration}
                  onChange={(e) => setIstemRegistration(e.target.value)}
                  placeholder="e.g., ISTEM-INST-4921"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Repository URL
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://dspace.example.edu.in"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ORCID of Nodal Officer / Coordinator
                </label>
                <input
                  type="text"
                  value={orcid}
                  onChange={(e) => setOrcid(e.target.value)}
                  placeholder="0000-0002-1825-0097"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scopus Institution ID
                </label>
                <input
                  type="text"
                  value={scopusId}
                  onChange={(e) => setScopusId(e.target.value)}
                  placeholder="e.g., 60021583"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 9: Verification Documents
      // ------------------------------------------------------------------------
      case 9:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 9 — Institutional Verification Documents
              </h2>
              <p className="text-xs text-slate-500">
                Upload official verification letters and registration certificates (PDF format, max 5 MB).
              </p>
            </div>

            <div className="space-y-4">
              {/* Document 1: AISHE Certificate */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <strong className="text-xs font-bold text-slate-800">
                      1. AISHE Registration / Allotment Document <span className="text-rose-600">*</span>
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Official AISHE portal confirmation certificate or allotment letter. (PDF only, max 5 MB).
                    </p>
                  </div>
                  {aisheDocFile && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileUpload(e, setAisheDocFile)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {aisheDocFile && (
                  <p className="text-[11px] text-slate-600 font-mono">
                    {aisheDocFile.name} ({(aisheDocFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Document 2: Institutional Authorization Letter */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <strong className="text-xs font-bold text-slate-800">
                      2. Institutional Authorization Letter <span className="text-rose-600">*</span>
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Signed authorization letter from Registrar, Vice-Chancellor, or Principal designating the Nodal Officer.
                    </p>
                  </div>
                  {authLetterFile && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileUpload(e, setAuthLetterFile)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {authLetterFile && (
                  <p className="text-[11px] text-slate-600 font-mono">
                    {authLetterFile.name} ({(authLetterFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Optional Additional Supporting Documents */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800">Additional Supporting Documents (Optional)</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={optDocType}
                    onChange={(e) => setOptDocType(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  >
                    <option value="ugc_document">UGC Recognition Document</option>
                    <option value="naac_document">NAAC Accreditation Certificate</option>
                    <option value="nirf_document">NIRF Evidence</option>
                    <option value="incubation_document">Incubation / Innovation Centre Document</option>
                    <option value="istem_document">I-STEM Registration Evidence</option>
                    <option value="other">Other Institutional Document</option>
                  </select>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileUpload(e, setOptDocFile)}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-200"
                  />
                </div>
                <button
                  type="button"
                  disabled={!optDocFile}
                  onClick={addOptionalDoc}
                  className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  + Add Document
                </button>

                {optionalDocs.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {optionalDocs.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-700 capitalize">
                          {item.type.replace("_", " ")}: {item.file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOptionalDocs((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // STEP 10: Declaration & Review
      // ------------------------------------------------------------------------
      case 10:
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Step 10 — Review, Institutional Declaration & Submission
              </h2>
              <p className="text-xs text-slate-500">
                Verify all entered data, review official declarations, and set account access credentials.
              </p>
            </div>

            {/* Read-Only Summary with Edit Jumps */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{legalName || "Institution Name"}</h3>
                  <p className="text-slate-500 font-mono">
                    AISHE: {aisheCode || "N/A"} | Type: {institutionType} ({institutionCategory})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Edit Step 1
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-700">Nodal Officer:</p>
                  <p className="text-slate-600">
                    {nodalName} ({nodalDesignation}) — {nodalDepartment}
                  </p>
                  <p className="text-slate-600 font-mono">{nodalEmail}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Campus Address:</p>
                  <p className="text-slate-600">
                    {campusBuilding}, {addressLine1}, {city}, {district}, {state} - {pincode}
                  </p>
                  <p className="text-slate-500 font-mono">
                    GPS: {latitude}, {longitude}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700">Departments:</span>{" "}
                  <span className="text-slate-600">{selectedDepartments.join(", ") || "None"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Edit Capabilities
                </button>
              </div>

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700">Verification Documents:</span>{" "}
                  <span className="text-slate-600">
                    AISHE: {aisheDocFile?.name ? "✓" : "Missing"}, Authorization Letter:{" "}
                    {authLetterFile?.name ? "✓" : "Missing"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(9)}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Edit Documents
                </button>
              </div>
            </div>

            {/* Account Credentials */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Lock size={14} className="text-blue-700" />
                Institutional Account Login Password
              </h3>
              <p className="text-[11px] text-blue-700">
                You will use your verified email (<strong className="font-mono">{nodalEmail}</strong>) and this password to access the University Workspace.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set Password (min 6 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm account password"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mandatory Declarations */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Official Institutional Declarations
              </h3>

              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decAccurate}
                    onChange={(e) => setDecAccurate(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>I confirm that the institutional information provided is accurate and truthful.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decAuthorized}
                    onChange={(e) => setDecAuthorized(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>
                    I confirm that I am authorized by the institution to register and manage its Samaj Setu institutional account.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decAisheVerify}
                    onChange={(e) => setDecAisheVerify(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>
                    I authorize Samaj Setu to verify the institution's AISHE code and institutional information against authoritative sources.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decNotAutoApproval}
                    onChange={(e) => setDecNotAutoApproval(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>
                    I understand that submitting this registration does not constitute automatic institutional approval.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decContactAgree}
                    onChange={(e) => setDecContactAgree(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>I agree that Samaj Setu may contact the institution for verification purposes.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decTermsAgree}
                    onChange={(e) => setDecTermsAgree(e.target.checked)}
                    className="mt-0.5 rounded text-blue-700"
                  />
                  <span>I agree to the Samaj Setu Terms of Use and Privacy Policy.</span>
                </label>
              </div>

              {/* Authorized Signatory Details */}
              <div className="grid gap-3 sm:grid-cols-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Authorized Officer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorizedOfficerName}
                    onChange={(e) => setAuthorizedOfficerName(e.target.value)}
                    placeholder="e.g. Prof. Arvind Sahu"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Officer Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorizedOfficerDesignation}
                    onChange={(e) => setAuthorizedOfficerDesignation(e.target.value)}
                    placeholder="e.g. Registrar / Vice-Chancellor"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    disabled
                    value={declarationDate}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-mono text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {stepError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                {stepError}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrev}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={15} /> Previous
              </button>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {busy ? "Submitting Registration..." : "Submit Institution for Verification"}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  // ==============================================================================
  // SUCCESS CONFIRMATION VIEW
  // ==============================================================================
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8 flex justify-center items-center">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-8 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 shadow-sm">
            <CheckCircle2 size={36} strokeWidth={2.2} />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900 mb-2">
              STATUS: UNDER VERIFICATION
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Registration Submitted ✓</h2>
            <p className="mt-1 text-sm text-slate-600 max-w-lg mx-auto">
              Your institutional registration for <strong>{legalName}</strong> has been received and is queued for verification by Samaj Setu administrators.
            </p>
          </div>

          {/* Verification Status Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Samaj Setu Institution ID:</span>
              <strong className="text-xs font-mono text-blue-700 font-bold">
                {generatedInstitutionId}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>AISHE Information: <strong>Submitted</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Institution Email: <strong>Verified ✓</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Nodal Officer: <strong>Registered</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Documents: <strong>Submitted</strong></span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
              <Info size={16} className="shrink-0" />
              <span>
                <strong>Authorization Status:</strong> Under Review. Our verification desk verifies the AISHE code and authority letter before granting production access.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                close();
                onLogin();
              }}
              className="w-full sm:w-auto rounded-xl bg-blue-700 px-8 py-3 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-md"
            >
              Sign In to Samaj Setu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // MAIN MODAL VIEW
  // ==============================================================================
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 md:p-8 flex justify-center items-start">
      <div className="relative w-full max-w-4xl my-4 sm:my-8 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all text-slate-800">
        {/* Modal Top Header */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-5 sm:px-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-1 flex size-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 shadow-sm shrink-0">
              <GraduationCap size={24} strokeWidth={2} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200 mb-1">
                <Building size={13} className="text-blue-700" />
                Academic & Research Institution Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                University / Institution Registration
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Register your institution, R&D capabilities, facilities, and designated nodal officer for Samaj Setu challenge collaboration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Close registration"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="border-b border-slate-200 bg-white px-6 py-3 sm:px-8 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[700px]">
            {[
              { num: 1, label: "Identity" },
              { num: 2, label: "Nodal Officer" },
              { num: 3, label: "GIS Location" },
              { num: 4, label: "Capabilities" },
              { num: 5, label: "Infrastructure" },
              { num: 6, label: "NEP Credit" },
              { num: 7, label: "Partnership" },
              { num: 8, label: "Identifiers" },
              { num: 9, label: "Documents" },
              { num: 10, label: "Review" },
            ].map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) {
                      setStepError("");
                      setCurrentStep(s.num);
                    }
                  }}
                  disabled={s.num > currentStep}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-blue-700 text-white shadow-sm"
                      : isPast
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`size-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive
                        ? "bg-white text-blue-700 font-bold"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isPast ? "✓" : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {renderStep()}

          {/* Inline Step Error */}
          {currentStep !== 10 && stepError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {stepError}
            </div>
          )}

          {/* Navigation Controls (Steps 1 to 9) */}
          {currentStep !== 10 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ArrowLeft size={15} /> Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-all shadow-md"
              >
                Save & Continue
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
