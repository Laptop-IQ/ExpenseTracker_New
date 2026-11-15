/* eslint-disable no-unused-vars */
import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import axios from "axios";
import NotificationBar from "./Context/NotificationBar";
import CoinLoader from "./components/common/CoinLoader";

// Route-level code splitting: every screen is its own chunk, so the first
// paint only downloads what the current screen needs.
const loaders = {
  Layout: () => import("./components/Layout"),
  Dashboard: () => import("./pages/Dashboard"),
  Income: () => import("./pages/Income"),
  Expense: () => import("./pages/Expense"),
  Goals: () => import("./pages/Goals"),
  CategoryDetail: () => import("./pages/CategoryDetail"),
  Profile: () => import("./pages/Profile"),
  ContactUs: () => import("./pages/ContactUs"),
  Login: () => import("./components/Login"),
  Signup: () => import("./components/Signup"),
  VerifyOtp: () => import("./components/VerifyOtp"),
  ForgotPassword: () => import("./components/ForgotPassword"),
};

const Layout = lazy(loaders.Layout);
const Dashboard = lazy(loaders.Dashboard);
const Income = lazy(loaders.Income);
const Expense = lazy(loaders.Expense);
const Goals = lazy(loaders.Goals);
const CategoryDetail = lazy(loaders.CategoryDetail);
const Profile = lazy(loaders.Profile);
const ContactUs = lazy(loaders.ContactUs);
const Login = lazy(loaders.Login);
const Signup = lazy(loaders.Signup);
const VerifyOtp = lazy(loaders.VerifyOtp);
const ForgotPassword = lazy(loaders.ForgotPassword);

// Warm the cache for the main screens once the browser is idle after login,
// so moving between pages feels instant.
// Prefetch only the dashboard after the browser is idle. Loading every page
// immediately after login competes with the first render and wastes bandwidth.
const prefetchMainPages = () => {
  const run = () => loaders.Dashboard().catch(() => {});

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
};

// Start downloading the shell + current page chunk right away (in parallel)
// for returning users, instead of waiting for React to render and discover them.
try {
  const hasSession =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (hasSession) {
    const path = window.location.pathname;
    loaders.Layout().catch(() => {});
    if (path === "/" || path === "") loaders.Dashboard().catch(() => {});
    else if (path.startsWith("/income")) loaders.Income().catch(() => {});
    else if (path.startsWith("/expense")) loaders.Expense().catch(() => {});
    else if (path.startsWith("/goals")) loaders.Goals().catch(() => {});
  }
} catch {
  /* storage blocked - ignore */
}

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
    <CoinLoader size={64} />
  </div>
);

const API_BASE = import.meta.env.VITE_API_BASE;

