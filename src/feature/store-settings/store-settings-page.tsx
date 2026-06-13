import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Store, Clock, Coins, Percent, MapPin, Phone, Save, RotateCcw, ShieldAlert } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs.tsx';
import DiscountManager from './components/discount-manager.tsx';

import { getStoreSettings, updateStoreSettings, deleteStoreSettings } from '#/api/store-settings.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';

// Validation Schema
const storeSettingsSchema = z.object({
    storeName: z.string().min(1, 'Store Name is required').max(100, 'Max 100 characters'),
    address: z.string().min(1, 'Address is required').max(500, 'Max 500 characters'),
    contactNumber: z.string().max(50, 'Max 50 characters').nullable().optional(),
    openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    vatRate: z.number().min(0, 'VAT rate must be non-negative'),
    serviceCharge: z.number().min(0, 'Service charge must be non-negative')
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

export default function StoreSettingsPage() {
    const queryClient = useQueryClient();

    // Check RBAC Permissions
    const user = useAuthStore((state) => state.user);
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);
    const canUpdate = React.useMemo(() => hasPermission(permissions, appModules.STORE_SETTINGS, appPermissions.UPDATE), [permissions]);
    const canDelete = React.useMemo(() => hasPermission(permissions, appModules.STORE_SETTINGS, appPermissions.DELETE), [permissions]);

    // Fetch settings
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.ACTIVE],
        queryFn: getStoreSettings
    });

    const form = useForm<StoreSettingsFormValues>({
        resolver: zodResolver(storeSettingsSchema),
        defaultValues: {
            storeName: '',
            address: '',
            contactNumber: '',
            openingTime: '07:00',
            closingTime: '21:00',
            vatRate: 12.0,
            serviceCharge: 0.0
        }
    });

    // Reset form when settings are successfully loaded
    React.useEffect(() => {
        if (settings) {
            form.reset({
                storeName: settings.storeName,
                address: settings.address,
                contactNumber: settings.contactNumber || '',
                openingTime: settings.openingTime,
                closingTime: settings.closingTime,
                vatRate: settings.vatRate,
                serviceCharge: settings.serviceCharge
            });
        }
    }, [settings, form]);

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: (values: StoreSettingsFormValues) => {
            if (!settings?.id) {
                throw new Error('No active settings configuration ID found');
            }
            return updateStoreSettings(settings.id, {
                ...values,
                contactNumber: values.contactNumber || null
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.STORE_SETTINGS.ACTIVE] });
            toast.success('Store Settings Updated', {
                description: 'Operational attributes and store information have been successfully updated.'
            });
        },
        onError: (error) => {
            toast.error('Failed to update store settings', {
                description: getErrorMessage(error)
            });
        }
    });

    // Reset defaults (Delete record) mutation
    const resetMutation = useMutation({
        mutationFn: () => {
            if (!settings?.id) {
                throw new Error('No active settings configuration ID found');
            }
            return deleteStoreSettings(settings.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.STORE_SETTINGS.ACTIVE] });
            toast.success('Configuration Reset', {
                description: 'Store settings have been restored to their default configurations.'
            });
        },
        onError: (error) => {
            toast.error('Failed to reset store settings', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: StoreSettingsFormValues) => {
        updateMutation.mutate(values);
    };

    if (isSettingsLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Loading store configurations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Store Settings</h1>
                        <p className="text-xs text-muted-foreground">Configure physical store details, business hours, and payment taxation rates.</p>
                    </div>
                </div>

                {!canUpdate && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-semibold self-start sm:self-auto">
                        <ShieldAlert className="size-4" />
                        View Only Mode
                    </div>
                )}
            </div>

            <Tabs defaultValue="store-profile" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="store-profile">Store Profile</TabsTrigger>
                    <TabsTrigger value="discounts-setup">Discounts Setup</TabsTrigger>
                </TabsList>
                <TabsContent value="store-profile">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column - Store Profile Card */}
                                <div className="lg:col-span-2">
                                    <Card className="shadow-xs border-border/60 bg-card/40 h-full">
                                        <CardHeader className="border-b border-border/40 pb-4">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                <Store className="size-5 text-primary" />
                                                Store Profile
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Update store branding, primary location address, and customer contact number.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            <FormField
                                                control={form.control}
                                                name="storeName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Store Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Basta Kape"
                                                                disabled={!canUpdate}
                                                                {...field}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="contactNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                                            <Phone className="size-3.5 text-muted-foreground" />
                                                            Contact Number (Optional)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. +63 917 123 4567"
                                                                disabled={!canUpdate}
                                                                {...field}
                                                                value={field.value || ''}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                                            <MapPin className="size-3.5 text-muted-foreground" />
                                                            Store Location Address
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. 50 K-1st, Quezon City, Metro Manila"
                                                                disabled={!canUpdate}
                                                                {...field}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-2xs text-muted-foreground">
                                                            This location will be displayed on receipts and PDFs.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - Operation Schedule & Billing Card */}
                                <div className="flex flex-col gap-6">
                                    {/* Card 2: Operation Hours */}
                                    <Card className="shadow-xs border-border/60 bg-card/40">
                                        <CardHeader className="border-b border-border/40 pb-4">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                <Clock className="size-5 text-primary" />
                                                Operation Hours
                                            </CardTitle>
                                            <CardDescription className="text-xs">Configure shop opening and closing hours.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4 pt-4">
                                            <FormField
                                                control={form.control}
                                                name="openingTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Opening Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" disabled={!canUpdate} {...field} className="h-9 bg-background/50" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="closingTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Closing Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" disabled={!canUpdate} {...field} className="h-9 bg-background/50" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Card 3: Billing & Taxes */}
                                    <Card className="shadow-xs border-border/60 bg-card/40">
                                        <CardHeader className="border-b border-border/40 pb-4">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                <Coins className="size-5 text-primary" />
                                                Billing & Taxation
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Set Value-Added Tax (VAT) rate and default service charges.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            <FormField
                                                control={form.control}
                                                name="vatRate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1">
                                                            <Percent className="size-3.5 text-muted-foreground" />
                                                            Value-Added Tax (VAT) Rate (%)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="12.00"
                                                                disabled={!canUpdate}
                                                                value={field.value}
                                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                                onBlur={field.onBlur}
                                                                ref={field.ref}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="serviceCharge"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1">
                                                            <Percent className="size-3.5 text-muted-foreground" />
                                                            Service Charge Rate (%)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                disabled={!canUpdate}
                                                                value={field.value}
                                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                                onBlur={field.onBlur}
                                                                ref={field.ref}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Footer Actions Row */}
                            {canUpdate && (
                                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
                                    {canDelete ? (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-9 border-destructive/30 hover:border-destructive hover:bg-destructive/10 hover:text-destructive text-muted-foreground gap-1.5 transition-colors shadow-xs"
                                                    disabled={resetMutation.isPending || updateMutation.isPending}
                                                >
                                                    <RotateCcw className="size-4" />
                                                    Reset to Defaults
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                        <RotateCcw className="size-5 text-destructive" />
                                                        Reset Store Settings
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to reset all store settings configurations back to system defaults? This
                                                        will erase custom store names, operating hours, and tax rates.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => resetMutation.mutate()}
                                                        className="h-9 bg-destructive hover:bg-destructive/95 text-destructive-foreground shadow-sm"
                                                    >
                                                        Reset configurations
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    ) : (
                                        <div />
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={updateMutation.isPending || resetMutation.isPending}
                                        className="h-9 gap-1.5 shadow-sm min-w-[140px]"
                                    >
                                        {updateMutation.isPending ? (
                                            <>
                                                <Spinner className="h-4 w-4 animate-spin" />
                                                Saving Settings...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="size-4" />
                                                Save Configuration
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="discounts-setup" className="bg-background/20 rounded-2xl border border-border/40 p-6 shadow-sm">
                    <DiscountManager canUpdate={canUpdate} canDelete={canDelete} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
