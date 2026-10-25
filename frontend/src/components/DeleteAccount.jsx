import axios from "axios";
import { useState } from "react";
import { useNotifications } from "../Context/NotificationProvider";

const API_BASE = import.meta.env.VITE_API_BASE;

const DeleteAccount = () => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      addNotification("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/user/delete-account`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addNotification("Account deleted successfully!",
      );

      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/signup";
      }, 1000);
    } catch (err) {
      console.error(err);
      addNotification("Failed to delete account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Delete Button */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
      >
        Delete my account
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
            <h2 className="text-red-600 font-semibold text-lg mb-2">
              Delete Account
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This action is permanent. Type{" "}
              <span className="font-bold">DELETE</span> to confirm.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || loading}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>

              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmText("");
                }}
                disabled={loading}
                className="flex-1 bg-gray-300 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteAccount;
