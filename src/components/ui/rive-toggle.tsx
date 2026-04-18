import * as React from "react";
import { useRive, StateMachineInput, Fit, Alignment, Layout } from "@rive-app/react-canvas";

import { cn } from "@/lib/utils";

type RiveToggleProps = {
  src: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  width?: number;
  height?: number;
  className?: string;
  stateMachineName?: string;
  inputName?: string;
  "aria-label"?: string;
};

/**
 * Rive-driven toggle. Auto-detects the first state machine + boolean input.
 * Falls back to playing the first animation forwards/backwards when no
 * state machine input is available — so any `.riv` asset drops in cleanly.
 */
export const RiveToggle = React.forwardRef<HTMLDivElement, RiveToggleProps>(
  (
    {
      src,
      checked,
      onCheckedChange,
      disabled = false,
      id,
      width = 56,
      height = 32,
      className,
      stateMachineName,
      inputName,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const { rive, RiveComponent } = useRive({
      src,
      autoplay: true,
      stateMachines: stateMachineName,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    });

    const resolvedSmName = React.useMemo(() => {
      if (stateMachineName) return stateMachineName;
      const names = rive?.stateMachineNames ?? [];
      return names[0];
    }, [rive, stateMachineName]);

    // If no stateMachineName was provided, useRive did not start one — activate
    // the first available state machine so its inputs are queryable below.
    React.useEffect(() => {
      if (!rive || stateMachineName || !resolvedSmName) return;
      try {
        rive.play(resolvedSmName);
      } catch {
        // no-op — fallback effect below handles animation-only assets
      }
    }, [rive, stateMachineName, resolvedSmName]);

    const boolInputRef = React.useRef<StateMachineInput | null>(null);

    React.useEffect(() => {
      if (!rive || !resolvedSmName) return;
      const inputs = rive.stateMachineInputs(resolvedSmName) ?? [];
      // Prefer named input; else the first boolean; else null
      const picked =
        (inputName && inputs.find((i) => i.name === inputName)) ||
        inputs.find((i) => typeof i.value === "boolean") ||
        null;
      boolInputRef.current = picked;
      if (picked) picked.value = checked;
    }, [rive, resolvedSmName, inputName, checked]);

    // Fallback: no state machine input available — drive forward/reverse on the first animation
    const playedInitialRef = React.useRef(false);
    React.useEffect(() => {
      if (!rive) return;
      if (boolInputRef.current) return;
      const animName = rive.animationNames?.[0];
      if (!animName) return;
      if (!playedInitialRef.current) {
        playedInitialRef.current = true;
        return;
      }
      try {
        rive.play(animName);
      } catch {
        // no-op — playback is best-effort in fallback mode
      }
    }, [rive, checked]);

    function handleClick() {
      if (disabled) return;
      onCheckedChange(!checked);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onCheckedChange(!checked);
      }
    }

    return (
      <div
        ref={ref}
        id={id}
        role="switch"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{ width, height }}
        className={cn(
          "inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>
    );
  },
);
RiveToggle.displayName = "RiveToggle";
