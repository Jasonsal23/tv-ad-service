import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getLocation() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();

  return { location, user };
}

export default async function SettingsPage() {
  const data = await getLocation();
  if (!data) redirect("/login");

  const { location, user } = data;

  async function handleCreateLocation(formData: FormData) {
    "use server";
    const supabase = (await import("@/lib/supabase/server")).createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-");

    await supabase.from("locations").insert({
      name,
      slug,
      owner_user_id: user.id,
    });

    redirect("/dashboard");
  }

  async function handleUpdateLocation(formData: FormData) {
    "use server";
    const supabase = (await import("@/lib/supabase/server")).createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;

    await supabase.from("locations").update({ name }).eq("id", id);
    redirect("/settings");
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your location and account settings</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email ?? ""} disabled />
            </div>
          </CardContent>
        </Card>

        {!location ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Set Up Your Location</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleCreateLocation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Big Hit Barbershop"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="big-hit"
                    required
                  />
                  <p className="text-xs text-gray-400">Used in URLs, lowercase with hyphens</p>
                </div>
                <Button type="submit">Create Location</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleUpdateLocation} className="space-y-4">
                <input type="hidden" name="id" value={location.id} />
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={location.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={location.slug} disabled />
                  <p className="text-xs text-gray-400">Contact support to change your slug</p>
                </div>
                <Button type="submit">Update Location</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Player base URL</p>
                <p className="text-xs text-gray-400 font-mono">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://signage.builtbyjason.dev"}/player/
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code> in your environment variables to customize the player URL domain.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
