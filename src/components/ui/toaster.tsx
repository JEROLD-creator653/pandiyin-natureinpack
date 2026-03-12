import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon =
          variant === "destructive" ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          );

        return (
          <Toast key={id} variant={variant} {...props}>
            {icon}
            <div className="grid gap-0.5 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
