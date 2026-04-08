"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateMyProfile, changePassword } from "@/lib/actions/profile";
import { User, BookOpen, Lock, ExternalLink } from "lucide-react";

interface SettingsFormProps {
  email: string;
  profile: {
    display_name: string;
    about_text: string;
    goodreads_url: string;
    storygraph_url: string;
  };
}

export function SettingsForm({ email, profile }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [aboutText, setAboutText] = useState(profile.about_text);
  const [goodreadsUrl, setGoodreadsUrl] = useState(profile.goodreads_url);
  const [storygraphUrl, setStorygraphUrl] = useState(profile.storygraph_url);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleProfileSave() {
    startTransition(async () => {
      const result = await updateMyProfile({
        display_name: displayName,
        about_text: aboutText || null,
        goodreads_url: goodreadsUrl || null,
        storygraph_url: storygraphUrl || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
      }
    });
  }

  function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Profile section */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center gap-2">
          <User className="h-4.5 w-4.5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-gray-400">
              Contact an admin to change your email address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">About</Label>
            <Textarea
              id="about"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="A short note for your competition — favorite genres, what you're reading this season, or how you pick books."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-gray-400 text-right">
              {aboutText.length}/500
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-medium text-gray-700">
              Reading Profiles
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goodreads">Goodreads</Label>
            <Input
              id="goodreads"
              type="url"
              value={goodreadsUrl}
              onChange={(e) => setGoodreadsUrl(e.target.value)}
              placeholder="https://www.goodreads.com/user/show/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storygraph">The StoryGraph</Label>
            <Input
              id="storygraph"
              type="url"
              value={storygraphUrl}
              onChange={(e) => setStorygraphUrl(e.target.value)}
              placeholder="https://app.thestorygraph.com/profile/..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleProfileSave}
            disabled={isPending || !displayName.trim()}
          >
            {isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </section>

      {/* Security section */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4.5 w-4.5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handlePasswordChange}
            disabled={
              isPending ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </section>
    </div>
  );
}
