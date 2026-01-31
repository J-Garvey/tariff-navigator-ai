import { Loader2, FileSearch, Scale, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  { icon: FileSearch, text: "Extracting product details..." },
  { icon: Scale, text: "Applying GIR rules & Chapter 30 notes..." },
  { icon: FileCheck, text: "Generating legal defense memo..." },
];

export function ProcessingOverlay() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        {/* Animated Loader */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CurrentIcon className="w-8 h-8 text-primary animate-pulse-soft" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" />
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground animate-pulse-soft">
            {steps[currentStep].text}
          </p>
          <p className="text-sm text-muted-foreground">
            This usually takes 10-15 seconds
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "bg-primary w-6"
                  : index < currentStep
                  ? "bg-primary/60"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
