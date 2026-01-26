export abstract class ToolSetting<T> {
	readonly id: string;
	readonly displayName: string;
	private value: T;
	readonly default: T;

	private listeners: Map<string, ((value: T) => void)[]> = new Map();

	constructor(config: { id: string; displayName: string; value: T; default: T }) {
		this.id = config.id;
		this.displayName = config.displayName;
		this.value = config.value;
		this.default = config.default;
	}

    getValue(): T {
        return this.value;
    }

	setValue(newValue: T) {
		if (this.value !== newValue) {
			this.value = newValue;
			this.emit("change", newValue);
		}
	}

	on(event: "change", callback: (value: T) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(callback);
	}

	off(event: "change", callback: (value: T) => void) {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			const index = callbacks.indexOf(callback);
			if (index > -1) callbacks.splice(index, 1);
		}
	}

	private emit(event: "change", value: T) {
		this.listeners.get(event)?.forEach((cb) => cb(value));
	}

	reset() {
		this.setValue(this.default);
	}

	abstract validate(value: T): boolean;

	isValid(): boolean {
		return this.validate(this.value);
	}
}

export class ToolSettingNumber extends ToolSetting<number> {
	min: number;
	max: number;

	constructor(config: {
		id: string;
		displayName: string;
		value: number;
		default: number;
		min: number;
		max: number;
	}) {
		super(config);
		this.min = config.min;
		this.max = config.max;
	}

	validate(value: number): boolean {
		return value >= this.min && value <= this.max;
	}

	setValue(newValue: number) {
		if (this.validate(newValue)) {
			super.setValue(newValue);
		}
	}
}

export class ToolSettingSlider extends ToolSetting<number> {
	min: number;
	max: number;
	step: number;

	constructor(config: {
		id: string;
		displayName: string;
		value: number;
		default: number;
		min: number;
		max: number;
		step: number;
	}) {
		super(config);
		this.min = config.min;
		this.max = config.max;
		this.step = config.step;
	}

	validate(value: number): boolean {
		return value >= this.min && value <= this.max;
	}

	setValue(newValue: number) {
		if (this.validate(newValue)) {
			super.setValue(newValue);
		}
	}
}

export class ToolSettingSelect<T> extends ToolSetting<string> {
	options: { value: string; displayName: string }[];

	constructor(config: {
		id: string;
		displayName: string;
		value: string;
		default: string;
		options: { value: string; displayName: string }[];
	}) {
		super(config);
		this.options = config.options;
	}

	validate(value: string): boolean {
		return this.options.some((opt) => opt.value === value);
	}
}
