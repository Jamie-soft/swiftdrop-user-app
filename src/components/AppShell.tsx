import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { RequireAuth } from "./RequireAuth";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background pb-28">
        <div className="mx-auto max-w-md px-5 pt-8">
          {title && (
            <header className="mb-6">
              <h1 className="text-3xl font-bold">{title}</h1>
            </header>
          )}
          {children}
        </div>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
