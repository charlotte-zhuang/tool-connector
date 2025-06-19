import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function Layout({ children, className }: Props) {
  return (
    <div className={cn("flex flex-col my-4 mx-8 gap-2", className)}>
      <h2 className="text-lg font-bold">Usage</h2>
      {children}
    </div>
  );
}
