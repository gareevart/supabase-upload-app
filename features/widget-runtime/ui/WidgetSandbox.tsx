"use client";

import { useMemo, useRef, useState } from "react";
import { WidgetPermission } from "@/shared/types/widget";
import { useWidgetHost } from "../model/useWidgetHost";
import { buildWidgetSrcdoc } from "../lib/widgetSdk";
import { WidgetCameraDialog } from "./WidgetCameraDialog";
import "./WidgetSandbox.css";

type CameraRequest = {
  resolve: (url: string) => void;
  reject: (error: Error) => void;
};

type WidgetSandboxProps = {
  html: string;
  title: string;
  widgetId?: string | null;
  grantedPermissions: WidgetPermission[];
  className?: string;
};

// Renders untrusted widget HTML inside an opaque-origin sandboxed iframe.
// The widget reaches user data only through the postMessage bridge (useWidgetHost).
export function WidgetSandbox({
  html,
  title,
  widgetId,
  grantedPermissions,
  className,
}: WidgetSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(null);

  const srcDoc = useMemo(() => buildWidgetSrcdoc(html), [html]);

  useWidgetHost(iframeRef, {
    widgetId,
    grantedPermissions,
    onCameraRequest: () =>
      new Promise<string>((resolve, reject) => {
        setCameraRequest({ resolve, reject });
      }),
  });

  const closeCameraDialog = () => setCameraRequest(null);

  return (
    <div className={`widget-sandbox ${className ?? ""}`}>
      <iframe
        ref={iframeRef}
        className="widget-sandbox__frame"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title={title}
      />
      {cameraRequest && (
        <WidgetCameraDialog
          onPhoto={(url) => {
            cameraRequest.resolve(url);
            closeCameraDialog();
          }}
          onCancel={() => {
            cameraRequest.reject(new Error("Camera request cancelled"));
            closeCameraDialog();
          }}
        />
      )}
    </div>
  );
}
