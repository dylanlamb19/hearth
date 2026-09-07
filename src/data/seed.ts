export type Person = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  mutuals: number;
  online?: boolean;
  birthday?: string;
};

export type Post = {
  id: string;
  authorId: string;
  body: string;
  image?: string;
  createdAt: string;
  loves: number;
  comments: number;
  privacy: "friends" | "public";
};

export type Moment = {
  id: string;
  authorId: string;
  image: string;
  caption: string;
  expiresIn: string;
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  condition: "Like new" | "Good" | "Fair";
  sellerId: string;
  distance: string;
  postedAt: string;
  image: string;
  description: string;
};

export type Group = {
  id: string;
  name: string;
  members: number;
  about: string;
  cover: string;
};

export type EventItem = {
  id: string;
  title: string;
  when: string;
  where: string;
  going: number;
  hostId: string;
};

export type Conversation = {
  id: string;
  peerId: string;
  preview: string;
  updatedAt: string;
  unread: number;
};

export type Notification = {
  id: string;
  text: string;
  time: string;
  unread: boolean;
};

export type VideoItem = {
  id: string;
  title: string;
  authorId: string;
  duration: string;
  views: string;
  thumb: string;
};

export type Clip = {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  likes: number;
  comments: number;
  thumb?: string;
};

export const people: Person[] = [
  { id: "u-ember", name: "Ember", handle: "ember", bio: "Keeping the lights low and the kettle on.", mutuals: 0, online: true },
  { id: "u-maya", name: "Maya Chen", handle: "maya", bio: "Trail notes and quiet mornings.", mutuals: 12, online: true, birthday: "Today" },
  { id: "u-jordan", name: "Jordan Hale", handle: "jordan", bio: "Cooks for friends. Rarely posts.", mutuals: 8, online: false },
  { id: "u-sam", name: "Sam Rivera", handle: "sam", bio: "Vinyl, bikes, and porch light.", mutuals: 5, online: true },
  { id: "u-nova", name: "Nova Park", handle: "nova", bio: "Design that feels like home.", mutuals: 3, online: false },
  { id: "u-leo", name: "Leo Brooks", handle: "leo", bio: "Weekend markets and sketchbooks.", mutuals: 7, online: true },
  { id: "u-aria", name: "Aria Quinn", handle: "aria", bio: "Listening rooms and long walks.", mutuals: 4, online: false },
];

export const posts: Post[] = [
  {
    id: "p1",
    authorId: "u-maya",
    body: "Mist hung over the ridge this morning. Brought coffee and left the phone in the car.",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
    createdAt: "3 hours ago",
    loves: 24,
    comments: 6,
    privacy: "friends",
  },
  {
    id: "p2",
    authorId: "u-jordan",
    body: "Sunday stew is on. Come by after six if you are free — bring bread if you have it.",
    image: "https://images.unsplash.com/photo-1478144592103-53e28a4a4aa3?w=1200&q=80",
    createdAt: "5 hours ago",
    loves: 41,
    comments: 14,
    privacy: "friends",
  },
  {
    id: "p3",
    authorId: "u-sam",
    body: "Found a quiet corner at the bookshop. The radiator hummed and the afternoon felt longer.",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
    createdAt: "Yesterday",
    loves: 18,
    comments: 3,
    privacy: "public",
  },
  {
    id: "p4",
    authorId: "u-nova",
    body: "Candles, soft jazz, and a table that finally feels finished. Small rooms can hold a lot.",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80",
    createdAt: "Yesterday",
    loves: 57,
    comments: 9,
    privacy: "friends",
  },
];

