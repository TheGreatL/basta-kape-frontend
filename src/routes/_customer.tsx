import { Outlet, Link, createFileRoute, Navigate, redirect } from '@tanstack/react-router';
import CustomerHeader from '#/components/layout/customer-header.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { Mail, Phone, MapPin } from 'lucide-react';
import logo from '#/assets/logo.png';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store';
import { restoreSession } from '#/api/auth.api.ts';

export const Route = createFileRoute('/_customer')({
    component: CustomerLayout,
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }
        if (useAuthStore.getState().user?.roles.find((role) => role.name.toLowerCase() === 'customer')) {
            redirect({ to: '/admin' });
        }
    }
});

function CustomerLayout() {
    const { storeName } = useStoreSettings();
    const user = useAuthStore.getState().user;
    const isCustomer = user?.roles.find((role) => role.name.toLowerCase() === 'customer');

    if (user && !isCustomer) return <Navigate to="/admin" />;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* Nav Header */}
            <CustomerHeader />

            {/* Main Content Area */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Cohesive Coffee-Themed Footer */}
            <footer className="border-t border-border/40 bg-muted/30">
                <div className="container mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        {/* Brand Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-background overflow-hidden">
                                    <img src={logo} alt="Logo" className="h-6 w-auto object-contain" />
                                </div>
                                <span className="text-base font-bold">{storeName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Experience premium craft coffee brewed with passion and quality ingredients. Your daily cup of happiness, just a click
                                away.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground uppercase">Quick Links</h3>
                            <ul className="space-y-2">
                                <li>
                                    <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        Home
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        Our Menu
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/cart" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        Shopping Cart
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        My Profile
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/orders" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        My Orders
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground uppercase">Get in Touch</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="size-4 text-primary" />
                                    <span>support@bastakape.com</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="size-4 text-primary" />
                                    <span>+63 917 000 0000</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="size-4 text-primary" />
                                    <span>Manila, Philippines</span>
                                </li>
                            </ul>
                        </div>

                        {/* Business Hours */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground uppercase">Opening Hours</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex justify-between">
                                    <span>Monday - Friday</span>
                                    <span className="font-medium text-foreground">7:00 AM - 8:00 PM</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Saturday - Sunday</span>
                                    <span className="font-medium text-foreground">8:00 AM - 9:00 PM</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 border-t border-border/20 pt-6 text-center text-xs text-muted-foreground">
                        <p>
                            © {new Date().getFullYear()} {storeName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
