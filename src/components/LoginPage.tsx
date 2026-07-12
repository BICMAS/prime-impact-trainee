import React, { useState } from 'react';
import { Lock, Mail, Phone, ArrowRight, EyeOff, Eye } from 'lucide-react';
import { loginWithEmail, loginWithPhone } from '@/api/auth';
import { saveAuth } from '@/utils/auth';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

type LoginMode = 'EMAIL' | 'PHONE';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState<LoginMode>('EMAIL');

  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
   

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data =
        loginMode === 'EMAIL'
          ? await loginWithEmail(email, password)
          : await loginWithPhone(phoneNumber, password);

      const userEmail = data.user?.email;
      const name =
        userEmail?.split("@")[0] ?? data.user?.phone ?? data.user?.name ?? "User";
      const role = data.user?.role ?? "Trainee";
      const avatarSeed = userEmail ?? data.user?.id ?? name;
      const avatar = `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(
        avatarSeed,
      )}`;

      saveAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          id: data.user?.id ?? "",
          name,
          email: userEmail ?? null,
          role,
          avatar,
        },
      });
      onLogin({
        accessToken: data.accessToken,
        user: data.user,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100">
        {/* Header */}
        <div className="bg-white p-8 text-center border-b border-slate-100">
          <img
            src="/img/prime-impact-logo.png"
            className="h-24 mx-auto mb-4 object-contain"
            alt="Prime Impact"
          />
          <p className="text-slate-500 mt-2">Trainee Learning Portal</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setLoginMode('EMAIL')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                loginMode === 'EMAIL'
                  ? 'bg-white shadow text-slate-800'
                  : 'text-slate-500'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('PHONE')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                loginMode === 'PHONE'
                  ? 'bg-white shadow text-slate-800'
                  : 'text-slate-500'
              }`}
            >
              Phone
            </button>
          </div>

          <form
            id="prime-impact-login-form"
            name="login"
            method="post"
            autoComplete="on"
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Identifier */}
            {loginMode === 'EMAIL' ? (
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="login-phone"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    id="login-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="123-456-7890"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-accent hover:bg-brand-accent-dark text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
