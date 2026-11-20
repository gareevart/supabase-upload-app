"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PlaceholderContainer, Skeleton } from "@gravity-ui/uikit";
import BroadcastFormWidget from "@/widgets/broadcast-form/ui/BroadcastFormWidget";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/app/contexts/I18nContext";
import "@/widgets/broadcast-form/ui/BroadcastFormWidget.css";

export default function NewBroadcastPage() {
  const { t } = useI18n();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsAuthorized(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const hasAccess = profile?.role === "admin" || profile?.role === "editor";
        setIsAuthorized(hasAccess);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="broadcast-editor-state">
        <Card>
          <Skeleton style={{ height: 384, width: "100%" }} />
        </Card>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="broadcast-editor-state">
        <PlaceholderContainer
          className="broadcast-editor-state__card"
          size="l"
          direction="column"
          title={t("broadcast.page.accessDeniedTitle")}
          description={t("broadcast.page.accessDeniedDescription")}
          image={{ src: "/file.svg", alt: "" }}
          actions={[{
            text: t("broadcast.page.loginButton"),
            view: "action",
            size: "l",
            onClick: () => router.push("/auth/profile"),
          }]}
        />
      </div>
    );
  }

  return (
    <div className="broadcast-editor-page">
      <BroadcastFormWidget />
    </div>
  );
}
