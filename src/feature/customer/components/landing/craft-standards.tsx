import { useStoreSettings } from '#/hooks/use-store-settings.ts';

const CRAFT_PILLARS = [
    {
        spec: 'Roast & Extraction',
        title: 'Single-Origin Precision',
        description:
            'We partner with trusted local and regional growers, roasting in small batches and calibrating espresso extraction daily so every cup lands balanced and clean.'
    },
    {
        spec: 'Drink Modifiers',
        title: 'Crafted To Your Taste',
        description:
            'Adjust cup size, milk alternatives (full cream, oat, or soy), sweetness levels, extra espresso shots, and house toppings with transparent pricing.'
    },
    {
        spec: 'Live Kitchen Sync',
        title: 'Honest Menu Availability',
        description:
            'Our storefront menu is linked directly to our bar inventory and freshly prepared display batches—if a drink or pastry is listed, we have the ingredients ready.'
    },
    {
        spec: 'Counter & Courier',
        title: 'Built Around Your Schedule',
        description:
            'Order ahead to skip the morning line for walk-up pickup, or coordinate your preferred courier as soon as your order status turns Ready for Pickup.'
    }
];

export default function CraftStandards() {
    const { storeName } = useStoreSettings();

    return (
        <section className="py-20 md:py-28 bg-background border-b border-border/60">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mb-14">
                    <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em] leading-tight">
                        How {storeName} Works Behind the Bar
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[60ch]">
                        No shortcuts or pre-mixed syrups. Every drink is pulled to order and backed by real-time bar availability.
                    </p>
                </div>

                {/* Architectural Hairline Grid — No Generic Icon-Card Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-y border-border/70 divide-y md:divide-y-0 md:divide-x divide-border/70">
                    {CRAFT_PILLARS.map((pillar) => (
                        <div key={pillar.title} className="py-8 md:px-6 first:md:pl-0 last:md:pr-0 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{pillar.spec}</div>
                                <h3 className="font-serif text-xl font-bold text-foreground mb-3 leading-snug">{pillar.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
