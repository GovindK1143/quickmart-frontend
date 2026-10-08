import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, ShoppingBasket } from "lucide-react";
import { useAuth } from "../../context/useAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.username.trim() || !formData.password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login(
        formData.username.trim(),
        formData.password,
      );

      if (loggedInUser.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        const destination = location.state?.from?.pathname || "/home";

        navigate(destination, { replace: true });
      }
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Invalid username or password. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qm-page">
      <main className="login-page">
        <div className="login-background-card">
          <div className="login-brand-panel">
            <div className="login-brand-icon">
              <ShoppingBasket size={42} />
            </div>

            <p className="login-eyebrow">QUICKMART</p>

            <h1>
              Fresh groceries.
              <br />
              Fast delivery.
            </h1>

            <p>
              Shop your everyday essentials at great prices and get them
              delivered to your doorstep.
            </p>

            <div className="login-feature">
              <span>✓</span>
              <span>Quality products</span>
            </div>

            <div className="login-feature">
              <span>✓</span>
              <span>Fast delivery</span>
            </div>

            <div className="login-feature">
              <span>✓</span>
              <span>Easy shopping</span>
            </div>
          </div>

          <div className="login-card">
            <div className="login-header">
              <p className="login-small-title">WELCOME BACK</p>
              <h2>Sign in to QuickMart</h2>
              <p>Continue shopping from where you left off.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Email or Mobile</label>

                <div className="login-input-wrapper">
                  <Mail size={19} />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter email or mobile"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>

                <div className="login-input-wrapper">
                  <LockKeyhole size={19} />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="login-footer">
              <span>Don't have an account?</span>

              <button
                type="button"
                className="register-link"
                onClick={() => navigate("/register")}
              >
                Create an account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
