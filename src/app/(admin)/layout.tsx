import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard,
  Tv,
  Users,
  ImageIcon,
  ListVideo,
  Settings,
  LogOut,
  Scissors,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screens", label: "Screens", icon: Tv },
  { href: "/advertisers", label: "Advertisers", icon: Users },
  { href: "/ads", label: "Ads", icon: ImageIcon },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
];

async function getLocationName() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("owner_user_id", user.id)
    .single();

  return location?.name ?? "My Location";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locationName = await getLocationName();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 flex flex-col">
        {/* Logo/Brand */}
        <div className="px-6 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5">
              <Scissors className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Big Hit Signage</p>
              <p className="text-gray-400 text-xs truncate max-w-[140px]">{locationName}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <AdminNavLink key={item.href} href={item.href} icon={Icon} label={item.label} />
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-gray-700 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <form
            action="/auth/signout"
            method="post"
          >
            <SignOutButton />
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// We need client-side nav link for active state — use server component with CSS trick
function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm group"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

function SignOutButton() {
  return (
    <button
      formAction={async () => {
        "use server";
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = createClient();
        await supabase.auth.signOut();
        const { redirect } = await import("next/navigation");
        redirect("/login");
      }}
      className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