export const moments: Moment[] = [
  { id: "m1", authorId: "u-maya", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80", caption: "Early light", expiresIn: "18h left" },
  { id: "m2", authorId: "u-sam", image: "https://images.unsplash.com/photo-1469474968028-57325c77cf17?w=600&q=80", caption: "Out past the creek", expiresIn: "11h left" },
  { id: "m3", authorId: "u-leo", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80", caption: "Second cup", expiresIn: "6h left" },
  { id: "m4", authorId: "u-aria", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80", caption: "Night walk", expiresIn: "3h left" },
];

export const listings: Listing[] = [
  {
    id: "l1",
    title: "Cast-iron skillet, 10 inch",
    price: 28,
    condition: "Good",
    sellerId: "u-jordan",
    distance: "1.2 mi",
    postedAt: "2 days ago",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
    description: "Seasoned and ready. Pickup on the porch preferred.",
  },
  {
    id: "l2",
    title: "Cedar plant stool",
    price: 45,
    condition: "Like new",
    sellerId: "u-nova",
    distance: "0.8 mi",
    postedAt: "Yesterday",
    image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80",
    description: "Solid cedar. Fits a medium planter perfectly.",
  },
  {
    id: "l3",
    title: "City bike, 3-speed",
    price: 120,
    condition: "Fair",
    sellerId: "u-sam",
    distance: "2.4 mi",
    postedAt: "4 days ago",
    image: "https://images.unsplash.com/photo-1485965120184-aafb341778c0?w=800&q=80",
    description: "Rides smooth. Needs a new basket if you want one.",
  },
  {
    id: "l4",
    title: "Monstera cutting",
    price: 12,
    condition: "Like new",
    sellerId: "u-maya",
    distance: "0.5 mi",
    postedAt: "Today",
    image: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800&q=80",
    description: "Rooted in water. Happy in bright shade.",
  },
];

export const groups: Group[] = [
  { id: "g1", name: "Weeknight cooks", members: 48, about: "Share what is on the stove. No pressure, no perfection.", cover: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80" },
  { id: "g2", name: "Trail notes", members: 63, about: "Quiet paths, weather checks, and who is free Saturday.", cover: "https://images.unsplash.com/photo-1454497409790-ae196fc9b4e4?w=800&q=80" },
  { id: "g3", name: "Listening room", members: 31, about: "Albums worth sitting still for.", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80" },
];

export const events: EventItem[] = [
  { id: "e1", title: "Porch soup night", when: "Sat · 6:00 PM", where: "Jordan's porch", going: 9, hostId: "u-jordan" },
  { id: "e2", title: "Sunrise ridge walk", when: "Sun · 6:30 AM", where: "North trailhead", going: 6, hostId: "u-maya" },
  { id: "e3", title: "Vinyl listening hour", when: "Fri · 8:00 PM", where: "Aria's living room", going: 11, hostId: "u-aria" },
];

export const conversations: Conversation[] = [
  { id: "c1", peerId: "u-maya", preview: "Bring an extra thermos if you can.", updatedAt: "20m ago", unread: 1 },
  { id: "c2", peerId: "u-jordan", preview: "Stew is almost ready.", updatedAt: "2h ago", unread: 0 },
  { id: "c3", peerId: "u-sam", preview: "Bike is still available if you want it.", updatedAt: "Yesterday", unread: 0 },
];

export const notifications: Notification[] = [
  { id: "n1", text: "Maya Chen loved your post", time: "1h ago", unread: true },
  { id: "n2", text: "Jordan Hale invited you to Porch soup night", time: "3h ago", unread: true },
  { id: "n3", text: "Sam Rivera accepted your friend request", time: "Yesterday", unread: false },
  { id: "n4", text: "Nova Park commented on your moment", time: "2 days ago", unread: false },
];

export const videos: VideoItem[] = [
  { id: "v1", title: "Making bread without rushing", authorId: "u-jordan", duration: "8:12", views: "1.2k", thumb: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80" },
  { id: "v2", title: "A slow walk after rain", authorId: "u-maya", duration: "4:40", views: "860", thumb: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&q=80" },
  { id: "v3", title: "Rearranging the living room", authorId: "u-nova", duration: "6:05", views: "2.1k", thumb: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80" },
];

/** Vertical shorts stubs — public sample mp4s that play reliably. */
export const clips: Clip[] = [
  {
    id: "clip1",
    authorId: "u-maya",
    caption: "Mist on the ridge this morning. Left the phone in the car for once.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    likes: 128,
    comments: 14,
    thumb: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
  },
  {
    id: "clip2",
    authorId: "u-jordan",
    caption: "Sunday stew simmer — come by after six if you are free.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    likes: 86,
    comments: 9,
    thumb: "https://images.unsplash.com/photo-1478144592103-53e28a4a4aa3?w=600&q=80",
  },
  {
    id: "clip3",
    authorId: "u-sam",
    caption: "Porch light, vinyl crackle, and a bike that needs a new basket.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    likes: 204,
    comments: 22,
    thumb: "https://images.unsplash.com/photo-1485965120184-aafb341778c0?w=600&q=80",
  },
  {
    id: "clip4",
    authorId: "u-nova",
    caption: "Small rooms can hold a lot — candles, soft jazz, finished table.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    likes: 312,
    comments: 31,
    thumb: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80",
  },
  {
    id: "clip5",
    authorId: "u-leo",
    caption: "Weekend market finds and a sketchbook that finally filled a page.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    likes: 67,
    comments: 5,
    thumb: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
  },
  {
    id: "clip6",
    authorId: "u-aria",
    caption: "Listening room hour — sit still, let the album finish.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    likes: 151,
    comments: 18,
    thumb: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
  },
];

export const savedIds = ["p2", "p4", "l2"];

export function personById(id: string) {
  return people.find((p) => p.id === id);
}
