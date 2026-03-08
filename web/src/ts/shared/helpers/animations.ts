const DEFAULT_DURATION = 300;

type FadeOutParams = {
    element: HTMLElement;
    displayNone?: boolean;
    duration?: number;
}
export function fadeOut(params: FadeOutParams): Promise<void> {
	return new Promise((resolve) => {
		params.element.animate(
			[
				{ opacity: 1, transform: "translateY(0)" },
				{ opacity: 0, transform: "translate(0, -10px)" },
			],
			{ duration: params.duration ?? DEFAULT_DURATION, easing: "ease-in-out", fill: "forwards" },
		).onfinish = () => {
			if (params.displayNone) params.element.style.display = "none";
			resolve();
		};
	});
}

type FadeInParams = {
    element: HTMLElement;
    display?: string;
    duration?: number;
}
export function fadeIn(params: FadeInParams): Promise<void> {
    return new Promise((resolve) => {
        if (params.display !== undefined) params.element.style.display = params.display;
        params.element.animate(
            [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: params.duration ?? DEFAULT_DURATION, easing: "ease-in-out", fill: "forwards" },
        ).onfinish = () => resolve();
    });
}