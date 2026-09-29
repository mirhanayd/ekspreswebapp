# ADR 0001: Driver location while the phone is locked

Status: **Proposed, pending operator requirement and physical Android/iOS tests**  
Date: 2026-09-29  
Scope: driver tracking before the OBUS release gate

## Context

The driver web app uses `navigator.geolocation.watchPosition` while its document is active. The [W3C Geolocation specification](https://www.w3.org/TR/geolocation/#request-a-position) pauses acquisition while a document is hidden and says watch updates are delivered only to fully active, visible documents. Installing the site as a PWA does not turn this web API into a native background location service. It would be incorrect to promise continuous tracking through a locked screen from this implementation.

The [Android location permission guide](https://developer.android.com/develop/sensors-and-location/location/permissions) distinguishes a visible activity or foreground service, which can continue after the display turns off, from background access. Android foreground service restrictions and permissions must be implemented in a native app. Apple's [background location guidance](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background) and [`allowsBackgroundLocationUpdates`](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates) describe the native Core Location configuration required for background updates. These platform capabilities do not apply automatically to the current website.

## Options

| Option                                     | Delivery while locked                                                                                                                                                               | Operational and implementation cost                                                                                                                          | Acceptance condition                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Foreground-only web with an operating rule | No guarantee. The driver must keep the app visible and device awake during tracking.                                                                                                | Lowest engineering cost, but staffing must monitor stale positions and fall back to a call or dispatch update. Battery and screen use require a field trial. | The operator explicitly accepts gaps; passenger UI shows last update age and never implies current location when stale. |
| Native/Capacitor mobile app                | Possible with Android location foreground service and iOS Core Location background modes, permissions and platform review. Still subject to OS policy, battery and device settings. | Mobile build/release, store enrollment, permission UX, privacy review, device support and maintenance.                                                       | Locked-screen Android and iOS trials demonstrate the required update interval, reconnect and battery behavior.          |
| Dedicated or managed vehicle GPS           | Independent of driver phone visibility, if coverage, installation, device power and provider delivery meet the service level.                                                       | Hardware, installation, data plan and vendor integration may incur recurring cost; provider and procurement need approval.                                   | Test actual vehicle/device and ingest into the same validated Neon/Ably pipeline with identity and replay protection.   |

## Conditional decision

Ship the web app as **foreground-only** for an explicitly supervised pilot only if the operator accepts that location can stop when the app is hidden or the phone locks. Label tracking as last-known with an age and offline state; define a dispatch fallback and a maximum tolerated stale interval before the pilot. This does not satisfy a continuous background tracking promise.

If uninterrupted live position with a locked phone is a requirement, **block the production-ready release gate** until native tracking or a dedicated vehicle device is selected and verified. A vehicle device is the preferred reliability path for a fixed bus fleet if its cost and installation are acceptable; native tracking is a viable alternative when the driver phone must be the source. Do not purchase a device, add a paid SDK, enroll a store account or change a subscription without approval.

## Physical acceptance plan

Use deployed HTTPS and an assigned staging trip. On at least one supported Android device and one supported iPhone, record OS/browser/version, permission scope, power-saving mode and whether the app is in a tab or installed. With consent and test-only coordinates, compare browser callback time, accepted server time, durable Neon latest/history and passenger Ably delivery for:

1. Visible app and moving vehicle (or controlled motion), then screen lock for at least 15 minutes.
2. Backgrounding to another app, returning to the driver screen, and observing recovery.
3. Permission denial/revocation, low power mode, temporary network loss and reconnect.
4. A longer route session that exposes battery and thermal behavior, with dispatch fallback.

The result must state the observed maximum update gap, stale UI behavior and whether the configured service level passed. A simulator or desktop browser is insufficient evidence for locked-screen behavior. Do not put passenger contact data, precise coordinates or credentials in public test reports. Review purpose, retention and access under KVKK before a real fleet rollout.

## Consequences

The GPS HTTP acceptance and Ably fan-out tests remain useful for foreground tracking but do not certify background operation. #95 cannot pass the physical field gate until this ADR has a chosen branch, tested devices and an operator-approved service level. OBUS remains out of scope until the full pre-OBUS gate passes.
