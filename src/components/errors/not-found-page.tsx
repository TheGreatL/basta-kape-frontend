import { Link } from '@tanstack/react-router';
import { buttonVariants } from '../ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                    <FileQuestion className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold  sm:text-5xl">404</h1>
                    <h2 className="text-2xl font-semibold ">Page Not Found</h2>
                    <p className="text-muted-foreground">Oops! The page you are looking for does not exist. It might have been moved or deleted.</p>
                </div>

                <Link to="/" className={buttonVariants()}>
                    Go back home
                </Link>
            </div>
        </div>
    );
}
