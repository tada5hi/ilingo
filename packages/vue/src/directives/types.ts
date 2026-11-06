export type VTBindingDataMap = Record<string, string | number>;

export type VTBindingPath = {
    path: string,
    data?: VTBindingDataMap,
    locale?: string,
    count?: number,
};

export type VTBindingGroupKey = {
    namespace: string,
    key: string,
    data?: VTBindingDataMap,
    locale?: string,
    count?: number,
};

export type VTBinding = string | VTBindingPath | VTBindingGroupKey;
