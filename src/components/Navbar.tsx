import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Home, Compass, Search, Heart, PlusSquare, LogOut, User } from "lucide-react";
import { api } from "../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function Navbar() {
  const user = useCurrentUser();
  const unread = useQuery(api.notifications.unreadCount, {}) ?? 0;
  const markAllRead = useMutation(api.notifications.markAllRead);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const item = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl p-2 transition-colors ${
      isActive ? "text-white bg-surface-2" : "text-zinc-400 hover:text-white hover:bg-surface-2"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-hair bg-ink/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/feed" className="brand-text-gradient text-2xl font-extrabold tracking-tight">
          Instagraam
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/feed" className={item} title="خانه">
            <Home size={22} />
          </NavLink>
          <NavLink to="/explore" className={item} title="اکسپلور">
            <Compass size={22} />
          </NavLink>
          <NavLink to="/search" className={item} title="جستجو">
            <Search size={22} />
          </NavLink>
          <NavLink
            to="/notifications"
            className={item}
            title="اعلان‌ها"
            onClick={() => void markAllRead({})}
          >
            <span className="relative block">
              <Heart size={22} />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "۹+" : unread}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/create" className={item} title="پست جدید">
            <PlusSquare size={22} />
          </NavLink>
          {user?.username && (
            <NavLink to={`/u/${user.username}`} className={item} title="پروفایل">
              <User size={22} />
            </NavLink>
          )}
          <button
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-surface-2 hover:text-white"
            title="خروج"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut size={22} />
          </button>
        </nav>
      </div>
    </header>
  );
}
