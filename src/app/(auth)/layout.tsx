export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-app-shell
      className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-muted/50 via-background to-indigo-50/30 dark:to-indigo-950/30 px-4 py-8"
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
