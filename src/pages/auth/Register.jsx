import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBasket,
  UserRound,
  Truck,
  X,
} from "lucide-react";

import QuickMartHeader from "../../components/layout/QuickMartHeader";
import { registerUser } from "../../services/authService";
import "../../styles/register.css";

const INITIAL_FORM = {
  name: "",
  email: "",
  mobile: "",
  address: "",
  password: "",
  confirmPassword: "",
};

function getRegistrationError(error) {
  const response = error.response?.data;
  const fieldErrors = response?.errors;

  if (fieldErrors && typeof fieldErrors === "object") {
    const firstError = Object.values(fieldErrors)[0];

    if (firstError) {
      return firstError;
    }
  }

  return (
    response?.message ||
    response?.error ||
    error.message ||
    "Unable to create your account. Please try again."
  );
}

function Register({ isModal = false, onClose }) {
  const location = useLocation();

  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdUser, setCreatedUser] = useState(null);

  // Keep the original page behind the authentication popup.
  // This state is passed between Registration and Login.
  const loginLinkState =
    isModal && location.state?.backgroundLocation
      ? {
          backgroundLocation: location.state.backgroundLocation,
          authModalTransition: true,
        }
      : undefined;

  // Give the registration popup the same keyboard and scroll
  // behavior as the Login popup.
  useEffect(() => {
    if (!isModal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModal, onClose]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setErrorMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        address: form.address.trim() || null,
        password: form.password,
      });

      setCreatedUser(response);
    } catch (error) {
      setErrorMessage(getRegistrationError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // The form content is shared by the full registration page
  // and the registration popup.
  const registrationContent = (
    <main className="register-page">
      <div className="register-card">
        <aside className="register-brand-panel">
          <Link to="/home" className="register-brand-logo">
            <ShoppingBasket size={29} strokeWidth={2.2} />
            <span>QuickMart</span>
          </Link>

          <div className="register-brand-copy">
            <span className="register-brand-eyebrow">
              FRESHNESS AT YOUR DOORSTEP
            </span>

            <h1>
              Good food.
              <br />
              Great days.
              <br />
              <span>Made easy.</span>
            </h1>

            <p>
              Create your QuickMart account and enjoy a simpler, fresher grocery
              shopping experience.
            </p>
          </div>

          <div className="register-benefit">
            <span className="register-benefit-icon">
              <Truck size={22} />
            </span>
            <span>
              <strong>Fast delivery</strong>
              <small>Everyday essentials, made easy.</small>
            </span>
          </div>

          <div className="register-benefit">
            <span className="register-benefit-icon">
              <Leaf size={22} />
            </span>
            <span>
              <strong>Fresh choices</strong>
              <small>Your favourites in one place.</small>
            </span>
          </div>

          <div className="register-brand-footer">
            <ShieldCheck size={17} />
            Your account. Your shopping. Your QuickMart.
          </div>
        </aside>

        <section className="register-form-panel">
          <Link to="/home" className="register-back-link">
            <ArrowLeft size={17} />
            Back to home
          </Link>

          {createdUser ? (
            <div className="register-success" role="status">
              <div className="register-success-icon">
                <CheckCircle2 size={43} />
              </div>

              <p className="register-eyebrow">WELCOME TO QUICKMART</p>

              <h2 id="register-title">
                Account created
                <br />
                successfully!
              </h2>

              <p className="register-success-copy">
                Welcome, <strong>{createdUser.name || form.name.trim()}</strong>
                . Your account is ready. Sign in with your email address or
                mobile number and your password.
              </p>

              <Link
                to="/login"
                state={loginLinkState}
                className="register-submit"
              >
                Continue to Login
              </Link>

              <p className="register-switch-copy">
                Ready to shop? <Link to="/home">Explore QuickMart</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="register-heading">
                <p className="register-eyebrow">
                  YOUR QUICKMART JOURNEY STARTS HERE
                </p>

                <h2 id="register-title">Create your account</h2>

                <p>Join us for a fresher, easier way to shop.</p>
              </div>

              {errorMessage && (
                <div className="register-alert" role="alert">
                  {errorMessage}
                </div>
              )}

              <form className="register-form" onSubmit={handleSubmit}>
                <div className="register-form-grid">
                  <div className="register-field">
                    <label htmlFor="register-name">Full name</label>

                    <div className="register-input-wrap">
                      <UserRound className="register-input-icon" size={19} />
                      <input
                        id="register-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        maxLength={100}
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-email">Email address</label>

                    <div className="register-input-wrap">
                      <Mail className="register-input-icon" size={19} />
                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        maxLength={150}
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-mobile">Mobile number</label>

                    <div className="register-input-wrap">
                      <Phone className="register-input-icon" size={19} />
                      <input
                        id="register-mobile"
                        name="mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="10-digit mobile number"
                        value={form.mobile}
                        onChange={(event) =>
                          updateField(
                            "mobile",
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        pattern="[6-9][0-9]{9}"
                        title="Enter a valid 10-digit Indian mobile number"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-address">
                      Address{" "}
                      <span className="register-optional">Optional</span>
                    </label>

                    <div className="register-input-wrap">
                      <MapPin className="register-input-icon" size={19} />
                      <input
                        id="register-address"
                        name="address"
                        type="text"
                        autoComplete="street-address"
                        placeholder="House no., street, locality"
                        value={form.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                        maxLength={255}
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-password">Password</label>

                    <div className="register-input-wrap">
                      <LockKeyhole className="register-input-icon" size={19} />
                      <input
                        id="register-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        value={form.password}
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                        minLength={8}
                        maxLength={100}
                        required
                      />

                      <button
                        className="register-password-toggle"
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((previous) => !previous)}
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    <small className="register-field-hint">
                      Use at least 8 characters.
                    </small>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-confirm-password">
                      Confirm password
                    </label>

                    <div className="register-input-wrap">
                      <ShieldCheck className="register-input-icon" size={19} />
                      <input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={(event) =>
                          updateField("confirmPassword", event.target.value)
                        }
                        minLength={8}
                        maxLength={100}
                        required
                      />

                      <button
                        className="register-password-toggle"
                        type="button"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                        onClick={() =>
                          setShowConfirmPassword((previous) => !previous)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="register-privacy-note">
                  Your password is sent to QuickMart's authentication service
                  and should never be shared.
                </p>

                <button
                  type="submit"
                  className="register-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={19} className="register-spinner" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowLeft size={19} className="register-submit-arrow" />
                    </>
                  )}
                </button>
              </form>

              <p className="register-switch-copy">
                Already have an account?{" "}
                <Link to="/login" state={loginLinkState}>
                  Log in
                </Link>
              </p>

              <p className="register-bottom-note">
                <ShieldCheck size={16} />A secure account for your everyday
                essentials.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );

  // Popup mode: the shared header and current page remain behind it.
  if (isModal) {
    return (
      <div
        className="login-modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div
          className="login-modal-dialog register-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-title"
        >
          <button
            type="button"
            className="login-modal-close"
            onClick={onClose}
            aria-label="Close registration window"
            title="Close"
          >
            <X size={23} />
          </button>

          <div className="login-modal-content register-modal-content">
            {registrationContent}
          </div>
        </div>
      </div>
    );
  }

  // Direct /register visits continue to show the full registration page.
  return (
    <div className="qm-page">
      <QuickMartHeader />
      {registrationContent}
    </div>
  );
}

export default Register;
