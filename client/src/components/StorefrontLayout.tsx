import React from "react";

type StorefrontLayoutProps = {
  children: React.ReactNode;
};

export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}