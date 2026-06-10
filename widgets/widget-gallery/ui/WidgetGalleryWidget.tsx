"use client";

import { useEffect, useState } from "react";
import { Calculator, Camera } from "@gravity-ui/icons";
import { Card, Icon, Spin, Switch, Tab, TabList, TabPanel, TabProvider, Text, useToaster } from "@gravity-ui/uikit";
import { useWidgets } from "@/features/widget-list/model/useWidgets";
import { WidgetGrid } from "@/features/widget-list/ui/WidgetGrid";
import {
  BUILTIN_WIDGETS_EVENT,
  BuiltinWidgetsState,
  getBuiltinWidgetsState,
  setBuiltinWidgetEnabled,
} from "@/features/widget-list/lib/builtinWidgets";
import { useI18n } from "@/app/contexts/I18nContext";
import "./WidgetGalleryWidget.css";

type GalleryTab = "my" | "public";

const BUILTIN_ICONS = { calculator: Calculator, camera: Camera } as const;

export function WidgetGalleryWidget() {
  const { t } = useI18n();
  const toaster = useToaster();
  const [activeTab, setActiveTab] = useState<GalleryTab>("my");
  const [builtinState, setBuiltinState] = useState<BuiltinWidgetsState>({
    calculator: true,
    camera: true,
  });

  const myWidgets = useWidgets("my");
  const publicWidgets = useWidgets("public");

  useEffect(() => {
    setBuiltinState(getBuiltinWidgetsState());
    const handleChange = () => setBuiltinState(getBuiltinWidgetsState());
    window.addEventListener(BUILTIN_WIDGETS_EVENT, handleChange);
    return () => window.removeEventListener(BUILTIN_WIDGETS_EVENT, handleChange);
  }, []);

  const reportError = (error: unknown) => {
    toaster.add({
      name: `widget-action-error-${Date.now()}`,
      title: t('widgetGallery.actionError'),
      content: error instanceof Error ? error.message : undefined,
      theme: 'danger',
      autoHiding: 5000,
    });
  };

  const wrap = (action: () => Promise<void>) => {
    action().catch(reportError);
  };

  const activeList = activeTab === "my" ? myWidgets : publicWidgets;

  return (
    <section className="widget-gallery">
      <header className="widget-gallery__header">
        <Text variant="header-1">{t('widgetGallery.title')}</Text>
        <Text variant="body-1" color="secondary">
          {t('widgetGallery.subtitle')}
        </Text>
      </header>

      <div className="widget-gallery__builtin">
        <Text variant="subheader-2">{t('widgetGallery.builtinTitle')}</Text>
        <div className="widget-gallery__builtin-grid">
          {(Object.keys(BUILTIN_ICONS) as Array<keyof typeof BUILTIN_ICONS>).map((id) => (
            <Card key={id} view="outlined" type="container" className="widget-gallery__builtin-card">
              <div className="widget-gallery__builtin-info">
                <Icon data={BUILTIN_ICONS[id]} size={18} />
                <Text variant="body-1">{t(`widgetGallery.builtin.${id}`)}</Text>
              </div>
              <Switch
                checked={builtinState[id]}
                onUpdate={(checked) => setBuiltinWidgetEnabled(id, checked)}
                content={t('widgetGrid.enabled')}
                size="m"
              />
            </Card>
          ))}
        </div>
      </div>

      <TabProvider
        value={activeTab}
        onUpdate={(value: string) => setActiveTab(value as GalleryTab)}
      >
        <TabList size="l" className="widget-gallery__tab-list">
          <Tab value="my">{t('widgetGallery.myTab')}</Tab>
          <Tab value="public">{t('widgetGallery.publicTab')}</Tab>
        </TabList>

        {(["my", "public"] as const).map((tab) => (
          <TabPanel key={tab} value={tab} className="widget-gallery__tab-panel">
            {activeList.isLoading && activeTab === tab ? (
              <div className="widget-gallery__loading">
                <Spin size="m" />
              </div>
            ) : (
              activeTab === tab && (
                <>
                  {activeList.error && (
                    <Text variant="body-2" color="danger">
                      {activeList.error}
                    </Text>
                  )}
                  <WidgetGrid
                    widgets={activeList.widgets}
                    isOwnerView={tab === "my"}
                    onToggleEnabled={(id, enabled) =>
                      wrap(() => activeList.setWidgetEnabled(id, enabled))
                    }
                    onDelete={
                      tab === "my" ? (id) => wrap(() => myWidgets.deleteWidget(id)) : undefined
                    }
                    onToggleVisibility={
                      tab === "my"
                        ? (id, isPublic) => wrap(() => myWidgets.setWidgetVisibility(id, isPublic))
                        : undefined
                    }
                  />
                </>
              )
            )}
          </TabPanel>
        ))}
      </TabProvider>
    </section>
  );
}
