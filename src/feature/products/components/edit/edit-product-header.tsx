import { ArrowLeft, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import type { IProduct } from '../../products.types.ts';

interface EditProductHeaderProps {
    product: IProduct;
    onBack: () => void;
}

export default function EditProductHeader({ product, onBack }: EditProductHeaderProps) {
    return (
        <div className="flex flex-col gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 text-xs gap-1.5 pl-1.5 -ml-1 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" /> Back to Products
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0 shadow-2xs">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-foreground leading-tight truncate">{product.name}</h1>
                            <Badge
                                variant="outline"
                                className={`text-xs font-bold uppercase py-0.5 px-2 ${
                                    product.deletedAt
                                        ? 'bg-rose-500/15 text-rose-700 border-rose-300'
                                        : 'bg-emerald-500/15 text-emerald-700 border-emerald-300'
                                }`}
                            >
                                {product.deletedAt ? 'Archived' : 'Active'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Manage profile details, pricing variants, ingredient recipes, and customization choices.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-xl border border-border/40 shrink-0">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>Last updated: {format(new Date(product.updatedAt), 'MMM dd, yyyy · hh:mm a')}</span>
                </div>
            </div>
        </div>
    );
}
