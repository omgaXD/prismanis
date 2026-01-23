export type Vec2 = {
	x: number;
	y: number;
};

export type Rect = Vec2 &{
    width: number;
    height: number;
}

export type Curve = {
    points: Vec2[];
    isClosed: boolean;
    thickness?: number;
    color?: string;
};