// to get transaction from localstorage
const getTransactionsFromStorage = () => {
  try {
    const saved = localStorage.getItem("transactions");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

 // to protect the routes
const ProtectedRoute = ({ user, children }) => {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");
  const hasToken = localToken || sessionToken;

  if (!user || !hasToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto"});
  }, [location.pathname]);
  return null;
};

// Guest logout: delete the server sandbox, wipe every local trace of the demo
// data, then hard-reload so no in-memory state (notifications, caches...)
// can leak into the next session. Next guest starts from the original data.
const endGuestSession = (guestToken) => {
  try {
    if (guestToken && API_BASE) {
      // keepalive lets the request finish even though the page reloads
      fetch(`${API_BASE}/user/guest/end`, {
        method: "POST",
        keepalive: true,
        headers: { Authorization: `Bearer ${guestToken}` },
      }).catch(() => {});
    }
  } catch {
    /* best effort - the sandbox also expires by itself */
  }

  try {
    [localStorage, sessionStorage].forEach((store) => {
      Object.keys(store)
        .filter(
          (k) =>
            k.startsWith("fintrack:") ||
            ["user", "token", "transactions", "notifications", "category_ai_memory"].includes(k),
        )
        .forEach((k) => store.removeItem(k));
    });
  } catch {
    /* storage blocked - ignore */
  }

  window.location.replace("/login");
};

const readStoredAuth = () => {
  try {
    const rawUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    return {
      user: rawUser ? JSON.parse(rawUser) : null,
      token:
        localStorage.getItem("token") || sessionStorage.getItem("token") || null,
    };
  } catch {
    return { user: null, token: null };
  }
};

const App = () => {
  const [initialAuth] = useState(readStoredAuth);
  const [user, setUser] = useState(initialAuth.user);
  const [token, setToken] = useState(initialAuth.token);
  const [transactions, setTransactions] = useState(getTransactionsFromStorage);
  // Only block the screen when a token exists but the profile still has to be
  // fetched. With a stored user the app opens instantly.
  const [isLoading, setIsLoading] = useState(
    !initialAuth.user && !!initialAuth.token,
  );

  const navigate = useNavigate();

    const persistAuth = (userObj, tokenStr, remember = false) => {
      try {
        if (remember) {
          if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
          if (tokenStr) localStorage.setItem("token", tokenStr);
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
        } else {
          if (userObj) sessionStorage.setItem("user", JSON.stringify(userObj));
          if (tokenStr) sessionStorage.setItem("token", tokenStr);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
        setUser(userObj || null);
        setToken(tokenStr || null);
      } catch (err) {
        console.error("persistAuth error:", err);
      }
    };


  const clearAuth = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
    } catch (error) {
      console.error("clearAuth error:", error); // fixed variable name
    }
    setUser(null);
    setToken(null);
  };

  // to update user data both in state and storage
  const updateUserData = (updatedUser) => {
    setUser(updatedUser);

    const localToken = localStorage.getItem("token");
    const sessionToken = sessionStorage.getItem("token");
    
    if(localToken) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }else if (sessionToken) {
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };
// try to load user with token when mounted

useEffect (() => {
  (async() => {
    try {
      const localUserRaw = localStorage.getItem("user");
      const sessionUserRaw = sessionStorage.getItem("user");
      const localToken = localStorage.getItem("token");
      const sessionToken = sessionStorage.getItem("token");

      const storedUser =localUserRaw ? JSON.parse(localUserRaw) : sessionUserRaw ? JSON.parse(sessionUserRaw) : null;
      const storedToken = localToken || sessionToken || null;
      const tokenFromlocal = !!localToken;
      if (storedUser){
        setUser(storedUser);
        setToken(storedToken);
        setIsLoading(false);
        return;
      }
      if(storedToken) {
        try {
           const res = await axios.get(`${API_BASE}/user/me`, {
      headers: { Authorization: `Bearer ${storedToken}` }
           });
           const profile = res.data;
           persistAuth(profile, storedToken, tokenFromlocal)
          
        } catch (fetchErr) {
          console.warn("Could not fetch profile with the stored token:",
            fetchErr
          );
          clearAuth();
        }
      }
    } catch (err) {
      console.error("error bootstrapping auth", err);
    } finally {
      setIsLoading(false);
      try {
        setTransactions(getTransactionsFromStorage());
      } catch (txErr) {
        console.error("Error loading transactions :", txErr)
      }
    }
  })();
}, []);

useEffect(() => {
  try {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  } catch (err) {
    console.error("error saving transactions:", err);
  }
}, [transactions]);

  useEffect(() => {
    if (user) prefetchMainPages();
  }, [user]);

  const handleLogin = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);
    navigate("/");
  };

  
  const handleSignup = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);
    navigate("/");
  };


  const handleLogout = () => {
    const isGuest =
      user?.isGuest || String(user?.email || "").endsWith("@guest.demo.local");

    if (isGuest) {
      endGuestSession(token || localStorage.getItem("token"));
      return;
    }

    clearAuth();
    navigate("/login");
  };

    // transaction helpers
  const addTransaction = (newTransaction) =>
    setTransactions((p) => [newTransaction, ...p]);
  const editTransaction = (id, updatedTransaction) =>
    setTransactions((p) =>
      p.map((t) => (t.id === id ? { ...updatedTransaction, id } : t)),
    );
  const deleteTransaction = (id) =>
    setTransactions((p) => p.filter((t) => t.id !== id));
  const refreshTransactions = () =>
    setTransactions(getTransactionsFromStorage());


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
        <NotificationBar />
        <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/ForgotPassword" element={<ForgotPassword />} />

          <Route
            element={
              <ProtectedRoute user={user}>
                <Layout
                  user={user}
                  onLogout={handleLogout}
                  transactions={transactions}
                  addTransaction={addTransaction}
                  editTransaction={editTransaction}
                  deleteTransaction={deleteTransaction}
                  refreshTransactions={refreshTransactions}
                />
              </ProtectedRoute>
            }
          >
            <Route
              path="/"
              element={<Dashboard />}
              transactions={transactions}
              addTransaction={addTransaction}
              editTransaction={editTransaction}
              deleteTransaction={deleteTransaction}
              refreshTransactions={refreshTransactions}
            />

            <Route
              path="/income"
              element={
                <Income
                  transactions={transactions}
                  addTransaction={addTransaction}
                  editTransaction={editTransaction}
                  deleteTransaction={deleteTransaction}
                  refreshTransactions={refreshTransactions}
                />
              }
            />

            <Route
              path="/expense"
              element={
                <Expense
                  transactions={transactions}
                  addTransaction={addTransaction}
                  editTransaction={editTransaction}
                  deleteTransaction={deleteTransaction}
                  refreshTransactions={refreshTransactions}
                />
              }
            />

            <Route
              path="/profile"
              element={
                <Profile
                  user={user}
                  onUpdateProfile={updateUserData}
                  onLogout={handleLogout}
                />
              }
            />
            <Route path="/ContactUs" element={<ContactUs />} />
            <Route path="/expense/category/:name" element={<CategoryDetail kind="expense" />} />
            <Route path="/income/source/:name" element={<CategoryDetail kind="income" />} />
            <Route path="/goals" element={<Goals />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to={user ? "/" : "/login"} replace />}
          />
        </Routes>
        </Suspense>
    </>
  );
};

export default App;
