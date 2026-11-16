import { MapPin, ExternalLink, Phone } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { getStoreStatus } from '#/utils/store-hours.ts';
import { cn } from '#/lib/utils.ts';

export default function StoreInfoSection() {
    const { storeName, address, settings } = useStoreSettings();
    const { isOpen, statusText, formattedHours } = getStoreStatus(settings.openingTime, settings.closingTime);

    const safeAddress = address || '50 K-1st, Quezon City, Metro Manila';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeAddress)}`;

    return (
        <section className="py-20 md:py-28 bg-background border-b border-border/60">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column: Location Narrative & Directions Action */}
                    <div className="lg:col-span-5 space-y-6">
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em] leading-tight">
                            Visit {storeName}
                        </h2>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[50ch]">
                            Stop by the bar for a freshly pulled espresso, stay for a quiet work session, or place your order ahead online for quick
                            counter pickup.
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-3">
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: 'default' }), 'gap-2 h-11 px-6 rounded-xl font-semibold')}
                            >
                                <MapPin className="size-4" />
                                <span>Get Directions</span>
                                <ExternalLink className="size-3.5 opacity-80" />
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Clean Storefront Ledger (No Nested Cards) */}
                    <div className="lg:col-span-7">
                        <dl className="divide-y divide-border/70 border-y border-border/70 text-sm">
                            <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <dt className="font-semibold text-muted-foreground">Address</dt>
                                <dd className="sm:col-span-2 font-semibold text-foreground">{safeAddress}</dd>
                            </div>

                            <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2 items-baseline">
                                <dt className="font-semibold text-muted-foreground">Operating Hours</dt>
                                <dd className="sm:col-span-2 flex flex-wrap items-center gap-3">
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {formattedHours !== 'Hours not set' ? `${formattedHours} Daily` : 'Open Daily'}
                                    </span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                            isOpen
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                        )}
                                    >
                                        <span className={cn('size-1.5 rounded-full', isOpen ? 'bg-emerald-500' : 'bg-amber-500')} />
                                        {statusText}
                                    </span>
                                </dd>
                            </div>

                            <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <dt className="font-semibold text-muted-foreground">Payment Methods</dt>
                                <dd className="sm:col-span-2 text-foreground">
                                    GCash &amp; Maya (online reference + receipt photo) · Cash on pickup
                                </dd>
                            </div>

                            <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <dt className="font-semibold text-muted-foreground">Fulfillment</dt>
                                <dd className="sm:col-span-2 text-foreground">
                                    Walk-in counter pickup · Customer-booked courier handoff (Grab, Lalamove)
                                </dd>
                            </div>

                            {settings.contactNumber && (
                                <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <dt className="font-semibold text-muted-foreground">Contact</dt>
                                    <dd className="sm:col-span-2 inline-flex items-center gap-2 font-semibold text-foreground tabular-nums">
                                        <Phone className="size-3.5 text-primary" />
                                        <span>{settings.contactNumber}</span>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>
            </div>
        </section>
    );
}
