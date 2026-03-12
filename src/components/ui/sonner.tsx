import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={1500}
      className="toaster group"
      icons={{
        error: <AlertCircle className="h-5 w-5" />,
        success: <CheckCircle2 className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!rounded-2xl group-[.toaster]:!border-2 group-[.toaster]:!px-5 group-[.toaster]:!py-4 group-[.toaster]:!shadow-2xl group-[.toaster]:!font-sans group-[.toaster]:!bg-[hsl(40,30%,95%)] group-[.toaster]:!text-[hsl(150,20%,12%)] group-[.toaster]:!border-[hsl(38,30%,80%)]",
          title: "group-[.toast]:!font-display group-[.toast]:!text-base group-[.toast]:!font-semibold group-[.toast]:!tracking-tight",
          description: "group-[.toast]:!text-sm group-[.toast]:!text-[hsl(150,10%,45%)] group-[.toast]:!leading-relaxed",
          actionButton: "group-[.toast]:!rounded-lg group-[.toast]:!font-medium group-[.toast]:!bg-[hsl(145,40%,28%)] group-[.toast]:!text-[hsl(40,33%,96%)]",
          cancelButton: "group-[.toast]:!rounded-lg group-[.toast]:!font-medium",
          error:
            "group-[.toaster]:!bg-[hsl(0,80%,95%)] group-[.toaster]:!text-[hsl(0,50%,30%)] group-[.toaster]:!border-[hsl(0,60%,75%)] [&_[data-icon]]:!text-[hsl(0,72%,51%)]",
          success:
            "group-[.toaster]:!bg-[hsl(140,50%,93%)] group-[.toaster]:!text-[hsl(145,40%,20%)] group-[.toaster]:!border-[hsl(140,40%,70%)] [&_[data-icon]]:!text-[hsl(145,40%,28%)]",
          warning:
            "group-[.toaster]:!bg-[hsl(40,70%,93%)] group-[.toaster]:!text-[hsl(38,50%,25%)] group-[.toaster]:!border-[hsl(38,50%,70%)] [&_[data-icon]]:!text-[hsl(38,60%,50%)]",
          info:
            "group-[.toaster]:!bg-[hsl(40,30%,95%)] group-[.toaster]:!text-[hsl(150,20%,12%)] group-[.toaster]:!border-[hsl(38,30%,80%)] [&_[data-icon]]:!text-[hsl(145,40%,28%)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
