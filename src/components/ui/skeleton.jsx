export function Skeleton({ className = "", ...props }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} {...props} />;
}

export * from "./skeletons";
