import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Edit3,
  Home,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  MapPinned,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundPen,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
import "../../styles/profile.css";
import {
  getMyProfile,
  updateMyProfile,
  getMyAddresses,
  createMyAddress,
  updateMyAddress,
  setMyDefaultAddress,
  deleteMyAddress,
} from "../../services/userService";
import { changePassword } from "../../services/authService";

const PROFILE_MENU = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "personal", label: "Personal information", icon: UserRoundPen },
  { id: "addresses", label: "My addresses", icon: MapPinned },
  { id: "security", label: "Security", icon: LockKeyhole },
];

const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  mobile: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
};

function mapAddressFromApi(address) {
  return {
    id: address.id,
    label: address.label,
    fullName: address.recipientName,
    mobile: address.mobile,
    line1: address.houseFlat,
    line2: address.streetArea,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark || "",
    isDefault: Boolean(address.defaultAddress),
  };
}

function mapAddressToApi(address) {
  return {
    label: address.label,
    recipientName: address.fullName.trim(),
    mobile: address.mobile.replace(/\D/g, ""),
    houseFlat: address.line1.trim(),
    streetArea: address.line2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim(),
    landmark: address.landmark.trim() || null,
  };
}

function Profile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [addressNotice, setAddressNotice] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addresses, setAddresses] = useState([]);

  const [serverProfile, setServerProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState("");

  const [profilePreview, setProfilePreview] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
  });

  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);

  useEffect(() => {
    if (!passwordNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPasswordNotice(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [passwordNotice]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch the actual profile belonging to the authenticated customer.
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await getMyProfile();

        if (cancelled) return;

        const loadedProfile = {
          userId: data.userId ?? user?.userId ?? null,
          name: data.name ?? "",
          email: data.email ?? "",
          mobile: data.mobile ?? "",
          address: data.address ?? "",
          role: data.role ?? user?.role ?? "",
        };

        setServerProfile(loadedProfile);

        setProfileForm({
          name: loadedProfile.name,
          email: loadedProfile.email,
          mobile: loadedProfile.mobile,
        });

        setProfileLoadError("");
      } catch (error) {
        if (!cancelled) {
          const message =
            error.response?.status === 401
              ? "Your session may have expired. Please sign in again."
              : error.response?.data?.message ||
                "Unable to load your profile. Please check your connection and try again.";

          setProfileLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      try {
        const data = await getMyAddresses();

        if (!cancelled) {
          setAddresses(data.map(mapAddressFromApi));
        }
      } catch (error) {
        if (!cancelled) {
          setAddressNotice(
            error.response?.data?.message ||
              "Unable to load your saved addresses. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setAddressLoading(false);
        }
      }
    }

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, []);
  // Prefer the latest server response over cached login information.
  const accountProfile = {
    name: serverProfile?.name ?? user?.name ?? "",
    email: serverProfile?.email ?? user?.email ?? "",
    mobile: serverProfile?.mobile ?? user?.mobile ?? "",
    address: serverProfile?.address ?? "",
    role: serverProfile?.role ?? user?.role ?? "",
  };

  // Display the latest server profile, falling back to login context during loading.
  const profile = profilePreview ?? accountProfile;

  const displayName = profile.name.trim() || "QuickMart Customer";
  const firstName = displayName.split(/\s+/)[0];
  const initials = displayName.charAt(0).toUpperCase() || "C";

  const sectionCopy = {
    overview: {
      title: "My Profile",
      description: "Your QuickMart account, all in one place.",
    },
    personal: {
      title: "Personal information",
      description: "Review and manage your basic account details.",
    },
    addresses: {
      title: "My addresses",
      description: "Manage the places where you receive your groceries.",
    },
    security: {
      title: "Security",
      description: "Keep your QuickMart account protected.",
    },
  };

  const changeSection = (section) => {
    setActiveSection(section);
    setProfileNotice("");
    setAddressNotice("");
    setIsEditingProfile(false);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileNotice("");

    const name = profileForm.name.trim();

    if (!name) {
      setProfileNotice("Please enter your full name.");
      return;
    }

    setProfileSaving(true);

    try {
      const updated = await updateMyProfile({ name });

      const updatedProfile = {
        userId: updated.userId ?? serverProfile?.userId ?? user?.userId ?? null,
        name: updated.name ?? name,
        email: updated.email ?? accountProfile.email,
        mobile: updated.mobile ?? accountProfile.mobile,
        address: updated.address ?? accountProfile.address ?? "",
        role: updated.role ?? accountProfile.role ?? user?.role ?? "",
      };

      // Refresh the current profile using the server response.
      setServerProfile(updatedProfile);
      setProfilePreview(null);

      setProfileForm({
        name: updatedProfile.name,
        email: updatedProfile.email,
        mobile: updatedProfile.mobile,
      });

      // Keep the header and stored login details in sync.
      updateUser({
        userId: updatedProfile.userId,
        name: updatedProfile.name,
        email: updatedProfile.email,
        mobile: updatedProfile.mobile,
        role: updatedProfile.role,
      });

      setIsEditingProfile(false);
      setProfileNotice("Your profile has been saved successfully.");
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      setProfileNotice(
        message ||
          (status === 401
            ? "Your session has expired. Please sign in again."
            : status === 400
              ? "Please check your name and try again."
              : "Unable to save your profile. Please try again."),
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddressSubmit = async (event) => {
    event.preventDefault();
    setAddressNotice("");

    const payload = mapAddressToApi(addressForm);
    const isEditing = editingAddressId !== null;

    setAddressSaving(true);

    try {
      const saved = isEditing
        ? await updateMyAddress(editingAddressId, payload)
        : await createMyAddress(payload);

      const savedAddress = mapAddressFromApi(saved);

      setAddresses((previous) =>
        isEditing
          ? previous.map((address) =>
              address.id === savedAddress.id ? savedAddress : address,
            )
          : [savedAddress, ...previous],
      );

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDRESS);

      setAddressNotice(
        isEditing
          ? "Delivery address updated successfully."
          : "Delivery address saved successfully.",
      );

      // Refresh default flags and ordering from the server.
      try {
        const latest = await getMyAddresses();
        setAddresses(latest.map(mapAddressFromApi));
      } catch {
        // Keep the successful mutation response already displayed.
      }
    } catch (error) {
      setAddressNotice(
        error.response?.data?.message ||
          "Unable to save the address. Please check the details and try again.",
      );
    } finally {
      setAddressSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({
        type: "error",
        message: "Please complete all password fields.",
      });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordNotice({
        type: "error",
        message: "Your new password must contain 8 to 72 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({
        type: "error",
        message: "The new password and confirmation do not match.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordNotice({
        type: "error",
        message: "Choose a new password different from your current password.",
      });
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowChangePasswordForm(false);

      setPasswordNotice({
        type: "success",
        message: response?.message || "Password changed successfully.",
      });
    } catch (error) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      const backendMessage =
        typeof responseData?.message === "string" && responseData.message.trim()
          ? responseData.message.trim()
          : null;

      const message =
        backendMessage ||
        (status === 401
          ? "Your session may have expired. Please sign in again."
          : status === 400
            ? "Please check your current password and new password."
            : "Unable to change your password. Please try again.");

      setPasswordNotice({
        type: "error",
        message,
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const startEditAddress = (address) => {
    setEditingAddressId(address.id);

    setAddressForm({
      label: address.label,
      fullName: address.fullName,
      mobile: address.mobile,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || "",
    });

    setAddressNotice("");
    setShowAddressForm(true);
  };

  const setDefaultAddress = async (id) => {
    setAddressNotice("");

    try {
      await setMyDefaultAddress(id);

      setAddresses((previous) =>
        previous.map((address) => ({
          ...address,
          isDefault: address.id === id,
        })),
      );

      setAddressNotice("Default delivery address updated successfully.");

      try {
        const latest = await getMyAddresses();
        setAddresses(latest.map(mapAddressFromApi));
      } catch {
        // Retain the locally updated default state.
      }
    } catch (error) {
      setAddressNotice(
        error.response?.data?.message ||
          "Unable to update the default address. Please try again.",
      );
    }
  };

  const removeAddress = async (id) => {
    setAddressNotice("");

    try {
      await deleteMyAddress(id);

      setAddresses((previous) =>
        previous.filter((address) => address.id !== id),
      );

      setAddressNotice("Delivery address removed successfully.");

      try {
        const latest = await getMyAddresses();
        setAddresses(latest.map(mapAddressFromApi));
      } catch {
        // The delete succeeded; retain the filtered list.
      }
    } catch (error) {
      setAddressNotice(
        error.response?.data?.message ||
          "Unable to remove this address. Please try again.",
      );
    }
  };

  const renderOverview = () => (
    <div className="qm-profile-section-stack">
      <section className="qm-profile-welcome-panel">
        <div className="qm-profile-welcome-copy">
          <span className="qm-profile-eyebrow">YOUR QUICKMART ACCOUNT</span>
          <h2>Good to see you, {firstName}!</h2>
          <p>
            Keep your details up to date for a smoother grocery shopping and
            delivery experience.
          </p>
          <div className="qm-profile-welcome-actions">
            <button
              type="button"
              className="qm-profile-button qm-profile-button-light"
              onClick={() => changeSection("personal")}
            >
              Edit personal details <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="qm-profile-text-button"
              onClick={() => changeSection("addresses")}
            >
              Manage addresses
            </button>
          </div>
        </div>
        <div className="qm-profile-welcome-art" aria-hidden="true">
          <div className="qm-profile-art-circle qm-profile-art-circle-one" />
          <div className="qm-profile-art-circle qm-profile-art-circle-two" />
          <div className="qm-profile-art-icon">
            <MapPin size={34} />
          </div>
          <div className="qm-profile-art-leaf">✳</div>
        </div>
      </section>

      <div className="qm-profile-stat-grid">
        <button
          type="button"
          className="qm-profile-stat-card"
          onClick={() => changeSection("personal")}
        >
          <span className="qm-profile-stat-icon qm-profile-icon-green">
            <UserRound size={21} />
          </span>
          <span className="qm-profile-stat-copy">
            <strong>Personal details</strong>
            <small>
              {profile.name ? "Your account details" : "Complete your details"}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="qm-profile-stat-card"
          onClick={() => changeSection("addresses")}
        >
          <span className="qm-profile-stat-icon qm-profile-icon-orange">
            <MapPinned size={21} />
          </span>
          <span className="qm-profile-stat-copy">
            <strong>Delivery addresses</strong>
            <small>
              {addresses.length} saved{" "}
              {addresses.length === 1 ? "address" : "addresses"}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="qm-profile-stat-card"
          onClick={() => navigate("/orders")}
        >
          <span className="qm-profile-stat-icon qm-profile-icon-blue">
            <Package size={21} />
          </span>
          <span className="qm-profile-stat-copy">
            <strong>My orders</strong>
            <small>View your order history</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="qm-profile-overview-grid">
        <section className="qm-profile-card">
          <div className="qm-profile-card-heading">
            <div>
              <span className="qm-profile-card-kicker">ACCOUNT DETAILS</span>
              <h3>Personal information</h3>
            </div>
            <button
              type="button"
              className="qm-profile-icon-button"
              aria-label="Edit personal information"
              onClick={() => {
                setProfileForm(profile);
                setIsEditingProfile(true);
                setActiveSection("personal");
              }}
            >
              <Edit3 size={17} />
            </button>
          </div>
          <div className="qm-profile-detail-list">
            <div className="qm-profile-detail-row">
              <span className="qm-profile-detail-icon">
                <UserRound size={17} />
              </span>
              <span>
                <small>Full name</small>
                <strong>{profile.name || "Not provided"}</strong>
              </span>
            </div>
            <div className="qm-profile-detail-row">
              <span className="qm-profile-detail-icon">
                <Mail size={17} />
              </span>
              <span>
                <small>Email address</small>
                <strong>{profile.email || "Not provided"}</strong>
              </span>
            </div>
            <div className="qm-profile-detail-row">
              <span className="qm-profile-detail-icon">
                <Phone size={17} />
              </span>
              <span>
                <small>Mobile number</small>
                <strong>{profile.mobile || "Not provided"}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="qm-profile-card qm-profile-address-preview">
          <div className="qm-profile-card-heading">
            <div>
              <span className="qm-profile-card-kicker">DELIVERY</span>
              <h3>Saved addresses</h3>
            </div>
            <button
              type="button"
              className="qm-profile-icon-button"
              aria-label="Manage addresses"
              onClick={() => changeSection("addresses")}
            >
              <Plus size={19} />
            </button>
          </div>
          {addresses.length ? (
            <div className="qm-profile-mini-address">
              <span className="qm-profile-address-type">
                <MapPin size={15} /> {addresses[0].label}
              </span>
              <strong>{addresses[0].fullName}</strong>
              <p>
                {addresses[0].line1}, {addresses[0].city} {addresses[0].pincode}
              </p>
              <button
                type="button"
                className="qm-profile-inline-link"
                onClick={() => changeSection("addresses")}
              >
                Manage all addresses <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="qm-profile-empty-mini">
              <span className="qm-profile-empty-icon">
                <MapPin size={22} />
              </span>
              <strong>No delivery addresses yet</strong>
              <p>Add your home or work address for a quicker checkout.</p>
              <button
                type="button"
                className="qm-profile-inline-link"
                onClick={() => changeSection("addresses")}
              >
                Add an address <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="qm-profile-security-tip">
        <span className="qm-profile-tip-icon">
          <ShieldCheck size={21} />
        </span>
        <div>
          <strong>Your account matters</strong>
          <p>
            Keep your contact details current and use a strong, unique password
            for your account.
          </p>
        </div>
        <button
          type="button"
          className="qm-profile-inline-link"
          onClick={() => changeSection("security")}
        >
          Security settings <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );

  const renderPersonalInformation = () => (
    <section className="qm-profile-card qm-profile-main-card">
      <div className="qm-profile-card-heading qm-profile-card-heading-wide">
        <div>
          <span className="qm-profile-card-kicker">YOUR DETAILS</span>
          <h3>
            {isEditingProfile
              ? "Edit personal information"
              : "Personal information"}
          </h3>
          <p className="qm-profile-card-description">
            These details help us identify your account and keep you updated.
          </p>
        </div>
        {!isEditingProfile && (
          <button
            type="button"
            className="qm-profile-button qm-profile-button-outline"
            onClick={() => {
              setProfileForm(profile);
              setIsEditingProfile(true);
            }}
          >
            <Edit3 size={16} /> Edit details
          </button>
        )}
      </div>

      {profileNotice && (
        <div className="qm-profile-notice" role="status">
          <BadgeCheck size={18} />
          {profileNotice}
        </div>
      )}
      {isEditingProfile ? (
        <form className="qm-profile-form" onSubmit={handleProfileSubmit}>
          <div className="qm-profile-form-grid">
            <label className="qm-profile-field">
              <span>Full name</span>
              <div className="qm-profile-input-wrap">
                <UserRound size={17} />
                <input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  maxLength={100}
                  required
                  autoComplete="name"
                  placeholder="Enter your full name"
                />
              </div>
            </label>
            <label className="qm-profile-field">
              <span>Email address</span>
              <div className="qm-profile-input-wrap">
                <Mail size={17} />
                <input
                  value={profileForm.email}
                  type="email"
                  readOnly
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                <span
                  className="qm-profile-field-lock"
                  title="Email changes need verification"
                >
                  <LockKeyhole size={14} />
                </span>
              </div>
              <small>
                Email changes should be verified before being saved to your
                account.
              </small>
            </label>
            <label className="qm-profile-field">
              <span>Mobile number</span>
              <div className="qm-profile-input-wrap">
                <Phone size={17} />
                <input
                  value={profileForm.mobile}
                  type="tel"
                  readOnly
                  autoComplete="tel"
                  placeholder="Enter mobile number"
                />
              </div>
              <small>
                Mobile number changes must be checked for duplicates.
              </small>
            </label>
          </div>
          <div className="qm-profile-form-footer">
            <p>
              <ShieldCheck size={16} />
              Only your name can be changed at this time.
            </p>
            <div className="qm-profile-form-actions">
              <button
                type="button"
                className="qm-profile-button qm-profile-button-muted"
                disabled={profileSaving}
                onClick={() => {
                  setProfileForm({
                    name: profile.name,
                    email: profile.email,
                    mobile: profile.mobile,
                  });
                  setIsEditingProfile(false);
                  setProfileNotice("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="qm-profile-button qm-profile-button-primary"
                disabled={profileSaving}
              >
                <Check size={17} />
                {profileSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="qm-profile-personal-list">
          <div className="qm-profile-personal-item">
            <span className="qm-profile-personal-item-icon">
              <UserRound size={19} />
            </span>
            <span>
              <small>Full name</small>
              <strong>{profile.name || "Not provided"}</strong>
            </span>
            <span className="qm-profile-value-state">Account detail</span>
          </div>
          <div className="qm-profile-personal-item">
            <span className="qm-profile-personal-item-icon">
              <Mail size={19} />
            </span>
            <span>
              <small>Email address</small>
              <strong>{profile.email || "Not provided"}</strong>
            </span>
            <span className="qm-profile-value-state">Login email</span>
          </div>
          <div className="qm-profile-personal-item">
            <span className="qm-profile-personal-item-icon">
              <Phone size={19} />
            </span>
            <span>
              <small>Mobile number</small>
              <strong>{profile.mobile || "Not provided"}</strong>
            </span>
            <span className="qm-profile-value-state">Contact number</span>
          </div>
        </div>
      )}
      {!isEditingProfile && (
        <div className="qm-profile-note">
          <CircleHelp size={17} />
          <p>
            Your profile is connected to your QuickMart account. Email and
            mobile changes remain protected until verification is implemented.
          </p>
        </div>
      )}
    </section>
  );

  const renderAddresses = () => (
    <div className="qm-profile-section-stack">
      <div className="qm-profile-address-topline">
        <div className="qm-profile-address-intro">
          <span className="qm-profile-card-kicker">DELIVERY PREFERENCES</span>
          <h3>Where should we deliver?</h3>
          <p>Save home, work, or another location for a smoother checkout.</p>
        </div>
        {!showAddressForm && (
          <button
            type="button"
            className="qm-profile-button qm-profile-button-primary"
            onClick={() => {
              setAddressNotice("");
              setEditingAddressId(null);
              setAddressForm(EMPTY_ADDRESS);
              setShowAddressForm(true);
            }}
          >
            <Plus size={17} /> Add new address
          </button>
        )}
      </div>

      {profile.address && (
        <section className="qm-profile-card qm-profile-main-card">
          <div className="qm-profile-card-heading qm-profile-card-heading-wide">
            <div>
              <span className="qm-profile-card-kicker">
                EXISTING ACCOUNT ADDRESS
              </span>
              <h3>Address from registration</h3>
              <p className="qm-profile-card-description">
                This is the address from your original registration. You can
                manage additional delivery addresses below.
              </p>
            </div>
          </div>

          <p className="qm-profile-address-lines">
            <MapPin size={16} /> {profile.address}
          </p>
        </section>
      )}

      {addressNotice && (
        <div className="qm-profile-notice" role="status">
          <BadgeCheck size={18} />
          {addressNotice}
        </div>
      )}
      <div className="qm-profile-preview-banner" role="status">
        <ShieldCheck size={17} />
        <span>
          Address changes are saved to your QuickMart account after the server
          confirms them.
        </span>
      </div>

      {showAddressForm && (
        <section className="qm-profile-card qm-profile-main-card">
          <div className="qm-profile-card-heading qm-profile-card-heading-wide">
            <div>
              <span className="qm-profile-card-kicker">
                {editingAddressId ? "EDIT SAVED ADDRESS" : "NEW LOCATION"}
              </span>
              <h3>
                {editingAddressId
                  ? "Edit delivery address"
                  : "Add a delivery address"}
              </h3>
              <p className="qm-profile-card-description">
                {editingAddressId
                  ? "Update the delivery details for this saved location."
                  : "Enter the details exactly as they should appear on your delivery."}
              </p>
            </div>
            <button
              type="button"
              className="qm-profile-icon-button"
              aria-label="Close address form"
              disabled={addressSaving}
              onClick={() => {
                setShowAddressForm(false);
                setEditingAddressId(null);
                setAddressForm(EMPTY_ADDRESS);
              }}
            >
              <X size={19} />
            </button>
          </div>
          <form className="qm-profile-form" onSubmit={handleAddressSubmit}>
            <div className="qm-profile-address-label-choice">
              <span className="qm-profile-field-title">Save address as</span>
              <div className="qm-profile-label-options">
                {[
                  { label: "Home", icon: Home },
                  { label: "Work", icon: Building2 },
                  { label: "Other", icon: MapPin },
                ].map(({ label, icon: Icon }) => (
                  <button
                    type="button"
                    key={label}
                    className={`qm-profile-label-option ${addressForm.label === label ? "selected" : ""}`}
                    onClick={() =>
                      setAddressForm((current) => ({ ...current, label }))
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="qm-profile-form-grid">
              <label className="qm-profile-field">
                <span>Recipient full name *</span>
                <input
                  value={addressForm.fullName}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Name of the person receiving the order"
                />
              </label>
              <label className="qm-profile-field">
                <span>Mobile number *</span>
                <input
                  value={addressForm.mobile}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      mobile: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    }))
                  }
                  required
                  minLength={10}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile number"
                />
              </label>
              <label className="qm-profile-field qm-profile-field-full">
                <span>House / flat, building and street *</span>
                <input
                  value={addressForm.line1}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      line1: event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  autoComplete="address-line1"
                  placeholder="Flat / house number, building, street"
                />
              </label>
              <label className="qm-profile-field qm-profile-field-full">
                <span>Area / apartment / locality *</span>
                <input
                  value={addressForm.line2}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      line2: event.target.value,
                    }))
                  }
                  required
                  maxLength={150}
                  autoComplete="address-line2"
                  placeholder="Area, apartment or locality"
                />
              </label>
              <label className="qm-profile-field">
                <span>City *</span>
                <input
                  value={addressForm.city}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  autoComplete="address-level2"
                  placeholder="City"
                />
              </label>
              <label className="qm-profile-field">
                <span>State *</span>
                <input
                  value={addressForm.state}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  autoComplete="address-level1"
                  placeholder="State"
                />
              </label>
              <label className="qm-profile-field">
                <span>PIN code *</span>
                <input
                  value={addressForm.pincode}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      pincode: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    }))
                  }
                  required
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  pattern="[0-9]{6}"
                  placeholder="6-digit PIN code"
                />
              </label>
              <label className="qm-profile-field">
                <span>Landmark</span>
                <input
                  value={addressForm.landmark}
                  onChange={(event) =>
                    setAddressForm((current) => ({
                      ...current,
                      landmark: event.target.value,
                    }))
                  }
                  maxLength={150}
                  placeholder="Nearby landmark (optional)"
                />
              </label>
            </div>
            <div className="qm-profile-form-footer">
              <span className="qm-profile-required-note">
                * Required fields
              </span>
              <div className="qm-profile-form-actions">
                <button
                  type="button"
                  className="qm-profile-button qm-profile-button-muted"
                  disabled={addressSaving}
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                    setAddressForm(EMPTY_ADDRESS);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="qm-profile-button qm-profile-button-primary"
                  disabled={addressSaving}
                >
                  <Check size={17} />
                  {addressSaving
                    ? "Saving..."
                    : editingAddressId
                      ? "Update address"
                      : "Save address"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {addressLoading ? (
        <div className="qm-profile-preview-banner" role="status">
          Loading address list...
        </div>
      ) : addresses.length ? (
        <div className="qm-profile-saved-address-grid">
          {addresses.map((address) => (
            <article
              className={`qm-profile-saved-address ${address.isDefault ? "is-default" : ""}`}
              key={address.id}
            >
              <div className="qm-profile-saved-address-top">
                <span className="qm-profile-address-type">
                  {address.label === "Home" ? (
                    <Home size={15} />
                  ) : address.label === "Work" ? (
                    <Building2 size={15} />
                  ) : (
                    <MapPin size={15} />
                  )}
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="qm-profile-default-badge">
                    <Check size={13} /> Default
                  </span>
                )}
              </div>
              <h4>{address.fullName}</h4>
              <p className="qm-profile-address-mobile">
                <Phone size={14} /> {address.mobile}
              </p>
              <p className="qm-profile-address-lines">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                {address.state} - {address.pincode}
                {address.landmark ? ` (Near ${address.landmark})` : ""}
              </p>
              <div className="qm-profile-address-card-actions">
                <button
                  type="button"
                  className="qm-profile-inline-link"
                  onClick={() => startEditAddress(address)}
                  disabled={addressSaving}
                >
                  <Edit3 size={14} /> Edit
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    className="qm-profile-inline-link"
                    onClick={() => setDefaultAddress(address.id)}
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  className="qm-profile-danger-link"
                  onClick={() => removeAddress(address.id)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !showAddressForm && (
          <section className="qm-profile-card qm-profile-address-empty">
            <div className="qm-profile-address-empty-illustration">
              <MapPinned size={35} />
            </div>
            <h3>No saved addresses yet</h3>
            <p>Add an address to make your next QuickMart checkout easier.</p>
            <button
              type="button"
              className="qm-profile-button qm-profile-button-primary"
              onClick={() => {
                setAddressNotice("");
                setEditingAddressId(null);
                setAddressForm(EMPTY_ADDRESS);
                setShowAddressForm(true);
              }}
            >
              <Plus size={17} /> Add your first address
            </button>
          </section>
        )
      )}
    </div>
  );

  const renderSecurity = () => (
    <div className="qm-profile-section-stack">
      <section className="qm-profile-security-hero">
        <span className="qm-profile-security-hero-icon">
          <ShieldCheck size={31} />
        </span>

        <div>
          <span className="qm-profile-eyebrow">ACCOUNT PROTECTION</span>
          <h3>Your security comes first</h3>
          <p>
            Use a strong password and keep your sign-in details private.
            Security updates are handled by the QuickMart Auth Service.
          </p>
        </div>

        <BadgeCheck className="qm-profile-security-check" size={28} />
      </section>

      {/* Password option */}
      <section className="qm-profile-card qm-profile-security-option">
        <span className="qm-profile-security-option-icon">
          <LockKeyhole size={22} />
        </span>

        <div className="qm-profile-security-option-copy">
          <h4>Password</h4>
          <p>
            Change your password securely after verifying your current password.
          </p>
          <span className="qm-profile-coming-soon">
            Current-password verification enabled
          </span>
        </div>

        <button
          type="button"
          className="qm-profile-button qm-profile-button-primary"
          disabled={passwordSaving}
          onClick={() => {
            setPasswordNotice(null);

            if (showChangePasswordForm) {
              setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }

            setShowChangePasswordForm((prev) => !prev);
          }}
        >
          <LockKeyhole size={16} />
          {showChangePasswordForm ? "Cancel" : "Change password"}
        </button>
      </section>

      {/* Password change success or error message */}
      {passwordNotice && (
        <div
          className={`qm-profile-password-notice ${passwordNotice.type}`}
          role={passwordNotice.type === "error" ? "alert" : "status"}
        >
          {passwordNotice.type === "success" ? (
            <Check size={19} />
          ) : (
            <CircleHelp size={19} />
          )}

          <span>{passwordNotice.message}</span>
        </div>
      )}

      {/* Change password form */}
      {showChangePasswordForm && (
        <section className="qm-profile-card qm-profile-main-card qm-profile-password-card">
          <div className="qm-profile-card-heading qm-profile-card-heading-wide">
            <div>
              <span className="qm-profile-card-kicker">ACCOUNT SECURITY</span>
              <h3>Change your password</h3>
              <p className="qm-profile-card-description">
                Enter your current password, then choose a new password that you
                do not use elsewhere.
              </p>
            </div>

            <span className="qm-profile-security-option-icon">
              <ShieldCheck size={23} />
            </span>
          </div>

          <form className="qm-profile-form" onSubmit={handleChangePassword}>
            <div className="qm-profile-form-grid">
              <label className="qm-profile-field qm-profile-field-full">
                <span>Current password *</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  required
                  placeholder="Enter your current password"
                />
              </label>

              <label className="qm-profile-field">
                <span>New password *</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="At least 8 characters"
                />
              </label>

              <label className="qm-profile-field">
                <span>Confirm new password *</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="Enter the new password again"
                />
              </label>
            </div>

            <div className="qm-profile-form-footer">
              <p>
                <ShieldCheck size={16} />
                Your password is sent through your authenticated API connection
                and is not stored in browser profile storage.
              </p>

              <div className="qm-profile-form-actions">
                <button
                  type="button"
                  className="qm-profile-button qm-profile-button-muted"
                  disabled={passwordSaving}
                  onClick={() => {
                    setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setPasswordNotice(null);
                    setShowChangePasswordForm(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="qm-profile-button qm-profile-button-primary"
                  disabled={passwordSaving}
                >
                  <LockKeyhole size={16} />
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Login email */}
      <section className="qm-profile-card qm-profile-security-option">
        <span className="qm-profile-security-option-icon">
          <Mail size={22} />
        </span>

        <div className="qm-profile-security-option-copy">
          <h4>Login email</h4>
          <p>{profile.email || "No email available"}</p>
          <span className="qm-profile-coming-soon">
            Email changes require verification
          </span>
        </div>

        <span className="qm-profile-readonly-chip">
          <LockKeyhole size={13} />
          Protected
        </span>
      </section>

      {/* Security information */}
      <div className="qm-profile-note">
        <CircleHelp size={17} />
        <p>
          Password changes are handled by the QuickMart Auth Service after
          current-password verification. Login email changes require separate
          verification.
        </p>
      </div>
    </div>
  );

  return (
    <div className="qm-page qm-profile-page">
      <QuickMartHeader />
      <main className="qm-profile-main">
        <div className="qm-profile-breadcrumb">
          <button type="button" onClick={() => navigate("/home")}>
            Home
          </button>
          <ChevronRight size={14} />
          <span>My Profile</span>
        </div>
        <div className="qm-profile-page-heading">
          <div>
            <span className="qm-profile-eyebrow">QUICKMART ACCOUNT CENTER</span>
            <h1>{sectionCopy[activeSection].title}</h1>
            <p>{sectionCopy[activeSection].description}</p>
          </div>
          <div className="qm-profile-private-pill">
            <ShieldCheck size={16} /> Private &amp; secure
          </div>
        </div>

        {profileLoading && (
          <div className="qm-profile-preview-banner" role="status">
            Loading your QuickMart account details...
          </div>
        )}

        {profileLoadError && (
          <div className="qm-profile-preview-banner" role="alert">
            {profileLoadError}
          </div>
        )}

        <div className="qm-profile-layout">
          <aside className="qm-profile-sidebar">
            <div className="qm-profile-sidebar-user">
              <div className="qm-profile-avatar">{initials}</div>
              <div className="qm-profile-sidebar-user-copy">
                <strong>{displayName}</strong>
                <span>{profile.email || "QuickMart customer"}</span>
              </div>
              <span className="qm-profile-member-check">
                <Check size={13} />
              </span>
            </div>
            <div className="qm-profile-sidebar-label">ACCOUNT MENU</div>
            <nav
              className="qm-profile-sidebar-nav"
              aria-label="Profile sections"
            >
              {PROFILE_MENU.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={`qm-profile-nav-item ${activeSection === id ? "active" : ""}`}
                  onClick={() => changeSection(id)}
                  aria-current={activeSection === id ? "page" : undefined}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  <ChevronRight className="qm-profile-nav-chevron" size={16} />
                </button>
              ))}
              <button
                type="button"
                className="qm-profile-nav-item"
                onClick={() => navigate("/orders")}
              >
                <ClipboardList size={19} />
                <span>My orders</span>
                <ChevronRight className="qm-profile-nav-chevron" size={16} />
              </button>
            </nav>
            <div className="qm-profile-sidebar-help">
              <span>
                <CircleHelp size={19} />
              </span>
              <div>
                <strong>Need help?</strong>
                <p>We're here to help with your QuickMart account.</p>
              </div>
              <ArrowRight size={16} />
            </div>
          </aside>

          <div className="qm-profile-panel" key={activeSection}>
            {activeSection === "overview" && renderOverview()}
            {activeSection === "personal" && renderPersonalInformation()}
            {activeSection === "addresses" && renderAddresses()}
            {activeSection === "security" && renderSecurity()}
          </div>
        </div>
        <div className="qm-profile-footer-note">
          <span>QuickMart</span>
          <span>Fresh groceries. A simpler day.</span>
        </div>
      </main>
    </div>
  );
}

export default Profile;
