import * as React from 'react';
import { SlidersHorizontal, Plus, Edit2, Trash2, Info } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';

interface EditCustomizationsTabProps {
    modifierGroupsData?: { data: IModifierGroup[] };
    isGroupsLoading: boolean;
    modifierSearch: string;
    setModifierSearch: (val: string) => void;
    onOpenCreateGroup: () => void;
    onOpenEditGroup: (group: IModifierGroup) => void;
    onDeleteGroup: (group: IModifierGroup) => void;
    onOpenCreateOption: (groupId: string) => void;
    onOpenEditOption: (groupId: string, option: IModifierOption) => void;
    onDeleteOption: (option: IModifierOption) => void;
}

export default function EditCustomizationsTab({
    modifierGroupsData,
    isGroupsLoading,
    modifierSearch,
    setModifierSearch,
    onOpenCreateGroup,
    onOpenEditGroup,
    onDeleteGroup,
    onOpenCreateOption,
    onOpenEditOption,
    onDeleteOption
}: EditCustomizationsTabProps) {
    const filteredGroups = React.useMemo(() => {
        if (!modifierGroupsData?.data) return [];
        return modifierGroupsData.data.filter((group) => group.name.toLowerCase().includes(modifierSearch.toLowerCase()));
    }, [modifierGroupsData, modifierSearch]);

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3 gap-2">
                <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                        <SlidersHorizontal className="size-4 text-primary" />
                        Customization Choices & Add-on Groups
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Define product-specific customization groups (e.g. Milk Choice, Extra Shots) and option pricing for this beverage.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search groups..."
                        value={modifierSearch}
                        onChange={(e) => setModifierSearch(e.target.value)}
                        className="h-8 text-xs w-full sm:w-[180px] bg-background/50"
                    />
                    <Button type="button" size="sm" onClick={onOpenCreateGroup} className="h-8 text-xs font-bold gap-1.5 shrink-0 shadow-2xs">
                        <Plus className="size-3.5" /> Create Group
                    </Button>
                </div>
            </div>

            {/* Groups Grid */}
            {isGroupsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Spinner className="size-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading customization groups...</span>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10 space-y-2">
                    <Info className="size-6 text-muted-foreground mx-auto stroke-[1.5]" />
                    <p className="text-xs text-muted-foreground italic">
                        {modifierSearch ? 'No customization groups match your search.' : 'No customization groups configured for this product.'}
                    </p>
                    <Button type="button" size="sm" onClick={onOpenCreateGroup} variant="outline" className="h-8 text-xs font-semibold">
                        Create First Customization Group
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredGroups.map((group) => {
                        return (
                            <Card
                                key={group.id}
                                className="border border-primary/30 bg-primary/2 dark:bg-primary-[0.01] transition-all shadow-2xs overflow-hidden flex flex-col"
                            >
                                <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-row items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">{group.name}</CardTitle>
                                        <span className="text-xs text-muted-foreground font-semibold block mt-0.5">
                                            {group.isRequired ? 'REQUIRED' : 'OPTIONAL'} • SELECT {group.minSelect}-{group.maxSelect}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onOpenEditGroup(group)}
                                            className="size-7 text-muted-foreground hover:text-foreground"
                                            title="Edit Group Settings"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDeleteGroup(group)}
                                            className="size-7 text-muted-foreground hover:text-destructive"
                                            title="Delete Group"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                                    <div className="flex-1 space-y-3 min-h-0">
                                        <div className="flex items-center justify-between border-b border-border/20 pb-1">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                                Option Choices ({group.options.length})
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onOpenCreateOption(group.id)}
                                                className="h-6 text-xs font-semibold gap-1 px-1.5 text-primary hover:text-primary hover:bg-primary/5"
                                            >
                                                <Plus className="size-3" /> Add Choice
                                            </Button>
                                        </div>

                                        {group.options.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-muted-foreground italic">
                                                No choices defined in this group yet. Click "+ Add Choice" to create options.
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-border/20 max-h-[180px] overflow-y-auto">
                                                {group.options.map((opt) => (
                                                    <li key={opt.id} className="flex justify-between items-center py-2 text-xs">
                                                        <div>
                                                            <span className="font-semibold text-foreground/80">{opt.name}</span>
                                                            <span className="text-xs text-muted-foreground block font-bold">
                                                                +₱{opt.price.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => onOpenEditOption(group.id, opt)}
                                                                className="size-7 text-muted-foreground hover:text-primary"
                                                            >
                                                                <Edit2 className="size-3" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => onDeleteOption(opt)}
                                                                className="size-7 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
