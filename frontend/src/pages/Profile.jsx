import React, { memo, useCallback, useState, useEffect } from "react";
import Modal from "react-modal";
import {
  Eye,
  EyeOff,
  User,
  X,
  Lock,
  Camera,
  Trash2,
  Check,
  AlertCircle,
  Shield,
  LogOut,
  Edit3,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cropper from "react-easy-crop";
import DeleteAccount from "../components/DeleteAccount";
import imageCompression from "browser-image-compression";
import { useNotifications } from "../Context/NotificationProvider";

const API_BASE = import.meta.env.VITE_API_BASE;

Modal.setAppElement("#root");

/* ── Dark input style helper ──────────────────────────────────────────────── */
function darkInput(hasError = false, focused = false) {
  return {
    background: hasError
      ? "rgba(239,68,68,0.07)"
      : focused
        ? "#0d1526"
        : "#0a0f1e",
    border: `1px solid ${hasError ? "#ef444450" : focused ? "#7c3aed60" : "#1a2035"}`,
    borderRadius: 12,
    color: "#e2e8f0",
    outline: "none",
    transition: "all 0.2s",
    boxShadow: focused && !hasError ? "0 0 0 3px #7c3aed12" : "none",
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
  };
}

/* ── Password Input ────────────────────────────────────────────────────────── */
const PasswordInput = memo(
  ({ name, label, value, error, showField, onToggle, onChange, disabled }) => {
    const [focused, setFocused] = useState(false);
    return (
      <div>
        <label
          style={{
            display: "block",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showField ? "text" : "password"}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={`Enter ${label.toLowerCase()}`}
            disabled={disabled}
            style={{ ...darkInput(!!error, focused), paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#4a5568",
              display: "flex",
              alignItems: "center",
            }}
          >
            {showField ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && (
          <p style={{ color: "#ef4444", fontSize: 10, marginTop: 4 }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/* ── Profile ───────────────────────────────────────────────────────────────── */
const Profile = ({ onUpdateProfile, onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "", joinDate: "" });
  const [tempUser, setTempUser] = useState({ ...user });
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const getAuthToken = useCallback(() => localStorage.getItem("token"), []);
  const { addNotification, removeNotification } = useNotifications();

  const handleApiRequest = useCallback(
    async (method, endpoint, data = null) => {
      const token = getAuthToken();
      if (!token) {
        navigate("/login");
        return null;
      }
      try {
        setLoading(true);
        const config = {
          method,
          url: `${API_BASE}${endpoint}`,
          headers: { Authorization: `Bearer ${token}` },
        };
        if (data) config.data = data;
        const response = await axios(config);
        return response.data;
      } catch (error) {
        if (error.response?.status === 401) navigate("/login");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken, navigate],
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await handleApiRequest("get", "/user/me");
        if (data) {
          const userData = data.user || data;
          setUser(userData);
          setTempUser(userData);
        }
      } catch {
        addNotification("Failed to load user data");
      }
    };
    fetchUserData();
  }, [handleApiRequest]);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) setUser(savedUser);
  }, []);

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
      if (profileImage) URL.revokeObjectURL(profileImage);
    };
  }, [previewImage, profileImage]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setTempUser((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleProfileUpdate = async () => {
    try {
      const data = await handleApiRequest("put", "/user/profile", {
        name: tempUser.name,
        email: tempUser.email,
      });
      if (data) {
        const updatedUser = data.user || data;
        setUser(updatedUser);
        setTempUser(updatedUser);
        setEditMode(false);
        addNotification("Profile updated successfully");
      }
    } catch {
      addNotification("Failed to update profile");
    }
  };

  const compressImage = async (file) => {
    try {
      return await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
    } catch {
      return file;
    }
  };

  const handleImageChange = async (eOrFile) => {
    const file = eOrFile?.target?.files ? eOrFile.target.files[0] : eOrFile;
    if (!file) return;
    const compressed = await compressImage(file);
    setProfileImage(compressed);
    setPreviewImage(URL.createObjectURL(compressed));
    setEditMode(true);
  };

  const onCropComplete = (_, cap) => setCroppedAreaPixels(cap);

  const getCroppedImg = async (imageSrc, crop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = crop.width;
    canvas.height = crop.height;
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg"),
    );
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!profileImage || !croppedAreaPixels) {
      addNotification("Please select and crop an image first");
      return;
    }
    setLoading(true);
    try {
      const croppedBlob = await getCroppedImg(previewImage, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!uploadPreset || !cloudName)
        throw new Error("Cloudinary config missing");
      formData.append("upload_preset", uploadPreset);
      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        formData,
      );
      const imageUrl = cloudRes.data.secure_url;
      if (!imageUrl) throw new Error("Cloudinary did not return image URL");
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/user/profile`,
        {
          profilePic: imageUrl,
          name: tempUser.name || user.name,
          email: tempUser.email || user.email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      setUser((prev) => ({ ...prev, profilePic: imageUrl }));
      setTempUser((prev) => ({ ...prev, profilePic: imageUrl }));
      setProfileImage(null);
      setPreviewImage("");
      setEditMode(false);
      addNotification("Profile image updated successfully!");
    } catch (err) {
      addNotification("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files[0]);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleCancelImageEdit = () => {
    setPreviewImage("");
    setProfileImage(null);
  };
  const handleCancelEdit = useCallback(() => {
    setTempUser(user);
    setEditMode(false);
  }, [user]);

  const validatePassword = useCallback(() => {
    const errors = {};
    if (!passwordData.current) errors.current = "Current password is required";
    if (!passwordData.new) errors.new = "New password is required";
    else if (passwordData.new.length < 8)
      errors.new = "Password must be at least 8 characters";
    if (passwordData.new !== passwordData.confirm)
      errors.confirm = "Passwords do not match";
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }, [passwordData]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    try {
      await handleApiRequest("put", "/user/password", {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });
      addNotification("Password changed successfully!");
      setShowPasswordModal(false);
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({});
      setShowPassword({ current: false, new: false, confirm: false });
    } catch {
      addNotification("Failed to change password");
    }
  };

  const handleLogout = useCallback(() => {
    onLogout();
    navigate("/login");
  }, [onLogout, navigate]);

  const closePasswordModal = useCallback(() => {
    if (!loading) {
      setShowPasswordModal(false);
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({});
      setShowPassword({ current: false, new: false, confirm: false });
    }
  }, [loading]);

  const handleRemoveProfilePic = () => {
    const id = Date.now();
    addNotification(
      <div className="flex flex-row items-center gap-3">
        <p className="flex-1 text-sm font-medium">
          Remove your profile picture?
        </p>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem("token");
              await axios.delete(`${API_BASE}/user/profile/photo`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setUser((prev) => ({ ...prev, profilePic: "" }));
              setTempUser((prev) => ({ ...prev, profilePic: "" }));
              addNotification("Profile image removed!", "success");
            } catch {
              addNotification("Failed to remove image", "error");
            } finally {
              removeNotification(id);
            }
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Confirm
        </button>
      </div>,
      "warning",
      { id, duration: 0 },
    );
  };

  /* ── Avatar initials ──────────────────────────────────────────────────── */
  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .profile-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

        @keyframes fadeUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes avatarPop {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes modalIn {
          from { transform: translateY(16px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }

        .fade-up   { animation: fadeUp 0.4s ease both; }
        .fade-up-2 { animation: fadeUp 0.4s 0.08s ease both; }
        .fade-up-3 { animation: fadeUp 0.4s 0.16s ease both; }
        .avatar-pop { animation: avatarPop 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }

        .profile-root ::-webkit-scrollbar       { width: 4px; }
        .profile-root ::-webkit-scrollbar-track { background: #080B12; }
        .profile-root ::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius: 2px; }

        .profile-card {
          background: #0E1320;
          border: 1px solid #1a2035;
          border-radius: 20px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.4);
        }
        .profile-input {
          background: #0a0f1e;
          border: 1px solid #1a2035;
          border-radius: 12px;
          color: #e2e8f0;
          outline: none;
          transition: all 0.2s;
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
        }
        .profile-input:focus {
          background: #0d1526;
          border-color: #7c3aed60;
          box-shadow: 0 0 0 3px #7c3aed12;
        }
        .profile-input::placeholder { color: #374151; }

        .dark-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4,6,12,0.80);
          backdrop-filter: blur(12px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .dark-modal-content {
          background: #0d1526;
          border: 1px solid #1a2035;
          border-top: 3px solid #7c3aed;
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.12);
          animation: modalIn 0.28s cubic-bezier(0.34,1.1,0.64,1) both;
        }
        .avatar-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .avatar-wrapper:hover .avatar-hover-overlay { opacity: 1; }

        .icon-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          transition: all 0.15s ease;
        }
        .icon-btn:active { transform: scale(0.9); }

        .stat-pill {
          background: #0a0f1e;
          border: 1px solid #1a2035;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <div
        className="profile-root"
        style={{
          minHeight: "100vh",
          background: "#080B12",
          color: "#e2e8f0",
          padding: "24px 16px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* ── Hero / Avatar section ─────────────────────────────────── */}
          <div
            className="profile-card fade-up"
            style={{
              padding: "40px 32px 32px",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glow */}
            <div
              style={{
                position: "absolute",
                top: -60,
                left: "50%",
                transform: "translateX(-50%)",
                width: 300,
                height: 300,
                background:
                  "radial-gradient(circle, #7c3aed18 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Avatar */}
            <div
              className="avatar-pop avatar-wrapper"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                position: "relative",
                width: 100,
                height: 100,
                marginBottom: 16,
                flexShrink: 0,
              }}
            >
              {user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt="Profile"
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #7c3aed50",
                    boxShadow: "0 0 24px #7c3aed30",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                    border: "3px solid #7c3aed50",
                    boxShadow: "0 0 24px #7c3aed30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-1px",
                  }}
                >
                  {initials}
                </div>
              )}

              {/* Hover overlay */}
              <div className="avatar-hover-overlay">
                <label
                  className="icon-btn"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                  }}
                >
                  <Camera size={16} color="#fff" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
                {user.profilePic && (
                  <button
                    className="icon-btn"
                    onClick={handleRemoveProfilePic}
                    style={{ background: "rgba(239,68,68,0.25)" }}
                  >
                    <Trash2 size={16} color="#fca5a5" />
                  </button>
                )}
              </div>
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#f0f4ff",
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              {user.name || "Loading…"}
            </h1>
            <p style={{ fontSize: 13, color: "#374151", marginBottom: 20 }}>
              {user.email || "Loading…"}
            </p>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {[
                {
                  label: "Member since",
                  value: user.joinDate
                    ? new Date(user.joinDate).getFullYear()
                    : "—",
                  color: "#7c3aed",
                },
                { label: "Status", value: "Active", color: "#1AFFD5" },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-pill">
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#4a5568" }}>
                    {label}
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Image crop modal ─────────────────────────────────────── */}
          {previewImage && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(4,6,12,0.88)",
                backdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#0d1526",
                  border: "1px solid #1a2035",
                  borderTop: "3px solid #7c3aed",
                  borderRadius: 20,
                  width: "100%",
                  maxWidth: 360,
                  padding: 20,
                  boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
                  animation: "modalIn 0.28s ease both",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#c9d1e8",
                    marginBottom: 12,
                  }}
                >
                  Crop your photo
                </p>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 260,
                    background: "#080B12",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Cropper
                    image={previewImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "#374151",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Zoom
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#7c3aed" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={handleImageUpload}
                    disabled={loading}
                    style={{
                      flex: 2,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                      boxShadow: "0 0 16px #7c3aed30",
                    }}
                  >
                    {loading ? "Uploading…" : "Save photo"}
                  </button>
                  <button
                    onClick={handleCancelImageEdit}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      background: "#0a0f1e",
                      border: "1px solid #1a2035",
                      color: "#6b7280",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Two-column cards ─────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            {/* ── Personal Info Card ──────────────────────────────────── */}
            <div className="profile-card fade-up-2" style={{ padding: 24 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "#7c3aed18",
                      border: "1px solid #7c3aed30",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={14} color="#7c3aed" />
                  </div>
                  <h2
                    style={{ fontSize: 13, fontWeight: 700, color: "#c9d1e8" }}
                  >
                    Personal Information
                  </h2>
                </div>

                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      borderRadius: 10,
                      background: "#0a0f1e",
                      border: "1px solid #1a2035",
                      color: "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#7c3aed40";
                      e.currentTarget.style.color = "#a78bfa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#1a2035";
                      e.currentTarget.style.color = "#6b7280";
                    }}
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                )}
              </div>

              {editMode ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={tempUser.name}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="profile-input"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={tempUser.email}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="profile-input"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                    <button
                      onClick={handleProfileUpdate}
                      disabled={loading}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 0",
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                        boxShadow: "0 0 16px #7c3aed30",
                      }}
                    >
                      <Save size={13} /> {loading ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 12,
                        background: "#0a0f1e",
                        border: "1px solid #1a2035",
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {[
                    { label: "Full Name", value: user.name },
                    { label: "Email Address", value: user.email },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px 14px",
                        background: "#0a0f1e",
                        border: "1px solid #1a2035",
                        borderRadius: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          color: "#374151",
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#c9d1e8",
                        }}
                      >
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Delete account */}
              <div
                style={{
                  borderTop: "1px solid #0f1729",
                  marginTop: 24,
                  paddingTop: 20,
                }}
              >
                <DeleteAccount />
              </div>
            </div>

            {/* ── Account Security Card ────────────────────────────────── */}
            <div className="profile-card fade-up-3" style={{ padding: 24 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "#1AFFD518",
                    border: "1px solid #1AFFD530",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield size={14} color="#1AFFD5" />
                </div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#c9d1e8" }}>
                  Account Security
                </h2>
              </div>

              {/* Password row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "#0a0f1e",
                  border: "1px solid #1a2035",
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Lock size={14} color="#374151" />
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#9ca3af",
                      }}
                    >
                      Password
                    </p>
                    <p style={{ fontSize: 10, color: "#374151" }}>
                      Last changed: recently
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  disabled={loading}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    background: "#0E1320",
                    border: "1px solid #1a2035",
                    color: "#6b7280",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed40";
                    e.currentTarget.style.color = "#a78bfa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1a2035";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  Change
                </button>
              </div>

              {/* 2FA placeholder */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "#0a0f1e",
                  border: "1px solid #1a2035",
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Shield size={14} color="#374151" />
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#9ca3af",
                      }}
                    >
                      Two-Factor Auth
                    </p>
                    <p style={{ fontSize: 10, color: "#374151" }}>
                      Add an extra layer of security
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: 8,
                    background: "#1e2d4a20",
                    border: "1px solid #1e2d4a",
                    color: "#374151",
                  }}
                >
                  Soon
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0",
                  borderRadius: 14,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.14)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                }}
              >
                <LogOut size={14} /> {loading ? "Processing…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showPasswordModal}
        onRequestClose={closePasswordModal}
        contentLabel="Change Password"
        overlayClassName="dark-modal-overlay"
        className="dark-modal-content"
        shouldCloseOnOverlayClick={!loading}
        shouldCloseOnEsc={!loading}
      >
        {/* Top accent line */}
        <div
          style={{
            height: 2,
            background: "linear-gradient(90deg, #7c3aed, #9333ea)",
            borderRadius: "20px 20px 0 0",
          }}
        />

        <div style={{ padding: "24px 24px 28px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "#7c3aed18",
                  border: "1px solid #7c3aed30",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={14} color="#7c3aed" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                Change Password
              </h3>
            </div>
            <button
              onClick={closePasswordModal}
              disabled={loading}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#6b7280",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef444440";
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2035";
                e.currentTarget.style.background = "#0a0f1e";
              }}
            >
              <X size={13} />
            </button>
          </div>

          <form
            onSubmit={handlePasswordSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <PasswordInput
              name="current"
              label="Current Password"
              value={passwordData.current}
              error={passwordErrors.current}
              showField={showPassword.current}
              onToggle={() => togglePasswordVisibility("current")}
              onChange={handlePasswordChange}
              disabled={loading}
            />
            <PasswordInput
              name="new"
              label="New Password"
              value={passwordData.new}
              error={passwordErrors.new}
              showField={showPassword.new}
              onToggle={() => togglePasswordVisibility("new")}
              onChange={handlePasswordChange}
              disabled={loading}
            />
            <PasswordInput
              name="confirm"
              label="Confirm New Password"
              value={passwordData.confirm}
              error={passwordErrors.confirm}
              showField={showPassword.confirm}
              onToggle={() => togglePasswordVisibility("confirm")}
              onChange={handlePasswordChange}
              disabled={loading}
            />

            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "11px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  boxShadow: "0 0 16px #7c3aed30",
                }}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 12,
                  background: "#0a0f1e",
                  border: "1px solid #1a2035",
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default Profile;
