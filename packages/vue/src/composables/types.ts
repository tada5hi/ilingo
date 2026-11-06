import type { IIlingo } from 'ilingo';
import type { Ref } from 'vue';
import type { GetContextReactive } from '../types';

export type UseScopedCatalogResult = {
    /** The scoped `Ilingo` instance — exposed for advanced cases. */
    instance: IIlingo;
    /**
     * `useTranslation`-shaped lookup bound to the scoped instance. Use this
     * inside the same setup that called `useScopedCatalog` — provide/inject
     * is hierarchical, so a same-component `useTranslation` would still see
     * the parent instance.
     */
    t(ctx: GetContextReactive): Ref<string>;
};
