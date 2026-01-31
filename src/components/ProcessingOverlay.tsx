import { Loader2, FileSearch, Scale, FileCheck, Send, Brain, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  { icon: FileSearch, text: "Extracting product details...", complete: "Data extracted" },
  { icon: Send, text: "Sending to backend LLM...", complete: "Request sent" },
  { icon: Scale, text: "Applying GIR rules & Chapter 30...", complete: "Rules applied" },
  { icon: Brain, text: "Generating classification...", complete: "Classification ready" },
  { icon: FileCheck, text: "Preparing defense memo...", complete: "Memo generated" },
];

export function ProcessingOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setCompletedSteps((completed) => [...completed, prev]);
          return next;
        }
        return prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md text-center">
        {/* Animated Loader */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center shadow-glow">
            <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" style={{ animationDuration: "1.5s" }} />
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <p className="text-xl font-semibold text-secondary animate-pulse">
            {steps[currentStep].text}
          </p>
          <p className="text-sm text-muted-foreground">
            Processing via external LLM backend...
          </p>
        </div>

        {/* Step Progress */}
        <div className="w-full space-y-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.includes(index);
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isCompleted
                    ? "bg-success/10 border border-success/20"
                    : isCurrent
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/30 border border-transparent"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-success text-success-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium flex-1 text-left ${
                    isCompleted
                      ? "text-success"
                      : isCurrent
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {isCompleted ? step.complete : step.text}
                </span>
                {isCurrent && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
