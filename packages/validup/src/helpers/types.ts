/**
 * Options for `translateIssue` / `translateIssues`.
 */
export type TranslateIssueOptions = {
    /**
     * Override the locale for this lookup. Defaults to the `Ilingo`
     * instance's current locale.
     */
    locale?: string;
    /**
     * Catalog namespace name to look up codes under. Defaults to `'validup'`
     * (the namespace used by the default `Store`). Override when you've
     * mounted the translations under a different namespace.
     */
    namespace?: string;
};
