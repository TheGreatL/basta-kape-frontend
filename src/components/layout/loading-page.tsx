import { Coffee } from 'lucide-react';
import { BUSINESS_DETAIL } from '#/constants/business-details.ts';

export default function LoadingPage() {
    return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-8">
                <div className="relative flex items-center justify-center">
                    {/* Ping animation behind */}
                    <div className="absolute h-24 w-24 animate-ping rounded-full bg-primary/20" />
                    {/* Spinner ring */}
                    <div className="absolute h-32 w-32 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" />
                    {/* Inner glowing core */}
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-lg border border-border/50">
                        <Coffee className="size-10 text-primary animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{BUSINESS_DETAIL.NAME}</h2>
                    <div className="flex items-center text-sm font-medium text-muted-foreground animate-pulse">Brewing your experience...</div>
                </div>
            </div>
        </div>
    );
}
