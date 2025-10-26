import { PropsWithChildren } from "react";

export default function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 md:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
