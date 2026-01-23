import { Vec2 } from "./primitives";
import { Transform } from "./scene";

export function dist(p1: Vec2, p2: Vec2): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
