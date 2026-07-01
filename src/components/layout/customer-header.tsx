import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, User as UserIcon, LogOut, LayoutDashboard, Menu, X, ClipboardList } from 'lucide-react';

import { useAuth } from '#/context/AuthContext.tsx';
import { useCurrentCustomer } from '#/feature/customer/use-current-customer.ts';
import { getCart } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import logo from '#/assets/logo.png';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '#/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx';

export default function CustomerHeader() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { storeName } = useStoreSettings();

    // Fetch current customer ID
    const { data: customer } = useCurrentCustomer();

    // Fetch customer's cart
    const { data: cartData } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CART, customer?.id],
        queryFn: () => getCart(customer!.id),
        enabled: !!customer?.id
    });

    const cartCount = cartData?.items.reduce((total: number, item: { quantity: number }) => total + item.quantity, 0) || 0;

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate({ to: '/login' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to log out. Please try again.';
            toast.error(message);
        }
    };

    const hasAdminAccess = user ? user.roles.some((role) => role.name !== 'Customer') : false;

    const navLinks = [
        { label: 'Home', to: '/' },
        { label: 'Menu', to: '/products' }
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-background group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img src={logo} alt="Logo" className="h-7 w-auto object-contain" />
                    </div>
                    <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                        {storeName || 'Basta Kape'}
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            activeOptions={{ exact: link.to === '/' }}
                            activeProps={{ className: 'text-primary font-semibold' }}
                            inactiveProps={{ className: 'text-muted-foreground hover:text-foreground' }}
                            className="text-sm font-medium transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <>
                            {/* Cart Icon Link */}
                            {/* <Link
                                to="/cart"
                                className="relative p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                            >
                                <ShoppingCart className="size-5" />
                                {cartCount > 0 && (
                                    <Badge className="absolute -top-1.5 -right-1.5 size-5 flex items-center justify-center rounded-full bg-rose-600 text-rose-50 p-0 text-xs border border-background">
                                        {cartCount}
                                    </Badge>
                                )}
                            </Link> */}

                            {/* User Profile Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-1 duration-300  rounded-2xl hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="size-8 border border-border/60">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                                                {user.firstName && user.lastName
                                                    ? `${user.firstName[0]}${user.lastName[0]}`
                                                    : user.username.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden lg:inline text-sm font-semibold text-foreground max-w-[120px] truncate">
                                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                        </span>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56 mt-1 rounded-xl p-1.5 bg-background/90 backdrop-blur-md border border-border/40 shadow-xl"
                                >
                                    <DropdownMenuLabel className="px-2.5 py-2">
                                        <div className="flex flex-col space-y-0.5">
                                            <p className="text-sm font-bold text-foreground truncate">
                                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate font-normal">@{user.username}</p>
                                            {user.email && <p className="text-xs text-muted-foreground/80 truncate font-normal">{user.email}</p>}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-border/40" />
                                    {/* <DropdownMenuItem asChild>
                                        <Link
                                            to="/profile"
                                            className="w-full flex items-center cursor-pointer px-2.5 py-2 text-sm rounded-lg hover:bg-muted/80 transition-colors"
                                        >
                                            <UserIcon className="mr-2.5 size-4 text-muted-foreground" />
                                            <span>My Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/orders"
                                            className="w-full flex items-center cursor-pointer px-2.5 py-2 text-sm rounded-lg hover:bg-muted/80 transition-colors"
                                        >
                                            <ClipboardList className="mr-2.5 size-4 text-muted-foreground" />
                                            <span>My Orders</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    {hasAdminAccess && (
                                        <DropdownMenuItem asChild>
                                            <Link
                                                to="/admin"
                                                className="w-full flex items-center cursor-pointer px-2.5 py-2 text-sm rounded-lg hover:bg-muted/80 transition-colors"
                                            >
                                                <LayoutDashboard className="mr-2.5 size-4 text-muted-foreground" />
                                                <span>Admin Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    )} */}
                                    <DropdownMenuSeparator className="bg-border/40" />
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="w-full flex items-center cursor-pointer px-2.5 py-2 text-sm rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                                    >
                                        <LogOut className="mr-2.5 size-4" />
                                        <span>Sign Out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login">
                                <Button variant="ghost" size="sm" className="h-9">
                                    Sign In
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="h-9">
                                    Register
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                    {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
            </div>

            {/* Mobile Nav Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-border/40 bg-background px-4 py-4 space-y-4 shadow-lg animate-in fade-in-20 slide-in-from-top-4 duration-200">
                    <nav className="flex flex-col gap-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileMenuOpen(false)}
                                activeOptions={{ exact: link.to === '/' }}
                                activeProps={{ className: 'text-primary font-semibold bg-primary/5 pl-3 border-l-2 border-primary' }}
                                inactiveProps={{ className: 'text-muted-foreground pl-3' }}
                                className="text-base font-medium py-1.5 rounded-r-lg transition-all"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="border-t border-border/30 pt-4 flex flex-col gap-3">
                        {user ? (
                            <>
                                <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-border/30">
                                    <Avatar className="size-10 border border-border/60">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm uppercase">
                                            {user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}` : user.username.slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-foreground truncate">
                                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                                    </div>
                                </div>

                                {/* <Link
                                    to="/cart"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted text-foreground font-medium"
                                >
                                    <span className="flex items-center gap-2">
                                        <ShoppingCart className="size-5 text-muted-foreground" />
                                        Your Cart
                                    </span>
                                    {cartCount > 0 && (
                                        <Badge className="bg-rose-600 text-rose-50 px-2 py-0.5 rounded-full text-xs">{cartCount} Items</Badge>
                                    )}
                                </Link> */}

                                {/* <Link
                                    to="/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground font-medium"
                                >
                                    <UserIcon className="size-5 text-muted-foreground" />
                                    Your Profile
                                </Link> */}

                                {/* <Link
                                    to="/orders"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground font-medium"
                                >
                                    <ClipboardList className="size-5 text-muted-foreground" />
                                    Your Orders
                                </Link> */}

                                {hasAdminAccess && (
                                    <Link
                                        to="/admin"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground font-medium"
                                    >
                                        <LayoutDashboard className="size-5 text-muted-foreground" />
                                        Admin Dashboard
                                    </Link>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                                >
                                    <LogOut className="size-4" />
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full">Register</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
