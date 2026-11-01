import SiteHeader from '@/components/SiteHeader';
import HeroSection from '@/components/HeroSection';
import { CapabilitiesSection, HowItWorksSection } from '@/components/CapabilitiesSection';
import SiteFooter from '@/components/SiteFooter';

function App() {
  return (
    <div className="min-h-screen bg-ink">
      <SiteHeader />
      <main>
        <HeroSection />
        <CapabilitiesSection />
        <HowItWorksSection />
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
