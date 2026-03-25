import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "sidebar";
  showText?: boolean;
  className?: string;
}

/**
 * LoneStar AdTruck brand mark.
 * The icon is a stylised truck silhouette inside a star-shaped badge,
 * rendered as an inline SVG so it works in dark/light contexts without
 * an external asset file.
 */
export function Logo({
  size = "md",
  variant = "default",
  showText = true,
  className,
}: LogoProps) {
  const sizeMap = {
    sm: { icon: "w-7 h-7", text: "text-sm", sub: "text-[10px]" },
    md: { icon: "w-9 h-9", text: "text-base", sub: "text-xs" },
    lg: { icon: "w-12 h-12", text: "text-xl", sub: "text-sm" },
  };

  const s = sizeMap[size];

  const isSidebar = variant === "sidebar";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon mark */}
      <div
        className={cn(
          s.icon,
          "rounded-xl flex items-center justify-center shrink-0",
          isSidebar
            ? "bg-sidebar-primary"
            : "bg-primary"
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[60%] h-[60%]"
        >
          {/* Star outline */}
          <path
            d="M16 2L20.09 10.26L29 11.57L22.5 17.93L24.18 26.84L16 22.57L7.82 26.84L9.5 17.93L3 11.57L11.91 10.26L16 2Z"
            stroke={isSidebar ? "hsl(220, 25%, 10%)" : "white"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Truck silhouette */}
          <path
            d="M10 17H18V13H10V17ZM18 17H22L24 15V13H20V17H18Z"
            fill={isSidebar ? "hsl(220, 25%, 10%)" : "white"}
            stroke={isSidebar ? "hsl(220, 25%, 10%)" : "white"}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Wheels */}
          <circle cx="12.5" cy="18" r="1.2" fill={isSidebar ? "hsl(220, 25%, 10%)" : "white"} />
          <circle cx="21" cy="18" r="1.2" fill={isSidebar ? "hsl(220, 25%, 10%)" : "white"} />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              s.text,
              "font-bold leading-tight tracking-tight",
              isSidebar ? "text-sidebar-foreground" : "text-foreground"
            )}
          >
            AdTruck Pro
          </span>
          <span
            className={cn(
              s.sub,
              "leading-tight",
              isSidebar
                ? "text-sidebar-foreground/50"
                : "text-muted-foreground"
            )}
          >
            by LoneStar ERP
          </span>
        </div>
      )}
    </div>
  );
}
