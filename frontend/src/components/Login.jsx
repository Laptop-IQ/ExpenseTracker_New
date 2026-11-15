import React, { useState } from "react";
import { loginStyles } from "../assets/dummyStyles";
import { Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch profile if token exists
  const fetchProfile = async (token) => {
    if (!token) return null;
    const res = await axios.get(`${API_BASE}/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };

  // Demo account: server creates a private sandbox with sample data.
  // Everything the guest changes is thrown away at logout.
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/user/guest`, null, {
        timeout: 60000,
      });

      const { token, user: guestProfile } = res.data;

      // remember = true -> token in localStorage, which every page reads.
      // The sandbox is deleted on logout / expiry anyway.
      if (typeof onLogin === "function") {
        onLogin({ ...guestProfile, isGuest: true }, true, token);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Guest login error:", err?.response || err);
      setError(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED"
            ? "Server is waking up, please try again in a moment."
            : "Could not start the demo. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${API_BASE}/user/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } },
      );

      const { token, user: userProfile } = res.data;
      let profile = userProfile || (await fetchProfile(token));

      if (!profile) profile = { email }; // fallback

      if (typeof onLogin === "function") {
        onLogin(profile, rememberMe, token);
      } else {
        navigate("/");
      }

      setPassword("");
    } catch (err) {
      console.error("Login error:", err?.response || err);
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.data ? JSON.stringify(err.response.data) : null) ||
        err.message ||
        "Login failed";
      setError(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={loginStyles.pageContainer}>
      <div className={loginStyles.cardContainer}>
        <div className={loginStyles.header}>
          <div className={loginStyles.avatar}>
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className={loginStyles.headerTitle}>Welcome Back</h1>
          <p className={loginStyles.headerSubtitle}>
            Sign in to your ExpenseTracker account
          </p>
        </div>

        <div className={loginStyles.formContainer}>
          {error && (
            <div className={loginStyles.errorContainer}>
              <div className={loginStyles.errorIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className={loginStyles.errorText}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className={loginStyles.label}>
                Email Address
              </label>
              <div className={loginStyles.inputContainer}>
                <div className={loginStyles.inputIcon}>
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={loginStyles.input}
                  placeholder="your@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="password" className={loginStyles.label}>
                Password
              </label>
              <div className={loginStyles.inputContainer}>
                <div className={loginStyles.inputIcon}>
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={loginStyles.passwordInput}
                  placeholder="💠💠💠💠💠💠"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={loginStyles.passwordToggle}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Forgot Password Link */}
              <div className="text-right mt-2">
                <Link
                  to="/forgotpassword"
                  className="text-blue-600 text-sm hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <div className={loginStyles.checkboxContainer}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={loginStyles.checkbox}
              />
              <label htmlFor="remember" className={loginStyles.checkboxLabel}>
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`${loginStyles.button} ${isLoading ? loginStyles.buttonDisabled : ""}`}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4">
            <div className="flex items-center gap-3 my-3 text-xs text-gray-400">
              <span className="flex-1 h-px bg-gray-200" />
              or
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            >
              {isLoading ? "Please wait..." : "Try Demo (Continue as Guest)"}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Explore with sample data. Change anything - it all resets when you
              log out.
            </p>
          </div>

          <div className={loginStyles.signUpContainer}>
            <p className={loginStyles.signUpText}>
              Don't have an account?{" "}
              <Link to="/signup" className={loginStyles.signUpLink}>
                Create One
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
