/**
 * Icon Constants for 9th Waka App
 *
 * Using @expo/vector-icons - Already installed in your project!
 *
 * Available Icon Families:
 * - Ionicons (Recommended - Modern, iOS-style, 1000+ icons)
 * - MaterialIcons (Material Design)
 * - FontAwesome (Classic, widely used)
 * - MaterialCommunityIcons (Extended Material icons)
 * - Feather (Minimal, clean)
 * - AntDesign (Chinese design system)
 *
 * Usage Example:
 * import { Icons } from '@/constants/icons';
 * <Icons.delivery name="car" size={24} color="#AB8BFF" />
 */

import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

/**
 * Primary Icon Set - Using Ionicons (Recommended for modern look)
 * Perfect for delivery apps with consistent, modern icons
 */
export const Icons = {
  // Navigation & Map Icons
  navigation: Ionicons,
  map: Ionicons,
  location: Ionicons,
  compass: Ionicons,

  // Delivery & Package Icons
  delivery: MaterialCommunityIcons,
  package: MaterialCommunityIcons,
  motorcycle: MaterialCommunityIcons,

  // Action Icons
  action: Ionicons,
  settings: Ionicons,
  search: Ionicons,

  // Status & Info Icons
  status: Ionicons,
  info: Ionicons,
  notification: Ionicons,

  // User & Profile Icons
  user: Ionicons,
  profile: Ionicons,

  // Payment & Money Icons
  payment: MaterialIcons,
  money: MaterialCommunityIcons,

  // Safety & Emergency Icons
  safety: Ionicons, // use Ionicons to match 'lock-closed' names
  emergency: MaterialCommunityIcons,

  // Time & Schedule Icons
  time: Ionicons,
  clock: Ionicons,

  // Communication Icons
  communication: Ionicons,
  chat: Ionicons,
  call: Ionicons,

  // Media Icons
  media: Ionicons,
};

/**
 * Commonly Used Icon Names for Quick Reference
 * Use these with the Icons above
 */
export const IconNames = {
  // Navigation
  home: "home",
  homeOutline: "home-outline",
  menu: "menu",
  menuOutline: "menu-outline",
  arrowBack: "arrow-back",
  arrowForward: "arrow-forward",
  chevronDown: "chevron-down",
  chevronUp: "chevron-up",
  close: "close",
  closeCircle: "close-circle",

  // Location & Map
  location: "location",
  locationOutline: "location-outline",
  pin: "location-pin",
  map: "map",
  mapOutline: "map-outline",
  navigate: "navigate",
  navigateOutline: "navigate-outline",
  compass: "compass",
  compassOutline: "compass-outline",

  // Delivery & Package
  car: "car",
  carOutline: "car-outline",
  bike: "bicycle",
  motorcycle: "motorbike",
  deliveryTruck: "truck",
  package: "cube",
  packageOutline: "cube-outline",
  box: "archive",
  boxOutline: "archive-outline",

  // Status & Actions
  checkmark: "checkmark",
  checkmarkCircle: "checkmark-circle",
  checkmarkDone: "checkmark-done",
  add: "add",
  addCircle: "add-circle",
  remove: "remove",
  removeCircle: "remove-circle",
  edit: "create",
  editOutline: "create-outline",
  delete: "trash",
  deleteOutline: "trash-outline",
  save: "save",
  saveOutline: "save-outline",

  // Tracking & GPS
  radioButtonOn: "radio-button-on",
  radioButtonOff: "radio-button-off",
  locate: "locate",
  locateOutline: "locate-outline",
  gps: "navigate-circle",
  gpsOutline: "navigate-circle-outline",

  // Time & Schedule
  time: "time",
  timeOutline: "time-outline",
  calendar: "calendar",
  calendarOutline: "calendar-outline",
  clock: "alarm",
  clockOutline: "alarm-outline",

  // Safety & Emergency
  shield: "shield",
  shieldOutline: "shield-outline",
  warning: "warning",
  warningOutline: "warning-outline",
  alert: "alert-circle",
  alertOutline: "alert-circle-outline",
  medical: "medical",
  medicalOutline: "medical-outline",
  sos: "alert-circle",
  security: "lock-closed",
  securityOutline: "lock-closed-outline",

  // Communication
  call: "call",
  callOutline: "call-outline",
  chatbubble: "chatbubble",
  chatbubbleOutline: "chatbubble-outline",
  message: "mail",
  messageOutline: "mail-outline",
  send: "send",
  sendOutline: "send-outline",
  notifications: "notifications",
  notificationsOutline: "notifications-outline",

  // User & Profile
  person: "person",
  personOutline: "person-outline",
  personCircle: "person-circle",
  personCircleOutline: "person-circle-outline",
  people: "people",
  peopleOutline: "people-outline",
  settings: "settings",
  settingsOutline: "settings-outline",
  logout: "log-out",
  logoutOutline: "log-out-outline",

  // Media
  camera: "camera",
  cameraOutline: "camera-outline",

  // Payment & Money
  card: "card",
  cardOutline: "card-outline",
  wallet: "wallet",
  walletOutline: "wallet-outline",
  cash: "cash", // MaterialCommunityIcons
  creditCard: "credit-card", // MaterialCommunityIcons

  // Search & Filter
  search: "search",
  searchOutline: "search-outline",
  filter: "filter",
  filterOutline: "filter-outline",

  // Status Indicators
  star: "star",
  starOutline: "star-outline",
  heart: "heart",
  heartOutline: "heart-outline",
  bookmark: "bookmark",
  bookmarkOutline: "bookmark-outline",

  // Directions
  arrowUp: "arrow-up",
  arrowDown: "arrow-down",
  arrowLeft: "arrow-back",
  arrowRight: "arrow-forward",

  // More Icons
  refresh: "refresh",
  refreshCircle: "refresh-circle",
  share: "share",
  shareOutline: "share-outline",
  information: "information-circle",
  informationOutline: "information-circle-outline",
  help: "help-circle",
  helpOutline: "help-circle-outline",
  eye: "eye",
  eyeOutline: "eye-outline",
  eyeOff: "eye-off",
  eyeOffOutline: "eye-off-outline",
};

/**
 * MaterialCommunityIcons specific names (great for delivery app)
 */
export const MCIconNames = {
  delivery: "truck-delivery",
  motorcycle: "motorbike",
  packageVariant: "package-variant",
  mapMarker: "map-marker",
  mapMarkerRadius: "map-marker-radius",
  navigation: "navigation",
  sos: "alarm-light",
  bellAlert: "bell-alert",
  cash: "cash",
  cashMultiple: "cash-multiple",
  wallet: "wallet",
  route: "routes",
  routeNavigation: "navigation-variant",
  shield: "shield-check",
  security: "security",
  account: "account",
  accountCircle: "account-circle",
};
