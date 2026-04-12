import { DismissSplash } from "@/components/dismiss-splash";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-app-shell
      className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4 py-8"
    >
      <DismissSplash />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
