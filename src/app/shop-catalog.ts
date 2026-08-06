export type ShopItemKind = "interior" | "avatar" | "emoticon";

export type ShopCatalogItem = {
  id: string;
  label: string;
  kind: ShopItemKind;
  category: string;
  color: string;
  preview: string;
  price: number;
  contentId: string;
  imageFile?: string;
  giftable: boolean;
};

const assetUrl = (file: string) => `${import.meta.env.BASE_URL}assets/shop/${file}`;

export function getShopItemImage(item: ShopCatalogItem): string | null {
  return item.imageFile ? assetUrl(item.imageFile) : null;
}

export const SHOP_CATALOG: ShopCatalogItem[] = [
  { id: "interior-tricolor-cat", label: "삼색고양이", kind: "interior", category: "인테리어", color: "#d99a62", preview: "🐱", price: 130, contentId: "lp-tricolor-cat", imageFile: "tricolor-cat.png", giftable: true },
  { id: "interior-heart-balloon", label: "하트풍선", kind: "interior", category: "인테리어", color: "#ff6b9a", preview: "🎈", price: 80, contentId: "rw-heart-balloon", imageFile: "heart-balloon.png", giftable: true },
  { id: "interior-mushroom-lamp", label: "버섯 조명", kind: "interior", category: "인테리어", color: "#ff8068", preview: "🍄", price: 90, contentId: "rp-mushroom-lamp", imageFile: "mushroom-lamp.png", giftable: true },
  { id: "interior-record-player", label: "빈티지 턴테이블", kind: "interior", category: "인테리어", color: "#b08050", preview: "🎵", price: 125, contentId: "st-pixel-record-player", imageFile: "record-player.png", giftable: true },
  { id: "interior-aquarium", label: "미니 어항", kind: "interior", category: "인테리어", color: "#5bc0d8", preview: "🐠", price: 150, contentId: "lf-aquarium", imageFile: "aquarium.png", giftable: true },
  { id: "interior-teddy", label: "리본 곰인형", kind: "interior", category: "인테리어", color: "#d4a878", preview: "🧸", price: 110, contentId: "rp-teddy-bear", giftable: true },
  { id: "interior-monstera", label: "몬스테라 화분", kind: "interior", category: "인테리어", color: "#70b850", preview: "🪴", price: 100, contentId: "lp-monstera", giftable: true },
  { id: "interior-heart-rug", label: "하트 러그", kind: "interior", category: "인테리어", color: "#ff90b8", preview: "💗", price: 120, contentId: "rug-heart-pink", giftable: true },
  { id: "interior-moon-light", label: "문라이트", kind: "interior", category: "인테리어", color: "#ffe878", preview: "🌙", price: 140, contentId: "lw-moon-light", giftable: true },
  { id: "interior-pc-desk", label: "레트로 PC 데스크", kind: "interior", category: "인테리어", color: "#80c8ff", preview: "🖥️", price: 150, contentId: "lf-desk-pc", giftable: true },
  { id: "interior-gallery", label: "폴라로이드 액자", kind: "interior", category: "인테리어", color: "#f0c898", preview: "🖼️", price: 95, contentId: "rw-gallery-frame", giftable: true },
  { id: "interior-retro-radio", label: "레트로 라디오", kind: "interior", category: "인테리어", color: "#a8d4ff", preview: "📻", price: 105, contentId: "rp-retro-radio", giftable: true },

  { id: "avatar-pink-hoodie", label: "핑크 후드티", kind: "avatar", category: "의상", color: "#e58aa8", preview: "👚", price: 105, contentId: "outfit-pinktee", imageFile: "pink-hoodie.png", giftable: true },
  { id: "avatar-sailor", label: "세일러복", kind: "avatar", category: "의상", color: "#6f8fb8", preview: "👗", price: 120, contentId: "outfit-ribbon", imageFile: "sailor-outfit.png", giftable: true },
  { id: "avatar-cardigan", label: "아이보리 가디건", kind: "avatar", category: "의상", color: "#ead8b5", preview: "🧥", price: 110, contentId: "outfit-cardigan", imageFile: "ivory-cardigan.png", giftable: true },
  { id: "avatar-overalls", label: "데님 멜빵", kind: "avatar", category: "의상", color: "#6f8fb8", preview: "👖", price: 115, contentId: "outfit-denim", imageFile: "denim-overalls.png", giftable: true },
  { id: "avatar-pleats", label: "네이비 플리츠", kind: "avatar", category: "의상", color: "#4a5a78", preview: "👗", price: 100, contentId: "skirt-pleat", giftable: true },
  { id: "avatar-cargo", label: "베이지 카고팬츠", kind: "avatar", category: "의상", color: "#cbb892", preview: "👖", price: 100, contentId: "pants-beige", giftable: true },
  { id: "avatar-ribbon", label: "체리 리본핀", kind: "avatar", category: "액세서리", color: "#d86f86", preview: "🎀", price: 75, contentId: "other-ribbon", giftable: true },
  { id: "avatar-flower", label: "데이지 꽃핀", kind: "avatar", category: "액세서리", color: "#ffe080", preview: "🌼", price: 70, contentId: "other-flower", giftable: true },
  { id: "avatar-sneakers", label: "크림 스니커즈", kind: "avatar", category: "액세서리", color: "#f7efd9", preview: "👟", price: 85, contentId: "other-sneakers", giftable: true },
  { id: "avatar-crossbag", label: "미니 크로스백", kind: "avatar", category: "액세서리", color: "#c9a878", preview: "👜", price: 90, contentId: "other-bag", giftable: true },

  { id: "emoticon-laugh", label: "빵터짐", kind: "emoticon", category: "이모티콘", color: "#ffe060", preview: "😆", price: 90, contentId: "cool-face", imageFile: "emoticon-laugh.png", giftable: true },
  { id: "emoticon-cry", label: "주르륵", kind: "emoticon", category: "이모티콘", color: "#80c8ff", preview: "😭", price: 90, contentId: "teary-face", imageFile: "emoticon-cry.png", giftable: true },
  { id: "emoticon-angry", label: "부글부글", kind: "emoticon", category: "이모티콘", color: "#ff8068", preview: "😡", price: 90, contentId: "angry-face", imageFile: "emoticon-angry.png", giftable: true },
  { id: "emoticon-shock", label: "깜짝", kind: "emoticon", category: "이모티콘", color: "#c8a0ff", preview: "😮", price: 100, contentId: "sparkle-face", imageFile: "emoticon-shock.png", giftable: true },
  { id: "emoticon-love", label: "사랑해", kind: "emoticon", category: "이모티콘", color: "#ff80a0", preview: "😍", price: 110, contentId: "love-heart", giftable: true },
  { id: "emoticon-party", label: "축하해", kind: "emoticon", category: "이모티콘", color: "#ffb860", preview: "🥳", price: 110, contentId: "crown-hat", giftable: true },
  { id: "emoticon-sleep", label: "쿨쿨", kind: "emoticon", category: "이모티콘", color: "#8fa8d8", preview: "😴", price: 90, contentId: "teary-face", giftable: true },
  { id: "emoticon-best", label: "최고야", kind: "emoticon", category: "이모티콘", color: "#80e0b0", preview: "👍", price: 100, contentId: "sparkle-face", giftable: true },
];

export const SHOP_CATEGORIES = ["전체", "인테리어", "의상", "액세서리", "이모티콘"] as const;

export function getShopCatalogItem(itemId: string): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === itemId);
}
