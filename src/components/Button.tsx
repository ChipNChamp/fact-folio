
import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "fail" | "eh" | "pass";
  size?: "default" | "sm" | "lg" | "icon" | "wide";
  className?: string;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = "default",
  size = "default",
  className,
  icon,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none",
        // Variant styles
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm",
        variant === "outline" && "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        variant === "fail" && "bg-fail text-fail-foreground hover:bg-fail/90 active:bg-fail/80 shadow-sm",
        variant === "eh" && "bg-eh text-eh-foreground hover:bg-eh/90 active:bg-eh/80 shadow-sm",
        variant === "pass" && "bg-pass text-pass-foreground hover:bg-pass/90 active:bg-pass/80 shadow-sm",
        // Size styles
        size === "default" && "h-10 px-5 py-2 rounded-lg text-sm",
        size === "sm" && "h-8 px-3 rounded-md text-xs",
        size === "lg" && "h-12 px-8 rounded-lg text-base",
        size === "icon" && "h-10 w-10 rounded-full",
        size === "wide" && "h-14 px-6 py-3 rounded-xl text-base w-full",
        className
      )}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = "Button";
