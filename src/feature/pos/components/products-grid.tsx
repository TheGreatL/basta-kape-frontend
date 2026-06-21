import * as React from 'react';
import { Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Card, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { getFileUrl } from '#/utils/helper.ts';
import type { IMenuProduct } from '../../menu/menu.types';
import type { IPaginatedResult } from '#/types/base.types';

interface ProductsGridProps {
    menuData: IPaginatedResult<IMenuProduct> | undefined;
    isMenuLoading: boolean;
    menuError: any;
    page: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    onProductClick: (product: IMenuProduct) => void;
}

export default function ProductsGrid({ menuData, isMenuLoading, menuError, page, setPage, onProductClick }: ProductsGridProps) {
    if (isMenuLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-24 gap-3">
                <Spinner className="h-7 w-7 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Fetching products catalog...</span>
            </div>
        );
    }

    if (menuError) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center gap-2">
                <Coffee className="size-10 text-muted-foreground stroke-[1.25]" />
                <p className="text-sm font-semibold text-foreground">Menu catalog unavailable</p>
                <p className="text-xs text-muted-foreground">Failed to connect with active menu servers.</p>
            </div>
        );
    }

    if (menuData && menuData.data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-2 border border-dashed rounded-xl bg-muted/5">
                <Coffee className="size-8 text-muted-foreground/60 stroke-[1.25]" />
                <p className="text-xs font-bold text-foreground">No menu items found</p>
                <p className="text-xs text-muted-foreground">Adjust filters or search parameters and check again.</p>
            </div>
        );
    }

    if (!menuData) return null;

    return (
        <div className="flex flex-col h-full justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {menuData.data.map((product) => {
                    const firstVariantPrice = product.variants[0]?.price ?? 0;
                    return (
                        <Card
                            key={product.id}
                            onClick={() => onProductClick(product)}
                            className="overflow-hidden pt-0  hover:shadow-md hover:border-primary/40 active:scale-98 transition-all duration-200 cursor-pointer flex flex-col h-full border-border/60 bg-card/60 backdrop-blur-xs relative group"
                        >
                            {/* Image Container */}
                            <div className="aspect-video w-full bg-muted/20 relative flex items-center justify-center border-b overflow-hidden">
                                {product.photo ? (
                                    <img
                                        src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                                        alt={product.name}
                                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <Coffee className="size-8 stroke-[1.5] text-muted-foreground/70" />
                                )}
                                {product.category && (
                                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs py-0 px-1.5 font-bold leading-none">
                                        {product.category.name}
                                    </Badge>
                                )}
                            </div>
                            {/* Card Body */}
                            <CardHeader className="p-3 pb-1.5 flex-1 min-w-0">
                                <CardTitle className="text-xs font-bold text-foreground leading-tight truncate">{product.name}</CardTitle>
                                {product.description && (
                                    <CardDescription className="text-xs leading-snug truncate mt-0.5">{product.description}</CardDescription>
                                )}
                            </CardHeader>
                            <div className="p-3 pt-0 flex justify-between items-center mt-auto">
                                <span className="text-xs text-muted-foreground font-semibold">{product.variants.length} Sizes</span>
                                <span className="text-xs font-bold text-primary">₱{firstVariantPrice.toFixed(2)}</span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border/20 pt-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                    Showing page {page} of {menuData.meta.pageCount || 1}
                </span>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page <= 1}
                        className="h-7 px-2.5 text-2xs font-semibold"
                    >
                        <ChevronLeft className="size-3.5 mr-0.5" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!menuData.meta.hasMore}
                        className="h-7 px-2.5 text-2xs font-semibold"
                    >
                        Next <ChevronRight className="size-3.5 ml-0.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
