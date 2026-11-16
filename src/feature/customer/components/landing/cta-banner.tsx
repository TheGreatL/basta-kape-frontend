import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { cn } from '#/lib/utils.ts';

export default function CtaBanner() {
    const { storeName } = useStoreSettings();

    return (
        <section className="py-16 md:py-24 bg-muted/35">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-y border-border/80 py-10 md:py-14">
                    <div className="max-w-2xl space-y-2.5">
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-[-0.02em] leading-tight">
                            Ready for your cup at {storeName}?
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[58ch]">
                            Explore our full drink list, customize your milk and sweetness, and place your order for pickup or courier delivery.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <Link to="/products" className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-8 text-sm font-bold rounded-xl gap-2.5 group')}>
                            <span>Browse Full Menu &amp; Order</span>
                            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
