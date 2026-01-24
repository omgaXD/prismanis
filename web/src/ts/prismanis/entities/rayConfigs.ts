import { Vec2 } from "../primitives";

export type RayOptions = {
    /**
     * nanometers
     */
    wavelength: number;
    /**
     * 0 to 1
     */
    opacity: number;
    /**
     * radians. 0 for right. counter-clockwise.
     */
    initialAngle: number;
    /**
     * applied before rotation
     */
    startPosOffset?: Vec2;
};


const SUNLIGHT_RAY_CONFIG = [
    { wavelength: 380, opacity: 0.05, initialAngle: 0 },
    { wavelength: 420, opacity: 0.12, initialAngle: 0 },
    { wavelength: 460, opacity: 0.18, initialAngle: 0 },
    { wavelength: 500, opacity: 0.2, initialAngle: 0 },
    { wavelength: 540, opacity: 0.196, initialAngle: 0 },
    { wavelength: 580, opacity: 0.17, initialAngle: 0 },
    { wavelength: 620, opacity: 0.12, initialAngle: 0 },
    { wavelength: 660, opacity: 0.07, initialAngle: 0 },
    { wavelength: 700, opacity: 0.036, initialAngle: 0 },
    { wavelength: 740, opacity: 0.01, initialAngle: 0 },
];

const LASER_RAY_CONFIG = [{ wavelength: 700, opacity: 1.0, initialAngle: 0 }];

const FLASHLIGHT_RAY_CONFIG = Array.from({ length: 41 }, (_, i) => {
    // +1 degree to -1 degree spread
    const angle = ((i / 20) * 2 - 1) * (Math.PI / 180);
    return { wavelength: 600, opacity: 0.05, initialAngle: angle };
});

const LAMP_RAY_CONFIG = Array.from({ length: 360 }, (_, i) => {
    const angle = i * (Math.PI / 180);
    return { wavelength: 600, opacity: 0.08, initialAngle: angle };
});

const FLOOD_LIGHT = Array.from({ length: 81 }, (_, i) => {
    // no spread, but starting offset
    const offsetY = (i - 40) * 3;
    return { wavelength: 600, opacity: 0.05, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } };
});

const FLOOD_SUNLIGHT = Array.from({ length: 41 }, (_, i) => {
    const offsetY = (i - 20) * 1;
    return [
        { wavelength: 380, opacity: 0.4 * 0.05, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 420, opacity: 0.4 * 0.12, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 460, opacity: 0.4 * 0.18, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 500, opacity: 0.4 * 0.2, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 540, opacity: 0.4 * 0.196, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 580, opacity: 0.4 * 0.17, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 620, opacity: 0.4 * 0.12, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 660, opacity: 0.4 * 0.07, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 700, opacity: 0.4 * 0.036, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
        { wavelength: 740, opacity: 0.4 * 0.01, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
    ];
}).flat();

export const RAY_CONFIGS: Record<string, RayOptions[]> = {
    sunlight: SUNLIGHT_RAY_CONFIG,
    laser: LASER_RAY_CONFIG,
    flashlight: FLASHLIGHT_RAY_CONFIG,
    lamp: LAMP_RAY_CONFIG,
    floodlight: FLOOD_LIGHT,
    floodsunlight: FLOOD_SUNLIGHT,
};