export type SyncUnavailableErrorOptions = ErrorOptions & {
    locale?: string,
    namespace?: string,
    key?: string,
    /** `id` of the store that declined, when a specific store is responsible. */
    storeId?: string | symbol,
};
