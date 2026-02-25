import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen relative overflow-hidden bg-background">
      {/* Animated Gradient Background - New Palette - BEHIND EVERYTHING */}
      <div className="fixed inset-0 animated-gradient opacity-25 dark:opacity-15 -z-50 pointer-events-none" />
      
      {/* Mesh Pattern Overlay - New Palette - BEHIND EVERYTHING */}
      <div className="fixed inset-0 opacity-8 -z-40 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(158, 233, 112, 0.12) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content with proper z-index */}
      <div className="relative z-10 flex h-screen w-full">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto">
          <Navbar />
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-background/30 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
