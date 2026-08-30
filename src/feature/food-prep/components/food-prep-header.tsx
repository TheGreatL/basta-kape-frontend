import { Button } from '#/components/ui/button.tsx';
import { Cookie, Plus } from 'lucide-react';

interface FoodPrepHeaderProps {
    onOpenBakeDialog: () => void;
}

export default function FoodPrepHeader({ onOpenBakeDialog }: FoodPrepHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Cookie className="size-5" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Food Prep & Display Station</h1>
                </div>
                <p className="text-xs text-muted-foreground">
                    Monitor shelf-life freshness, track live bakery and pastry display stocks, and record freshly baked preparation batches.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Button onClick={onOpenBakeDialog} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm">
                    <Plus className="size-4" />
                    Bake / Record Batch
                </Button>
            </div>
        </div>
    );
}
