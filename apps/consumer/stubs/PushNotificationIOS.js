/**
 * Stub for PushNotificationIOS.
 *
 * This app uses expo-notifications rather than the react-native built-in
 * PushNotificationIOS. However, react-native/index.js still exports a lazy
 * getter for it, and Expo's async-require importAll iterates every export,
 * triggering the getter. The real module immediately calls
 *   new NativeEventEmitter(RCTPushNotificationManager)
 * where RCTPushNotificationManager is null — causing an Invariant Violation.
 *
 * This stub replaces the real module at Metro resolution time so the getter
 * resolves harmlessly.
 */
const PushNotificationIOS = {
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
  requestPermissions: () => Promise.resolve({}),
  abandonPermissions: () => {},
  checkPermissions: () => {},
  getInitialNotification: () => Promise.resolve(null),
  getScheduledLocalNotifications: () => {},
  cancelAllLocalNotifications: () => {},
  cancelLocalNotifications: () => {},
  setApplicationIconBadgeNumber: () => {},
  getApplicationIconBadgeNumber: () => {},
  scheduleLocalNotification: () => {},
  presentLocalNotification: () => {},
  addNotificationRequest: () => {},
  getPendingNotificationRequests: () => Promise.resolve([]),
  removePendingNotificationRequests: () => {},
  removeAllPendingNotificationRequests: () => {},
  getDeliveredNotifications: () => Promise.resolve([]),
  removeDeliveredNotifications: () => {},
  removeAllDeliveredNotifications: () => {},
  FetchResult: { NewData: "UIBackgroundFetchResultNewData", NoData: "UIBackgroundFetchResultNoData", ResultFailed: "UIBackgroundFetchResultFailed" },
  AuthorizationStatus: { NotDetermined: -1, Denied: 0, Authorized: 1, Provisional: 2, Ephemeral: 3 },
};

module.exports = PushNotificationIOS;
module.exports.default = PushNotificationIOS;
