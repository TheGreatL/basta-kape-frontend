import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Package, ArrowLeft, FileText, Layers, SlidersHorizontal } from 'lucide-react';

import { Route } from '#/routes/admin/products/$id/index.tsx';
import { getProductById } from '#/api/products.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IProductVariant, IVariantAttribute } from './products.types';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';

import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { getFileUrl } from '#/utils/helper.ts';

export default function ProductViewPage() {
    const { id } = Route.useParams();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate({
            to: '/admin/products',
            search: {
                page: 1,
                pageSize: 10,
                search: '',
                status: 'active',
                productCategoryId: '',
                productTypeId: ''
            }
        });
    };

    // Fetch product details
    const { data: product, isLoading: isProductLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id],
        queryFn: () => getProductById(id),
        enabled: !!id
    });

    // Fetch modifier groups list
    const { data: modifierGroupsData, isLoading: isGroupsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, { limit: 50, page: 1 }],
        queryFn: () => getModifierGroups({ limit: 50, page: 1 })
    });

    if (isProductLoading || !product) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Spinner className="size-7 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-semibold">Loading product details...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 ">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-4 border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={handleBack}>
                            Products
                        </span>
                        <span>/</span>
                        <span className="text-foreground">Product View</span>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                        <button
                            onClick={handleBack}
                            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors shrink-0"
                            title="Back to Products Log"
                        >
                            <ArrowLeft className="size-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground leading-none flex items-center gap-2">
                                {product.name}
                                <Badge
                                    variant="outline"
                                    className={`font-bold capitalize py-0.5 px-2.5 ${product.deletedAt ? 'bg-rose-500/15 text-rose-700' : 'bg-emerald-500/15 text-emerald-700'}`}
                                >
                                    {product.deletedAt ? 'archived' : 'active'}
                                </Badge>
                            </h1>
                            <p className="text-xs text-muted-foreground pt-1">
                                View only: Product basic profile, active categories, variations, and recipe modifiers.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[360px] rounded-xl h-10 border border-border/40 bg-muted/40 p-1 mb-4">
                    <TabsTrigger value="profile" className="text-xs font-semibold rounded-lg">
                        Profile Details
                    </TabsTrigger>
                    <TabsTrigger value="variants" className="text-xs font-semibold rounded-lg">
                        Variants Matrix
                    </TabsTrigger>
                    <TabsTrigger value="modifiers" className="text-xs font-semibold rounded-lg">
                        Customizations
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Product Profile info */}
                <TabsContent value="profile" className="focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                                <h3 className="text-sm font-bold text-foreground/80 border-b pb-2 uppercase text-2xs flex items-center gap-1.5">
                                    <FileText className="size-4 text-muted-foreground" />
                                    General Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                        <div className="font-bold text-muted-foreground/80">Product Name</div>
                                        <div className="font-semibold text-foreground bg-muted/20 border p-2.5 rounded-lg">{product.name}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-muted-foreground/80">Category</div>
                                        <div className="font-semibold text-foreground bg-muted/20 border p-2.5 rounded-lg">
                                            {product.category?.name || 'Unassigned'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-muted-foreground/80">Product Type</div>
                                        <div className="font-semibold text-foreground bg-muted/20 border p-2.5 rounded-lg">
                                            {product.type?.name || 'Unassigned'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-muted-foreground/80">Description</div>
                                        <div className="font-semibold text-foreground bg-muted/20 border p-2.5 rounded-lg min-h-[38px]">
                                            {product.description || 'No description provided.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col items-center">
                                <h3 className="text-sm font-bold text-foreground/80 border-b pb-2 w-full uppercase text-2xs flex items-center gap-1.5 self-start">
                                    <Package className="size-4 text-muted-foreground" />
                                    Product Photo
                                </h3>
                                <div className="w-full flex justify-center">
                                    {product.photo ? (
                                        <img
                                            src={getFileUrl(product.photo)}
                                            alt={product.name}
                                            className="w-full max-h-[180px] object-cover rounded-xl border border-border/50 shadow-3xs"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground py-10">
                                            <Package className="size-10 stroke-[1.25]" />
                                            <span className="text-3xs font-semibold mt-2">No photo available</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 2: Variants Matrix spreadsheet display */}
                <TabsContent value="variants" className="focus-visible:outline-none">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b pb-2 border-border/40">
                            <div>
                                <h3 className="text-sm font-bold text-foreground/80 uppercase text-2xs flex items-center gap-1.5">
                                    <Layers className="size-4 text-primary" />
                                    Active Variations List
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    List of sizes, variations, SKUs, prices, and recipe statuses configured for this product.
                                </p>
                            </div>
                        </div>

                        <div className="border border-border/40 rounded-xl overflow-hidden shadow-3xs bg-background/50">
                            <Table className="text-xs">
                                <TableHeader className="bg-muted/15 font-bold">
                                    <TableRow>
                                        <TableHead className="font-bold">Variation SKU</TableHead>
                                        <TableHead className="font-bold">Choice Attributes Combination</TableHead>
                                        <TableHead className="font-bold">Fulfillment Price</TableHead>
                                        <TableHead className="font-bold text-center">Recipe Setup</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="font-medium text-foreground/85 divide-y divide-border/20">
                                    {product.variants.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                                No variations matrix configured yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        product.variants.map((v: IProductVariant) => {
                                            const comboText =
                                                v.attributes.map((vav: IVariantAttribute) => vav.attributeValue.value).join(' • ') || 'Standard Item';

                                            return (
                                                <TableRow key={v.id} className="hover:bg-muted/5">
                                                    <TableCell className="font-mono text-2xs font-bold">{v.sku || '-'}</TableCell>
                                                    <TableCell className="font-semibold text-foreground/90">{comboText}</TableCell>
                                                    <TableCell className="font-bold text-foreground">₱{v.price.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-3xs font-bold leading-none py-0.5 px-2 ${
                                                                v.recipe
                                                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
                                                                    : 'bg-amber-500/10 text-amber-700 border-amber-500/25'
                                                            }`}
                                                        >
                                                            {v.recipe ? 'Configured' : 'No Recipe'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 3: Modifiers display */}
                <TabsContent value="modifiers" className="focus-visible:outline-none">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
                        <div className="border-b border-border/40 pb-3">
                            <h3 className="text-sm font-bold text-foreground/80 uppercase text-2xs flex items-center gap-1.5">
                                <SlidersHorizontal className="size-4 text-primary" />
                                Modifiers & Customizations
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">View choices and option groups linked to this product.</p>
                        </div>

                        {isGroupsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-2">
                                <Spinner className="size-6 text-primary animate-spin" />
                                <span className="text-xs text-muted-foreground font-semibold">Loading customizations...</span>
                            </div>
                        ) : !modifierGroupsData?.data ||
                          modifierGroupsData.data.filter((group: IModifierGroup) => group.products.some((p) => p.id === id)).length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground italic border border-dashed rounded-xl bg-muted/10">
                                No custom modifier groups linked to this product.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {modifierGroupsData.data
                                    .filter((group: IModifierGroup) => group.products.some((p) => p.id === id))
                                    .map((group: IModifierGroup) => (
                                        <Card
                                            key={group.id}
                                            className="border-primary/45 bg-primary/2 dark:bg-primary-[0.01] overflow-hidden flex flex-col shadow-3xs"
                                        >
                                            <CardHeader className="p-4 pb-3 border-b bg-muted/15">
                                                <div>
                                                    <CardTitle className="text-sm font-bold text-foreground">{group.name}</CardTitle>
                                                    <span className="text-3xs text-muted-foreground font-semibold block mt-0.5">
                                                        {group.isRequired ? 'REQUIRED' : 'OPTIONAL'} • SELECT {group.minSelect}-{group.maxSelect}
                                                    </span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="space-y-2">
                                                    <span className="text-3xs font-bold text-muted-foreground block uppercase">Modifier Choices</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                                                        {group.options.map((option: IModifierOption) => (
                                                            <div
                                                                key={option.id}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/40 hover:bg-muted/10"
                                                            >
                                                                <span className="text-foreground/90">{option.name}</span>
                                                                <span className="font-bold text-primary font-mono text-xs">
                                                                    +₱{option.price.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
