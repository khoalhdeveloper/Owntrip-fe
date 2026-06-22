type PlaceLike = {
  _id: string;
  name?: string;
  order: number;
};

export type DestinationLike<TPlace extends PlaceLike = PlaceLike> = {
  dayId: string;
  day: number;
  date?: string;
  place: TPlace;
};

export type ItineraryPreviewChange = {
  placeId: string;
  name: string;
  from: number;
  to: number;
};

type RawPreviewChange = {
  placeId?: string;
  id?: string;
  name?: string;
  placeName?: string;
  title?: string;
  from?: number;
  fromOrder?: number;
  oldOrder?: number;
  oldIndex?: number;
  to?: number;
  toOrder?: number;
  newOrder?: number;
  newIndex?: number;
};

export function normalizeOrderedPlaceIds<TPlace extends PlaceLike>(
  currentPlaces: DestinationLike<TPlace>[],
  orderedPlaceIds: string[],
) {
  const currentIds = currentPlaces.map((dest) => dest.place._id);
  const seen = new Set<string>();
  const knownOrderedIds = orderedPlaceIds.filter((id) => {
    if (!currentIds.includes(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const missingIds = currentIds.filter((id) => !seen.has(id));

  return [...knownOrderedIds, ...missingIds];
}

export function reorderDestinationsByIds<TPlace extends PlaceLike>(
  allDestinations: DestinationLike<TPlace>[],
  dayId: string,
  orderedPlaceIds: string[],
) {
  const target = allDestinations.filter((dest) => dest.dayId === dayId);
  const others = allDestinations.filter((dest) => dest.dayId !== dayId);
  const normalizedIds = normalizeOrderedPlaceIds(target, orderedPlaceIds);
  const byId = new Map(target.map((dest) => [dest.place._id, dest]));
  const reordered = normalizedIds
    .map((id, index) => {
      const dest = byId.get(id);
      if (!dest) return null;
      return {
        ...dest,
        place: {
          ...dest.place,
          order: index + 1,
        },
      };
    })
    .filter(Boolean) as DestinationLike<TPlace>[];

  return [...others, ...reordered];
}

export function buildItineraryPreviewChanges<TPlace extends PlaceLike>(
  currentPlaces: DestinationLike<TPlace>[],
  orderedPlaceIds: string[],
) {
  const normalizedIds = normalizeOrderedPlaceIds(currentPlaces, orderedPlaceIds);
  const originalIndex = new Map(
    currentPlaces.map((dest, index) => [dest.place._id, index + 1]),
  );
  const nameById = new Map(currentPlaces.map((dest) => [dest.place._id, dest.place.name || 'Địa điểm']));

  return normalizedIds
    .map<ItineraryPreviewChange>((placeId, index) => ({
      placeId,
      name: nameById.get(placeId) || 'Địa điểm',
      from: originalIndex.get(placeId) || index + 1,
      to: index + 1,
    }))
    .filter((change) => change.from !== change.to);
}

function toDisplayOrder(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return value >= 0 ? value : undefined;
}

export function normalizeAiPreviewChanges<TPlace extends PlaceLike>(
  rawChanges: unknown,
  currentPlaces: DestinationLike<TPlace>[],
  orderedPlaceIds: string[],
) {
  const fallback = buildItineraryPreviewChanges(currentPlaces, orderedPlaceIds);
  if (!Array.isArray(rawChanges) || rawChanges.length === 0) return fallback;

  const normalizedIds = normalizeOrderedPlaceIds(currentPlaces, orderedPlaceIds);
  const byId = new Map(currentPlaces.map((dest) => [dest.place._id, dest]));
  const originalIndex = new Map(currentPlaces.map((dest, index) => [dest.place._id, index + 1]));

  const normalized = rawChanges
    .map<ItineraryPreviewChange | null>((raw, index) => {
      if (typeof raw === 'string') {
        const placeId = normalizedIds[index] || `change-${index}`;
        return {
          placeId,
          name: raw,
          from: originalIndex.get(placeId) || index + 1,
          to: normalizedIds.indexOf(placeId) + 1 || index + 1,
        };
      }

      if (!raw || typeof raw !== 'object') return null;

      const change = raw as RawPreviewChange;
      const placeId = change.placeId || change.id || normalizedIds[index] || `change-${index}`;
      const place = byId.get(placeId);
      const from =
        toDisplayOrder(change.from) ??
        toDisplayOrder(change.fromOrder) ??
        toDisplayOrder(change.oldOrder) ??
        toDisplayOrder(change.oldIndex) ??
        originalIndex.get(placeId) ??
        index + 1;
      const to =
        toDisplayOrder(change.to) ??
        toDisplayOrder(change.toOrder) ??
        toDisplayOrder(change.newOrder) ??
        toDisplayOrder(change.newIndex) ??
        (normalizedIds.indexOf(placeId) >= 0 ? normalizedIds.indexOf(placeId) + 1 : index + 1);

      return {
        placeId,
        name: change.name || change.placeName || change.title || place?.place.name || 'Địa điểm',
        from,
        to,
      };
    })
    .filter((change): change is ItineraryPreviewChange => Boolean(change));

  const moved = normalized.filter((change) => change.from !== change.to);
  return moved.length > 0 ? moved : fallback;
}
