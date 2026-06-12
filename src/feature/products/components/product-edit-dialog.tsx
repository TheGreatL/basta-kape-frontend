import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit3 } from 'lucide-react';
import type { z } from 'zod';

import { updateProduct } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productSchema } from '../products.schema.ts';
import ProductPhotoUpload from './product-photo-upload.tsx';
import type { IProduct } from '../products.types';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface ProductEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: IProduct | null;
}

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductEditDialog({ open, onOpenChange, product }: ProductEditDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    // Query categories and types
    const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getCategoriesList({ page: 1, limit: 50, status: 'active' }),
        enabled: open
    });

    const { data: typesData, isLoading: isTypesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getProductTypesList({ page: 1, limit: 50, status: 'active' }),
        enabled: open
    });

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            photo: '',
            description: '',
            productCategoryId: '',
            productTypeId: ''
        }
    });

    React.useEffect(() => {
        if (product) {
            form.reset({
                name: product.name,
                photo: product.photo || '',
                description: product.description || '',
                productCategoryId: product.productCategoryId || '',
                productTypeId: product.productTypeId || ''
            });
        } else {
            form.reset({
                name: '',
                photo: '',
                description: '',
                productCategoryId: '',
                productTypeId: ''
            });
        }
    }, [product, open, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ProductFormValues }) => updateProduct(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            if (product?.id) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, product.id] });
            }
            toast.success('Product Updated', {
                description: 'Product profile settings have been successfully modified.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update product', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: ProductFormValues) => {
        if (!product) return;
        updateMutation.mutate({
            id: product.id,
            payload: {
                name: values.name,
                photo: values.photo || null,
                description: values.description || null,
                productCategoryId: values.productCategoryId || null,
                productTypeId: values.productTypeId || null
            }
        });
    };

    const isDataLoading = isCategoriesLoading || isTypesLoading || !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Edit3 className="size-5 text-primary" />
                        Modify Menu Product
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Update product profile descriptors, categorization taxonomy, or uploaded images.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isDataLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading form details...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Photo Uploader */}
                                    <div className="flex justify-center py-1">
                                        <FormField
                                            control={form.control}
                                            name="photo"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="font-semibold text-foreground/80 block text-center">
                                                        Product Photo
                                                    </FormLabel>
                                                    <FormControl>
                                                        <ProductPhotoUpload
                                                            currentPhotoUrl={field.value}
                                                            onUploadSuccess={(url) => field.onChange(url)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Product Name */}
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Product Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Caramel Macchiato" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Taxonomy Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="productCategoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Category</FormLabel>
                                                    <Select
                                                        value={field.value || 'none'}
                                                        onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 bg-background/50">
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
                                                    <Select
                                                        value={field.value || 'none'}
                                                        onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 bg-background/50">
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

                                    {/* Description */}
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe flavor notes, ingredients, or preparation guidelines..."
                                                        className="min-h-[90px] bg-background/50 resize-y"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending || isDataLoading} className="h-9">
                                {updateMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
