import { Button } from '#/components/ui/button.tsx';
import { Cookie, Plus } from 'lucide-react';

interface FoodPrepHeaderProps {
    onOpenBakeDialog: () => void;
}

export default function FoodPrepHeader({ onOpenBakeDialog }: FoodPrepHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground leading-tight">Food Prep & Display Station</h1>
                    <p className="text-xs text-muted-foreground">
                        Monitor shelf-life freshness, track live bakery and pastry display stocks, and record freshly baked preparation batches.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button onClick={onOpenBakeDialog} className="h-9 gap-1.5 shadow-sm">
                    <Plus className="size-4" />
                    Bake / Record Batch
                </Button>
            </div>
        </div>
    );
}
