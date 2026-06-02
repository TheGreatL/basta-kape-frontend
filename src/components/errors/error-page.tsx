import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '../ui/button';
import { AlertCircle } from 'lucide-react';

export default function ErrorPage({ error }: { error?: unknown }) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Something went wrong!</h1>
                    <p className="text-muted-foreground">
                        {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again later.'}
                    </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                    <Link to="/" className={buttonVariants()}>
                        Return to Home
                    </Link>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
}
