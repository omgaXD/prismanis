import { ToolSetting } from "../toolSettings";

export type BaseToolOptions = {
	id: string;
	displayName: string;
	displayDescription: string;
};

export class AbstractTool {
	private enabled: boolean = false;
	settings: ToolSetting<any>[] = [];
	id: string;
	displayName: string;
	displayDescription: string;

	constructor(config: { id: string; displayName: string; displayDescription: string }) {
		this.id = config.id;
		this.displayName = config.displayName;
		this.displayDescription = config.displayDescription;
	}

	protected isEnabled(): boolean {
		return this.enabled;
	}

	toggle(enable: boolean): void {
		this.enabled = enable;
	}

	protected onToggled?(enabled: boolean): void;

	protected registerSetting<T>(setting: ToolSetting<T>, onChange?: (newValue: T) => void): void {
		if (onChange) setting.on("change", onChange);
		this.settings.push(setting);
		onChange?.(setting.getValue());
	}
}

export const registeredTools: AbstractTool[] = [];

export function registerTool<T extends AbstractTool>(tool: T) {
	registeredTools.push(tool);
	return tool;
}
