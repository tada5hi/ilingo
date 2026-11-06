# Data Flow

```
Input:
  └── ctx: { namespace, key, locale?, data?, count? }    (caller — code, <ITranslate>, useTranslation)

Processing:
  1. requestedLocale = ctx.locale ?? instance default
  2. chain = resolveLocaleChain(requested, fallback config, LOCALE_DEFAULT)
       └── e.g. 'pt-BR' → ['pt-BR', 'pt', 'en']  (default tail; opt out via fallback: false | [])
  3. lookup(chain, ctx):
       for each locale in chain:
           for each store in insertion order:
               return on first defined candidate
       → { locale: hitLocale, leaf: string | PluralForms } // post-unwrap
  4. If miss → handleMissingKey → onMissingKey or warn-once default
  5. selectPluralForm(leaf, hitLocale, count)
       └── Intl.PluralRules(hitLocale) [cached] selects category, falls back to 'other'
  6. count auto-merges into data if absent
  7. template(message, data, { locale: hitLocale, formatters }) substitutes
     {{var}} and {{var, formatter(opts)}} placeholders

Output:
  └── Promise<string | undefined>     ('undefined' = handler returned no string)
```

`getSync(ctx)` runs the identical pipeline with step 3 replaced by `lookupSync`
(same order; a store's `SyncUnavailableError` aborts the walk) and returns
`string | undefined` directly, without a Promise. A store that cannot answer
synchronously causes `getSync` to throw `SyncUnavailableError`. The aborted walk
skips step 4 entirely (no `onMissingKey`, no warning).

