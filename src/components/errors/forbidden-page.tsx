import { Link } from '@tanstack/react-router';
import { buttonVariants } from '../ui/button';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold sm:text-5xl text-destructive">403</h1>
                    <h2 className="text-2xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground">
                        You do not have the required permissions to access this page or resource. Please contact your system administrator if you
                        believe this is an error.
                    </p>
                </div>

                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                    <Link to="/" className={buttonVariants()}>
                        Go back home
                    </Link>
                    <Link to="/login" className={buttonVariants({ variant: 'outline' })}>
                        Login with another account
                    </Link>
                </div>
            </div>
        </div>
    );
}
