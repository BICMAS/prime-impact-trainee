import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  UserCircle,
  Wifi,
  WifiOff,
  Award,
  MessageCircle,
  X,
  Download,
  Camera,
} from "lucide-react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/context/AuthContext";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

type NavItemConfig = {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  title: string;
};

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "dashboard",
    label: "Home",
    path: "/",
    icon: LayoutDashboard,
    title: "My Dashboard",
  },
  {
    id: "library",
    label: "Courses",
    path: "/library",
    icon: BookOpen,
    title: "Course Library",
  },
  {
    id: "assessment",
    label: "Field Task",
    path: "/assessment",
    icon: Camera,
    title: "Field Task",
  },
  {
    id: "community",
    label: "Forum",
    path: "/community",
    icon: MessageCircle,
    title: "Community",
  },
  {
    id: "certificates",
    label: "Awards",
    path: "/certificates",
    icon: Award,
    title: "My Certificates",
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
    title: "User Profile",
  },
];

const FALLBACK_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=4f1073&color=fff";

type NavItemProps = {
  item: NavItemConfig;
  isActive: boolean;
  onNavigate: (path: string) => void;
  mobile?: boolean;
};

const NavItem: React.FC<NavItemProps> = ({ item, isActive, onNavigate, mobile = false }) => {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`flex ${mobile ? "flex-col" : "flex-col"} items-center justify-center p-2 rounded-xl transition-all ${
        isActive
          ? "text-brand-primary bg-brand-primary/10"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-[10px] font-medium uppercase tracking-wide">
        {item.label}
      </span>
    </button>
  );
};

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isOffline = useOfflineStatus();
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  const activeItem = useMemo(
    () =>
      NAV_ITEMS.find((item) =>
        item.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.path),
      ) ?? NAV_ITEMS[0],
    [location.pathname],
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {isInstallable && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white rounded-xl shadow-lg p-4 flex items-center gap-3 z-50">
          <Download size={20} />
          <div className="flex-1">
            <p className="font-semibold text-sm">Install Prime Impact</p>
            <p className="text-xs text-slate-300">
              Learn offline. Faster access. No browser needed.
            </p>
          </div>

          <button
            type="button"
            onClick={promptInstall}
            className="bg-brand-accent hover:bg-brand-accent-dark px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Install
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <aside className="hidden md:flex w-24 bg-white border-r border-slate-200 flex-col items-center py-6 shrink-0 fixed h-full z-10">
        <div className="w-full px-2 mb-8 flex items-center justify-center">
          <img
            src="/img/prime-impact-logo.png"
            alt="Prime Impact"
            className="max-h-12 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 flex flex-col gap-6 w-full px-2">
          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.id}>
              <NavItem
                item={item}
                isActive={activeItem.id === item.id}
                onNavigate={navigate}
              />
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-4 w-full">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isOffline
                ? "bg-orange-100 text-orange-600"
                : "bg-brand-accent/10 text-brand-accent"
            }`}
            title={isOffline ? "You are offline" : "You are online"}
          >
            {isOffline ? <WifiOff size={20} /> : <Wifi size={20} />}
          </div>
          <img
            src={user.avatar || FALLBACK_AVATAR}
            alt={user.name}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== FALLBACK_AVATAR) {
                target.src = FALLBACK_AVATAR;
              }
            }}
            className="w-10 h-10 rounded-full border-2 border-slate-100"
          />
        </div>
      </aside>

      <main className="flex-1 md:ml-24 pb-20 md:pb-0">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">{activeItem.title}</h1>

          <div className="flex md:hidden items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                isOffline
                  ? "bg-orange-100 text-orange-600"
                  : "bg-brand-accent/10 text-brand-accent"
              }`}
              title={isOffline ? "You are offline" : "You are online"}
            >
              {isOffline ? <WifiOff size={18} /> : <Wifi size={18} />}
            </div>
            <img
              src={user.avatar || FALLBACK_AVATAR}
              alt={user.name}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== FALLBACK_AVATAR) {
                  target.src = FALLBACK_AVATAR;
                }
              }}
              className="w-8 h-8 rounded-full bg-slate-200"
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isOffline ? (
              <div className="text-xs text-orange-600 font-medium px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
                Offline Mode
              </div>
            ) : (
              <div className="text-xs text-brand-accent font-medium px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/20">
                Online
              </div>
            )}
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-40 pb-safe">
        {NAV_ITEMS.map((item) => (
          <React.Fragment key={item.id}>
            <NavItem
              item={item}
              isActive={activeItem.id === item.id}
              onNavigate={navigate}
              mobile
            />
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};
