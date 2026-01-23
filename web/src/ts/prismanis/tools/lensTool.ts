import { ToolHelper } from "../render";
import { Scene } from "../scene";
import { AbstractTool, BaseToolOptions } from "./tool";

type LensToolOptions = BaseToolOptions & {
    hlp: ToolHelper;
    scene: Scene;
};

export class LensTool extends AbstractTool {
    constructor(private o: LensToolOptions) {
        super(o);
        this.init();
    }

    init() {
    }
}