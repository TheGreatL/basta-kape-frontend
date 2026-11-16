import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';

const ORDER_STEPS = [
    {
        step: 'Step 1',
        title: 'Browse & Personalize',
        detail: 'Select variants & modifiers',
        description:
            'Pick your drink or pastry from the live menu. Customize size, temperature, milk preference, sweetness, and extra espresso shots with instant price updates.'
    },
    {
        step: 'Step 2',
        title: 'Pay via E-Wallet or Cash',
        detail: 'GCash, Maya, or Cash at counter',
        description:
            'Checkout with GCash or Maya by uploading your payment reference and receipt photo, or select cash payment when picking up in store.'
    },
    {
        step: 'Step 3',
        title: 'Pickup or Book Your Courier',
        detail: 'Live status from Pending to Ready',
        description:
            'Follow your order status live. Walk in when it turns Ready for Pickup, or enter your Lalamove/Grab rider details so our baristas can hand it off.'
    }
];

export default function HowItWorks() {
    return (
        <section className="py-20 md:py-28 bg-[#1C1511] text-[#F7F1E5]">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between pb-12 mb-12 border-b border-[#332720] gap-6">
                    <div>
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FBF7F0] tracking-[-0.02em]">Order In 3 Simple Steps</h2>
                        <p className="mt-2.5 text-sm sm:text-base text-[#C4B299] max-w-[58ch] leading-relaxed">
                            From customizing your cup to walking out with a fresh pour or dispatching a rider—here is how online ordering works.
                        </p>
                    </div>

                    <Link
                        to="/products"
                        className={cn(
                            buttonVariants({ size: 'sm' }),
                            'self-start md:self-auto gap-2 h-11 px-6 rounded-xl font-bold bg-[#D48C46] hover:bg-[#C37B35] text-[#18110D]'
                        )}
                    >
                        <span>Start Your Order</span>
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                    {ORDER_STEPS.map((item) => (
                        <li key={item.step} className="flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#332720]">
                                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D48C46] tabular-nums">
                                        {item.step}
                                    </span>
                                    <span className="text-xs text-[#B59E82]">{item.detail}</span>
                                </div>

                                <h3 className="font-serif text-2xl font-bold text-[#FBF7F0] mb-3">{item.title}</h3>
                                <p className="text-sm text-[#D6C7B2] leading-relaxed">{item.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
