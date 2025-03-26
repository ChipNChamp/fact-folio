
import React, { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/Button";
import { LockIcon } from "lucide-react";

interface PasswordProtectionProps {
  children: ReactNode;
  password: string;
}

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({ children, password }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [error, setError] = useState(false);

  // Check if previously authenticated
  useEffect(() => {
    const auth = localStorage.getItem("app_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputPassword === password) {
      setIsAuthenticated(true);
      localStorage.setItem("app_authenticated", "true");
      setError(false);
    } else {
      setError(true);
      setInputPassword("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border/50 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">Please enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                error ? "border-destructive" : "border-input"
              } bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200`}
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="text-destructive text-sm mt-1">Incorrect password</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
};
