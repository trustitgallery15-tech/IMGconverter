import React, { useState } from "react";
import { 
  X, 
  Mail, 
  Lock, 
  AlertCircle, 
  LogIn, 
  UserPlus, 
  Sparkles
} from "lucide-react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "../lib/firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "The email address is not formatted correctly.";
      case "auth/user-disabled":
        return "This user account has been disabled.";
      case "auth/user-not-found":
        return "No account exists with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "This email address is already in use.";
      case "auth/weak-password":
        return "The password must be at least 6 characters long.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup closed before completion.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#16161a] border border-[#202024] rounded-2xl p-6 shadow-2xl flex flex-col z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a8a93] hover:text-white p-1 rounded-lg hover:bg-[#202024] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mt-2 mb-6">
          <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 mb-3">
            <Sparkles className="w-6 h-6 text-[#00f0ff]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase">
            {isSignUp ? "Create Account" : "Access Portal"}
          </h2>
          <p className="text-xs text-[#8a8a93] mt-1.5">
            {isSignUp 
              ? "Sign up with email to unlock unlimited image processing" 
              : "Sign in to activate unlimited premium conversions"}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8a8a93] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8a8a93]">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#1e1e24] border border-[#323238] rounded-xl text-xs text-[#e1e1e6] py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8a8a93] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8a8a93]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1e1e24] border border-[#323238] rounded-xl text-xs text-[#e1e1e6] py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                disabled={loading}
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-[#8a8a93] uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8a8a93]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-xl text-xs text-[#e1e1e6] py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#00f0ff] hover:bg-[#33f3ff] text-black font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md hover:shadow-[#00f0ff]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="border-2 border-black border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-[#202024]"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-[#8a8a93] uppercase tracking-wider">
            OR
          </span>
          <div className="flex-grow border-t border-[#202024]"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-[#1e1e24] hover:bg-[#25252d] text-white font-semibold text-xs py-2.5 px-4 rounded-xl border border-[#323238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.28 1.845 15.548 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 11-4.64 11-11.2 0-.75-.08-1.33-.2-1.885H12.24z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[#8a8a93] hover:text-[#00f0ff] transition-colors"
          >
            {isSignUp 
              ? "Already have an account? Sign In" 
              : "Don't have an account yet? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
