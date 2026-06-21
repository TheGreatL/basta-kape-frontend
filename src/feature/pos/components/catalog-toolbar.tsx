import { Search } from 'lucide-react';
import { Input } from '#/components/ui/input.tsx';
import type { IMenuCategory, IMenuProductType } from '../../menu/menu.types';

interface CatalogToolbarProps {
    search: string;
    setSearch: (search: string) => void;
    productCategoryId: string;
    setProductCategoryId: (id: string) => void;
    productTypeId: string;
    setProductTypeId: (id: string) => void;
    categoriesData: IMenuCategory[] | undefined;
    typesData: IMenuProductType[] | undefined;
}

export default function CatalogToolbar({
    search,
    setSearch,
    productCategoryId,
    setProductCategoryId,
    productTypeId,
    setProductTypeId,
    categoriesData,
    typesData
}: CatalogToolbarProps) {
    return (
        <div className="flex flex-col gap-3 bg-muted/15 p-3.5 border border-border/40 rounded-xl shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search catalog drinks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8.5 pl-9 bg-background/50 text-xs"
                    />
                </div>

                {/* Product Types Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    <button
                        onClick={() => setProductTypeId('')}
                        className={`text-xs font-semibold py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                            !productTypeId
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        All Types
                    </button>
                    {typesData?.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setProductTypeId(type.id)}
                            className={`text-xs font-semibold py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                                type.id === productTypeId
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {type.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Categories Tabs Bar */}
            <div className="border-t border-border/20 pt-2 flex items-center min-w-0">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 w-full">
                    <button
                        onClick={() => setProductCategoryId('')}
                        className={`text-xs font-semibold py-1.5 px-3 rounded-lg border shrink-0 transition-all cursor-pointer ${
                            !productCategoryId
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        All Categories
                    </button>
                    {categoriesData?.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setProductCategoryId(cat.id)}
                            className={`text-xs font-semibold py-1.5 px-3 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                cat.id === productCategoryId
                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                    : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
