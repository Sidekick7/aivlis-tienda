export const storeConfig = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
};

export const categories = [
  {
    label: "Remeras",
    value: "remeras",
  },
  {
    label: "Camperas",
    value: "camperas",
  },
  {
    label: "Pantalones",
    value: "pantalones",
  },
  {
    label: "Shorts/Bermuda",
    value: "shorts-bermuda",
  },
];

export const mainNavCategories = categories;

export function getCategoryLabel(value: string) {
  return (
    categories.find((category) => category.value === value)?.label ??
    value
  );
}

export const editorialImages = [
  "/editorial/1.png",
  "/editorial/2.png",
  "/editorial/3.png",
  "/editorial/4.png",
  "/editorial/5.png",
];

export const fallbackProductImage = "/window.svg";

export const provinces = [
  "Buenos Aires",
  "Ciudad Autonoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Cordoba",
  "Corrientes",
  "Entre Rios",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquen",
  "Rio Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucuman",
];
