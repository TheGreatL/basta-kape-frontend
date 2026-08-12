import type { UseFormReturn } from 'react-hook-form';
import { Save, FileText } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import ProductPhotoUpload from '../product-photo-upload.tsx';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';

interface EditProfileTabProps {
    form: UseFormReturn<any>;
    onSubmit: (values: any) => void;
    categoriesData?: { data: ICategory[] };
    typesData?: { data: IProductType[] };
    isSaving: boolean;
}

export default function EditProfileTab({ form, onSubmit, categoriesData, typesData, isSaving }: EditProfileTabProps) {
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="productCategoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Category</FormLabel>
                                            <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 bg-background/50 rounded-xl">
                                                        <SelectValue placeholder="Select Category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">No Category Assigned</SelectItem>
                                                    {categoriesData?.data.map((cat: ICategory) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="productTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Product Type</FormLabel>
                                            <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 bg-background/50 rounded-xl">
                                                        <SelectValue placeholder="Select Product Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">No Product Type Assigned</SelectItem>
                                                    {typesData?.data.map((t: IProductType) => (
                                                        <SelectItem key={t.id} value={t.id}>
                                                            {t.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
