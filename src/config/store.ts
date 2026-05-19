export const storeConfig = {
  whatsappNumber: "5491158501082",
  defaultMinimumQuantity: 3,
  fallbackMaxQuantity: 20,
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
    label: "Accesorios",
    value: "accesorios",
  },
];

export const mainNavCategories = categories.filter(
  (category) => category.value !== "accesorios"
);

export const editorialImages = [
  "/editorial/1.png",
  "/editorial/2.png",
  "/editorial/3.png",
  "/editorial/4.png",
  "/editorial/5.png",
];

export const fallbackProductImage = "/window.svg";

export const productBenefits = [
  "Envios a todo el pais",
  "Calidad premium",
];

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
