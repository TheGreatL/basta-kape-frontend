import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUnitConversions } from '#/api/unit-conversions.api.ts';
import { getIngredientUnits } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IIngredientUnit } from '#/feature/inventory/inventory.types.ts';
import type { IUnitConversion } from '#/feature/inventory/unit-conversions/unit-conversions.types.ts';

interface IConversionEdge {
    targetUnitId: string;
    factor: number; // 1 sourceUnit = factor * targetUnit
    ingredientId: string | null;
}

export function useUnitConverter() {
    // 1. Fetch active conversions (cached for 5 minutes)
    const { data: conversionsData, isLoading: isConversionsLoading } = useQuery({
        queryKey: [QUERY_KEY.UNIT_CONVERSIONS.LIST, 'all-active'],
        queryFn: () => getUnitConversions({ page: 1, limit: 100 }),
        staleTime: 5 * 60 * 1000
    });

    // 2. Fetch active units (cached for 5 minutes)
    const { data: unitsData, isLoading: isUnitsLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, 'all-active'],
        queryFn: () => getIngredientUnits({ page: 1, limit: 100, status: 'active' }),
        staleTime: 5 * 60 * 1000
    });

    const conversions: IUnitConversion[] = conversionsData?.data || [];
    const activeUnits: IIngredientUnit[] = unitsData?.data || [];

    // Map units by ID for quick lookup
    const unitMap = React.useMemo(() => {
        const map = new Map<string, IIngredientUnit>();
        activeUnits.forEach((u) => map.set(u.id, u));
        return map;
    }, [activeUnits]);

    // Build adjacency graph for multi-hop / bidirectional conversions
    const adjacencyGraph = React.useMemo(() => {
        const graph = new Map<string, IConversionEdge[]>();

        const addEdge = (sourceId: string, targetId: string, factor: number, ingredientId: string | null) => {
            if (!graph.has(sourceId)) {
                graph.set(sourceId, []);
            }
            graph.get(sourceId)!.push({ targetUnitId: targetId, factor, ingredientId });
        };

        for (const conv of conversions) {
            // Forward: 1 fromUnit = factor * toUnit
            addEdge(conv.fromUnitId, conv.toUnitId, conv.factor, conv.ingredientId || null);
            // Reverse: 1 toUnit = (1 / factor) * fromUnit
            if (conv.factor > 0) {
                addEdge(conv.toUnitId, conv.fromUnitId, 1 / conv.factor, conv.ingredientId || null);
            }
        }

        return graph;
    }, [conversions]);

    /**
     * Get list of compatible units for an ingredient's base unit.
     * Only returns units that have a direct or indirect conversion to/from baseUnitId
     * (matching global conversions or conversions specific to this ingredient).
     */
    const getCompatibleUnits = React.useCallback(
        (baseUnitId?: string | null, ingredientId?: string | null): IIngredientUnit[] => {
            if (!baseUnitId) return activeUnits;

            const reachable = new Set<string>([baseUnitId]);
            const queue: string[] = [baseUnitId];

            while (queue.length > 0) {
                const current = queue.shift()!;
                const edges = adjacencyGraph.get(current) || [];

                for (const edge of edges) {
                    // Consider global conversions or conversions matching this specific ingredient
                    if (edge.ingredientId === null || edge.ingredientId === ingredientId) {
                        if (!reachable.has(edge.targetUnitId)) {
                            reachable.add(edge.targetUnitId);
                            queue.push(edge.targetUnitId);
                        }
                    }
                }
            }

            // Return active units in the reachable set, placing the base unit first
            const matched = activeUnits.filter((u) => reachable.has(u.id));
            return matched.sort((a, b) => {
                if (a.id === baseUnitId) return -1;
                if (b.id === baseUnitId) return 1;
                return a.name.localeCompare(b.name);
            });
        },
        [activeUnits, adjacencyGraph]
    );

    /**
     * Convert a quantity from one unit to another.
     * Checks ingredient-specific rules first, then global rules.
     */
    const convertQuantity = React.useCallback(
        (fromUnitId: string, toUnitId: string, quantity: number, ingredientId?: string | null): number => {
            if (fromUnitId === toUnitId || quantity === 0) return quantity;

            // BFS search to find conversion factor between fromUnitId and toUnitId
            const visited = new Set<string>([fromUnitId]);
            const queue: Array<{ unitId: string; factorAccumulator: number }> = [{ unitId: fromUnitId, factorAccumulator: 1 }];

            while (queue.length > 0) {
                const { unitId, factorAccumulator } = queue.shift()!;

                if (unitId === toUnitId) {
                    return quantity * factorAccumulator;
                }

                const edges = adjacencyGraph.get(unitId) || [];
                // Sort edges so ingredient-specific conversions take priority over global
                const sortedEdges = [...edges].sort((a, b) => {
                    const aSpecific = a.ingredientId === ingredientId ? 1 : 0;
                    const bSpecific = b.ingredientId === ingredientId ? 1 : 0;
                    return bSpecific - aSpecific;
                });

                for (const edge of sortedEdges) {
                    if (edge.ingredientId === null || edge.ingredientId === ingredientId) {
                        if (!visited.has(edge.targetUnitId)) {
                            visited.add(edge.targetUnitId);
                            queue.push({
                                unitId: edge.targetUnitId,
                                factorAccumulator: factorAccumulator * edge.factor
                            });
                        }
                    }
                }
            }

            // If no conversion found, fallback to identity
            return quantity;
        },
        [adjacencyGraph]
    );

    /**
     * Convert unit cost when user enters cost per preferred unit.
     * E.g. ₱600 per kg -> ₱0.60 per g (when 1 kg = 1000 g).
     */
    const convertUnitCost = React.useCallback(
        (fromUnitId: string, toUnitId: string, unitCost: number, ingredientId?: string | null): number => {
            if (fromUnitId === toUnitId || unitCost === 0) return unitCost;

            const factor = convertQuantity(fromUnitId, toUnitId, 1, ingredientId);
            if (factor <= 0) return unitCost;

            return unitCost / factor;
        },
        [convertQuantity]
    );

    return {
        conversions,
        activeUnits,
        unitMap,
        isLoading: isConversionsLoading || isUnitsLoading,
        getCompatibleUnits,
        convertQuantity,
        convertUnitCost
    };
}
