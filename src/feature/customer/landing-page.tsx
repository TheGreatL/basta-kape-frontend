import HeroSection from './components/landing/hero-section.tsx';
import CategoryExplorer from './components/landing/category-explorer.tsx';
import BestSellersSection from './components/landing/best-sellers-section.tsx';
import CraftStandards from './components/landing/craft-standards.tsx';
import HowItWorks from './components/landing/how-it-works.tsx';
import StoreInfoSection from './components/landing/store-info-section.tsx';
import CtaBanner from './components/landing/cta-banner.tsx';

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* 1. Editorial Cafe Hero & Live Featured Counter Pour */}
            <HeroSection />

            {/* 2. Architectural Counter Directory */}
            <CategoryExplorer />

            {/* 3. Most Ordered at the Bar (Live Best Sellers) */}
            <BestSellersSection />

            {/* 4. Behind the Bar: Craft & Live Stock Standards */}
            <CraftStandards />

            {/* 5. 3-Step Ordering & Courier Handoff Flow */}
            <HowItWorks />

            {/* 6. Store Location, Hours & Fulfillment Ledger */}
            <StoreInfoSection />

            {/* 7. Closing Menu Invitation */}
            <CtaBanner />
        </div>
    );
}
