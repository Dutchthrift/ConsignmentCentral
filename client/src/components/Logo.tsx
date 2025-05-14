import { ComponentProps } from "react";
import logoPath from "@assets/Logo DT.jpeg";

export function Logo({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <img 
        src={logoPath} 
        alt="Dutch Thrift Logo" 
        className="h-full w-auto rounded-full"
      />
    </div>
  );
}