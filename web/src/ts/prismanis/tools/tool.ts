import { ToolSetting } from "../toolSettings";

export type BaseToolOptions = {
	id: string;
	displayName: string;
	displayDescription: string;
	preservesSelection?: boolean;
};

export class AbstractTool {
	private enabled: boolean = false;
	settings: ToolSetting<any>[] = [];
	id: string;
	displayName: string;
	displayDescription: string;
	preservesSelection: boolean = false;

	constructor(config: BaseToolOptions) {
		this.id = config.id;
		this.displayName = config.displayName;
		this.displayDescription = config.displayDescription;
		this.preservesSelection = config.preservesSelection ?? false;
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
