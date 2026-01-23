export type Material = {
    name: string;

    A: number;
    B: number;

    strokeColor: string;
    fillColor: string;
}

export const GLASS_MATERIAL: Material = {
    name: "Glass",

    A: 1.5046,
    B: 0.00420,
    strokeColor: "rgba(135,206,235,0.8)",
    fillColor: "rgba(135,206,235,0.2)",
};

export const EXAGGERATED_GLASS_MATERIAL: Material = {
    name: "Exaggerated Glass",

    A: 1.7,
    B: 4000,
    strokeColor: "rgba(135,206,235,0.8)",
    fillColor: "rgba(135,206,235,0.2)",
};

export const WATER_MATERIAL: Material = {
    name: "Water",

    A: 1.324,
    B: 0.00310,
    strokeColor: "rgba(64,164,223,0.8)",
    fillColor: "rgba(64,164,223,0.2)",
};

export const AIR_MATERIAL: Material = {
    name: "Air",

    A: 1.000293,
    B: 0.0000,
    strokeColor: "rgba(255,255,255,0.8)",
    fillColor: "rgba(255,255,255,0.2)",
};