import SiteFooter from "@/components/layout/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<SiteFooter /></>;
}
