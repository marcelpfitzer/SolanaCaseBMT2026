"use client";

// Lets the user allow browser (push) notifications for the low-balance warning.

import { useSyncExternalStore, useState } from "react";
import { LOW_BALANCE_EUR } from "@/components/BalanceProvider";

type Permission = NotificationPermission | "unsupported";

function readPermission(): Permission {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export default function NotificationSettings() {
  // Read the browser's permission without a hydration mismatch.
  const initial = useSyncExternalStore(
    () => () => {},
    readPermission,
    () => "default" as Permission,
  );
  const [changed, setChanged] = useState<Permission | null>(null);
  const permission = changed ?? initial;

  async function enable() {
    setChanged(await Notification.requestPermission());
  }

  function test() {
    new Notification("payperread: notifications are on", {
      body: `We'll tell you when your balance drops below €${LOW_BALANCE_EUR}.`,
      icon: "/icon.png",
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="type-caption text-black/60">
        {permission === "granted" && "✓ On. You get a notification when your balance drops below €1."}
        {permission === "default" && "Get a notification when your balance drops below €1."}
        {permission === "denied" &&
          "Blocked in your browser. Allow notifications for this site in the browser settings. Until then, warnings appear inside the page."}
        {permission === "unsupported" && "This browser doesn’t support notifications. Warnings appear inside the page."}
      </p>
      {permission === "default" && (
        <button onClick={enable} className="btn-blue">
          Turn on notifications
        </button>
      )}
      {permission === "granted" && (
        <button onClick={test} className="btn-pill">
          Send test
        </button>
      )}
    </div>
  );
}
