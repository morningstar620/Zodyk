'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SectionSetting } from '@zodyk/core';

export interface SettingControlProps {
  setting: SectionSetting;
  value: unknown;
  onChange: (value: unknown) => void;
}

export interface CustomizerControlOverrides {
  richtext?: React.ComponentType<SettingControlProps>;
  image?: React.ComponentType<SettingControlProps>;
  gallery?: React.ComponentType<SettingControlProps>;
  file?: React.ComponentType<SettingControlProps>;
  page?: React.ComponentType<SettingControlProps>;
  page_relation?: React.ComponentType<SettingControlProps>;
  metaobject?: React.ComponentType<SettingControlProps>;
  meta_object_relation?: React.ComponentType<SettingControlProps>;
  link_list?: React.ComponentType<SettingControlProps>;
  product?: React.ComponentType<SettingControlProps>;
  collection?: React.ComponentType<SettingControlProps>;
}

const CustomizerControlsContext = createContext<CustomizerControlOverrides>({});

export function CustomizerProvider({
  controls,
  children,
}: {
  controls?: CustomizerControlOverrides;
  children: ReactNode;
}) {
  return (
    <CustomizerControlsContext.Provider value={controls ?? {}}>
      {children}
    </CustomizerControlsContext.Provider>
  );
}

export function useCustomizerControls(): CustomizerControlOverrides {
  return useContext(CustomizerControlsContext);
}
