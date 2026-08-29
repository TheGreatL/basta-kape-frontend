import type { UseFormReturn } from 'react-hook-form';
import { Save, FileText } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Switch } from '#/components/ui/switch.tsx';
import ProductPhotoUpload from '../product-photo-upload.tsx';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';

interface EditProfileTabProps {
    form: UseFormReturn<any>;
    onSubmit: (values: any) => void;
    categoriesData?: { data: ICategory[] };
    typesData?: { data: IProductType[] };
    isSaving: boolean;
    currentCategory?: { id: string; name: string } | null;
}

export default function EditProfileTab({ form, onSubmit, categoriesData, typesData, isSaving, currentCategory }: EditProfileTabProps) {
    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                                <FileText className="size-4 text-primary" />
                                Product General Profile
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Primary identity, beverage photo representation, category classification, and descriptions.
                            </p>
                        </div>

                        <Button type="submit" disabled={isSaving} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm">
                            {isSaving ? (
                                <>
                                    <Spinner className="size-4 animate-spin" /> Saving Changes...
                                </>
                            ) : (
                                <>
                                    <Save className="size-4" /> Save Profile Info
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Photo Upload Column */}
                        <div className="flex flex-col items-center justify-start p-4 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                            <FormField
                                control={form.control}
                                name="photo"
                                render={({ field }) => (
                                    <FormItem className="space-y-1 w-full flex flex-col items-center">
                                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground text-center mb-1">
                                            Product Photo
                                        </FormLabel>
                                        <FormControl>
                                            <ProductPhotoUpload currentPhotoUrl={field.value || ''} onUploadSuccess={(url) => field.onChange(url)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
                                Modify beverage photo representation. Supported formats: JPG, PNG, WebP.
                            </div>
                        </div>

                        {/* Core fields */}
                        <div className="md:col-span-2 space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Product Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Spanish Latte" {...field} className="h-9 bg-background/50 rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Category */}
                            <FormField
                                control={form.control}
                                name="productCategoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Category</FormLabel>
                                        <Select
                                            key={`${field.value || 'none'}-${categoriesData?.data.length || 0}`}
                                            value={field.value || 'none'}
                                            onValueChange={(val) => {
                                                const nextVal = val === 'none' ? '' : val;
                                                field.onChange(nextVal);
                                                const cat = categoriesData?.data.find((c: ICategory) => c.id === nextVal);
                                                form.setValue('productTypeId', cat?.productTypeId || cat?.type?.id || '');
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-9 bg-background/50 rounded-xl">
                                                    <SelectValue placeholder="Select Category (e.g. Espresso, Waffles, Matcha)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">No Category Assigned</SelectItem>
                                                {(() => {
                                                    const renderedIds = new Set<string>();
                                                    const allCategories = categoriesData?.data || [];

                                                    const typeGroups = (typesData?.data || []).map((type: IProductType) => {
                                                        const typeCategories = allCategories.filter((c: any) => {
                                                            const catTypeId =
                                                                c.productTypeId || c.type?.id || c.product_type_id || c.typeId || c.productType?.id;
                                                            return catTypeId === type.id;
                                                        });
                                                        typeCategories.forEach((c: any) => renderedIds.add(c.id));

                                                        if (typeCategories.length === 0) return null;
                                                        return (
                                                            <SelectGroup key={type.id}>
                                                                <SelectLabel className="font-bold text-foreground/70 text-xs">
                                                                    {type.name}
                                                                </SelectLabel>
                                                                {typeCategories.map((cat: any) => (
                                                                    <SelectItem key={cat.id} value={cat.id}>
                                                                        {cat.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        );
                                                    });

                                                    const otherCategories = allCategories.filter((c: any) => !renderedIds.has(c.id));
                                                    otherCategories.forEach((c: any) => renderedIds.add(c.id));

                                                    return (
                                                        <>
                                                            {/* Fallback for current category if not already rendered */}
                                                            {currentCategory && currentCategory.id && !renderedIds.has(currentCategory.id) && (
                                                                <SelectItem key={currentCategory.id} value={currentCategory.id}>
                                                                    {currentCategory.name}
                                                                </SelectItem>
                                                            )}
                                                            {typeGroups}
                                                            {otherCategories.length > 0 && (
                                                                <SelectGroup>
                                                                    <SelectLabel className="font-bold text-foreground/70 text-xs">
                                                                        Other Categories
                                                                    </SelectLabel>
                                                                    {otherCategories.map((cat: any) => (
                                                                        <SelectItem key={cat.id} value={cat.id}>
                                                                            {cat.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe taste profile, ingredients, and highlights..."
                                                {...field}
                                                className="bg-background/50 rounded-xl min-h-[90px] text-xs resize-none"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Promotional Badges & Highlights */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <FormField
                                    control={form.control}
                                    name="isBestSeller"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 shadow-2xs">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 cursor-pointer">
                                                    ⭐ Best Seller Badge
                                                </FormLabel>
                                                <p className="text-xs text-muted-foreground">
                                                    Feature this item as a customer favorite and top seller.
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isMustTry"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-orange-500/25 bg-orange-500/5 p-3.5 shadow-2xs">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5 cursor-pointer">
                                                    🔥 Must Try Badge
                                                </FormLabel>
                                                <p className="text-xs text-muted-foreground">Highlight this item as a recommended signature item.</p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
