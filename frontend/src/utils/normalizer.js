// utils/normalizers.js

export const normalizeProduct = (item, index = 0) => {
  const priceString = String(item.price ?? "");
  const integerPart = priceString.split(".")[0] || "0";

  const fallbackId =
    item.external_article_id ||
    item.product_code ||
    `${item.prod_name || "prod"}-${index}`;

  const hasValidImage =
    item.image_url &&
    item.image_url !== "undefined" &&
    item.image_url !== "";

  return {
    id: fallbackId,
    external_article_id: fallbackId, // por compatibilidad
    name: item.prod_name || item.title || `Producto ${index + 1}`,
    price: integerPart,
    stock: item.stock ?? 0,
    image: hasValidImage
      ? item.image_url
      : `https://placehold.co/500x750?text=${encodeURIComponent(
          (item.prod_name || "Producto").substring(0, 16)
        )}`,
  };
};
